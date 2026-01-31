/**
 * Subscription Tier Enforcement
 * Check if user has access to specific features based on their tier
 */

export type SubscriptionTier = 'starter' | 'growth' | 'authority';

interface TierLimits {
    ideasPerMonth: number;
    carouselsPerWeek: number;
    hasCarousels: boolean;
    hasFacelessVisuals: boolean;
    hasFaceClone: boolean;
    hasNewsJacking: boolean;
}

const TIER_CONFIG: Record<SubscriptionTier, TierLimits> = {
    starter: {
        ideasPerMonth: 30,
        carouselsPerWeek: 0,
        hasCarousels: false,
        hasFacelessVisuals: false,
        hasFaceClone: false,
        hasNewsJacking: false,
    },
    growth: {
        ideasPerMonth: Infinity,
        carouselsPerWeek: 2,
        hasCarousels: true,
        hasFacelessVisuals: true,
        hasFaceClone: false,
        hasNewsJacking: false,
    },
    authority: {
        ideasPerMonth: Infinity,
        carouselsPerWeek: 2,
        hasCarousels: true,
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
            requiredTier: 'growth',
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
            requiredTier: 'growth',
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
            requiredTier: 'growth',
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
