'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Compass, Loader2 } from 'lucide-react';
import { ArticleCard, NewsArticle } from '@/components/dashboard/newsjacking/ArticleCard';
import { NewsjackingGenerator } from '@/components/dashboard/newsjacking/NewsjackingGenerator';
import { useAuth } from '@/contexts';

export default function NewsjackingPage() {
    const { activeProfile } = useAuth();
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

    useEffect(() => {
        if (!activeProfile) return;

        const fetchRecommendedNews = async () => {
            setIsLoading(true);
            try {
                // Build a targeted search query based on the founder's ICP
                const queryParts = [];
                if (activeProfile.industry) queryParts.push(activeProfile.industry);
                if (activeProfile.topics && activeProfile.topics.length > 0) {
                    queryParts.push(activeProfile.topics.slice(0, 2).join(' ')); // Take top 2 topics
                }

                // Extremely aggressive, highly specific launch-focused query
                const baseContext = queryParts.length > 0 ? queryParts.join(' ') : 'AI Tech Startups';
                const searchQuery = `newly launched ${baseContext} tool or startup on Hacker News or Product Hunt`;

                const res = await fetch('/api/newsjacking/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic: searchQuery })
                });

                const data = await res.json();
                if (data.results) {
                    setArticles(data.results);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecommendedNews();
    }, [activeProfile]);

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <div className="max-w-7xl mx-auto p-6 md:p-8">
                {/* Header Section */}
                <div className="mb-10 text-center md:text-left">
                    <h1 className="text-4xl md:text-5xl font-black text-[var(--foreground)] tracking-tight mb-4">
                        Newsjacking <span className="text-[var(--primary)] text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">Engine</span>
                    </h1>
                    <p className="text-lg text-[var(--foreground-muted)] max-w-2xl">
                        Hand-picked breaking news ready for your hot take, based on your target audience and industry focus.
                    </p>
                </div>

                {/* Section Title */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-8 w-1.5 bg-[var(--primary)] rounded-full"></div>
                    <h2 className="text-2xl font-bold text-[var(--foreground)]">Recommended Insights for You</h2>
                </div>

                {/* Content Grid */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-6">
                        <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
                        <p className="text-[var(--foreground-muted)] font-bold text-lg animate-pulse">Curating news matching your active profile...</p>
                    </div>
                ) : articles.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {articles.map((article, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className="h-full"
                            >
                                <ArticleCard
                                    article={article}
                                    onSpinStory={(a) => setSelectedArticle(a)}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <div className="text-center py-24 bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm">
                        <Compass className="w-16 h-16 text-[var(--foreground-muted)]/50 mx-auto mb-6" />
                        <h3 className="text-2xl font-bold mb-3 text-[var(--foreground)]">No breaking news found</h3>
                        <p className="text-[var(--foreground-muted)] text-lg">We couldn't find recent news matching your exact profile topics today.</p>
                    </div>
                )}
            </div>

            {/* AI Generator Modal */}
            <NewsjackingGenerator
                article={selectedArticle}
                onClose={() => setSelectedArticle(null)}
            />
        </div>
    );
}
