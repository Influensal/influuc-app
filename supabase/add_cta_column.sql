-- Add missing 'cta' column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS cta TEXT;
