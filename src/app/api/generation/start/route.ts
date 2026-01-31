/**
 * User-Triggered Weekly Content Generation
 * Called when user selects their weekly goal and clicks "Generate"
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateWeeklyContent, getUserWeekNumber, UserProfile } from '@/lib/generation';
import { sendWeekReadyEmail } from '@/lib/email/resend';
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';
import { logger, startTimer } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes - generation can take time

interface GenerateRequest {
    goal: string;
    context?: string;
}

const validGoals = ['recruiting', 'fundraising', 'sales', 'credibility', 'growth', 'balanced'];

export async function POST(request: NextRequest) {
    const timer = startTimer();
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        logger.warn('Unauthorized generation attempt', { route: '/api/generation/start' });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting - max 2 generation requests per minute
    const rateLimit = checkRateLimit(
        rateLimitKey(user.id, 'generation'),
        RATE_LIMITS.generation
    );

    if (!rateLimit.allowed) {
        logger.warn('Rate limit exceeded', {
            userId: user.id,
            route: '/api/generation/start',
            resetIn: rateLimit.resetIn
        });
        return NextResponse.json({
            error: 'Too many requests. Please wait before generating again.',
            retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        }, { status: 429 });
    }

    logger.info('Generation started', { userId: user.id, remaining: rateLimit.remaining });

    // Parse request body
    let body: GenerateRequest;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { goal, context } = body;

    // Validate goal
    if (!goal || !validGoals.includes(goal)) {
        return NextResponse.json({
            error: 'Invalid goal',
            validGoals
        }, { status: 400 });
    }

    try {
        // Get user's profile
        const { data: profile, error: profileError } = await supabase
            .from('founder_profiles')
            .select('*')
            .eq('account_id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // ============================================
        // IDEMPOTENCY CHECK - Prevent duplicate generation
        // User double-clicking "Generate" shouldn't create duplicate content
        // ============================================
        const { data: inProgressGeneration } = await supabase
            .from('content_generations')
            .select('id, status, created_at')
            .eq('account_id', user.id)
            .eq('status', 'generating')
            .single();

        if (inProgressGeneration) {
            // Check if it's been stuck for more than 10 minutes (stale)
            const createdAt = new Date(inProgressGeneration.created_at);
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

            if (createdAt > tenMinutesAgo) {
                // Generation is still in progress - reject duplicate
                return NextResponse.json({
                    error: 'Generation already in progress',
                    generationId: inProgressGeneration.id,
                    message: 'Please wait for the current generation to complete'
                }, { status: 409 });
            } else {
                // Mark stale generation as failed so user can retry
                await supabase
                    .from('content_generations')
                    .update({ status: 'failed', error_message: 'Timed out after 10 minutes' })
                    .eq('id', inProgressGeneration.id);
                console.log(`[Generate] Marked stale generation ${inProgressGeneration.id} as failed`);
            }
        }

        // Check subscription for Week 2+
        const weekNumber = await getUserWeekNumber(user.id);

        if (weekNumber > 1) {
            const { data: subscription } = await supabase
                .from('subscriptions')
                .select('status')
                .eq('account_id', user.id)
                .single();

            if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
                return NextResponse.json({
                    error: 'Active subscription required for Week 2+',
                    weekNumber
                }, { status: 402 });
            }
        }

        // Update profile with selected goal
        await supabase
            .from('founder_profiles')
            .update({
                weekly_goal: goal,
                goal_context: context || null,
                goal_set_at: new Date().toISOString(),
                awaiting_goal_input: false
            })
            .eq('id', profile.id);

        console.log(`[Generate] Starting generation for ${profile.id} with goal: ${goal}`);

        // Inject goal into profile for generation
        const profileWithGoal: UserProfile = {
            ...profile,
            content_goal: combineGoalWithOriginal(profile.content_goal, goal, context)
        };

        // Generate content
        const result = await generateWeeklyContent(profileWithGoal, weekNumber);

        if (!result.success) {
            return NextResponse.json({
                error: result.error || 'Generation failed',
                generationId: result.generationId
            }, { status: 500 });
        }

        // Send email notification
        if (user.email) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const firstPostDate = tomorrow.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });

            await sendWeekReadyEmail({
                userEmail: user.email,
                userName: profile.company_name || 'there',
                xPostsCount: result.xPostsCount,
                linkedinPostsCount: result.linkedinPostsCount,
                weekNumber,
                firstPostDate,
                autoPublish: profile.auto_publish || false
            });
        }

        // Create in-app notification
        await supabase
            .from('notifications')
            .insert({
                account_id: user.id,
                type: 'week_ready',
                title: `Week ${weekNumber} Content Ready! 🎉`,
                message: `${result.xPostsCount + result.linkedinPostsCount} posts generated with focus on ${getGoalLabel(goal)}.`,
                action_url: '/dashboard'
            });

        logger.info('Generation completed', {
            userId: user.id,
            weekNumber,
            goal,
            xPosts: result.xPostsCount,
            linkedinPosts: result.linkedinPostsCount,
            duration_ms: timer()
        });

        return NextResponse.json({
            success: true,
            weekNumber,
            goal,
            xPostsCount: result.xPostsCount,
            linkedinPostsCount: result.linkedinPostsCount,
            generationId: result.generationId,
            postIds: result.postIds || [], // Return IDs for client iteration
            message: "Strategy ready. Posts pending generation."
        });

    } catch (error) {
        logger.exception('Generation failed', error, {
            userId: user.id,
            route: '/api/generation/start',
            duration_ms: timer()
        });
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Generation failed'
        }, { status: 500 });
    }
}

/**
 * Combine the weekly goal with the user's original content goal
 */
function combineGoalWithOriginal(originalGoal: string, weeklyGoal: string, context?: string): string {
    const goalDescriptions: Record<string, string> = {
        recruiting: 'attracting top talent and showcasing company culture',
        fundraising: 'demonstrating traction, vision, and market opportunity to investors',
        sales: 'educating prospects and generating inbound leads',
        credibility: 'establishing authority and building trust as a thought leader',
        growth: 'maximizing reach and audience engagement',
        balanced: originalGoal || 'building a strong personal brand'
    };

    let combinedGoal = goalDescriptions[weeklyGoal] || originalGoal;

    if (context) {
        combinedGoal += `. THIS WEEK'S CONTEXT: ${context}`;
    }

    return combinedGoal;
}

/**
 * Get human-readable goal label
 */
function getGoalLabel(goal: string): string {
    const labels: Record<string, string> = {
        recruiting: 'Attracting Talent',
        fundraising: 'Investor Attention',
        sales: 'Lead Generation',
        credibility: 'Building Authority',
        growth: 'Audience Growth',
        balanced: 'Balanced Mix'
    };
    return labels[goal] || goal;
}
