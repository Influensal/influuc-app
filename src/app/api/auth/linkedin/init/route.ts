import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const state = crypto.randomBytes(16).toString('hex');
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/linkedin/callback`;
    const clientId = process.env.LINKEDIN_CLIENT_ID!;

    // Scopes: openid profile email w_member_social
    // w_member_social is required for posting
    const scope = encodeURIComponent('openid profile email w_member_social');

    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;

    const urlObj = new URL(request.url);
    const redirectPath = urlObj.searchParams.get('redirect') || '/onboarding';

    const response = NextResponse.redirect(url);
    response.cookies.set('linkedin_auth_state', state, { path: '/', httpOnly: true, maxAge: 600 });
    response.cookies.set('auth_redirect', redirectPath, { path: '/', httpOnly: true, maxAge: 600 });

    return response;
}
