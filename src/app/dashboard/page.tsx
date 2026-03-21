'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePosts } from '@/contexts';
import { format, addDays, isAfter, isBefore, startOfDay, endOfDay, nextMonday, differenceInDays, startOfWeek, endOfWeek, isWithinInterval, isToday } from 'date-fns';
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

    const router = useRouter();
    const { getPostsForToday, getMetricCounts, loading, profile, refreshPosts, posts } = usePosts();

    // State for modals and actions
    const [previewPost, setPreviewPost] = useState<any>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showGoalModal, setShowGoalModal] = useState(false);

    // Sync week number from profile
    const weekNumber = profile?.weekNumber || 1;

    // Get today's posts only
    const todaysPosts = getPostsForToday();
    const metrics = getMetricCounts();

    // Check if user needs to set their weekly goal
    useEffect(() => {
        if (profile?.awaitingGoalInput) {
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
                <i className={`fi fi-sr-spinner flex items-center justify-center ${"w-8 h-8 animate-spin text-[var(--primary)]"}`}  ></i>
            </div>
        );
    }

    // Get user's name from profile or default
    const userName = profile?.name || 'there';

    // Strategy Countdown Logic
    let daysUntilStrategy = 0;
    if (profile?.nextGenerationDate) {
        // Use the saved date from DB
        const today = startOfDay(new Date());
        // nextGenerationDate is parsed as Date object by PostContext
        // We need to compare it to today
        daysUntilStrategy = differenceInDays(profile.nextGenerationDate, today);
    } else {
        // Fallback to next Monday logic if not set
        const nextMondayDate = nextMonday(new Date());
        daysUntilStrategy = differenceInDays(nextMondayDate, new Date());
    }
    // Ensure it's not negative
    if (daysUntilStrategy < 0) daysUntilStrategy = 0;




    // Get upcoming posts (next 2 days)
    const upcomingPosts = posts
        .filter(post => {
            const today = startOfDay(new Date());
            const twoDaysFromNow = endOfDay(addDays(today, 2));
            const postDate = post.scheduledTime;
            // Includes today's future posts too, but limited to 2 days
            return (isAfter(postDate, new Date()) || isToday(postDate))
                && isBefore(postDate, twoDaysFromNow)
                && post.status !== 'posted';
        })
        .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    // --- NEW METRICS CALCULATION ---

    // 1. Streak Logic
    const streak = (() => {
        const postsByWeek = new Set<string>();
        posts.forEach(p => {
            if (p.status === 'posted' || p.status === 'scheduled') {
                const weekStr = startOfWeek(p.scheduledTime, { weekStartsOn: 1 }).toISOString();
                postsByWeek.add(weekStr);
            }
        });

        let currentStreak = 0;
        let checkDate = startOfWeek(new Date(), { weekStartsOn: 1 });

        // Check current week (if they have posted/scheduled this week, it adds to streak)
        if (postsByWeek.has(checkDate.toISOString())) {
            currentStreak++;
        }

        // Count backwards
        checkDate = addDays(checkDate, -7);
        while (postsByWeek.has(checkDate.toISOString())) {
            currentStreak++;
            checkDate = addDays(checkDate, -7);
        }

        return currentStreak;
    })();

    // 2. Content Runway
    const lastScheduledPost = [...posts]
        .filter(p => p.status === 'scheduled')
        .sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime())[0];

    const runwayDays = lastScheduledPost
        ? Math.max(0, differenceInDays(lastScheduledPost.scheduledTime, new Date()))
        : 0;

    // 3. Strategy / Goal Data
    const currentGoal = profile?.contentGoal || "General consistency";

    // Handle post click - Direct navigation for carousels
    const handlePostClick = (post: any) => {
        if (post.format === 'carousel' || post.type === 'Carousel') {
            router.push(`/dashboard/carousels/${post.id}`);
        } else {
            setPreviewPost(post);
        }
    };

    const handlePublish = async () => {
        if (!previewPost) return;
        setIsPublishing(true);
        try {
            const response = await fetch(`/api/posts/${previewPost.id}/publish`, {
                method: 'POST',
            });
            const data = await response.json();

            if (response.status === 401) {
                alert('Session expired. Please log in again.');
                window.location.href = '/login';
                return;
            }

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

            <motion.div variants={itemVariants} initial="hidden" animate="show" className="mb-8 pl-1 flex items-end justify-between">
                <div>
                    <h1 className="text-4xl font-semibold mb-2 tracking-tight text-[var(--foreground)]">
                        Hello, {userName}!
                    </h1>
                    <p className="text-[15px] text-[var(--foreground-muted)] font-medium">
                        {daysUntilStrategy} {daysUntilStrategy === 1 ? 'day' : 'days'} remaining till next strategy
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={async () => {
                            setIsRefreshing(true);
                            await refreshPosts();
                            setTimeout(() => setIsRefreshing(false), 500);
                        }}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--foreground-secondary)] bg-[var(--background-secondary)]/50 hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)] rounded-lg transition-all"
                    >
                        <i className={`fi fi-sr-rotate-right flex items-center justify-center w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}></i>
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
                {/* --- ROW 1: 3 Key Metrics --- */}
                {/* --- ROW 1: Actionable Metrics (Final Redesign) --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Card 1: Strategy Pulse (Focus) */}
                    <motion.div variants={itemVariants} className="card p-6 flex flex-col justify-between min-h-[180px] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <i className={`fi fi-sr-bullseye flex items-center justify-center ${"w-32 h-32 text-[var(--primary)]"}`}  ></i>
                        </div>

                        <div className="z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                                        <i className={`fi fi-sr-bolt flex items-center justify-center ${"w-5 h-5"}`}  ></i>
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Strategy Pulse</span>
                                </div>

                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold tracking-tighter text-[var(--foreground)]">
                                        {daysUntilStrategy}
                                    </span>
                                    <span className="text-xl font-medium text-[var(--foreground-muted)]">{daysUntilStrategy === 1 ? 'day' : 'days'}</span>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)] mt-1">
                                    until next strategy cycle
                                </p>
                            </div>

                            <div className="mt-4 pt-4 border-t border-[var(--border)]">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold text-[var(--foreground-secondary)] uppercase tracking-wide">Current Focus</span>
                                </div>
                                <div className="mt-1 font-medium text-[var(--foreground)] truncate" title={currentGoal}>
                                    "{currentGoal}"
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Card 2: Consistency Streak (Gamification) */}
                    <motion.div variants={itemVariants} className="card p-6 flex flex-col justify-between min-h-[180px] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <i className={`fi fi-sr-flame flex items-center justify-center ${"w-32 h-32 text-orange-500"}`}  ></i>
                        </div>

                        <div className="z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                        <i className={`fi fi-sr-flame flex items-center justify-center ${"w-5 h-5"}`}  ></i>
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Posting Streak</span>
                                </div>

                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold tracking-tighter text-[var(--foreground)] decoration-orange-500/20 underline decoration-4 underline-offset-4">
                                        {streak}
                                    </span>
                                    <span className="text-xl font-medium text-[var(--foreground-muted)]">{streak === 1 ? 'week' : 'weeks'}</span>
                                </div>
                            </div>

                            <div className="mt-4">
                                <p className="text-sm text-[var(--foreground)] font-medium">
                                    {streak > 0
                                        ? "You're on fire! 🔥 Keep it up."
                                        : "Start your streak this week!"}
                                </p>
                                <div className="flex gap-1.5 mt-2">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 flex-1 rounded-full transition-all ${i < Math.min(streak, 5)
                                                ? 'bg-orange-500 shadow-sm shadow-orange-500/50'
                                                : 'bg-[var(--background-secondary)]'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Card 3: Content Runway (Peace of Mind) */}
                    <motion.div variants={itemVariants} className="card p-6 flex flex-col justify-between min-h-[180px] relative overflow-hidden group">
                        <div className="absolute -bottom-4 -right-4 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <i className={`fi fi-sr-calendar flex items-center justify-center ${"w-32 h-32 text-[var(--foreground)]"}`}  ></i>
                        </div>

                        <div className="z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <i className={`fi fi-sr-arrow-trend-up flex items-center justify-center ${"w-5 h-5"}`}  ></i>
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Content Runway</span>
                                </div>

                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold tracking-tighter text-[var(--foreground)]">
                                        {runwayDays}
                                    </span>
                                    <span className="text-xl font-medium text-[var(--foreground-muted)]">{runwayDays === 1 ? 'day' : 'days'}</span>
                                </div>
                            </div>

                            <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] w-full relative z-20">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${runwayDays > 3 ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                                <span className="text-xs font-medium text-[var(--foreground-secondary)] truncate">
                                    {lastScheduledPost
                                        ? `Buffered until ${format(lastScheduledPost.scheduledTime, 'MMM d')}`
                                        : 'No future posts'}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* --- ROW 2: Today's Schedule --- */}
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
                                {todaysPosts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-[var(--foreground-muted)] text-sm">
                                            No posts scheduled for today.
                                        </td>
                                    </tr>
                                ) : (
                                    todaysPosts.map((post) => (
                                        <tr
                                            key={post.id}
                                            onClick={() => handlePostClick(post)}
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
                                                    {post.platform === 'X' ? (
                                                        // X doesn't support direct posting via API yet, so we disable or clarify
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // For now, X relies on manual copy/paste or future integration
                                                                alert("Auto-posting to X is currently unavailable. Please copy/paste manually.");
                                                            }}
                                                            className="px-3 py-1.5 text-xs font-bold text-[var(--foreground-muted)] bg-[var(--background-secondary)] rounded-lg hover:bg-[var(--background-secondary)]/80 transition-colors shadow-sm cursor-help"
                                                        >
                                                            Manual Post
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPreviewPost(post);
                                                            }}
                                                            className="px-3 py-1.5 text-xs font-bold text-white bg-[var(--primary)] rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
                                                        >
                                                            Post Now
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State / Add CTA */}
                    <div className="p-4 bg-[var(--background-secondary)]/20 border-t border-[var(--border)] flex justify-center">
                        <Link
                            href="/dashboard/ideas"
                            className="flex items-center gap-2 text-xs font-bold text-[var(--foreground-muted)] hover:text-[var(--primary)] transition-colors py-2"
                        >
                            <i className={`fi fi-sr-plus-small flex items-center justify-center ${"w-3 h-3"}`}  ></i>
                            Schedule Another Post
                        </Link>
                    </div>
                </motion.div>

                {/* --- ROW 3: Upcoming Schedule (Next 2 Days) --- */}
                <motion.div variants={itemVariants} className="card overflow-hidden">
                    <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--foreground)]">Upcoming Schedule</h3>
                            <p className="text-sm text-[var(--foreground-muted)]">Next 2 days • {upcomingPosts.length} posts</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--background)]/50">
                                    <th className="text-left py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-[var(--foreground-muted)] w-32">Date</th>
                                    <th className="text-left py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-[var(--foreground-muted)] w-24">Time</th>
                                    <th className="text-left py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-[var(--foreground-muted)] w-24">Channel</th>
                                    <th className="text-left py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-[var(--foreground-muted)]">Content Preview</th>
                                    <th className="text-left py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-[var(--foreground-muted)] w-32">Type</th>
                                    <th className="text-right py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-[var(--foreground-muted)] w-24">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {upcomingPosts.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-[var(--foreground-muted)] text-sm">
                                            No upcoming posts for the next 48 hours.
                                        </td>
                                    </tr>
                                ) : (
                                    upcomingPosts.map((post) => (
                                        <tr
                                            key={post.id}
                                            onClick={() => handlePostClick(post)} // Allow verify for upcoming too? Why not.
                                            className="group hover:bg-[var(--background-secondary)]/30 transition-colors cursor-pointer"
                                        >
                                            <td className="py-4 px-6 text-sm font-medium text-[var(--foreground)]">{format(post.scheduledTime, 'EEE, MMM d')}</td>
                                            <td className="py-4 px-6 text-sm text-[var(--foreground-secondary)]">{format(post.scheduledTime, 'h:mm a')}</td>
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
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                    <i className={`fi fi-sr-clock flex items-center justify-center ${"w-3 h-3"}`}  ></i>
                                                    Scheduled
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
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
                            <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)] p-4 bg-[var(--background-secondary)]/30 rounded-xl border border-[var(--border)] relative group">
                                {previewPost.content}
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(previewPost.content);
                                        // Simple visual feedback could be added here
                                    }}
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-[var(--background)]/50 hover:bg-[var(--background)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-all border border-[var(--border)]"
                                    title="Copy content"
                                >
                                    <i className={`fi fi-sr-copy flex items-center justify-center ${"w-3.5 h-3.5"}`}  ></i>
                                </button>
                            </div>

                            {previewPost.platform === 'X' && (
                                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3 text-sm text-yellow-700 dark:text-yellow-400">
                                    <i className={`fi fi-sr-triangle-warning flex items-center justify-center ${"w-4 h-4 shrink-0 mt-0.5"}`}  ></i>
                                    <div>
                                        <p className="font-bold mb-0.5">Auto-posting Unavailable</p>
                                        <p className="opacity-90 text-xs">
                                            The X (Twitter) API does not currently support auto-posting content. Please copy the text above and post manually.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-[var(--border)] flex justify-end gap-3 bg-[var(--background-secondary)]/10">
                            <button
                                onClick={() => setPreviewPost(null)}
                                className="px-4 py-2 rounded-xl font-medium text-[var(--foreground-secondary)] hover:bg-[var(--background-secondary)] transition-colors"
                            >
                                {previewPost.platform === 'X' ? 'Close' : 'Cancel'}
                            </button>

                            {previewPost.platform === 'X' ? (
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(previewPost.content);
                                        setPreviewPost(null);
                                        // Could trigger a toast here if we had a toast system expose
                                    }}
                                    className="px-6 py-2 rounded-xl font-medium text-white bg-black hover:bg-black/80 dark:bg-white dark:text-black hover:dark:bg-white/90 transition-colors flex items-center gap-2"
                                >
                                    <i className={`fi fi-sr-copy flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                    Copy & Close
                                </button>
                            ) : (
                                <button
                                    onClick={handlePublish}
                                    disabled={isPublishing}
                                    className="px-6 py-2 rounded-xl font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isPublishing ? (
                                        <>
                                            <i className={`fi fi-sr-spinner flex items-center justify-center ${"w-4 h-4 animate-spin"}`}  ></i>
                                            Publishing...
                                        </>
                                    ) : (
                                        <>
                                            <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                            Confirm & Post
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
