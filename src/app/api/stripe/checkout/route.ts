
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';

// Map internal tier IDs to your actual Stripe Price IDs
const PRICE_IDS: Record<string, string | undefined> = {
    starter: process.env.STRIPE_PRICE_ID_STARTER,
    creator: process.env.STRIPE_PRICE_ID_GROWTH,
    authority: process.env.STRIPE_PRICE_ID_AUTHORITY,
};

// Tier hierarchy for determining upgrade vs downgrade
const TIER_ORDER: Record<string, number> = {
    starter: 0,
    creator: 1,
    authority: 2,
};

export async function POST(req: NextRequest) {
    try {
        const { tier, successUrl, cancelUrl } = await req.json();
        const priceId = PRICE_IDS[tier];

        console.log(`[Checkout] Tier: ${tier}, PriceID: ${priceId}`);

        if (!priceId) {
            return NextResponse.json({ error: 'Invalid tier or missing Price ID configuration' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ── CHECK FOR EXISTING SUBSCRIPTION ──
        // If user already has an active Stripe subscription, SWAP the plan
        // instead of creating a new checkout (which would double-charge them)
        const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('stripe_subscription_id, plan, status')
            .eq('account_id', user.id)
            .single();

        if (existingSub?.stripe_subscription_id && ['active', 'trialing'].includes(existingSub.status)) {
            // User already has an active subscription — swap the plan
            try {
                const stripeSubscription = await stripe.subscriptions.retrieve(existingSub.stripe_subscription_id);
                const currentItem = stripeSubscription.items.data[0];

                if (!currentItem) {
                    throw new Error('No subscription items found');
                }

                const isUpgrade = (TIER_ORDER[tier] || 0) > (TIER_ORDER[existingSub.plan] || 0);

                // Update the subscription to the new price
                const updated = await stripe.subscriptions.update(existingSub.stripe_subscription_id, {
                    items: [{
                        id: currentItem.id,
                        price: priceId,
                    }],
                    // Upgrades: charge immediately (prorate)
                    // Downgrades: apply at next billing cycle
                    proration_behavior: isUpgrade ? 'create_prorations' : 'none',
                    payment_behavior: isUpgrade ? 'error_if_incomplete' : 'allow_incomplete',
                    metadata: {
                        supabase_user_id: user.id,
                        tier: tier,
                    },
                    // For downgrades, don't apply until next billing cycle
                    ...(isUpgrade ? {} : {
                        cancel_at_period_end: false, // Ensure not set to cancel
                    }),
                });

                console.log(`[Checkout] Swapped subscription ${existingSub.stripe_subscription_id} from ${existingSub.plan} → ${tier} (${isUpgrade ? 'upgrade' : 'downgrade'})`);

                // Update local DB immediately
                await supabase
                    .from('subscriptions')
                    .update({
                        plan: tier,
                        status: updated.status,
                        cancel_at_period_end: false,
                    })
                    .eq('account_id', user.id);

                // Also update founder_profiles tier
                await supabase
                    .from('founder_profiles')
                    .update({ subscription_tier: tier })
                    .eq('account_id', user.id);

                return NextResponse.json({
                    success: true,
                    action: isUpgrade ? 'upgraded' : 'downgraded',
                    tier,
                    message: isUpgrade
                        ? `Upgraded to ${tier}! Your card will be prorated.`
                        : `Downgraded to ${tier}. Change applies at next billing cycle.`,
                });

            } catch (swapError) {
                console.error('[Checkout] Subscription swap failed, falling back to new checkout:', swapError);
                // Fall through to create new checkout session
            }
        }

        // ── NO EXISTING SUBSCRIPTION — Create new Checkout Session ──
        const origin = req.headers.get('origin') || 'http://localhost:3000';

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            customer_email: user.email,
            client_reference_id: user.id,
            subscription_data: {
                trial_period_days: 7,
                metadata: {
                    supabase_user_id: user.id,
                    tier: tier,
                },
            },
            success_url: successUrl || `${origin}/dashboard/settings?tab=billing&payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${origin}/dashboard/settings?tab=billing&payment=cancelled`,
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
