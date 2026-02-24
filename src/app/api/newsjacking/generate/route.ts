import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/ai/providers';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { article, context } = body;

        if (!article || !article.content) {
            return NextResponse.json({ error: 'Article with content is required' }, { status: 400 });
        }

        const provider = await getProvider();
        if (!provider.isConfigured()) {
            return NextResponse.json({ error: 'AI provider is not configured. Please add your API key.' }, { status: 500 });
        }

        const systemPrompt = `You are an expert executive ghostwriter and founder. Your goal is to "newsjack" breaking industry news. 
Write a polarizing, insightful, or highly valuable short essay (ideal for LinkedIn or an X/Twitter thread) that ties this breaking news back to the user's core business thesis, industry focus, and tone of voice.

Context about the founder/user:
${JSON.stringify(context || {}, null, 2)}

Instructions:
1. Hook the reader immediately with the news event.
2. Break down WHY this matters (your unique hot take).
3. Tie it back to your expertise or business thesis.
4. Keep the formatting clean (use short paragraphs and bullet points if necessary).
5. Do NOT use emojis unless the user context specifies a very casual tone.
6. Output raw text only, no JSON formatting.`;

        const userPrompt = `News Article Headline: ${article.title}\nSource: ${article.url}\n\nArticle Content/Summary:\n${article.content}\n\nWrite the newsjacking post now:`;

        const result = await provider.complete({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            maxTokens: 1000,
        });

        return NextResponse.json({ post: result.content.trim() });
    } catch (error: any) {
        console.error('Newsjacking generation error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error during AI generation' }, { status: 500 });
    }
}
