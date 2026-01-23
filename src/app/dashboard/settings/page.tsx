'use client';

import { useState, useEffect } from 'react';
import { usePosts } from '@/contexts';
import {
    Twitter,
    Linkedin,
    CheckCircle,
    AlertCircle,
    Loader2,
    LogOut,
    ExternalLink
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

export default function SettingsPage() {
    const { profile, loading, refreshPosts } = usePosts();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (searchParams.get('connect') === 'success') {
            const platform = searchParams.get('platform');
            setSuccessMessage(`Successfully connected to ${platform === 'x' ? 'X (Twitter)' : 'LinkedIn'}`);
            refreshPosts();

            // Clean up URL
            window.history.replaceState(null, '', '/dashboard/settings');

            // Clear message after 3s
            setTimeout(() => setSuccessMessage(null), 3000);
        }
    }, [searchParams, refreshPosts]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="max-w-4xl mx-auto space-y-8"
        >
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Settings</h1>
                <p className="text-[var(--foreground-secondary)]">Manage your connected accounts and preferences.</p>
            </div>

            {successMessage && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-green-500/10 text-green-600 border border-green-500/20 flex items-center gap-2"
                >
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{successMessage}</span>
                </motion.div>
            )}

            <motion.div variants={itemVariants} className="space-y-6">
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">Social Accounts</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* X (Twitter) Card */}
                        <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] flex flex-col justify-between h-48">
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-black dark:bg-white rounded-xl shadow-sm">
                                    <Twitter className="w-6 h-6 text-white dark:text-black" />
                                </div>
                                {profile?.platforms?.x ? (
                                    <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-bold flex items-center gap-1 border border-green-500/20">
                                        <CheckCircle className="w-3 h-3" />
                                        Connected
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 rounded-full bg-[var(--background-secondary)] text-[var(--foreground-muted)] text-xs font-bold border border-[var(--border)]">
                                        Not Connected
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">X (Twitter)</h3>
                                <p className="text-sm text-[var(--foreground-muted)] mb-4">Connect to schedule and publish posts directly.</p>

                                {profile?.platforms?.x ? (
                                    <div className="space-y-3">
                                        <button
                                            disabled
                                            className="w-full py-2 px-4 rounded-lg border border-green-500/20 text-green-600 bg-green-500/5 text-sm font-bold flex items-center justify-center gap-2 cursor-default"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Active
                                        </button>
                                        <a
                                            href="/api/auth/x/init?redirect=/dashboard/settings"
                                            className="block w-full text-center text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] underline transition-colors"
                                        >
                                            Reconnect Account
                                        </a>
                                    </div>
                                ) : (
                                    <a
                                        href="/api/auth/x/init?redirect=/dashboard/settings"
                                        className="block w-full text-center py-2 px-4 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-bold hover:opacity-90 transition-opacity"
                                    >
                                        Connect Account
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* LinkedIn Card */}
                        <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] flex flex-col justify-between h-48">
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-[#0A66C2] rounded-xl shadow-sm">
                                    <Linkedin className="w-6 h-6 text-white" />
                                </div>
                                {profile?.platforms?.linkedin ? (
                                    <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-bold flex items-center gap-1 border border-green-500/20">
                                        <CheckCircle className="w-3 h-3" />
                                        Connected
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 rounded-full bg-[var(--background-secondary)] text-[var(--foreground-muted)] text-xs font-bold border border-[var(--border)]">
                                        Not Connected
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">LinkedIn</h3>
                                <p className="text-sm text-[var(--foreground-muted)] mb-4">Connect personal profile for publishing.</p>

                                {profile?.platforms?.linkedin ? (
                                    <div className="space-y-3">
                                        <button
                                            disabled
                                            className="w-full py-2 px-4 rounded-lg border border-green-500/20 text-green-600 bg-green-500/5 text-sm font-bold flex items-center justify-center gap-2 cursor-default"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Active
                                        </button>
                                        <a
                                            href="/api/auth/linkedin/init?redirect=/dashboard/settings"
                                            className="block w-full text-center text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] underline transition-colors"
                                        >
                                            Reconnect Account
                                        </a>
                                    </div>
                                ) : (
                                    <a
                                        href="/api/auth/linkedin/init?redirect=/dashboard/settings"
                                        className="block w-full text-center py-2 px-4 rounded-lg bg-[#0A66C2] text-white text-sm font-bold hover:bg-[#004182] transition-colors"
                                    >
                                        Connect Account
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Details */}
                <div className="pt-8 border-t border-[var(--border)]">
                    <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">Account Details</h2>
                    <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] space-y-4">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1">Display Name</label>
                                <div className="text-[var(--foreground)] font-medium">{profile?.name || 'User'}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1">Industry</label>
                                <div className="text-[var(--foreground)] font-medium capitalize">{profile?.industry?.replace('_', ' ') || 'Not set'}</div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1">Content Goal</label>
                                <div className="text-[var(--foreground)] font-medium capitalize">{profile?.contentGoal?.replace('_', ' ') || 'Not set'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
