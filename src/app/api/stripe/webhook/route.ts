
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

// This secret comes from the Stripe Dashboard > Developers > Webhooks
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    if (!WEBHOOK_SECRET) {
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
                    await adminClient.from('founder_profiles').update({
                        subscription_tier: tier,
                        // stripe_subscription_id: subscriptionId, // If we had this column
                        // stripe_customer_id: session.customer as string
                    }).eq('id', userId);
                    console.log(`[Stripe Webhook] Updated user ${userId} to tier ${tier}`);
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
        console.error('Error processing webhook event:', err);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
