-- ==============================================================================
-- MASTER SCHEMA UPDATE SCRIPT
-- ==============================================================================
-- This script contains ALL recent schema updates for the Influuc App.
-- It is designed to be "idempotent", meaning you can run it multiple times safely.
-- It will checking if columns/tables exist before trying to create them.
--
-- INSTRUCTIONS:
-- 1. Copy all the content of this file.
-- 2. Go to your Supabase Dashboard -> SQL Editor.
-- 3. Paste and Run.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLES CREATION (If they don't exist)
-- ------------------------------------------------------------------------------

-- 1.1 Content Generations Trackig
CREATE TABLE IF NOT EXISTS content_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    week_number INT NOT NULL,
    generation_date TIMESTAMPTZ DEFAULT NOW(),
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    x_posts_count INT DEFAULT 0,
    linkedin_posts_count INT DEFAULT 0,
    status TEXT CHECK (status IN ('generating', 'completed', 'failed')) DEFAULT 'generating',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- 1.2 Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('week_ready', 'subscription_expired', 'trial_ending', 'post_failed', 'general')) NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    action_url TEXT,
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. COLUMN UPDATES (Safe Additions)
-- ------------------------------------------------------------------------------

-- 2.1 Update FOUNDER_PROFILES
ALTER TABLE founder_profiles
    ADD COLUMN IF NOT EXISTS role TEXT,
    ADD COLUMN IF NOT EXISTS company_name TEXT,
    ADD COLUMN IF NOT EXISTS company_website TEXT,
    ADD COLUMN IF NOT EXISTS business_description TEXT,
    ADD COLUMN IF NOT EXISTS expertise TEXT,
    ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS connections JSONB DEFAULT '{}', -- Persist actual connection status
    ADD COLUMN IF NOT EXISTS weekly_goal TEXT DEFAULT 'balanced', -- New Weekly Goal
    ADD COLUMN IF NOT EXISTS goal_context TEXT,
    ADD COLUMN IF NOT EXISTS goal_set_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS awaiting_goal_input BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS next_generation_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS generation_day_of_week INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS generation_count INT DEFAULT 0;

-- 2.2 Update POSTS
ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS generation_id UUID REFERENCES content_generations(id),
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS format TEXT,
    ADD COLUMN IF NOT EXISTS hooks JSONB,
    ADD COLUMN IF NOT EXISTS selected_hook TEXT,
    ADD COLUMN IF NOT EXISTS cta TEXT;

-- Safely update status constraint for posts
DO $$ 
BEGIN
    ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE posts ADD CONSTRAINT posts_status_check 
    CHECK (status IN ('scheduled', 'posted', 'skipped', 'failed', 'archived'));

-- 2.3 Update ACCOUNTS (Billing)
ALTER TABLE accounts 
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS limit_profiles INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS limit_strategies_per_month INT DEFAULT 4,
    ADD COLUMN IF NOT EXISTS usage_strategies_current INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS usage_strategies_reset_at TIMESTAMPTZ DEFAULT NOW();

-- 2.4 Update SUBSCRIPTIONS
-- First ensure table exists (it might be managed by stripe-sync, assuming it exists or skipping)
-- (Skipping creation command as usually 'accounts' handles billing in this app, but if 'subscriptions' exists:)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
        ALTER TABLE subscriptions
            ADD COLUMN IF NOT EXISTS last_generation_paid TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS generations_count INT DEFAULT 0;
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 3. INDEXES & PERFORMANCE
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_content_generations_account_id ON content_generations(account_id);
CREATE INDEX IF NOT EXISTS idx_content_generations_status ON content_generations(status);
CREATE INDEX IF NOT EXISTS idx_notifications_account_id ON notifications(account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_founder_profiles_awaiting_goal ON founder_profiles(awaiting_goal_input) WHERE awaiting_goal_input = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_archived_at ON posts(archived_at);
CREATE INDEX IF NOT EXISTS idx_posts_generation_id ON posts(generation_id);

-- ------------------------------------------------------------------------------
-- 4. RLS POLICIES (Security)
-- ------------------------------------------------------------------------------

-- Content Generations
ALTER TABLE content_generations ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_generations' AND policyname = 'Users can view own generations') THEN
    CREATE POLICY "Users can view own generations" ON content_generations FOR SELECT USING (auth.uid() = account_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_generations' AND policyname = 'Allow all for development') THEN
     CREATE POLICY "Allow all for development" ON content_generations FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view own notifications') THEN
    CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = account_id);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. HELPER FUNCTIONS
-- ------------------------------------------------------------------------------

-- Archive Old Posts Function
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

-- Set Next Generation Date Function
CREATE OR REPLACE FUNCTION set_next_generation_date(profile_id UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    next_date TIMESTAMPTZ;
    profile_tz TEXT;
BEGIN
    SELECT COALESCE(timezone, 'UTC') INTO profile_tz
    FROM founder_profiles WHERE id = profile_id;
    
    -- Set next generation to 7 days from now
    next_date := (NOW() AT TIME ZONE profile_tz + INTERVAL '7 days')::DATE + TIME '06:00:00';
    next_date := next_date AT TIME ZONE profile_tz;
    
    UPDATE founder_profiles 
    SET next_generation_date = next_date,
        generation_count = COALESCE(generation_count, 0) + 1
    WHERE id = profile_id;
    
    RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- DONE
-- ------------------------------------------------------------------------------
SELECT 'Master schema update completed successfully. All missing fields added.' as message;
