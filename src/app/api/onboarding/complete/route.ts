import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getProvider } from '@/lib/ai/providers';
import { scrapeWebsite, extractBusinessSummary } from '@/lib/scraper';

export const runtime = 'nodejs';
export const maxDuration = 300; // Allow up to 5 minutes for full batch generation

interface OnboardingData {
    // Basics
    name: string;
    role: string;
    companyName: string;
    companyWebsite: string;

    // Strategy
    platforms: {
        x: boolean;
        linkedin: boolean;
    };
    connections: {
        x: boolean;
        linkedin: boolean;
    };
    industry: string;
    targetAudience: string;

    // New Context Fields (mapped to businessDescription for AI/DB)
    aboutYou: string;
    personalContext: Array<{ type: string; label: string; value: string }>;
    productContext: Array<{ type: string; label: string; value: string }>;

    // Legacy support (optional now)
    businessDescription?: string;
    expertise: string;

    contentGoal: string;
    topics: string[];

    // Style
    archetype: 'builder' | 'teacher' | 'contrarian' | 'executive' | 'custom';
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

    autoPublish?: boolean;

    // Subscription & Visuals (New)
    subscriptionTier?: 'starter' | 'growth' | 'authority';
    visualMode?: 'none' | 'faceless' | 'clone';
    style_faceless?: string;
    style_carousel?: string;
    style_face?: string;
    avatar_urls?: string[];
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
}

export async function POST(request: NextRequest) {
    try {
        const body: OnboardingData = await request.json();

        // Validate required fields (New check uses aboutYou)
        if (!body.industry || !body.contentGoal || body.topics.length === 0 || !body.aboutYou) {
            return NextResponse.json(
                { error: 'Missing required onboarding data' },
                { status: 400 }
            );
        }

        // Aggregate context into a single string for AI and legacy DB storage
        let fullContext = body.aboutYou;

        // Helper to scrape if it's a URL
        const processContextItem = async (label: string, value: string) => {
            if (value.includes('.') && (value.startsWith('http') || value.startsWith('www'))) {
                try {
                    const url = value.startsWith('http') ? value : `https://${value}`;
                    console.log(`[Onboarding] Scraping context URL: ${url}`);
                    const scraped = await scrapeWebsite(url);
                    const summary = extractBusinessSummary(scraped);
                    return `${label}: ${url}\n[Analyzed Content]: ${summary}`;
                } catch (e) {
                    console.warn(`[Onboarding] Failed to scrape ${value}:`, e);
                    return `${label}: ${value} (Scraping Failed)`;
                }
            }
            return `${label}: ${value}`;
        };

        if (body.personalContext?.length > 0) {
            fullContext += '\n\n-- PERSONAL CONTEXT --\n';
            const personalDetails = await Promise.all(
                body.personalContext.map(i => processContextItem(i.label || 'Link', i.value))
            );
            fullContext += personalDetails.join('\n\n');
        }

        if (body.productContext?.length > 0) {
            fullContext += '\n\n-- PRODUCT CONTEXT --\n';
            const productDetails = await Promise.all(
                body.productContext.map(i => processContextItem(i.label || 'Link', i.value))
            );
            fullContext += productDetails.join('\n\n');
        }

        // Assign to legacy field for compatibility
        body.businessDescription = fullContext;

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

        // Scrape Website if provided (Company Website)
        if (body.companyWebsite && body.companyWebsite.includes('.')) {
            try {
                const url = body.companyWebsite.startsWith('http') ? body.companyWebsite : `https://${body.companyWebsite}`;
                console.log('[Onboarding] Scraping company website:', url);
                const scraped = await scrapeWebsite(url);
                const companyContext = extractBusinessSummary(scraped);

                // Append scraped context to description context for AI
                body.businessDescription += `\n\n-- COMPANY WEBSITE --\n${companyContext}`;
            } catch (e) {
                console.warn('[Onboarding] Failed to scrape company website:', e);
            }
        }

        // Step 1: Generate weekly strategy
        console.log('[Onboarding] Generating weekly strategy...');
        const strategy = await generateStrategy(selectedPlatforms, body);

        // Step 2: Generate content for ALL posts in ONE batch (2 logs total constraint)
        console.log('[Onboarding] Generating all posts in single batch...');
        const posts = await generatePostsBatched(strategy.posts, body);

        // Step 3: Save to Supabase
        console.log('[Onboarding] Saving profile and posts to Supabase...');
        let profileId: string | null = null;

        if (isSupabaseConfigured() && user) {
            profileId = await saveToSupabase(supabase, user.id, body, posts);
        } else {
            console.log('[Onboarding] Supabase not configured or no user (mock mode), skipping save');
            profileId = 'mock-profile-id';
        }

        return NextResponse.json({
            success: true,
            profileId,
            postsCount: posts.length,
            message: "Generation complete."
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

    // Calculate strict targets
    const targetX = platforms.includes('x') ? 7 : 0;
    const targetLi = platforms.includes('linkedin') ? 5 : 0;
    const totalTarget = targetX + targetLi;

    const systemPrompt = `You are an elite content strategist for founders.

You specialize in turning a founder’s lived experience, thinking, and POV into high-signal content that builds authority over time.

Your User's Persona:
- Archetype: ${data.archetype.toUpperCase()}
- Archetype Description: ${getArchetypeDesc(data.archetype)}

You prioritize:
- Clarity over cleverness
- Signal over volume
- Authority over virality

Every post should feel intentional, credible, and worth saving.

MISSION  
Create a 1-week content calendar that positions the user as a thoughtful, trusted authority with their target audience.

The calendar should:
- Reflect the user’s real expertise and role
- Build narrative momentum across the week
- Balance teaching, perspective, and light conversion

INPUTS YOU WILL RECEIVE

- Name: ${data.name}
- Role: ${data.role}
- Company: ${data.companyName}
- Industry: ${data.industry}
- Primary Goal: ${data.contentGoal}
- Core Topics / Pillars: ${data.topics.join(', ')}
- Business Description: ${data.businessDescription}
- Target Audience: ${data.targetAudience}

VOICE & STYLE CONSTRAINTS

You MUST mimic the tone, cadence, and framing of the provided voice samples.

VOICE SAMPLES (REFERENCE ONLY — DO NOT COPY):
${data.voiceSamples.map((s, i) => `Sample ${i + 1}: ${s.content}`).join('\n\n')}

Apply:
- Similar sentence length and rhythm
- Similar level of directness and confidence
- Similar use of clarity, contrast, and framing

Do NOT:
- Copy phrases verbatim
- Introduce jargon not present in the samples
- Over-polish or “marketing-ize” the voice

CONTENT STRATEGY PRINCIPLES (APPLY BY DEFAULT)

- Write for intelligent peers, not beginners
- Avoid generic tips or surface-level advice
- Reframe ideas as insights, lessons, or frameworks
- Assume the audience is busy and skeptical

Weekly intent mix (guideline, not rigid):
- ~60% Educate (teach, explain, reframe)
- ~30% Authority (POV, experience, pattern recognition)
- ~10% Soft Conversion (invites, never salesy)

PLATFORM RULES (STRICT)

X:
- Single posts only (NO threads)
- Mix of short and long_form
- One clear idea per post
- Concise, sharp, opinionated

LinkedIn:
- Mostly long_form
- Structured thinking, frameworks, POVs
- Professional, calm, confident tone

SCHEDULING RULES (NON-NEGOTIABLE)

- Start date: Next Monday
- TOTAL POSTS TO GENERATE: ${totalTarget}
${targetX > 0 ? `- X: Exactly ${targetX} posts (1 per day, Mon-Sun)` : ''}
${targetLi > 0 ? `- LinkedIn: Exactly ${targetLi} posts (1 per day, Mon-Fri)` : ''}
- Do not schedule posts on weekends for LinkedIn
- Avoid repeating the same topic on consecutive days

OUTPUT FORMAT (STRICT)

Return ONLY a valid JSON object with this structure:

{
  "posts": [
    {
      "day": "Monday",
      "date": "YYYY-MM-DD",
      "platform": "x" | "linkedin",
      "format": "single" | "long_form",
      "topic": "Brief but specific topic description",
      "intent": "educate" | "authority" | "soft_conversion"
    }
  ]
}

RULES:
- The "posts" array MUST contain EXACTLY ${totalTarget} items.
- Output calendar only — no explanations
- Do NOT write post copy
- Do NOT include hooks, captions, or CTAs
- Ensure the intent mix roughly follows the strategy principles
- Every post must have a clear strategic reason to exist

QUALITY BAR (NON-NEGOTIABLE)

Before finalizing, ensure:
- A credible founder would actually post this
- The topics ladder logically across the week
- The voice matches the provided samples
- The calendar serves the stated goal clearly
- YOU HAVE GENERATED EXACTLY ${totalTarget} POSTS.

If any required input is missing, make strong, reasonable assumptions and proceed.

Output the JSON. Nothing else.`;

    const result = await provider.complete({
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Generate schedule.' }],
        temperature: 0.7,
        responseFormat: { type: 'json_object' },
    });

    try {
        const cleanContent = extractJson(result.content);
        const parsed = JSON.parse(cleanContent);

        // Strict Platform Enforcement
        // The AI sometimes hallucinates platforms even when instructed otherwise.
        // We force the platform field to match the request.

        if (parsed.posts && Array.isArray(parsed.posts)) {
            parsed.posts = parsed.posts.map((post: any) => {
                // If only X requested, force X
                if (targetX > 0 && targetLi === 0) {
                    return { ...post, platform: 'x' };
                }
                // If only LinkedIn requested, force LinkedIn
                if (targetLi > 0 && targetX === 0) {
                    return { ...post, platform: 'linkedin' };
                }

                // If both, ensure it's one of them, default to X if invalid
                if (!['x', 'linkedin'].includes(post.platform?.toLowerCase())) {
                    return { ...post, platform: 'x' }; // Default fallback
                }

                return post;
            });

            // Double check counts? 
            // If we have mixed request, we might want to ensure distribution, but for now 
            // let's trust the AI's count if it matches totalTarget. 
            // The main issue is single-platform requests getting mixed results.
        }

        return parsed;
    } catch (e) {
        console.error('Strategy JSON Parse Failed. Content:', result.content);
        throw new Error('Failed to parse strategy JSON');
    }
}

function extractJson(text: string): string {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return text; // Fallback to original if no brackets
    return text.substring(start, end + 1);
}

function getArchetypeDesc(type: string): string {
    switch (type) {
        case 'builder': return 'Build in public. Share wins, losses, and raw lessons.';
        case 'teacher': return 'Break down complex topics into frameworks and guides.';
        case 'contrarian': return 'Challenge the status quo. Say what others won\'t.';
        case 'executive': return 'High-level vision, culture, leadership, and industry trends.';
        default: return 'Professional and authoritative.';
    }
}


async function generatePostsBatched(
    schedule: ScheduledPost[],
    data: OnboardingData
): Promise<Array<ScheduledPost & GeneratedPost>> {
    const provider = await getProvider();



    // Helper function to generate all posts in one go
    const generateBatch = async (batchSchedule: ScheduledPost[]): Promise<GeneratedPost[]> => {
        if (batchSchedule.length === 0) return [];

        const count = batchSchedule.length;
        const systemPrompt = `You are an elite ghostwriter for top founders.

You write from lived experience, not theory. Your work sounds like a real operator speaking to intelligent peers.

PERSONA (NON-NEGOTIABLE)
- Archetype: ${data.archetype.toUpperCase()}.
- Description: ${getArchetypeDesc(data.archetype)}.

Your voice must match this persona exactly — tone, cadence, confidence, and worldview.

VOICE SAMPLES (MIMIC — DO NOT COPY)
Use the samples below to match:
- Sentence length and rhythm
- Level of directness and conviction
- Use of contrast, framing, and clarity

VOICE SAMPLES:
${data.voiceSamples.map((s, i) => `Sample ${i + 1}: ${s.content}`).join('\n\n')}

Do NOT reuse phrases, metaphors, or structure verbatim.
Do NOT introduce jargon not present in the samples.

CONTEXT (WRITE FROM THIS POV)
- Name: ${data.name}
- Role: ${data.role}
- Company: ${data.companyName}
- Core Expertise: ${data.expertise}
- Target Audience: ${data.targetAudience}

Assume the audience is smart, busy, skeptical, and already past surface-level advice.

MISSION
Generate high-conviction, platform-native content that builds authority, trust, and thoughtful engagement.

Your task is to write content for the following CONTENT PLAN:
${JSON.stringify(batchSchedule.map(p => ({ platform: p.platform, topic: p.topic, length: p.format })), null, 2)}

PLATFORMS & FORMAT CONSTRAINTS (STRICT — NON-NEGOTIABLE)

X (Twitter):
- Short post: MAX 280 characters (hard cap)
- Long post: TARGET ~2,400 characters (±5% tolerance)
- Single post only
- NO threads under any circumstance

LinkedIn:
- Short post: TARGET ~1,000 characters (±10% tolerance)
- Long post: TARGET ~3,000 characters (±10% tolerance)
- Single post only
- NO threads under any circumstance

GLOBAL RULES:
- One post = one standalone update
- NO threads
- NO hashtags unless explicitly requested
- Do NOT include numbered parts, continuations, or “Part 1/2” language
- Respect character limits precisely for the selected platform and length

GLOBAL WRITING RULES

- Open with a scroll-stopping hook in the first 1–2 lines
- No fluff, no filler, no corporate jargon
- Write like you’re talking to a respected peer
- Bold means conviction, not exaggeration
- One clear idea per post

HOOKS & CTA
- Open with a strong hook (first line)
- End with a natural CTA (final line)
- Do NOT separate them into different fields. Just write the post.

OUTPUT REQUIREMENTS (STRICT — READ CAREFULLY)

You MUST generate EXACTLY ${count} complete posts matching the CONTENT PLAN above.

Return ONLY a valid JSON object with this structure:

{
  "posts": [
    {
      "platform": "x" | "linkedin",
      "content": "Full post content"
    }
  ]
}

RULES:
- The "posts" array MUST contain exactly ${count} items
- Content must respect the character limits for its platform and length
- Do NOT include titles, hashtags, emojis, explanations, or alternatives
- Output JSON only — nothing before or after

QUALITY BAR (NON-NEGOTIABLE)

Before finalizing, ensure:
- All posts sound like they were written by the same founder
- The hook stops the scroll
- The post has one clear, memorable idea
- CTAs feel natural and non-pushy
- No repetition across the generated posts

If any required inputs are missing, make strong assumptions and proceed.

Return the JSON. Nothing else.`;

        // Strip heavy context for the AI input
        const simplifiedSchedule = batchSchedule.map(p => ({
            platform: p.platform,
            format: p.format,
            topic: p.topic
        }));

        try {
            console.log(`[Batch] Generating ${count} posts in single request...`);
            const result = await provider.complete({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: 'Generate the posts according to the content plan.' }
                ],
                temperature: 0.4,
                maxTokens: 8192,
                responseFormat: { type: 'json_object' },
            });

            const cleanContent = extractJson(result.content);
            const parsed = JSON.parse(cleanContent);
            return parsed.posts || [];

        } catch (e) {
            console.error(`*** BATCH FAILED ***`, e);
            throw e;
        }
    };

    // Execute single batch
    try {
        const results = await generateBatch(schedule);

        return schedule.map((post, index) => {
            const generated = results[index];
            return {
                ...post,
                content: generated?.content || `Generation failed: Missing content`,
                hooks: [],
                cta: null
            };
        });

    } catch (e) {
        console.error('*** OVERALL GENERATION FAILED ***', e);
        const errorMessage = e instanceof Error ? e.message : String(e);

        // Fallback
        return schedule.map(post => ({
            ...post,
            content: `Generation failed: ${errorMessage}. Please edit.`,
            hooks: [],
            cta: null
        }));
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
                name: data.name, // Now using actual name
                platforms: data.platforms,
                connections: data.connections, // Save connection state
                industry: data.industry,
                target_audience: data.targetAudience,
                content_goal: data.contentGoal,
                topics: data.topics,
                // cadence: 'moderate', // Removed from frontend, default
                tone: data.tone, // Mapping tone object (maybe update this later to include archetype)
                // We should probably save archetype in metadata or repurpose a column, but for now let's stick to existing
                role: data.role,
                company_name: data.companyName,
                company_website: data.companyWebsite,
                business_description: data.businessDescription,
                expertise: data.expertise,
                auto_publish: data.autoPublish ?? false,
                context_data: {
                    aboutYou: data.aboutYou,
                    personalContext: data.personalContext,
                    productContext: data.productContext
                },
                updated_at: new Date().toISOString(),

                // New Fields (Pricing & Visuals)
                subscription_tier: data.subscriptionTier || 'starter',
                visual_mode: data.visualMode || 'none',
                style_faceless: data.style_faceless,
                style_carousel: data.style_carousel,
                style_face: data.style_face,
                avatar_urls: data.avatar_urls,
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
                name: data.name,
                platforms: data.platforms,
                connections: data.connections,
                industry: data.industry,
                target_audience: data.targetAudience,
                content_goal: data.contentGoal,
                topics: data.topics,
                // cadence: 'moderate',
                tone: data.tone,
                role: data.role,
                company_name: data.companyName,
                company_website: data.companyWebsite,
                business_description: data.businessDescription,
                expertise: data.expertise,
                auto_publish: data.autoPublish ?? false,
                context_data: {
                    aboutYou: data.aboutYou,
                    personalContext: data.personalContext,
                    productContext: data.productContext
                },
                // Rolling schedule fields
                next_generation_date: nextGenerationDate.toISOString(),
                generation_day_of_week: generationDayOfWeek,
                generation_count: 1, // This is their first week
                timezone: 'UTC',

                // New Fields (Pricing & Visuals)
                subscription_tier: data.subscriptionTier || 'starter',
                visual_mode: data.visualMode || 'none',
                style_faceless: data.style_faceless,
                style_carousel: data.style_carousel,
                style_face: data.style_face,
                avatar_urls: data.avatar_urls,
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

        // Parse time safely - HARDCODED to 8:30 PM per user request
        // const timeParts = post.time?.split(' ') || ['10:00', 'AM'];
        // const [time, period] = timeParts;
        // const [hours, minutes] = (time || '10:00').split(':').map(Number);
        // let hour24 = hours || 10;
        // if (period === 'PM' && hours !== 12) hour24 += 12;
        // if (period === 'AM' && hours === 12) hour24 = 0;

        // Force 8:30 PM (20:30)
        scheduledDate.setHours(20, 30, 0, 0);

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
