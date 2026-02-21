import { NextResponse, NextRequest } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const code = searchParams.get('code');

    const storedState = request.cookies.get('x_auth_state')?.value;
    const codeVerifier = request.cookies.get('x_code_verifier')?.value;

    if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
        return NextResponse.redirect(new URL('/onboarding?error=auth_failed_state_mismatch', request.url));
    }

    try {
        const client = new TwitterApi({
            clientId: process.env.TWITTER_CLIENT_ID!,
            clientSecret: process.env.TWITTER_CLIENT_SECRET!,
        });

        // Dynamic URL detection
        let appUrl = '';
        const host = request.headers.get('host');

        if (host && !host.includes('localhost')) {
            appUrl = `https://${host}`;
        } else {
            appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        }

        if (process.env.VERCEL_URL && appUrl.includes('localhost')) {
            appUrl = `https://${process.env.VERCEL_URL}`;
        }

        const { client: loggedClient, accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
            code,
            codeVerifier,
            redirectUri: `${appUrl}/api/auth/x/callback`,
        });

        const { data: userObject } = await loggedClient.v2.me();

        // Save to Supabase
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            await supabase.from('social_connections').upsert({
                user_id: user.id,
                platform: 'x',
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
                profile_id: userObject.id,
                profile_name: userObject.name,
                profile_handle: userObject.username
            }, { onConflict: 'user_id, platform' });
        }

        const redirectPath = request.cookies.get('auth_redirect')?.value || '/onboarding';
        const successUrl = new URL(redirectPath, request.url);
        successUrl.searchParams.set('connect', 'success');
        successUrl.searchParams.set('platform', 'x');

        const response = NextResponse.redirect(successUrl);
        response.cookies.delete('auth_redirect'); // Cleanup

        return response;

    } catch (error) {
        console.error('Twitter Auth Error:', error);
        return NextResponse.redirect(new URL('/onboarding?error=auth_failed_twitter', request.url));
    }
}
