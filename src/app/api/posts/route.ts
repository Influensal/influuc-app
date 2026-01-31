import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger, startTimer } from '@/lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const timer = startTimer();

    try {
        const supabase = await createClient();

        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const platform = searchParams.get('platform');
        const status = searchParams.get('status');

        // Use RPC function for optimized single-query fetch
        const { data: posts, error } = await supabase.rpc('get_user_posts', {
            p_user_id: user.id,
            p_platform: platform || null,
            p_status: status || null
        });

        if (error) {
            logger.exception('Failed to fetch posts', error, { userId: user.id });
            return NextResponse.json(
                { error: `Failed to fetch posts: ${error.message}` },
                { status: 500 }
            );
        }

        logger.info('Posts fetched', {
            userId: user.id,
            count: posts?.length || 0,
            duration_ms: timer()
        });

        return NextResponse.json({ posts: posts || [] });
    } catch (error) {
        logger.exception('Posts API error', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch posts' },
            { status: 500 }
        );
    }
}
