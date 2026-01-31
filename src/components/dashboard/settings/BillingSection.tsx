import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, CreditCard, Zap, Shield, Sparkles } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

type Tier = 'starter' | 'growth' | 'authority';

interface BillingSectionProps {
    className?: string;
}

export function BillingSection({ className }: BillingSectionProps) {
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<any>(null);
    const [processingTier, setProcessingTier] = useState<Tier | null>(null);

    useEffect(() => {
        fetchSubscription();
    }, []);

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

    const handleUpgrade = async (tier: Tier) => {
        setProcessingTier(tier);
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tier,
                    successUrl: window.location.href + '?payment=success',
                    cancelUrl: window.location.href + '?payment=cancelled'
                })
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert('Failed to start checkout');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Something went wrong');
        } finally {
            setProcessingTier(null);
        }
    };

    const handleManage = async () => {
        setProcessingTier('starter'); // Use starter as placeholder for loading
        try {
            const res = await fetch('/api/stripe/portal', {
                method: 'POST'
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            alert('Failed to open billing portal');
        } finally {
            setProcessingTier(null);
        }
    };

    const currentTier = subscription?.tier || 'starter';

    const plans = [
        {
            id: 'starter',
            name: 'Starter',
            price: 'Free',
            description: 'Essential tools for content creation',
            features: ['30 Ideas / Month', 'Basic Text Posts', 'Manual Scheduling', 'No AI Visuals'],
            icon: Zap,
            highlight: false
        },
        {
            id: 'growth',
            name: 'Creator',
            price: '$29/mo',
            description: 'Power up your personal brand',
            features: ['Unlimited Ideas', '2 Carousels / Week', 'Faceless AI Visuals', 'Priority Support'],
            icon: Sparkles,
            highlight: true
        },
        {
            id: 'authority',
            name: 'Authority',
            price: '$49/mo',
            description: 'Complete dominance',
            features: ['Everything in Creator', 'AI Face Clone', 'NewsJacking Engine', 'Advanced Analytics'],
            icon: Shield,
            highlight: false
        }
    ];

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={className}>
            {/* Current Plan Card */}
            <div className="card p-8 border border-[var(--border)] bg-[var(--card)] rounded-2xl mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Current Plan: {currentTier === 'growth' ? 'Creator' : currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</h2>
                    <p className="text-[var(--foreground-muted)]">
                        Status: <span className="capitalize font-medium text-[var(--foreground)]">{subscription?.status || 'Active'}</span>
                        {subscription?.currentPeriodEnd && ` • Renews: ${new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}`}
                    </p>
                </div>
                {currentTier !== 'starter' && (
                    <button
                        onClick={handleManage}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--background-secondary)] transition-all font-semibold"
                    >
                        <CreditCard className="w-4 h-4" />
                        Manage Subscription
                    </button>
                )}
            </div>

            {/* Plan Grid */}
            <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => {
                    const isCurrent = currentTier === plan.id;
                    const Icon = plan.icon;

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
                                    <Icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold">{plan.name}</h3>
                                <div className="text-2xl font-bold mt-2 mb-1">{plan.price}</div>
                                <p className="text-sm text-[var(--foreground-muted)]">{plan.description}</p>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <CheckCircle2 className={`w-4 h-4 mt-0.5 ${plan.highlight ? 'text-[var(--primary)]' : 'text-[var(--foreground-muted)]'}`} />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleUpgrade(plan.id as Tier)}
                                disabled={isCurrent || !!processingTier}
                                className={`
                                    w-full py-3 rounded-xl font-bold text-sm transition-all
                                    ${isCurrent
                                        ? 'bg-[var(--background-secondary)] text-[var(--foreground-muted)] cursor-default'
                                        : plan.highlight
                                            ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-md hover:shadow-lg'
                                            : 'bg-[var(--foreground)] text-[var(--background)] hover:opacity-90'}
                                `}
                            >
                                {isCurrent ? 'Current Plan' : processingTier === plan.id ? <Loader2 className="w-4 h-4 mx-auto animate-spin" /> : 'Upgrade'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}
