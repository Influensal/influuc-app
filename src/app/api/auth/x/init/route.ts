import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const client = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID!,
        clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    // robustly determine app url
    let appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
        if (process.env.VERCEL_URL) {
            appUrl = `https://${process.env.VERCEL_URL}`;
        } else {
            const host = request.headers.get('host') || 'localhost:3000';
            const protocol = host.includes('localhost') ? 'http' : 'https';
            appUrl = `${protocol}://${host}`;
        }
    }

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
