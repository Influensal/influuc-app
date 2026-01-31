'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ExternalLink, RefreshCw } from 'lucide-react';

interface ExpiredConnection {
    platform: 'x' | 'linkedin';
    expired_at?: string;
}

export default function ConnectionStatusBanner() {
    const [expiredConnections, setExpiredConnections] = useState<ExpiredConnection[]>([]);
    const [dismissed, setDismissed] = useState<string[]>([]);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        checkConnections();
    }, []);

    const checkConnections = async () => {
        setChecking(true);
        try {
            const response = await fetch('/api/auth/check-connections');
            if (response.ok) {
                const data = await response.json();
                setExpiredConnections(data.expired || []);
            }
        } catch (error) {
            console.error('Failed to check connections:', error);
        } finally {
            setChecking(false);
        }
    };

    const handleReconnect = (platform: string) => {
        if (platform === 'x') {
            window.location.href = '/api/auth/x/init';
        } else if (platform === 'linkedin') {
            window.location.href = '/api/auth/linkedin/init';
        }
    };

    const handleDismiss = (platform: string) => {
        setDismissed([...dismissed, platform]);
    };

    const visibleConnections = expiredConnections.filter(
        conn => !dismissed.includes(conn.platform)
    );

    if (visibleConnections.length === 0) return null;

    return (
        <AnimatePresence>
            {visibleConnections.map((connection) => (
                <motion.div
                    key={connection.platform}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="font-medium text-amber-600 dark:text-amber-400">
                                {connection.platform === 'x' ? 'X (Twitter)' : 'LinkedIn'} connection expired
                            </p>
                            <p className="text-sm text-[var(--foreground-muted)]">
                                Reconnect to continue publishing to this platform
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleReconnect(connection.platform)}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reconnect
                        </button>
                        <button
                            onClick={() => handleDismiss(connection.platform)}
                            className="p-2 hover:bg-[var(--background-secondary)] rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-[var(--foreground-muted)]" />
                        </button>
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
    );
}
