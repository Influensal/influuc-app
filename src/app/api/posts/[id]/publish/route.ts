import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { TwitterApi } from 'twitter-api-v2';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: postId } = await params;

    // Auth Check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Post Data
    const { data: post, error: postError } = await supabase
        .from('posts')
        .select('*, founder_profiles!inner(account_id)')
        .eq('id', postId)
        .single();

    if (postError || !post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.status === 'posted') {
        return NextResponse.json({ error: 'Post already published' }, { status: 400 });
    }

    // Get Social Connection
    console.log(`[Publish] Checking connection for User: ${user.id}, Platform: ${post.platform}`);

    // Normalize platform to lowercase just in case
    const targetPlatform = post.platform.toLowerCase();

    const { data: connection, error: connError } = await supabase
        .from('social_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', targetPlatform)
        .maybeSingle(); // Use maybeSingle to avoid error on 0 rows

    if (connError) {
        console.error('[Publish] Connection DB Error:', connError);
    }

    if (!connection) {
        console.warn(`[Publish] No connection found for ${targetPlatform}. User ${user.id}.`);
        // Query to see what IS there?
        const { data: allConns } = await supabase.from('social_connections').select('platform').eq('user_id', user.id);
        console.log('[Publish] Available connections:', allConns);

        return NextResponse.json({ error: `Not connected to ${targetPlatform}. Please connect in settings.` }, { status: 403 });
    }

    console.log('[Publish] Connection found:', connection.id);

    try {
        let externalId = '';

        if (post.platform === 'x') {
            // Refresh Token if needed (Twitter V2)
            // Note: simple-oauth2 or manual handling usually needed here if expired.
            // For MVP we assume token is valid or long-lived enough for the session.
            // If strictly using 'offline.access', we should refresh.

            // Instantiate Client
            const client = new TwitterApi(connection.access_token);

            const content = post.content;

            // Only use threading if the post format is explicitly 'thread'
            // For 'single' and 'long_form' posts, post as-is (user has X Premium for long posts)
            if (post.format === 'thread') {
                // Split by double newlines for thread format
                const tweets = content.split('\n\n').filter((t: string) => t.trim().length > 0);
                if (tweets.length > 1) {
                    const thread = await client.v2.tweetThread(tweets);
                    externalId = thread[0].data.id;
                } else {
                    const tweet = await client.v2.tweet(content);
                    externalId = tweet.data.id;
                }
            } else {
                // Single post - post content as-is
                const tweet = await client.v2.tweet(content);
                externalId = tweet.data.id;
            }

        } else if (post.platform === 'linkedin') {
            // LinkedIn Post
            // Using UGC API or Posts API
            // Endpoint: https://api.linkedin.com/v2/ugcPosts

            const body = {
                author: `urn:li:person:${connection.profile_id}`,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: {
                            text: post.content
                        },
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
                    'Authorization': `Bearer ${connection.access_token}`,
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
            externalId = data.id; // urn:li:share:123
        }

        // Update Post Status
        await supabase
            .from('posts')
            .update({
                status: 'posted',
                updated_at: new Date().toISOString()
                // potentially store externalId in metadata if column existed
            })
            .eq('id', postId);

        return NextResponse.json({ success: true, externalId });

    } catch (error) {
        console.error('Publishing Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to publish post'
        }, { status: 500 });
    }
}
