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
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/gemini/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/gemini/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Health advice failed: ${response.status} ${errText}`);
    }
    const data = await response.json();
    if (data?.fallback) {
      // Call simple fallback
      const simpleResp = await fetch(`${baseUrl}/api/gemini/health-simple`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question })
      });
      if (simpleResp.ok) return await simpleResp.json();
    }
    return data;
  } catch (error) {
    console.error('Error in getPetHealthAdvice:', error);
    throw new Error('Failed to get health advice. Please try again.');
  }
}

export async function editPetImage(file: File, prompt: string): Promise<EditedImageResult> {
  try {
    const imagePart = await fileToGenerativePart(file);
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/gemini/edit-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: imagePart.inlineData.data, mimeType: file.type, prompt }),
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
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/gemini/story-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story }),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Create story post failed: ${response.status} ${errText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in createPetStoryPost:', error);
    throw new Error('Failed to create the social media post. Please try again.');
  }
}