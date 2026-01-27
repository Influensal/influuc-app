
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';

// Map internal tier IDs to your actual Stripe Price IDs
// YOU MUST REPLACE THESE WITH YOUR REAL STRIPE PRICE IDs FROM YOUR DASHBOARD
const PRICE_IDS = {
    starter: process.env.STRIPE_PRICE_ID_STARTER || 'price_1Q...',
    growth: process.env.STRIPE_PRICE_ID_GROWTH || 'price_1Q...',
    authority: process.env.STRIPE_PRICE_ID_AUTHORITY || 'price_1Q...',
};

export async function POST(req: NextRequest) {
    try {
        const { tier } = await req.json();
        const priceId = PRICE_IDS[tier as keyof typeof PRICE_IDS];

        if (!priceId) {
            return NextResponse.json({ error: 'Invalid tier or missing Price ID' }, { status: 400 });
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
            success_url: `${origin}/onboarding?session_id={CHECKOUT_SESSION_ID}&payment=success`,
            cancel_url: `${origin}/onboarding?payment=cancelled`,
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
