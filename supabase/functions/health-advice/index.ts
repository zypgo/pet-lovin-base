// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();
    
    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!PERPLEXITY_API_KEY || !GEMINI_API_KEY) {
      console.error('Missing API keys');
      return new Response(
        JSON.stringify({ error: 'API keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Health advice query:', question);

    // Step 1: Use Perplexity Search API to get search results
    const perplexityResponse = await fetch('https://api.perplexity.ai/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: question,
        max_results: 10,
        max_tokens_per_page: 1024
      }),
    });

    if (!perplexityResponse.ok) {
      console.error('Perplexity Search API error:', perplexityResponse.status);
      // Fallback to simple answer
      return await simpleHealthAdvice(question, GEMINI_API_KEY);
    }

    const searchData = await perplexityResponse.json();
    const searchResults = searchData.results || [];
    const citations = searchResults.map((r: any) => r.url).filter(Boolean);

    console.log('Search results count:', searchResults.length);

    // Step 2: Use Gemini 2.5 Flash to synthesize answer
    const formattedResults = searchResults.map((r: any, i: number) => 
      `[${i+1}] ${r.title}\nURL: ${r.url}\n内容: ${r.snippet}\n日期: ${r.date || 'N/A'}`
    ).join('\n\n');

    const formattedCitations = citations.map((url: string, idx: number) => `[^${idx + 1}]: ${url}`).join('\n');

    const synthesisResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `你是一位经验丰富的宠物健康顾问。基于以下搜索结果，为宠物主人提供专业、实用的建议。

问题: ${question}

搜索结果:
${formattedResults}

参考文献编号:
${formattedCitations}

请用中文提供一个结构化的回答，使用markdown格式，在文中适当位置添加引用标注 [^1], [^2] 等。

**重要提示**：本建议基于网络资料整理，仅供参考。如症状持续或加重，请及时咨询专业兽医。`
            }]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2000
          }
        })
      }
    );

    if (!synthesisResponse.ok) {
      console.error('Gemini synthesis error:', synthesisResponse.status);
      return await simpleHealthAdvice(question, GEMINI_API_KEY);
    }

    const synthesisData = await synthesisResponse.json();
    const advice = synthesisData.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate advice at this time.';

    console.log('Health advice generated successfully');

    return new Response(
      JSON.stringify({
        advice: advice,
        citations: citations,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Health advice error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fallback function for simple health advice without Perplexity
async function simpleHealthAdvice(question: string, geminiApiKey: string) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a helpful veterinary assistant. Provide practical, accurate advice for this pet health question. Use markdown formatting and be concise but thorough.\n\nQuestion: ${question}`
            }]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1500
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to generate simple health advice');
    }

    const data = await response.json();
    const advice = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate advice at this time.';

    return new Response(
      JSON.stringify({
        advice: advice,
        citations: [],
        fallback: true
      }),
      { 
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Simple health advice fallback error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get health advice' }),
      { 
        status: 500, 
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
}
