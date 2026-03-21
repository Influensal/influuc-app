import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/ai/providers';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const { imageBase64 } = await request.json();

        if (!imageBase64) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const provider = await getProvider();

        const systemPrompt = `You are a professional brand designer. Analyze the provided image and extract a premium 3-color brand palette.
        
Return ONLY a JSON object with these keys:
- primary: The most vibrant or representative color (hex).
- background: A clean, neutral color suitable for a canvas background (hex).
- accent: A high-contrast color that pops against the primary (hex).

The palette should feel cohesive, professional, and established.`;

        const response = await provider.complete({
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Extract a brand palette from this image.' },
                        { type: 'image', image: imageBase64 }
                    ] as any
                }
            ],
            temperature: 0.2,
            responseFormat: { type: 'json_object' }
        });

        const content = response.content;
        let palette;
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : content;
            palette = JSON.parse(jsonStr);
        } catch (e) {
            console.error('[Extract Colors] Parse Error:', e, content);
            return NextResponse.json({ error: 'Failed to parse extracted colors' }, { status: 500 });
        }

        return NextResponse.json(palette);

    } catch (error) {
        console.error('[Extract Colors] Error:', error);
        return NextResponse.json({ error: 'Failed to extract colors' }, { status: 500 });
    }
}
