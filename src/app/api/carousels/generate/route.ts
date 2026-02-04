
import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/ai/providers';

export const runtime = 'nodejs';

interface GenerateCarouselRequest {
    topic: string;
    archetype?: string;
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
    };
}

export async function POST(req: NextRequest) {
    try {
        const body: GenerateCarouselRequest = await req.json();

        if (!body.topic) {
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
        }

        const provider = await getProvider();
        if (!provider.isConfigured()) {
            return NextResponse.json({ error: 'AI provider not configured' }, { status: 500 });
        }

        const systemPrompt = `You are an expert LinkedIn Carousel Strategist.
You create high-value, scroll-stopping PDF carousels that drive engagement and authority.

YOUR GOAL:
Create a cohesive, 8-10 slide educational carousel on the provided TOPIC.

STRUCTURE:
1. Cover Slide: Big, bold hook. Short subtitle.
2. Context Slide (Optional): Why this matters now.
3. Content Slides (5-7 slides): The core insight, step-by-step breakdown, or list. ONE idea per slide.
4. Summary Slide: Recap the main points.
5. CTA Slide: Clear call to action (e.g., "Follow for more").

CONTENT RULES:
- BE CONCISE: Slides have limited space. Max 15-20 words per slide body.
- BE VISUAL: Describe a "visual_cue" for each slide (e.g., "Chart showing growth", "Arrow pointing up").
- BE PUNCHY: Use strong verbs and clear headers.

OUTPUT FORMAT:
Return ONLY a valid JSON object with a "slides" array.
Each element must have:
- type: "cover" | "content" | "cta"
- title: string (Headline of the slide)
- body: string (Main text, keep brief)
- visual_cue: string (Description of visual element)
- subtitle: string (Optional, for cover/context)

Example:
{
  "slides": [
    { "type": "cover", "title": "Stop Using ChatGPT Wrong", "subtitle": "A 5-step framework", "visual_cue": "Robot icon with red X" },
    { "type": "content", "title": "1. Context Matters", "body": "Don't just ask questions. Give role + goal + constraints.", "visual_cue": "Funnel diagram" }
  ]
}
`;

        const userPrompt = `TOPIC: ${body.topic}
ARCHETYPE: ${body.archetype || 'Professional'}
CONTEXT: ${body.userContext?.industry ? `Industry: ${body.userContext.industry}, Audience: ${body.userContext.targetAudience}` : ''}

Generate the carousel content now. JSON only.`;

        const result = await provider.complete({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            responseFormat: { type: 'json_object' }
        });

        // Parse JSON
        let parsed;
        try {
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : result.content;
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse carousel JSON', result.content);
            throw new Error('AI returned invalid JSON');
        }

        return NextResponse.json({
            success: true,
            slides: parsed.slides || []
        });

    } catch (err: any) {
        console.error('Carousel Generation Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
