
'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Archive,
    Search,
    Calendar,
    ArrowUpDown,
    Twitter,
    Linkedin,
    ChevronDown,
    Eye,
    CheckCircle,
    Clock,
    XCircle,
    Copy,
    Layout
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface Post {
    id: string;
    platform: 'x' | 'linkedin';
    content: string;
    topic?: string;
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
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            // Get profile first
            const { data: profile } = await supabase
                .from('founder_profiles')
                .select('id')
                .eq('account_id', user.id)
                .single();

            if (!profile) {
                setLoading(false);
                return;
            }

            // Get optimized posts list (limit 50, specific columns)
            const { data: postsData, error } = await supabase
                .from('posts')
                .select('id, platform, content, topic, scheduled_date, status, format, posted_at, archived_at, created_at')
                .eq('profile_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (!error && postsData) {
                setPosts(postsData);
            } else if (error) {
                console.error('Fetch error:', error);
            }
        } catch (error) {
            console.error('Failed to fetch library:', error);
        } finally {
            setLoading(false);
        }
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
            result = result.filter(post => {
                const contentMatch = post.content?.toLowerCase().includes(query);
                const topicMatch = post.topic?.toLowerCase().includes(query);
                return contentMatch || topicMatch;
            });
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case 'oldest':
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case 'status':
                    return a.status.localeCompare(b.status);
                default:
                    return 0;
            }
        });

        return result;
    }, [posts, selectedPlatform, statusFilter, searchQuery, sortBy]);

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
        if (!dateString) return 'No date';
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
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto mb-20">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Archive className="w-7 h-7" />
                    Content Library
                </h1>
                <p className="text-gray-500 mt-1">
                    Your recent 50 posts across all platforms
                </p>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-xl border p-4 mb-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search posts or topics..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 border text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        />
                    </div>

                    {/* Platform Filter */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedPlatform('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPlatform === 'all'
                                ? 'bg-black text-white'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setSelectedPlatform('linkedin')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${selectedPlatform === 'linkedin'
                                ? 'bg-[#0077b5] text-white'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
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
                            className="appearance-none px-4 py-2 pr-8 rounded-lg bg-gray-50 border text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-black"
                        >
                            <option value="all">All Status</option>
                            <option value="posted">Posted</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="archived">Archived</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
                            className="text-center py-12 text-gray-400"
                        >
                            <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No posts found matching your filters</p>
                        </motion.div>
                    ) : (
                        filteredPosts.map((post, index) => {
                            let displayContent = post.content;
                            let isCarousel = post.format === 'carousel';

                            if (isCarousel) {
                                try {
                                    // Try to parse just to verify it's valid JSON
                                    JSON.parse(post.content);
                                    displayContent = post.topic || "Untitled Carousel";
                                } catch {
                                    displayContent = "Carousel Data (Error Parsing)";
                                }
                            }

                            return (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="bg-white rounded-xl border overflow-hidden hover:border-black/30 transition-all shadow-sm hover:shadow-md"
                                >
                                    <div
                                        className="p-4 cursor-pointer"
                                        onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Platform Icon */}
                                            <div className={`p-2 rounded-lg shrink-0 ${post.platform === 'x'
                                                ? 'bg-black text-white'
                                                : 'bg-[#0077b5] text-white'
                                                }`}>
                                                {isCarousel ? <Layout className="w-4 h-4" /> : getPlatformIcon(post.platform)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs text-gray-500 font-mono">
                                                        {formatDate(post.scheduled_date)}
                                                    </span>
                                                    {getStatusBadge(post.status)}
                                                    {isCarousel && (
                                                        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold uppercase">
                                                            Carousel
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`text-gray-900 font-medium ${expandedPostId === post.id ? '' : 'line-clamp-2'
                                                    }`}>
                                                    {isCarousel ? post.topic || "Carousel Post" : post.content}
                                                </p>
                                                {isCarousel && (
                                                    <p className="text-xs text-gray-400 mt-1 italic">
                                                        Click to view slide data source
                                                    </p>
                                                )}
                                            </div>

                                            {/* Expand Icon */}
                                            <button className="p-2 text-gray-400 hover:text-black transition-colors">
                                                {expandedPostId === post.id ? <ChevronDown className="w-4 h-4 rotate-180 transition-transform" /> : <ChevronDown className="w-4 h-4 transition-transform" />}
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
                                                className="border-t bg-gray-50"
                                            >
                                                <div className="p-4">
                                                    <div className="bg-white p-4 rounded-lg border font-mono text-xs text-gray-600 overflow-x-auto max-h-[300px]">
                                                        {post.content}
                                                    </div>
                                                    <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-gray-500">
                                                        <span>Format: <strong>{post.format}</strong></span>
                                                        <span>ID: {post.id}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
