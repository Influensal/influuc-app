import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/ai/providers';

export const runtime = 'nodejs';

interface GeneratePostRequest {
    topic: string;
    platform: 'x' | 'linkedin';
    format: 'single' | 'thread' | 'long_form' | 'video_script';
    userContext?: {
        industry?: string;
        targetAudience?: string;
        contentGoal?: string;
        tone?: {
            formality?: string;
            boldness?: string;
            style?: string;
            approach?: string;
        };
        voiceSamples?: string[];
    };
}

interface GeneratedPost {
    content: string;
    hooks: string[];
    cta: string | null;
    format: string;
}

const FORMAT_INSTRUCTIONS: Record<string, string> = {
    single: 'Write a single, standalone post. Keep it punchy and complete.',
    thread: 'Write a thread of 4-6 connected posts. Number each one. Each should be under 280 characters.',
    long_form: 'Write a long-form post with proper paragraphs, lists, and structure. Aim for 800-1500 characters.',
    video_script: 'Write a video script with: HOOK (first 3 seconds), TALKING POINTS (3-5 bullet points), CLOSING (call to action), and CAPTION.',
};

export async function POST(request: NextRequest) {
    try {
        const body: GeneratePostRequest = await request.json();

        if (!body.topic || !body.topic.trim()) {
            return NextResponse.json(
                { error: 'Topic is required' },
                { status: 400 }
            );
        }

        const provider = await getProvider();

        if (!provider.isConfigured()) {
            return NextResponse.json(
                { error: 'AI provider is not configured. Please add your API key.' },
                { status: 500 }
            );
        }

        const platform = body.platform || 'linkedin';
        const format = body.format || 'single';

        const systemPrompt = buildSystemPrompt(platform, format, body.userContext);
        const userPrompt = buildUserPrompt(body.topic, platform, format);

        const result = await provider.complete({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            maxTokens: 2000,
        });

        // Parse the response - expecting JSON format
        let parsedResponse: GeneratedPost;
        try {
            // Try to extract JSON from the response
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedResponse = JSON.parse(jsonMatch[0]);
            } else {
                // Fallback: treat the entire response as content
                parsedResponse = {
                    content: result.content.trim(),
                    hooks: [result.content.split('\n')[0]],
                    cta: null,
                    format: FORMAT_INSTRUCTIONS[format] || format,
                };
            }
        } catch {
            // If JSON parsing fails, treat as plain content
            parsedResponse = {
                content: result.content.trim(),
                hooks: [result.content.split('\n')[0]],
                cta: null,
                format: FORMAT_INSTRUCTIONS[format] || format,
            };
        }

        return NextResponse.json({ post: parsedResponse });
    } catch (error) {
        console.error('Error generating post:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate post' },
            { status: 500 }
        );
    }
}

function buildSystemPrompt(
    platform: string,
    format: string,
    userContext?: GeneratePostRequest['userContext']
): string {
    let prompt = `You are an expert ghostwriter for founders and entrepreneurs. You create viral, engaging social media content that sounds authentically human.

PLATFORM: ${platform.toUpperCase()}
FORMAT: ${format.toUpperCase()}
FORMAT INSTRUCTIONS: ${FORMAT_INSTRUCTIONS[format] || 'Write a single post.'}

WRITING PRINCIPLES:
1. Start with a HOOK that stops the scroll. Make it provocative, counterintuitive, or deeply relatable.
2. Write in first person. Be opinionated. Sound like a real human, not a brand.
3. Avoid corporate buzzwords: "leverage", "synergy", "game-changer", "disrupt".
4. Use short sentences. Short paragraphs. White space is your friend.
5. End with engagement: a question, a challenge, or a powerful statement.

OUTPUT FORMAT:
Return a JSON object with this structure:
{
    "content": "The full post content here...",
    "hooks": ["Hook option 1", "Hook option 2", "Hook option 3"],
    "cta": "Optional call to action or null"
}

Generate 3 alternative hook options that could replace the first line.`;

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
        if (userContext.tone) {
            const toneDesc = [
                userContext.tone.formality,
                userContext.tone.boldness,
                userContext.tone.style,
                userContext.tone.approach,
            ].filter(Boolean).join(', ');
            prompt += `\nTONE: ${toneDesc}`;
        }
        if (userContext.voiceSamples && userContext.voiceSamples.length > 0) {
            prompt += `\n\n--- VOICE SAMPLES (write in this style) ---`;
            userContext.voiceSamples.forEach((sample, i) => {
                prompt += `\n\nSAMPLE ${i + 1}:\n${sample}`;
            });
        }
    }

    return prompt;
}

function buildUserPrompt(topic: string, platform: string, format: string): string {
    return `Write a ${format.replace('_', ' ')} post for ${platform.toUpperCase()} about this topic:

"${topic}"

Remember to output ONLY the JSON object with content, hooks, and cta. No other text.`;
}
