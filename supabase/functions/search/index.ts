// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Generate search queries using Gemini
async function generateQueries(question: string, geminiKey: string): Promise<string[]> {
  const response = await withRetry(async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `你是一个宠物健康研究助手。为以下问题生成2-3个简洁的网页搜索查询（优先英文）来研究此问题。只返回JSON数组格式，不要markdown格式。

问题: ${question}

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
      return Array.isArray(queries) && queries.length > 0 ? queries : [question];
    } catch {
      return [question];
    }
  });

  return response;
}

// Search using Perplexity
async function perplexitySearch(queries: string[], perplexityKey: string): Promise<{ results: string[], citations: string[] }> {
  const allResults: string[] = [];
  const allCitations: Set<string> = new Set();

  for (const query of queries.slice(0, 3)) {
    try {
      const response = await withRetry(async () => {
        const res = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              {
                role: 'system',
                content: '你是一个专业的宠物健康信息助手。提供准确、详细的信息并附上来源。'
              },
              {
                role: 'user',
                content: query
              }
            ],
            temperature: 0.2,
            max_tokens: 1500,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Perplexity API error: ${res.status} - ${errorText}`);
        }

        return res;
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const citations = data.citations || [];

      if (content) {
        allResults.push(`查询: ${query}\n结果: ${content}`);
      }

      citations.forEach((citation: string) => {
        if (citation) allCitations.add(citation);
      });

      // Add delay between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Search error for query "${query}":`, error);
      // Continue with other queries even if one fails
    }
  }

  return {
    results: allResults,
    citations: Array.from(allCitations)
  };
}

// Reflect on search results to determine if more research is needed
async function reflectOnResults(
  question: string,
  results: string[],
  geminiKey: string
): Promise<{ needMore: boolean; newQueries?: string[] }> {
  const response = await withRetry(async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `分析以下搜索结果是否足以回答问题。如果需要更多信息，生成新的搜索查询。

问题: ${question}

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
      return JSON.parse(cleanText);
    } catch {
      return { needMore: false };
    }
  });

  return response;
}

// Synthesize final answer with citations
async function synthesizeAnswer(
  question: string,
  results: string[],
  citations: string[],
  geminiKey: string
): Promise<string> {
  // Format citations
  const formattedCitations = citations.map((url, idx) => `[^${idx + 1}]: ${url}`).join('\n');

  const response = await withRetry(async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `你是一位经验丰富的宠物健康顾问。基于以下研究结果，为宠物主人提供专业、实用的建议。

问题: ${question}

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
            maxOutputTokens: 2000
          }
        })
      }
    );

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '暂时无法生成回答，请稍后重试。';
  });

  return response;
}

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

    console.log('Search query:', query);

    // Step 1: Generate initial search queries
    console.log('Step 1: Generating search queries...');
    const initialQueries = await generateQueries(query, GEMINI_API_KEY);
    console.log('Generated queries:', initialQueries);

    // Step 2: Perform initial search
    console.log('Step 2: Performing initial search...');
    let { results, citations } = await perplexitySearch(initialQueries, PERPLEXITY_API_KEY);
    console.log(`Found ${results.length} results, ${citations.length} citations`);

    // Step 3: Reflect on results and possibly do more research
    console.log('Step 3: Reflecting on search results...');
    const reflection = await reflectOnResults(query, results, GEMINI_API_KEY);
    console.log('Reflection:', reflection);

    if (reflection.needMore && reflection.newQueries && reflection.newQueries.length > 0) {
      console.log('Step 3b: Performing additional research...');
      const { results: moreResults, citations: moreCitations } = await perplexitySearch(
        reflection.newQueries,
        PERPLEXITY_API_KEY
      );
      results = [...results, ...moreResults];
      citations = [...citations, ...moreCitations];
      console.log(`Total results: ${results.length}, Total citations: ${citations.length}`);
    }

    // Step 4: Synthesize final answer
    console.log('Step 4: Synthesizing final answer...');
    const answer = await synthesizeAnswer(query, results, citations, GEMINI_API_KEY);

    console.log('Search completed successfully');

    return new Response(
      JSON.stringify({
        answer_md: answer,
        citations: citations,
        debug: {
          initialQueries,
          reflectionNeededMore: reflection.needMore,
          totalResults: results.length
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
