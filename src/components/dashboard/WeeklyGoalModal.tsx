'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target,
    Users,
    DollarSign,
    TrendingUp,
    Award,
    Zap,
    Sparkles,
    X,
    Loader2,
    ChevronRight
} from 'lucide-react';

interface WeeklyGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (goal: string, context: string) => Promise<void>;
    weekNumber: number;
}

const goals = [
    {
        id: 'recruiting',
        label: 'Attract Talent',
        description: 'Thought leadership that brings top candidates to you',
        icon: Users,
        color: 'from-blue-500 to-cyan-500',
    },
    {
        id: 'fundraising',
        label: 'Investor Attention',
        description: 'Traction updates and vision that VCs notice',
        icon: DollarSign,
        color: 'from-green-500 to-emerald-500',
    },
    {
        id: 'sales',
        label: 'Generate Leads',
        description: 'Education and soft CTAs that drive inbound',
        icon: TrendingUp,
        color: 'from-orange-500 to-amber-500',
    },
    {
        id: 'credibility',
        label: 'Build Authority',
        description: 'POV posts and expertise that establish trust',
        icon: Award,
        color: 'from-purple-500 to-violet-500',
    },
    {
        id: 'growth',
        label: 'Grow Audience',
        description: 'Engaging takes that expand your reach',
        icon: Zap,
        color: 'from-pink-500 to-rose-500',
    },
    {
        id: 'balanced',
        label: 'Balanced Mix',
        description: 'A little of everything (default)',
        icon: Target,
        color: 'from-gray-500 to-slate-500',
    },
];

export function WeeklyGoalModal({ isOpen, onClose, onGenerate, weekNumber }: WeeklyGoalModalProps) {
    const [selectedGoal, setSelectedGoal] = useState<string>('balanced');
    const [context, setContext] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            await onGenerate(selectedGoal, context);
            onClose();
        } catch (error) {
            console.error('Generation failed:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-2xl bg-[var(--card)] rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] p-6 text-white">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Week {weekNumber} Content</h2>
                                <p className="text-white/80 text-sm">What do you want to achieve?</p>
                            </div>
                        </div>
                    </div>

                    {/* Goals Grid */}
                    <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                            {goals.map((goal) => {
                                const Icon = goal.icon;
                                const isSelected = selectedGoal === goal.id;

                                return (
                                    <button
                                        key={goal.id}
                                        onClick={() => setSelectedGoal(goal.id)}
                                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${isSelected
                                                ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                                                : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                                            }`}
                                    >
                                        {isSelected && (
                                            <motion.div
                                                layoutId="selected-goal"
                                                className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 to-transparent rounded-xl"
                                            />
                                        )}
                                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${goal.color} flex items-center justify-center text-white mb-3`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <p className="font-semibold text-[var(--foreground)] text-sm">
                                            {goal.label}
                                        </p>
                                        <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">
                                            {goal.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Optional Context */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                                Any specific angle this week? (optional)
                            </label>
                            <textarea
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                placeholder="e.g., We just launched a new feature, I'm speaking at a conference, We hit 10K users..."
                                className="w-full p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                                rows={3}
                            />
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full py-4 px-6 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Generating Your Week...
                                </>
                            ) : (
                                <>
                                    Generate My Content
                                    <ChevronRight className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        <p className="text-center text-xs text-[var(--muted-foreground)] mt-4">
                            7 posts for X + 5 posts for LinkedIn will be created
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
