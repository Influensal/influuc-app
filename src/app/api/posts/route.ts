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

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { platform, content, scheduledDate, status, format, topic } = body;

        // Get profile id
        const { data: profile } = await supabase
            .from('founder_profiles')
            .select('id')
            .eq('account_id', user.id)
            .single();

        if (!profile) {
            throw new Error('Profile not found');
        }

        let finalContent = content;

        // If Carousel, ensure topic is saved in content JSON
        if (format === 'carousel' && topic) {
            try {
                const parsed = JSON.parse(content);
                parsed.topic = topic;
                finalContent = JSON.stringify(parsed);
            } catch (e) {
                // If content is not valid JSON, just leave it (or wrap it?)
                // For now assuming it is valid as it comes from our app
            }
        }

        const { data: post, error } = await supabase
            .from('posts')
            .insert({
                profile_id: profile.id,
                platform,
                content: finalContent,
                scheduled_date: scheduledDate,
                status: status || 'scheduled',
                format: format || 'single'
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ post });

    } catch (error: any) {
        logger.exception('Create Post Error', error);
        console.error('Full Create Post Error:', JSON.stringify(error, null, 2));
        return NextResponse.json(
            { error: error.message || JSON.stringify(error) || 'Failed to create post' },
            { status: 500 }
        );
    }
}
