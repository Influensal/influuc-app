import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get customer ID from DB
        const { data: account } = await supabase
            .from('accounts')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single();

        if (!account?.stripe_customer_id) {
            return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
        }

        // Create Portal Session
        const session = await stripe.billingPortal.sessions.create({
            customer: account.stripe_customer_id,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings?tab=billing`,
        });

        return NextResponse.json({ url: session.url });

    } catch (error) {
        console.error('Stripe Portal Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
