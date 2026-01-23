'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lightbulb,
    Send,
    Twitter,
    Linkedin,
    Copy,
    Check,
    Trash2,
    Bookmark,
    Sparkles,
    User,
    Mail,
    MessageCircle,
    Code,
    Paperclip,
    Loader2,
} from 'lucide-react';

interface GeneratedContent {
    platform: 'x' | 'linkedin';
    content: string;
    format: string;
}

interface SavedIdea {
    id: number;
    input: string;
    generated: GeneratedContent[];
    createdAt: string;
}

// Suggestion prompts for the cards
const SUGGESTION_PROMPTS = [
    {
        text: "Write a LinkedIn post about my latest startup milestone",
        icon: User,
    },
    {
        text: "Generate a thread on productivity tips for founders",
        icon: Mail,
    },
    {
        text: "Summarize my thoughts on AI in content creation",
        icon: MessageCircle,
    },
    {
        text: "Create a hot take on remote work culture",
        icon: Code,
    },
];

// Get time-based greeting
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
}

export default function SpontaneousIdeasPage() {
    const [ideaInput, setIdeaInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent[] | null>(null);
    const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([
        {
            id: 1,
            input: "Remote work is killing company culture",
            generated: [
                {
                    platform: 'x',
                    content: "Hot take: Remote work isn't killing company culture.\n\nBad management is.\n\nRemote just made it visible.",
                    format: 'Single Post',
                },
            ],
            createdAt: '2 hours ago',
        },
    ]);
    const [copied, setCopied] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!ideaInput.trim()) return;

        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/ai/generate-idea', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idea: ideaInput,
                    platforms: ['x', 'linkedin'],
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate content');
            }

            const data = await response.json();
            setGeneratedContent(data.content);
        } catch (err) {
            console.error('Generation error:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate content. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = () => {
        if (generatedContent) {
            setSavedIdeas([
                {
                    id: Date.now(),
                    input: ideaInput,
                    generated: generatedContent,
                    createdAt: 'Just now',
                },
                ...savedIdeas,
            ]);
            setIdeaInput('');
            setGeneratedContent(null);
        }
    };

    const handleCopy = async (content: string, id: number) => {
        await navigator.clipboard.writeText(content);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleDelete = (id: number) => {
        setSavedIdeas(savedIdeas.filter(idea => idea.id !== id));
    };

    const handleSuggestionClick = (text: string) => {
        setIdeaInput(text);
    };

    const getPlatformIcon = (platform: string) => {
        switch (platform) {
            case 'x': return Twitter;
            case 'linkedin': return Linkedin;
            default: return Lightbulb;
        }
    };

    const getPlatformStyle = (platform: string) => {
        switch (platform) {
            case 'x': return 'bg-black text-white';
            case 'linkedin': return 'bg-[#0A66C2] text-white';
            default: return 'bg-[var(--primary)] text-white';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGenerate();
        }
    };

    return (
        <div className="min-h-[calc(100vh-200px)] flex flex-col">
            {/* Hero Section - Centered */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col items-center justify-center px-4"
            >
                {/* 3D Glossy Sphere */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                    className="relative w-20 h-20 mb-8"
                >
                    {/* Main sphere with 3D effect */}
                    <div
                        className="absolute inset-0 rounded-full"
                        style={{
                            background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 30%, #6d28d9 60%, #4c1d95 100%)',
                            boxShadow: `
                                0 20px 40px rgba(124, 58, 237, 0.4),
                                0 10px 20px rgba(124, 58, 237, 0.3),
                                inset 0 -10px 30px rgba(0, 0, 0, 0.3),
                                inset 0 10px 20px rgba(255, 255, 255, 0.2)
                            `,
                        }}
                    />
                    {/* Highlight */}
                    <div
                        className="absolute top-2 left-3 w-6 h-6 rounded-full"
                        style={{
                            background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)',
                        }}
                    />
                    {/* Secondary highlight */}
                    <div
                        className="absolute top-4 left-5 w-2 h-2 rounded-full"
                        style={{
                            background: 'rgba(255,255,255,0.9)',
                        }}
                    />
                </motion.div>

                {/* Greeting */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] mb-2">
                        {getGreeting()}
                    </h1>
                    <h2 className="text-3xl md:text-4xl font-semibold">
                        <span className="text-[var(--foreground)]">What's on </span>
                        <span
                            className="bg-gradient-to-r from-purple-500 via-violet-500 to-purple-600 bg-clip-text text-transparent"
                        >
                            your mind?
                        </span>
                    </h2>
                </motion.div>

                {/* Chat Input Area */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="w-full max-w-2xl"
                >
                    <div
                        className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-lg overflow-hidden"
                        style={{
                            boxShadow: 'var(--shadow-md)',
                        }}
                    >
                        {/* Input Area */}
                        <div className="p-4">
                            <div className="flex items-start gap-3">
                                <Sparkles className="w-5 h-5 text-[var(--foreground-muted)] mt-1 flex-shrink-0" />
                                <textarea
                                    value={ideaInput}
                                    onChange={(e) => setIdeaInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask AI a question or make a request..."
                                    rows={3}
                                    className="flex-1 bg-transparent border-none outline-none resize-none text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] text-base"
                                />
                            </div>
                        </div>

                        {/* Bottom Toolbar */}
                        <div className="px-4 pb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--foreground-secondary)] hover:bg-[var(--background-secondary)] transition-colors"
                                >
                                    <Paperclip className="w-4 h-4" />
                                    Attach
                                </button>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={!ideaInput.trim() || isGenerating}
                                className={`
                                    flex items-center justify-center w-10 h-10 rounded-full transition-all
                                    ${ideaInput.trim() && !isGenerating
                                        ? 'bg-[var(--foreground)] text-white hover:scale-105 shadow-lg'
                                        : 'bg-[var(--background-secondary)] text-[var(--foreground-muted)] cursor-not-allowed'
                                    }
                                `}
                            >
                                {isGenerating ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm"
                        >
                            <strong>Error:</strong> {error}
                        </motion.div>
                    )}
                </motion.div>

                {/* Suggestion Cards */}
                {!generatedContent && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="w-full max-w-4xl mt-12"
                    >
                        <p className="text-xs font-semibold tracking-wider text-[var(--foreground-muted)] mb-4 text-center uppercase">
                            Get started with an example below
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {SUGGESTION_PROMPTS.map((suggestion, index) => {
                                const IconComponent = suggestion.icon;
                                return (
                                    <motion.button
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 + index * 0.05 }}
                                        onClick={() => handleSuggestionClick(suggestion.text)}
                                        className="group p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] hover:border-[var(--border-hover)] hover:shadow-md transition-all text-left"
                                    >
                                        <p className="text-sm text-[var(--foreground-secondary)] group-hover:text-[var(--foreground)] mb-4 line-clamp-2">
                                            {suggestion.text}
                                        </p>
                                        <IconComponent className="w-5 h-5 text-[var(--foreground-muted)]" />
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* Generated Content */}
            <AnimatePresence>
                {generatedContent && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="max-w-4xl mx-auto w-full px-4 mt-8 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Generated Content</h2>
                            <button
                                onClick={handleSave}
                                className="btn btn-outline flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] text-sm font-medium hover:bg-[var(--background-secondary)] transition-colors"
                            >
                                <Bookmark className="w-4 h-4" />
                                Save for Later
                            </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {generatedContent.map((item, index) => {
                                const PlatformIcon = getPlatformIcon(item.platform);
                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4"
                                    >
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getPlatformStyle(item.platform)}`}>
                                                <PlatformIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium capitalize">{item.platform === 'x' ? 'X' : item.platform}</p>
                                                <p className="text-xs text-[var(--foreground-muted)]">{item.format}</p>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-[var(--background-secondary)] rounded-xl text-sm whitespace-pre-wrap mb-3">
                                            {item.content}
                                        </div>
                                        <button
                                            onClick={() => handleCopy(item.content, index)}
                                            className="btn btn-primary w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium"
                                        >
                                            {copied === index ? (
                                                <>
                                                    <Check className="w-4 h-4" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4" />
                                                    Copy to Post
                                                </>
                                            )}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Saved Ideas */}
            {savedIdeas.length > 0 && (
                <div className="max-w-4xl mx-auto w-full px-4 mt-12 space-y-4 pb-8">
                    <h2 className="text-lg font-semibold">Saved Ideas</h2>
                    <div className="space-y-3">
                        {savedIdeas.map((idea) => (
                            <motion.div
                                key={idea.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <p className="font-medium text-[var(--foreground)]">"{idea.input}"</p>
                                        <p className="text-xs text-[var(--foreground-muted)]">{idea.createdAt}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(idea.id)}
                                        className="p-2 hover:bg-[var(--background-secondary)] rounded-lg text-[var(--foreground-muted)] hover:text-[var(--error)] transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {idea.generated.map((item, index) => {
                                        const PlatformIcon = getPlatformIcon(item.platform);
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => handleCopy(item.content, idea.id * 100 + index)}
                                                className={`
                                                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
                                                    ${copied === idea.id * 100 + index
                                                        ? 'bg-[var(--success)] text-white'
                                                        : 'bg-[var(--background-secondary)] hover:bg-[var(--border)]'}
                                                `}
                                            >
                                                <PlatformIcon className="w-3 h-3" />
                                                {copied === idea.id * 100 + index ? 'Copied!' : `Copy ${item.platform === 'x' ? 'X' : item.platform}`}
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
