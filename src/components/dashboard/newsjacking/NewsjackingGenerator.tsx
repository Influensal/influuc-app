import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '@/contexts';

import { NewsArticle } from './ArticleCard';

interface NewsjackingGeneratorProps {
    article: NewsArticle | null;
    onClose: () => void;
}

export function NewsjackingGenerator({ article, onClose }: NewsjackingGeneratorProps) {
    const { user } = useAuth(); // or pull full context from wherever the global state is
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPost, setGeneratedPost] = useState<string | null>(null);
    const [editedPost, setEditedPost] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Mock contextual goals for the prompt
    const [tone, setTone] = useState('Contrarian & Bold');

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            // Provide some default context if full DB profile isn't instantly available in this component
            const userContext = {
                targetAudience: "Founders and creators",
                tone: tone,
                industry: "Tech and Startups",
                contentGoal: "Build authority and drive engagement"
            };

            const res = await fetch('/api/newsjacking/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ article, context: userContext })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to generate post');
            }

            const data = await res.json();
            setGeneratedPost(data.post);
            setEditedPost(data.post);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSavePost = async () => {
        setIsSaving(true);
        try {
            // For now, copy to clipboard or just alert. Later, integrate with /api/posts.
            await navigator.clipboard.writeText(editedPost);
            alert('Post copied to clipboard! Ready to publish.');
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!article) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-[var(--background)]/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-4xl bg-[var(--card)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[var(--border)]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-[var(--border)] shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
                                <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-5 h-5 text-[var(--primary)]"}`}  ></i>
                                Newsjacking Engine
                            </h2>
                            <p className="text-sm text-[var(--foreground-muted)] line-clamp-1 mt-1 font-medium">
                                Origin: {article.title}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-secondary)] rounded-full transition-colors">
                            <i className={`fi fi-sr-cross-small flex items-center justify-center ${"w-6 h-6"}`}  ></i>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
                        {!generatedPost && !isGenerating ? (
                            <div className="text-center py-12 max-w-xl mx-auto">
                                <div className="w-20 h-20 bg-[var(--primary-light)] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm">
                                    <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-10 h-10 text-[var(--primary)]"}`}  ></i>
                                </div>
                                <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight mb-4">Spin this breaking news</h3>
                                <p className="text-lg text-[var(--foreground-muted)] mb-10 leading-relaxed">
                                    The AI will analyze this article and draft a highly-engaging thought-leadership essay tailored to your specific industry and voice.
                                </p>

                                 {/* Tone Selector (Optional Config) */}
                                <div className="max-w-xs mx-auto mb-10 text-left">
                                    <label className="block text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <i className={`fi fi-sr-settings-sliders flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                        Angle / Tone
                                    </label>
                                    <select
                                        value={tone}
                                        onChange={(e) => setTone(e.target.value)}
                                        className="w-full p-3 bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl text-[var(--foreground)] font-medium focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                    >
                                        <option>Contrarian & Bold</option>
                                        <option>Educational & Insightful</option>
                                        <option>Polarizing (Hot Take)</option>
                                        <option>Inspirational / Founder Journey</option>
                                    </select>
                                </div>

                                {article.spiky_take && (
                                    <div className="max-w-xl mx-auto mb-10 p-4 bg-[var(--primary-light)]/30 border border-[var(--primary)]/20 rounded-2xl text-left relative group">
                                         <div className="absolute -top-3 left-4 px-2 py-0.5 bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                                            AI Angle
                                        </div>
                                        <p className="text-sm text-[var(--foreground)] italic font-medium leading-relaxed">
                                            "{article.spiky_take}"
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={handleGenerate}
                                    className="w-full md:w-auto px-10 py-4 bg-gradient-to-r from-[var(--foreground)] to-stone-700 text-[var(--background)] hover:from-stone-800 hover:to-stone-900 rounded-2xl font-bold text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
                                >
                                    Generate Hot Take
                                </button>
                                {error && (
                                    <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                                        {error}
                                    </div>
                                )}
                            </div>
                        ) : isGenerating ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-6">
                                <div className="relative w-16 h-16">
                                    <div className="absolute inset-0 border-4 border-[var(--primary)]/20 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
                                </div>
                                <p className="text-lg font-semibold text-[var(--foreground-muted)] animate-pulse">Analyzing news and writing your post...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <label className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-wider flex items-center gap-2">
                                    <i className={`fi fi-sr-document flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                    Review & Edit Post
                                </label>
                                <textarea
                                    className="flex-1 w-full p-6 bg-[var(--background)] border-2 border-[var(--border)] rounded-2xl resize-none focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] text-[var(--foreground)] text-lg leading-relaxed shadow-inner"
                                    value={editedPost}
                                    onChange={(e) => setEditedPost(e.target.value)}
                                    rows={12}
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {generatedPost && (
                        <div className="p-6 border-t border-[var(--border)] flex justify-end gap-3 bg-[var(--background-secondary)] shrink-0">
                            <button onClick={onClose} className="px-6 py-3 font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePost}
                                disabled={isSaving}
                                className="px-8 py-3 font-bold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
                            >
                                {isSaving ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <i className={`fi fi-sr-check flex items-center justify-center ${"w-5 h-5 flex-shrink-0"}`}  ></i>
                                )}
                                Copy to Clipboard
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
