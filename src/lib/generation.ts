/**
 * Weekly Content Generation Service
 * Core logic for generating weekly posts for users
 */

import { getProvider } from '@/lib/ai/providers';
import { createClient } from '@supabase/supabase-js';

// ============================================
// TYPES
// ============================================

export interface UserProfile {
    id: string;
    account_id: string;
    platforms: { x: boolean; linkedin: boolean };
    industry: string;
    target_audience: string;
    content_goal: string;
    topics: string[];
    tone: {
        formality: string;
        boldness: string;
        style: string;
        approach: string;
    };
    role: string;
    company_name: string;
    company_website: string;
    business_description: string;
    expertise: string;
    auto_publish: boolean;
    timezone: string;
}

export interface ScheduledPost {
    day: string;
    platform: 'x' | 'linkedin';
    format: 'single' | 'long_form' | 'video_script';
    topic: string;
    time: string;
}

export interface GeneratedPost {
    content: string;
    hooks: string[];
    cta: string | null;
}

export interface GenerationResult {
    success: boolean;
    generationId: string;
    xPostsCount: number;
    linkedinPostsCount: number;
    error?: string;
}

// ============================================
// SUPABASE ADMIN CLIENT
// ============================================

function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, supabaseServiceKey);
}

// ============================================
// MAIN GENERATION FUNCTION
// ============================================

export async function generateWeeklyContent(
    profile: UserProfile,
    weekNumber: number = 1
): Promise<GenerationResult> {
    const supabase = createAdminClient();

    // Determine active platforms
    const platforms: Array<'x' | 'linkedin'> = [];
    if (profile.platforms.x) platforms.push('x');
    if (profile.platforms.linkedin) platforms.push('linkedin');

    if (platforms.length === 0) {
        return {
            success: false,
            generationId: '',
            xPostsCount: 0,
            linkedinPostsCount: 0,
            error: 'No platforms selected'
        };
    }

    // Calculate week dates
    const today = new Date();
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() + 1); // Start from tomorrow

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6); // 7 days total

    // Create generation record
    const { data: generation, error: genError } = await supabase
        .from('content_generations')
        .insert({
            account_id: profile.account_id,
            week_number: weekNumber,
            week_start_date: weekStartDate.toISOString().split('T')[0],
            week_end_date: weekEndDate.toISOString().split('T')[0],
            status: 'generating'
        })
        .select()
        .single();

    if (genError || !generation) {
        console.error('[Generation] Failed to create generation record:', genError);
        return {
            success: false,
            generationId: '',
            xPostsCount: 0,
            linkedinPostsCount: 0,
            error: 'Failed to create generation record'
        };
    }

    try {
        console.log(`[Generation] Starting week ${weekNumber} generation for profile ${profile.id}`);

        // Step 1: Archive old posts
        await archiveOldPosts(supabase, profile.id);

        // Step 2: Generate strategy (schedule)
        const strategy = await generateStrategy(platforms, profile);

        // Step 3: Generate actual post content
        const posts = await generatePosts(strategy.posts, profile);

        // Step 4: Save posts to database
        const savedPosts = await savePostsToDatabase(
            supabase,
            profile.id,
            generation.id,
            posts,
            weekStartDate
        );

        // Count by platform
        const xPostsCount = savedPosts.filter(p => p.platform === 'x').length;
        const linkedinPostsCount = savedPosts.filter(p => p.platform === 'linkedin').length;

        // Step 5: Update generation record as completed
        await supabase
            .from('content_generations')
            .update({
                status: 'completed',
                x_posts_count: xPostsCount,
                linkedin_posts_count: linkedinPostsCount
            })
            .eq('id', generation.id);

        // Step 6: Update profile's next generation date (+7 days)
        const nextGenerationDate = new Date(today);
        nextGenerationDate.setDate(today.getDate() + 7);

        await supabase
            .from('founder_profiles')
            .update({
                next_generation_date: nextGenerationDate.toISOString(),
                generation_count: (profile as any).generation_count ? (profile as any).generation_count + 1 : 1
            })
            .eq('id', profile.id);

        console.log(`[Generation] Completed! ${xPostsCount} X posts, ${linkedinPostsCount} LinkedIn posts`);

        return {
            success: true,
            generationId: generation.id,
            xPostsCount,
            linkedinPostsCount
        };

    } catch (error) {
        console.error('[Generation] Failed:', error);

        // Mark generation as failed
        await supabase
            .from('content_generations')
            .update({
                status: 'failed',
                error_message: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', generation.id);

        return {
            success: false,
            generationId: generation.id,
            xPostsCount: 0,
            linkedinPostsCount: 0,
            error: error instanceof Error ? error.message : 'Generation failed'
        };
    }
}

// ============================================
// ARCHIVE OLD POSTS
// ============================================

async function archiveOldPosts(supabase: any, profileId: string): Promise<number> {
    const { data, error } = await supabase
        .from('posts')
        .update({
            status: 'archived',
            archived_at: new Date().toISOString()
        })
        .eq('profile_id', profileId)
        .in('status', ['scheduled', 'skipped'])
        .is('archived_at', null)
        .select();

    if (error) {
        console.error('[Archive] Error archiving posts:', error);
        return 0;
    }

    const count = data?.length || 0;
    console.log(`[Archive] Archived ${count} old posts`);
    return count;
}

// ============================================
// GENERATE STRATEGY (SCHEDULE)
// ============================================

async function generateStrategy(
    platforms: Array<'x' | 'linkedin'>,
    profile: UserProfile
): Promise<{ posts: ScheduledPost[] }> {
    const provider = await getProvider();

    const systemPrompt = `You are an elite content strategist for founders with deep experience in audience psychology, platform mechanics, and leverage-based content systems.

You think like a strategist, not a social media manager.

Your work prioritizes:
- Clarity over cleverness
- Signal over noise
- Authority over vanity
- Consistency over virality

Every post must feel intentional, founder-led, and worth saving.

MISSION  
Create a 1-week content calendar that positions the user as a credible, thoughtful authority in their space while moving them toward their stated content goal.

The calendar must:
- Be realistic to execute
- Respect platform-specific norms
- Build narrative momentum across the week
- Balance value, authority, and light conversion

INPUTS YOU WILL RECEIVE

PROFILE:
- Industry: ${profile.industry}
- Primary Content Goal: ${profile.content_goal}
- Core Topics / Pillars: ${profile.topics.join(', ')}
- Platforms: ${platforms.join(', ')}

USER CONTEXT:
- Role: ${profile.role}
- Company: ${profile.company_name}
- Business Description: ${profile.business_description}
- Core Expertise: ${profile.expertise}

STRATEGIC CONTENT PRINCIPLES (APPLY BY DEFAULT)

Audience sophistication:
- Write for intelligent peers, not beginners
- Avoid generic "tips" unless reframed as insights or frameworks
- Assume the reader is busy, skeptical, and outcome-driven

Weekly intent mix (guideline, not rigid):
- 60–70% Educate (teach, explain, reframe)
- 20–30% Authority (POV, experience, pattern recognition)
- 10–20% Soft Conversion (invites, not pitches)

Platform alignment:
- LinkedIn: long-form, structured thinking, professional POV
- X: concise, sharp, single-idea posts
- No threads. Ever.

CALENDAR LOGIC

- Distribute posts intentionally across the week (no random spacing)
- Avoid repeating the same topic on consecutive days
- Vary formats to prevent fatigue
- Each post must have a clear strategic reason to exist

SCHEDULE RULES (STRICT NON-NEGOTIABLE):

If Platform is X (Twitter):
- Schedule exactly 7 posts (1 per day).
- Format Mix: 3 "long_form" (approx 2400 chars), 4 "single" (short, max 280 chars).

If Platform is LinkedIn:
- Schedule exactly 5 posts (e.g. Mon-Fri).
- Format Mix: 3 "long_form", 2 "single" (short).

If BOTH platforms are selected, generate SEPARATE schedules for each according to the rules above (Total 12 posts).

OPTIMAL POSTING TIMES (AI-SUGGESTED):
Based on the user's goal of "${profile.content_goal}" and industry "${profile.industry}", suggest optimal posting times:
- X: Morning (8-9 AM), Lunch (12-1 PM), Evening (6-7 PM)
- LinkedIn: Business hours (8 AM, 10 AM, 12 PM)

OUTPUT REQUIREMENTS (STRICT)

Return ONLY a valid JSON object with this structure:

{
  "posts": [
    {
      "day": "Monday",
      "platform": "linkedin",
      "format": "long_form",
      "topic": "Brief but specific topic description",
      "time": "9:00 AM"
    }
  ]
}

RULES:
- Allowed formats only: "single", "long_form", "video_script"
- Allowed platforms only: "x" or "linkedin"
- Ensure formats align with platform norms
  - LinkedIn → long_form preferred
  - X → single preferred
- Do NOT schedule threads
- Do NOT include captions, hooks, copy, or explanations
- Calendar output only

QUALITY BAR (NON-NEGOTIABLE)

Before finalizing, ensure:
- A credible founder would actually post this
- Each topic clearly maps to the stated goal
- The week feels cohesive, not random
- There is a clear balance between thinking, teaching, and inviting

If required information is missing, make reasonable assumptions and proceed.

Output the JSON. Nothing else.`;

    const result = await provider.complete({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Generate the weekly schedule.' }
        ],
        temperature: 0.7,
        responseFormat: { type: 'json_object' },
    });

    try {
        const cleanContent = result.content.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanContent);
    } catch (e) {
        console.error('[Strategy] JSON Parse Error:', e);
        console.log('[Strategy] Raw Content:', result.content);
        throw new Error('Failed to parse strategy JSON');
    }
}

// ============================================
// GENERATE POST CONTENT
// ============================================

async function generatePosts(
    schedule: ScheduledPost[],
    profile: UserProfile
): Promise<Array<ScheduledPost & GeneratedPost>> {
    const provider = await getProvider();

    const systemPrompt = `You are an elite ghostwriter for top founders.

You write platform-native, high-conversion content that sounds like it came from a real operator — not a content marketer.

Your work optimizes for:
- Authority
- Memorability
- Saves, shares, and thoughtful replies
- Clear next actions (without sounding salesy)

PLATFORMS & FORMAT CONSTRAINTS (STRICT)

X (Twitter):
- Short post: max 280 characters
- Long post: ~2,400 characters
- Single post only (NO threads)

LinkedIn:
- Short post: ~1,000 characters
- Long post: ~3,000 characters
- Single post only

Global rules:
- NO threads
- NO hashtags unless explicitly requested
- Respect character limits precisely

TONE & WRITING STYLE (NON-NEGOTIABLE)

Voice:
- Bold, confident, opinionated
- Calm conviction, not hype
- Sounds like an experienced founder talking to peers

Style rules:
- Start with a scroll-stopping hook in the first 1–2 lines
- Short, punchy sentences mixed with longer explanatory ones
- Clear POVs, sharp contrasts, or reframes
- No corporate jargon
- No generic "tips"
- No fluff or filler — every sentence earns its place

"Crazy / Viral / Polarizing" means:
- Pattern interrupts
- Contrarian or unexpected angles
- Calling out common mistakes directly
- Strong framing, not shock-for-shock
- Always brand-safe and credible

Ending:
- Close with a clear, specific CTA
- CTAs should invite thought or action (comment, reflect, DM, save)
- Never pushy or salesy

USER CONTEXT (WRITE FROM THIS POV)

- Role: ${profile.role}
- Company: ${profile.company_name}
- Business Description: ${profile.business_description}
- Core Expertise: ${profile.expertise}
- Desired Boldness Level: ${profile.tone?.boldness || 'bold'}
- Writing Style Preferences: ${profile.tone?.style || 'educational'}

Assume the audience is:
- Intelligent
- Busy
- Skeptical
- Familiar with surface-level advice already

INPUT

You will receive:
- A list of topics
- The desired platform (X or LinkedIn)
- The desired length (short or long)

OUTPUT REQUIREMENTS (STRICT)

Return ONLY a valid JSON object with this structure:

{
  "posts": [
    {
      "platform": "x" | "linkedin",
      "length": "short" | "long",
      "topic": "Topic provided",
      "content": "The fully written post"
    }
  ]
}

RULES:
- Write one complete post per topic
- Do NOT include explanations, notes, or alternatives
- Do NOT include multiple versions
- Do NOT include titles, labels, or hashtags
- Content only inside the JSON

QUALITY BAR (NON-NEGOTIABLE)

Before finalizing each post, ensure:
- It sounds like a real founder with real experience
- The hook stops the scroll immediately
- The idea is clear and memorable
- The CTA feels natural, not forced
- This would stand out in a crowded LinkedIn or X feed

If any inputs are missing, make strong, reasonable assumptions and proceed.

Return the JSON. Nothing else.`;

    const result = await provider.complete({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(schedule) }
        ],
        temperature: 0.8,
        responseFormat: { type: 'json_object' },
    });

    try {
        const cleanContent = result.content.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanContent);

        return schedule.map((post, index) => ({
            ...post,
            content: parsed.posts[index]?.content || parsed.posts[index] || 'Failed to generate content',
            hooks: parsed.posts[index]?.hooks || [],
            cta: parsed.posts[index]?.cta || null,
        }));
    } catch (e) {
        console.error('Failed to parse batched posts:', e);
        return schedule.map(post => ({
            ...post,
            content: 'Generation failed. Please try again.',
            hooks: [],
            cta: null
        }));
    }
}

// ============================================
// SAVE POSTS TO DATABASE
// ============================================

async function savePostsToDatabase(
    supabase: any,
    profileId: string,
    generationId: string,
    posts: Array<ScheduledPost & GeneratedPost>,
    weekStartDate: Date
): Promise<Array<{ platform: string }>> {
    const dayMapping: Record<string, number> = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6,
    };

    const validFormats = ['single', 'thread', 'long_form', 'video_script'];
    const validPlatforms = ['x', 'linkedin'];

    const postsData = posts.map(post => {
        // Calculate scheduled date based on day
        const targetDay = dayMapping[post.day] ?? 1;
        const startDay = weekStartDate.getDay();
        let daysUntil = (targetDay - startDay + 7) % 7;
        if (daysUntil === 0) daysUntil = 7;

        const scheduledDate = new Date(weekStartDate);
        scheduledDate.setDate(weekStartDate.getDate() + daysUntil);

        // Parse time
        const timeParts = post.time?.split(' ') || ['10:00', 'AM'];
        const [time, period] = timeParts;
        const [hours, minutes] = (time || '10:00').split(':').map(Number);
        let hour24 = hours || 10;
        if (period === 'PM' && hours !== 12) hour24 += 12;
        if (period === 'AM' && hours === 12) hour24 = 0;
        scheduledDate.setHours(hour24, minutes || 0, 0, 0);

        // Normalize format
        let format = post.format?.toLowerCase().replace('-', '_').replace(' ', '_') || 'single';
        if (!validFormats.includes(format)) format = 'single';

        // Normalize platform
        let platform = post.platform?.toLowerCase() || 'linkedin';
        if (!validPlatforms.includes(platform)) platform = 'linkedin';

        return {
            profile_id: profileId,
            generation_id: generationId,
            platform,
            scheduled_date: scheduledDate.toISOString(),
            content: post.content || 'Generated post content',
            hooks: Array.isArray(post.hooks) ? post.hooks : [post.hooks || 'Hook'],
            selected_hook: (Array.isArray(post.hooks) ? post.hooks[0] : post.hooks) || '',
            cta: post.cta || null,
            format,
            status: 'scheduled',
        };
    });

    if (postsData.length > 0) {
        console.log(`[Generation] Inserting ${postsData.length} posts to Supabase...`);
        const { error: postsError } = await supabase
            .from('posts')
            .insert(postsData);

        if (postsError) {
            console.error('[Generation] Failed to save posts:', postsError);
            throw new Error(`Failed to save posts: ${postsError.message}`);
        }
        console.log('[Generation] Posts saved successfully.');
    }

    return postsData.map(p => ({ platform: p.platform }));
}

// ============================================
// HELPER: GET USERS DUE FOR GENERATION
// ============================================

export async function getUsersDueForGeneration(): Promise<UserProfile[]> {
    const supabase = createAdminClient();
    const today = new Date().toISOString();

    // Get profiles where next_generation_date <= today
    const { data: profiles, error } = await supabase
        .from('founder_profiles')
        .select(`
            id,
            account_id,
            platforms,
            industry,
            target_audience,
            content_goal,
            topics,
            tone,
            role,
            company_name,
            company_website,
            business_description,
            expertise,
            auto_publish,
            timezone,
            generation_count
        `)
        .lte('next_generation_date', today);

    if (error) {
        console.error('[Generation] Error fetching due profiles:', error);
        return [];
    }

    return profiles || [];
}

// ============================================
// HELPER: CHECK SUBSCRIPTION STATUS
// ============================================

export async function checkSubscriptionActive(accountId: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('status, trial_end')
        .eq('account_id', accountId)
        .single();

    if (error || !subscription) {
        // No subscription found - check if first week (trial)
        return false;
    }

    // Check if subscription is active or in trial
    if (subscription.status === 'active' || subscription.status === 'trialing') {
        return true;
    }

    return false;
}

// ============================================
// HELPER: GET USER'S WEEK NUMBER
// ============================================

export async function getUserWeekNumber(accountId: string): Promise<number> {
    const supabase = createAdminClient();

    const { count, error } = await supabase
        .from('content_generations')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .eq('status', 'completed');

    if (error) {
        console.error('[Generation] Error counting generations:', error);
        return 1;
    }

    return (count || 0) + 1;
}
