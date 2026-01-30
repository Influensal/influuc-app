
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Camera, Image as ImageIcon, LayoutTemplate, ArrowRight } from 'lucide-react';

interface StepVisualForkProps {
    data: any;
    updateData: (data: any) => void;
    onComplete: () => void;
}

// Mock Options
const facelessStyles = [
    { id: 'abstract', title: 'Abstract', src: '/placeholder-abstract.jpg' },
    { id: 'neon', title: 'Neon', src: '/placeholder-neon.jpg' },
    { id: 'minimal', title: 'Minimal', src: '/placeholder-minimal.jpg' },
    { id: 'noir', title: 'Noir', src: '/placeholder-noir.jpg' },
];

const faceStyles = [
    { id: 'ted', title: 'TED Talk', src: '/placeholder-ted.jpg' },
    { id: 'office', title: 'Office', src: '/placeholder-office.jpg' },
    { id: 'lifestyle', title: 'Lifestyle', src: '/placeholder-lifestyle.jpg' },
    { id: 'studio', title: 'Studio', src: '/placeholder-studio.jpg' },
];

const carouselStyles = [
    { id: 'modern', title: 'Modern', src: '/placeholder-c-modern.jpg' },
    { id: 'editorial', title: 'Editorial', src: '/placeholder-c-editorial.jpg' },
    { id: 'bold', title: 'Bold', src: '/placeholder-c-bold.jpg' },
    { id: 'type', title: 'Typography', src: '/placeholder-c-type.jpg' },
];

export default function StepVisualFork({ data, updateData, onComplete }: StepVisualForkProps) {
    const tier = data.subscriptionTier || 'starter';
    const [subStep, setSubStep] = useState(0);

    // Define flow based on tier
    // Tier 1: Should not be here (handled strictly in parent, but safety check: empty flow)
    // Tier 2: Faceless -> Carousel
    // Tier 3: Faceless -> Face -> Photos -> Carousel

    const flow = tier === 'growth'
        ? ['faceless', 'carousel']
        : tier === 'authority'
            ? ['faceless', 'face', 'photos', 'carousel']
            : [];

    const currentType = flow[subStep];

    const handleNext = () => {
        if (subStep < flow.length - 1) {
            setSubStep(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    // AUTO-COMPLETE if flow is empty (Starter tier)
    useEffect(() => {
        if (flow.length === 0) {
            console.log('[StepVisualFork] Empty flow (Starter tier), auto-completing...');
            // add small delay to allow UI to render 'Finalizing' state
            const timer = setTimeout(() => {
                onComplete();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [flow.length, onComplete]); // depend on length to avoid deep object dep issues

    if (!currentType) {
        // If we are here, it means flow mock-up is empty OR we finished (but normally finished calls onComplete)
        // Show a loading UI for the auto-complete case
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
                <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
                <h2 className="text-xl font-bold">Finalizing your workspace...</h2>
                <p className="text-[var(--foreground-muted)]">Almost there!</p>
            </div>
        );
    }

    return (
        <motion.div
            key={currentType}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="mb-8">
                <span className="text-xs font-bold text-[var(--primary)] tracking-widest uppercase">
                    Setup {subStep + 1} / {flow.length}
                </span>
                <h1 className="text-3xl font-bold mt-2">
                    {currentType === 'faceless' && "Choose your Faceless Vibe"}
                    {currentType === 'face' && "Choose your Digital Twin Style"}
                    {currentType === 'photos' && "Upload Reference Photos"}
                    {currentType === 'carousel' && "Choose your Carousel Template"}
                </h1>
                <p className="text-[var(--foreground-muted)]">
                    {currentType === 'faceless' && "To support your text when you don't want to show your face."}
                    {currentType === 'face' && "So we can clone you into professional settings."}
                    {currentType === 'photos' && "We need 3-5 clear selfies to train your model."}
                    {currentType === 'carousel' && "For your LinkedIn PDF slides."}
                </p>
            </div>

            {/* SELECTION UI */}
            {(currentType === 'faceless' || currentType === 'face' || currentType === 'carousel') && (
                <div className="grid grid-cols-2 gap-4">
                    {(currentType === 'faceless' ? facelessStyles : currentType === 'face' ? faceStyles : carouselStyles).map(opt => (
                        <div
                            key={opt.id}
                            onClick={() => updateData({ [`style_${currentType}`]: opt.id })}
                            className={`
                                relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all
                                ${data[`style_${currentType}`] === opt.id ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20' : 'border-transparent hover:border-[var(--border)]'}
                            `}
                        >
                            <div className="aspect-square bg-[var(--background-secondary)] flex items-center justify-center text-[var(--foreground-muted)]">
                                {/* Placeholder since we don't have real images yet */}
                                {currentType === 'carousel' ? <LayoutTemplate className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white font-medium">
                                {opt.title}
                            </div>
                            {data[`style_${currentType}`] === opt.id && (
                                <div className="absolute top-2 right-2 bg-[var(--primary)] text-white p-1 rounded-full shadow-lg">
                                    <Check className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* PHOTO UPLOAD UI */}
            {currentType === 'photos' && (
                <div className="border-2 border-dashed border-[var(--border)] rounded-2xl p-12 text-center hover:bg-[var(--background-secondary)] transition-colors cursor-pointer relative">
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                            // Mock upload logic
                            const files = Array.from(e.target.files || []);
                            console.log('Uploaded', files);
                            // In real app, upload to storage and get URLs
                            updateData({ avatar_urls: ['mock_url_1', 'mock_url_2'] }); // Simulate success
                        }}
                    />
                    <div className="w-16 h-16 bg-[var(--background)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Camera className="w-8 h-8 text-[var(--foreground-muted)]" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Drop your selfies here</h3>
                    <p className="text-sm text-[var(--foreground-muted)] max-w-xs mx-auto">
                        Clear lighting, no sunglasses, generic background preferred.
                    </p>
                    {data.avatar_urls && data.avatar_urls.length > 0 && (
                        <div className="mt-4 text-[var(--success)] font-medium flex items-center justify-center gap-2">
                            <Check className="w-4 h-4" />
                            {data.avatar_urls.length} photos uploaded
                        </div>
                    )}
                </div>
            )}

            <button
                onClick={handleNext}
                className="w-full py-4 mt-8 bg-[var(--primary)] text-white rounded-xl font-bold text-lg hover:bg-[var(--primary-hover)] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20"
            >
                Continue <ArrowRight className="w-5 h-5" />
            </button>
        </motion.div>
    );
}
