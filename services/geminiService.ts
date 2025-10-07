import { SocialPost, EditedImageResult } from '../types';
import { supabase } from '../src/integrations/supabase/client';

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
    
    const { data, error } = await supabase.functions.invoke('pet-identify', {
      body: { 
        imageBase64: imagePart.inlineData.data, 
        mimeType: file.type 
      }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in identifyPet:', error);
    throw new Error('Failed to analyze the pet image. Please try again.');
  }
}

export async function getPetHealthAdvice(question: string): Promise<{ advice: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('health-advice', {
      body: { question }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in getPetHealthAdvice:', error);
    throw new Error('Failed to get health advice. Please try again.');
  }
}

export async function editPetImage(file: File, prompt: string): Promise<EditedImageResult> {
  try {
    const imagePart = await fileToGenerativePart(file);
    
    const { data, error } = await supabase.functions.invoke('image-edit', {
      body: { 
        imageBase64: imagePart.inlineData.data, 
        prompt 
      }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in editPetImage:', error);
    throw new Error('Failed to edit the pet image. Please try a different image or prompt.');
  }
}

export async function createPetStoryPost(story: string): Promise<SocialPost> {
  try {
    // First, generate caption using edge function
    const { data: captionData, error: captionError } = await supabase.functions.invoke('story-caption', {
      body: { story }
    });
    
    if (captionError) throw captionError;
    
    const { caption, imagePrompt } = captionData;
    
    // Now generate image using Lovable AI
    const { data: imageData, error: imageError } = await supabase.functions.invoke('image-generate', {
      body: { 
        prompt: `Create a cute, artistic image based on this prompt: ${imagePrompt}. The image should be suitable for social media sharing with a square 1:1 aspect ratio.`
      }
    });
    
    if (imageError) throw imageError;
    
    const { imageUrl } = imageData;
    
    return { caption, imageUrl };
  } catch (error) {
    console.error('Error in createPetStoryPost:', error);
    throw new Error('Failed to create the social media post. Please try again.');
  }
}