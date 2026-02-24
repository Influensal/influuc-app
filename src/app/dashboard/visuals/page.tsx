'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts';
import { Camera, Focus, Lock, Sparkles } from 'lucide-react';
import { ImageGenerator } from '@/components/dashboard/visuals/ImageGenerator';
import { DigitalTwinTraining } from '@/components/dashboard/visuals/DigitalTwinTraining';

export default function VisualsStudioPage() {
    const { activeProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<'faceless' | 'digital_twin'>('faceless');

    const tier = activeProfile?.subscription_tier || 'starter';
    const hasFacelessAccess = tier === 'creator' || tier === 'authority';
    const hasTwinAccess = tier === 'authority';

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <div className="max-w-7xl mx-auto p-6 md:p-8">
                {/* Header Section */}
                <div className="mb-10 text-center md:text-left">
                    <h1 className="text-4xl md:text-5xl font-black text-[var(--foreground)] tracking-tight mb-4">
                        AI Visuals <span className="text-[var(--primary)] text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">Studio</span>
                    </h1>
                    <p className="text-lg text-[var(--foreground-muted)] max-w-2xl">
                        Generate breathtaking, high-converting images for your social posts. Switch between Faceless abstracts and your trained Digital Twin.
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-2 md:space-x-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('faceless')}
                        className={`flex items-center px-5 py-3 rounded-xl font-medium transition-all duration-300 relative overflow-hidden ${activeTab === 'faceless'
                            ? 'text-white shadow-lg border border-[var(--primary)]'
                            : 'text-[var(--foreground-muted)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)]'
                            }`}
                    >
                        {activeTab === 'faceless' && (
                            <motion.div
                                layoutId="activeTabIndicator"
                                className="absolute inset-0 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]"
                            />
                        )}
                        <Focus className="w-5 h-5 mr-3 z-10 relative" />
                        <span className="z-10 relative">Faceless Studio</span>
                        {!hasFacelessAccess && <Lock className="w-4 h-4 ml-3 opacity-50 z-10 relative" />}
                    </button>

                    <button
                        onClick={() => setActiveTab('digital_twin')}
                        className={`flex items-center px-5 py-3 rounded-xl font-medium transition-all duration-300 relative overflow-hidden ${activeTab === 'digital_twin'
                            ? 'text-white shadow-lg border border-[var(--primary)]'
                            : 'text-[var(--foreground-muted)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)]'
                            }`}
                    >
                        {activeTab === 'digital_twin' && (
                            <motion.div
                                layoutId="activeTabIndicator"
                                className="absolute inset-0 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]"
                            />
                        )}
                        <Camera className="w-5 h-5 mr-3 z-10 relative" />
                        <span className="z-10 relative">Digital Twin</span>
                        {!hasTwinAccess && <Lock className="w-4 h-4 ml-3 opacity-50 z-10 relative" />}
                    </button>
                </div>

                {/* Main Content Area */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === 'faceless' && (
                            hasFacelessAccess ? (
                                <ImageGenerator mode="faceless" />
                            ) : (
                                <div className="p-12 text-center bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                                    <Lock className="w-12 h-12 text-[var(--primary)] mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">Upgrade to Creator</h2>
                                    <p className="text-[var(--foreground-muted)] mb-6">
                                        Faceless AI Visuals are available on the Creator and Authority tiers. Upgrade your plan to unlock high-end image generation.
                                    </p>
                                    <button className="px-6 py-3 bg-[var(--primary)] text-white font-bold rounded-xl hover:bg-[var(--primary-dark)] transition-all">
                                        Upgrade Plan
                                    </button>
                                </div>
                            )
                        )}

                        {activeTab === 'digital_twin' && (
                            hasTwinAccess ? (
                                <div className="space-y-8">
                                    {/* If they haven't trained a model, show training. If they have, show generator */}
                                    {activeProfile?.visual_training_status !== 'completed' ? (
                                        <DigitalTwinTraining activeProfile={activeProfile} />
                                    ) : (
                                        <ImageGenerator mode="digital_twin" />
                                    )}
                                </div>
                            ) : (
                                <div className="p-12 text-center bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                                    <Sparkles className="w-12 h-12 text-[var(--warning)] mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">Unlock Digital Twin</h2>
                                    <p className="text-[var(--foreground-muted)] mb-6 max-w-lg mx-auto">
                                        Train a custom AI model on your face and generate hyper-realistic photos of yourself in any setting. Exclusive to the Authority tier.
                                    </p>
                                    <button className="px-6 py-3 bg-[var(--warning)] text-black font-bold rounded-xl hover:opacity-90 transition-all">
                                        Upgrade to Authority
                                    </button>
                                </div>
                            )
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
