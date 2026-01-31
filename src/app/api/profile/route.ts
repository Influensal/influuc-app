
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const profileId = searchParams.get('profileId');
        const supabase = await createClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Build query
        let query = supabase
            .from('founder_profiles')
            .select('*')
            .eq('account_id', user.id);

        // If specific profile requested, filter by ID
        if (profileId) {
            query = query.eq('id', profileId);
        }

        // Get single profile (limit 1 to avoid error if multiple exist and no ID specified)
        // Order by created_at desc to get most recent if multiple
        const { data: profiles, error: profileError } = await query
            .order('created_at', { ascending: false })
            .limit(1);

        if (profileError) {
            console.error('Error fetching profile:', profileError);
            return NextResponse.json(
                { error: `Failed to fetch profile: ${profileError.message}` },
                { status: 500 }
            );
        }

        // Return the first found profile, or null
        const profile = profiles && profiles.length > 0 ? profiles[0] : null;

        return NextResponse.json({ profile });
    } catch (error) {
        console.error('Error in profile API:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}

// Support both PUT (replace/update) and PATCH (partial update)
export async function PUT(req: Request) {
    return handleUpdate(req);
}

export async function PATCH(req: Request) {
    return handleUpdate(req);
}

async function handleUpdate(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Fields allowed to be updated
        // now includes visual preferences for Tier Upgrade Flow
        const updates = {
            name: body.name,
            role: body.role,
            company_name: body.companyName,
            company_website: body.companyWebsite,
            business_description: body.businessDescription,
            industry: body.industry,
            target_audience: body.targetAudience,
            context_data: body.contextData,
            auto_publish: body.autoPublish,

            // Visual / Tier preferences
            subscription_tier: body.subscriptionTier,
            visual_mode: body.visualMode,
            style_faceless: body.style_faceless,
            style_carousel: body.style_carousel,
            style_face: body.style_face,
            avatar_urls: body.avatar_urls
        };

        // Filter out undefined
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        if (Object.keys(cleanUpdates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('founder_profiles')
            .update(cleanUpdates)
            .eq('account_id', user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ profile: data });

    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update profile' },
            { status: 500 }
        );
    }
}
