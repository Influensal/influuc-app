/**
 * Carousel HTML Generation API — Uses the shared carousel generator module.
 * This endpoint is called by the Carousel Studio page and can also be used standalone.
 */

import { NextResponse } from 'next/server';
import { generateCarouselSlides } from '@/lib/ai/carousel-generator';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('subscription_tier')
      .eq('account_id', user.id)
      .single();

    if (profile?.subscription_tier !== 'authority') {
      return NextResponse.json({ 
        error: 'On-demand carousels are only available on the Authority plan.' 
      }, { status: 403 });
    }

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
