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

    // Step 1: Use Gemini to generate search queries
    const queryGenResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a research assistant. Generate 2-3 concise web search queries (English preferred) to research this pet/veterinary question. Return ONLY a JSON array of strings, no markdown formatting.
Question: ${query}

Example output: ["dog nutrition requirements", "best dog food for small breeds"]`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!queryGenResponse.ok) {
      console.error('Gemini query generation failed:', queryGenResponse.status);
      throw new Error('Failed to generate search queries');
    }

    const queryGenData = await queryGenResponse.json();
    const queryText = queryGenData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const cleanQueryText = queryText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let searchQueries: string[];
    try {
      searchQueries = JSON.parse(cleanQueryText);
      if (!Array.isArray(searchQueries) || searchQueries.length === 0) {
        searchQueries = [query];
      }
    } catch {
      searchQueries = [query];
    }

    console.log('Generated search queries:', searchQueries);

    // Step 2: Use Perplexity to search
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful pet care and veterinary information assistant. Provide accurate, detailed information with sources. Format your response in markdown.'
          },
          {
            role: 'user',
            content: `Research and answer this question about pets/veterinary care: ${query}\n\nUse these search angles: ${searchQueries.join(', ')}`
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error('Perplexity API error:', perplexityResponse.status, errorText);
      
      if (perplexityResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Perplexity search failed');
    }

    const perplexityData = await perplexityResponse.json();
    const answer = perplexityData.choices?.[0]?.message?.content || '';
    const citations = perplexityData.citations || [];

    console.log('Search completed successfully');

    return new Response(
      JSON.stringify({
        answer_md: answer,
        citations: citations,
        debug: {
          queries: searchQueries,
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
