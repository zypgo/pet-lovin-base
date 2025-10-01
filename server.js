import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, Modality } from '@google/genai';
import { buildHealthGraph } from './graphs/healthGraph.js';
import crypto from 'node:crypto';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Replit environment (more specific)
app.set('trust proxy', 1);

// Configure CORS for frontend only
app.use(cors({
  origin: [
    'http://localhost:5000', 'http://127.0.0.1:5000',
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:5174', 'http://127.0.0.1:5174'
  ],
  credentials: true
}));
// Increase JSON limit to support base64 images
app.use(express.json({ limit: '15mb' }));

// Initialize Gemini client on server (best practice: keep API key server-side)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('[WARN] GEMINI_API_KEY is not set. Gemini endpoints will fail until configured.');
}
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// Rate limiting for API endpoints
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: 'Too many search requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development if needed
    return false;
  }
});

// Rate limiting for Gemini endpoints
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many AI requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper function to validate and sanitize URLs
function validateAndSanitizeUrl(url) {
  try {
    const parsedUrl = new URL(url);
    // Only allow http and https protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return null;
    }
    return parsedUrl.href;
  } catch {
    return null;
  }
}

// Helper function for retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) or rate limits (429)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// ---------------- Research Helpers (Gemini + Perplexity) ----------------
async function geminiJson({ model = 'gemini-2.5-flash', contents, schema }) {
  const resp = await ai.models.generateContent({
    model,
    contents,
    config: schema ? { responseMimeType: 'application/json', responseSchema: schema } : undefined,
  });
  try {
    return JSON.parse(resp.text || '{}');
  } catch {
    return {};
  }
}

async function generateQueries(question) {
  const schema = {
    type: 'object',
    properties: { queries: { type: 'array', items: { type: 'string' } } },
    required: ['queries']
  };
  const data = await geminiJson({
    contents: `You are a research assistant. Generate 3 concise web search queries (English preferred) to research this veterinary health question. Return JSON {"queries": string[]}.
Question: ${question}`,
    schema
  });
  const list = Array.isArray(data.queries) ? data.queries : [];
  const uniq = Array.from(new Set(list.map(q => String(q).trim()).filter(Boolean)));
  return uniq.slice(0, 5);
}

async function reflectAndPropose(question, gatheredText) {
  const schema = {
    type: 'object',
    properties: { needMore: { type: 'boolean' }, queries: { type: 'array', items: { type: 'string' } } },
    required: ['needMore']
  };
  const data = await geminiJson({
    contents: `You are reflecting on research for a veterinary health question.
Question: ${question}
Context (snippets):
${gatheredText}
If knowledge gaps remain, set needMore=true and propose up to 2 follow-up web queries. Return JSON {"needMore": boolean, "queries": string[]}.`,
    schema
  });
  return { needMore: Boolean(data.needMore), queries: Array.isArray(data.queries) ? data.queries : [] };
}

async function runPerplexitySearch(rawQuery, apiKey) {
  const requestBody = {
    query: `veterinary information about: ${rawQuery}`,
    max_results: 8,
    max_tokens_per_page: 1024
  };
  const response = await retryWithBackoff(async () => {
    const res = await fetch('https://api.perplexity.ai/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    if (!res.ok) {
      const errorBody = await res.text();
      const error = new Error(`Perplexity Search API error: ${res.status} ${res.statusText} ${errorBody}`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  });
  return response;
}

// Perplexity search endpoint with rate limiting
app.post('/api/search', searchLimiter, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    const traceId = crypto.randomUUID();
    console.log(`[health-search][${traceId}] question=`, query);

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Perplexity API key not configured' });
    }

    // Use LangGraph compiled app
    const appGraph = buildHealthGraph({ ai, runPerplexitySearch, validateAndSanitizeUrl });
    const state = await appGraph.invoke({ question: query });
    console.log(`[health-search][${traceId}] queries=${(state.queries||[]).length} results=${(state.results||[]).length} citations=${(state.citations||[]).length}`);
    res.json({
      answer_md: state.answer_md,
      citations: state.citations,
      debug: {
        queries: state.queries,
        used_results: (state.results || []).slice(0,10).map(r => ({ title: r.title, url: r.url }))
      },
      traceId
    });

  } catch (error) {
    console.error('Perplexity search error:', error);
    res.status(500).json({ 
      error: `Failed to search: ${error.message}`,
      fallback: true
    });
  }
});

// ---------------- Gemini Endpoints (Server-side key usage) ----------------

// Helper: ensure Gemini client exists
function requireGemini(res) {
  if (!ai) {
    res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    return false;
  }
  return true;
}

// Identify pet from image
app.post('/api/gemini/identify', aiLimiter, async (req, res) => {
  try {
    if (!requireGemini(res)) return;
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'imageBase64 and mimeType are required' });
    }

    const response = await ai.models.generateContent({
      // Unified to gemini-2.5 for multimodal understanding
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType } },
          { text: 'Analyze this image of a pet and provide structured information. Identify the breed, species, and provide detailed characteristics. Be accurate but friendly in your analysis.' }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            breed: { type: 'string' },
            species: { type: 'string' },
            confidence: { type: 'number' },
            physicalCharacteristics: {
              type: 'object',
              properties: {
                size: { type: 'string' },
                coat: { type: 'string' },
                colors: { type: 'array', items: { type: 'string' } },
              },
              required: ['size', 'coat', 'colors']
            },
            temperament: {
              type: 'object',
              properties: {
                personality: { type: 'array', items: { type: 'string' } },
                energyLevel: { type: 'string' },
                familyFriendly: { type: 'string' },
              },
              required: ['personality', 'energyLevel', 'familyFriendly']
            },
            careNeeds: {
              type: 'object',
              properties: {
                exercise: { type: 'string' },
                grooming: { type: 'string' },
                feeding: { type: 'string' },
                specialNeeds: { type: 'string' },
              },
              required: ['exercise', 'grooming', 'feeding']
            },
            healthConsiderations: { type: 'array', items: { type: 'string' } },
          },
          required: ['breed', 'species', 'confidence', 'physicalCharacteristics', 'temperament', 'careNeeds']
        }
      }
    });

    // response.text contains JSON according to SDK's contract
    const petData = JSON.parse(response.text || '{}');
    return res.json(petData);
  } catch (error) {
    console.error('Gemini identify error:', error);
    return res.status(500).json({ error: 'Failed to analyze the pet image' });
  }
});

// Pet health advice
app.post('/api/gemini/health', aiLimiter, async (req, res) => {
  try {
    if (!requireGemini(res)) return;
    const { question } = req.body || {};
    if (!question) {
      return res.status(400).json({ error: 'question is required' });
    }

    try {
      const graph = buildHealthGraph({ ai, runPerplexitySearch, validateAndSanitizeUrl });
      const state = await graph.invoke({ question });
      return res.json({ advice: state.answer_md || '', citations: state.citations || [] });
    } catch (e) {
      // Fallback to simple
      const simple = await simpleHealth(question);
      return res.json({ advice: simple, citations: [] , fallback: true });
    }
  } catch (error) {
    console.error('Gemini health error:', error);
    return res.status(500).json({ error: 'Failed to get health advice' });
  }
});

// Simple health advice endpoint (no LangGraph) for fallbacks
app.post('/api/gemini/health-simple', aiLimiter, async (req, res) => {
  try {
    if (!requireGemini(res)) return;
    const { question } = req.body || {};
    if (!question) {
      return res.status(400).json({ error: 'question is required' });
    }
    const advice = await simpleHealth(question);
    return res.json({ advice, citations: [] });
  } catch (error) {
    console.error('Gemini health-simple error:', error);
    return res.status(500).json({ error: 'Failed to get simple health advice' });
  }
});

// Edit pet image
app.post('/api/gemini/edit-image', aiLimiter, async (req, res) => {
  try {
    if (!requireGemini(res)) return;
    const { imageBase64, mimeType, prompt } = req.body || {};
    if (!imageBase64 || !mimeType || !prompt) {
      return res.status(400).json({ error: 'imageBase64, mimeType and prompt are required' });
    }

    // Use gemini-2.5-flash-image for image editing (supports image output)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    const result = {};
    const parts = response?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.text) {
        result.text = part.text;
      } else if (part.inlineData) {
        result.imageBase64 = part.inlineData.data;
      }
    }
    return res.json(result);
  } catch (error) {
    console.error('Gemini edit-image error:', error);
    return res.status(500).json({ error: 'Failed to edit the pet image', details: error?.message || String(error), status: error?.status });
  }
});

// Create social post for a story
app.post('/api/gemini/story-post', aiLimiter, async (req, res) => {
  try {
    if (!requireGemini(res)) return;
    const { story, captionOnly } = req.body || {};
    if (!story) {
      return res.status(400).json({ error: 'story is required' });
    }

    // Ask for caption + image prompt (JSON)
    const captionResp = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the following pet story, generate a social media post. The story is: "${story}". Your output must be a JSON object with two keys: "caption" (a fun, engaging post for Xiaohongshu with emojis and hashtags) and "imagePrompt" (a short, descriptive prompt in English for an AI image generator to create a cute, artistic image that captures the essence of the story).`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            caption: { type: 'string' },
            imagePrompt: { type: 'string' },
          },
          required: ['caption', 'imagePrompt']
        },
      },
    });

    const { caption, imagePrompt } = JSON.parse(captionResp.text || '{}');
    if (!caption || !imagePrompt) {
      return res.status(500).json({ error: 'AI failed to generate caption/image prompt' });
    }

    // If captionOnly is true, return just the caption and imagePrompt (for use with Lovable AI image generation)
    if (captionOnly) {
      return res.json({ caption, imagePrompt });
    }

    // Generate image
    // Use gemini-2.5-flash-image-preview for story image generation
    let imageBase64 = '';
    const imageResp = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: `Create a cute, artistic image based on this prompt: ${imagePrompt}. The image should be suitable for social media sharing with a square 1:1 aspect ratio.`,
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    const iparts = imageResp?.candidates?.[0]?.content?.parts || [];
    for (const part of iparts) {
      if (part.inlineData) {
        imageBase64 = part.inlineData.data;
        break;
      }
    }
    if (!imageBase64) {
      return res.status(429).json({ error: 'Image generation unavailable (no image returned).' });
    }

    const imageUrl = `data:image/jpeg;base64,${imageBase64}`;
    return res.json({ caption, imageUrl });
  } catch (error) {
    console.error('Gemini story-post error:', error);
    return res.status(500).json({ error: 'Failed to create the social media post', details: error?.message || String(error), status: error?.status });
  }
});

// ---------------- Agent Controller (Function Calling) ----------------

// Internal helpers reuse the same logic as the dedicated endpoints
async function toolIdentify({ imageBase64, mimeType }) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { data: imageBase64, mimeType } },
        { text: 'Analyze this image of a pet and provide structured information. Identify the breed, species, and provide detailed characteristics. Be accurate but friendly in your analysis.' }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          breed: { type: 'string' },
          species: { type: 'string' },
          confidence: { type: 'number' },
          physicalCharacteristics: {
            type: 'object',
            properties: {
              size: { type: 'string' },
              coat: { type: 'string' },
              colors: { type: 'array', items: { type: 'string' } },
            },
            required: ['size', 'coat', 'colors']
          },
          temperament: {
            type: 'object',
            properties: {
              personality: { type: 'array', items: { type: 'string' } },
              energyLevel: { type: 'string' },
              familyFriendly: { type: 'string' },
            },
            required: ['personality', 'energyLevel', 'familyFriendly']
          },
          careNeeds: {
            type: 'object',
            properties: {
              exercise: { type: 'string' },
              grooming: { type: 'string' },
              feeding: { type: 'string' },
              specialNeeds: { type: 'string' },
            },
            required: ['exercise', 'grooming', 'feeding']
          },
          healthConsiderations: { type: 'array', items: { type: 'string' } },
        },
        required: ['breed', 'species', 'confidence', 'physicalCharacteristics', 'temperament', 'careNeeds']
      }
    }
  });
  return JSON.parse(response.text || '{}');
}

async function toolHealth({ question }) {
  try {
    const graph = buildHealthGraph({ ai, runPerplexitySearch, validateAndSanitizeUrl });
    const state = await graph.invoke({ question });
    return { answer_md: state.answer_md || '', citations: state.citations || [] };
  } catch (e) {
    const advice = await simpleHealth(question);
    return { advice, citations: [] , fallback: true };
  }
}

async function toolEditImage({ imageBase64, mimeType, prompt }) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: imageBase64, mimeType } },
        { text: prompt },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });
  const result = {};
  const parts = response?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.text) {
      result.text = part.text;
    } else if (part.inlineData) {
      result.imageBase64 = part.inlineData.data;
    }
  }
  return result;
}

async function toolStory({ story }) {
  const captionResp = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Based on the following pet story, generate a social media post. The story is: "${story}". Your output must be a JSON object with two keys: "caption" (a fun, engaging post for Xiaohongshu with emojis and hashtags) and "imagePrompt" (a short, descriptive prompt in English for an AI image generator to create a cute, artistic image that captures the essence of the story).`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          caption: { type: 'string' },
          imagePrompt: { type: 'string' },
        },
        required: ['caption', 'imagePrompt']
      },
    },
  });
  const { caption, imagePrompt } = JSON.parse(captionResp.text || '{}');
  const imageResp = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: `Create a cute, artistic image based on this prompt: ${imagePrompt}. The image should be suitable for social media sharing with a square 1:1 aspect ratio.`,
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });
  let imageBase64 = '';
  const iparts = imageResp?.candidates?.[0]?.content?.parts || [];
  for (const part of iparts) {
    if (part.inlineData) {
      imageBase64 = part.inlineData.data;
      break;
    }
  }
  const imageUrl = imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : '';
  return { caption, imageUrl };
}

// Simple health advice generator (single model call)
async function simpleHealth(question) {
  const resp = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `你是一位友善的宠物健康助手。请用中文针对如下问题给出简洁、可执行的建议，包含小标题：可能原因/家庭照护/何时就医/温馨提示。严格加入“非医疗诊断”免责声明。问题：${question}`
  });
  return resp.text || '';
}

// General web research tool (Perplexity → synthesize, 5 results)
async function toolWebResearch({ question }) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return { advice: 'Perplexity API key not configured', citations: [] };
  }
  const data = await runPerplexitySearch(question, apiKey);
  const results = (data.results || []).slice(0, 5);
  const citations = Array.from(new Set(results.map(r => validateAndSanitizeUrl(r.url)).filter(Boolean)));
  const compiled = results.map(r => `${r.title}\n${r.snippet}`).join('\n\n');
  const resp = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `根据以下检索片段，用中文给出简洁回答，并在关键事实后内嵌脚注[^n]（最多5条）。\n不要在答案中输出脚注映射；我会在答案后追加映射列表。\n问题：${question}\n片段：\n${compiled}\n参考链接（供你选择并编号，不要直接粘贴到答案末尾）：\n${citations.map((u, i) => `[^${i+1}]: ${u}`).join('\n')}`
  });
  // 防御性移除模型可能输出的“脚注映射”等提示性文本
  let text = resp.text || compiled;
  text = text.replace(/(^|\n)\s*脚注映射[^\n]*\n?/g, '\n');
  return { answer_md: text, citations };
}

// POST /api/agent/chat
app.post('/api/agent/chat', aiLimiter, async (req, res) => {
  try {
    if (!requireGemini(res)) return;
    const traceId = crypto.randomUUID();
    const { message, imageBase64, mimeType, deepSearch } = req.body || {};
    if (!message && !imageBase64) {
      return res.status(400).json({ error: 'message or image is required', traceId });
    }

    const systemInstruction = `You are the "Pet Home" server-side Agent. Choose and call tools to help the user. Important rules:
- Only call tools from the allowed list.
- If user requests identify or edit and no image is available, ask for an image.
 - If INTENT=health (symptoms/疾病/护理/就医/用药等) 或 deepSearch=true，则优先 get_pet_health_advice；
 - 如果 INTENT=search（推荐/品牌/评测/哪里买/最新/新闻/资料/来源/搜索等），优先 web_research；
 - 不要尝试需要图片的工具如果没有图片。
- Keep responses concise and friendly.`;

    const tools = [
      {
        functionDeclarations: [
          { name: 'identify_pet', description: 'Identify pet breed/species and characteristics from an uploaded image.', parametersJsonSchema: { type: 'object', properties: {} } },
        { name: 'get_pet_health_advice', description: 'Provide pet health advice (prefers deep research, fallback to simple).', parametersJsonSchema: { type: 'object', properties: { question: { type: 'string' } }, required: ['question'] } },
        { name: 'web_research', description: 'General web research via Perplexity (returns summarized answer with citations).', parametersJsonSchema: { type: 'object', properties: { question: { type: 'string' } }, required: ['question'] } },
          { name: 'edit_pet_image', description: 'Edit a pet image based on a prompt.', parametersJsonSchema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] } },
          { name: 'create_pet_story_post', description: 'Create caption and image for a pet story.', parametersJsonSchema: { type: 'object', properties: { story: { type: 'string' } }, required: ['story'] } },
        ],
      },
    ];

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.95,
        topK: 40,
        tools,
        systemInstruction,
        toolConfig: {
          functionCallingConfig: { mode: 'AUTO' }
        }
      }
    });

    const messages = [];
    const toolCalls = [];
    let lastResult = null;
    const maxRounds = 2;
    let round = 0;

    const userContext = imageBase64 ? '(An image is attached in this request.)' : '(No image is attached.)';
    const textMsg = String(message || '');
    const healthHints = ['挠','瘙','痒','呕吐','腹泻','便血','发烧','咳','打喷嚏','流鼻涕','感染','寄生虫','耳螨','疫苗','皮肤','掉毛','护理','就医','治疗','用药','如何处理','怎么办'];
    const searchHints = ['搜索','查询','查找','资料','来源','链接','网站','最新','新闻','报告','数据','评测','测评','品牌','推荐','哪款','哪个好','哪里买','价格','对比','榜单'];
    const contains = (arr) => arr.some(k => textMsg.includes(k));
    const likelyHealth = contains(healthHints) && !contains(['品牌','推荐','价格','哪款','粮','饲料']);
    const likelySearch = contains(searchHints) && !likelyHealth;
    const intentHint = likelyHealth ? '(INTENT=health)' : '(INTENT=search)';
    const deepFlag = (deepSearch ?? false) || likelyHealth ? '(User explicitly requested deep search for health advice.)' : '';
    let result = await chat.sendMessage({ message: [{ text: `${userContext} ${intentHint} ${deepFlag}\n${textMsg}` }] });

    while (round < maxRounds) {
      const candidate = result.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      if (!part) break;
      if (part.functionCall) {
        round++;
        const { name, args } = part.functionCall;
        toolCalls.push({ name, args });

        let toolResponse;
        if (name === 'identify_pet') {
          if (!imageBase64 || !mimeType) {
            // Gracefully inform the model that an image is required instead of throwing
            toolResponse = { error: 'IMAGE_REQUIRED', message: 'Image is required for identify_pet' };
          } else {
            toolResponse = await toolIdentify({ imageBase64, mimeType });
          }
        } else if (name === 'get_pet_health_advice') {
          toolResponse = await toolHealth({ question: args?.question || message || '' });
        } else if (name === 'web_research') {
          toolResponse = await toolWebResearch({ question: args?.question || message || '' });
        } else if (name === 'edit_pet_image') {
          if (!imageBase64 || !mimeType) {
            toolResponse = { error: 'IMAGE_REQUIRED', message: 'Image is required for edit_pet_image' };
          } else {
            toolResponse = await toolEditImage({ imageBase64, mimeType, prompt: args?.prompt || '' });
          }
        } else if (name === 'create_pet_story_post') {
          toolResponse = await toolStory({ story: args?.story || message || '' });
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }
        lastResult = toolResponse;

        result = await chat.sendMessage({
          message: [{ functionResponse: { name, response: toolResponse } }]
        });
      } else if (part.text) {
        messages.push({ role: 'model', content: part.text });
        break;
      } else {
        break;
      }
    }

    return res.json({ messages, toolCalls, result: lastResult, usage: {}, traceId });
  } catch (error) {
    console.error('Agent controller error:', error);
    return res.status(500).json({ error: 'Agent failed', details: error?.message || String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});