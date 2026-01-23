import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const code = searchParams.get('code');
    const storedState = request.cookies.get('linkedin_auth_state')?.value;

    if (!code || !state || !storedState || state !== storedState) {
        const fallbackPath = request.cookies.get('auth_redirect')?.value || '/onboarding';
        return NextResponse.redirect(new URL(`${fallbackPath}?error=auth_failed_state_mismatch`, request.url));
    }

    try {
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

        const redirectUri = `${appUrl}/api/auth/linkedin/callback`;

        // 1. Exchange Code for Token
        const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: process.env.LINKEDIN_CLIENT_ID!,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
            }),
        });

        if (!tokenResponse.ok) {
            const errText = await tokenResponse.text();
            throw new Error(`LinkedIn Token Error: ${errText}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        const expiresIn = tokenData.expires_in;

        // 2. Get User Profile (using OpenID / UserInfo)
        const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!profileResponse.ok) {
            throw new Error('Failed to fetch LinkedIn Profile');
        }

        const profileData = await profileResponse.json();
        // profileData = { sub: 'id', name: 'Name', given_name: '...', family_name: '...', picture: '...', email: '...' }

        // 3. Save to Supabase
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            await supabase.from('social_connections').upsert({
                user_id: user.id,
                platform: 'linkedin',
                access_token: accessToken,
                // LinkedIn v2 tokens usually don't have refresh tokens in the standard flow (they are long lived ~60 days)
                // If they do, it's `refresh_token` in tokenData.
                refresh_token: tokenData.refresh_token || null,
                expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
                profile_id: profileData.sub,
                profile_name: profileData.name,
                profile_handle: profileData.email // LinkedIn doesn't give a vanity handle easily via API, email is best proxy or just name
            }, { onConflict: 'user_id, platform' });
        }

        const redirectPath = request.cookies.get('auth_redirect')?.value || '/onboarding';
        const successUrl = new URL(redirectPath, request.url);
        successUrl.searchParams.set('connect', 'success');
        successUrl.searchParams.set('platform', 'linkedin');

        const response = NextResponse.redirect(successUrl);
        response.cookies.delete('auth_redirect'); // Cleanup

        return response;

    } catch (error) {
        console.error('LinkedIn Auth Error:', error);
        const fallbackPath = request.cookies.get('auth_redirect')?.value || '/onboarding';
        return NextResponse.redirect(new URL(`${fallbackPath}?error=linkedin_auth_failed`, request.url));
    }
}
