import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getProvider } from '@/lib/ai/providers';
import { scrapeWebsite, extractBusinessSummary } from '@/lib/scraper';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for AI generation

interface OnboardingData {
    platforms: {
        x: boolean;
        linkedin: boolean;

    };
    industry: string;
    targetAudience: string;
    contentGoal: string;
    topics: string[];
    cadence: 'light' | 'moderate' | 'active';
    tone: {
        formality: 'professional' | 'casual';
        boldness: 'bold' | 'measured';
        style: 'educational' | 'conversational';
        approach: 'story-driven' | 'data-driven';
    };
    voiceSamples: {
        content: string;
        type: 'paste' | 'upload' | 'voicenote' | 'url';
    }[];
    userContext: {
        role: string;
        companyName: string;
        companyWebsite: string;
        businessDescription: string;
        expertise: string;
    };
    autoPublish?: boolean;
}

interface ScheduledPost {
    day: string;
    platform: 'x' | 'linkedin';
    format: 'single' | 'long_form' | 'video_script';
    topic: string;
    time: string;
}

interface GeneratedPost {
    content: string;
    hooks: string[];
    cta: string | null;
}



export async function POST(request: NextRequest) {
    try {
        const body: OnboardingData = await request.json();

        // Ensure userContext has default values
        const userContext = body.userContext || {
            role: '',
            companyName: '',
            companyWebsite: '',
            businessDescription: '',
            expertise: '',
        };
        body.userContext = userContext;

        // Validate required fields
        if (!body.industry || !body.contentGoal || body.topics.length === 0) {
            return NextResponse.json(
                { error: 'Missing required onboarding data' },
                { status: 400 }
            );
        }

        // Get selected platforms
        const selectedPlatforms = Object.entries(body.platforms)
            .filter(([_, enabled]) => enabled)
            .map(([platform]) => platform as 'x' | 'linkedin');

        if (selectedPlatforms.length === 0) {
            return NextResponse.json(
                { error: 'At least one platform must be selected' },
                { status: 400 }
            );
        }

        // Check AI provider
        const provider = await getProvider();
        if (!provider.isConfigured()) {
            return NextResponse.json(
                { error: 'AI provider is not configured. Please add your ANTHROPIC_API_KEY.' },
                { status: 500 }
            );
        }

        // Get authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user && isSupabaseConfigured()) {
            // Only require auth if Supabase is actually configured for production
            return NextResponse.json(
                { error: 'Unauthorized: Please log in to complete onboarding.' },
                { status: 401 }
            );
        }

        // Scrape Website if provided
        if (body.userContext.companyWebsite && body.userContext.companyWebsite.startsWith('http')) {
            try {
                console.log('[Onboarding] Scraping website:', body.userContext.companyWebsite);
                const scraped = await scrapeWebsite(body.userContext.companyWebsite);
                const companyContext = extractBusinessSummary(scraped);
                console.log('[Onboarding] Scraped summary length:', companyContext.length);

                // Replace URL with scraped text context for AI and Storage
                body.userContext.companyWebsite = companyContext;
            } catch (e) {
                console.warn('[Onboarding] Failed to scrape website:', e);
            }
        }

        // Step 1: Generate weekly strategy
        console.log('[Onboarding] Generating weekly strategy...');
        const strategy = await generateStrategy(selectedPlatforms, body);

        // Step 2: Generate content for each post
        console.log('[Onboarding] Generating posts...');
        const posts = await generatePosts(strategy.posts, body);

        // Step 3: Save to Supabase
        let profileId: string | null = null;
        if (isSupabaseConfigured() && user) {
            console.log('[Onboarding] Saving to Supabase...');
            profileId = await saveToSupabase(supabase, user.id, body, posts);
        } else {
            console.log('[Onboarding] Supabase not configured or no user (mock mode), skipping save');
            // If mock mode, return a dummy ID
            profileId = 'mock-profile-id';
        }

        return NextResponse.json({
            success: true,
            profileId,
            postsCount: posts.length,
        });

    } catch (error) {
        console.error('[Onboarding] Error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'An unexpected error occurred',
                details: error,
            },
            { status: 500 }
        );
    }
}

async function generateStrategy(
    platforms: Array<'x' | 'linkedin'>,
    data: OnboardingData
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
- Industry: ${data.industry}
- Primary Content Goal: ${data.contentGoal}
- Core Topics / Pillars: ${data.topics.join(', ')}
- Platforms: ${platforms.join(', ')}

USER CONTEXT:
- Role: ${data.userContext.role}
- Company: ${data.userContext.companyName}
- Company Context: ${data.userContext.companyWebsite}
- Business Description: ${data.userContext.businessDescription}
- Core Expertise: ${data.userContext.expertise}

STRATEGIC CONTENT PRINCIPLES (APPLY BY DEFAULT)

Audience sophistication:
- Write for intelligent peers, not beginners
- Avoid generic “tips” unless reframed as insights or frameworks
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

OUTPUT REQUIREMENTS (STRICT)

Return ONLY a valid JSON object with this structure:

{
  "posts": [
    {
      "day": "Monday",
      "platform": "linkedin",
      "format": "long_form",
      "topic": "Brief but specific topic description",
      "time": "Best time to post"
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
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Generate the weekly schedule.' }],
        temperature: 0.7,
        responseFormat: { type: 'json_object' },
    });

    try {
        // Strip markdown code blocks if present
        const cleanContent = result.content.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanContent);
    } catch (e) {
        console.error('[Strategy] JSON Parse Error:', e);
        console.log('[Strategy] Raw Content:', result.content);
        throw new Error('Failed to parse strategy JSON');
    }
}


async function generatePosts(
    schedule: ScheduledPost[],
    data: OnboardingData
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
- No generic “tips”
- No fluff or filler — every sentence earns its place

“Crazy / Viral / Polarizing” means:
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

- Role: ${data.userContext.role}
- Company: ${data.userContext.companyName}
- Business Description: ${data.userContext.businessDescription}
- Core Expertise: ${data.userContext.expertise}
- Desired Boldness Level: ${data.tone.boldness}
- Writing Style Preferences: ${data.tone.style}

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
        temperature: 0.8, // Increased for creativity
        responseFormat: { type: 'json_object' },
    });

    try {
        const cleanContent = result.content.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanContent);

        // Merge generated content with schedule
        return schedule.map((post, index) => ({
            ...post,
            content: parsed.posts[index]?.content || parsed.posts[index] || 'Failed to generate content',
            hooks: parsed.posts[index]?.hooks || [],
            cta: parsed.posts[index]?.cta || null,
        }));
    } catch (e) {
        console.error('Failed to parse batched posts:', e);
        // Fallback: If batch fails, return empty content for now (or retry strictly)
        return schedule.map(post => ({ ...post, content: 'Generation failed. Please try again.', hooks: [], cta: null }));
    }
}

async function saveToSupabase(
    supabase: any,
    userId: string,
    data: OnboardingData,
    posts: Array<ScheduledPost & GeneratedPost>
): Promise<string> {
    // Check if profile exists
    const { data: existingProfiles } = await supabase
        .from('founder_profiles')
        .select('id')
        .eq('account_id', userId)
        .limit(1);

    let profile: any;

    if (existingProfiles && existingProfiles.length > 0) {
        // Update existing
        const { data: updated, error } = await supabase
            .from('founder_profiles')
            .update({
                name: 'User',
                platforms: data.platforms,
                industry: data.industry,
                target_audience: data.targetAudience,
                content_goal: data.contentGoal,
                topics: data.topics,
                cadence: data.cadence,
                tone: data.tone,
                role: data.userContext.role,
                company_name: data.userContext.companyName,
                company_website: data.userContext.companyWebsite,
                business_description: data.userContext.businessDescription,
                expertise: data.userContext.expertise,
                auto_publish: data.autoPublish ?? false,
                updated_at: new Date().toISOString()
            })
            .eq('id', existingProfiles[0].id)
            .select()
            .single();

        if (error) {
            console.error('Failed to update profile:', error);
            throw error;
        }
        profile = updated;
    } else {
        // Create new profile
        // Calculate next generation date (7 days from now for rolling schedule)
        const nextGenerationDate = new Date();
        nextGenerationDate.setDate(nextGenerationDate.getDate() + 7);
        const generationDayOfWeek = new Date().getDay(); // Today's day becomes their generation day

        const { data: created, error } = await supabase
            .from('founder_profiles')
            .insert({
                account_id: userId,
                name: 'User',
                platforms: data.platforms,
                industry: data.industry,
                target_audience: data.targetAudience,
                content_goal: data.contentGoal,
                topics: data.topics,
                cadence: data.cadence,
                tone: data.tone,
                role: data.userContext.role,
                company_name: data.userContext.companyName,
                company_website: data.userContext.companyWebsite,
                business_description: data.userContext.businessDescription,
                expertise: data.userContext.expertise,
                auto_publish: data.autoPublish ?? false,
                // Rolling schedule fields
                next_generation_date: nextGenerationDate.toISOString(),
                generation_day_of_week: generationDayOfWeek,
                generation_count: 1, // This is their first week
                timezone: 'UTC',
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to create profile:', error);
            throw error;
        }
        profile = created;
    }

    // Save voice samples
    if (data.voiceSamples.length > 0) {
        // Delete old (simplest way to update)
        await supabase.from('voice_samples').delete().eq('profile_id', profile.id);

        const voiceSamplesData = data.voiceSamples.map(sample => ({
            profile_id: profile.id,
            content: sample.content,
            source_type: sample.type,
        }));

        await supabase.from('voice_samples').insert(voiceSamplesData);
    }

    // Save posts
    // Note: In a real app we might want to smarter diffing, but for now we won't delete old posts
    // to preserve history, just add new ones.

    const today = new Date();
    const dayMapping: Record<string, number> = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6,
    };

    const validFormats = ['single', 'thread', 'long_form', 'video_script'];
    const validPlatforms = ['x', 'linkedin'];

    const postsData = posts.map(post => {
        // Calculate the next occurrence of this day
        const targetDay = dayMapping[post.day] ?? 1;
        const currentDay = today.getDay();
        let daysUntil = (targetDay - currentDay + 7) % 7;
        if (daysUntil === 0) daysUntil = 7; // If today, schedule for next week

        const scheduledDate = new Date(today);
        scheduledDate.setDate(today.getDate() + daysUntil);

        // Parse time safely
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
            profile_id: profile.id,
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

    // Batch insert posts
    if (postsData.length > 0) {
        console.log(`[Onboarding] Inserting ${postsData.length} posts to Supabase...`);
        const { error: postsError } = await supabase
            .from('posts')
            .insert(postsData);

        if (postsError) {
            console.error('[Onboarding] Failed to save posts:', postsError);
            throw new Error(`Failed to save posts: ${postsError.message}`);
        }
        console.log('[Onboarding] Posts saved successfully.');
    } else {
        console.warn('[Onboarding] No posts generated to save.');
    }

    return profile.id;
}
