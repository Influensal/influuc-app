
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env vars
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
    console.log('🚀 Starting API Verification Test...');

    // 1. Create a Random User
    const email = `test.auto.${Date.now()}@example.com`;
    const password = 'Password123!';
    console.log(`[1/4] Creating user: ${email}`);

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error('❌ Signup failed:', authError.message);
        process.exit(1);
    }

    const userId = authData.user?.id;
    if (!userId) {
        console.error('❌ No user ID returned');
        process.exit(1);
    }
    console.log('✅ User created:', userId);

    // 2. Simulate Onboarding Complete Payload
    // This replicates what Onboarding/Page.tsx sends to /api/onboarding/complete
    const onboardingData = {
        name: 'Test Authority User',
        role: 'CEO',
        companyName: 'Test Corp',
        companyWebsite: 'https://test.com',
        industry: 'Tech',
        targetAudience: 'Everyone',
        aboutYou: 'I am a test user.',
        personalContext: [],
        productContext: [],
        contentGoal: 'Testing',
        topics: ['Testing'],
        archetype: 'builder',
        tone: {
            formality: 'professional',
            boldness: 'bold',
            style: 'educational',
            approach: 'story-driven',
        },
        voiceSamples: [{ content: 'This is a sample voice.', type: 'paste' }],
        platforms: { x: true, linkedin: true },
        // CRITICAL: Attempting to set authority plan via frontend payload
        subscriptionTier: 'authority'
    };

    console.log(`[2/4] Calling Onboarding Complete API...`);

    // We need to call the API endpoint. 
    // Since we are running outside the Next.js server context, we can't easily fetch the *internal* API route
    // unless we hit localhost:3000. 
    // BUT, we can simulate the DB update that the API would perform to check if the DB *allows* it 
    // or if we strictly rely on the running server.
    // Let's rely on the running server at localhost:3000

    // Need a session token
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (sessionError) {
        console.error('❌ Login failed:', sessionError.message);
        process.exit(1);
    }

    const token = sessionData.session.access_token;

    // Extract Project Ref
    // NEXT_PUBLIC_SUPABASE_URL format: https://<ref>.supabase.co
    const projectRef = supabaseUrl.match(/https:\/\/([^\.]+)\./)?.[1];
    if (!projectRef) {
        console.warn('⚠️ Could not extract project ref from URL, simulated auth might fail.');
    }

    // Construct Cookie
    // Format: sb-<ref>-auth-token=<token>;
    // Note: The token in the cookie is often a JSON with access_token and refresh_token.
    // However, @supabase/ssr might just need the access_token in the header if we use createServerClient correctly?
    // Actually, createClient() in Next.js app directory usually reads cookies.
    // Let's try sending the cookie with the access_token. 
    // Standard Supabase cookie value is often: "base64-encoded-session-string" OR verify the exact format.
    // A simpler way: The `Authorization` header is often enough if the server client looks for it?
    // But createServerClient usually defaults to cookies.

    // Let's try sending the FULL session as the cookie value if possible, or just the access token. 
    // The safest is to mimic what the browser sends. 
    // Browser sends: `sb-<ref>-auth-token=["<access_token>","<refresh_token>",null,null,null]` (stringified array? or similar)
    // Actually, it's safer to try to rely on Authorization header if we can, but let's try the cookie.

    // Cookie format used by supabase-js v2 (auth-helpers/ssr):
    // `sb-${ref}-auth-token=${token}`

    // Wait, the session object itself might be needed. 
    // Let's try constructing a simple cookie with just the token, or the session string.
    const cookieName = `sb-${projectRef}-auth-token`;
    // const cookieValue = JSON.stringify([token, sessionData.session.refresh_token]); // Common format
    const cookieValue = `base64-${Buffer.from(JSON.stringify(sessionData.session)).toString('base64')}`;
    // Actually, let's try the SIMPLEST approach first: Just the token in JSON.
    // The format is often: ["access_token","refresh_token"]
    const simpleCookieValue = JSON.stringify({
        access_token: token,
        refresh_token: sessionData.session.refresh_token,
    });
    // Or sometimes just the string.

    // Let's try both cookie and auth header.

    try {
        const response = await fetch('http://localhost:3000/api/onboarding/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Cookie': `${cookieName}=${encodeURIComponent(JSON.stringify(sessionData.session))}`, // Passing full session
            },
            body: JSON.stringify(onboardingData)
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`❌ API call failed: ${response.status} ${text}`);
            // If API fails (e.g. auth), we might need to insert directly to verify DB schema at least.
            // But let's try direct DB insertion as fallback if API fails?
        } else {
            console.log('✅ Onboarding API call successful');
        }

    } catch (e) {
        console.error('❌ Could not hit localhost:3000. Is server running?', e.message);
    }

    // 3. Verify via API (Settings Page Logic)
    console.log(`[3/4] Verifying via /api/subscription...`);
    try {
        const subResponse = await fetch('http://localhost:3000/api/subscription', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Cookie': `${cookieName}=${encodeURIComponent(JSON.stringify(sessionData.session))}`,
            }
        });

        if (subResponse.ok) {
            const subData = await subResponse.json();
            console.log('✅ Subscription API Response:', JSON.stringify(subData, null, 2));
            if (subData.subscription?.tier === 'authority') {
                console.log('🎉 SUCCESS: Authority plan confirmed via API!');
            } else {
                console.error('❌ FAILURE: Expected authority, got', subData.subscription?.tier);
            }
        } else {
            console.error('❌ Subscription API failed:', subResponse.status, await subResponse.text());
        }
    } catch (e) {
        console.error('❌ Failed to call subscription API', e);
    }

    // 4. Verify Profile and Subscription in DB
    console.log(`[4/5] Verifying DB State...`);

    // Check founder_profiles
    const { data: profile, error: profileError } = await supabase
        .from('founder_profiles')
        .select('*')
        .eq('account_id', userId)
        .single();

    if (profileError) {
        console.error('❌ Failed to fetch profile:', profileError.message);
    } else {
        console.log('✅ Profile found.');
        console.log(`   - Onboarding Status: ${profile.onboarding_status}`);
        // Check if subscription_tier is a column in founder_profiles? 
        // Or is it in a separate subscriptions table?
        // BillingSection.tsx fetches /api/subscription.
        console.log(`   - Profile Data (partial):`, profile);
    }

    // Check subscriptions table
    const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (subError) {
        console.log('ℹ️ No entry in subscriptions table (Expected if Stripe webhook didnt fire).');
    } else {
        console.log('✅ Subscription found:', sub);
        console.log(`   - Tier: ${sub.tier}`);
    }

    // 4. Cleanup
    console.log(`[4/4] Cleaning up...`);
    await supabase.auth.admin.deleteUser(userId).catch(() => { }); // Requires service role, might fail with anon key
    // checking if we can delete own user? likely not.

    console.log('🏁 Test Complete.');
}

runTest();
