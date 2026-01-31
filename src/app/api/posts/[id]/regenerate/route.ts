/**
 * Regenerate a single post
 * Limited to ONE regeneration per post
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateSinglePost } from '@/lib/generation';
import { logger, startTimer } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
    const timer = startTimer();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { postId } = await request.json();

        if (!postId) {
            return NextResponse.json({ error: 'postId required' }, { status: 400 });
        }

        // Get post with ownership check and regeneration status
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('id, regenerated, profile_id, founder_profiles!inner(account_id)')
            .eq('id', postId)
            .single();

        if (fetchError || !post) {
            logger.warn('Post not found for regen', { postId, userId: user.id });
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Check ownership
        // @ts-ignore - Supabase types with joins
        const profile = Array.isArray(post.founder_profiles) ? post.founder_profiles[0] : post.founder_profiles;
        if (!profile || profile.account_id !== user.id) {
            logger.warn('Unauthorized regen attempt', { postId, userId: user.id });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Check if already regenerated (ONE regen per post limit)
        if (post.regenerated) {
            logger.info('Regen limit reached', { postId, userId: user.id });
            return NextResponse.json({
                error: 'This post has already been regenerated once.',
                message: 'Each post can only be regenerated one time. Edit the content manually if needed.'
            }, { status: 429 });
        }

        // Generate new content
        const result = await generateSinglePost(postId);

        if (!result.success) {
            logger.exception('Regen failed', new Error(result.error || 'Unknown'), { postId });
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // Mark as regenerated
        await supabase
            .from('posts')
            .update({ regenerated: true })
            .eq('id', postId);

        logger.info('Post regenerated', {
            postId,
            userId: user.id,
            duration_ms: timer()
        });

        return NextResponse.json({
            success: true,
            content: result.content,
            message: 'Content regenerated. This was your one-time regeneration for this post.'
        });

    } catch (error) {
        logger.exception('Regenerate API error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
