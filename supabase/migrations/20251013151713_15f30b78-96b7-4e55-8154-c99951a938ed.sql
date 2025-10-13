-- Add is_public column to gallery_images table
ALTER TABLE public.gallery_images 
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

-- Update RLS policies for gallery_images
-- Drop existing policies
DROP POLICY IF EXISTS "Gallery images are viewable by everyone" ON public.gallery_images;
DROP POLICY IF EXISTS "Users can view own gallery images" ON public.gallery_images;

-- Create new policies for public and private images
CREATE POLICY "Public gallery images are viewable by everyone" 
ON public.gallery_images 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Users can view their own private gallery images" 
ON public.gallery_images 
FOR SELECT 
USING (auth.uid() = user_id);

-- Update policy allows users to update their own images (for sharing)
DROP POLICY IF EXISTS "Users can update own gallery images" ON public.gallery_images;
CREATE POLICY "Users can update own gallery images" 
ON public.gallery_images 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);