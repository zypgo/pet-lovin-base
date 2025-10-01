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

    // Step 1: Use Gemini to generate search queries
    const queryGenResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a veterinary research assistant. Generate 2-3 concise search queries (English preferred) to research this pet health question. Return ONLY a JSON array of strings.
Question: ${question}

Example: ["dog nutrition basics", "puppy feeding schedule"]`
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
      // Fallback to simple answer
      return await simpleHealthAdvice(question, GEMINI_API_KEY);
    }

    const queryGenData = await queryGenResponse.json();
    const queryText = queryGenData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const cleanQueryText = queryText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let searchQueries: string[];
    try {
      searchQueries = JSON.parse(cleanQueryText);
      if (!Array.isArray(searchQueries) || searchQueries.length === 0) {
        searchQueries = [question];
      }
    } catch {
      searchQueries = [question];
    }

    console.log('Generated search queries:', searchQueries);

    // Step 2: Use Perplexity to research
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful veterinary assistant. Provide accurate, practical pet health advice with sources. Use markdown formatting.'
          },
          {
            role: 'user',
            content: `Research and answer this pet health question: ${question}\n\nSearch angles: ${searchQueries.join(', ')}`
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!perplexityResponse.ok) {
      console.error('Perplexity API error:', perplexityResponse.status);
      // Fallback to simple answer
      return await simpleHealthAdvice(question, GEMINI_API_KEY);
    }

    const perplexityData = await perplexityResponse.json();
    const advice = perplexityData.choices?.[0]?.message?.content || '';
    const citations = perplexityData.citations || [];

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
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
