-- Create profiles table for users (only username)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for pet images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pet-images', 'pet-images', true);

-- Storage policies for pet-images bucket
CREATE POLICY "Anyone can view pet images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pet-images');

CREATE POLICY "Authenticated users can upload pet images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pet-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own pet images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pet-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own pet images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pet-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create gallery_images table
CREATE TABLE public.gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  title TEXT,
  description TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on gallery_images
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Gallery images policies
CREATE POLICY "Gallery images are viewable by everyone"
  ON public.gallery_images FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own gallery images"
  ON public.gallery_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gallery images"
  ON public.gallery_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gallery images"
  ON public.gallery_images FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX gallery_images_user_id_idx ON public.gallery_images(user_id);
CREATE INDEX gallery_images_created_at_idx ON public.gallery_images(created_at DESC);

-- Create pet_identifications table
CREATE TABLE public.pet_identifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  breed TEXT NOT NULL,
  species TEXT NOT NULL,
  confidence DECIMAL NOT NULL,
  physical_characteristics JSONB,
  temperament JSONB,
  care_needs JSONB,
  health_considerations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pet_identifications ENABLE ROW LEVEL SECURITY;

-- Pet identifications policies
CREATE POLICY "Users can view own identifications"
  ON public.pet_identifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own identifications"
  ON public.pet_identifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own identifications"
  ON public.pet_identifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX pet_identifications_user_id_idx ON public.pet_identifications(user_id);
CREATE INDEX pet_identifications_created_at_idx ON public.pet_identifications(created_at DESC);

-- Create health_consultations table
CREATE TABLE public.health_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  advice TEXT NOT NULL,
  citations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.health_consultations ENABLE ROW LEVEL SECURITY;

-- Health consultations policies
CREATE POLICY "Users can view own consultations"
  ON public.health_consultations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consultations"
  ON public.health_consultations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own consultations"
  ON public.health_consultations FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX health_consultations_user_id_idx ON public.health_consultations(user_id);
CREATE INDEX health_consultations_created_at_idx ON public.health_consultations(created_at DESC);

-- Create pet_stories table
CREATE TABLE public.pet_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story TEXT NOT NULL,
  caption TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pet_stories ENABLE ROW LEVEL SECURITY;

-- Pet stories policies
CREATE POLICY "Users can view own stories"
  ON public.pet_stories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stories"
  ON public.pet_stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories"
  ON public.pet_stories FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX pet_stories_user_id_idx ON public.pet_stories(user_id);
CREATE INDEX pet_stories_created_at_idx ON public.pet_stories(created_at DESC);