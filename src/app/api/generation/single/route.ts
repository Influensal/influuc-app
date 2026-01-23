import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateSinglePost } from '@/lib/generation';

export const runtime = 'nodejs';
export const maxDuration = 60; // Should be fast (3-5s)

export async function POST(request: NextRequest) {
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

        // Verify ownership (optional but recommended, generateSinglePost fetches post anyway)
        // We'll rely on generateSinglePost finding the post.
        // But for security we should check if the post belongs to the user?
        // generateSinglePost doesn't check user, it runs as admin.
        // Ideally we check ownership here.
        const { data: post } = await supabase
            .from('posts')
            .select('profile_id, founder_profiles!inner(account_id)')
            .eq('id', postId)
            .single();

        // @ts-ignore - Supabase types can be tricky with joins
        const profile = Array.isArray(post.founder_profiles) ? post.founder_profiles[0] : post.founder_profiles;

        if (!post || !profile || profile.account_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized or Post not found' }, { status: 403 });
        }

        const result = await generateSinglePost(postId);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, content: result.content });

    } catch (error) {
        console.error('[SingleGenAPI] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
