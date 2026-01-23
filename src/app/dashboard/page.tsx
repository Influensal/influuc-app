'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    Plus,
    Bell,
    Layout,
    CheckCircle,
    FileText,
    Clock,
    ChevronRight,
    MoreHorizontal,
    Play,
    Pause,
    Sparkles,
    Calendar as CalendarIcon,
    Loader2,
    RefreshCw,
    Target
} from 'lucide-react';
import Link from 'next/link';
import { usePosts } from '@/contexts';
import { format } from 'date-fns';
import { NotificationBanner } from '@/components/dashboard/NotificationBanner';
import { WeeklyGoalModal } from '@/components/dashboard/WeeklyGoalModal';

export default function DashboardPage() {
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 },
    };

    const { getPostsForToday, getMetricCounts, loading, profile, refreshPosts, posts } = usePosts();

    // State for modals and actions
    const [previewPost, setPreviewPost] = useState<any>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [weekNumber, setWeekNumber] = useState(1);

    // Get today's posts only
    const todaysPosts = getPostsForToday();
    const metrics = getMetricCounts();

    // Check if user needs to set their weekly goal
    useEffect(() => {
        // @ts-ignore - awaiting_goal_input is a new field
        if ((profile as any)?.awaiting_goal_input) {
            setShowGoalModal(true);
        }
    }, [profile]);

    // Handle generation with goal
    const handleGenerateWithGoal = async (goal: string, context: string) => {
        // Step 1: Create Strategy & Placeholder Posts
        const response = await fetch('/api/generation/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal, context })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Generation failed');
        }

        // Step 2: Generate Content for each post individually (Client-Side Iteration)
        // This avoids Vercel 504 Timeouts by keeping each request short
        if (data.postIds && Array.isArray(data.postIds)) {
            // We can run these in parallel batches of 3-4 to speed it up but single updates are safer for rate limits
            const BATCH_SIZE = 3;
            for (let i = 0; i < data.postIds.length; i += BATCH_SIZE) {
                const batch = data.postIds.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map((postId: string) =>
                    fetch('/api/generation/single', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ postId })
                    }).catch(e => console.error(`Failed to generate post ${postId}`, e))
                ));
            }
        }

        // Refresh posts after generation
        await refreshPosts();
        setShowGoalModal(false);
    };

    // Show loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    // Get user's name from profile or default
    const userName = profile?.name || 'there';

    const handlePublish = async () => {
        if (!previewPost) return;
        setIsPublishing(true);
        try {
            const response = await fetch(`/api/posts/${previewPost.id}/publish`, {
                method: 'POST',
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to publish');

            // Refresh posts (would ideally come from context)
            alert('Post published successfully!');
            setPreviewPost(null);
            window.location.reload(); // Simple refresh for MVP
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to publish');
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Weekly Goal Modal */}
            <WeeklyGoalModal
                isOpen={showGoalModal}
                onClose={() => setShowGoalModal(false)}
                onGenerate={handleGenerateWithGoal}
                weekNumber={weekNumber}
            />

            {/* Notification Banner */}
            <NotificationBanner />

            {/* Same Greeting & Cards ... (omitted for brevity, keep existing) */}
            <motion.div variants={itemVariants} initial="hidden" animate="show" className="mb-8 pl-1 flex items-end justify-between">
                <div>
                    <h1 className="text-4xl font-semibold mb-2 tracking-tight text-[var(--foreground)]">
                        Hello, {userName}!
                    </h1>
                    <p className="text-[15px] text-[var(--foreground-muted)] font-medium">
                        Here's what's happening today
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Generate Week Button */}
                    <button
                        onClick={() => setShowGoalModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:opacity-90 rounded-lg transition-all"
                    >
                        <Target className="w-4 h-4" />
                        Generate Week
                    </button>
                    <button
                        onClick={async () => {
                            setIsRefreshing(true);
                            await refreshPosts();
                            setTimeout(() => setIsRefreshing(false), 500);
                        }}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--foreground-secondary)] bg-[var(--background-secondary)]/50 hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)] rounded-lg transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </motion.div>

            {/* Main Content */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-8"
            >
                {/* ... (Metrics Cards - Keeping same layouts) ... */}
                {/* --- ROW 1: 3 Key Metrics --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Active Channels */}
                    <motion.div variants={itemVariants} className="card p-6 flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Layout className="w-24 h-24 text-[var(--foreground)]" />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center mb-4 shadow-lg shadow-black/10 dark:shadow-white/10 z-10">
                            <Layout className="w-5 h-5" />
                        </div>
                        <div className="z-10">
                            <div className="text-4xl font-semibold mb-1 tracking-tight text-[var(--foreground)]">{metrics.activeChannels}</div>
                            <div className="text-sm text-[var(--foreground-secondary)] font-medium">Active Channels</div>
                        </div>
                    </motion.div>

                    {/* Card 2: Total Posts Scheduled */}
                    <motion.div variants={itemVariants} className="card p-6 flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CheckCircle className="w-24 h-24 text-[var(--primary)]" />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center mb-4 shadow-lg shadow-[var(--primary)]/30 z-10">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="z-10">
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">{metrics.totalScheduled}</span>
                                <span className="text-sm font-medium text-[var(--foreground-muted)]">posts</span>
                            </div>
                            <div className="text-sm text-[var(--foreground-secondary)] font-medium">Scheduled Total</div>
                        </div>
                    </motion.div>

                    {/* Card 3: Channel Breakdown */}
                    <motion.div variants={itemVariants} className="card p-6 flex flex-col justify-center min-h-[160px]">
                        <h3 className="text-sm font-medium text-[var(--foreground-secondary)] mb-4">Channel Breakdown</h3>
                        <div className="space-y-3">
                            {profile?.platforms?.linkedin && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        <span className="text-sm font-medium text-[var(--foreground)]">LinkedIn</span>
                                    </div>
                                    <span className="text-sm font-bold text-[var(--foreground)]">{metrics.platformBreakdown.LinkedIn}</span>
                                </div>
                            )}
                            {profile?.platforms?.x && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-black dark:bg-white"></div>
                                        <span className="text-sm font-medium text-[var(--foreground)]">X (Twitter)</span>
                                    </div>
                                    <span className="text-sm font-bold text-[var(--foreground)]">{metrics.platformBreakdown.X}</span>
                                </div>
                            )}
                            {!profile?.platforms?.linkedin && !profile?.platforms?.x && (
                                <p className="text-sm text-[var(--foreground-muted)]">No platforms selected</p>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* --- ROW 2: Unified Schedule Table --- */}
                <motion.div variants={itemVariants} className="card overflow-hidden">
                    <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--foreground)]">Today's Schedule</h3>
                            <p className="text-sm text-[var(--foreground-muted)]">{format(new Date(), 'EEEE, MMM d')} • {todaysPosts.length} posts remaining</p>
                        </div>
                        <Link href="/dashboard/linkedin" className="text-xs font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors uppercase tracking-wider">
                            View Full Calendar
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--background)]/50">
                                    <th className="text-left py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-[var(--foreground-muted)] w-24">Time</th>
                                    <th className="text-left py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-[var(--foreground-muted)] w-24">Channel</th>
                                    <th className="text-left py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-[var(--foreground-muted)]">Content Preview</th>
                                    <th className="text-left py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-[var(--foreground-muted)] w-32">Type</th>
                                    <th className="text-right py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-[var(--foreground-muted)] w-32">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {todaysPosts.map((post) => (
                                    <tr
                                        key={post.id}
                                        onClick={() => console.log('Clicked post:', post.id)}
                                        className="group hover:bg-[var(--background-secondary)]/30 transition-colors cursor-pointer"
                                    >
                                        <td className="py-4 px-6 text-sm font-medium text-[var(--foreground)]">{format(post.scheduledTime, 'h:mm a')}</td>
                                        <td className="py-4 px-6">
                                            {post.platform === 'LinkedIn' && (
                                                <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] flex items-center justify-center">
                                                    <div className="font-bold text-xs">in</div>
                                                </div>
                                            )}
                                            {post.platform === 'X' && (
                                                <div className="w-8 h-8 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
                                                    <div className="font-bold text-xs">X</div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="font-medium text-[var(--foreground)] text-sm">{post.title}</div>
                                            <div className="text-xs text-[var(--foreground-secondary)] truncate max-w-[300px] mt-0.5">{post.content}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center justify-center w-24 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                                                {post.type}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreviewPost(post);
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-bold text-white bg-[var(--primary)] rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
                                                >
                                                    Post Now
                                                </button>
                                                {/* 
                                                <button className="p-2 hover:bg-[var(--background)] rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                                */}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State / Add CTA */}
                    <div className="p-4 bg-[var(--background-secondary)]/20 border-t border-[var(--border)] flex justify-center">
                        <Link
                            href="/dashboard/ideas"
                            className="flex items-center gap-2 text-xs font-bold text-[var(--foreground-muted)] hover:text-[var(--primary)] transition-colors py-2"
                        >
                            <Plus className="w-3 h-3" />
                            Schedule Another Post
                        </Link>
                    </div>
                </motion.div>
            </motion.div>

            {/* Preview Modal */}
            {previewPost && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[var(--card)] rounded-2xl w-full max-w-lg border border-[var(--border)] shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                            <h3 className="text-lg font-bold">Confirm Post</h3>
                            <button onClick={() => setPreviewPost(null)} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                                &times;
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="flex gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white
                                    ${previewPost.platform === 'LinkedIn' ? 'bg-[#0A66C2]' : 'bg-black dark:bg-white dark:text-black'}
                                `}>
                                    {previewPost.platform === 'LinkedIn' ? 'in' : 'X'}
                                </div>
                                <div>
                                    <div className="font-semibold">{userName}</div>
                                    <div className="text-xs text-[var(--foreground-secondary)]">Posting to {previewPost.platform === 'X' ? 'X (Twitter)' : 'LinkedIn'}</div>
                                </div>
                            </div>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)] p-4 bg-[var(--background-secondary)]/30 rounded-xl border border-[var(--border)]">
                                {previewPost.content}
                            </div>
                        </div>
                        <div className="p-6 border-t border-[var(--border)] flex justify-end gap-3 bg-[var(--background-secondary)]/10">
                            <button
                                onClick={() => setPreviewPost(null)}
                                className="px-4 py-2 rounded-xl font-medium text-[var(--foreground-secondary)] hover:bg-[var(--background-secondary)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePublish}
                                disabled={isPublishing}
                                className="px-6 py-2 rounded-xl font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isPublishing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Publishing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Confirm & Post
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
