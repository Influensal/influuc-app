-- ============================================
-- WEEKLY CONTENT GENERATION SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CONTENT GENERATIONS TABLE (NEW)
-- Tracks weekly generation history
-- ============================================
CREATE TABLE IF NOT EXISTS content_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Generation tracking
    week_number INT NOT NULL,  -- Sequential week count for this user
    generation_date TIMESTAMPTZ DEFAULT NOW(),
    week_start_date DATE NOT NULL,  -- First day of generated content
    week_end_date DATE NOT NULL,    -- Last day of generated content
    
    -- Stats
    x_posts_count INT DEFAULT 0,
    linkedin_posts_count INT DEFAULT 0,
    
    -- Status
    status TEXT CHECK (status IN ('generating', 'completed', 'failed')) DEFAULT 'generating',
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for content_generations
CREATE INDEX IF NOT EXISTS idx_content_generations_account_id ON content_generations(account_id);
CREATE INDEX IF NOT EXISTS idx_content_generations_status ON content_generations(status);

-- RLS for content_generations
ALTER TABLE content_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own generations" ON content_generations
    FOR SELECT USING (auth.uid() = account_id);
CREATE POLICY "Allow all for development" ON content_generations
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 2. UPDATE FOUNDER_PROFILES TABLE
-- Add generation scheduling fields
-- ============================================
ALTER TABLE founder_profiles
    ADD COLUMN IF NOT EXISTS next_generation_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS generation_day_of_week INT DEFAULT 0,  -- 0=Sunday, 1=Monday, etc.
    ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS generation_count INT DEFAULT 0;

-- ============================================
-- 3. UPDATE POSTS TABLE
-- Add generation tracking and archive support
-- ============================================
ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS generation_id UUID REFERENCES content_generations(id),
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

-- Update status check to include 'archived' and 'failed'
-- First drop existing constraint if it exists
DO $$ 
BEGIN
    ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Add new constraint with all statuses
ALTER TABLE posts ADD CONSTRAINT posts_status_check 
    CHECK (status IN ('scheduled', 'posted', 'skipped', 'failed', 'archived'));

-- Index for archived posts
CREATE INDEX IF NOT EXISTS idx_posts_archived_at ON posts(archived_at);
CREATE INDEX IF NOT EXISTS idx_posts_generation_id ON posts(generation_id);

-- ============================================
-- 4. UPDATE SUBSCRIPTIONS TABLE
-- Add generation tracking for payments
-- ============================================
ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS last_generation_paid TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS generations_count INT DEFAULT 0;

-- ============================================
-- 5. NOTIFICATIONS TABLE (NEW)
-- Store in-app notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Notification content
    type TEXT CHECK (type IN ('week_ready', 'subscription_expired', 'trial_ending', 'post_failed', 'general')) NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    action_url TEXT,
    
    -- Status
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_account_id ON notifications(account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = account_id);
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = account_id);
CREATE POLICY "Allow all for development" ON notifications
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 6. FUNCTION TO SET NEXT GENERATION DATE
-- Called after successful generation
-- ============================================
CREATE OR REPLACE FUNCTION set_next_generation_date(profile_id UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    next_date TIMESTAMPTZ;
    profile_tz TEXT;
BEGIN
    -- Get profile timezone
    SELECT COALESCE(timezone, 'UTC') INTO profile_tz
    FROM founder_profiles WHERE id = profile_id;
    
    -- Set next generation to 7 days from now at 6 AM in their timezone
    next_date := (NOW() AT TIME ZONE profile_tz + INTERVAL '7 days')::DATE + TIME '06:00:00';
    next_date := next_date AT TIME ZONE profile_tz;
    
    -- Update the profile
    UPDATE founder_profiles 
    SET next_generation_date = next_date,
        generation_count = COALESCE(generation_count, 0) + 1
    WHERE id = profile_id;
    
    RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. FUNCTION TO ARCHIVE OLD POSTS
-- Called before generating new week
-- ============================================
CREATE OR REPLACE FUNCTION archive_old_posts(p_profile_id UUID)
RETURNS INT AS $$
DECLARE
    archived_count INT;
BEGIN
    UPDATE posts
    SET 
        status = 'archived',
        archived_at = NOW()
    WHERE profile_id = p_profile_id
      AND status IN ('scheduled', 'skipped')
      AND archived_at IS NULL;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Weekly generation schema created successfully!' as message;
