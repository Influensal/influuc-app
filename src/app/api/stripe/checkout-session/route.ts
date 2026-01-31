
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
        return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // Check payment status
        if (session.payment_status !== 'paid') {
            return NextResponse.json({
                status: session.payment_status,
                tier: null
            });
        }

        let tier = 'starter';

        // Try to get tier from metadata or subscription
        if (session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            tier = (subscription as any).metadata?.tier || 'starter';

            // --- LAZY SYNC ---
            // Force update accounts table to ensure UI reflects payment immediately
            // This acts as a backup even if webhook fails (e.g. localhost)
            const userId = session.client_reference_id;
            if (userId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
                const adminClient = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );

                // Idempotent update (safe to run multiple times)
                await adminClient.from('accounts').update({
                    plan_tier: tier,
                    subscription_status: 'active',
                    stripe_subscription_id: session.subscription as string,
                    stripe_customer_id: session.customer as string,
                    current_period_end: (subscription as any).current_period_end
                }).eq('id', userId);

                // Also sync founder profile
                await adminClient.from('founder_profiles').update({
                    subscription_tier: tier
                }).eq('account_id', userId);

                console.log(`[Lazy Sync] Synced subscription for ${userId} to ${tier}`);
            }
        }

        // Return the tier so frontend can trigger Onboarding
        return NextResponse.json({
            status: session.payment_status,
            customer_email: session.customer_details?.email,
            tier: tier
        });

    } catch (error: any) {
        console.error('Error fetching checkout session:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
