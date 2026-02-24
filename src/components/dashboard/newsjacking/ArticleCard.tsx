import React from 'react';
import { ExternalLink, Zap } from 'lucide-react';

export interface NewsArticle {
    title: string;
    url: string;
    content: string;
    publishedDate?: string;
    score?: number;
    image?: string;
}

interface ArticleCardProps {
    article: NewsArticle;
    onSpinStory: (article: NewsArticle) => void;
}

export function ArticleCard({ article, onSpinStory }: ArticleCardProps) {
    const domain = article.url ? new URL(article.url).hostname.replace('www.', '') : 'News Source';

    return (
        <div className="bg-[var(--card)] rounded-2xl p-5 border border-[var(--border)] shadow-sm hover:shadow-md transition-all flex flex-col group h-full">
            {article.image && (
                <div className="w-full h-48 bg-stone-100 dark:bg-stone-800 rounded-xl mb-4 overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                </div>
            )}

            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                <span>{domain}</span>
                {article.publishedDate && (
                    <>
                        <span className="text-[var(--foreground-muted)]">•</span>
                        <span className="text-[var(--foreground-muted)]">
                            {new Date(article.publishedDate).toLocaleDateString()}
                        </span>
                    </>
                )}
            </div>

            <h3 className="text-lg md:text-xl font-bold text-[var(--foreground)] leading-snug mb-3 line-clamp-3">
                {article.title}
            </h3>

            <p className="text-sm text-[var(--foreground-muted)] line-clamp-4 mb-6 flex-1">
                {article.content}
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-auto">
                <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                >
                    <ExternalLink className="w-4 h-4" />
                    Read Source
                </a>
                <button
                    onClick={() => onSpinStory(article)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:opacity-90 transition-all"
                >
                    <Zap className="w-4 h-4" />
                    Spin this Story
                </button>
            </div>
        </div>
    );
}
