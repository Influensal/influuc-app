'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    Send,
    Loader2,
    Twitter,
    Linkedin,
    Trash2,
    Copy,
    Check,
    Plus,
    MessageSquare,
    Menu,
    Image as ImageIcon,
    Music,
    Zap,
    Compass
} from 'lucide-react';

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

const SUGGESTION_PROMPTS = [
    { text: "Create image", icon: ImageIcon, color: "text-[#F4B400]" },
    { text: "Explore ideas", icon: Compass, color: "text-[#D96570]" },
    { text: "Brainstorm content", icon: Zap, color: "text-[#A8C7FA]" },
    { text: "Create music", icon: Music, color: "text-[#4285F4]" },
];

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
}

export default function SpontaneousIdeasPage() {
    const [ideaInput, setIdeaInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [optimisticPrompt, setOptimisticPrompt] = useState<string | null>(null);
    const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
                            if (rawGenerated.length > 0 && Array.isArray(rawGenerated)) {
                                if (rawGenerated[0].role === undefined) {
                                    // Legacy format: Array of PlatformOutputs
                                    messages = [
                                        { role: 'user', content: idea.input },
                                        { role: 'assistant', platformOutputs: rawGenerated }
                                    ];
                                } else {
                                    // New format: Array of ChatMessages
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
            // Prepare history to send to AI (exclude the optimistic prompt)
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
                // PATCH existing thread
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
                // POST new thread
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

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSavedChats(savedChats.filter(chat => chat.id !== id));
        if (currentChatId === id) setCurrentChatId(null);
        try {
            await fetch(`/api/ideas/${id}`, { method: 'DELETE' });
        } catch (err) {
            console.error('Failed to delete idea:', err);
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
        return platform === 'x' ? <Twitter className={className} /> : <Linkedin className={className} />;
    };

    const isEmptyState = activeMessages.length === 0 && !isGenerating && !optimisticPrompt;

    return (
        <div className="flex h-[calc(100vh-80px)] xl:h-[calc(100vh-32px)] overflow-hidden bg-[#131314] text-[#E3E3E3] font-sans -m-6 sm:-m-8">

            {/* Inner Sidebar for Chat History */}
            <div className={`
                shrink-0 bg-[#1E1F20] transition-all duration-300 flex flex-col z-20 
                ${isSidebarOpen ? 'w-[280px] opacity-100' : 'w-0 opacity-0 overflow-hidden'}
            `}>
                <div className="p-4 flex items-center gap-3">
                    <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-[#333537] rounded-full text-[#C4C7C5] transition-colors">
                        <Menu className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setCurrentChatId(null)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-[#333537] bg-[#131314] text-[#C4C7C5] rounded-full transition-all text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        New chat
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 custom-scrollbar">
                    <div className="px-4 py-2 text-[13px] font-medium text-[#C4C7C5] mt-2 mb-1">
                        Recent
                    </div>
                    {savedChats.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-[#C4C7C5]">No chats yet.</div>
                    ) : (
                        savedChats.map((chat) => (
                            <div key={chat.id} className="group relative flex items-center mb-1">
                                <button
                                    onClick={() => setCurrentChatId(chat.id)}
                                    className={`w-full text-left px-4 py-2.5 rounded-full text-[13px] flex items-center gap-3 transition-colors
                                        ${currentChatId === chat.id
                                            ? 'bg-[#333537] text-white'
                                            : 'hover:bg-[#333537] text-[#E3E3E3]'}
                                    `}
                                >
                                    <MessageSquare className="w-4 h-4 shrink-0 text-[#C4C7C5]" />
                                    <span className="truncate pr-6">{chat.input || "Untitled Idea"}</span>
                                </button>
                                <button
                                    onClick={(e) => handleDelete(chat.id, e)}
                                    className={`absolute right-2 p-1.5 text-[#C4C7C5] hover:text-white hover:bg-[#444746] rounded-full opacity-0 group-hover:opacity-100 transition-all`}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative w-full h-full min-w-0 bg-[#131314]">
                {/* Header Navbar */}
                <div className="h-16 flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-2">
                        {!isSidebarOpen && (
                            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-[#1E1F20] bg-transparent rounded-full text-[#C4C7C5] transition-colors md:mr-2">
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        <span className="text-lg font-medium text-[#E3E3E3]">Gemini AI</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto w-full scroll-smooth custom-scrollbar relative flex flex-col items-center">

                    {isEmptyState ? (
                        /* Empty State - Centered */
                        <div className="flex-1 w-full max-w-[800px] flex flex-col justify-center px-4 md:px-8 pb-32">
                            <div className="mb-10 text-left md:text-center w-full">
                                <h1 className="text-4xl md:text-[56px] font-medium mb-3 bg-clip-text text-transparent bg-gradient-to-r from-[#4285F4] via-[#D96570] to-[#F4B400] inline-block tracking-tight">
                                    Hi there
                                </h1>
                                <h2 className="text-4xl md:text-[56px] font-medium text-[#444746] tracking-tight mt-2">
                                    Where should we start?
                                </h2>
                            </div>

                            {/* Center Input Box */}
                            <div className="relative w-full bg-[#1E1F20] rounded-[32px] p-2 flex flex-col border border-transparent focus-within:bg-[#333537]/50 transition-colors shadow-sm">
                                <textarea
                                    ref={textareaRef}
                                    value={ideaInput}
                                    onChange={handleInput}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Enter a prompt here"
                                    rows={1}
                                    className="w-full bg-transparent border-none outline-none resize-none text-[16px] text-[#E3E3E3] placeholder:text-[#C4C7C5] px-5 pt-5 pb-14 max-h-[300px] custom-scrollbar"
                                />
                                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={!ideaInput.trim() || isGenerating}
                                        className={`w-10 h-10 rounded-full transition-colors flex items-center justify-center ${ideaInput.trim() && !isGenerating ? 'bg-[#E3E3E3] text-[#131314] hover:bg-white' : 'text-[#444746] bg-transparent cursor-not-allowed'}`}
                                    >
                                        <Send className="w-4 h-4 shrink-0" />
                                    </button>
                                </div>
                            </div>

                            {/* Suggestion Pills */}
                            <div className="grid grid-cols-2 lg:flex lg:flex-row flex-wrap gap-3 mt-8 justify-center">
                                {SUGGESTION_PROMPTS.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setIdeaInput(s.text);
                                            if (textareaRef.current) {
                                                textareaRef.current.focus();
                                            }
                                        }}
                                        className="flex items-center gap-2 px-5 py-3.5 bg-[#1E1F20] hover:bg-[#333537] rounded-full text-[14px] font-medium text-[#E3E3E3] transition-colors whitespace-nowrap border border-transparent hover:border-[#444746]"
                                    >
                                        <s.icon className={`w-4 h-4 shrink-0 ${s.color}`} />
                                        {s.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Chat State */
                        <div className="w-full max-w-[800px] flex flex-col space-y-6 px-4 md:px-8 pb-40 pt-6">
                            <AnimatePresence initial={false}>
                                {activeMessages.map((msg, idx) => (
                                    <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col w-full">
                                        {msg.role === 'user' ? (
                                            /* User Bubble - Gemini style (light gray/dark gray pill, right aligned) */
                                            <div className="flex justify-end w-full mb-6 relative">
                                                <div className="bg-[#1E1F20] text-[#E3E3E3] px-6 py-4 rounded-3xl max-w-[85%] text-[15.5px] font-medium leading-[1.6] break-words">
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ) : (
                                            /* AI Bubble - Gemini style (no bubble, left aligned with icon) */
                                            <div className="flex justify-start w-full mb-6">
                                                <div className="flex gap-4 w-full">
                                                    {/* Sparkle Icon */}
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4285F4] via-[#D96570] to-[#F4B400] flex items-center justify-center shrink-0 mt-0.5">
                                                        <Sparkles className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div className="flex-1 mt-1 text-[#E3E3E3] space-y-4 overflow-hidden">
                                                        {msg.content && (
                                                            <p className="text-[15.5px] leading-[1.7] whitespace-pre-wrap">{msg.content}</p>
                                                        )}

                                                        {msg.platformOutputs && msg.platformOutputs.length > 0 && (
                                                            <div className="flex flex-col gap-4 mt-4 w-full max-w-2xl">
                                                                {msg.platformOutputs.map((item, index) => (
                                                                    <div key={index} className="bg-[#1E1F20] rounded-2xl p-6 border border-[#333537] relative group">
                                                                        <div className="flex items-center justify-between mb-5">
                                                                            <span className="text-[12px] font-bold uppercase tracking-widest text-[#E3E3E3] bg-[#333537] px-3.5 py-1.5 rounded-full flex items-center gap-2">
                                                                                {renderPlatformIcon(item.platform, "w-3 h-3")} {item.format}
                                                                            </span>
                                                                            <button
                                                                                onClick={() => handleCopy(item.content, `${currentChatId}-${idx}-${index}`)}
                                                                                className="text-[#C4C7C5] hover:text-[#E3E3E3] transition-colors p-2 bg-[#131314] rounded-full opacity-0 group-hover:opacity-100 shadow-sm border border-[#333537]"
                                                                                title="Copy to clipboard"
                                                                            >
                                                                                {copied === `${currentChatId}-${idx}-${index}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                                                            </button>
                                                                        </div>
                                                                        <p className="text-[15px] whitespace-pre-wrap leading-[1.7] text-[#C4C7C5] group-hover:text-[#E3E3E3] transition-colors">{item.content}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}

                                {(optimisticPrompt || isGenerating) && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col w-full">
                                        {optimisticPrompt && (
                                            <div className="flex justify-end w-full mb-6">
                                                <div className="bg-[#1E1F20] text-[#E3E3E3] px-6 py-4 rounded-3xl max-w-[85%] text-[15.5px] font-medium leading-[1.6] break-words opacity-60">
                                                    {optimisticPrompt}
                                                </div>
                                            </div>
                                        )}
                                        {isGenerating && (
                                            <div className="flex justify-start w-full mb-6">
                                                <div className="flex gap-4 w-full">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4285F4] via-[#D96570] to-[#F4B400] flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                                                        <Sparkles className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div className="flex-1 mt-1 text-[#E3E3E3]">
                                                        <span className="text-[15px] bg-clip-text text-transparent bg-gradient-to-r from-[#4285F4] via-[#D96570] to-[#F4B400] font-medium animate-pulse">Generating...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div ref={messagesEndRef} className="h-4 w-full" />
                        </div>
                    )}

                </div>

                {/* Bottom Input Box for Chat State */}
                {!isEmptyState && (
                    <div className="absolute bottom-0 left-0 w-full px-4 md:px-8 bg-gradient-to-t from-[#131314] via-[#131314] to-transparent pt-16 pb-6 flex justify-center z-30 pointer-events-none">
                        <div className="max-w-[800px] w-full relative pointer-events-auto">
                            <div className="relative w-full bg-[#1E1F20] rounded-[32px] p-2 flex flex-col border border-transparent focus-within:bg-[#333537]/50 transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                                <textarea
                                    ref={textareaRef}
                                    value={ideaInput}
                                    onChange={handleInput}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Enter a prompt here"
                                    rows={1}
                                    className="w-full bg-transparent border-none outline-none resize-none text-[16px] text-[#E3E3E3] placeholder:text-[#C4C7C5] px-5 pt-4 pb-12 max-h-[300px] custom-scrollbar"
                                />
                                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={!ideaInput.trim() || isGenerating}
                                        className={`w-10 h-10 rounded-full transition-colors flex items-center justify-center ${ideaInput.trim() && !isGenerating ? 'bg-[#E3E3E3] text-[#131314] hover:bg-white' : 'text-[#444746] bg-transparent cursor-not-allowed'}`}
                                    >
                                        <Send className="w-4 h-4 shrink-0" />
                                    </button>
                                </div>
                            </div>
                            <div className="text-center mt-3 text-[12px] opacity-70 text-[#C4C7C5]">
                                Influuc AI can make mistakes. Verify important information.
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
