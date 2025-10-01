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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Service configuration error. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing pet image with Lovable AI');

    // Convert base64 image to data URL format
    const imageDataUrl = `data:${mimeType};base64,${imageBase64}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this pet image in detail. Identify the breed and species, and provide comprehensive information."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "identify_pet",
              description: "Identify and analyze a pet from an image",
              parameters: {
                type: "object",
                properties: {
                  breed: { type: "string", description: "Specific breed name" },
                  species: { type: "string", description: "Animal species (cat/dog/bird/etc)" },
                  confidence: { type: "number", description: "Confidence score (0-1)" },
                  physicalCharacteristics: {
                    type: "object",
                    properties: {
                      size: { type: "string", description: "Size category" },
                      coat: { type: "string", description: "Coat type" },
                      colors: { type: "array", items: { type: "string" } }
                    },
                    required: ["size", "coat", "colors"]
                  },
                  temperament: {
                    type: "object",
                    properties: {
                      personality: { type: "array", items: { type: "string" } },
                      energyLevel: { type: "string" },
                      familyFriendly: { type: "string" }
                    },
                    required: ["personality", "energyLevel", "familyFriendly"]
                  },
                  careNeeds: {
                    type: "object",
                    properties: {
                      exercise: { type: "string" },
                      grooming: { type: "string" },
                      feeding: { type: "string" },
                      specialNeeds: { type: "string" }
                    },
                    required: ["exercise", "grooming", "feeding"]
                  },
                  healthConsiderations: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["breed", "species", "confidence", "physicalCharacteristics", "temperament", "careNeeds"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "identify_pet" } }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to analyze pet image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Pet identification response received');

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      return new Response(
        JSON.stringify({ error: 'No valid response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

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
