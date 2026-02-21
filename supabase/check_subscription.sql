-- ============================================
-- CHECK & FIX SUBSCRIPTION STATUS
-- ============================================

-- Step 1: Check current subscription status
SELECT s.id, s.account_id, s.plan, s.status, s.stripe_subscription_id,
       s.current_period_start, s.current_period_end
FROM subscriptions s
JOIN auth.users u ON s.account_id = u.id;

-- Step 2: If status is NOT 'active', run this to fix it:
-- UPDATE subscriptions SET status = 'active' WHERE account_id = (SELECT id FROM auth.users LIMIT 1);
