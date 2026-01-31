
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';
import { logger, startTimer } from '@/lib/logger';

// This secret comes from the Stripe Dashboard > Developers > Webhooks
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    const timer = startTimer();

    if (!WEBHOOK_SECRET) {
        logger.error('Missing STRIPE_WEBHOOK_SECRET');
        return NextResponse.json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 500 });
    }

    const sig = req.headers.get('stripe-signature');
    const body = await req.text();

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, sig!, WEBHOOK_SECRET);
    } catch (err: any) {
        logger.warn('Webhook signature verification failed', { error: err.message });
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    const supabase = await createClient(); // Use service role if needed for writing? Auth helper uses cookie context; might need admin client here.
    // For webhooks, we usually need the admin (service_role) client because we don't have a user session.
    // We'll trust the event content.
    // Use the non-auth supabase client? Or just direct SQL?
    // Actually, createClient from server uses cookies. We need a service role client.
    // Assuming we have SUPABASE_SERVICE_ROLE_KEY environment variable.

    // NOTE: In this basic setup, we'll assume we can handle it or use a raw connection if imported.
    // Let's rely on standard logic but keep in mind RLS might block if we don't use service role.
    // For now we will try to update using the standard client but we might need `supabase-admin` helper.

    // Wait, createClient() uses cookies. We DON'T have cookies in a webhook. 
    // We should assume we have a way to get admin client or use standard supabase-js with service key.

    const adminClient = await import('@supabase/supabase-js').then(mod => {
        return mod.createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    });

    // ============================================
    // IDEMPOTENCY CHECK - Prevent duplicate processing
    // Stripe can deliver the same webhook multiple times
    // ============================================
    const eventId = event.id;
    const { data: existingEvent } = await adminClient
        .from('stripe_events')
        .select('id')
        .eq('event_id', eventId)
        .single();

    if (existingEvent) {
        console.log(`[Stripe Webhook] Event ${eventId} already processed, skipping`);
        return NextResponse.json({ received: true, skipped: true });
    }

    // Record that we're processing this event (before doing work)
    await adminClient.from('stripe_events').insert({
        event_id: eventId,
        event_type: event.type,
        payload: event.data.object
    });

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.client_reference_id;
                // We might get tier from metadata if we added it, or deduce from price ID.
                // In checkout route we added: metadata: { tier: tier } in subscription_data.
                // Wait, subscription_data metadata is for the subscription object.
                // The Session object also has metadata if we put it there.
                // Let's check session.subscription to get the actual subscription object if needed.

                // Let's retrieve subscription to start valid tracking
                const subscriptionId = session.subscription as string;
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const tier = subscription.metadata.tier || 'starter'; // Fallback

                if (userId) {
                    // Update founder_profiles - use account_id (FK to auth.users), not id
                    await adminClient.from('founder_profiles').update({
                        subscription_tier: tier,
                        onboarding_status: 'complete', // Payment successful = onboarding complete
                    }).eq('account_id', userId);

                    // Also update accounts table with Stripe info
                    await adminClient.from('accounts').update({
                        subscription_status: 'active',
                        stripe_subscription_id: subscriptionId,
                        stripe_customer_id: session.customer as string,
                    }).eq('id', userId);

                    logger.info('Stripe subscription activated', { userId, tier, subscriptionId, duration_ms: timer() });
                }
                break;
            }
            case 'customer.subscription.updated': {
                // Handle upgrades/downgrades/cancellations
                const subscription = event.data.object as Stripe.Subscription;
                const tier = subscription.metadata.tier; // Might be preserved
                // We'd need to lookup user by customer ID if we stored it.
                // For MVP, checkout session completed is the main activator.
                break;
            }
            case 'customer.subscription.deleted': {
                // Handle churn
                break;
            }
        }
    } catch (err: any) {
        logger.exception('Webhook processing failed', err, { eventType: event.type, duration_ms: timer() });
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }

    logger.info('Webhook processed', { eventType: event.type, duration_ms: timer() });
    return NextResponse.json({ received: true });
}
