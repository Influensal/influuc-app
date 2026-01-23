'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Twitter,
    Clock,
    Copy,
    Check,
    X,
    Plus,
    Loader2,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Post {
    id: string;
    profile_id: string;
    platform: string;
    scheduled_date: string;
    content: string;
    format: string;
    status: string;
    created_at: string;
}

export default function XCalendarPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [copied, setCopied] = useState(false);

    // Fetch posts from Supabase
    useEffect(() => {
        async function fetchPosts() {
            try {
                const response = await fetch('/api/posts?platform=x');
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to fetch posts');
                }
                const data = await response.json();
                setPosts(data.posts || []);
            } catch (err) {
                console.error('Error fetching posts:', err);
                setError(err instanceof Error ? err.message : 'Failed to load posts');
            } finally {
                setLoading(false);
            }
        }
        fetchPosts();
    }, []);

    const handleCopy = async (content: string) => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleMarkPosted = async (postId: string) => {
        setPosts(posts.map(p =>
            p.id === postId ? { ...p, status: 'posted' } : p
        ));
        if (selectedPost?.id === postId) {
            setSelectedPost({ ...selectedPost, status: 'posted' });
        }
        // TODO: Update in Supabase
    };

    const formatPostFormat = (fmt: string) => {
        switch (fmt) {
            case 'single': return 'Single Post';
            case 'thread': return 'Thread';
            default: return fmt;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Error Loading Posts</h2>
                <p className="text-[var(--foreground-muted)]">{error}</p>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <Twitter className="w-12 h-12 text-[var(--foreground-muted)] mb-4" />
                <h2 className="text-xl font-semibold mb-2">No X Posts Yet</h2>
                <p className="text-[var(--foreground-muted)]">Complete onboarding to generate your first week of posts.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
                            <Twitter className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-bold">X Calendar</h1>
                    </div>
                    <p className="text-[var(--foreground-secondary)]">
                        {posts.length} posts scheduled
                    </p>
                </div>

                <button className="btn btn-primary">
                    <Plus className="w-4 h-4" />
                    New Post
                </button>
            </div>

            {/* Posts List */}
            <div className="space-y-4">
                {posts.map((post) => {
                    const scheduledDate = parseISO(post.scheduled_date);
                    const isPosted = post.status === 'posted';

                    return (
                        <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => setSelectedPost(post)}
                            className={`card p-6 cursor-pointer hover:border-[var(--primary)] transition-all ${isPosted ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{format(scheduledDate, 'd')}</div>
                                        <div className="text-xs text-[var(--foreground-muted)] uppercase">{format(scheduledDate, 'EEE')}</div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                                            <Clock className="w-3 h-3" />
                                            {format(scheduledDate, 'h:mm a')}
                                        </div>
                                        <span className="text-xs text-[var(--foreground-muted)]">{formatPostFormat(post.format)}</span>
                                    </div>
                                </div>
                                {isPosted && (
                                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Posted
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-[var(--foreground)] line-clamp-3 whitespace-pre-wrap">
                                {post.content.split('\n')[0]}...
                            </p>
                        </motion.div>
                    );
                })}
            </div>

            {/* Post Detail Modal */}
            <AnimatePresence>
                {selectedPost && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedPost(null)}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[var(--card)] rounded-2xl border border-[var(--border)] max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
                                        <Twitter className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">
                                            {format(parseISO(selectedPost.scheduled_date), 'EEEE, MMM d')}
                                        </h3>
                                        <p className="text-sm text-[var(--foreground-muted)]">
                                            {format(parseISO(selectedPost.scheduled_date), 'h:mm a')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPost(null)}
                                    className="p-2 hover:bg-[var(--background-secondary)] rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
                                <div className="bg-[var(--background-secondary)] rounded-xl p-5 whitespace-pre-wrap text-sm leading-relaxed font-mono">
                                    {selectedPost.content}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-[var(--border)] flex items-center gap-3">
                                <button
                                    onClick={() => handleCopy(selectedPost.content)}
                                    className="flex-1 btn btn-primary py-3"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copy Post
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleMarkPosted(selectedPost.id)}
                                    disabled={selectedPost.status === 'posted'}
                                    className={`flex-1 btn py-3 ${selectedPost.status === 'posted'
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 cursor-not-allowed'
                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        }`}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {selectedPost.status === 'posted' ? 'Posted' : 'Mark as Posted'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
