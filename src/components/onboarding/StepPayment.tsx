
import { useState } from 'react';
import { motion } from 'framer-motion';


interface StepPaymentProps {
    data: any;
    updateData: (data: any) => void;
    onNext: () => void;
}

export default function StepPayment({ data, updateData, onNext }: StepPaymentProps) {
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const plans = [
        {
            id: 'starter',
            name: 'Starter',
            price: 19,
            description: "For founders just starting to build a habit.",
            features: [
                '12 Weekly Posts (Text)',
                '30 Idea Generations / month',
                'X & LinkedIn Posting',
                'One-Click Publish',
            ],
            gradient: 'from-gray-500/20 to-gray-600/5',
            border: 'hover:border-gray-500/50',
            buttonGradient: 'hover:bg-gray-600',
            icon: 'fi-sr-user',
        },
        {
            id: 'creator',
            name: 'Creator',
            price: 39,
            popular: true,
            description: "Scale your presence with visual dominance.",
            features: [
                'Everything in Writer, plus:',
                'Unlimited Idea Generations',
                '2 AI Carousels / week',
                'Faceless Visuals Engine',
            ],
            gradient: 'from-blue-500/20 to-cyan-500/5',
            border: 'border-blue-500/50',
            buttonGradient: 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400',
            icon: 'fi-sr-bolt',
        },
        {
            id: 'authority',
            name: 'Authority',
            price: 49,
            description: "Dominate your niche with a digital twin.",
            features: [
                'Everything in Creator, plus:',
                '2 Branded Carousels / week',
                'Face Clone Visuals (Digital Twin)',
                'NewsJacking Engine (Daily Drafts)',
                'Priority Support',
            ],
            gradient: 'from-purple-500/20 to-pink-500/5',
            border: 'hover:border-purple-500/50',
            buttonGradient: 'bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400',
            icon: 'fi-sr-star',
        }
    ];

    const handleSelect = async (planId: string) => {
        setIsLoading(planId);
        const updatedData = { ...data, subscriptionTier: planId };
        updateData(updatedData);

        // Save to temp storage to persist across redirect
        localStorage.setItem('onboarding_temp_data', JSON.stringify(updatedData));

        try {
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tier: planId,
                    successUrl: `${window.location.origin}/onboarding?payment=success&session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: `${window.location.origin}/onboarding?payment=cancelled`
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create checkout session');
            }

            if (result.url) {
                window.location.href = result.url;
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (error) {
            console.error('Checkout failed', error);
            setIsLoading(null);
            alert(`Payment Error: ${(error as Error).message}. Please try again.`);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-5xl mx-auto py-8"
        >
            {/* Header */}
            <div className="text-center space-y-4 mb-12">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--foreground)]/5 border border-[var(--foreground)]/10 text-sm font-medium text-[var(--foreground-secondary)] backdrop-blur-md"
                >
                    <i className={`fi fi-sr-shield-check flex items-center justify-center ${"w-4 h-4 text-green-400"}`}  ></i>
                    <span>7-Day Free Trial. Cancel Anytime.</span>
                </motion.div>

                <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-[var(--foreground)] pb-2">
                    Choose your unfair advantage.
                </h1>
                <p className="text-xl text-[var(--foreground-muted)] max-w-2xl mx-auto font-light leading-relaxed">
                    Stop trading time for content. Start building a media company of one.
                </p>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

                {plans.map((plan, index) => (
                    <motion.div
                        key={plan.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + (index * 0.1) }}
                        className={`
                            relative flex flex-col p-8 rounded-3xl backdrop-blur-xl border transition-all duration-500 group
                            ${plan.popular
                                ? 'bg-[var(--background-secondary)] border-[var(--primary)]/20 shadow-2xl shadow-blue-500/10'
                                : 'bg-[var(--card)] hover:bg-[var(--background-secondary)]/50 border-[var(--border)] hover:border-[var(--primary)]/20'}
                        `}
                    >
                        {plan.popular && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                                <span className="relative flex h-3 w-3 mx-auto mb-1">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                </span>
                                <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full shadow-lg border border-white/10">
                                    Most Popular
                                </div>
                            </div>
                        )}

                        {/* Title & Price */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <i className={`fi ${plan.icon} w-5 h-5`}></i>
                                <h3 className="text-xl font-bold">{plan.name}</h3>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold tracking-tight">${plan.price}</span>
                                <span className="text-[var(--foreground-muted)]">/mo</span>
                            </div>
                            <p className="text-sm text-[var(--foreground-muted)] mt-2 font-medium">
                                {plan.description}
                            </p>
                        </div>

                        {/* Divider */}
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

                        {/* Features */}
                        <ul className="space-y-4 mb-8 flex-1">
                            {plan.features.map((feat, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-[var(--foreground-secondary)] group/item">
                                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-white/5 border border-white/10 ${plan.popular ? 'text-blue-400' : 'text-gray-400'} group-hover/item:bg-white/10 transition-colors`}>
                                        <i className={`fi fi-sr-check flex items-center justify-center ${"w-3 h-3"}`}  ></i>
                                    </div>
                                    <span className="leading-snug">{feat}</span>
                                </li>
                            ))}
                        </ul>

                        {/* Action Button */}
                        <button
                            onClick={() => handleSelect(plan.id)}
                            disabled={!!isLoading}
                            className={`
                                w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 relative overflow-hidden
                                ${plan.popular
                                    ? 'bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 shadow-lg shadow-white/10'
                                    : 'bg-[var(--foreground)]/5 text-[var(--foreground)] border border-[var(--foreground)]/10 hover:bg-[var(--foreground)]/10 hover:border-[var(--foreground)]/20'}
                                ${isLoading && isLoading !== plan.id ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {isLoading === plan.id ? (
                                <div className="flex items-center justify-center gap-2">
                                    <i className={`fi fi-sr-spinner flex items-center justify-center ${"w-4 h-4 animate-spin"}`}  ></i>
                                    <span>Processing...</span>
                                </div>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    {plan.popular && <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-4 h-4 text-blue-500"}`}  ></i>}
                                    Choose {plan.name}
                                </span>
                            )}
                        </button>
                    </motion.div>
                ))}
            </div>

            <p className="text-center text-xs text-[var(--foreground-muted)] mt-12 opacity-50 hover:opacity-100 transition-opacity">
                Secure payment powered by Stripe. You won't be charged until after your trial.
            </p>
        </motion.div>
    );
}
