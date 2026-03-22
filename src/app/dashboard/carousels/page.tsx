'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { CAROUSEL_STYLES, CarouselStyle } from '@/lib/ai/carousel-styles';
import { FeatureLock } from '@/components/dashboard/FeatureLock';

type GenerationStage = 'idle' | 'thinking' | 'creating' | 'polishing' | 'done';

interface GeneratedCarousel {
    id: string;
    slides: string[];
    topic: string;
    styleId: string;
    createdAt: Date;
}

export default function CarouselStudioPage() {
    const [prompt, setPrompt] = useState('');
    const [selectedStyle, setSelectedStyle] = useState<CarouselStyle>(CAROUSEL_STYLES[0]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStage, setGenerationStage] = useState<GenerationStage>('idle');
    const [currentSlides, setCurrentSlides] = useState<string[]>([]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [savedCarousels, setSavedCarousels] = useState<GeneratedCarousel[]>([]);
    const [showResult, setShowResult] = useState(false);
    const slideContainerRef = useRef<HTMLDivElement>(null);

    // Generate carousel
    const handleGenerate = async () => {
        if (!prompt.trim() || isGenerating) return;

        setIsGenerating(true);
        setGenerationStage('thinking');
        setCurrentSlides([]);
        setShowResult(false);

        // Stage animations
        setTimeout(() => setGenerationStage('creating'), 1500);
        setTimeout(() => setGenerationStage('polishing'), 4000);

        try {
            const res = await fetch('/api/ai/lab/generate-html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    styleId: selectedStyle.id
                })
            });

            const data = await res.json();

            if (data.slides && data.slides.length > 0) {
                setCurrentSlides(data.slides);
                setCurrentSlideIndex(0);
                setGenerationStage('done');

                setTimeout(() => {
                    setShowResult(true);
                    setIsGenerating(false);
                }, 500);
            } else {
                throw new Error('No slides generated');
            }
        } catch (error) {
            console.error('Generation failed:', error);
            setGenerationStage('idle');
            setIsGenerating(false);
            alert('Generation failed. Please try again.');
        }
    };

    // Save carousel
    const handleSave = () => {
        if (currentSlides.length === 0) return;

        const newCarousel: GeneratedCarousel = {
            id: Date.now().toString(),
            slides: currentSlides,
            topic: prompt,
            styleId: selectedStyle.id,
            createdAt: new Date()
        };

        setSavedCarousels(prev => [newCarousel, ...prev]);
        // Could also save to backend here
    };

    // Reset to create new
    const handleReset = () => {
        setCurrentSlides([]);
        setShowResult(false);
        setPrompt('');
        setGenerationStage('idle');
        setCurrentSlideIndex(0);
    };

    return (
        <FeatureLock feature="on-demand-carousels">
            <div className="space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-4xl font-semibold mb-2 tracking-tight text-[var(--foreground)]">
                        Carousel Studio
                    </h1>
                    <p className="text-[15px] text-[var(--foreground-muted)] font-medium">
                        Transform your ideas into stunning Instagram carousels in seconds
                    </p>
                </motion.div>

                {/* Main Content Area */}
                <AnimatePresence mode="wait">
                    {!showResult ? (
                        /* Generation UI */
                        <motion.div
                            key="generator"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <div className="card p-8 border border-[var(--border)] max-w-3xl mx-auto shadow-sm">
                                {/* Input */}
                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-3">
                                        What's your carousel about?
                                    </label>
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="e.g., 5 habits that 10x'd my productivity as a founder..."
                                        className="w-full p-6 text-xl bg-[var(--background-secondary)] border-2 border-[var(--border)] rounded-2xl focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all resize-none min-h-[140px] placeholder-[var(--foreground-muted)]"
                                        disabled={isGenerating}
                                    />
                                </div>

                                {/* Style Selector */}
                                <div className="mb-8">
                                    <label className="block text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-3">
                                        Visual Style
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {CAROUSEL_STYLES.map((style) => (
                                            <button
                                                key={style.id}
                                                onClick={() => setSelectedStyle(style)}
                                                disabled={!style.prompt || isGenerating}
                                                className={`relative p-4 rounded-xl border-2 transition-all text-left ${selectedStyle.id === style.id
                                                    ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-lg scale-105'
                                                    : style.prompt
                                                        ? 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--foreground)]/20 hover:shadow'
                                                        : 'border-[var(--border)] bg-[var(--background-secondary)] opacity-50 cursor-not-allowed'
                                                    }`}
                                            >
                                                {selectedStyle.id === style.id && (
                                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--primary)] rounded-full flex items-center justify-center">
                                                        <i className={`fi fi-sr-check flex items-center justify-center ${"w-4 h-4 text-white"}`}  ></i>
                                                    </div>
                                                )}
                                                <div className="text-sm font-bold text-[var(--foreground)] mb-1">{style.name}</div>
                                                <div className="text-xs text-[var(--foreground-muted)] line-clamp-2">{style.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerate}
                                    disabled={!prompt.trim() || isGenerating}
                                    className="w-full py-4 mt-2 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    {isGenerating ? (
                                        <>
                                            <i className={`fi fi-sr-spinner flex items-center justify-center ${"w-6 h-6 animate-spin"}`}  ></i>
                                            <span className="animate-pulse">
                                                {generationStage === 'thinking' && 'AI is thinking...'}
                                                {generationStage === 'creating' && 'Creating slides...'}
                                                {generationStage === 'polishing' && 'Adding visual magic...'}
                                                {generationStage === 'done' && 'Almost ready!'}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-6 h-6"}`}  ></i>
                                            Generate Carousel
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Generation Loading Animation */}
                            <AnimatePresence>
                                {isGenerating && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="mt-8 text-center flex justify-center"
                                    >
                                        <div className="inline-flex items-center gap-4 px-6 py-3 bg-[var(--background-secondary)] rounded-xl border border-[var(--border)]">
                                            <div className="flex gap-2">
                                                {['thinking', 'creating', 'polishing', 'done'].map((stage, i) => (
                                                    <div
                                                        key={stage}
                                                        className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${generationStage === stage
                                                            ? 'bg-[var(--primary)] scale-125'
                                                            : ['thinking', 'creating', 'polishing', 'done'].indexOf(generationStage) > i
                                                                ? 'bg-[var(--primary)]/40'
                                                                : 'bg-[var(--border)]'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-sm font-medium text-[var(--foreground-muted)]">
                                                {generationStage === 'thinking' && 'Analyzing your topic...'}
                                                {generationStage === 'creating' && 'Crafting each slide...'}
                                                {generationStage === 'polishing' && 'Adding finishing touches...'}
                                                {generationStage === 'done' && 'Complete!'}
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ) : (
                        /* Result View */
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -40 }}
                            className="max-w-6xl mx-auto"
                        >
                            {/* Result Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Your Carousel is Ready! 🎉</h2>
                                    <p className="text-sm text-[var(--foreground-muted)]">{currentSlides.length} slides • {selectedStyle.name}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleReset}
                                        className="px-4 py-2 text-sm text-[var(--foreground-secondary)] bg-[var(--background-secondary)]/50 hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)] rounded-lg font-medium flex items-center gap-2 transition-all"
                                    >
                                        <i className={`fi fi-sr-undo flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                        New Carousel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="px-4 py-2 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
                                    >
                                        <i className={`fi fi-sr-download flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                        Save & Export
                                    </button>
                                </div>
                            </div>

                            {/* Slide Viewer */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Main Preview */}
                                <div className="lg:col-span-2">
                                    <div className="relative bg-[var(--card)] rounded-3xl shadow-2xl overflow-hidden border border-[var(--border)]">
                                        {/* Slide Container */}
                                        <div
                                            ref={slideContainerRef}
                                            className="aspect-[4/5] relative overflow-hidden bg-[var(--background-secondary)]"
                                        >
                                            <div
                                                dangerouslySetInnerHTML={{ __html: currentSlides[currentSlideIndex] || '' }}
                                                className="w-full h-full"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            />
                                        </div>

                                        {/* Navigation */}
                                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/50 to-transparent">
                                            <div className="flex items-center justify-between">
                                                <button
                                                    onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                                                    disabled={currentSlideIndex === 0}
                                                    className="p-3 bg-white/90 hover:bg-white rounded-full shadow-lg disabled:opacity-30 transition-all"
                                                >
                                                    <i className={`fi fi-sr-angle-left flex items-center justify-center ${"w-6 h-6 text-[var(--foreground)]"}`}  ></i>
                                                </button>
                                                <div className="flex gap-2">
                                                    {currentSlides.map((_, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => setCurrentSlideIndex(i)}
                                                            className={`w-2 h-2 rounded-full transition-all ${i === currentSlideIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'
                                                                }`}
                                                        />
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => setCurrentSlideIndex(Math.min(currentSlides.length - 1, currentSlideIndex + 1))}
                                                    disabled={currentSlideIndex === currentSlides.length - 1}
                                                    className="p-3 bg-white/90 hover:bg-white rounded-full shadow-lg disabled:opacity-30 transition-all"
                                                >
                                                    <i className={`fi fi-sr-angle-right flex items-center justify-center ${"w-6 h-6 text-[var(--foreground)]"}`}  ></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Slide Filmstrip */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm font-bold text-stone-600 uppercase tracking-wider">
                                        <i className={`fi fi-sr-layers flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                        All Slides
                                    </div>
                                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                        {currentSlides.map((slide, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentSlideIndex(i)}
                                                className={`w-full aspect-[4/5] rounded-xl overflow-hidden border-2 transition-all ${i === currentSlideIndex
                                                    ? 'border-violet-500 ring-4 ring-violet-500/20 scale-[1.02]'
                                                    : 'border-stone-200 hover:border-stone-300'
                                                    }`}
                                            >
                                                <div
                                                    dangerouslySetInnerHTML={{ __html: slide }}
                                                    className="w-full h-full pointer-events-none"
                                                    style={{
                                                        transform: 'scale(0.25)',
                                                        transformOrigin: 'top left',
                                                        width: '400%',
                                                        height: '400%'
                                                    }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Saved Carousels Gallery */}
                {savedCarousels.length > 0 && !showResult && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-12"
                    >
                        <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">Your Carousels</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {savedCarousels.map((carousel) => (
                                <button
                                    key={carousel.id}
                                    onClick={() => {
                                        setCurrentSlides(carousel.slides);
                                        setPrompt(carousel.topic);
                                        setCurrentSlideIndex(0);
                                        setShowResult(true);
                                    }}
                                    className="group relative aspect-[4/5] bg-[var(--card)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-[var(--border)] cursor-pointer"
                                >
                                    <div
                                        dangerouslySetInnerHTML={{ __html: carousel.slides[0] }}
                                        className="w-full h-full pointer-events-none"
                                        style={{
                                            transform: 'scale(0.2)',
                                            transformOrigin: 'top left',
                                            width: '500%',
                                            height: '500%'
                                        }}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                                        <p className="text-white text-sm font-medium line-clamp-2">{carousel.topic}</p>
                                        <p className="text-white/70 text-xs mt-1">{carousel.slides.length} slides</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </FeatureLock>
    );
}
