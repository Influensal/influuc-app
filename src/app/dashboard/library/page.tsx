'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Archive,
    Search,
    Filter,
    Calendar,
    CheckCircle,
    Clock,
    XCircle,
    ArrowUpDown,
    Twitter,
    Linkedin,
    ChevronDown,
    Eye
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface Post {
    id: string;
    platform: 'x' | 'linkedin';
    content: string;
    scheduled_date: string;
    status: 'scheduled' | 'posted' | 'skipped' | 'failed' | 'archived';
    format: string;
    posted_at?: string;
    archived_at?: string;
    created_at: string;
}

type SortOption = 'newest' | 'oldest' | 'status';
type StatusFilter = 'all' | 'posted' | 'scheduled' | 'archived' | 'skipped';

export default function LibraryPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'x' | 'linkedin'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        // Get profile first
        const { data: profile } = await supabase
            .from('founder_profiles')
            .select('id')
            .eq('account_id', user.id)
            .single();

        if (!profile) return;

        // Get all posts including archived
        const { data: postsData, error } = await supabase
            .from('posts')
            .select('*')
            .eq('profile_id', profile.id)
            .order('scheduled_date', { ascending: false });

        if (!error && postsData) {
            setPosts(postsData);
        }

        setLoading(false);
    };

    // Filter and sort posts
    const filteredPosts = useMemo(() => {
        let result = [...posts];

        // Platform filter
        if (selectedPlatform !== 'all') {
            result = result.filter(post => post.platform === selectedPlatform);
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(post => post.status === statusFilter);
        }

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(post =>
                post.content.toLowerCase().includes(query)
            );
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime();
                case 'oldest':
                    return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
                case 'status':
                    return a.status.localeCompare(b.status);
                default:
                    return 0;
            }
        });

        return result;
    }, [posts, selectedPlatform, statusFilter, searchQuery, sortBy]);

    const getStatusIcon = (status: Post['status']) => {
        switch (status) {
            case 'posted':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'scheduled':
                return <Clock className="w-4 h-4 text-blue-500" />;
            case 'archived':
                return <Archive className="w-4 h-4 text-gray-500" />;
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'skipped':
                return <XCircle className="w-4 h-4 text-yellow-500" />;
            default:
                return null;
        }
    };

    const getStatusBadge = (status: Post['status']) => {
        const styles: Record<Post['status'], string> = {
            posted: 'bg-green-500/10 text-green-600 border-green-500/20',
            scheduled: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
            archived: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
            failed: 'bg-red-500/10 text-red-600 border-red-500/20',
            skipped: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
        };

        return (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getPlatformIcon = (platform: 'x' | 'linkedin') => {
        return platform === 'x'
            ? <Twitter className="w-4 h-4" />
            : <Linkedin className="w-4 h-4" />;
    };

    // Stats
    const stats = useMemo(() => ({
        total: posts.length,
        posted: posts.filter(p => p.status === 'posted').length,
        scheduled: posts.filter(p => p.status === 'scheduled').length,
        archived: posts.filter(p => p.status === 'archived').length,
    }), [posts]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--primary)]"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-3">
                    <Archive className="w-7 h-7 text-[var(--primary)]" />
                    Content Library
                </h1>
                <p className="text-[var(--muted-foreground)] mt-1">
                    Browse all your generated content across platforms
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
                    <p className="text-sm text-[var(--muted-foreground)]">Total Posts</p>
                    <p className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</p>
                </div>
                <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
                    <p className="text-sm text-green-600">Posted</p>
                    <p className="text-2xl font-bold text-green-600">{stats.posted}</p>
                </div>
                <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
                    <p className="text-sm text-blue-600">Scheduled</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
                </div>
                <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
                    <p className="text-sm text-gray-600">Archived</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.archived}</p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                        <input
                            type="text"
                            placeholder="Search posts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                        />
                    </div>

                    {/* Platform Filter */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedPlatform('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPlatform === 'all'
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'bg-[var(--background)] text-[var(--muted-foreground)] hover:bg-[var(--background)]/80'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setSelectedPlatform('x')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${selectedPlatform === 'x'
                                    ? 'bg-black text-white'
                                    : 'bg-[var(--background)] text-[var(--muted-foreground)] hover:bg-[var(--background)]/80'
                                }`}
                        >
                            <Twitter className="w-4 h-4" />
                            X
                        </button>
                        <button
                            onClick={() => setSelectedPlatform('linkedin')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${selectedPlatform === 'linkedin'
                                    ? 'bg-[#0077b5] text-white'
                                    : 'bg-[var(--background)] text-[var(--muted-foreground)] hover:bg-[var(--background)]/80'
                                }`}
                        >
                            <Linkedin className="w-4 h-4" />
                            LinkedIn
                        </button>
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                            className="appearance-none px-4 py-2 pr-8 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                        >
                            <option value="all">All Status</option>
                            <option value="posted">Posted</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="archived">Archived</option>
                            <option value="skipped">Skipped</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
                    </div>

                    {/* Sort */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="appearance-none px-4 py-2 pr-8 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="status">By Status</option>
                        </select>
                        <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Posts List */}
            <div className="space-y-3">
                <AnimatePresence>
                    {filteredPosts.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12 text-[var(--muted-foreground)]"
                        >
                            <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No posts found matching your filters</p>
                        </motion.div>
                    ) : (
                        filteredPosts.map((post, index) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden hover:border-[var(--primary)]/30 transition-colors"
                            >
                                <div
                                    className="p-4 cursor-pointer"
                                    onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Platform Icon */}
                                        <div className={`p-2 rounded-lg ${post.platform === 'x'
                                                ? 'bg-black text-white'
                                                : 'bg-[#0077b5] text-white'
                                            }`}>
                                            {getPlatformIcon(post.platform)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm text-[var(--muted-foreground)] flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(post.scheduled_date)}
                                                </span>
                                                {getStatusBadge(post.status)}
                                            </div>
                                            <p className={`text-[var(--foreground)] ${expandedPostId === post.id ? '' : 'line-clamp-2'
                                                }`}>
                                                {post.content}
                                            </p>
                                        </div>

                                        {/* Expand Icon */}
                                        <button className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                <AnimatePresence>
                                    {expandedPostId === post.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="border-t border-[var(--border)] bg-[var(--background)]/50"
                                        >
                                            <div className="p-4">
                                                <p className="text-[var(--foreground)] whitespace-pre-wrap">
                                                    {post.content}
                                                </p>
                                                <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-wrap gap-4 text-sm text-[var(--muted-foreground)]">
                                                    <span>Format: <strong className="text-[var(--foreground)]">{post.format}</strong></span>
                                                    <span>Created: <strong className="text-[var(--foreground)]">{formatDate(post.created_at)}</strong></span>
                                                    {post.posted_at && (
                                                        <span>Posted: <strong className="text-[var(--foreground)]">{formatDate(post.posted_at)}</strong></span>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Pagination / Load More (simplified for now) */}
            {filteredPosts.length > 0 && (
                <div className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
                    Showing {filteredPosts.length} of {posts.length} posts
                </div>
            )}
        </div>
    );
}
