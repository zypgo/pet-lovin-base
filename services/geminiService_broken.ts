
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SocialPost, EditedImageResult } from '../types';

// API Key Rotation System
const getAvailableApiKeys = (): string[] => {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  if (process.env.GEMINI_API_KEY_BACKUP) keys.push(process.env.GEMINI_API_KEY_BACKUP);
  if (process.env.GEMINI_API_KEY_2) keys.push(process.env.GEMINI_API_KEY_2);
  
  if (keys.length === 0) {
    throw new Error("No GEMINI_API_KEY environment variables found");
  }
  
  console.log(`Found ${keys.length} API key(s) available for rotation`);
  return keys;
};

const apiKeys = getAvailableApiKeys();
let currentKeyIndex = 0;

const getCurrentAI = (): GoogleGenAI => {
  return new GoogleGenAI({ apiKey: apiKeys[currentKeyIndex] });
};

const rotateToNextKey = (): void => {
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  console.log(`Rotated to API key ${currentKeyIndex + 1}/${apiKeys.length}`);
};

const executeWithKeyRotation = async <T>(operation: (ai: GoogleGenAI) => Promise<T>): Promise<T> => {
  let lastError: any;
  
  // Try with all available keys
  for (let attempt = 0; attempt < apiKeys.length; attempt++) {
    try {
      const ai = getCurrentAI();
      return await operation(ai);
    } catch (error: any) {
      lastError = error;
      console.log(`Attempt ${attempt + 1} failed with key ${currentKeyIndex + 1}:`, error.status || error.message);
      
      // If rate limited (429) and we have more keys, try next key
      if (error.status === 429 && attempt < apiKeys.length - 1) {
        console.log(`Rate limit hit on key ${currentKeyIndex + 1}, trying next key...`);
        rotateToNextKey();
        continue;
      }
      
      // For other errors or if it's the last key, throw immediately
      break;
    }
  }
  
  // If all keys failed, provide helpful error message
  if (lastError?.status === 429) {
    throw new Error("All API keys have hit rate limits. Please wait a few minutes and try again.");
  }
  
  throw lastError;
};

async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

// Updated interface for structured pet identification data
export interface PetIdentificationResult {
  breed: string;
  species: string;
  confidence: number;
  physicalCharacteristics: {
    size: string;
    coat: string;
    colors: string[];
  };
  temperament: {
    personality: string[];
    energyLevel: string;
    familyFriendly: string;
  };
  careNeeds: {
    exercise: string;
    grooming: string;
    feeding: string;
    specialNeeds?: string;
  };
  healthConsiderations?: string[];
}

export async function identifyPet(file: File): Promise<PetIdentificationResult> {
  try {
    const imagePart = await fileToGenerativePart(file);
    const response = await executeWithKeyRotation(async (ai) => 
      ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          imagePart,
          { text: "Analyze this image of a pet and provide structured information. Identify the breed, species, and provide detailed characteristics. Be accurate but friendly in your analysis." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            breed: { type: "string", description: "The identified breed of the pet" },
            species: { type: "string", description: "The species (dog, cat, bird, etc.)" },
            confidence: { type: "number", description: "Confidence level from 0.0 to 1.0" },
            physicalCharacteristics: {
              type: "object",
              properties: {
                size: { type: "string", description: "Size category (small, medium, large, etc.)" },
                coat: { type: "string", description: "Coat type and texture" },
                colors: { type: "array", items: { type: "string" }, description: "Primary colors of the pet" }
              },
              required: ["size", "coat", "colors"]
            },
            temperament: {
              type: "object",
              properties: {
                personality: { type: "array", items: { type: "string" }, description: "Key personality traits" },
                energyLevel: { type: "string", description: "Energy level (low, moderate, high, very high)" },
                familyFriendly: { type: "string", description: "How well they get along with families" }
              },
              required: ["personality", "energyLevel", "familyFriendly"]
            },
            careNeeds: {
              type: "object",
              properties: {
                exercise: { type: "string", description: "Exercise requirements" },
                grooming: { type: "string", description: "Grooming needs" },
                feeding: { type: "string", description: "Feeding recommendations" },
                specialNeeds: { type: "string", description: "Any special care requirements" }
              },
              required: ["exercise", "grooming", "feeding"]
            },
            healthConsiderations: { type: "array", items: { type: "string" }, description: "Common health issues to watch for" }
          },
          required: ["breed", "species", "confidence", "physicalCharacteristics", "temperament", "careNeeds"]
        }
      }
    }));
    
    const petData = JSON.parse(response.text) as PetIdentificationResult;
    return petData;
  } catch (error) {
    console.error("Error in identifyPet:", error);
    throw new Error("Failed to analyze the pet image. The AI may be busy, please try again.");
  }
}

export async function getPetHealthAdvice(question: string): Promise<{ advice: string }> {
  try {
    const response = await executeWithKeyRotation(async (ai) => 
      ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a helpful AI assistant providing general pet health and wellness advice. A user has the following question: "${question}". Provide a helpful, informative, and safe response. Important: You must include a clear disclaimer that you are not a veterinarian and this advice should not replace a consultation with a qualified vet. Format the response using markdown.`,
    })
    );
    return { advice: response.text };
  } catch (error) {
    console.error("Error in getPetHealthAdvice:", error);
    throw new Error("Failed to get health advice. The AI may be busy, please try again.");
  }
}


export async function editPetImage(file: File, prompt: string): Promise<EditedImageResult> {
    try {
        const imagePart = await fileToGenerativePart(file);
        const response = await executeWithKeyRotation(async (ai) => 
            ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    imagePart,
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        })
        );
        
        const result: EditedImageResult = {};
        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
                result.text = part.text;
            } else if (part.inlineData) {
                result.imageBase64 = part.inlineData.data;
            }
        }
        return result;
    } catch (error) {
        console.error("Error in editPetImage:", error);
        throw new Error("Failed to edit the pet image. Please check your prompt or try a different image.");
    }
}

export async function createPetStoryPost(story: string): Promise<SocialPost> {
  try {
    // Step 1: Generate caption and a new image prompt from the story
    const captionResponse = await executeWithKeyRotation(async (ai) => 
      ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Based on the following pet story, generate a social media post. The story is: "${story}". Your output must be a JSON object with two keys: "caption" (a fun, engaging post for Xiaohongshu with emojis and hashtags) and "imagePrompt" (a short, descriptive prompt in English for an AI image generator to create a cute, artistic image that captures the essence of the story).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            caption: {
              type: "string",
              description: "The social media caption.",
            },
            imagePrompt: {
              type: "string",
              description: "The prompt for the image generator.",
            },
          },
        },
      }
    }));

    const captionData = JSON.parse(captionResponse.text);
    const { caption, imagePrompt } = captionData;

    if (!caption || !imagePrompt) {
        throw new Error("AI failed to generate a valid caption and image prompt.");
    }

    // Step 2: Generate an image based on the new prompt
    const imageResponse = await executeWithKeyRotation(async (ai) => 
      ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: imagePrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
    })
    );

    const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

    return { caption, imageUrl };
  } catch (error) {
    console.error("Error in createPetStoryPost:", error);
    throw new Error("Failed to create the social media post. The AI may be experiencing high traffic.");
  }
}
