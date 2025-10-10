// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Use a more stable LangGraph version with explicit CDN path
import { StateGraph, END } from "https://esm.sh/v135/@langchain/langgraph@0.2.3/web?target=deno&no-check";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define the state interface
interface SearchState {
  query: string;
  geminiKey: string;
  perplexityKey: string;
  initialQueries?: string[];
  results: string[];
  citations: string[];
  needMoreResearch?: boolean;
  additionalQueries?: string[];
  finalAnswer?: string;
  error?: string;
}

// Retry helper with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// Node 1: Generate search queries using Gemini
async function generateQueriesNode(state: SearchState): Promise<Partial<SearchState>> {
  console.log('Node: Generating search queries...');
  const { query, geminiKey } = state;
  const response = await withRetry(async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `你是一个宠物健康研究助手。为以下问题生成2-3个简洁的网页搜索查询（优先英文）来研究此问题。只返回JSON数组格式，不要markdown格式。

问题: ${query}

示例输出: ["dog nutrition requirements", "best dog food for small breeds"]`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const queries = JSON.parse(cleanText);
      return Array.isArray(queries) && queries.length > 0 ? queries : [query];
    } catch {
      return [query];
    }
  });

  console.log('Generated queries:', response);
  return { initialQueries: response };
}

// Node 2: Perform initial search using Perplexity Search API
async function initialSearchNode(state: SearchState): Promise<Partial<SearchState>> {
  console.log('Node: Performing initial search...');
  const { initialQueries, perplexityKey } = state;
  const queries = initialQueries || [];
  const allResults: any[] = [];
  const allCitations: Set<string> = new Set();

  try {
    const response = await withRetry(async () => {
      const res = await fetch('https://api.perplexity.ai/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: queries,
          max_results: 10,
          max_tokens_per_page: 1024
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Perplexity API error: ${res.status} - ${errorText}`);
      }

      return res;
    });

    const data = await response.json();
    const searchResults = data.results || [];

    searchResults.forEach((result: any) => {
      allResults.push(result);
      if (result.url) allCitations.add(result.url);
    });

  } catch (error) {
    console.error('Search error:', error);
  }

  console.log(`Found ${allResults.length} results, ${allCitations.size} citations`);
  
  // Format results for Gemini synthesis
  const formattedResults = allResults.map((r, i) => 
    `[${i+1}] ${r.title}\nURL: ${r.url}\n内容: ${r.snippet}\n日期: ${r.date || 'N/A'}`
  ).join('\n\n');

  return {
    results: [formattedResults],
    citations: Array.from(allCitations)
  };
}

// Node 3: Reflect on search results
async function reflectNode(state: SearchState): Promise<Partial<SearchState>> {
  console.log('Node: Reflecting on search results...');
  const { query, results, geminiKey } = state;
  const response = await withRetry(async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `分析以下搜索结果是否足以回答问题。如果需要更多信息，生成新的搜索查询。

问题: ${query}

搜索结果:
${results.join('\n\n')}

返回JSON格式:
{
  "needMore": true/false,
  "newQueries": ["查询1", "查询2"] // 如果needMore为true
}

只返回JSON，不要markdown格式。`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"needMore": false}';
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleanText);
      console.log('Reflection result:', parsed);
      return {
        needMoreResearch: parsed.needMore,
        additionalQueries: parsed.newQueries
      };
    } catch {
      return { needMoreResearch: false };
    }
  });

  return response;
}

// Node 4: Perform additional research using Search API
async function additionalSearchNode(state: SearchState): Promise<Partial<SearchState>> {
  console.log('Node: Performing additional research...');
  const { additionalQueries, perplexityKey, results, citations } = state;
  const queries = additionalQueries || [];
  
  const allResults: any[] = [];
  const allCitations: Set<string> = new Set(citations);

  try {
    const response = await withRetry(async () => {
      const res = await fetch('https://api.perplexity.ai/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: queries,
          max_results: 8,
          max_tokens_per_page: 1024
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Perplexity API error: ${res.status} - ${errorText}`);
      }

      return res;
    });

    const data = await response.json();
    const searchResults = data.results || [];

    searchResults.forEach((result: any) => {
      allResults.push(result);
      if (result.url) allCitations.add(result.url);
    });

  } catch (error) {
    console.error('Additional search error:', error);
  }

  console.log(`Additional search: ${allResults.length} new results`);
  
  // Format additional results
  const formattedResults = allResults.map((r, i) => 
    `[补充${i+1}] ${r.title}\nURL: ${r.url}\n内容: ${r.snippet}\n日期: ${r.date || 'N/A'}`
  ).join('\n\n');

  return {
    results: [...results, formattedResults],
    citations: Array.from(allCitations)
  };
}

// Node 5: Synthesize final answer
async function synthesizeNode(state: SearchState): Promise<Partial<SearchState>> {
  console.log('Node: Synthesizing final answer...');
  const { query, results, citations, geminiKey } = state;
  // Format citations
  const formattedCitations = citations.map((url, idx) => `[^${idx + 1}]: ${url}`).join('\n');

  const response = await withRetry(async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `你是一位经验丰富的宠物健康顾问。基于以下研究结果，为宠物主人提供专业、实用的建议。

问题: ${query}

研究资料:
${results.join('\n\n')}

参考文献编号:
${formattedCitations}

请用中文提供一个结构化的回答，包括：

## 可能原因
[列出2-3个可能的原因，使用引用标注，如 [^1]]

## 家庭照护建议
[提供3-4条实用的家庭护理建议，使用引用标注]

## 何时就医
[明确说明需要就医的情况]

## 预防措施
[提供预防建议]

**重要提示**：本建议基于网络资料整理，仅供参考。如症状持续或加重，请及时咨询专业兽医。

使用markdown格式，在文中适当位置添加引用标注 [^1], [^2] 等。`
            }]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8000
          }
        })
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Gemini API error: ${res.status} - ${errorText}`);
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const data = await res.json();
    console.log('Gemini synthesis response:', JSON.stringify(data));
    
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '暂时无法生成回答，请稍后重试。';
    
    if (answer === '暂时无法生成回答，请稍后重试。') {
      console.error('Gemini returned empty response. Full data:', JSON.stringify(data));
    }
    
    console.log('Answer synthesized successfully');
    return { finalAnswer: answer };
  });

  return response;
}

// Conditional edge: decide whether to do additional research
function shouldDoMoreResearch(state: SearchState): string {
  if (state.needMoreResearch && state.additionalQueries && state.additionalQueries.length > 0) {
    return "additional_search";
  }
  return "synthesize";
}

// Build the LangGraph workflow
function buildSearchGraph() {
  const workflow = new StateGraph({
    channels: {
      query: { value: null },
      geminiKey: { value: null },
      perplexityKey: { value: null },
      initialQueries: { value: null },
      results: { value: null },
      citations: { value: null },
      needMoreResearch: { value: null },
      additionalQueries: { value: null },
      finalAnswer: { value: null },
      error: { value: null }
    }
  });

  // Add nodes
  workflow.addNode("generate_queries", generateQueriesNode);
  workflow.addNode("initial_search", initialSearchNode);
  workflow.addNode("reflect", reflectNode);
  workflow.addNode("additional_search", additionalSearchNode);
  workflow.addNode("synthesize", synthesizeNode);

  // Add edges
  workflow.setEntryPoint("generate_queries");
  workflow.addEdge("generate_queries", "initial_search");
  workflow.addEdge("initial_search", "reflect");
  
  // Conditional edge after reflection
  workflow.addConditionalEdges(
    "reflect",
    shouldDoMoreResearch,
    {
      "additional_search": "additional_search",
      "synthesize": "synthesize"
    }
  );
  
  workflow.addEdge("additional_search", "synthesize");
  workflow.addEdge("synthesize", END);

  return workflow.compile();
}

// HTTP server
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!PERPLEXITY_API_KEY || !GEMINI_API_KEY) {
      console.error('Missing API keys:', { 
        hasPerplexity: !!PERPLEXITY_API_KEY, 
        hasGemini: !!GEMINI_API_KEY 
      });
      return new Response(
        JSON.stringify({ error: 'API keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('=== Starting LangGraph Search Workflow ===');
    console.log('Query:', query);

    // Build and run the LangGraph workflow
    const graph = buildSearchGraph();
    
    const initialState: SearchState = {
      query,
      geminiKey: GEMINI_API_KEY,
      perplexityKey: PERPLEXITY_API_KEY,
      results: [],
      citations: []
    };

    const finalState = await graph.invoke(initialState);

    console.log('=== LangGraph Workflow Completed ===');

    return new Response(
      JSON.stringify({
        answer_md: finalState.finalAnswer,
        citations: finalState.citations,
        debug: {
          initialQueries: finalState.initialQueries,
          reflectionNeededMore: finalState.needMoreResearch,
          totalResults: finalState.results.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: true 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
