import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { fal } from '@fal-ai/client';
import { getFacelessStyle, getFaceStyle, compileVisualPrompt } from '@/lib/ai/visual-styles';

export const runtime = 'nodejs'; // Fal client uses node events

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: postId } = await params;
        const body = await request.json();
        const { mode = 'faceless', aspectRatio = '16:9' } = body;

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

        const brandColors = profile.brand_colors || {
            primary: '#10B981',
            background: '#09090B',
            accent: '#F59E0B'
        };

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

            // Get the user's selected face style
            const styleId = profile.style_face || 'photorealistic';
            const style = getFaceStyle(styleId) || getFaceStyle('photorealistic')!;
            const styledPrompt = compileVisualPrompt(postContext, style, brandColors);

            // Call Fal.ai Digital Twin Edit
            result = await fal.subscribe("fal-ai/gemini-25-flash-image/edit", {
                input: {
                    prompt: styledPrompt,
                    aspect_ratio: nanoAspectRatio,
                    image_urls: referenceUrls,
                    output_format: "png"
                },
                logs: true,
            });

        } else {
            // mode === 'faceless'
            const styleId = profile.style_faceless || 'abstract';
            const style = getFacelessStyle(styleId) || getFacelessStyle('abstract')!;
            const styledPrompt = compileVisualPrompt(postContext, style, brandColors);

            result = await fal.subscribe("fal-ai/gemini-25-flash-image", {
                input: {
                    prompt: styledPrompt,
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
