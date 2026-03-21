import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getFacelessStyle, getFaceStyle, compileVisualPrompt } from '@/lib/ai/visual-styles';
import { fal } from '@fal-ai/client';

export const runtime = 'nodejs'; // Fal client uses node events

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, mode = 'faceless', aspectRatio = '16:9', imageBase64 } = body;

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

        const brandColors = profile.brand_colors || {
            primary: '#10B981',
            background: '#09090B',
            accent: '#F59E0B'
        };

        // Nano Banana / Gemini models accept standard aspect ratio formats (e.g., '16:9', '1:1')
        const nanoAspectRatio = aspectRatio || '16:9';

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

            // Get the user's selected face style or use 'studio' as default
            const styleId = profile.style_face || 'studio';
            const style = getFaceStyle(styleId) || getFaceStyle('studio')!;
            const styledPrompt = compileVisualPrompt(prompt, style, brandColors);

            // Call Fal.ai using the Gemini 2.5 Flash Image Edit model
            // Pass the user's reference selfie URL in the image_urls array
            result = await fal.subscribe("fal-ai/gemini-25-flash-image/edit", {
                input: {
                    prompt: styledPrompt,
                    aspect_ratio: nanoAspectRatio,
                    image_urls: [referenceUrl], // The uploaded selfie
                    output_format: "png"
                },
                logs: true,
            });

        } else {
            // mode === 'faceless'
            // Get the user's selected faceless style or use 'abstract' as default
            const styleId = profile.style_faceless || 'abstract';
            const style = getFacelessStyle(styleId) || getFacelessStyle('abstract')!;
            const styledPrompt = compileVisualPrompt(prompt, style, brandColors);

            result = await fal.subscribe("fal-ai/gemini-25-flash-image", {
                input: {
                    prompt: styledPrompt,
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
