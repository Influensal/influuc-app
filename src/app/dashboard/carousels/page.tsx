'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ChevronLeft, ChevronRight, Download, Wand2, Layers, RotateCcw, Check, X } from 'lucide-react';
import { CAROUSEL_STYLES, CarouselStyle } from '@/lib/ai/carousel-styles';

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
        <div className="min-h-screen bg-gradient-to-br from-stone-50 via-stone-100 to-stone-200 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-stone-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-emerald-500/5 to-stone-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/5 backdrop-blur-sm rounded-full text-sm font-medium text-stone-600 mb-4">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        AI-Powered Carousel Studio
                    </div>
                    <h1 className="text-5xl font-black text-stone-900 tracking-tight mb-3">
                        Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-400">Magic</span>
                    </h1>
                    <p className="text-xl text-stone-500 max-w-xl mx-auto">
                        Transform your ideas into stunning Instagram carousels in seconds
                    </p>
                </motion.div>

                {/* Main Content Area */}
                <AnimatePresence mode="wait">
                    {!showResult ? (
                        /* Generation UI */
                        <motion.div
                            key="generator"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="max-w-3xl mx-auto"
                        >
                            {/* Glassmorphism Input Card */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-stone-500/20 rounded-3xl blur-xl" />
                                <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl p-8">
                                    {/* Input */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-bold text-stone-600 uppercase tracking-wider mb-3">
                                            What's your carousel about?
                                        </label>
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder="e.g., 5 habits that 10x'd my productivity as a founder..."
                                            className="w-full p-6 text-xl bg-white/50 border-2 border-stone-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all resize-none min-h-[140px] placeholder:text-stone-300"
                                            disabled={isGenerating}
                                        />
                                    </div>

                                    {/* Style Selector */}
                                    <div className="mb-8">
                                        <label className="block text-sm font-bold text-stone-600 uppercase tracking-wider mb-3">
                                            Visual Style
                                        </label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {CAROUSEL_STYLES.map((style) => (
                                                <button
                                                    key={style.id}
                                                    onClick={() => setSelectedStyle(style)}
                                                    disabled={!style.prompt || isGenerating}
                                                    className={`relative p-4 rounded-xl border-2 transition-all text-left ${selectedStyle.id === style.id
                                                            ? 'border-emerald-500 bg-emerald-50 shadow-lg scale-105'
                                                            : style.prompt
                                                                ? 'border-stone-200 bg-white hover:border-stone-300 hover:shadow'
                                                                : 'border-stone-100 bg-stone-50 opacity-50 cursor-not-allowed'
                                                        }`}
                                                >
                                                    {selectedStyle.id === style.id && (
                                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                                            <Check className="w-4 h-4 text-white" />
                                                        </div>
                                                    )}
                                                    <div className="text-sm font-bold text-stone-800 mb-1">{style.name}</div>
                                                    <div className="text-xs text-stone-500 line-clamp-2">{style.description}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Generate Button */}
                                    <button
                                        onClick={handleGenerate}
                                        disabled={!prompt.trim() || isGenerating}
                                        className="w-full py-5 bg-gradient-to-r from-stone-900 to-stone-800 hover:from-stone-800 hover:to-stone-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:-translate-y-1"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                                <span className="animate-pulse">
                                                    {generationStage === 'thinking' && 'AI is thinking...'}
                                                    {generationStage === 'creating' && 'Creating slides...'}
                                                    {generationStage === 'polishing' && 'Adding visual magic...'}
                                                    {generationStage === 'done' && 'Almost ready!'}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-6 h-6" />
                                                Generate Carousel
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Generation Loading Animation */}
                            <AnimatePresence>
                                {isGenerating && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="mt-12 text-center"
                                    >
                                        <div className="inline-flex items-center gap-4 px-8 py-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg">
                                            <div className="flex gap-2">
                                                {['thinking', 'creating', 'polishing', 'done'].map((stage, i) => (
                                                    <div
                                                        key={stage}
                                                        className={`w-3 h-3 rounded-full transition-all duration-500 ${generationStage === stage
                                                                ? 'bg-emerald-500 scale-125'
                                                                : ['thinking', 'creating', 'polishing', 'done'].indexOf(generationStage) > i
                                                                    ? 'bg-emerald-400'
                                                                    : 'bg-stone-200'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-sm font-medium text-stone-600">
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
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-stone-900 mb-1">Your Carousel is Ready! 🎉</h2>
                                    <p className="text-stone-500">{currentSlides.length} slides • {selectedStyle.name}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleReset}
                                        className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-medium flex items-center gap-2 transition-colors"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        New Carousel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg"
                                    >
                                        <Download className="w-5 h-5" />
                                        Save & Export
                                    </button>
                                </div>
                            </div>

                            {/* Slide Viewer */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Main Preview */}
                                <div className="lg:col-span-2">
                                    <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200">
                                        {/* Slide Container */}
                                        <div
                                            ref={slideContainerRef}
                                            className="aspect-[4/5] relative overflow-hidden bg-stone-100"
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
                                                    <ChevronLeft className="w-6 h-6 text-stone-800" />
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
                                                    <ChevronRight className="w-6 h-6 text-stone-800" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Slide Filmstrip */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm font-bold text-stone-600 uppercase tracking-wider">
                                        <Layers className="w-4 h-4" />
                                        All Slides
                                    </div>
                                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                        {currentSlides.map((slide, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentSlideIndex(i)}
                                                className={`w-full aspect-[4/5] rounded-xl overflow-hidden border-2 transition-all ${i === currentSlideIndex
                                                        ? 'border-emerald-500 ring-4 ring-emerald-500/20 scale-[1.02]'
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
                        className="mt-20"
                    >
                        <h3 className="text-2xl font-bold text-stone-900 mb-6">Your Carousels</h3>
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
                                    className="group relative aspect-[4/5] bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all border border-stone-100"
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
        </div>
    );
}
