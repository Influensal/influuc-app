'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Brain, Zap, CheckCircle2, ChevronRight, Terminal } from 'lucide-react';

const TIPS = [
    "Did you know? Consistency beats virality 9 times out of 10.",
    "Pro Tip: Your hook is 80% of the post's success.",
    "Insight: People buy from people, not logos.",
    "Fact: LinkedIn's algorithm loves comments more than likes.",
    "Strategy: Repurposing content is the secret weapon of top creators.",
    "Mindset: perfectionism is the enemy of progress.",
    "Growth: Engage for 15 mins before posting to boost reach."
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
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [logLines, setLogLines] = useState<string[]>([]);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a] text-white overflow-hidden font-sans">
            {/* Background Grid - Mouse Reactive */}
            <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    transform: `perspective(1000px) rotateX(10deg) translate(${(mousePos.x - window.innerWidth / 2) * 0.02}px, ${(mousePos.y - window.innerHeight / 2) * 0.02}px)`
                }}
            />

            {/* Ambient Glow */}
            <div
                className="absolute w-[600px] h-[600px] bg-[var(--primary)]/10 rounded-full blur-[150px] pointer-events-none transition-transform duration-100 ease-out"
                style={{
                    left: mousePos.x - 300,
                    top: mousePos.y - 300,
                }}
            />

            <div className="relative z-10 w-full max-w-3xl p-8 flex flex-col items-center">

                {/* Main Orb / Status Icon */}
                <div className="mb-12 relative group cursor-default">
                    {/* Ring 1 */}
                    <div className="absolute inset-0 bg-[var(--primary)]/20 blur-xl rounded-full animate-pulse" />

                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="relative w-32 h-32 rounded-full border border-[var(--primary)]/30 flex items-center justify-center bg-black/60 backdrop-blur-md shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)] ring-1 ring-[var(--primary)]/20"
                    >
                        {/* Spinning dashed ring */}
                        <div className="absolute inset-0 rounded-full border border-dashed border-[var(--primary)]/30 w-full h-full animate-[spin_10s_linear_infinite]" />

                        <AnimatePresence mode="wait">
                            {phase === 0 && (
                                <motion.div
                                    key="scan"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="relative flex items-center justify-center"
                                >
                                    <Brain className="w-10 h-10 text-[var(--primary)] drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
                                </motion.div>
                            )}
                            {phase === 1 && (
                                <motion.div
                                    key="strategy"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                >
                                    <Zap className="w-10 h-10 text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
                                </motion.div>
                            )}
                            {phase === 2 && (
                                <motion.div
                                    key="draft"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                >
                                    <Sparkles className="w-10 h-10 text-indigo-300 drop-shadow-[0_0_15px_rgba(165,180,252,0.6)]" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* Status Text */}
                <div className="text-center space-y-2 mb-8">
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                        {phase === 0 && "Analyzing Your Profile"}
                        {phase === 1 && "Synthesizing Strategy"}
                        {phase === 2 && "Crafting Viral Content"}
                    </h2>
                    <p className="text-[var(--foreground-muted)] text-sm uppercase tracking-widest opacity-80">
                        {phase === 0 && "Reading context data..."}
                        {phase === 1 && "Detecting high-signal angles..."}
                        {phase === 2 && "Finalizing hooks & delivery..."}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-sm h-1 bg-white/10 rounded-full mt-4 mb-2 overflow-hidden relative">
                    <motion.div
                        className="absolute h-full bg-gradient-to-r from-[var(--primary)] to-indigo-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ stiffness: 50, damping: 10 }}
                    />
                </div>
                <div className="flex justify-between w-full max-w-sm text-[10px] text-[var(--foreground-muted)] uppercase tracking-widest font-mono mb-16 opacity-60">
                    <span>Init</span>
                    <span>{Math.round(progress)}%</span>
                    <span>Complete</span>
                </div>

                {/* Logs - More minimal/premium now */}
                <div className="w-full max-w-lg mb-12">
                    <div className="flex flex-col items-center space-y-2">
                        {logLines.slice(-3).map((line, i) => ( // Show fewer lines
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`text-xs font-mono transition-colors duration-500 ${i === logLines.slice(-3).length - 1 ? 'text-[var(--primary)] brightness-125' : 'text-gray-500'}`}
                            >
                                <span className="opacity-30 mr-2">›</span>{line}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Insights / Tips */}
                <div className="absolute bottom-12 text-center max-w-md w-full px-4">
                    <div className="w-8 h-[1px] bg-white/20 mx-auto mb-6" />
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTip}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="space-y-2"
                        >
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--foreground-muted)]">Agency Secret</p>
                            <p className="text-base text-gray-300 font-light leading-relaxed">
                                {TIPS[activeTip]}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
