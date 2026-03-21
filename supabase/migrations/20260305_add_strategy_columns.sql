-- ============================================
-- STRATEGY SYSTEM UPGRADE
-- Adds brand strategy fields to founder_profiles
-- and content tracking fields to posts
-- ============================================

-- ============================================
-- 1. FOUNDER_PROFILES: Strategy Fields
-- ============================================

ALTER TABLE founder_profiles
    -- Archetype Discovery (replaces simple archetype picker)
    ADD COLUMN IF NOT EXISTS archetype_primary TEXT,
    ADD COLUMN IF NOT EXISTS archetype_secondary TEXT,
    ADD COLUMN IF NOT EXISTS archetype_flavor TEXT,
    ADD COLUMN IF NOT EXISTS archetype_discovery JSONB DEFAULT '{}',

    -- Strategic Foundation
    ADD COLUMN IF NOT EXISTS positioning_statement TEXT,
    ADD COLUMN IF NOT EXISTS pov_statement TEXT,
    ADD COLUMN IF NOT EXISTS identity_gap TEXT,
    ADD COLUMN IF NOT EXISTS competitor_context JSONB DEFAULT '{}',

    -- Content Pillars (structured: [{name, description, job}])
    ADD COLUMN IF NOT EXISTS content_pillars JSONB DEFAULT '[]',

    -- Voice Analysis (extracted from voice samples)
    ADD COLUMN IF NOT EXISTS voice_analysis JSONB DEFAULT '{}',

    -- Compiled Strategy Brief (master prompt for all generation)
    ADD COLUMN IF NOT EXISTS strategy_brief TEXT;

-- ============================================
-- 2. POSTS: Content Strategy Tracking
-- ============================================

ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS pillar TEXT,
    ADD COLUMN IF NOT EXISTS hook_type TEXT,
    ADD COLUMN IF NOT EXISTS cta_type TEXT,
    ADD COLUMN IF NOT EXISTS week_throughline TEXT;

-- ============================================
-- SUCCESS
-- ============================================
SELECT 'Strategy columns migration complete!' as message;
