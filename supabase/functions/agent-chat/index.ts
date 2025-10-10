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
    const { message, imageBase64, mimeType, deepSearch, conversationHistory = [] } = await req.json();
    
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

    console.log('Agent processing:', { 
      hasMessage: !!message, 
      hasImage: !!imageBase64, 
      deepSearch,
      historyLength: conversationHistory.length 
    });

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

    // Build conversation history for Gemini
    const contents = [];
    
    // Add conversation history
    for (const msg of conversationHistory) {
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }]
        });
      }
    }
    
    // Add current user message
    contents.push({
      role: 'user',
      parts: [
        ...(imageBase64 ? [{ inline_data: { mime_type: mimeType, data: imageBase64 } }] : []),
        { text: userContent }
      ]
    });

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
        maxOutputTokens: 32000,
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
    let finalResponse = '';
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
            // Use Perplexity Search API + Gemini synthesis
            const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
            if (!PERPLEXITY_API_KEY) {
              result = { error: 'Perplexity API key not configured' };
              break;
            }
            
            // Step 1: Perplexity Search
            const perplexityResponse = await fetch('https://api.perplexity.ai/search', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query: toolArgs.query,
                max_results: 10,
                max_tokens_per_page: 1024
              }),
            });

            if (!perplexityResponse.ok) {
              const errorText = await perplexityResponse.text();
              console.error('Perplexity error:', perplexityResponse.status, errorText);
              result = { error: `搜索失败: ${perplexityResponse.status}` };
            } else {
              const searchData = await perplexityResponse.json();
              const searchResults = searchData.results || [];
              const citations = searchResults.map((r: any) => r.url).filter(Boolean);

              // Step 2: Gemini synthesis
              const formattedResults = searchResults.map((r: any, i: number) => 
                `[${i+1}] ${r.title}\nURL: ${r.url}\n内容: ${r.snippet}`
              ).join('\n\n');

              const geminiResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{
                      parts: [{
                        text: `基于以下搜索结果回答问题。

问题: ${toolArgs.query}

搜索结果:
${formattedResults}

请提供准确、实用的回答，使用中文，markdown格式。`
                      }]
                    }],
                    generationConfig: {
                      temperature: 0.3,
                      maxOutputTokens: 64000
                    }
                  })
                }
              );

              if (geminiResponse.ok) {
                const geminiData = await geminiResponse.json();
                const answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                result = { answer, citations };
              } else {
                result = { error: '生成回答失败' };
              }
            }
            break;

          default:
            console.warn(`Unknown tool: ${toolName}`);
        }

        console.log('Tool execution completed:', { toolName, hasResult: !!result });

        // Step 3: Send tool result back to Gemini for final response
        if (result && !result.error) {
          console.log('Sending tool result back to Gemini for synthesis...');
          
          // Build new conversation with tool response
          const followUpContents = [...contents];
          
          // Add the function call from assistant
          followUpContents.push({
            role: 'model',
            parts: [{ functionCall }]
          });
          
          // Add the function response
          followUpContents.push({
            role: 'user',
            parts: [{
              functionResponse: {
                name: toolName,
                response: { result: JSON.stringify(result) }
              }
            }]
          });

          const synthesisPayload: any = {
            contents: followUpContents,
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
              temperature: 0.7,
              maxOutputTokens: 32000,
            }
          };

          const synthesisResponse = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY,
              },
              body: JSON.stringify(synthesisPayload)
            }
          );

          if (synthesisResponse.ok) {
            const synthesisData = await synthesisResponse.json();
            finalResponse = synthesisData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log('Synthesis completed, response length:', finalResponse.length);
          } else {
            const errorText = await synthesisResponse.text();
            console.error('Synthesis error:', errorText);
            finalResponse = '工具执行成功，但生成回复时出错。';
          }
        } else if (result?.error) {
          finalResponse = `执行出错：${result.error}`;
        }

      } catch (error) {
        console.error(`Tool execution error for ${toolName}:`, error);
        result = {
          error: `执行工具 ${toolName} 时出错: ${error.message}`
        };
        finalResponse = `执行工具时出错：${error.message}`;
      }
    } else {
      // No tool call, use direct response
      finalResponse = candidate?.content?.parts?.find(p => p.text)?.text || '';
    }

    return new Response(
      JSON.stringify({ 
        response: finalResponse,
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
