/**
 * Carousel HTML Generation API — Uses the shared carousel generator module.
 * This endpoint is called by the Carousel Studio page and can also be used standalone.
 */

import { NextResponse } from 'next/server';
import { generateCarouselSlides } from '@/lib/ai/carousel-generator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("API: Request received", body);
    const { prompt, styleId } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const { slides } = await generateCarouselSlides({
      topic: prompt,
      styleId: styleId || undefined,
    });

    return NextResponse.json({ slides });
  } catch (error) {
    console.error("HTML Gen Error:", error);
    return NextResponse.json(
      { error: "Failed to generate: " + String(error) },
      { status: 500 }
    );
  }
}
