'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, AlertTriangle, Bell, Zap } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface Notification {
    id: string;
    type: 'week_ready' | 'subscription_expired' | 'trial_ending' | 'post_failed' | 'general';
    title: string;
    message: string;
    action_url?: string;
    created_at: string;
    read_at?: string;
    dismissed_at?: string;
}

export function NotificationBanner() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        // Get unread/undismissed notifications
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('account_id', user.id)
            .is('dismissed_at', null)
            .order('created_at', { ascending: false })
            .limit(5);

        if (!error && data) {
            setNotifications(data);
        }
    };

    const dismissNotification = async (id: string) => {
        const supabase = createClient();

        await supabase
            .from('notifications')
            .update({ dismissed_at: new Date().toISOString() })
            .eq('id', id);

        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    if (notifications.length === 0) return null;

    const current = notifications[currentIndex];
    if (!current) return null;

    const getIcon = () => {
        switch (current.type) {
            case 'week_ready':
                return <Sparkles className="w-5 h-5" />;
            case 'subscription_expired':
                return <AlertTriangle className="w-5 h-5" />;
            case 'trial_ending':
                return <Zap className="w-5 h-5" />;
            default:
                return <Bell className="w-5 h-5" />;
        }
    };

    const getBannerStyle = () => {
        switch (current.type) {
            case 'week_ready':
                return 'bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/30';
            case 'subscription_expired':
                return 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30';
            case 'trial_ending':
                return 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30';
            default:
                return 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30';
        }
    };

    const getIconStyle = () => {
        switch (current.type) {
            case 'week_ready':
                return 'text-purple-500';
            case 'subscription_expired':
                return 'text-red-500';
            case 'trial_ending':
                return 'text-yellow-600';
            default:
                return 'text-blue-500';
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                key={current.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`mb-6 rounded-xl border p-4 ${getBannerStyle()}`}
            >
                <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg bg-white/50 ${getIconStyle()}`}>
                        {getIcon()}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[var(--foreground)]">
                            {current.title}
                        </h3>
                        {current.message && (
                            <p className="text-sm text-[var(--muted-foreground)] mt-1">
                                {current.message}
                            </p>
                        )}

                        {current.action_url && (
                            <Link
                                href={current.action_url}
                                className="inline-block mt-3 text-sm font-medium text-[var(--primary)] hover:underline"
                            >
                                View Details →
                            </Link>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {notifications.length > 1 && (
                            <span className="text-xs text-[var(--muted-foreground)]">
                                {currentIndex + 1} / {notifications.length}
                            </span>
                        )}

                        <button
                            onClick={() => dismissNotification(current.id)}
                            className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Navigation dots for multiple notifications */}
                {notifications.length > 1 && (
                    <div className="flex justify-center gap-1.5 mt-3">
                        {notifications.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`w-2 h-2 rounded-full transition-colors ${idx === currentIndex
                                        ? 'bg-[var(--primary)]'
                                        : 'bg-[var(--muted-foreground)]/30 hover:bg-[var(--muted-foreground)]/50'
                                    }`}
                            />
                        ))}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
