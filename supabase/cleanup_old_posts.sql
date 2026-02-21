-- ============================================
-- CLEAN UP OLD TEST POSTS
-- Keep only the LATEST generation's posts
-- ============================================

-- Step 1: Find the latest generation
WITH latest_gen AS (
    SELECT id FROM content_generations 
    ORDER BY created_at DESC 
    LIMIT 1
)
-- Step 2: Archive all posts NOT from the latest generation
UPDATE posts
SET status = 'archived', archived_at = NOW()
WHERE generation_id IS NULL 
   OR generation_id NOT IN (SELECT id FROM latest_gen);

-- Step 3: Verify — show remaining active posts
SELECT id, platform, format, status, topic, 
       LEFT(content, 50) as content_preview,
       scheduled_date
FROM posts 
WHERE status != 'archived'
ORDER BY scheduled_date;
