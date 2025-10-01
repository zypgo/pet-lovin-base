import { SocialPost, EditedImageResult } from '../types';

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
    const SUPABASE_URL = 'https://betukaetgtzkfhxhwqma.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldHVrYWV0Z3R6a2ZoeGh3cW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMjcyMDcsImV4cCI6MjA3NDkwMzIwN30.npgKZO6tsj84kCMnCPCul-Gg3nXB_dZXEY8dSzeWFUU';
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/pet-identify`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ imageBase64: imagePart.inlineData.data, mimeType: file.type }),
    });
    
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Identify failed: ${response.status} ${errText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in identifyPet:', error);
    throw new Error('Failed to analyze the pet image. Please try again.');
  }
}

export async function getPetHealthAdvice(question: string): Promise<{ advice: string }> {
  try {
    const SUPABASE_URL = 'https://betukaetgtzkfhxhwqma.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldHVrYWV0Z3R6a2ZoeGh3cW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMjcyMDcsImV4cCI6MjA3NDkwMzIwN30.npgKZO6tsj84kCMnCPCul-Gg3nXB_dZXEY8dSzeWFUU';
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/health-advice`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ question }),
    });
    
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Health advice failed: ${response.status} ${errText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getPetHealthAdvice:', error);
    throw new Error('Failed to get health advice. Please try again.');
  }
}

export async function editPetImage(file: File, prompt: string): Promise<EditedImageResult> {
  try {
    const imagePart = await fileToGenerativePart(file);
    const SUPABASE_URL = 'https://betukaetgtzkfhxhwqma.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldHVrYWV0Z3R6a2ZoeGh3cW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMjcyMDcsImV4cCI6MjA3NDkwMzIwN30.npgKZO6tsj84kCMnCPCul-Gg3nXB_dZXEY8dSzeWFUU';
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/image-edit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ imageBase64: imagePart.inlineData.data, prompt }),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Edit image failed: ${response.status} ${errText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in editPetImage:', error);
    throw new Error('Failed to edit the pet image. Please try a different image or prompt.');
  }
}

export async function createPetStoryPost(story: string): Promise<SocialPost> {
  try {
    const SUPABASE_URL = 'https://betukaetgtzkfhxhwqma.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldHVrYWV0Z3R6a2ZoeGh3cW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMjcyMDcsImV4cCI6MjA3NDkwMzIwN30.npgKZO6tsj84kCMnCPCul-Gg3nXB_dZXEY8dSzeWFUU';
    
    // First, generate caption using Supabase edge function
    const captionResponse = await fetch(`${SUPABASE_URL}/functions/v1/story-caption`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ story }),
    });
    
    if (!captionResponse.ok) {
      const errText = await captionResponse.text().catch(() => '');
      throw new Error(`Caption generation failed: ${captionResponse.status} ${errText}`);
    }
    
    const { caption, imagePrompt } = await captionResponse.json();
    
    // Now generate image using Lovable AI
    const imageResponse = await fetch(`${SUPABASE_URL}/functions/v1/image-generate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ 
        prompt: `Create a cute, artistic image based on this prompt: ${imagePrompt}. The image should be suitable for social media sharing with a square 1:1 aspect ratio.`
      }),
    });
    
    if (!imageResponse.ok) {
      const errText = await imageResponse.text().catch(() => '');
      throw new Error(`Image generation failed: ${imageResponse.status} ${errText}`);
    }
    
    const { imageUrl } = await imageResponse.json();
    
    return { caption, imageUrl };
  } catch (error) {
    console.error('Error in createPetStoryPost:', error);
    throw new Error('Failed to create the social media post. Please try again.');
  }
}