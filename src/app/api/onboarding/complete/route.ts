import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getProvider } from '@/lib/ai/providers';
import { scrapeWebsite, extractBusinessSummary } from '@/lib/scraper';
import { getCarouselStyle, getDefaultStyle } from '@/lib/ai/carousel-styles';
import { compileStrategyBrief, detectArchetypeFromDiscovery, buildMasterOnboardingPrompt } from '@/lib/ai/strategy-brief';
import dJSON from 'dirty-json';

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

    // Context Fields
    aboutYou: string;
    personalContext: Array<{ type: string; label: string; value: string }>;
    productContext: Array<{ type: string; label: string; value: string }>;

    // Legacy support
    businessDescription?: string;
    expertise: string;

    contentGoal: string;
    topics: string[];

    // Strategic Foundation (NEW)
    archetypeDiscovery: {
        q1: string;
        q2: string;
        q3: string;
    };
    positioningStatement: string;
    povStatement: string;
    identityGap: string;
    limitingBelief?: string;
    weeklyThroughline?: string;
    competitors: string[];
    contentPillars: {
        name: string;
        description: string;
        job: 'authority' | 'relatability' | 'proof';
    }[];

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

    // Subscription & Visuals
    subscriptionTier?: 'starter' | 'creator' | 'authority';
    visualMode?: 'none' | 'faceless' | 'clone';
    style_faceless?: string;
    style_carousel?: string;
    style_face?: string;
    avatar_urls?: string[];

    // Brand Kit
    brandColors?: {
        primary: string;
        background: string;
        accent: string;
    };
}

interface ScheduledPost {
    day: string;
    platform: 'x' | 'linkedin';
    format: 'single' | 'long_form' | 'video_script' | 'long' | 'short';
    topic: string;
    time: string;
    pillar?: string;
    hook_type?: string;
}

interface CarouselIdea {
    day: string;
    topic: string;
    pillar?: string;
    hook_type?: string;
    slide_count?: number;
}

interface GeneratedPost {
    content: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: OnboardingData = await request.json();

        // Validate required fields
        if (!body.industry || !body.contentGoal || !body.aboutYou) {
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

        // === STRATEGIC FOUNDATION PROCESSING ===

        // Step A: Detect archetype from discovery answers
        let archetypeResult: { primary: string; secondary: string; flavor: string } = { primary: body.archetype || 'builder', secondary: 'teacher', flavor: '' };
        if (body.archetypeDiscovery?.q1 && body.archetypeDiscovery?.q2 && body.archetypeDiscovery?.q3) {
            archetypeResult = detectArchetypeFromDiscovery(
                body.archetypeDiscovery.q1,
                body.archetypeDiscovery.q2,
                body.archetypeDiscovery.q3
            );
            body.archetype = archetypeResult.primary as any;
            console.log(`[Onboarding] Detected archetype: ${archetypeResult.primary} / ${archetypeResult.secondary}`);
        }

        const validCompetitors = (body.competitors || []).filter((c: string) => c.trim() !== '');

        // === MASTER STRATEGY & CONTENT GENERATION (REQUEST 1 of 2) ===
        console.log('[Onboarding] Triggering Master Strategy & Content Generation...');
        const masterPrompt = buildMasterOnboardingPrompt(body, archetypeResult, selectedPlatforms);

        let masterResult: any;
        try {
            const aiResponse = await provider.complete({
                messages: [
                    {
                        role: 'system',
                        content: masterPrompt,
                        cache_control: { type: 'ephemeral' }
                    },
                    { role: 'user', content: 'Generate my brand strategy and weekly content plan. Do NOT write the actual post content yet—just the topics, hooks, and day-by-day calendar.' }
                ],
                temperature: 0.7,
                responseFormat: { type: 'json_object' },
                maxTokens: 16384 // Increased from 8192 to prevent truncation
            });
            const cleanContent = extractJson(aiResponse.content);
            console.log('[Onboarding] Master generation response length:', cleanContent.length);
            console.log('[Onboarding] Master generation start:', cleanContent.substring(0, 100));
            console.log('[Onboarding] Master generation end:', cleanContent.substring(cleanContent.length - 100));

            try {
                masterResult = robustJsonParse(cleanContent);
            } catch (parseError: any) {
                console.error('[Onboarding] JSON Parsing failed. Error:', parseError.message);
                console.error('[Onboarding] Content suspected to be problematic:', cleanContent);
                throw new Error(`Failed to parse strategy. The AI response was ${cleanContent.length} characters long and may have been truncated or misformatted.`);
            }
            console.log('[Onboarding] Master generation complete');
        } catch (e: any) {
            console.error('[Onboarding] Master generation failed:', e);
            throw new Error(`Failed to generate brand strategy: ${e.message}`);
        }

        // Map results back to local variables for compatibility
        const voiceAnalysis = masterResult.voice_analysis || {};
        const competitorAnalysis = masterResult.competitor_analysis || {};
        const foundation = masterResult.foundation || {};
        const strategy = masterResult.calendar || { posts: [], carousels: [] };

        // Back-fill body for SaveToSupabase and Strategy Brief compilation
        body.positioningStatement = body.positioningStatement || foundation.positioning_statement;
        body.povStatement = body.povStatement || foundation.pov_statement;
        body.identityGap = body.identityGap || foundation.identity_gap;
        body.limitingBelief = body.limitingBelief || foundation.limiting_belief;
        body.weeklyThroughline = masterResult.weekly_throughline;
        body.contentPillars = (body.contentPillars && body.contentPillars.length > 0) ? body.contentPillars : foundation.content_pillars;

        // Compile Strategy Brief (using the new automated data)
        const strategyBrief = compileStrategyBrief(
            {
                name: body.name,
                role: body.role,
                company_name: body.companyName,
                business_description: body.businessDescription || body.aboutYou,
                industry: body.industry,
                content_goal: body.contentGoal,
                target_audience: body.targetAudience,
                archetype_primary: archetypeResult.primary,
                archetype_secondary: archetypeResult.secondary,
                archetype_flavor: archetypeResult.flavor,
                positioning_statement: body.positioningStatement,
                pov_statement: body.povStatement,
                identity_gap: body.identityGap,
                competitor_context: {
                    names: validCompetitors,
                    shared_patterns: competitorAnalysis.shared_patterns,
                    whitespace: competitorAnalysis.whitespace,
                },
                content_pillars: body.contentPillars,
                voice_analysis: voiceAnalysis,
                personal_context: body.personalContext,
                product_context: body.productContext,
                topics: body.topics,
                tone: body.tone,
                limiting_belief: body.limitingBelief,
                weekly_throughline: body.weeklyThroughline,
            },
            body.voiceSamples
        );

        // Attach processed data to body for saveToSupabase
        (body as any)._archetypeResult = archetypeResult;
        (body as any)._voiceAnalysis = voiceAnalysis;
        (body as any)._competitorAnalysis = competitorAnalysis;
        (body as any)._strategyBrief = strategyBrief;

        // === CONTENT GENERATION (REQUESTS 2 & 3 in parallel) ===
        console.log('[Onboarding] Generating all content (text + carousels)...');
        const [posts, carousels] = await Promise.all([
            generatePostsBatched(strategy.posts, body, strategyBrief),
            generateCarousels(strategy.carousels || [], body),
        ]);

        console.log(`[Onboarding] Generated ${posts.length} text posts, ${carousels.length} carousels`);

        // Step 3: Save to Supabase
        console.log('[Onboarding] Saving profile and posts to Supabase...');
        let profileId: string | null = null;

        if (isSupabaseConfigured() && user) {
            profileId = await saveToSupabase(supabase, user.id, body, posts, carousels);
        } else {
            console.log('[Onboarding] Supabase not configured or no user (mock mode), skipping save');
            profileId = 'mock-profile-id';
        }

        return NextResponse.json({
            success: true,
            profileId,
            postsCount: posts.length,
            carouselsCount: carousels.length,
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


async function generatePostsBatched(
    schedule: ScheduledPost[],
    data: OnboardingData,
    strategyBrief: string
): Promise<Array<ScheduledPost & GeneratedPost>> {
    const provider = await getProvider();

    const generateBatch = async (batchSchedule: ScheduledPost[]): Promise<GeneratedPost[]> => {
        if (batchSchedule.length === 0) return [];

        const count = batchSchedule.length;
        const systemPrompt = `You are an elite ghostwriter for top founders. You write conviction, not content. Every post must sound like a real operator speaking to intelligent peers from lived experience. Never theory. Never generic. Never AI.

---

PERSONA — NON-NEGOTIABLE
Archetype: ${data.archetype.toUpperCase()}
Description: ${getArchetypeDesc(data.archetype)}

Tone, cadence, confidence, and worldview must match this archetype exactly. A Builder sounds nothing like a Teacher. A Contrarian sounds nothing like an Executive. If the voice feels off — rewrite until it doesn't.

---

VOICE SAMPLES — MIMIC THE SOUL, NEVER COPY THE WORDS
${data.voiceSamples.map((s, i) => `Sample ${i + 1}: ${s.content}`).join('\n\n')}

Before writing anything, extract:
- Sentence length and rhythm — short and punchy or long and deliberate?
- How they open — statement, fact, or contrast?
- How they close — provocation, directive, or silence?
- What they never say — filler, hedging, corporate softness
- Their confidence signature — where does the certainty come from?

Every post must pass this test: could this have come from the voice samples? If no — rewrite.

---

STRATEGY PLAYBOOK — EVERY WORD MUST SERVE THIS
${strategyBrief}

Before writing a single post, internalize:
- POV: every post moves the reader one step closer to agreeing with this belief
- Identity Gap: every post makes the reader feel one step closer to who they want to become
- Limiting Belief: at least one post this batch makes this belief harder to hold
- Competitor Whitespace: no post could have been written by any named competitor
- Pillars: every post serves one pillar — authority, relatability, or proof. Never two. Never none.

---

---

PLATFORM CONSTRAINTS

X:
- Short: hard max 280 characters. One idea. One punch. No setup.
- Long: 1,800–2,400 characters. No threads. One continuous post.

LinkedIn:
- Short: 800–1,200 characters. Punchy. Line breaks every 1-2 sentences.
- Long: 2,500–3,200 characters. Narrative weight. Every word earns its place.

---

POST STRUCTURES — VARY ACROSS THE BATCH, NEVER REPEAT CONSECUTIVELY

1. NARRATIVE STORY
Open with the moment — conflict, decision, or realization. Show the process. End with the lesson. Never summarize. Let the story land on its own.

2. ATOMIC ESSAY
Hook line. 3-5 tight paragraphs, each earning the next. Final sentence reframes everything above it.

3. SPIKY POV
Name the wrong belief. Challenge it directly. Give the superior alternative with a specific mechanism behind it. Never hedge. Never qualify.

4. TACTICAL BREAKDOWN
A specific how-to grounded in real process. Steps that are actually usable — not obvious. Closes with the insight behind the tactic, not just the tactic.

5. CONTRAST FRAME
Two worlds. Wrong way and right way. Before and after. Show both. Let the contrast do the work without explaining it.

---

HOOK RULES — EVERY POST, NO EXCEPTIONS

- First line is the hook. Nothing before it.
- Never start with "I", "We", "Today", "Here's", or "Did you know"
- Never open with context — open with the conclusion, the provocation, or the result
- The hook must stop the scroll before the reader knows what the post is about
- Hook types assigned in the content plan:
  — Contrarian: names a belief and immediately breaks it
  — Identity Challenge: mirror between who they are and who they want to be
  — Curiosity Gap: withholds just enough to pull them into the next line
  — Specific Result: leads with the outcome, makes them ask how

---

QUALITY GATES — RUN ON EVERY POST BEFORE OUTPUTTING

1. Does this sound like ${data.name} or does it sound like AI?
2. Could any named competitor have written this? If yes — it is not differentiated enough.
3. Does it serve exactly one pillar?
4. Does the hook stop the scroll before they know what the post is about?
5. Does it contribute to the weekly throughline?
6. Would the target audience feel this was written specifically for them?

Fail more than one gate — discard and regenerate from scratch. Never patch bad writing.

---

OUTPUT: STRICT JSON ONLY
No explanation. No markdown. No text outside the JSON.

{
  "posts": [
    {
      "platform": "x",
      "format": "long",
      "pillar": "authority",
      "hook_type": "contrarian",
      "structure": "spiky_pov",
      "content": "Full post content here"
    }
  ]
}

Exactly ${count} posts. No titles. No hashtags unless present in voice samples. No emojis unless present in voice samples.

---

CONTENT PLAN — WRITE FOR THESE SPECIFIC TOPICS (MANDATORY)
${JSON.stringify(batchSchedule.map(p => ({ day: p.day, platform: p.platform, topic: p.topic, length: p.format, pillar: p.pillar, hook_type: p.hook_type })), null, 2)}

For each post:
- Match the assigned pillar
- Use the assigned hook type
- Honor the weekly throughline — every post is a chapter of one idea from a different angle`;

        try {
            console.log(`[Batch] Generating ${count} posts...`);
            const result = await provider.complete({
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                        cache_control: { type: 'ephemeral' }
                    },
                    { role: 'user', content: 'Generate the posts according to the content plan.' }
                ],
                temperature: 0.4,
                maxTokens: 8192,
                responseFormat: { type: 'json_object' },
            });

            const cleanContent = extractJson(result.content);
            let parsed;
            try {
                parsed = robustJsonParse(cleanContent);
            } catch (err) {
                console.error('[Batch] Failed to parse JSON:', err);
                console.log('[Batch] Raw content that failed parse:', result.content);
                return [];
            }

            // Handle both { "posts": [...] } and direct [...] formats
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.posts)) {
                return parsed.posts;
            }

            console.warn('[Batch] Unexpected JSON structure:', parsed);
            return [];
        } catch (e) {
            console.error('[Batch] Generation failed:', e);
            throw e;
        }
    };

    // Split into chunks of 3 to prevent truncation and improve quality
    const CHUNK_SIZE = 3;
    const allGeneratedPosts: any[] = [];

    for (let i = 0; i < schedule.length; i += CHUNK_SIZE) {
        const chunk = schedule.slice(i, i + CHUNK_SIZE);
        const batchResults = await generateBatch(chunk);
        allGeneratedPosts.push(...batchResults);
    }

    return schedule.map((item, i) => {
        const gen = allGeneratedPosts[i];
        return {
            ...item,
            content: gen?.content || 'Content generation failed (likely truncation or parse error).'
        };
    });
}

function robustJsonParse(jsonStr: string): any {
    try {
        return JSON.parse(jsonStr);
    } catch (e1) {
        const fixedContent = jsonStr
            .replace(/(?<="[^"]*?)\n(?=[^"]*?")/g, '\\n')
            .replace(/(?<="[^"]*?)\t(?=[^"]*?")/g, '\\t');
        try {
            return JSON.parse(fixedContent);
        } catch (e2) {
            try {
                return dJSON.parse(jsonStr);
            } catch (e3) {
                throw new Error('All JSON parse attempts failed: ' + (e3 as Error).message);
            }
        }
    }
}

function extractJson(text: string): string {
    try {
        // Remove code fences and leading/trailing whitespace
        let cleaned = text.replace(/```json\n?|\n?```/g, '').trim();

        // Try to find an array first (as it's often used for lists)
        const arrayStart = cleaned.indexOf('[');
        const arrayEnd = cleaned.lastIndexOf(']');

        // Then try to find an object
        const objectStart = cleaned.indexOf('{');
        const objectEnd = cleaned.lastIndexOf('}');

        // Determine which one to use (prioritize the outer structure)
        let start = -1;
        let end = -1;

        if (arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)) {
            start = arrayStart;
            end = arrayEnd;
        } else if (objectStart !== -1) {
            start = objectStart;
            end = objectEnd;
        }

        if (start === -1) {
            console.warn('[extractJson] No JSON structures ([ or {) found in text');
            return text;
        }

        if (end > start) {
            cleaned = cleaned.substring(start, end + 1);
        } else {
            cleaned = cleaned.substring(start);
        }

        // Smart quotes → normal quotes
        cleaned = cleaned.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

        // Fix: Double double-quote issue seen in logs (""posts")
        cleaned = cleaned.replace(/""(posts|carousels|primary|background|accent)":/g, '"$1":');

        // Strip control chars except newline/tab
        cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (ch: string) =>
            ch === '\n' || ch === '\t' ? ch : ''
        );

        // Fix trailing commas before } or ]
        cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

        return cleaned;
    } catch (e) {
        console.error('[extractJson] Error during cleaning:', e);
        return text;
    }
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

// ============================================
// CAROUSEL GENERATION
// ============================================

interface GeneratedCarousel {
    day: string;
    topic: string;
    slides: string[];
    styleId: string;
}

async function generateCarousels(
    carouselIdeas: CarouselIdea[],
    data: OnboardingData
): Promise<GeneratedCarousel[]> {
    if (carouselIdeas.length === 0) {
        console.log('[Carousels] No carousel ideas, skipping.');
        return [];
    }

    const provider = await getProvider();
    const carouselStyleId = data.style_carousel || 'minimal-stone';
    const style = getCarouselStyle(carouselStyleId) || getDefaultStyle();

    if (!style || !style.prompt) {
        console.warn('[Carousels] No carousel style found, skipping.');
        return [];
    }

    // Determine slide counts per carousel
    const carouselSpecs = carouselIdeas.map((c, i) => {
        const numberMatch = c.topic.match(
            /\b(top\s*)?(\d+)\s*(things?|tips?|ways?|habits?|books?|tools?|ideas?|steps?|reasons?|secrets?|hacks?|strategies?|mistakes?|rules?|principles?|lessons?|facts?|myths?)?/i
        );
        let slideCount = 6;
        if (numberMatch && numberMatch[2]) {
            const n = parseInt(numberMatch[2], 10);
            if (n >= 3 && n <= 10) slideCount = n + 2; // title + n items + CTA
        }
        return { index: i, topic: c.topic, day: c.day, slideCount };
    });

    const brandColors = data.brandColors || {
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
    systemPrompt += `\n\nMULTI-CAROUSEL INSTRUCTIONS:\nYou must generate ${carouselIdeas.length} separate carousels in one response.\n`;
    systemPrompt += carouselSpecs.map(c =>
        `Carousel ${c.index}: "${c.topic}" — ${c.slideCount} slides`
    ).join('\n');
    systemPrompt += `\n\nReturn ONLY a valid JSON object:\n{\n  "carousels": [\n    {\n      "index": 0,\n      "slides": ["<div>...</div>", "<div>...</div>"]\n    }\n  ]\n}\n\nEach carousel must have exactly the specified number of slides.`;

    const userMessage = carouselSpecs.map(c =>
        `Carousel ${c.index}: "${c.topic}" — ${c.slideCount} slides`
    ).join('\n');

    try {
        console.log(`[Carousels] Generating ${carouselIdeas.length} carousels in a single request...`);
        const result = await provider.complete({
            messages: [
                {
                    role: 'system',
                    content: systemPrompt,
                    cache_control: { type: 'ephemeral' }
                },
                { role: 'user', content: `Create these carousels:\n${userMessage}` }
            ],
            temperature: 0.7,
            maxTokens: 16384,
            responseFormat: { type: 'json_object' },
        });

        // Parse response
        const jsonStr = extractJson(result.content);
        let data_parsed: any;

        try {
            data_parsed = robustJsonParse(jsonStr);
        } catch (err) {
            console.error('[Carousels] All JSON parse attempts failed.', err);
            throw err;
        }

        const generatedCarousels: Array<{ index: number; slides: string[] }> = data_parsed.carousels || [];

        const results: GeneratedCarousel[] = [];
        for (let i = 0; i < carouselIdeas.length; i++) {
            const generated = generatedCarousels.find(c => c.index === i) || generatedCarousels[i];
            if (generated?.slides && generated.slides.length > 0) {
                results.push({
                    day: carouselIdeas[i].day,
                    topic: carouselIdeas[i].topic,
                    slides: generated.slides,
                    styleId: carouselStyleId,
                });
            } else {
                console.warn(`[Carousels] Carousel ${i} missing slides, skipping`);
            }
        }

        console.log(`[Carousels] Successfully generated ${results.length} carousels`);
        return results;

    } catch (e) {
        console.error('[Carousels] Generation failed:', e);
        return []; // Non-fatal — text posts still saved
    }
}

// ============================================
// SAVE TO SUPABASE
// ============================================

async function saveToSupabase(
    supabase: any,
    userId: string,
    data: OnboardingData,
    posts: Array<ScheduledPost & GeneratedPost>,
    carousels: GeneratedCarousel[] = []
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
                weekly_goal: data.contentGoal,
                topics: data.topics,
                // cadence: 'moderate', // Removed from frontend, default
                tone: data.tone, // Mapping tone object (maybe update this later to include archetype)
                // We should probably save archetype in metadata or repurpose a column, but for now let's stick to existing
                role: data.role,
                company_name: data.companyName,
                brand_colors: data.brandColors || {
                    primary: '#000000',
                    background: '#ffffff',
                    accent: '#000000'
                },
                // we'd probably save these too if we had columns for them, but legacy DB might not have them.
                // assuming migration was run to add brand_colors
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

                // Strategy Fields (NEW)
                archetype_primary: (data as any)._archetypeResult?.primary || data.archetype,
                archetype_secondary: (data as any)._archetypeResult?.secondary || null,
                archetype_flavor: (data as any)._archetypeResult?.flavor || null,
                archetype_discovery: data.archetypeDiscovery || null,
                positioning_statement: data.positioningStatement || null,
                pov_statement: data.povStatement || null,
                identity_gap: data.identityGap || null,
                competitor_context: {
                    names: (data.competitors || []).filter((c: string) => c.trim() !== ''),
                    analysis: (data as any)._competitorAnalysis || null,
                },
                content_pillars: data.contentPillars || null,
                voice_analysis: (data as any)._voiceAnalysis || null,
                strategy_brief: (data as any)._strategyBrief || null,

                // Pricing & Visuals
                subscription_tier: data.subscriptionTier || 'starter',
                visual_mode: data.visualMode || 'none',
                style_faceless: data.style_faceless,
                style_carousel: data.style_carousel,
                style_face: data.style_face,
                avatar_urls: data.avatar_urls,
                visual_training_status: data.avatar_urls && data.avatar_urls.length > 0 ? 'completed' : 'not_started',
                visual_lora_id: data.avatar_urls && data.avatar_urls.length > 0 ? data.avatar_urls[0] : null,
                onboarding_status: 'complete',
                onboarding_step: 10,
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
                weekly_goal: data.contentGoal,
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
                generation_count: 1,
                timezone: 'UTC',

                // Strategy Fields (NEW)
                archetype_primary: (data as any)._archetypeResult?.primary || data.archetype,
                archetype_secondary: (data as any)._archetypeResult?.secondary || null,
                archetype_flavor: (data as any)._archetypeResult?.flavor || null,
                archetype_discovery: data.archetypeDiscovery || null,
                positioning_statement: data.positioningStatement || null,
                pov_statement: data.povStatement || null,
                identity_gap: data.identityGap || null,
                competitor_context: {
                    names: (data.competitors || []).filter((c: string) => c.trim() !== ''),
                    analysis: (data as any)._competitorAnalysis || null,
                },
                content_pillars: data.contentPillars || null,
                voice_analysis: (data as any)._voiceAnalysis || null,
                strategy_brief: (data as any)._strategyBrief || null,

                // Pricing & Visuals
                subscription_tier: data.subscriptionTier || 'starter',
                visual_mode: data.visualMode || 'none',
                style_faceless: data.style_faceless,
                style_carousel: data.style_carousel,
                style_face: data.style_face,
                avatar_urls: data.avatar_urls,
                visual_training_status: data.avatar_urls && data.avatar_urls.length > 0 ? 'completed' : 'not_started',
                visual_lora_id: data.avatar_urls && data.avatar_urls.length > 0 ? data.avatar_urls[0] : null,
                onboarding_status: 'complete',
                onboarding_step: 10,
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

    const validFormats = ['single', 'thread', 'long_form', 'video_script', 'long', 'short'];
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
        if (format === 'long') format = 'long_form';
        if (format === 'short') format = 'single';
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

    // Batch insert text posts
    if (postsData.length > 0) {
        console.log(`[Onboarding] Inserting ${postsData.length} text posts to Supabase...`);
        const { error: postsError } = await supabase
            .from('posts')
            .insert(postsData);

        if (postsError) {
            console.error('[Onboarding] Failed to save posts:', postsError);
            throw new Error(`Failed to save posts: ${postsError.message}`);
        }
        console.log('[Onboarding] Text posts saved successfully.');
    } else {
        console.warn('[Onboarding] No text posts generated to save.');
    }

    // Save carousels
    if (carousels.length > 0) {
        const today = new Date();
        const dayMapping: Record<string, number> = {
            'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
            'Thursday': 4, 'Friday': 5, 'Saturday': 6,
        };

        const carouselPostsData = carousels.map(carousel => {
            const targetDay = dayMapping[carousel.day] ?? 3; // Default to Wednesday
            const currentDay = today.getDay();
            let daysUntil = (targetDay - currentDay + 7) % 7;
            if (daysUntil === 0) daysUntil = 7;

            const scheduledDate = new Date(today);
            scheduledDate.setDate(today.getDate() + daysUntil);
            scheduledDate.setHours(20, 30, 0, 0);

            return {
                profile_id: profile.id,
                platform: 'linkedin',
                scheduled_date: scheduledDate.toISOString(),
                content: carousel.topic,
                format: 'carousel',
                status: 'scheduled',
                carousel_slides: carousel.slides,
                carousel_style: carousel.styleId,
            };
        });

        console.log(`[Onboarding] Inserting ${carouselPostsData.length} carousel posts to Supabase...`);
        const { error: carouselError } = await supabase
            .from('posts')
            .insert(carouselPostsData);

        if (carouselError) {
            console.error('[Onboarding] Failed to save carousels:', carouselError);
            // Non-fatal — text posts are already saved
        } else {
            console.log('[Onboarding] Carousel posts saved successfully.');
        }
    }

    return profile.id;
}
