
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';

// Map internal tier IDs to your actual Stripe Price IDs
// YOU MUST REPLACE THESE WITH YOUR REAL STRIPE PRICE IDs FROM YOUR DASHBOARD
// YOU MUST REPLACE THESE WITH YOUR REAL STRIPE PRICE IDs FROM YOUR DASHBOARD
const PRICE_IDS = {
    starter: process.env.STRIPE_PRICE_ID_STARTER,
    growth: process.env.STRIPE_PRICE_ID_GROWTH,
    authority: process.env.STRIPE_PRICE_ID_AUTHORITY,
};

export async function POST(req: NextRequest) {
    try {
        const { tier, successUrl, cancelUrl } = await req.json();
        const priceId = PRICE_IDS[tier as keyof typeof PRICE_IDS];

        console.log(`[Checkout] Attempting to create session for Tier: ${tier}, PriceID: ${priceId}`);

        if (!priceId) {
            console.error(`[Checkout] Missing Price ID for tier: ${tier}. Check .env.local variables.`);
            return NextResponse.json({ error: 'Invalid tier or missing Price ID configuration' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const origin = req.headers.get('origin') || 'http://localhost:3000';

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            customer_email: user.email, // Pre-fill email
            client_reference_id: user.id, // Tie to Supabase User ID
            subscription_data: {
                trial_period_days: 7, // 7-day free trial as requested
                metadata: {
                    supabase_user_id: user.id,
                    tier: tier,
                },
            },
            // Force strict URL format to ensure redirect lands on Billing tab with session_id
            // This prevents client-side URL construction errors
            success_url: `${origin}/dashboard/settings?tab=billing&payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/dashboard/settings?tab=billing&payment=cancelled`,
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Internal Server Error',
            details: String(error)
        }, { status: 500 });
    }
}
