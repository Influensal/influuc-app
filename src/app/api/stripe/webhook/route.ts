
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { TIER_DB_FEATURES, createAdminSupabaseClient } from '@/lib/subscription';
import Stripe from 'stripe';

export const runtime = 'nodejs';

// This secret comes from the Stripe Dashboard > Developers > Webhooks
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Helper to get tier from subscription metadata
const getTierFromSubscription = (subscription: Stripe.Subscription | Stripe.Response<Stripe.Subscription>): string => {
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

    const adminClient = createAdminSupabaseClient();

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
                const features = TIER_DB_FEATURES[tier as keyof typeof TIER_DB_FEATURES] || TIER_DB_FEATURES.starter;

                console.log(`[Webhook] Checkout Completed. User: ${userId}, Tier: ${tier}`);

                // 1. Upsert into subscriptions table
                await adminClient.from('subscriptions').upsert({
                    account_id: userId,
                    stripe_customer_id: session.customer as string,
                    stripe_subscription_id: subscriptionId,
                    plan: tier,
                    status: 'active',
                    current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
                    current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
                }, { onConflict: 'account_id' });

                // 2. Update founder_profiles with tier + features
                await adminClient.from('founder_profiles').update({
                    subscription_tier: tier,
                    ...features,
                }).eq('account_id', userId);

                console.log(`[Webhook] Updated subscriptions + founder_profiles for ${userId}`);
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const tier = getTierFromSubscription(subscription);
                const features = TIER_DB_FEATURES[tier as keyof typeof TIER_DB_FEATURES] || TIER_DB_FEATURES.starter;

                // Find user by stripe_customer_id in subscriptions table
                const { data: sub } = await adminClient
                    .from('subscriptions')
                    .select('account_id')
                    .eq('stripe_customer_id', subscription.customer as string)
                    .single();

                if (sub) {
                    const userId = sub.account_id;
                    console.log(`[Webhook] Subscription Updated. User: ${userId}, Status: ${subscription.status}, Tier: ${tier}`);

                    await adminClient.from('subscriptions').update({
                        plan: tier,
                        status: subscription.status,
                        current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
                    }).eq('account_id', userId);

                    await adminClient.from('founder_profiles').update({
                        subscription_tier: tier,
                        ...features,
                    }).eq('account_id', userId);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;

                const { data: sub } = await adminClient
                    .from('subscriptions')
                    .select('account_id')
                    .eq('stripe_customer_id', subscription.customer as string)
                    .single();

                if (sub) {
                    const userId = sub.account_id;
                    console.log(`[Webhook] Subscription Deleted/Canceled. User: ${userId}`);

                    await adminClient.from('subscriptions').update({
                        plan: 'starter',
                        status: 'canceled',
                        current_period_end: null,
                    }).eq('account_id', userId);

                    await adminClient.from('founder_profiles').update({
                        subscription_tier: 'starter',
                        ...TIER_DB_FEATURES.starter,
                    }).eq('account_id', userId);
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
