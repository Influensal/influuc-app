-- Add AI Visuals Columns to founder_profiles
ALTER TABLE founder_profiles 
ADD COLUMN IF NOT EXISTS visual_lora_id TEXT,
ADD COLUMN IF NOT EXISTS visual_training_status TEXT DEFAULT 'not_started';
