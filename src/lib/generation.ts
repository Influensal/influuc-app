/**
 * Weekly Content Generation Service
 * Core logic for generating weekly posts for users
 *
 * Flow:
 *   1. Strategy call (sync) — generates ideas for text posts + carousels
 *   2. Batch call — submits all text post + carousel requests to Anthropic Batch API
 *   3. Poll — waits for batch completion, then saves results to DB
 */

import { getProvider } from '@/lib/ai/providers';
import { createClient } from '@supabase/supabase-js';
import { generateCarouselSlides } from '@/lib/ai/carousel-generator';
import { getCarouselStyle, getDefaultStyle } from '@/lib/ai/carousel-styles';
import dJSON from 'dirty-json';

/**
 * Robust JSON parser that tries native JSON.parse first,
 * then dirty-json, then regex extraction as a last resort.
 */
export function robustJsonParse(raw: string): any {
    // Step 1: Clean up common AI artifacts
    let cleaned = raw
        .replace(/```json\n?|\n?```/g, '')
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .trim();

    // Step 2: Extract the JSON object
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    // Step 3: Fix trailing commas
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

    // Step 4: Fix double-double-quote keys like ""posts":
    cleaned = cleaned.replace(/""(posts|carousels|content|hooks|cta|index|slides)":/g, '"$1":');

    // Step 5: Try native JSON.parse
    try {
        return JSON.parse(cleaned);
    } catch (nativeErr) {
        console.warn('[robustJsonParse] Native JSON.parse failed, trying dirty-json...');
    }

    // Step 6: Try dirty-json
    try {
        return dJSON.parse(cleaned);
    } catch (dirtyErr) {
        console.warn('[robustJsonParse] dirty-json failed, trying newline escape repair...');
    }

    // Step 7: Try fixing unescaped newlines inside string values
    try {
        const repaired = cleaned.replace(
            /"(?:[^"\\]|\\.)*"/g,
            (match) => match.replace(/\n/g, '\\n').replace(/\t/g, '\\t')
        );
        return JSON.parse(repaired);
    } catch (repairErr) {
        console.error('[robustJsonParse] All parse attempts failed.');
        throw repairErr;
    }
}

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
    // Strategy fields (new)
    strategy_brief?: string;
    content_pillars?: { name: string; description: string; job: string }[];
    positioning_statement?: string;
    pov_statement?: string;
    identity_gap?: string;
    archetype_primary?: string;
    archetype_secondary?: string;
    archetype_flavor?: string;
    brand_colors?: {
        primary: string;
        background: string;
        accent: string;
    };
    style_carousel?: string;
    voice_samples?: { content: string; type: string }[];
    name?: string;
    subscription_tier?: string;
    weekly_throughline?: string;
}

export interface ScheduledPost {
    day: string;
    platform: 'x' | 'linkedin';
    format: 'single' | 'long_form' | 'video_script' | 'carousel';
    topic: string;
    time: string;
}

export interface CarouselIdea {
    day: string;
    topic: string;
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

    // Fetch up to 10 recently liked posts as examples for the AI
    const { data: likedPosts } = await supabase
        .from('posts')
        .select('content, topic, format, platform')
        .eq('profile_id', profile.id)
        .eq('is_liked', true)
        .order('created_at', { ascending: false })
        .limit(10);

    const likedExamples = likedPosts || [];

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

        // Step 2: Generate strategy (schedule) — includes text + carousel ideas
        const strategy = await generateStrategy(platforms, profile, likedExamples);
        console.log(`[Generation] Strategy returned: ${strategy.posts?.length || 0} posts, ${strategy.carousels?.length || 0} carousels`);
        console.log(`[Generation] Carousel ideas:`, JSON.stringify(strategy.carousels || []));

        // Step 3: Generate all content (text + carousels) with 2 parallel API calls
        const carouselIdeas = strategy.carousels || [];
        const { textPosts, carouselPosts } = await generateAllContentBatch(
            strategy.posts,
            carouselIdeas,
            profile,
            likedExamples
        );

        // Step 4: Save all posts to database
        const savedTextPosts = await savePostsToDatabase(
            supabase,
            profile.id,
            generation.id,
            textPosts,
            weekStartDate
        );

        const savedCarouselPosts = await saveCarouselsToDatabase(
            supabase,
            profile.id,
            generation.id,
            carouselPosts,
            weekStartDate
        );

        // Count by platform
        const xPostsCount = savedTextPosts.filter(p => p.platform === 'x').length;
        const linkedinPostsCount = savedTextPosts.filter(p => p.platform === 'linkedin').length + savedCarouselPosts.length;

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
    const now = new Date().toISOString();

    // Archive all unposted items that are:
    // 1. Explicitly backdated (scheduled_date < now)
    // 2. OR part of the previous generation cycle
    const { data, error } = await supabase
        .from('posts')
        .update({
            status: 'archived',
            archived_at: now
        })
        .eq('profile_id', profileId)
        .in('status', ['scheduled', 'skipped', 'failed'])
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
// BATCH GENERATION — TEXT + CAROUSELS
// ============================================

export interface GeneratedCarouselPost {
    day: string;
    topic: string;
    slides: string[];
    styleId: string;
}

/**
 * Generates ALL content with just 2 parallel API calls:
 *   Request 1 → all text posts (12) in a single prompt
 *   Request 2 → both carousels (2) in a single prompt
 *
 * Fired simultaneously via Promise.all for maximum speed.
 */
export async function generateAllContentBatch(
    textSchedule: ScheduledPost[],
    carouselIdeas: CarouselIdea[],
    profile: UserProfile,
    likedExamples: any[] = []
): Promise<{
    textPosts: Array<ScheduledPost & GeneratedPost>;
    carouselPosts: GeneratedCarouselPost[];
}> {
    const provider = await getProvider();

    // ── REQUEST 1: All text posts in one call ──
    const generateAllTextPosts = async (): Promise<Array<ScheduledPost & GeneratedPost>> => {
        const postsSpec = textSchedule.map((post, i) => ({
            index: i,
            platform: post.platform,
            format: post.format,
            topic: post.topic,
            day: post.day,
        }));

        const systemPrompt = profile.strategy_brief ? `You are a world-class ghostwriter executing a brand content strategy.

You will generate ALL ${textSchedule.length} posts in a SINGLE response.

=== STRATEGY BRIEF (MASTER SOURCE OF TRUTH) ===
${profile.strategy_brief}
=== END BRIEF ===

MISSION:
Generate high-conviction, platform-native content that builds authority, trust, and thoughtful engagement. Ground the content in the "EXPERTISE & RAW INTEL" section of the strategy brief. Mention specific products, features, or past roles where relevant.

${likedExamples.length > 0 ? `PAST SUCCESSFUL POSTS (Emulate this style and tone):
${likedExamples.map((ex, i) => `EXAMPLE ${i + 1} (${ex.platform} / ${ex.format}):
"${ex.content}"`).join('\n\n')}` : ''}

POSTS TO GENERATE:
${postsSpec.map(p => `[${p.index}] ${p.platform} / ${p.format} — "${p.topic}"${(p as any).pillar ? ` [pillar: ${(p as any).pillar}]` : ''}${(p as any).hook_type ? ` [hook: ${(p as any).hook_type}]` : ''}${(p as any).cta_type ? ` [cta: ${(p as any).cta_type}]` : ''}`).join('\n')}

PLATFORM AND FORMAT CONSTRAINTS:
- Format "single" (X): Max 280 chars, punchy and sharp.
- Format "single" (LinkedIn): TARGET ~1,000 chars, professional story or insight.
- Format "long_form": TARGET ~2,500 chars, structured thinking, deep dive.
- Platform X: No hashtags under any circumstances.
- Platform LinkedIn: Professional formatting with line breaks.

DIVERSE WRITING STRUCTURES (VARY THESE ACROSS THE BATCH):
1. THE NARRATIVE STORY: Start with conflict/insight, show the build/raw process, end with a hard-won lesson.
2. THE ATOMIC ESSAY: Punchy hook, 3-5 structural paragraphs on ONE specific mental model. No fluff.
3. THE SPIKY POV: Challenge a common industry belief using the logic in the strategy brief. Propose a better way.
4. THE TACTICAL CHECKLIST: High-value "How-to" with clear steps.

RULES:
- Write from the user's voice — not a brand voice, not a marketing voice.
- Ground at least 40% of posts in specific facts from the "RAW INTEL" section of the brief.
- CTAs must feel natural and match the audience temperature.
- Do NOT use generic industry advice. Every post must pass the "would a real founder actually post this?" test.
- Max 1-2 emojis per post. No emoji spam.

Return ONLY a valid JSON object with this exact structure:
{
    "posts": [
        {
            "index": 0,
            "content": "The full post text",
            "hooks": ["Alternative hook 1", "Alternative hook 2"],
            "cta": "Call to action or null"
        }
    ]
}

The "posts" array must have exactly ${textSchedule.length} items, one per post, in the same order as the input.`
            : `You are an elite ghostwriter for top founders.

You will generate ALL ${textSchedule.length} posts in a SINGLE response.

USER CONTEXT:
- Role: ${profile.role}
- Company: ${profile.company_name}
- Business: ${profile.business_description}
- Expertise: ${profile.expertise}
- Tone: ${profile.tone?.boldness || 'bold'} / ${profile.tone?.style || 'educational'}

MISSION:
Generate high-conviction content across 4 structures: Narrative Story, Atomic Essay, Spiky POV, and Tactical Checklist.

POSTS TO GENERATE:
${postsSpec.map(p => `[${p.index}] ${p.platform} / ${p.format} — "${p.topic}"`).join('\n')}

PLATFORM AND FORMAT CONSTRAINTS:
- Format "single" (X): Max 280 chars.
- Format "single" (LinkedIn): ~1,000 chars.
- Format "long_form": ~2,500 chars (Detailed LinkedIn deep dive).
- Platform X: No hashtags.

RULES:
- Each post must start with a strong hook.
- Ground content in the user's specific business context.
- Every post should feel distinct — vary openings and structures.
- Write for intelligent peers, not beginners.
- Max 1-2 emojis. No corporate jargon.

Return ONLY a valid JSON object with this exact structure:
{
    "posts": [
        {
            "index": 0,
            "content": "The full post text",
            "hooks": ["Alternative hook 1", "Alternative hook 2"],
            "cta": "Call to action or null"
        }
    ]
}

The "posts" array must have exactly ${textSchedule.length} items, one per post, in the same order as the input.`;

        try {
            console.log(`[Generation] Generating ${textSchedule.length} text posts in a single request...`);
            const result = await provider.complete({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Generate all ${textSchedule.length} posts now.` }
                ],
                temperature: 0.7,
                responseFormat: { type: 'json_object' },
            });

            // Parse the bulk response with robust parsing
            let parsed: any;
            try {
                parsed = robustJsonParse(result.content);
            } catch (parseErr) {
                console.warn('[Generation] All JSON parse methods failed, extracting posts with regex...');
                // Last resort: extract individual post objects via regex
                const cleanContent = result.content;
                const postRegex = /\{[^{}]*?"index"\s*:\s*(\d+)[^{}]*?"content"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
                const extractedPosts: Array<{ index: number; content: string; hooks: string[]; cta: string | null }> = [];
                let match;
                while ((match = postRegex.exec(cleanContent)) !== null) {
                    extractedPosts.push({
                        index: parseInt(match[1]),
                        content: match[2].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
                        hooks: [],
                        cta: null,
                    });
                }
                if (extractedPosts.length > 0) {
                    console.log(`[Generation] Recovered ${extractedPosts.length} posts via regex`);
                    parsed = { posts: extractedPosts };
                } else {
                    throw parseErr;
                }
            }

            const generatedPosts: Array<{ index: number; content: string; hooks: string[]; cta: string | null }> = parsed.posts || [];

            // Map results back to schedule
            return textSchedule.map((post, i) => {
                const generated = generatedPosts.find(g => g.index === i) || generatedPosts[i];
                return {
                    ...post,
                    content: (generated?.content || 'Generation failed. Please edit.').replace(/NaN$/, '').trim(),
                    hooks: generated?.hooks || [],
                    cta: generated?.cta || null,
                };
            });
        } catch (e) {
            console.error('[Generation] Bulk text post generation failed:', e);
            // Return fallbacks for all posts
            return textSchedule.map(post => ({
                ...post,
                content: 'Generation failed. Please edit.',
                hooks: [],
                cta: null,
            }));
        }
    };

    // ── REQUEST 2: Both carousels in one call ──
    const generateAllCarousels = async (): Promise<GeneratedCarouselPost[]> => {
        console.log(`[Generation] generateAllCarousels called with ${carouselIdeas.length} ideas:`, JSON.stringify(carouselIdeas));
        if (carouselIdeas.length === 0) {
            console.warn('[Generation] WARNING: No carousel ideas provided — skipping carousel generation!');
            return [];
        }

        const carouselStyleId = (profile as any).style_carousel || 'minimal-stone';
        const style = carouselStyleId ? getCarouselStyle(carouselStyleId) : getDefaultStyle();

        if (!style || !style.prompt) {
            console.warn('[Generation] No carousel style found, skipping carousels');
            return [];
        }

        // Build a combined prompt for ALL carousels
        const carouselSpecs = carouselIdeas.map((c, i) => {
            const numberMatch = c.topic.match(
                /\b(top\s*)?(\d+)\s*(things?|tips?|ways?|habits?|books?|tools?|ideas?|steps?|reasons?|secrets?|hacks?|strategies?|mistakes?|rules?|principles?|lessons?|facts?|myths?)?/i
            );
            let slideCount = 6;
            if (numberMatch && numberMatch[2]) {
                const num = parseInt(numberMatch[2]);
                if (num >= 3 && num <= 15) {
                    slideCount = num + 2;
                }
            }
            return { index: i, topic: c.topic, slideCount };
        });

        const brandColors = profile.brand_colors || {
            primary: '#10B981',
            background: '#09090B',
            accent: '#F59E0B'
        };

        const brandColorsInstruction = `BRAND COLORS (CRITICAL):
Primary Color: ${brandColors.primary} (Use for buttons, main icons, key highlights)
Background Color: ${brandColors.background} (Use for the main slide canvas background)
Accent Color: ${brandColors.accent} (Use for secondary highlights, checks, small pops of color)

When generating the HTML/Tailwind:
1. Always set the main container's background to ${brandColors.background} using inline style: style="background-color: ${brandColors.background}"
2. Use ${brandColors.primary} for the most important visual elements.
3. Use ${brandColors.accent} for decoration.
4. Ensure text remains readable (use white or black text depending on ${brandColors.background} brightness).`;

        let systemPrompt = style.prompt.replace('[BRAND_COLORS_INSTRUCTION]', brandColorsInstruction);

        // Add multi-carousel instructions
        systemPrompt += `

MULTI-CAROUSEL INSTRUCTIONS:
You must generate ${carouselIdeas.length} separate carousels in one response.

STRATEGIC CONTEXT:
${profile.strategy_brief || 'No strategy brief provided.'}

USER CONTEXT:
${likedExamples.length > 0 ? `PAST SUCCESSFUL CONTENT:
${likedExamples.filter(ex => ex.format === 'carousel').map((ex, i) => `EXAMPLE ${i + 1}:\n"${ex.content}"`).join('\n\n')}` : ''}`;

        if (profile.industry) systemPrompt += `\n- Industry: ${profile.industry}`;
        if (profile.role) systemPrompt += `\n- Role: ${profile.role}`;
        if (profile.company_name) systemPrompt += `\n- Company: ${profile.company_name}`;
        if (profile.target_audience) systemPrompt += `\n- Audience: ${profile.target_audience}`;

        systemPrompt += `

Return ONLY a valid JSON object:
{
    "carousels": [
        {
            "index": 0,
            "slides": ["<div>...</div>", "<div>...</div>"]
        }
    ]
}

Each carousel must have exactly the specified number of slides.`;

        const userMessage = carouselSpecs.map(c =>
            `Carousel ${c.index}: "${c.topic}" — ${c.slideCount} slides`
        ).join('\n');

        try {
            console.log(`[Generation] Generating ${carouselIdeas.length} carousels in a single request...`);
            const result = await provider.complete({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Create these carousels:\n${userMessage}` }
                ],
                temperature: 0.7,
                responseFormat: { type: 'json_object' },
            });

            // Parse response with robust parser
            const data = robustJsonParse(result.content);

            const carouselResults: GeneratedCarouselPost[] = [];
            const generatedCarousels: Array<{ index: number; slides: string[] }> = data.carousels || [];

            for (let i = 0; i < carouselIdeas.length; i++) {
                const generated = generatedCarousels.find(c => c.index === i) || generatedCarousels[i];
                if (generated?.slides && generated.slides.length > 0) {
                    carouselResults.push({
                        day: carouselIdeas[i].day,
                        topic: carouselIdeas[i].topic,
                        slides: generated.slides,
                        styleId: carouselStyleId,
                    });
                    console.log(`[Generation] Carousel ${i} parsed: ${generated.slides.length} slides`);
                } else {
                    console.error(`[Generation] Carousel ${i} returned no slides`);
                }
            }

            return carouselResults;
        } catch (e) {
            console.error('[Generation] Bulk carousel generation failed:', e);
            return [];
        }
    };

    // ── Fire both requests in parallel ──
    console.log(`[Generation] Firing 2 parallel requests (${textSchedule.length} text posts + ${carouselIdeas.length} carousels)...`);
    const [textPosts, carouselPosts] = await Promise.all([
        generateAllTextPosts(),
        generateAllCarousels(),
    ]);

    console.log(`[Generation] Done: ${textPosts.length} text posts, ${carouselPosts.length} carousels`);
    return { textPosts, carouselPosts };
}

// ============================================
// GENERATE STRATEGY (SCHEDULE)
// ============================================

async function generateStrategy(
    platforms: Array<'x' | 'linkedin'>,
    profile: UserProfile,
    likedExamples: any[] = []
): Promise<{ posts: ScheduledPost[]; carousels: CarouselIdea[] }> {
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

${likedExamples.length > 0 ? `PREVIOUSLY LIKED POSTS (Topics and styles the user prefers):
${likedExamples.map((ex, i) => `- [${ex.platform}] Topic: ${ex.topic} | Content: ${ex.content.substring(0, 100)}...`).join('\n')}` : ''}

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

${(() => {
    const tier = profile.subscription_tier || 'starter';
    const selectedPlatform = platforms[0];
    
    if (tier === 'starter') {
        return `STARTER PLAN LIMITS (ENFORCE STRICTLY):
- Schedule exactly 7 posts total for ${selectedPlatform?.toUpperCase() || 'LINKEDIN'} ONLY.
- Format Mix: "single" ONLY. No long_form.
- NO carousels.`;
    } else if (tier === 'creator') {
        const xCount = profile.platforms.x ? 7 : 0;
        const linkedinCount = profile.platforms.linkedin ? 5 : 0;
        return `CREATOR PLAN LIMITS:
- Schedule ${xCount} posts for X and ${linkedinCount} posts for LinkedIn.
- Format Mix: 3 "long_form", rest "single".
- Exactly 2 carousels (LinkedIn only).`;
    } else {
        const xCount = profile.platforms.x ? 7 : 0;
        const linkedinCount = profile.platforms.linkedin ? 5 : 0;
        return `AUTHORITY PLAN:
- Schedule ${xCount} posts for X and ${linkedinCount} posts for LinkedIn.
- Format Mix: ${linkedinCount > 0 ? '3' : '0'} "long_form", rest "single".
- Exactly 2 carousels (LinkedIn only).`;
    }
})()}

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
  ],
  "carousels": [
    {
      "day": "Wednesday",
      "topic": "5 frameworks every founder should know about [specific area]"
    }
  ]
}

CARDINALITY RULES (TIER: ${profile.subscription_tier || 'starter'}):
- Starter: exactly 7 items in "posts" (Single platform), "carousels" MUST be empty [].
- Creator/Authority: exactly 12 items (if both platforms) in "posts", exactly 2 items in "carousels".
- ONLY return platforms the user selected: ${platforms.join(', ')}.

RULES:
- Allowed formats for posts: "single", "long_form", "video_script"
- Allowed platforms for posts: "x" or "linkedin"
- Carousel topics should be visual/educational — lists, frameworks, step-by-step guides
- Carousel days must NOT overlap with busy LinkedIn post days
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
        return robustJsonParse(result.content);
    } catch (e) {
        console.error('[Strategy] JSON Parse Error:', e);
        console.log('[Strategy] Raw Content:', result.content.substring(0, 500));
        throw new Error(`Failed to parse strategy JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
}

// Note: Old generateCarouselBatch removed — carousels are now part of the batch API flow.

// ============================================
// SAVE TEXT POSTS TO DATABASE
// ============================================

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

    const validFormats = ['single', 'thread', 'long_form', 'video_script', 'carousel'];
    const validPlatforms = ['x', 'linkedin'];

    const postsData = posts.map(post => {
        // ... date calc logic same as before ...
        const targetDay = dayMapping[post.day] ?? 1;
        const startDay = weekStartDate.getDay();
        let daysUntil = (targetDay - startDay + 7) % 7;
        if (daysUntil === 0) daysUntil = 7;

        const scheduledDate = new Date(weekStartDate);
        scheduledDate.setDate(weekStartDate.getDate() + daysUntil);

        // Time parsing - HARDCODED to 8:30 PM per user request
        // const timeParts = post.time?.split(' ') || ['10:00', 'AM'];
        // const [time, period] = timeParts;
        // const [hours, minutes] = (time || '10:00').split(':').map(Number);
        // let hour24 = hours || 10;
        // if (period === 'PM' && hours !== 12) hour24 += 12;
        // if (period === 'AM' && hours === 12) hour24 = 0;

        // Force 8:30 PM (20:30)
        scheduledDate.setHours(20, 30, 0, 0);

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
            topic: post.topic,
            hooks: [],
            selected_hook: '',
            cta: null,
            format,
            status: 'scheduled',
            ...(format === 'carousel' ? { carousel_slides: null, carousel_style: null } : {}),
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
// SAVE CAROUSEL POSTS TO DATABASE
// ============================================

async function saveCarouselsToDatabase(
    supabase: any,
    profileId: string,
    generationId: string,
    carousels: GeneratedCarouselPost[],
    weekStartDate: Date
): Promise<Array<{ id: string; platform: string }>> {
    if (carousels.length === 0) return [];

    const dayMapping: Record<string, number> = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6,
    };

    const carouselData = carousels.map(carousel => {
        const targetDay = dayMapping[carousel.day] ?? 3;
        const startDay = weekStartDate.getDay();
        let daysUntil = (targetDay - startDay + 7) % 7;
        if (daysUntil === 0) daysUntil = 7;

        const scheduledDate = new Date(weekStartDate);
        scheduledDate.setDate(weekStartDate.getDate() + daysUntil);
        scheduledDate.setHours(20, 30, 0, 0);

        return {
            profile_id: profileId,
            generation_id: generationId,
            platform: 'linkedin',
            scheduled_date: scheduledDate.toISOString(),
            content: `📊 Carousel: ${carousel.topic} (${carousel.slides.length} slides)`,
            topic: carousel.topic,
            hooks: [],
            selected_hook: '',
            cta: null,
            format: 'carousel',
            status: 'scheduled',
            carousel_slides: carousel.slides,
            carousel_style: carousel.styleId,
        };
    });

    console.log(`[Generation] Inserting ${carouselData.length} carousel posts to Supabase...`);
    const { data: inserted, error } = await supabase
        .from('posts')
        .insert(carouselData)
        .select('id, platform');

    if (error) {
        console.error('[Generation] Failed to save carousel posts:', error);
        // Non-fatal — don't throw, just return empty
        return [];
    }

    return inserted || [];
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

    // Source 1: Count completed content_generations rows
    const { count, error } = await supabase
        .from('content_generations')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .eq('status', 'completed');

    const generationsCount = error ? 0 : (count || 0);

    // Source 2: Check profile's generation_count (set by onboarding flow)
    const { data: profile } = await supabase
        .from('founder_profiles')
        .select('generation_count')
        .eq('account_id', accountId)
        .single();

    const profileCount = (profile as any)?.generation_count || 0;

    // Use whichever is higher — covers both onboarding and weekly generation paths
    const totalGenerations = Math.max(generationsCount, profileCount);

    return totalGenerations + 1;
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
                id,
                role,
                company_name,
                business_description,
                expertise,
                tone,
                industry,
                target_audience,
                style_carousel
            )
        `)
        .eq('id', postId)
        .single();

    if (fetchError || !post) {
        console.error('[SingleGen] Post not found:', fetchError);
        return { success: false, error: 'Post not found' };
    }

    const profile = post.founder_profiles;

    // Fetch up to 5 recently liked posts as examples
    const { data: likedPosts } = await supabase
        .from('posts')
        .select('content, topic, format, platform')
        .eq('profile_id', profile.id)
        .eq('is_liked', true)
        .order('created_at', { ascending: false })
        .limit(5);

    const likedExamples = likedPosts || [];

    // ── CAROUSEL BRANCH ──
    if (post.format === 'carousel') {
        try {
            console.log(`[SingleGen] Generating CAROUSEL for post ${postId}`);
            const { slides, styleId } = await generateCarouselSlides({
                topic: post.topic || 'Industry insight',
                styleId: profile.style_carousel || 'minimal-stone', // Use user's preferred style
                userContext: {
                    industry: profile.industry,
                    targetAudience: profile.target_audience,
                    role: profile.role,
                    companyName: profile.company_name,
                },
            });

            // Update post with carousel data
            await supabase
                .from('posts')
                .update({
                    content: `📊 Carousel: ${post.topic || 'Industry Insight'} (${slides.length} slides)`,
                    carousel_slides: slides,
                    carousel_style: styleId,
                    status: 'scheduled',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', postId);

            return { success: true, content: `Carousel generated with ${slides.length} slides` };
        } catch (error) {
            console.error('[SingleGen] Carousel generation error:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Carousel generation failed' };
        }
    }

    // ── TEXT POST BRANCH ──
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

${likedExamples.length > 0 ? `PAST SUCCESSFUL POSTS (Emulate this style, structure, and tone):
${likedExamples.map((ex, i) => `EXAMPLE ${i + 1} (${ex.platform} / ${ex.format}):
"${ex.content}"`).join('\n\n')}` : ''}

${post.is_liked ? `Note: User liked this post's topic/format enough to toggle specific feedback. Maintain this high standard.` : ''}

CONSTRAINTS:
${post.platform === 'x' ? '- No Hashtags' : '- Professional formatting'}
${post.platform === 'linkedin'
            ? (post.format === 'long_form' ? '- Length: 1500-2000 chars (Deep dive and structured thinking)' : '- Length: 800-1200 chars (Professional story or insight)')
            : (post.format === 'long_form' ? '- Length: 1000-1500 chars (Deep dive and structured thinking)' : '- Length: Max 280 chars (Punchy and sharp)')}
- Start with a strong hook
- Be concise and authoritative

Return ONLY a JSON object:
{
    "content": "The post text",
    "hooks": ["Alternative hook 1", "Alternative hook 2"],
    "cta": "Call to action"
}`;

    // Call AI
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

        const parsed = robustJsonParse(result.content);
        const finalContent = (parsed.content || 'Failed to generate content').replace(/NaN$/, '').trim();

        // Update Post
        await supabase
            .from('posts')
            .update({
                content: finalContent,
                hooks: parsed.hooks || [],
                cta: parsed.cta || null,
                status: 'scheduled',
                updated_at: new Date().toISOString()
            })
            .eq('id', postId);

        return { success: true, content: finalContent };

    } catch (error) {
        console.error('[SingleGen] AI Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Generation failed' };
    }
}
