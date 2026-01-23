import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const platform = searchParams.get('platform');

        // 1. Get Profile ID for this user
        const { data: profile } = await supabase
            .from('founder_profiles')
            .select('id')
            .eq('account_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ posts: [] }); // No profile = no posts
        }

        // 2. Query posts for this profile
        let query = supabase
            .from('posts')
            .select('*')
            .eq('profile_id', profile.id)
            .order('scheduled_date', { ascending: true });

        if (platform) {
            query = query.eq('platform', platform);
        }

        const { data: posts, error } = await query;

        if (error) {
            console.error('Error fetching posts:', error);
            return NextResponse.json(
                { error: `Failed to fetch posts: ${error.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ posts: posts || [] });
    } catch (error) {
        console.error('Error in posts API:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch posts' },
            { status: 500 }
        );
    }
}
