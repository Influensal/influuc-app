
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
    try {
        const supabase = await createClient();

        // 1. Auth Check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch Subscription Details
        const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('account_id', user.id)
            .single();

        // 3. Fetch Profile (fallback for tier if subscription missing/incomplete)
        const { data: profile } = await supabase
            .from('founder_profiles')
            .select('subscription_tier')
            .eq('account_id', user.id)
            .single();

        // 4. Determine Tier & Status
        let tier = 'starter';
        let status = 'active';
        let currentPeriodEnd = null;
        let stripeCustomerId = null;
        let stripeSubscriptionId = null;
        let cancelAtPeriodEnd = false;
        let plan = 'starter';
        let cancelOfferClaimed = false;

        if (subscription) {
            status = subscription.status;
            currentPeriodEnd = subscription.current_period_end;
            stripeCustomerId = subscription.stripe_customer_id;
            stripeSubscriptionId = subscription.stripe_subscription_id;
            cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
            cancelOfferClaimed = subscription.cancel_offer_claimed || false;
            plan = subscription.plan || 'starter';
            tier = plan;
        } else if (profile?.subscription_tier) {
            tier = profile.subscription_tier;
            plan = tier;
        }

        // Return structured data for UI
        return NextResponse.json({
            subscription: {
                tier,
                plan,
                status,
                currentPeriodEnd,
                stripeCustomerId,
                stripeSubscriptionId,
                cancelAtPeriodEnd,
                cancelOfferClaimed,
            }
        });

    } catch (error) {
        console.error('Subscription API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
