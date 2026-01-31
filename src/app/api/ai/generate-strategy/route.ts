import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/ai/providers';

export const runtime = 'nodejs';

// Fixed 12 posts per week (6 per platform)
const POSTS_PER_WEEK = 12;

interface GenerateStrategyRequest {
    platforms: ('x' | 'linkedin')[];
    userContext?: {
        industry?: string;
        targetAudience?: string;
        contentGoal?: string;
        topics?: string[];
        archetype?: 'builder' | 'teacher' | 'contrarian' | 'executive' | 'custom';
        tone?: {
            formality?: string;
            boldness?: string;
            style?: string;
            approach?: string;
        };
    };
}

interface ScheduledPost {
    day: string;
    platform: 'x' | 'linkedin';
    format: 'single' | 'thread' | 'long_form' | 'video_script';
    topic: string;
    time: string;
}

interface WeeklyStrategy {
    posts: ScheduledPost[];
    themes: string[];
    notes: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: GenerateStrategyRequest = await request.json();

        const platforms = body.platforms?.length > 0 ? body.platforms : ['linkedin', 'x'];
        const provider = await getProvider();

        if (!provider.isConfigured()) {
            return NextResponse.json(
                { error: 'AI provider is not configured. Please add your API key.' },
                { status: 500 }
            );
        }

        const systemPrompt = buildSystemPrompt(platforms, body.userContext);
        const userPrompt = buildUserPrompt(platforms);

        const result = await provider.complete({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.8,
            maxTokens: 3000,
        });

        // Parse the JSON response
        let strategy: WeeklyStrategy;
        try {
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                strategy = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Could not parse strategy response');
            }
        } catch {
            // Fallback strategy if parsing fails
            strategy = {
                posts: generateFallbackPosts(platforms),
                themes: ['Industry Insights', 'Personal Journey', 'Lessons Learned'],
                notes: 'Generated fallback strategy. AI response could not be parsed.',
            };
        }

        return NextResponse.json({ strategy });
    } catch (error) {
        console.error('Error generating strategy:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate strategy' },
            { status: 500 }
        );
    }
}

function buildSystemPrompt(
    platforms: string[],
    userContext?: GenerateStrategyRequest['userContext']
): string {
    let prompt = `You are an expert content strategist for founders and entrepreneurs. You create weekly content calendars that build thought leadership and drive engagement.

TASK: Generate a weekly content strategy.
PLATFORMS: ${platforms.join(', ').toUpperCase()}
NUMBER OF POSTS: ${POSTS_PER_WEEK} (6 per platform)

STRATEGY PRINCIPLES:
1. Mix content formats: threads, single posts, long-form, video scripts
2. Balance between educational, personal story, and opinion/hot-take content
3. Spread posts across the week for consistent presence
4. Consider platform-specific best practices (LinkedIn loves long-form; X loves threads and hot takes)
5. Each post should have a clear angle or hook

OUTPUT FORMAT (JSON):
{
    "posts": [
        {
            "day": "Monday",
            "platform": "linkedin",
            "format": "long_form",
            "topic": "Specific topic/angle for this post",
            "time": "10:00 AM"
        }
    ],
    "themes": ["Theme 1", "Theme 2", "Theme 3"],
    "notes": "Brief strategy notes or tips for the week"
}`;

    if (userContext) {
        prompt += `\n\n--- USER CONTEXT ---`;
        if (userContext.industry) {
            prompt += `\nINDUSTRY: ${userContext.industry}`;
        }
        if (userContext.targetAudience) {
            prompt += `\nTARGET AUDIENCE: ${userContext.targetAudience}`;
        }
        if (userContext.contentGoal) {
            prompt += `\nCONTENT GOAL: ${userContext.contentGoal}`;
        }
        if (userContext.topics && userContext.topics.length > 0) {
            prompt += `\nPREFERRED TOPICS: ${userContext.topics.join(', ')}`;
        }
        if (userContext.archetype) {
            prompt += `\nCONTENT ARCHETYPE: ${userContext.archetype.toUpperCase()}`;
        }
    }

    return prompt;
}

function buildUserPrompt(platforms: string[]): string {
    return `Generate a weekly content strategy for ${platforms.join(' and ')} with ${POSTS_PER_WEEK} posts total.

Create a diverse mix of formats and topics. Output ONLY the JSON object, no other text.`;
}

function generateFallbackPosts(platforms: string[]): ScheduledPost[] {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const formats: ('single' | 'thread' | 'long_form')[] = ['single', 'thread', 'long_form'];
    const topics = [
        'Industry insight or trend analysis',
        'Personal lesson from building',
        'Hot take on common practice',
        'Behind-the-scenes look',
        'Advice for early-stage founders',
        'Tool or resource recommendation',
    ];

    const posts: ScheduledPost[] = [];
    for (let i = 0; i < POSTS_PER_WEEK; i++) {
        posts.push({
            day: days[i % days.length],
            platform: platforms[i % platforms.length] as 'x' | 'linkedin',
            format: formats[i % formats.length],
            topic: topics[i % topics.length],
            time: i % 2 === 0 ? '10:00 AM' : '2:00 PM',
        });
    }
    return posts;
}
