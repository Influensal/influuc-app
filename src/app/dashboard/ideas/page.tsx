'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '@/contexts';

interface GeneratedContent {
    platform: 'x' | 'linkedin';
    content: string;
    format: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content?: string;
    platformOutputs?: GeneratedContent[];
}

interface SavedChat {
    id: string;
    input: string; // The title/first prompt
    messages: ChatMessage[];
    createdAt: string;
}

export default function SpontaneousIdeasPage() {
    const { user } = useAuth();
    const [ideaInput, setIdeaInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [optimisticPrompt, setOptimisticPrompt] = useState<string | null>(null);
    const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Auto-scroll on new messages
    useEffect(() => {
        const timeoutId = setTimeout(() => scrollToBottom(), 100);
        return () => clearTimeout(timeoutId);
    }, [currentChatId, savedChats, isGenerating, optimisticPrompt]);

    // Fetch existing saved chats
    useEffect(() => {
        const fetchChats = async () => {
            try {
                const res = await fetch('/api/ideas');
                if (res.ok) {
                    const data = await res.json();
                    if (data.ideas) {
                        const parsedChats: SavedChat[] = data.ideas.map((idea: any) => {
                            const rawGenerated = typeof idea.generated_content === 'string'
                                ? JSON.parse(idea.generated_content)
                                : idea.generated_content;

                            let messages: ChatMessage[] = [];

                            // Backwards compatibility check
                            if (rawGenerated && Array.isArray(rawGenerated) && rawGenerated.length > 0) {
                                if (rawGenerated[0].role === undefined) {
                                    messages = [
                                        { role: 'user', content: idea.input },
                                        { role: 'assistant', platformOutputs: rawGenerated }
                                    ];
                                } else {
                                    messages = rawGenerated;
                                }
                            }

                            return {
                                id: idea.id,
                                input: idea.input,
                                messages,
                                createdAt: new Date(idea.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                            };
                        });
                        setSavedChats(parsedChats);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch chats:', err);
            }
        };
        fetchChats();
    }, []);

    const activeChat = savedChats.find(c => c.id === currentChatId);
    const activeMessages = activeChat?.messages || [];

    const handleGenerate = async () => {
        if (!ideaInput.trim()) return;

        const currentInput = ideaInput.trim();
        setOptimisticPrompt(currentInput);
        setIdeaInput('');
        setIsGenerating(true);
        setError(null);

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        try {
            const historyToSent = activeMessages;

            const response = await fetch('/api/ai/generate-idea', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idea: currentInput,
                    platforms: ['x', 'linkedin'],
                    history: historyToSent
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate content');
            }

            const data = await response.json();
            const newAssistantMessage: ChatMessage = { role: 'assistant', platformOutputs: data.content };
            const newUserMessage: ChatMessage = { role: 'user', content: currentInput };

            const updatedMessages = [...activeMessages, newUserMessage, newAssistantMessage];

            if (currentChatId) {
                const res = await fetch(`/api/ideas/${currentChatId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ generatedContent: updatedMessages }),
                });

                if (res.ok) {
                    setSavedChats(prev => prev.map(chat =>
                        chat.id === currentChatId ? { ...chat, messages: updatedMessages } : chat
                    ));
                }
            } else {
                const res = await fetch('/api/ideas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ input: currentInput, generatedContent: updatedMessages }),
                });

                if (res.ok) {
                    const postData = await res.json();
                    if (postData.idea) {
                        const newChat: SavedChat = {
                            id: postData.idea.id,
                            input: postData.idea.input,
                            messages: updatedMessages,
                            createdAt: new Date(postData.idea.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                        };
                        setSavedChats(prev => [newChat, ...prev]);
                        setCurrentChatId(newChat.id);
                    }
                }
            }
        } catch (err) {
            console.error('Generation error:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate content.');
        } finally {
            setIsGenerating(false);
            setOptimisticPrompt(null);
        }
    };

    const handleCopy = async (content: string, id: string) => {
        await navigator.clipboard.writeText(content);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleDeleteChat = async (id: string) => {
        setSavedChats(prev => prev.filter(c => c.id !== id));
        if (currentChatId === id) setCurrentChatId(null);
        try {
            await fetch(`/api/ideas/${id}`, { method: 'DELETE' });
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGenerate();
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setIdeaInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
    };

    const renderPlatformIcon = (platform: string, className = "w-4 h-4") => {
        return platform === 'x' ? <i className={`fi fi-brands-twitter flex items-center justify-center ${className || ""}`}></i> : <i className={`fi fi-brands-linkedin flex items-center justify-center ${className || ""}`}></i>;
    };

    const isEmptyState = activeMessages.length === 0 && !isGenerating && !optimisticPrompt;

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] max-w-5xl mx-auto relative px-4 md:px-0">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-8 shrink-0">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] flex items-center gap-3">
                        <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-8 h-8 text-[var(--primary)]"}`}  ></i>
                        Spontaneous Ideas
                    </h1>
                    <p className="text-[var(--foreground-muted)] text-sm font-medium mt-1">
                        Turn raw thoughts into high-performing content instantly.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-semibold text-[var(--foreground-secondary)] hover:bg-[var(--background-secondary)] transition-all shadow-sm"
                    >
                        <i className="fi fi-sr-time-past flex items-center justify-center w-4 h-4"></i>
                        History ({savedChats.length})
                    </button>
                    <button
                        onClick={() => {
                            setCurrentChatId(null);
                            setIdeaInput('');
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--foreground)] text-[var(--background)] text-sm font-semibold hover:scale-[1.02] transition-all active:scale-[0.98] shadow-lg"
                    >
                        <i className={`fi fi-sr-plus-small flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                        New Thread
                    </button>
                </div>
            </div>

            {/* History Overlay */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute right-0 top-16 w-80 max-h-[70vh] glass-premium z-50 p-6 flex flex-col overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--foreground-muted)]">Recent Threads</h3>
                            <button onClick={() => setShowHistory(false)} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
                                <i className={`fi fi-sr-plus-small flex items-center justify-center ${"w-4 h-4 rotate-45"}`}  ></i>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {savedChats.map(chat => (
                                <div key={chat.id} className="group relative">
                                    <button
                                        onClick={() => {
                                            setCurrentChatId(chat.id);
                                            setShowHistory(false);
                                        }}
                                        className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${currentChatId === chat.id ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'bg-[var(--background-secondary)]/50 border-[var(--border)] hover:border-[var(--primary)]/30 text-[var(--foreground)]'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <i className={`fi fi-sr-comment flex items-center justify-center w-3 h-3 ${currentChatId === chat.id ? 'text-white' : 'text-[var(--primary)]'}`}></i>
                                            <span className="text-[10px] font-semibold opacity-70">{chat.createdAt}</span>
                                        </div>
                                        <span className="text-xs font-semibold line-clamp-1 opacity-90">{chat.input}</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }}
                                        className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                    >
                                        <i className={`fi fi-sr-trash flex items-center justify-center ${"w-3 h-3"}`}  ></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden relative glass-premium p-1 md:p-2 mb-4">
                <div className="w-full h-full overflow-y-auto px-4 md:px-12 py-8 custom-scrollbar space-y-8 pb-32">
                    {/* Landing View (Empty State) */}
                    {isEmptyState ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 pt-12">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-[var(--primary)] via-[#6366f1] to-[var(--secondary)] flex items-center justify-center shadow-2xl relative"
                            >
                                <div className="absolute inset-0 rounded-[32px] bg-white opacity-20 blur-xl animate-pulse" />
                                <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-12 h-12 text-white relative z-10"}`}  ></i>
                            </motion.div>

                            <div className="space-y-4 max-w-2xl">
                                <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[var(--foreground)]">
                                    What's your next <span className="text-[var(--primary)]">big play?</span>
                                </h2>
                                <p className="text-[var(--foreground-muted)] text-lg font-medium">
                                    I'm your strategic growth partner. Drop a raw thought below, and I'll forge it into high-impact content for all your platforms.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-8">
                                {[
                                    { icon: <i className={`fi fi-sr-bolt flex items-center justify-center ${"w-4 h-4"}`}  ></i>, text: "Refactor a complex concept into a simple analogy" },
                                    { icon: <i className={`fi fi-brands-twitter flex items-center justify-center ${"w-4 h-4"}`}  ></i>, text: "Draft a controversial hot-take on industry trends" },
                                    { icon: <i className={`fi fi-brands-linkedin flex items-center justify-center ${"w-4 h-4"}`}  ></i>, text: "Convert a project milestone into a leadership lesson" },
                                    { icon: <i className={`fi fi-sr-comment flex items-center justify-center ${"w-4 h-4"}`}  ></i>, text: "Brainstorm 5 hook ideas for a viral thread" }
                                ].map((prompt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setIdeaInput(prompt.text)}
                                        className="text-left p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all group shadow-sm flex flex-col gap-3"
                                    >
                                        <div className="p-2 rounded-lg bg-[var(--background-secondary)]/50 w-fit text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white transition-all shadow-inner">
                                            {prompt.icon}
                                        </div>
                                        <p className="text-sm font-semibold text-[var(--foreground-secondary)] group-hover:text-[var(--foreground)] leading-snug">
                                            {prompt.text}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        activeMessages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-[var(--foreground)] text-[var(--background)]' : 'bg-[var(--card)] border border-[var(--border)]'} rounded-2xl px-6 py-5 shadow-sm`}>
                                    {msg.content && (
                                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                                            {msg.content}
                                        </p>
                                    )}

                                    {msg.platformOutputs && msg.platformOutputs.length > 0 && (
                                        <div className="flex flex-col gap-6 mt-6">
                                            {msg.platformOutputs.map((item, pIdx) => (
                                                <div key={pIdx} className="bg-[var(--background-secondary)]/30 rounded-xl p-5 border border-[var(--border)] group relative">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2 px-3 py-1 bg-[var(--card)] border border-[var(--border)] rounded-full shadow-sm">
                                                            {renderPlatformIcon(item.platform, "w-3 h-3 text-[var(--primary)]")}
                                                            <span className="text-[10px] font-semibold uppercase tracking-tighter text-[var(--foreground-muted)]">{item.format}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleCopy(item.content, `${currentChatId}-${idx}-${pIdx}`)}
                                                            className="p-1.5 rounded-lg hover:bg-[var(--card)] transition-colors text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                                                        >
                                                            {copied === `${currentChatId}-${idx}-${pIdx}` ? <i className={`fi fi-sr-check flex items-center justify-center ${"w-4 h-4 text-green-500"}`}  ></i> : <i className={`fi fi-sr-copy flex items-center justify-center ${"w-4 h-4"}`}  ></i>}
                                                        </button>
                                                    </div>
                                                    <p className="text-[14px] leading-relaxed text-[var(--foreground-secondary)] font-medium">
                                                        {item.content}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}

                    {(optimisticPrompt || isGenerating) && (
                        <div className="space-y-8">
                            {optimisticPrompt && (
                                <div className="flex justify-end">
                                    <div className="max-w-[85%] bg-[var(--foreground)] text-[var(--background)] rounded-2xl px-6 py-5 shadow-sm opacity-60">
                                        <p className="text-[15px] leading-relaxed font-medium">{optimisticPrompt}</p>
                                    </div>
                                </div>
                            )}
                            {isGenerating && (
                                <div className="flex justify-start">
                                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-full px-6 py-3 flex items-center gap-3 shadow-md">
                                        <i className={`fi fi-sr-spinner flex items-center justify-center ${"w-4 h-4 animate-spin text-[var(--primary)]"}`}  ></i>
                                        <span className="text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">Forging Response...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Bottom Input */}
                <div className="absolute bottom-0 left-0 w-full p-4 md:p-8 bg-gradient-to-t from-[var(--card)] to-transparent pointer-events-none">
                    <div className="max-w-3xl mx-auto relative pointer-events-auto">
                        <div className="relative group">
                            <textarea
                                ref={textareaRef}
                                value={ideaInput}
                                onChange={handleInput}
                                onKeyDown={handleKeyDown}
                                placeholder="Whisper your idea..."
                                rows={1}
                                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl py-4 pl-6 pr-14 text-[15px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all shadow-xl resize-none min-h-[56px] font-medium"
                            />
                            <button
                                onClick={handleGenerate}
                                disabled={!ideaInput.trim() || isGenerating}
                                className={`absolute right-2 top-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${ideaInput.trim() && !isGenerating ? 'bg-[var(--primary)] text-white shadow-[0_4px_12px_rgba(124,58,237,0.3)] hover:scale-105 active:scale-95' : 'bg-[var(--background-secondary)] text-[var(--foreground-muted)] opacity-50 cursor-not-allowed'}`}
                            >
                                {isGenerating ? <i className={`fi fi-sr-spinner flex items-center justify-center ${"w-4 h-4 animate-spin"}`}  ></i> : <i className={`fi fi-sr-paper-plane flex items-center justify-center ${"w-4 h-4"}`}  ></i>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                    <i className={`fi fi-sr-bolt flex items-center justify-center ${"w-3 h-3"}`}  ></i>
                    {error}
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
            `}</style>
        </div>
    );
}
