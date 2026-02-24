import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { fal } from '@fal-ai/client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64, imageUrl } = body;

        if (!imageBase64 && !imageUrl) {
            return NextResponse.json({ error: 'A valid imageBase64 string or imageUrl is required.' }, { status: 400 });
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

        // Tier check
        const tier = profile.subscription_tier || 'starter';
        if (tier !== 'authority') {
            return NextResponse.json({ error: 'Upgrade to Authority to use Digital Twin Face Clones.' }, { status: 403 });
        }

        let fileUrl = imageUrl;

        // If a new base64 image was uploaded, we need to store it in Fal's CDN
        if (imageBase64) {
            // Convert base64 Data URL to a Buffer then to a Blob
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const imageBuffer = Buffer.from(base64Data, 'base64');
            const blob = new Blob([imageBuffer]);

            // Upload directly to Fal.ai's high speed storage for the Face Swap engine
            fileUrl = await fal.storage.upload(blob);
        }

        // Save the reference image to the database
        await supabase
            .from('founder_profiles')
            .update({
                visual_training_status: 'completed',
                visual_lora_id: fileUrl // Re-using this column to hold the persistent image URL
            })
            .eq('id', profile.id);

        return NextResponse.json({ success: true, url: fileUrl });

    } catch (error: any) {
        console.error('Visuals upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error during image submission' },
            { status: 500 }
        );
    }
}
