// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();
    
    if (!imageBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ error: 'Missing imageBase64 or mimeType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not configured. Please add your Gemini API key in the backend.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing pet image with Gemini API');

    const prompt = `Analyze this pet image in detail and return ONLY valid JSON with this exact structure:
{
  "breed": "specific breed name",
  "species": "cat/dog/bird/etc",
  "confidence": 0.95,
  "physicalCharacteristics": {
    "size": "small/medium/large",
    "coat": "short/long/curly/etc",
    "colors": ["color1", "color2"]
  },
  "temperament": {
    "personality": ["trait1", "trait2", "trait3"],
    "energyLevel": "low/moderate/high",
    "familyFriendly": "yes/moderate/requires_experience"
  },
  "careNeeds": {
    "exercise": "brief description",
    "grooming": "brief description",
    "feeding": "brief description",
    "specialNeeds": "any special considerations (optional)"
  },
  "healthConsiderations": ["consideration1", "consideration2"]
}

Provide accurate, breed-specific information. Return ONLY the JSON object, no markdown formatting.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.error('No text in Gemini response:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'No content in Gemini response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from response
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanText);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Pet identification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
