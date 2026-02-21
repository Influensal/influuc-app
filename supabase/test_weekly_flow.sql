-- ==========================================
-- TEST HELPER: FORCE WEEKLY REVIEW
-- Run this in Supabase SQL Editor to test the Weekly Review Modal
-- ==========================================

-- 1. Ensure the column exists (if you haven't run the schema update)
ALTER TABLE founder_profiles 
ADD COLUMN IF NOT EXISTS awaiting_goal_input BOOLEAN DEFAULT FALSE;

-- 2. Force ALL profiles to "Review Mode"
UPDATE founder_profiles
SET 
    awaiting_goal_input = TRUE,
    next_generation_date = NOW() - INTERVAL '1 day'; -- Make it look overdue

-- 3. Verify
SELECT id, company_name, awaiting_goal_input, next_generation_date 
FROM founder_profiles;
