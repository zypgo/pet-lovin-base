export enum Page {
  Identifier = 'Identifier',
  Health = 'Health',
  HappyLife = 'HappyLife',
  Agent = 'Agent',
}

export enum HappyLifeSubPage {
  Editor = 'Editor',
  StoryCreator = 'StoryCreator',
  Gallery = 'Gallery',
}

export interface SocialPost {
  caption: string;
  imageUrl: string;
}

export interface EditedImageResult {
  text?: string;
  imageBase64?: string;
}
