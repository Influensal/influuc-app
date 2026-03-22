import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/ai/providers';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { parseTier, getTierLimits, canGenerateIdea } from '@/lib/subscription';

export const runtime = 'nodejs';

interface GenerateIdeaRequest {
    idea: string;
    platforms: ('x' | 'linkedin')[];
    history?: {
        role: 'user' | 'assistant';
        content?: string;
        platformOutputs?: GeneratedContent[];
    }[];
    userContext?: {
        industry?: string;
        targetAudience?: string;
        tone?: {
            formality?: string;
            boldness?: string;
            style?: string;
        };
    };
}

interface GeneratedContent {
    platform: 'x' | 'linkedin';
    content: string;
    format: string;
}

const PLATFORM_FORMATS: Record<string, { format: string; maxLength: number; style: string }> = {
    x: {
        format: 'Single Post or Thread',
        maxLength: 280,
        style: 'Punchy, provocative, concise. Use line breaks for emphasis. No hashtags unless necessary.',
    },
    linkedin: {
        format: 'Long-form Post',
        maxLength: 3000,
        style: 'Professional yet conversational. Shortform: ~800 chars. Longform: 1500-2000 chars. Start with a hook. Use numbered lists or bullet points. End with a question or CTA.',
    },
};

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value },
                set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
                remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options }) },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body: GenerateIdeaRequest = await request.json();

        // Get user profile to check tier
        const { data: profile } = await supabase
            .from('founder_profiles')
            .select('id, subscription_tier')
            .eq('account_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const tier = parseTier(profile.subscription_tier);
        const limits = getTierLimits(tier);

        // Check ideation limit for Starter tier
        if (tier === 'starter') {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { count, error: countError } = await supabase
                .from('spontaneous_ideas')
                .select('*', { count: 'exact', head: true })
                .eq('profile_id', profile.id)
                .gte('created_at', startOfMonth.toISOString());

            if (!canGenerateIdea(tier, count || 0).allowed) {
                return NextResponse.json(
                    { 
                        error: 'Monthly ideation limit reached', 
                        code: 'LIMIT_EXCEEDED',
                        limit: limits.ideasPerMonth,
                        usage: count
                    },
                    { status: 403 }
                );
            }
        }

        if (!body.idea || !body.idea.trim()) {
            return NextResponse.json(
                { error: 'Idea is required' },
                { status: 400 }
            );
        }

        const platforms = body.platforms?.length > 0 ? body.platforms : ['x', 'linkedin'];
        const provider = await getProvider();

        // Check if provider is configured
        if (!provider.isConfigured()) {
            return NextResponse.json(
                { error: 'AI provider is not configured. Please add your API key.' },
                { status: 500 }
            );
        }

        const generatedContent: GeneratedContent[] = [];

        // Generate content for each platform
        for (const platform of platforms) {
            const platformConfig = PLATFORM_FORMATS[platform];

            const systemPrompt = buildSystemPrompt(platform, platformConfig, body.userContext);
            const userPrompt = buildUserPrompt(body.idea, platform, platformConfig);

            const aiMessages = [{ role: 'system', content: systemPrompt }];

            // Append history if provided
            if (body.history && Array.isArray(body.history)) {
                body.history.forEach((msg) => {
                    if (msg.role === 'user' && msg.content) {
                        aiMessages.push({ role: 'user', content: msg.content });
                    } else if (msg.role === 'assistant') {
                        // For the assistant's previous responses, we want to summarize them or pass them as context
                        // Best is to pass the generated content back as an assistant message
                        if (msg.platformOutputs && msg.platformOutputs.length > 0) {
                            const combinedOutputs = msg.platformOutputs
                                .map((out) => `[${out.platform.toUpperCase()} POST]:\n${out.content}`)
                                .join('\n\n');
                            aiMessages.push({ role: 'assistant', content: combinedOutputs });
                        } else if (msg.content) {
                            aiMessages.push({ role: 'assistant', content: msg.content });
                        }
                    }
                });
            }

            aiMessages.push({ role: 'user', content: userPrompt });

            const result = await provider.complete({
                messages: aiMessages as any,
                temperature: 0.7,
                maxTokens: 1500,
            });

            generatedContent.push({
                platform: platform as 'x' | 'linkedin',
                content: result.content.trim(),
                format: platformConfig.format,
            });
        }

        return NextResponse.json({ content: generatedContent });
    } catch (error) {
        console.error('Error generating idea:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate content' },
            { status: 500 }
        );
    }
}

function buildSystemPrompt(
    platform: string,
    config: { format: string; maxLength: number; style: string },
    userContext?: GenerateIdeaRequest['userContext']
): string {
    let prompt = `You are an expert ghostwriter for founders and entrepreneurs. You write viral, engaging social media content that sounds authentically human—never corporate or AI-generated.

PLATFORM: ${platform.toUpperCase()}
FORMAT: ${config.format}
MAX LENGTH: ${config.maxLength} characters
STYLE GUIDELINES: ${config.style}

WRITING RULES:
1. Never use phrases like "game-changer", "leverage", "synergy", or other corporate buzzwords.
2. Write in first person. Be opinionated. Take a stance.
3. Start with a hook that stops the scroll.
4. Use short paragraphs and line breaks for readability.
5. End with engagement: a question, a challenge, or a call to reflect.
6. Sound like a real person sharing genuine insights, not a marketing team.`;

    if (userContext) {
        if (userContext.industry) {
            prompt += `\n\nINDUSTRY CONTEXT: The writer works in ${userContext.industry}.`;
        }
        if (userContext.targetAudience) {
            prompt += `\nTARGET AUDIENCE: ${userContext.targetAudience}`;
        }
        if (userContext.tone) {
            prompt += `\nTONE: ${userContext.tone.formality || 'professional-casual'}, ${userContext.tone.boldness || 'bold'}, ${userContext.tone.style || 'conversational'}`;
        }
    }

    return prompt;
}

function buildUserPrompt(
    idea: string,
    platform: string,
    config: { format: string; maxLength: number; style: string }
): string {
    return `Transform this idea into a ${platform.toUpperCase()} post:

IDEA: "${idea}"

Write the complete post. Do not include any preamble, explanations, or meta-commentary. Just output the post content itself, ready to copy and paste.`;
}
