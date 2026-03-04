import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { fal } from '@fal-ai/client';

export const runtime = 'nodejs'; // Fal client uses node events

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: postId } = await params;
        const body = await request.json();
        const { mode = 'faceless', aspectRatio = '1:1' } = body;

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch post and related profile
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('*, founder_profiles!inner(*)')
            .eq('id', postId)
            .single();

        if (postError || !post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // @ts-ignore - Supabase type handling for joins
        const profile = Array.isArray(post.founder_profiles) ? post.founder_profiles[0] : post.founder_profiles;

        if (profile.account_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized access to post' }, { status: 403 });
        }

        const tier = profile.subscription_tier || 'starter';
        if (tier === 'starter') {
            return NextResponse.json({ error: 'Upgrade to Creator or Authority to use AI Visuals Studio.' }, { status: 403 });
        }

        if (mode === 'digital_twin' && tier !== 'authority') {
            return NextResponse.json({ error: 'Upgrade to Authority to use Digital Twin Face Clones.' }, { status: 403 });
        }

        const nanoAspectRatio = aspectRatio || '1:1';

        // Use the post content as the prompt context. Limit length to avoid massive prompts.
        const postContext = post.content.substring(0, 500);

        let result: any;

        if (mode === 'digital_twin') {
            const hasAvatarUrls = Array.isArray(profile.avatar_urls) && profile.avatar_urls.length > 0;
            const hasLoraId = !!profile.visual_lora_id;

            if (!hasAvatarUrls && !hasLoraId) {
                return NextResponse.json({ error: 'No Neural Face Map found. Please setup your Digital Twin first.' }, { status: 400 });
            }

            let referenceUrls: string[] = [];
            if (hasAvatarUrls) {
                referenceUrls = profile.avatar_urls.slice(0, 3);
            } else if (hasLoraId) {
                referenceUrls = [profile.visual_lora_id];
            }

            // Call Fal.ai Digital Twin Edit
            result = await fal.subscribe("fal-ai/gemini-25-flash-image/edit", {
                input: {
                    prompt: `generate an image of this exact person representing this social media post concept: ${postContext}`,
                    aspect_ratio: nanoAspectRatio,
                    image_urls: referenceUrls,
                    output_format: "png"
                },
                logs: true,
            });

        } else {
            // mode === 'faceless'
            const stylePrompt = `High-end cinematic technology advertisement still, photorealistic, 8K quality, designed for thought-leadership social media.
Scene: A vast, modern, architectural workspace — not an office, not sci-fi — timeless and elevated. Polished concrete floor, soft fog in the air, tall shadowed structures fading into darkness.
Center frame: A single human silhouette (gender-neutral, no facial detail), standing calm and upright. Not working — overseeing. Hands relaxed at their sides.
Around the human, abstract, luminous forms made of light, geometry, and flowing data representing: ${postContext}
The human is not interacting directly — no keyboard, no screen — clearly in a supervisory role, embodying judgment and intent rather than execution.
In the environment: Subtle holographic pathways representing workflows, clean data streams flowing end-to-end, occasional secure locks, checkmarks, and transaction nodes (minimal, symbolic, premium).
Typography (cinematic title-card style, minimal): Include a very short, punchy main headline and a restrained subline derived from the concept. Optional micro-credit style text.
Lighting: soft, motivated top light, cool whites and cloud blues, deep shadows, gentle volumetric rays.
Camera: anamorphic lens look, shallow depth of field, elegant composition, cinematic contrast.
Color palette: Google-cloud adjacent but restrained — whites, blues, steel, soft cyan highlights.
Mood: calm inevitability, trust, maturity, post-hype realism.
Style references: luxury tech ad, future-of-work manifesto, restrained sci-fi realism.
Negative prompts: busy UI screens, dashboards, bullet points, cartoon robots, glowing eyes, cheap sci-fi tropes, clutter, stock imagery, exaggerated cyberpunk, blur, watermark spam.`;

            result = await fal.subscribe("fal-ai/gemini-25-flash-image", {
                input: {
                    prompt: stylePrompt,
                    aspect_ratio: nanoAspectRatio,
                    output_format: "png"
                },
                logs: true,
            });
        }

        const outputPayload = result.data || result;
        const generatedImageUrl = outputPayload?.images?.[0]?.url || outputPayload?.image?.url;

        if (!generatedImageUrl) {
            throw new Error("Failed to generate image.");
        }

        // Save generated image URL to the post
        await supabase
            .from('posts')
            .update({
                image_url: generatedImageUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', postId);

        return NextResponse.json({ success: true, imageUrl: generatedImageUrl });

    } catch (error: any) {
        console.error('Post Image generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error during image generation' },
            { status: 500 }
        );
    }
}
