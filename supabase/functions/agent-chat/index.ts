// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to call other edge functions
async function callEdgeFunction(functionName: string, payload: any) {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${functionName} failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, imageBase64, mimeType, deepSearch } = await req.json();
    
    if (!message && !imageBase64) {
      return new Response(
        JSON.stringify({ error: 'message or image is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Agent processing:', { hasMessage: !!message, hasImage: !!imageBase64, deepSearch });

    // Define available tools
    const tools = [
      {
        name: "identify_pet",
        description: "Identifies pet species and breed from an image. Use when user asks about pet identification or shares a pet photo.",
        parameters: {
          type: "object",
          properties: {
            imageBase64: { type: "string", description: "Base64 encoded image data" },
            mimeType: { type: "string", description: "Image MIME type" }
          },
          required: ["imageBase64", "mimeType"]
        }
      },
      {
        name: "get_pet_health_advice",
        description: "Provides pet health advice and recommendations. Use when user asks about pet health, symptoms, care, or medical concerns. Set deepSearch to true for research-backed answers.",
        parameters: {
          type: "object",
          properties: {
            question: { type: "string", description: "The health question or concern" },
            deepSearch: { type: "boolean", description: "Whether to use deep research for comprehensive answer" }
          },
          required: ["question"]
        }
      },
      {
        name: "edit_pet_image",
        description: "Edits or modifies a pet image based on instructions. Use when user wants to edit, enhance, or modify a pet photo.",
        parameters: {
          type: "object",
          properties: {
            imageBase64: { type: "string", description: "Base64 encoded image data" },
            mimeType: { type: "string", description: "Image MIME type" },
            prompt: { type: "string", description: "Edit instructions" }
          },
          required: ["imageBase64", "mimeType", "prompt"]
        }
      },
      {
        name: "create_pet_story",
        description: "Creates a social media story or post about a pet with generated image and caption. Use when user wants to create content or stories about their pet.",
        parameters: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "Story or post description" }
          },
          required: ["prompt"]
        }
      },
      {
        name: "web_research",
        description: "Performs comprehensive web research on pet-related topics using multiple sources. Use for general pet questions, recommendations, or when detailed research is needed.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Research query" }
          },
          required: ["query"]
        }
      }
    ];

    // Step 1: Let Gemini decide which tool to use
    const systemPrompt = `你是Pet Home AI助手。你可以帮助用户：
- 识别宠物品种（当用户分享图片时）
- 提供宠物健康建议（普通或深度研究）
- 编辑宠物照片
- 创建宠物故事/社交媒体内容
- 进行网络研究回答宠物相关问题

分析用户的请求并选择最合适的工具。如果用户上传了图片，优先考虑图片相关的工具。`;

    const userContent = message || "请分析这张宠物图片";

    // Prepare contents for Gemini
    const contents = [{
      parts: [
        ...(imageBase64 ? [{ inline_data: { mime_type: mimeType, data: imageBase64 } }] : []),
        { text: userContent }
      ]
    }];

    // Call Gemini with function calling
    const geminiPayload: any = {
      contents,
      tools: [{
        function_declarations: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }))
      }],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
      }
    };

    console.log('Calling Gemini for tool selection...');
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify(geminiPayload)
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const candidate = geminiData.candidates?.[0];
    const functionCall = candidate?.content?.parts?.[0]?.functionCall;

    console.log('Gemini response:', { 
      hasFunctionCall: !!functionCall, 
      functionName: functionCall?.name 
    });

    // Step 2: Execute the selected tool
    let result = null;
    const toolCalls = [];

    if (functionCall) {
      const toolName = functionCall.name;
      const toolArgs = functionCall.args || {};
      
      toolCalls.push({ name: toolName, args: toolArgs });
      console.log(`Executing tool: ${toolName}`);

      try {
        switch (toolName) {
          case 'identify_pet':
            result = await callEdgeFunction('pet-identify', {
              imageBase64: toolArgs.imageBase64 || imageBase64,
              mimeType: toolArgs.mimeType || mimeType
            });
            break;

          case 'get_pet_health_advice':
            if (toolArgs.deepSearch || deepSearch) {
              // Use search function for deep research
              const searchResult = await callEdgeFunction('search', {
                query: toolArgs.question
              });
              result = searchResult;
            } else {
              // Use standard health advice
              result = await callEdgeFunction('health-advice', {
                question: toolArgs.question,
                imageBase64: imageBase64,
                mimeType: mimeType
              });
            }
            break;

          case 'edit_pet_image':
            result = await callEdgeFunction('image-edit', {
              imageBase64: toolArgs.imageBase64 || imageBase64,
              mimeType: toolArgs.mimeType || mimeType,
              prompt: toolArgs.prompt
            });
            break;

          case 'create_pet_story':
            result = await callEdgeFunction('story-caption', {
              prompt: toolArgs.prompt
            });
            break;

          case 'web_research':
            // Simple single-query Perplexity search (not deep research)
            const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
            if (!PERPLEXITY_API_KEY) {
              result = { error: 'Perplexity API key not configured' };
              break;
            }
            
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
                    content: '你是一个专业的宠物健康信息助手。提供准确、实用的信息并附上来源。'
                  },
                  {
                    role: 'user',
                    content: toolArgs.query
                  }
                ],
                temperature: 0.2,
                max_tokens: 1500,
              }),
            });

            if (!perplexityResponse.ok) {
              const errorText = await perplexityResponse.text();
              console.error('Perplexity error:', perplexityResponse.status, errorText);
              result = { error: `搜索失败: ${perplexityResponse.status}` };
            } else {
              const perplexityData = await perplexityResponse.json();
              result = {
                answer: perplexityData.choices?.[0]?.message?.content || '',
                citations: perplexityData.citations || []
              };
            }
            break;

          default:
            console.warn(`Unknown tool: ${toolName}`);
        }

        console.log('Tool execution completed:', { toolName, hasResult: !!result });

      } catch (error) {
        console.error(`Tool execution error for ${toolName}:`, error);
        // Return error message as result
        result = {
          error: `执行工具 ${toolName} 时出错: ${error.message}`
        };
      }
    }

    // Step 3: Return response
    const responseText = candidate?.content?.parts?.find(p => p.text)?.text;

    return new Response(
      JSON.stringify({ 
        messages: responseText ? [{ role: 'model', content: responseText }] : [],
        result: result,
        toolCalls: toolCalls
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Agent chat error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Agent failed', 
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
