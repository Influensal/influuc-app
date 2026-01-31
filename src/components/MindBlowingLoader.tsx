'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, Sparkles } from 'lucide-react';

const TIPS = [
    "Consistency beats virality 9 times out of 10.",
    "Your hook is 80% of the post's success.",
    "People buy from people, not logos.",
    "LinkedIn's algorithm loves comments more than likes.",
    "Repurposing content is the secret weapon of top creators.",
    "Perfectionism is the enemy of progress.",
    "Engage for 15 mins before posting to boost reach."
];

const LOGS = [
    "Initializing neural pathways...",
    "Scanning industry verticals...",
    "Analyzing competitor signals...",
    "Detected high-signal topic clusters...",
    "Synthesizing unique value proposition...",
    "Drafting hook variations (n=50)...",
    "Optimizing for readability...",
    "Injecting personality vector...",
    "Calibrating tone: 'Visionary'...",
    "Final polish pass..."
];

export default function MindBlowingLoader() {
    const [phase, setPhase] = useState(0); // 0: Analyze, 1: Strategy, 2: Draft
    const [progress, setProgress] = useState(0);
    const [activeTip, setActiveTip] = useState(0);
    const [logLines, setLogLines] = useState<string[]>([]);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Mouse interaction for background
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Progress Simulation
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) return 100;
                // Non-linear progress for realism
                const increment = Math.random() * (prev > 80 ? 0.5 : 2.5);
                return Math.min(prev + increment, 100);
            });
        }, 100);
        return () => clearInterval(interval);
    }, []);

    // Phase Switching
    useEffect(() => {
        if (progress > 30 && phase === 0) setPhase(1);
        if (progress > 70 && phase === 1) setPhase(2);
    }, [progress, phase]);

    // Tip Cycling
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTip(prev => (prev + 1) % TIPS.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // Log Streaming
    useEffect(() => {
        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex < LOGS.length) {
                setLogLines(prev => [...prev.slice(-4), LOGS[currentIndex]]);
                currentIndex++;
            }
        }, 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505] text-white overflow-hidden font-sans">
            {/* Background Grid - Mouse Reactive */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                    transform: `perspective(1000px) rotateX(5deg) translate(${(mousePos.x - window.innerWidth / 2) * 0.01}px, ${(mousePos.y - window.innerHeight / 2) * 0.01}px)`
                }}
            />

            {/* Ambient Glow */}
            <div
                className="absolute w-[800px] h-[800px] bg-[var(--primary)]/5 rounded-full blur-[120px] pointer-events-none transition-all duration-1000 opacity-50"
                style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) translate(${(mousePos.x - window.innerWidth / 2) * -0.05}px, ${(mousePos.y - window.innerHeight / 2) * -0.05}px)`
                }}
            />

            {/* MAIN CONTENT CONTAINER */}
            <div className="relative z-10 w-full max-w-2xl px-8 flex flex-col items-center justify-center min-h-[60vh]">

                {/* 1. STATUS ICON WRAPPER */}
                <div className="mb-12 relative">
                    {/* Ring 1 - Outer Glow */}
                    <div className="absolute inset-0 bg-[var(--primary)]/20 blur-2xl rounded-full" />

                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative w-28 h-28 rounded-full border border-[var(--primary)]/20 flex items-center justify-center bg-black/40 backdrop-blur-sm shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)]"
                    >
                        {/* Rotating Ring */}
                        <div className="absolute inset-0 rounded-full border-[1px] border-t-[var(--primary)] border-r-transparent border-b-[var(--primary)]/30 border-l-transparent w-full h-full animate-[spin_3s_linear_infinite]" />

                        {/* Inner Pulsing Ring */}
                        <div className="absolute inset-2 rounded-full border border-[var(--primary)]/10 animate-pulse" />

                        <AnimatePresence mode="wait">
                            {phase === 0 && (
                                <motion.div key="scan" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                                    <Brain className="w-8 h-8 text-[var(--primary)]" />
                                </motion.div>
                            )}
                            {phase === 1 && (
                                <motion.div key="strategy" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                                    <Zap className="w-8 h-8 text-amber-300" />
                                </motion.div>
                            )}
                            {phase === 2 && (
                                <motion.div key="draft" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                                    <Sparkles className="w-8 h-8 text-indigo-300" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* 2. TEXT STATUS */}
                <div className="text-center space-y-3 mb-12">
                    <h2 className="text-4xl font-light tracking-tight text-white/90">
                        {phase === 0 && "Analyzing your Profile"}
                        {phase === 1 && "Synthesizing Strategy"}
                        {phase === 2 && "Crafting Viral Content"}
                    </h2>
                    <p className="text-[var(--foreground-muted)] text-sm uppercase tracking-[0.2em] opacity-60 font-mono">
                        {phase === 0 && "Reading context data..."}
                        {phase === 1 && "Detecting high-signal angles..."}
                        {phase === 2 && "Finalizing hooks & delivery..."}
                    </p>
                </div>

                {/* 3. PROGRESS BAR - Minimalist */}
                <div className="w-full max-w-md space-y-2 mb-16">
                    <div className="h-[2px] w-full bg-white/5 overflow-hidden">
                        <motion.div
                            className="h-full bg-[var(--primary)] shadow-[0_0_10px_var(--primary)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ type: "spring", stiffness: 20, damping: 10 }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-white/30 font-mono uppercase tracking-widest">
                        <span>0%</span>
                        <span>{Math.round(progress)}%</span>
                        <span>100%</span>
                    </div>
                </div>

                {/* 4. LOGS - Faded & Monospaced */}
                <div className="h-24 w-full max-w-md flex flex-col items-center justify-end space-y-1 mb-8 overflow-hidden mask-image-gradient-to-t">
                    <AnimatePresence mode="popLayout">
                        {logLines.slice(-3).map((line, i) => (
                            <motion.div
                                key={`${line}-${i}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1 - (logLines.slice(-3).length - 1 - i) * 0.4, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`text-[11px] font-mono w-full text-center truncate ${i === logLines.slice(-3).length - 1 ? 'text-[var(--primary)]' : 'text-gray-500'
                                    }`}
                            >
                                <span className="opacity-50 mr-2">{'>'}</span>{line}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* 5. FOOTER TIP - Fixed at bottom */}
            <div className="absolute bottom-12 w-full px-8 text-center">
                <div className="max-w-md mx-auto">
                    <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto mb-6" />

                    <p className="text-[10px] text-[var(--primary)] uppercase tracking-[0.3em] font-bold mb-3">
                        Agency Secret
                    </p>

                    <div className="h-12 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={activeTip}
                                initial={{ opacity: 0, filter: "blur(4px)" }}
                                animate={{ opacity: 1, filter: "blur(0px)" }}
                                exit={{ opacity: 0, filter: "blur(4px)" }}
                                transition={{ duration: 0.5 }}
                                className="text-sm text-gray-400 font-light italic leading-relaxed"
                            >
                                "{TIPS[activeTip]}"
                            </motion.p>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
