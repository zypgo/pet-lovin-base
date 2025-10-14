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
    const { story } = await req.json();
    
    if (!story) {
      return new Response(
        JSON.stringify({ error: 'story is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: 'Service configuration error. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating caption for story');

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{
              text: `Based on the following pet story, generate a social media post. The story is: "${story}". Your output must be a JSON object with two keys: "caption" (a fun, engaging post for social media with emojis and hashtags) and "imagePrompt" (a short, descriptive prompt in English for an AI image generator to create a cute, artistic image that captures the essence of the story).`
            }]
          }
        ],
        tools: [
          {
            function_declarations: [
              {
                name: "create_social_post",
                description: "Create a social media post with caption and image prompt",
                parameters: {
                  type: "object",
                  properties: {
                    caption: {
                      type: "string",
                      description: "A fun, engaging social media post with emojis and hashtags"
                    },
                    imagePrompt: {
                      type: "string",
                      description: "A short descriptive prompt for AI image generation"
                    }
                  },
                  required: ["caption", "imagePrompt"]
                }
              }
            ]
          }
        ],
        tool_config: {
          function_calling_config: {
            mode: "ANY",
            allowed_function_names: ["create_social_post"]
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate caption' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Caption generation response received');

    // Extract function call result from Gemini response
    const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    if (!functionCall || !functionCall.args) {
      return new Response(
        JSON.stringify({ error: 'No valid response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { caption, imagePrompt } = functionCall.args;

    if (!caption || !imagePrompt) {
      return new Response(
        JSON.stringify({ error: 'Invalid response format from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ caption, imagePrompt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Story caption error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
