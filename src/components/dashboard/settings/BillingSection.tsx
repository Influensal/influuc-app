import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { usePosts } from '@/contexts/PostContext';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

type Tier = 'starter' | 'creator' | 'authority';

const TIER_ORDER: Record<Tier, number> = {
    starter: 0,
    creator: 1,
    authority: 2,
};

interface BillingSectionProps {
    className?: string;
}

export function BillingSection({ className }: BillingSectionProps) {
    const [loading, setLoading] = useState(true);
    const { refreshPosts } = usePosts();
    const [subscription, setSubscription] = useState<any>(null);
    const [processingTier, setProcessingTier] = useState<Tier | null>(null);
    const [processingAction, setProcessingAction] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchSubscription();
    }, []);

    // Auto-dismiss action messages after 5 seconds
    useEffect(() => {
        if (actionMessage) {
            const timer = setTimeout(() => setActionMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [actionMessage]);

    const fetchSubscription = async () => {
        try {
            const res = await fetch('/api/subscription');
            const data = await res.json();
            if (data.subscription) {
                setSubscription(data.subscription);
            }
        } catch (error) {
            console.error('Failed to fetch subscription', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlanChange = async (tier: Tier) => {
        setProcessingTier(tier);
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tier,
                    successUrl: `${window.location.origin}${window.location.pathname}?tab=billing&payment=success&session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: `${window.location.origin}${window.location.pathname}?tab=billing&payment=cancelled`
                })
            });
            const data = await res.json();

            if (data.success) {
                // In-app plan swap (no redirect needed)
                setActionMessage({
                    type: 'success',
                    text: data.message || `Plan changed to ${tier}!`
                });
                await fetchSubscription(); // Refresh local billing data
                await refreshPosts(); // Refresh global profile/tier data
            } else if (data.url) {
                // New checkout redirect (first-time subscriber)
                window.location.href = data.url;
            } else {
                setActionMessage({ type: 'error', text: data.error || 'Failed to change plan' });
            }
        } catch (error) {
            console.error('Plan change error:', error);
            setActionMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
        } finally {
            setProcessingTier(null);
        }
    };


    const handleManageBilling = async () => {
        setProcessingAction('portal');
        try {
            const res = await fetch('/api/stripe/portal', { method: 'POST' });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setActionMessage({ type: 'error', text: 'Could not open billing portal' });
            }
        } catch (error) {
            setActionMessage({ type: 'error', text: 'Failed to open billing portal' });
        } finally {
            setProcessingAction(null);
        }
    };

    const currentTier = (subscription?.tier || 'starter') as Tier;
    const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd || false;
    const isCanceled = subscription?.status === 'canceled';
    const isPastDue = subscription?.status === 'past_due';
    const cancelOfferClaimed = subscription?.cancelOfferClaimed || false;

    const getButtonLabel = (planTier: Tier): string => {
        if (currentTier === planTier) return 'Current Plan';
        const currentOrder = TIER_ORDER[currentTier];
        const targetOrder = TIER_ORDER[planTier];
        return targetOrder > currentOrder ? 'Upgrade' : 'Downgrade';
    };

    const getButtonStyle = (planTier: Tier, isHighlight: boolean): string => {
        if (currentTier === planTier) return 'bg-[var(--background-secondary)] text-[var(--foreground-muted)] cursor-default';
        const isUpgrade = TIER_ORDER[planTier] > TIER_ORDER[currentTier];
        if (isUpgrade) {
            return isHighlight
                ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-md hover:shadow-lg'
                : 'bg-[var(--foreground)] text-[var(--background)] hover:opacity-90';
        }
        // Downgrade — subtle style
        return 'bg-transparent border-2 border-[var(--border)] text-[var(--foreground-secondary)] hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)]';
    };

    const plans = [
        {
            id: 'starter' as Tier,
            name: 'Starter',
            price: '$19/mo',
            description: 'Essential tools for content creation',
            features: ['30 Ideas / Month', 'Basic Text Posts', 'Manual Scheduling', 'No AI Visuals'],
            icon: 'fi-sr-bolt',
            highlight: false
        },
        {
            id: 'creator' as Tier,
            name: 'Creator',
            price: '$39/mo',
            description: 'Power up your personal brand',
            features: ['Unlimited Ideas', '2 Carousels / Week', 'Faceless AI Visuals', 'Priority Support'],
            icon: 'fi-sr-magic-wand',
            highlight: true
        },
        {
            id: 'authority' as Tier,
            name: 'Authority',
            price: '$49/mo',
            description: 'Complete dominance',
            features: ['Everything in Creator', 'AI Face Clone', 'NewsJacking Engine', 'Advanced Analytics'],
            icon: 'fi-sr-shield',
            highlight: false
        }
    ];

    if (loading) {
        return (
            <div className="p-8 flex justify-center">
                <i className="fi fi-sr-spinner flex items-center justify-center w-6 h-6 animate-spin text-[var(--primary)]"></i>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={className}>

            {/* Action Message */}
            {actionMessage && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${actionMessage.type === 'success'
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400'
                        }`}
                >
                    <i className={`fi ${actionMessage.type === 'success' ? 'fi-sr-check-circle' : 'fi-sr-cross-circle'} flex items-center justify-center w-5 h-5`}></i>
                    <span className="text-sm font-medium">{actionMessage.text}</span>
                </motion.div>
            )}

            {/* Status Banners */}
            {cancelAtPeriodEnd && subscription?.currentPeriodEnd && (
                <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <i className="fi fi-sr-triangle-warning flex items-center justify-center w-5 h-5 text-amber-600 dark:text-amber-400"></i>
                        <div>
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Cancellation Pending</p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                Your plan will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. You'll keep full access until then.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleManageBilling}
                        disabled={!!processingAction}
                        className="px-4 py-2 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all disabled:opacity-50"
                    >
                        {processingAction === 'portal' ? 'Opening...' : 'Manage Billing'}
                    </button>
                </div>
            )}

            {isCanceled && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                    <i className="fi fi-sr-cross-circle flex items-center justify-center w-5 h-5 text-red-600 dark:text-red-400"></i>
                    <div>
                        <p className="text-sm font-semibold text-red-700 dark:text-red-300">Subscription Expired</p>
                        <p className="text-xs text-red-600 dark:text-red-400">Your subscription has ended. Choose a plan below to resubscribe.</p>
                    </div>
                </div>
            )}

            {isPastDue && (
                <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
                    <i className="fi fi-sr-exclamation flex items-center justify-center w-5 h-5 text-orange-600 dark:text-orange-400"></i>
                    <div>
                        <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">Payment Failed</p>
                        <p className="text-xs text-orange-600 dark:text-orange-400">Your last payment failed. Please update your payment method to keep your subscription active.</p>
                    </div>
                </div>
            )}

            {/* Current Plan Card */}
            <div className="card p-8 border border-[var(--border)] bg-[var(--card)] rounded-2xl mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">
                            Current Plan: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
                            {cancelAtPeriodEnd && <span className="ml-2 text-sm font-medium text-amber-500">(Cancelling)</span>}
                        </h2>
                        <p className="text-[var(--foreground-muted)]">
                            Status: <span className={`capitalize font-medium ${isCanceled ? 'text-red-500' : isPastDue ? 'text-orange-500' : 'text-emerald-500'}`}>
                                {isCanceled ? 'Expired' : isPastDue ? 'Payment Failed' : cancelAtPeriodEnd ? 'Cancelling' : 'Active'}
                            </span>
                            {subscription?.currentPeriodEnd && !isCanceled && (
                                <span className="ml-1">
                                    • {cancelAtPeriodEnd ? 'Ends' : 'Renews'}: {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Always show Manage Billing for payment methods / invoices */}
                        {subscription?.stripeCustomerId && (
                            <button
                                onClick={handleManageBilling}
                                disabled={!!processingAction}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--background-secondary)] transition-all font-semibold text-sm"
                            >
                                <i className="fi fi-sr-credit-card flex items-center justify-center w-4 h-4"></i>
                                {processingAction === 'portal' ? 'Opening...' : 'Manage Billing'}
                            </button>
                        )}

                        {/* Cancel button — only for active, non-starter, non-pending-cancel AND has Stripe Sub */}
                        {currentTier !== 'starter' && !cancelAtPeriodEnd && !isCanceled && subscription?.stripeSubscriptionId && (
                            <button
                                onClick={handleManageBilling}
                                disabled={!!processingAction}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all font-semibold text-sm"
                            >
                                {processingAction === 'portal' ? 'Opening...' : 'Cancel in Stripe'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Plan Grid */}
            <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => {
                    const isCurrent = currentTier === plan.id;
                    const buttonLabel = getButtonLabel(plan.id);
                    const buttonStyle = getButtonStyle(plan.id, plan.highlight);

                    return (
                        <div
                            key={plan.id}
                            className={`
                                relative p-6 rounded-2xl border flex flex-col transition-all duration-300
                                ${plan.highlight ? 'border-[var(--primary)] shadow-lg shadow-[var(--primary)]/10 bg-[var(--primary)]/5' : 'border-[var(--border)] bg-[var(--card)]'}
                                ${isCurrent ? 'ring-2 ring-[var(--foreground)]' : ''}
                            `}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--primary)] text-white text-xs font-bold rounded-full uppercase tracking-wider">
                                    Popular
                                </div>
                            )}

                            <div className="mb-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.highlight ? 'bg-[var(--primary)] text-white' : 'bg-[var(--background-secondary)]'}`}>
                                    <i className={`fi ${plan.icon} flex items-center justify-center w-6 h-6`}></i>
                                </div>
                                <h3 className="text-xl font-bold">{plan.name}</h3>
                                <div className="text-2xl font-bold mt-2 mb-1">{plan.price}</div>
                                <p className="text-sm text-[var(--foreground-muted)]">{plan.description}</p>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <i className={`fi fi-sr-check flex items-center justify-center w-4 h-4 mt-0.5 shrink-0 ${plan.highlight ? 'text-[var(--primary)]' : 'text-[var(--foreground-muted)]'}`}></i>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handlePlanChange(plan.id)}
                                disabled={isCurrent || !!processingTier}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${buttonStyle}`}
                            >
                                {processingTier === plan.id ? (
                                    <i className="fi fi-sr-spinner flex items-center justify-center w-4 h-4 mx-auto animate-spin"></i>
                                ) : buttonLabel}
                            </button>
                        </div>
                    );
                })}
            </div>


        </motion.div>
    );
}
