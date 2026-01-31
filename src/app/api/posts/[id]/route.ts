/**
 * PATCH /api/posts/[id]
 * Update post content
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger, startTimer } from '@/lib/logger';

export const runtime = 'nodejs';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const timer = startTimer();
    const { id: postId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { content } = await request.json();

        if (!content || typeof content !== 'string') {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        // Verify ownership
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('id, status, profile_id, founder_profiles!inner(account_id)')
            .eq('id', postId)
            .single();

        if (fetchError || !post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // @ts-ignore - Supabase types with joins
        const profile = Array.isArray(post.founder_profiles) ? post.founder_profiles[0] : post.founder_profiles;
        if (!profile || profile.account_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Don't allow editing posted content
        if (post.status === 'posted') {
            return NextResponse.json({ error: 'Cannot edit posted content' }, { status: 400 });
        }

        // Update the content
        const { error: updateError } = await supabase
            .from('posts')
            .update({
                content,
                updated_at: new Date().toISOString()
            })
            .eq('id', postId);

        if (updateError) {
            logger.exception('Failed to update post', updateError, { postId });
            return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
        }

        logger.info('Post content updated', { postId, userId: user.id, duration_ms: timer() });

        return NextResponse.json({ success: true });

    } catch (error) {
        logger.exception('Update post error', error, { postId });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
