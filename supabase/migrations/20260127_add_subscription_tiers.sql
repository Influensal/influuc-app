-- Create Enums for Pricing & Visual Strategy
-- Drop existing types if they exist to allow clean creation (or we can use IF NOT EXISTS)
-- Since this is a new migration file, we assume these don't exist yet in prod.

CREATE TYPE subscription_tier AS ENUM ('starter', 'growth', 'authority'); -- 19, 39, 49
CREATE TYPE visual_generation_mode AS ENUM ('none', 'faceless', 'clone');
CREATE TYPE face_model_status AS ENUM ('not_started', 'training', 'ready', 'failed');

-- Modify founder_profiles
ALTER TABLE founder_profiles 
ADD COLUMN subscription_tier subscription_tier DEFAULT 'starter',
ADD COLUMN visual_mode visual_generation_mode DEFAULT 'none',
-- Limits & Features
ADD COLUMN ideas_limit_monthly int DEFAULT 30, -- Tier 1: 30, T2/3: 999999
ADD COLUMN carousels_limit_weekly int DEFAULT 0, -- T1: 0, T2/3: 2
ADD COLUMN news_feature_enabled boolean DEFAULT false, -- Only T3
-- Visual Styles (Granular)
ADD COLUMN style_faceless text,
ADD COLUMN style_carousel text,
ADD COLUMN style_face text,
-- Face Cloning
ADD COLUMN face_model_status face_model_status DEFAULT 'not_started',
ADD COLUMN avatar_urls text[] DEFAULT '{}',
ADD COLUMN face_trigger_word text;

-- Update existing users to 'starter' defaults
UPDATE founder_profiles 
SET 
  subscription_tier = 'starter',
  ideas_limit_monthly = 30,
  carousels_limit_weekly = 0,
  news_feature_enabled = false,
  visual_mode = 'none'
WHERE subscription_tier IS NULL;

-- Create Storage Bucket for User Photos if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user_photos', 'user_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Users can upload their own photos
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'user_photos' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Users can view their own photos"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'user_photos' AND auth.uid()::text = (storage.foldername(name))[1] );
