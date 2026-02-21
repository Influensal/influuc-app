
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { TIER_DB_FEATURES, createAdminSupabaseClient } from '@/lib/subscription';
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
            // Force update database to ensure UI reflects payment immediately
            // This acts as a backup even if webhook fails (e.g. localhost)
            const userId = session.client_reference_id;
            if (userId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
                const adminClient = createAdminSupabaseClient();
                const features = TIER_DB_FEATURES[tier as keyof typeof TIER_DB_FEATURES] || TIER_DB_FEATURES.starter;

                // 1. Upsert into subscriptions table
                const { error: subError } = await adminClient.from('subscriptions').upsert({
                    account_id: userId,
                    stripe_customer_id: session.customer as string,
                    stripe_subscription_id: session.subscription as string,
                    plan: tier,
                    status: 'active',
                    current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
                    current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
                }, { onConflict: 'account_id' });

                if (subError) {
                    console.error('[Lazy Sync] Failed to upsert subscription:', subError);
                }

                // 2. Update founder_profiles with tier + features
                const { error: profileError } = await adminClient.from('founder_profiles').update({
                    subscription_tier: tier,
                    ...features,
                }).eq('account_id', userId);

                if (profileError) {
                    console.error('[Lazy Sync] Failed to update profile:', profileError);
                }

                console.log(`[Lazy Sync] Synced subscription for ${userId} to tier=${tier}`);
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
