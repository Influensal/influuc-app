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

        // 2. Fetch Account Details (Subscription Info)
        const { data: account, error: accountError } = await supabase
            .from('accounts')
            .select(`
                id,
                plan_tier,
                subscription_status,
                stripe_customer_id,
                current_period_end
            `)
            .eq('id', user.id)
            .single();

        if (accountError) {
            console.error('Error fetching account:', accountError);
            return NextResponse.json({ error: 'Failed to fetch account details' }, { status: 500 });
        }

        // 3. Subscription Details
        const rawTier = account.plan_tier || 'starter';
        let normalizedTier = rawTier;

        // Map legacy/DB tiers to UI tiers
        if (rawTier === 'solo') normalizedTier = 'starter';
        else if (rawTier === 'team') normalizedTier = 'growth';
        else if (rawTier === 'scale') normalizedTier = 'authority';

        // Return structured data for UI
        return NextResponse.json({
            subscription: {
                tier: normalizedTier,
                status: account.subscription_status || 'active', // default active for free tier if null
                currentPeriodEnd: account.current_period_end,
                stripeCustomerId: account.stripe_customer_id
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
