-- ==========================================
-- DEBUG & RESET SCRIPT
-- ==========================================

-- 1. Check if the generation record was created (success/failure)
SELECT id, status, error_message, created_at 
FROM content_generations 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Check if any posts were created
SELECT id, topic, platform, status 
FROM posts 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. RESET the popup so you can try again
UPDATE founder_profiles
SET 
    awaiting_goal_input = TRUE,
    next_generation_date = NOW() - INTERVAL '1 day';

-- 4. Confirm it's reset
SELECT company_name, awaiting_goal_input 
FROM founder_profiles;
