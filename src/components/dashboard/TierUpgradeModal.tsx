
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import StepVisualFork from '@/components/onboarding/StepVisualFork';

export default function TierUpgradeModal() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get('session_id');
    const paymentStatus = searchParams.get('payment');

    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tier, setTier] = useState<string | null>(null);
    const [upgradeData, setUpgradeData] = useState<any>({});

    useEffect(() => {
        const checkSession = async () => {
            if (sessionId && paymentStatus === 'success' && !tier) {
                setLoading(true);
                try {
                    const res = await fetch(`/api/stripe/checkout-session?session_id=${sessionId}`);
                    const data = await res.json();

                    if (data.tier && (data.tier === 'growth' || data.tier === 'authority')) {
                        setTier(data.tier);
                        setUpgradeData({ subscriptionTier: data.tier });
                        setIsOpen(true);

                        // Clean URL to prevent re-triggering? 
                        // Actually, better to keep until done or closed.
                    }
                } catch (err) {
                    console.error('Failed to verify session', err);
                } finally {
                    setLoading(false);
                }
            }
        };

        checkSession();
    }, [sessionId, paymentStatus, tier]);

    const handleUpdate = (newData: any) => {
        setUpgradeData((prev: any) => ({ ...prev, ...newData }));
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            // Save preferences
            await fetch('/api/profile', {
                method: 'PATCH', // Assuming PATCH updates profile fields
                body: JSON.stringify(upgradeData)
            });

            // Optimistic update / refresh
            setIsOpen(false);
            router.refresh(); // Refresh server components

            // Clean URL
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('session_id');
            newParams.delete('payment');
            router.replace(`?${newParams.toString()}`);

        } catch (err) {
            console.error('Failed to save upgrade preferences', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative w-full max-w-2xl bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                >
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--background-secondary)]"
                    >
                        <X className="w-5 h-5 text-[var(--foreground-muted)]" />
                    </button>

                    <div className="p-8">
                        <h2 className="text-2xl font-bold mb-2">🎉 Upgrade Successful!</h2>
                        <p className="text-[var(--foreground-muted)] mb-8">
                            Let's set up your new {tier === 'authority' ? 'Authority' : 'Creator'} features.
                        </p>

                        <StepVisualFork
                            data={upgradeData}
                            updateData={handleUpdate}
                            onComplete={handleComplete}
                        />
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
