
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const runtime = 'nodejs';

// This secret comes from the Stripe Dashboard > Developers > Webhooks
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Helper to get logic-tier from metadata or price
const getTierFromSubscription = (subscription: Stripe.Subscription | Stripe.Response<Stripe.Subscription>): string => {
    // Access with 'any' to handle Response wrappers safely
    return (subscription as any).metadata?.tier || 'starter';
};

export async function POST(req: NextRequest) {
    if (!WEBHOOK_SECRET) {
        console.error('Missing STRIPE_WEBHOOK_SECRET');
        return NextResponse.json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 500 });
    }

    const sig = req.headers.get('stripe-signature');
    const body = await req.text();

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, sig!, WEBHOOK_SECRET);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Use Service Role for Admin Access
    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        console.log(`[Webhook] Processing event: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.client_reference_id;
                const subscriptionId = session.subscription as string;

                if (!userId || !subscriptionId) break;

                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const tier = getTierFromSubscription(subscription);

                console.log(`[Webhook] Checkout Completed. User: ${userId}, Tier: ${tier}`);

                // Update Accounts Table
                // Fix: Cast subscription to any to bypass Response<T> type limitations on some properties
                await adminClient.from('accounts').update({
                    plan_tier: tier,
                    subscription_status: 'active',
                    stripe_subscription_id: subscriptionId,
                    stripe_customer_id: session.customer as string,
                    current_period_end: (subscription as any).current_period_end
                }).eq('id', userId);

                // Update Founder Profile (Legacy/Sync)
                await adminClient.from('founder_profiles').update({
                    // subscription_tier: tier, 
                }).eq('account_id', userId);

                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const tier = getTierFromSubscription(subscription);

                // Find user by stripe_customer_id
                const { data: accounts } = await adminClient
                    .from('accounts')
                    .select('id')
                    .eq('stripe_customer_id', subscription.customer as string);

                if (accounts && accounts.length > 0) {
                    const userId = accounts[0].id;
                    console.log(`[Webhook] Subscription Updated. User: ${userId}, Status: ${subscription.status}`);

                    await adminClient.from('accounts').update({
                        plan_tier: tier,
                        subscription_status: subscription.status,
                        current_period_end: (subscription as any).current_period_end
                    }).eq('id', userId);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;

                const { data: accounts } = await adminClient
                    .from('accounts')
                    .select('id')
                    .eq('stripe_customer_id', subscription.customer as string);

                if (accounts && accounts.length > 0) {
                    const userId = accounts[0].id;
                    console.log(`[Webhook] Subscription Deleted/Canceled. User: ${userId}`);

                    await adminClient.from('accounts').update({
                        plan_tier: 'starter',
                        subscription_status: 'canceled',
                        current_period_end: null
                    }).eq('id', userId);
                }
                break;
            }
        }
    } catch (error) {
        console.error('[Webhook] Processing failed:', error);
        return NextResponse.json({ error: 'Webhook Handler Failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
