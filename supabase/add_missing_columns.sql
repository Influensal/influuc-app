-- ============================================
-- ADD ALL MISSING COLUMNS TO POSTS TABLE
-- Run this ONCE in Supabase SQL Editor
-- ============================================

ALTER TABLE posts ADD COLUMN IF NOT EXISTS cta TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hooks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS selected_hook TEXT DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS generation_id UUID REFERENCES content_generations(id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'single';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS carousel_slides JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS carousel_style TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
