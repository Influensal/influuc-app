-- Influuc Database Schema
-- Run this SQL in your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

-- ============================================
-- FOUNDER PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS founder_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'User',
    platforms JSONB NOT NULL DEFAULT '{}',
    industry TEXT,
    target_audience TEXT,
    content_goal TEXT,
    topics TEXT[] DEFAULT '{}',
    cadence TEXT CHECK (cadence IN ('light', 'moderate', 'active')) DEFAULT 'moderate',
    tone JSONB DEFAULT '{}',
    voice_model_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VOICE SAMPLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS voice_samples (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    source_type TEXT CHECK (source_type IN ('paste', 'upload', 'voicenote', 'url')) DEFAULT 'paste',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE NOT NULL,
    platform TEXT CHECK (platform IN ('x', 'linkedin', 'instagram')) NOT NULL,
    scheduled_date TIMESTAMPTZ NOT NULL,
    content TEXT NOT NULL,
    hooks TEXT[] DEFAULT '{}',
    selected_hook TEXT,
    cta TEXT,
    format TEXT CHECK (format IN ('single', 'thread', 'long_form', 'video_script')) DEFAULT 'single',
    status TEXT CHECK (status IN ('scheduled', 'posted', 'skipped')) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SPONTANEOUS IDEAS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS spontaneous_ideas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE NOT NULL,
    input TEXT NOT NULL,
    input_type TEXT CHECK (input_type IN ('text', 'voicenote', 'url')) DEFAULT 'text',
    generated_content JSONB,
    platform TEXT CHECK (platform IN ('x', 'linkedin', 'instagram')),
    saved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_posts_profile_id ON posts(profile_id);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_date ON posts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_voice_samples_profile_id ON voice_samples(profile_id);
CREATE INDEX IF NOT EXISTS idx_spontaneous_ideas_profile_id ON spontaneous_ideas(profile_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE spontaneous_ideas ENABLE ROW LEVEL SECURITY;

-- For development: Allow all operations (remove this in production!)
-- You should replace these with proper auth-based policies
CREATE POLICY "Allow all for development" ON founder_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON voice_samples FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON spontaneous_ideas FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Schema created successfully! Your tables are ready.' as message;
