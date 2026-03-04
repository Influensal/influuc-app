import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { fal } from '@fal-ai/client';

export const runtime = 'nodejs'; // Fal client uses node events

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, mode = 'faceless', aspectRatio = '1:1', imageBase64 } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch user's active profile
        const { data: profiles } = await supabase
            .from('founder_profiles')
            .select('*')
            .eq('account_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

        const profile = profiles?.[0];

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Tier check mapping from internal canonical names
        const tier = profile.subscription_tier || 'starter';
        if (tier === 'starter') {
            return NextResponse.json({ error: 'Upgrade to Creator or Authority to use AI Visuals Studio.' }, { status: 403 });
        }

        if (mode === 'digital_twin' && tier !== 'authority') {
            return NextResponse.json({ error: 'Upgrade to Authority to use Digital Twin Face Clones.' }, { status: 403 });
        }

        // Nano Banana / Gemini models accept standard aspect ratio formats (e.g., '16:9', '1:1')
        const nanoAspectRatio = aspectRatio || '1:1';

        let result: any;

        if (mode === 'digital_twin') {
            let referenceUrl = profile.visual_lora_id;

            // Use ad-hoc uploaded selfie if provided for testing
            if (imageBase64) {
                const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
                const imageBuffer = Buffer.from(base64Data, 'base64');
                const blob = new Blob([imageBuffer]);
                referenceUrl = await fal.storage.upload(blob);
            }

            if (!referenceUrl) {
                return NextResponse.json({ error: 'No Neural Face Map found and no image provided.' }, { status: 400 });
            }

            // Call Fal.ai using the Gemini 2.5 Flash Image Edit model
            // Pass the user's reference selfie URL in the image_urls array
            result = await fal.subscribe("fal-ai/gemini-25-flash-image/edit", {
                input: {
                    prompt: `generate an image of this exact person. ${prompt}`,
                    aspect_ratio: nanoAspectRatio,
                    image_urls: [referenceUrl], // The uploaded selfie
                    output_format: "png"
                },
                logs: true,
            });

        } else {
            // mode === 'faceless'
            // Use standard Gemini 2.5 Flash for abstract/scenery/faceless images
            const stylePrompt = `High-end cinematic technology advertisement still, photorealistic, 8K quality, designed for thought-leadership social media.
Scene: A vast, modern, architectural workspace — not an office, not sci-fi — timeless and elevated. Polished concrete floor, soft fog in the air, tall shadowed structures fading into darkness.
Center frame: A single human silhouette (gender-neutral, no facial detail), standing calm and upright. Not working — overseeing. Hands relaxed at their sides.
Around the human, abstract, luminous forms made of light, geometry, and flowing data representing: ${prompt}
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

        // Depending on the exact Fal client version/model, the output might be wrapped in .data
        const outputPayload = result.data || result;
        const generatedImageUrl = outputPayload?.images?.[0]?.url || outputPayload?.image?.url;

        if (!generatedImageUrl) {
            console.error("Failed to generate image, result was:", result);
            throw new Error("Failed to generate image. Please check terminal for details.");
        }

        return NextResponse.json({ imageUrl: generatedImageUrl });

    } catch (error: any) {
        console.error('Visuals generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error during image generation' },
            { status: 500 }
        );
    }
}
