import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getProvider } from '@/lib/ai/providers';
import { scrapeWebsite, extractBusinessSummary } from '@/lib/scraper';
import { compileStrategyBrief, detectArchetypeFromDiscovery, buildMasterOnboardingPrompt } from '@/lib/ai/strategy-brief';
import { generateAllContentBatch, robustJsonParse, UserProfile, GeneratedCarouselPost } from '@/lib/generation';
import { stripe } from '@/lib/stripe';
import { TIER_DB_FEATURES, createAdminSupabaseClient } from '@/lib/subscription';

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
    hooks?: string[];
    cta?: string | null;
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
            const cleanContent = aiResponse.content; // extractJson is now handled by robustJsonParse internally if needed
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

        // Attach processed data to body for SaveToSupabase
        (body as any)._archetypeResult = archetypeResult;
        (body as any)._voiceAnalysis = voiceAnalysis;
        (body as any)._competitorAnalysis = competitorAnalysis;
        (body as any)._strategyBrief = strategyBrief;

        // === CONTENT GENERATION (REPLICATED FROM WEEKLY PROVEN FLOW) ===
        console.log('[Onboarding] Generating all content (text + carousels) using proven single-call batching...');
        let posts: any[] = [];
        let carousels: GeneratedCarouselPost[] = [];
        
        try {
            // Map onboarding body to UserProfile for the shared generator
            const profileForGen: UserProfile = {
                id: 'onboarding-tmp-' + Date.now(),
                account_id: user?.id || 'anonymous',
                platforms: body.platforms,
                industry: body.industry,
                target_audience: body.targetAudience,
                content_goal: body.contentGoal,
                topics: body.topics,
                tone: {
                    formality: body.tone.formality,
                    boldness: body.tone.boldness,
                    style: body.tone.style,
                    approach: body.tone.approach
                },
                role: body.role,
                company_name: body.companyName,
                company_website: body.companyWebsite,
                business_description: body.businessDescription || '',
                expertise: body.expertise,
                auto_publish: body.autoPublish || false,
                timezone: 'UTC',
                strategy_brief: strategyBrief,
                content_pillars: body.contentPillars,
                positioning_statement: body.positioningStatement,
                pov_statement: body.povStatement,
                identity_gap: body.identityGap,
                archetype_primary: archetypeResult.primary,
                archetype_secondary: archetypeResult.secondary,
                archetype_flavor: archetypeResult.flavor,
                brand_colors: body.brandColors || { primary: '#10B981', background: '#09090B', accent: '#F59E0B' },
                style_carousel: body.style_carousel,
                voice_samples: body.voiceSamples,
                name: body.name,
                weekly_throughline: body.weeklyThroughline,
            };

            const genResult = await generateAllContentBatch(
                strategy.posts,
                strategy.carousels || [],
                profileForGen
            );
            
            posts = genResult.textPosts;
            carousels = genResult.carouselPosts;
            
        } catch (genErr) {
            console.error('[Onboarding] Critical error during batch generation:', genErr);
        }

        console.log(`[Onboarding] Result: ${posts.length} text posts, ${carousels.length} carousels`);

        // === SAFETY SYNC: Verify Stripe Payment if session ID is provided ===
        if ((body as any).stripeSessionId && user) {
            try {
                const sessionId = (body as any).stripeSessionId;
                console.log(`[Onboarding] Safety Sync: Verifying session ${sessionId}`);
                const session = await stripe.checkout.sessions.retrieve(sessionId);
                
                if (session.payment_status === 'paid' && session.subscription) {
                    const subscriptionId = session.subscription as string;
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    const tier = ((subscription as any).metadata?.tier || body.subscriptionTier || 'starter') as string;
                    
                    console.log(`[Onboarding] Safety Sync: Payment verified for tier ${tier}. Provisioning...`);
                    
                    // Manually trigger the subscription record creation (same logic as webhook)
                    const adminClient = createAdminSupabaseClient();
                    const features = TIER_DB_FEATURES[tier as keyof typeof TIER_DB_FEATURES] || TIER_DB_FEATURES.starter;

                    // 1. Upsert into subscriptions table
                    await adminClient.from('subscriptions').upsert({
                        account_id: user.id,
                        stripe_customer_id: session.customer as string,
                        stripe_subscription_id: subscriptionId,
                        plan: tier,
                        status: 'active',
                        current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
                        current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
                    }, { onConflict: 'account_id' });

                    // 2. Override the body tier to the one verified by Stripe
                    body.subscriptionTier = tier as any;
                    console.log(`[Onboarding] Safety Sync: Database updated for ${user.id}`);
                }
            } catch (syncError) {
                console.warn('[Onboarding] Safety Sync failed (non-critical):', syncError);
                // We continue anyway, letting the webhook system handle it eventually
            }
        }

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

async function saveToSupabase(
    supabase: any,
    userId: string,
    data: OnboardingData,
    posts: Array<ScheduledPost & GeneratedPost>,
    carousels: GeneratedCarouselPost[] = []
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
