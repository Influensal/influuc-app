import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const client = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID!,
        clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    // Dynamic URL detection (Prioritize Host Header to fix bad env vars)
    let appUrl = '';
    const host = request.headers.get('host');

    if (host && !host.includes('localhost')) {
        appUrl = `https://${host}`;
    } else {
        // Fallback for localhost or if host is missing
        appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    }

    // Safety check: If we are clearly on Vercel (based on env) but appUrl is localhost, force Vercel URL
    if (process.env.VERCEL_URL && appUrl.includes('localhost')) {
        appUrl = `https://${process.env.VERCEL_URL}`;
    }

    console.log('[Auth] Detected App URL:', appUrl); // Debug log

    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
        `${appUrl}/api/auth/x/callback`,
        { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
    );

    // In a real app, store codeVerifier and state in a secure httpOnly cookie session
    // For MVP, we'll pass them somewhat statefully or just rely on the return.
    // NOTE: We MUST store codeVerifier to verify the callback. 
    // We will store it in a cookie.

    const urlObj = new URL(request.url);
    const redirectPath = urlObj.searchParams.get('redirect') || '/onboarding';

    const response = NextResponse.redirect(url);

    response.cookies.set('x_auth_state', state, { path: '/', httpOnly: true, maxAge: 600 });
    response.cookies.set('x_code_verifier', codeVerifier, { path: '/', httpOnly: true, maxAge: 600 });
    response.cookies.set('auth_redirect', redirectPath, { path: '/', httpOnly: true, maxAge: 600 });

    return response;
}
