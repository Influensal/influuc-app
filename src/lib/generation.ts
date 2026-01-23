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
    postIds?: string[];
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

        // Step 3: Generate actual post content IN PARALLEL (Massive Speedup)
        // This fires all request simultaneously to fit in Vercel timeout
        const posts = await generatePostsParallel(strategy.posts, profile);

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
// PARALLEL GENERATION
// ============================================

async function generatePostsParallel(
    schedule: ScheduledPost[],
    profile: UserProfile
): Promise<Array<ScheduledPost & GeneratedPost>> {
    const provider = await getProvider();

    // We create a promise for each post to generate them all at once
    const promises = schedule.map(async (post) => {
        const systemPrompt = `You are an elite ghostwriter for top founders.
        
You are writing a SINGLE post for ${post.platform === 'linkedin' ? 'LinkedIn' : 'X (Twitter)'}.

CONTEXT:
- Topic: ${post.topic}
- Format: ${post.format}
- Role: ${profile.role}
- Company: ${profile.company_name}
- Business: ${profile.business_description}
- Expertise: ${profile.expertise}
- Tone: ${profile.tone?.boldness || 'bold'} / ${profile.tone?.style || 'educational'}

CONSTRAINTS:
${post.platform === 'x' ? '- Max 280 chars\n- No Hashtags' : '- Professional formatting\n- 800-1200 chars'}
- Start with a strong hook
- Be concise and authoritative

Return ONLY a JSON object:
{
    "content": "The post text",
    "hooks": ["Alternative hook 1", "Alternative hook 2"],
    "cta": "Call to action"
}`;

        try {
            const result = await provider.complete({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Write a ${post.platform} post about: ${post.topic}` }
                ],
                temperature: 0.7,
                responseFormat: { type: 'json_object' },
            });

            const cleanContent = result.content.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleanContent);

            return {
                ...post,
                content: parsed.content || 'Failed to generate',
                hooks: parsed.hooks || [],
                cta: parsed.cta || null
            };
        } catch (e) {
            console.error(`Failed to generate post for ${post.topic}:`, e);
            return {
                ...post,
                content: 'Generation failed. Please edit.',
                hooks: [],
                cta: null
            };
        }
    });

    // Wait for all posts to generate
    return Promise.all(promises);
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

// Note: generatePosts function below is no longer used by main flow but kept for reference or legacy tools
async function generatePosts(
    schedule: ScheduledPost[],
    profile: UserProfile
): Promise<Array<ScheduledPost & GeneratedPost>> {
    // ... existing implementation implementation kept as legacy ...
    return createPendingPosts(schedule); // Modified to just return pending for safety if called
}

// ... savePostsToDatabase ... hiding unchanged code ...
// We need to modify savePostsToDatabase to return the SAVED posts with IDs
// Wait, the original code returned `postsData.map(p => ({ platform: p.platform }))`.
// We need identifiers.

async function savePostsToDatabase(
    supabase: any,
    profileId: string,
    generationId: string,
    posts: Array<ScheduledPost & GeneratedPost>,
    weekStartDate: Date
): Promise<Array<{ id: string; platform: string }>> {
    const dayMapping: Record<string, number> = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6,
    };

    const validFormats = ['single', 'thread', 'long_form', 'video_script'];
    const validPlatforms = ['x', 'linkedin'];

    const postsData = posts.map(post => {
        // ... date calc logic same as before ...
        const targetDay = dayMapping[post.day] ?? 1;
        const startDay = weekStartDate.getDay();
        let daysUntil = (targetDay - startDay + 7) % 7;
        if (daysUntil === 0) daysUntil = 7;

        const scheduledDate = new Date(weekStartDate);
        scheduledDate.setDate(weekStartDate.getDate() + daysUntil);

        // Time parsing
        const timeParts = post.time?.split(' ') || ['10:00', 'AM'];
        const [time, period] = timeParts;
        const [hours, minutes] = (time || '10:00').split(':').map(Number);
        let hour24 = hours || 10;
        if (period === 'PM' && hours !== 12) hour24 += 12;
        if (period === 'AM' && hours === 12) hour24 = 0;
        scheduledDate.setHours(hour24, minutes || 0, 0, 0);

        let format = post.format?.toLowerCase().replace('-', '_').replace(' ', '_') || 'single';
        if (!validFormats.includes(format)) format = 'single';
        let platform = post.platform?.toLowerCase() || 'linkedin';
        if (!validPlatforms.includes(platform)) platform = 'linkedin';

        return {
            profile_id: profileId,
            generation_id: generationId,
            platform,
            scheduled_date: scheduledDate.toISOString(),
            content: post.content || '', // Empty for pending
            hooks: [],
            selected_hook: '',
            cta: null,
            format,
            status: 'draft', // Start as draft/pending
        };
    });

    if (postsData.length > 0) {
        console.log(`[Generation] Inserting ${postsData.length} posts to Supabase...`);
        const { data: inserted, error: postsError } = await supabase
            .from('posts')
            .insert(postsData)
            .select('id, platform'); // Select IDs!

        if (postsError) {
            console.error('[Generation] Failed to save posts:', postsError);
            throw new Error(`Failed to save posts: ${postsError.message}`);
        }
        return inserted || [];
    }

    return [];
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
// ============================================
// SINGLE POST GENERATION (REQUIRED FOR API)
// ============================================

export async function generateSinglePost(postId: string): Promise<{ success: boolean; content?: string; error?: string }> {
    const supabase = createAdminClient();

    // 1. Fetch the post and its profile context
    const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select(`
            *,
            founder_profiles!inner (
                role,
                company_name,
                business_description,
                expertise,
                tone
            )
        `)
        .eq('id', postId)
        .single();

    if (fetchError || !post) {
        console.error('[SingleGen] Post not found:', fetchError);
        return { success: false, error: 'Post not found' };
    }

    // 2. Prepare Prompt
    const profile = post.founder_profiles;
    // @ts-ignore
    const tone = profile.tone || { boldness: 'bold', style: 'educational' };

    const systemPrompt = `You are an elite ghostwriter for top founders.
    
You are writing a SINGLE post for ${post.platform === 'linkedin' ? 'LinkedIn' : 'X (Twitter)'}.

CONTEXT:
- Topic: ${post.topic || 'General Industry Insight'}
- Format: ${post.format || 'single'}
- Role: ${profile.role}
- Company: ${profile.company_name}
- Business: ${profile.business_description}
- Expertise: ${profile.expertise}
- Tone: ${tone.boldness} / ${tone.style}

CONSTRAINTS:
${post.platform === 'x' ? '- Max 280 chars\n- No Hashtags' : '- Professional formatting\n- 800-1200 chars'}
- Start with a strong hook
- Be concise and authoritative

Return ONLY a JSON object:
{
    "content": "The post text",
    "hooks": ["Alternative hook 1", "Alternative hook 2"],
    "cta": "Call to action"
}`;

    // 3. Call AI
    try {
        const provider = await getProvider();
        const result = await provider.complete({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Write a ${post.platform} post about: ${post.topic || 'Industry trends'}` }
            ],
            temperature: 0.7,
            responseFormat: { type: 'json_object' },
        });

        const cleanContent = result.content.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanContent);
        const finalContent = parsed.content || 'Failed to generate content';

        // 4. Update Post
        await supabase
            .from('posts')
            .update({
                content: finalContent,
                hooks: parsed.hooks || [],
                cta: parsed.cta || null,
                status: 'scheduled', // Mark as ready
                updated_at: new Date().toISOString()
            })
            .eq('id', postId);

        return { success: true, content: finalContent };

    } catch (error) {
        console.error('[SingleGen] AI Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Generation failed' };
    }
}
