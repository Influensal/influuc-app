'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePosts } from '@/contexts';
import { SubscriptionTier, parseTier, getTierLimits } from '@/lib/subscription';

interface FeatureLockProps {
    children: ReactNode;
    feature: 'on-demand-carousels' | 'newsjacking' | 'faceless-visuals' | 'face-clone' | 'ideation';
    className?: string;
    overlayClassName?: string;
}

export function FeatureLock({ children, feature, className = '', overlayClassName = '' }: FeatureLockProps) {
    const { profile } = usePosts();
    const tier = parseTier(profile?.subscriptionTier);
    const limits = getTierLimits(tier);

    let isLocked = false;
    let requiredTier: SubscriptionTier = 'creator';
    let message = '';

    switch (feature) {
        case 'newsjacking':
            isLocked = !limits.hasNewsJacking;
            requiredTier = 'authority';
            message = 'Transform viral news into high-performing content.';
            break;
        case 'on-demand-carousels':
            isLocked = !limits.hasOnDemandCarousels;
            requiredTier = 'authority';
            message = 'Create stunning carousels from any idea instantly.';
            break;
        case 'faceless-visuals':
            isLocked = !limits.hasFacelessVisuals;
            requiredTier = 'creator';
            message = 'Generate high-quality faceless AI images.';
            break;
        case 'face-clone':
            isLocked = !limits.hasFaceClone;
            requiredTier = 'authority';
            message = 'Generate custom AI images with your own face.';
            break;
    }

    if (!isLocked) return <>{children}</>;

    return (
        <div className={`relative group/lock ${className}`}>
            {/* Blurry Content */}
            <div className="filter blur-[4px] pointer-events-none select-none opacity-50 grayscale">
                {children}
            </div>

            {/* Lock Overlay */}
            <div className={`absolute inset-0 z-50 flex items-center justify-center p-6 ${overlayClassName}`}>
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-sm w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl text-center space-y-6"
                >
                    <div className="w-16 h-16 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full flex items-center justify-center mx-auto">
                        <i className={`fi ${feature === 'newsjacking' ? 'fi-sr-newspaper' : 'fi-sr-lock'} text-2xl`}></i>
                    </div>
                    
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-[var(--foreground)] capitalize">
                            {feature.replace(/-/g, ' ')} Locked
                        </h3>
                        <p className="text-sm text-[var(--foreground-muted)]">
                            {message} Available on the <span className="font-bold text-[var(--primary)] capitalize">{requiredTier}</span> plan.
                        </p>
                    </div>

                    <Link
                        href="/dashboard/settings?tab=billing"
                        className="block w-full py-3 px-6 bg-[var(--primary)] text-white rounded-xl font-bold hover:bg-[var(--primary-hover)] transition-all shadow-lg shadow-[var(--primary)]/20"
                    >
                        Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}
