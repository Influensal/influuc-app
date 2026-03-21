'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

import { format, parseISO } from 'date-fns';
import EditPublishModal from '@/components/dashboard/EditPublishModal';

interface Post {
    id: string;
    profile_id: string;
    platform: string;
    scheduled_date: string;
    content: string;
    format: string;
    status: string;
    created_at: string;
    regenerated?: boolean;
    image_url?: string;
    carousel_id?: string;
}

export default function LinkedInCalendarPage() {
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    // Fetch posts from Supabase
    useEffect(() => {
        async function fetchPosts() {
            try {
                const response = await fetch('/api/posts?platform=linkedin');
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

    const handleContentUpdate = (postId: string, newContent: string) => {
        setPosts(posts.map(p =>
            p.id === postId ? { ...p, content: newContent } : p
        ));
        if (selectedPost?.id === postId) {
            setSelectedPost({ ...selectedPost, content: newContent });
        }
    };

    const handleLikeUpdate = (postId: string, isLiked: boolean) => {
        // LinkedIn doesn't have likes yet
    };

    const handlePublishSuccess = (postId: string) => {
        setPosts(posts.map(p =>
            p.id === postId ? { ...p, status: 'posted' } : p
        ));
    };

    const handleImageUpdate = (postId: string, newImageUrl: string) => {
        setPosts(posts.map(p =>
            p.id === postId ? { ...p, image_url: newImageUrl } : p
        ));
        if (selectedPost?.id === postId) {
            setSelectedPost({ ...selectedPost, image_url: newImageUrl });
        }
    };

    const formatPostFormat = (fmt: string) => {
        switch (fmt) {
            case 'single': return 'Single Post';
            case 'thread': return 'Thread';
            case 'long_form': return 'Long Form';
            case 'video_script': return '🎬 Reel';
            case 'carousel': return '📊 Carousel';
            default: return fmt;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <i className={`fi fi-sr-spinner flex items-center justify-center ${"w-8 h-8 animate-spin text-[var(--primary)]"}`}  ></i>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <i className={`fi fi-sr-info flex items-center justify-center ${"w-12 h-12 text-red-500 mb-4"}`}  ></i>
                <h2 className="text-xl font-semibold mb-2">Error Loading Posts</h2>
                <p className="text-[var(--foreground-muted)]">{error}</p>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <i className={`fi fi-brands-linkedin flex items-center justify-center ${"w-12 h-12 text-[var(--foreground-muted)] mb-4"}`}  ></i>
                <h2 className="text-xl font-semibold mb-2">No LinkedIn Posts Yet</h2>
                <p className="text-[var(--foreground-muted)]">Complete onboarding to generate your first week of posts.</p>
            </div>
        );
    }

    const scheduledPosts = posts.filter(p => p.status === 'scheduled' && new Date(p.scheduled_date) >= new Date());
    const postedPosts = posts.filter(p => p.status === 'posted');

    const handlePostClick = (post: Post) => {
        if (post.format === 'carousel') {
            router.push(`/dashboard/carousels/${post.id}`);
        } else {
            setSelectedPost(post);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center">
                            <i className={`fi fi-brands-linkedin flex items-center justify-center ${"w-5 h-5"}`}  ></i>
                        </div>
                        <h1 className="text-2xl font-bold">LinkedIn Calendar</h1>
                    </div>
                    <p className="text-[var(--foreground-secondary)]">
                        {scheduledPosts.length} scheduled • {postedPosts.length} posted
                    </p>
                </div>
            </div>

            {/* Scheduled Posts */}
            {scheduledPosts.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-[var(--foreground-secondary)]">Scheduled</h2>
                    {scheduledPosts.map((post) => {
                        const scheduledDate = parseISO(post.scheduled_date);

                        return (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => handlePostClick(post)}
                                className="card p-6 cursor-pointer hover:border-[var(--primary)] transition-all"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold">{format(scheduledDate, 'd')}</div>
                                            <div className="text-xs text-[var(--foreground-muted)] uppercase">{format(scheduledDate, 'EEE')}</div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                                                <i className={`fi fi-sr-clock flex items-center justify-center ${"w-3 h-3"}`}  ></i>
                                                {format(scheduledDate, 'h:mm a')}
                                            </div>
                                            <span className="text-xs text-[var(--foreground-muted)]">{formatPostFormat(post.format)}</span>
                                        </div>
                                    </div>
                                    {post.regenerated && (
                                        <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
                                            Regenerated
                                        </span>
                                    )}
                                </div>
                                {post.format === 'carousel' ? (
                                    <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                        <i className={`fi fi-sr-layers flex items-center justify-center ${"w-5 h-5 text-emerald-600"}`}  ></i>
                                        <div>
                                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Carousel Post</p>
                                            <p className="text-xs text-[var(--foreground-muted)]">Click to view & edit slides</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-[var(--foreground)] line-clamp-3 whitespace-pre-wrap">
                                        {post.content.substring(0, 200)}...
                                    </p>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Posted Posts */}
            {postedPosts.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-[var(--foreground-secondary)]">Posted</h2>
                    {postedPosts.map((post) => {
                        const scheduledDate = parseISO(post.scheduled_date);

                        return (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => handlePostClick(post)}
                                className="card p-6 cursor-pointer hover:border-[var(--primary)] transition-all opacity-60"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold">{format(scheduledDate, 'd')}</div>
                                            <div className="text-xs text-[var(--foreground-muted)] uppercase">{format(scheduledDate, 'EEE')}</div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                                                <i className={`fi fi-sr-clock flex items-center justify-center ${"w-3 h-3"}`}  ></i>
                                                {format(scheduledDate, 'h:mm a')}
                                            </div>
                                            <span className="text-xs text-[var(--foreground-muted)]">{formatPostFormat(post.format)}</span>
                                        </div>
                                    </div>
                                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                        <i className={`fi fi-sr-check flex items-center justify-center w-4 h-4`}></i>
                                        Posted
                                    </span>
                                </div>
                                <p className="text-sm text-[var(--foreground)] line-clamp-2 whitespace-pre-wrap">
                                    {post.content.substring(0, 150)}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Edit/Publish Modal */}
            {selectedPost && (
                <EditPublishModal
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                    onContentUpdate={handleContentUpdate}
                    onLikeUpdate={handleLikeUpdate}
                    onPublishSuccess={handlePublishSuccess}
                    onImageUpdate={handleImageUpdate}
                />
            )}
        </div>
    );
}
