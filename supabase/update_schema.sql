-- ============================================
-- SCHEMA UPDATE FOR BILLING & TIERS
-- ============================================

-- Add Billing Columns to ACCOUNTS table
-- We use ALTER TABLE IF EXISTS to avoid errors if run multiple times
ALTER TABLE accounts 
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT NULL, -- 'trialing', 'active', 'past_due', 'canceled', 'unpaid'
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
    -- Limits (Default to Starter tier limits initially, updated by webhook)
    ADD COLUMN IF NOT EXISTS limit_profiles INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS limit_strategies_per_month INT DEFAULT 4,
    -- Usage Tracking
    ADD COLUMN IF NOT EXISTS usage_strategies_current INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS usage_strategies_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Create RLS Policies for Accounts if not already properly set
-- Ensure users can read their own billing status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'accounts' AND policyname = 'Users can view own account billing'
    ) THEN
        CREATE POLICY "Users can view own account billing" ON accounts
            FOR SELECT USING (auth.uid() = id);
    END IF;
END
$$;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_accounts_subscription_status ON accounts(subscription_status);
CREATE INDEX IF NOT EXISTS idx_accounts_stripe_customer_id ON accounts(stripe_customer_id);

-- ============================================
-- UPDATE FOR ONBOARDING CONTEXT (NEW)
-- ============================================

ALTER TABLE founder_profiles
    ADD COLUMN IF NOT EXISTS role TEXT,
    ADD COLUMN IF NOT EXISTS company_name TEXT,
    ADD COLUMN IF NOT EXISTS company_website TEXT,
    ADD COLUMN IF NOT EXISTS business_description TEXT,
    ADD COLUMN IF NOT EXISTS expertise TEXT,
    ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN DEFAULT false;
