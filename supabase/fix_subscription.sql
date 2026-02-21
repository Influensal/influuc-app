-- ============================================
-- FIX CURRENT USER'S SUBSCRIPTION DATA
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- 1. Set founder_profiles tier to 'authority' with proper features
UPDATE founder_profiles
SET subscription_tier = 'authority',
    ideas_limit_monthly = 999999,
    carousels_limit_weekly = 2,
    news_feature_enabled = true;

-- 2. Create active subscription record
INSERT INTO subscriptions (account_id, plan, status)
SELECT id, 'agency', 'active'
FROM auth.users
ON CONFLICT (account_id) DO UPDATE 
SET plan = 'agency', status = 'active';

-- 3. Verify both tables
SELECT 'founder_profiles' as source, subscription_tier as tier, ideas_limit_monthly, news_feature_enabled::text as news
FROM founder_profiles LIMIT 1;

SELECT 'subscriptions' as source, plan, status
FROM subscriptions LIMIT 1;
