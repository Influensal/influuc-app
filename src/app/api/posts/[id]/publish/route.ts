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

            // Download media if post has an image
            let mediaIds: string[] = [];
            if (post.image_url) {
                try {
                    console.log('[Publish] Downloading image for X:', post.image_url);
                    const imageRes = await fetch(post.image_url);
                    const arrayBuffer = await imageRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const mimeType = imageRes.headers.get('content-type') || 'image/png';

                    const mediaId = await client.v1.uploadMedia(buffer, { mimeType });
                    mediaIds.push(mediaId);
                    console.log('[Publish] Uploaded media to X, Media ID:', mediaId);
                } catch (imgError) {
                    console.error('[Publish] Failed to upload media to X:', imgError);
                    // Decide whether to fail the post or just post without image
                    // Let's fail it so they know
                    throw new Error('Failed to attach image to X post.');
                }
            }

            if (post.format === 'thread') {
                // Split by double newlines for thread format
                const tweets = content.split('\n\n').filter((t: string) => t.trim().length > 0);
                if (tweets.length > 1) {
                    // If we have media, attach it to the first tweet of the thread
                    if (mediaIds.length > 0) {
                        const threadPayload = tweets.map((text: string, index: number) => {
                            if (index === 0) {
                                return { text, media: { media_ids: mediaIds as [string, ...string[]] } };
                            }
                            return { text };
                        });
                        const thread = await client.v2.tweetThread(threadPayload);
                        externalId = thread[0].data.id;
                    } else {
                        const thread = await client.v2.tweetThread(tweets);
                        externalId = thread[0].data.id;
                    }
                } else {
                    const tweetPayload: any = { text: content };
                    if (mediaIds.length > 0) {
                        tweetPayload.media = { media_ids: mediaIds as [string, ...string[]] };
                    }
                    const tweet = await client.v2.tweet(tweetPayload);
                    externalId = tweet.data.id;
                }
            } else {
                // Single post
                const tweetPayload: any = { text: content };
                if (mediaIds.length > 0) {
                    tweetPayload.media = { media_ids: mediaIds as [string, ...string[]] };
                }
                const tweet = await client.v2.tweet(tweetPayload);
                externalId = tweet.data.id;
            }

        } else if (post.platform === 'linkedin') {
            // LinkedIn Post
            // Using UGC API or Posts API
            // Endpoint: https://api.linkedin.com/v2/ugcPosts

            let specificContent: any = {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: {
                        text: post.content
                    },
                    shareMediaCategory: 'NONE'
                }
            };

            // Handle Image Attachment for LinkedIn
            if (post.image_url) {
                try {
                    console.log('[Publish] Registering image upload with LinkedIn...');
                    // 1. Register Upload
                    const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${connection.access_token}`,
                            'Content-Type': 'application/json',
                            'X-Restli-Protocol-Version': '2.0.0'
                        },
                        body: JSON.stringify({
                            registerUploadRequest: {
                                recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                                owner: `urn:li:person:${connection.profile_id}`,
                                serviceRelationships: [{
                                    relationshipType: 'OWNER',
                                    identifier: 'urn:li:userGeneratedContent'
                                }]
                            }
                        })
                    });

                    if (!registerRes.ok) {
                        const errText = await registerRes.text();
                        throw new Error(`LinkedIn register upload failed: ${errText}`);
                    }

                    const registerData = await registerRes.json();
                    const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
                    const assetUrn = registerData.value.asset;

                    console.log('[Publish] LinkedIn asset registered:', assetUrn, 'Uploading image bytes...');

                    // 2. Fetch image and upload bytes to LinkedIn
                    const imageRes = await fetch(post.image_url);
                    const arrayBuffer = await imageRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    const uploadMediaRes = await fetch(uploadUrl, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${connection.access_token}`,
                            'Content-Type': 'application/octet-stream' // generic stream often works, or image/png
                        },
                        body: buffer
                    });

                    if (!uploadMediaRes.ok) {
                        const errText = await uploadMediaRes.text();
                        throw new Error(`LinkedIn media upload failed: ${errText}`);
                    }

                    // 3. Update specificContent to include the image
                    specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
                    specificContent['com.linkedin.ugc.ShareContent'].media = [{
                        status: 'READY',
                        description: { text: 'Post Image' },
                        media: assetUrn,
                        title: { text: 'Post Image' }
                    }];
                    console.log('[Publish] LinkedIn media upload successful.');

                } catch (imgError) {
                    console.error('[Publish] Failed to attach image to LinkedIn post:', imgError);
                    throw new Error('Failed to attach image to LinkedIn post.');
                }
            }

            const body = {
                author: `urn:li:person:${connection.profile_id}`,
                lifecycleState: 'PUBLISHED',
                specificContent: specificContent,
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
