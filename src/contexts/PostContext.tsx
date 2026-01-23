'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isToday, parseISO } from 'date-fns';

// --- Types ---
export type Platform = 'LinkedIn' | 'X';
export type PostType = 'Single Post' | 'Thread' | 'Reel';

export interface Post {
    id: string;
    scheduledTime: Date;
    platform: Platform;
    title: string;
    content: string;
    type: PostType;
    duration?: string;
}

interface UserProfile {
    id: string;
    name: string;
    platforms: {
        x: boolean;
        linkedin: boolean;
    };
    industry?: string;
    contentGoal?: string;
}

interface PostContextType {
    posts: Post[];
    loading: boolean;
    profile: UserProfile | null;
    getPostsForToday: () => Post[];
    getMetricCounts: () => {
        totalScheduled: number;
        activeChannels: number;
        platformBreakdown: Record<Platform, number>;
    };
    addPost: (post: Omit<Post, 'id'>) => void;
    deletePost: (id: string) => void;
    refreshPosts: () => Promise<void>;
}

// Helper to convert DB format to Post format
function convertDbPost(dbPost: {
    id: string;
    scheduled_date: string;
    platform: string;
    content: string;
    format: string;
    hooks?: string[];
}): Post {
    const platformMap: Record<string, Platform> = {
        'linkedin': 'LinkedIn',
        'x': 'X',
    };

    const typeMap: Record<string, PostType> = {
        'single': 'Single Post',
        'thread': 'Thread',
        'long_form': 'Single Post',
        'video_script': 'Reel',
    };

    const content = dbPost.content || '';
    const firstLine = content.split('\n')[0].substring(0, 60);

    return {
        id: dbPost.id,
        scheduledTime: parseISO(dbPost.scheduled_date),
        platform: platformMap[dbPost.platform.toLowerCase()] || 'LinkedIn',
        title: firstLine + (firstLine.length >= 60 ? '...' : ''),
        content: content.split('\n').slice(1).join('\n').substring(0, 100) || content.substring(0, 100),
        type: typeMap[dbPost.format] || 'Single Post',
        duration: dbPost.format === 'video_script' ? '0:30' : undefined,
    };
}

const PostContext = createContext<PostContextType | undefined>(undefined);

export function PostProvider({ children }: { children: ReactNode }) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshPosts = async () => {
        try {
            // Fetch profile first
            const profileRes = await fetch('/api/profile');
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                setProfile(profileData.profile);
            }

            // Then fetch posts
            const postsRes = await fetch('/api/posts');
            if (postsRes.ok) {
                const postsData = await postsRes.json();
                const convertedPosts = (postsData.posts || []).map(convertDbPost);
                setPosts(convertedPosts);
            }
        } catch (err) {
            console.error('Failed to fetch posts:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshPosts();
    }, []);

    const addPost = (newPostData: Omit<Post, 'id'>) => {
        const newPost: Post = {
            ...newPostData,
            id: Math.random().toString(36).substr(2, 9),
        };
        setPosts((prev) => [...prev, newPost]);
    };

    const deletePost = (id: string) => {
        setPosts((prev) => prev.filter((post) => post.id !== id));
    };

    const getPostsForToday = () => {
        return posts
            .filter((post) => isToday(post.scheduledTime))
            .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
    };

    const getMetricCounts = () => {
        // Only count platforms that user has enabled
        const enabledPlatforms: Platform[] = [];
        if (profile?.platforms?.linkedin) enabledPlatforms.push('LinkedIn');
        if (profile?.platforms?.x) enabledPlatforms.push('X');

        // Filter posts to only show enabled platforms
        const filteredPosts = posts.filter(p => enabledPlatforms.includes(p.platform));

        const uniquePlatforms = new Set(filteredPosts.map(p => p.platform));
        const platformBreakdown = filteredPosts.reduce((acc, post) => {
            acc[post.platform] = (acc[post.platform] || 0) + 1;
            return acc;
        }, {} as Record<Platform, number>);

        return {
            totalScheduled: filteredPosts.length,
            activeChannels: uniquePlatforms.size,
            platformBreakdown: {
                LinkedIn: platformBreakdown['LinkedIn'] || 0,
                X: platformBreakdown['X'] || 0,
            }
        };
    };

    return (
        <PostContext.Provider value={{
            posts,
            loading,
            profile,
            getPostsForToday,
            getMetricCounts,
            addPost,
            deletePost,
            refreshPosts
        }}>
            {children}
        </PostContext.Provider>
    );
}

export function usePosts() {
    const context = useContext(PostContext);
    if (context === undefined) {
        throw new Error('usePosts must be used within a PostProvider');
    }
    return context;
}
