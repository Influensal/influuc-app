-- ============================================
-- WEEKLY GOAL SELECTION SCHEMA
-- Run this after weekly_generation_schema.sql
-- ============================================

-- Add weekly goal columns to founder_profiles
ALTER TABLE founder_profiles
    ADD COLUMN IF NOT EXISTS weekly_goal TEXT DEFAULT 'balanced',
    ADD COLUMN IF NOT EXISTS goal_context TEXT,
    ADD COLUMN IF NOT EXISTS goal_set_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS awaiting_goal_input BOOLEAN DEFAULT FALSE;

-- Weekly goals options: 
-- 'recruiting', 'fundraising', 'sales', 'credibility', 'growth', 'balanced'

-- Create index for querying users awaiting goal input
CREATE INDEX IF NOT EXISTS idx_founder_profiles_awaiting_goal 
    ON founder_profiles(awaiting_goal_input) 
    WHERE awaiting_goal_input = TRUE;

SELECT 'Weekly goal schema added successfully!' as message;
