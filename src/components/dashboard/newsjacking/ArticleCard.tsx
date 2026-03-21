import React from 'react';
import { motion } from 'framer-motion';

export interface NewsArticle {
    title: string;
    url: string;
    content: string;
    publishedDate?: string;
    score?: number;
    image?: string;
    spiky_take?: string;
    category?: string[];
}

interface ArticleCardProps {
    article: NewsArticle;
    onSpinStory: (article: NewsArticle) => void;
}

export function ArticleCard({ article, onSpinStory }: ArticleCardProps) {
    const domain = article.url ? new URL(article.url).hostname.replace('www.', '') : 'News Source';

    return (
        <div className="group relative h-full flex flex-col bg-[#0A0710]/40 rounded-[2rem] border border-white/[0.04] p-8 hover:bg-[#0A0710]/60 hover:border-white/[0.08] transition-all duration-500 overflow-hidden flex-1 min-h-0">
            {/* Meta Top Bar */}
            <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                <div className="px-2.5 py-1 bg-white/[0.03] border border-white/[0.05] rounded text-[9px] font-bold tracking-wider text-white/30 uppercase">
                    {domain}
                </div>
                {article.category?.slice(0, 1).map((cat, idx) => (
                    <div key={idx} className="text-[9px] font-bold tracking-widest text-[var(--primary)] uppercase opacity-60">
                        {cat}
                    </div>
                ))}
            </div>

            {/* Content Container: Uses flex-1 and min-h-0 for internal scroll if needed */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <h3 className="text-2xl font-semibold text-white leading-tight tracking-tight mb-8 line-clamp-3 flex-shrink-0">
                    {article.title}
                </h3>

                {/* The "Angle" / Spiky Take */}
                {article.spiky_take && (
                    <div className="mb-8 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.03] flex-shrink-0">
                        <div className="text-[10px] font-bold tracking-[0.1em] text-[var(--primary)] mb-3 uppercase opacity-50">Operational Insight</div>
                        <p className="text-[15px] font-medium text-white/80 leading-relaxed italic">
                            "{article.spiky_take}"
                        </p>
                    </div>
                )}

                {/* Original Snippet: Matte text inside scroll area */}
                <div className="flex-1 overflow-y-auto pr-4 subtle-scroll text-sm text-white/30 font-medium leading-relaxed">
                    <p>{article.content}</p>
                </div>
            </div>

            {/* Simple Refined Action Bar */}
            <div className="mt-8 pt-6 border-t border-white/[0.03] flex items-center justify-between flex-shrink-0">
                <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-semibold text-white/20 hover:text-white transition-colors uppercase tracking-wider"
                >
                    Source
                </a>
                
                <button
                    onClick={() => onSpinStory(article)}
                    className="px-6 py-2.5 bg-white text-black rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-[var(--primary)] hover:text-white transition-all duration-300"
                >
                    Forge Content
                </button>
            </div>

            <style jsx>{`
                .subtle-scroll::-webkit-scrollbar {
                    width: 2px;
                }
                .subtle-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .subtle-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 10px;
                }
                .group:hover .subtle-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.08);
                }
            `}</style>
        </div>
    );
}
