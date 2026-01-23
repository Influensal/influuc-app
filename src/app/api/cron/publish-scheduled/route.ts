import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TwitterApi } from 'twitter-api-v2';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Create admin client (bypasses RLS)
function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
    // Verify cron secret (Vercel sets this automatically)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.warn('[Cron] Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    console.log(`[Cron] Running scheduled publish check at ${now}`);

    try {
        // Get all posts that:
        // 1. Are scheduled (not yet posted)
        // 2. Have scheduled_date <= now
        // 3. Belong to a profile with auto_publish = true
        const { data: duePosts, error: queryError } = await supabase
            .from('posts')
            .select(`
                id,
                platform,
                content,
                format,
                profile_id,
                founder_profiles!inner (
                    id,
                    account_id,
                    auto_publish
                )
            `)
            .eq('status', 'scheduled')
            .lte('scheduled_date', now)
            .eq('founder_profiles.auto_publish', true);

        if (queryError) {
            console.error('[Cron] Query error:', queryError);
            return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
        }

        if (!duePosts || duePosts.length === 0) {
            console.log('[Cron] No posts due for publishing');
            return NextResponse.json({ message: 'No posts due', processed: 0 });
        }

        console.log(`[Cron] Found ${duePosts.length} posts to publish`);

        let successCount = 0;
        let failCount = 0;

        for (const post of duePosts) {
            try {
                const profile = post.founder_profiles as any;
                const userId = profile.account_id;

                // Get social connection for this platform
                const { data: connection } = await supabase
                    .from('social_connections')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('platform', post.platform.toLowerCase())
                    .single();

                if (!connection) {
                    console.warn(`[Cron] No connection for user ${userId}, platform ${post.platform}`);
                    await markPostFailed(supabase, post.id, 'No social connection');
                    failCount++;
                    continue;
                }

                // Publish based on platform
                let externalId = '';

                if (post.platform.toLowerCase() === 'x') {
                    externalId = await publishToX(connection.access_token, post.content, post.format);
                } else if (post.platform.toLowerCase() === 'linkedin') {
                    externalId = await publishToLinkedIn(connection.access_token, connection.profile_id, post.content);
                }

                // Mark as posted
                await supabase
                    .from('posts')
                    .update({ status: 'posted', updated_at: new Date().toISOString() })
                    .eq('id', post.id);

                console.log(`[Cron] Published post ${post.id} to ${post.platform}`);
                successCount++;

            } catch (postError) {
                console.error(`[Cron] Failed to publish post ${post.id}:`, postError);
                await markPostFailed(supabase, post.id, postError instanceof Error ? postError.message : 'Unknown error');
                failCount++;
            }
        }

        return NextResponse.json({
            message: 'Cron complete',
            processed: duePosts.length,
            success: successCount,
            failed: failCount
        });

    } catch (error) {
        console.error('[Cron] Unexpected error:', error);
        return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
    }
}

async function publishToX(accessToken: string, content: string, format: string): Promise<string> {
    const client = new TwitterApi(accessToken);

    if (format === 'thread') {
        const tweets = content.split('\n\n').filter(t => t.trim().length > 0);
        if (tweets.length > 1) {
            const thread = await client.v2.tweetThread(tweets);
            return thread[0].data.id;
        }
    }

    const tweet = await client.v2.tweet(content);
    return tweet.data.id;
}

async function publishToLinkedIn(accessToken: string, profileId: string, content: string): Promise<string> {
    const body = {
        author: `urn:li:person:${profileId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: content },
                shareMediaCategory: 'NONE'
            }
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`LinkedIn API Error: ${err}`);
    }

    const data = await response.json();
    return data.id;
}

async function markPostFailed(supabase: any, postId: string, reason: string) {
    await supabase
        .from('posts')
        .update({
            status: 'failed',
            updated_at: new Date().toISOString()
            // Could also store error reason in a metadata field
        })
        .eq('id', postId);
}
