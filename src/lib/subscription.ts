/**
 * Subscription Tier Enforcement
 * Check if user has access to specific features based on their tier
 */

export type SubscriptionTier = 'starter' | 'creator' | 'authority';

interface TierLimits {
    ideasPerMonth: number;
    carouselsPerWeek: number;
    hasCarousels: boolean;
    hasOnDemandCarousels: boolean;
    hasFacelessVisuals: boolean;
    hasFaceClone: boolean;
    hasNewsJacking: boolean;
}

const TIER_CONFIG: Record<SubscriptionTier, TierLimits> = {
    starter: {
        ideasPerMonth: 30,
        carouselsPerWeek: 0,
        hasCarousels: false,
        hasOnDemandCarousels: false,
        hasFacelessVisuals: false,
        hasFaceClone: false,
        hasNewsJacking: false,
    },
    creator: {
        ideasPerMonth: Infinity,
        carouselsPerWeek: 0,
        hasCarousels: false,
        hasOnDemandCarousels: false,
        hasFacelessVisuals: true,
        hasFaceClone: false,
        hasNewsJacking: false,
    },
    authority: {
        ideasPerMonth: Infinity,
        carouselsPerWeek: 999999,
        hasCarousels: true,
        hasOnDemandCarousels: true,
        hasFacelessVisuals: true,
        hasFaceClone: true,
        hasNewsJacking: true,
    },
};

export interface TierCheckResult {
    allowed: boolean;
    reason?: string;
    requiredTier?: SubscriptionTier;
    upgradeUrl?: string;
}

/**
 * Check if user can generate more ideas
 */
export function canGenerateIdea(
    tier: SubscriptionTier,
    ideasThisMonth: number
): TierCheckResult {
    const limits = TIER_CONFIG[tier];

    if (ideasThisMonth >= limits.ideasPerMonth) {
        return {
            allowed: false,
            reason: `You've used all ${limits.ideasPerMonth} ideas this month. Upgrade to Creator for unlimited.`,
            requiredTier: 'creator',
            upgradeUrl: '/dashboard/settings?tab=billing',
        };
    }

    return { allowed: true };
}

/**
 * Check if user can create carousels
 */
export function canCreateCarousel(tier: SubscriptionTier): TierCheckResult {
    const limits = TIER_CONFIG[tier];

    if (!limits.hasCarousels) {
        return {
            allowed: false,
            reason: 'Carousels are available on Creator plan and above.',
            requiredTier: 'creator',
            upgradeUrl: '/dashboard/settings?tab=billing',
        };
    }

    return { allowed: true };
}

/**
 * Check if user can create carousels on demand
 */
export function canCreateOnDemandCarousel(tier: SubscriptionTier): TierCheckResult {
    const limits = TIER_CONFIG[tier];

    if (!limits.hasOnDemandCarousels) {
        return {
            allowed: false,
            reason: 'On-demand carousels are available on Authority plan only.',
            requiredTier: 'authority',
            upgradeUrl: '/dashboard/settings?tab=billing',
        };
    }

    return { allowed: true };
}

/**
 * Check if user can use faceless visuals
 */
export function canUseFacelessVisuals(tier: SubscriptionTier): TierCheckResult {
    const limits = TIER_CONFIG[tier];

    if (!limits.hasFacelessVisuals) {
        return {
            allowed: false,
            reason: 'Faceless Visuals are available on Creator plan and above.',
            requiredTier: 'creator',
            upgradeUrl: '/dashboard/settings?tab=billing',
        };
    }

    return { allowed: true };
}

/**
 * Check if user can use face clone
 */
export function canUseFaceClone(tier: SubscriptionTier): TierCheckResult {
    const limits = TIER_CONFIG[tier];

    if (!limits.hasFaceClone) {
        return {
            allowed: false,
            reason: 'Face Clone is available on Authority plan only.',
            requiredTier: 'authority',
            upgradeUrl: '/dashboard/settings?tab=billing',
        };
    }

    return { allowed: true };
}

/**
 * Check if user can use newsjacking
 */
export function canUseNewsJacking(tier: SubscriptionTier): TierCheckResult {
    const limits = TIER_CONFIG[tier];

    if (!limits.hasNewsJacking) {
        return {
            allowed: false,
            reason: 'NewsJacking is available on Authority plan only.',
            requiredTier: 'authority',
            upgradeUrl: '/dashboard/settings?tab=billing',
        };
    }

    return { allowed: true };
}

/**
 * Get tier limits for display
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
    return TIER_CONFIG[tier];
}

/**
 * Get tier from string (with fallback)
 */
export function parseTier(tier: string | null | undefined): SubscriptionTier {
    if (tier && tier in TIER_CONFIG) {
        return tier as SubscriptionTier;
    }
    return 'starter'; // Default fallback
}

/**
 * Database feature flags per tier
 * Used by Stripe webhook/checkout to sync to founder_profiles
 */
export const TIER_DB_FEATURES: Record<SubscriptionTier, {
    ideas_limit_monthly: number;
    carousels_limit_weekly: number;
    news_feature_enabled: boolean;
}> = {
    starter: { ideas_limit_monthly: 30, carousels_limit_weekly: 0, news_feature_enabled: false },
    creator: { ideas_limit_monthly: 999999, carousels_limit_weekly: 2, news_feature_enabled: false },
    authority: { ideas_limit_monthly: 999999, carousels_limit_weekly: 2, news_feature_enabled: true },
};

/**
 * Create an admin Supabase client (service role)
 * Used by webhook + checkout-session for DB writes
 */
export function createAdminSupabaseClient() {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}
