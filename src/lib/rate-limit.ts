/**
 * Simple in-memory rate limiter
 * Works per-instance (resets on deploy). For production scale, use Redis.
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store (per serverless instance)
const store = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
    requests: number;  // Max requests allowed
    windowMs: number;  // Time window in milliseconds
}

// Preset configurations for different endpoints
export const RATE_LIMITS = {
    generation: { requests: 2, windowMs: 60 * 1000 },      // 2 per minute
    ai: { requests: 10, windowMs: 60 * 1000 },             // 10 per minute
    posts: { requests: 60, windowMs: 60 * 1000 },          // 60 per minute
    auth: { requests: 10, windowMs: 60 * 1000 },           // 10 per minute
    webhook: { requests: 100, windowMs: 60 * 1000 },       // 100 per minute (Stripe can be chatty)
    default: { requests: 30, windowMs: 60 * 1000 },        // 30 per minute
} as const;

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetIn: number;  // milliseconds until reset
}

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier (usually `userId:endpoint`)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const entry = store.get(key);

    // No entry or expired window - allow and start fresh
    if (!entry || now > entry.resetTime) {
        store.set(key, {
            count: 1,
            resetTime: now + config.windowMs
        });
        return {
            allowed: true,
            remaining: config.requests - 1,
            resetIn: config.windowMs
        };
    }

    // Within window - check count
    if (entry.count < config.requests) {
        entry.count++;
        return {
            allowed: true,
            remaining: config.requests - entry.count,
            resetIn: entry.resetTime - now
        };
    }

    // Rate limited
    return {
        allowed: false,
        remaining: 0,
        resetIn: entry.resetTime - now
    };
}

/**
 * Create a rate limit key from user ID and endpoint
 */
export function rateLimitKey(userId: string, endpoint: string): string {
    return `${userId}:${endpoint}`;
}

/**
 * Clean up expired entries (call periodically if needed)
 */
export function cleanupExpiredEntries(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of store.entries()) {
        if (now > entry.resetTime) {
            store.delete(key);
            cleaned++;
        }
    }

    return cleaned;
}
