'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';


interface StepVisualForkProps {
    data: any;
    updateData: (data: any) => void;
    onComplete: () => void;
}

// Style options
import { CAROUSEL_STYLES } from '@/lib/ai/carousel-styles';

// --- Mini Slide Preview Component ---
const facelessStyles = [
    { id: 'abstract', title: 'Abstract', preview: '/previews/abstract.png' },
    { id: 'neon', title: 'Neon', preview: '/previews/neon.png' },
    { id: 'minimal', title: 'Minimal', preview: '/previews/minimal.png' },
    { id: 'noir', title: 'Noir', preview: '/previews/noir.png' },
    { id: 'journal', title: 'Journal', preview: '/previews/journal.png' },
    { id: 'hypercinematic', title: 'Hypercinematic', preview: '/previews/hypercinematic.png' },
    { id: 'architectural', title: 'Architectural', preview: '/previews/architectural.png' },
    { id: 'glassmorphism', title: 'Glassmorphism', preview: '/previews/glassmorphism.png' },
    { id: 'paper-craft', title: 'Paper-Craft', preview: '/previews/paper-craft.png' },
    { id: 'dark-terminal', title: 'Dark Terminal', preview: '/previews/dark-terminal.png' },
];

const faceStyles = [
    { id: 'photorealistic', title: 'Photorealistic', preview: '/previews/photorealistic.png' },
    { id: 'authority', title: 'Authority', preview: '/previews/authority.png' },
    { id: 'viral', title: 'Viral', preview: '/previews/viral.png' },
    { id: 'candid-cinematic', title: 'Candid Cinematic', preview: '/previews/candid-cinematic.png' },
    { id: 'masterclass', title: 'Masterclass', preview: '/previews/masterclass.png' },
    { id: 'pov-lifestyle', title: 'POV Lifestyle', preview: '/previews/pov-lifestyle.png' },
    { id: 'analog-loft', title: 'Analog Loft', preview: '/previews/analog-loft.png' },
];

const MiniSlide = ({ styleId }: { styleId: string }) => {
    switch (styleId) {
        case 'minimal-stone':
            return (
                <div className="w-full h-full bg-stone-100 flex flex-col items-center justify-center p-3 text-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 mb-2"></div>
                    <div className="h-2 w-16 bg-stone-800 rounded-full mb-1"></div>
                    <div className="h-1 w-10 bg-stone-400 rounded-full"></div>
                </div>
            );
        case 'neon-dark':
            return (
                <div className="w-full h-full bg-gray-950 flex flex-col items-center justify-center p-3 text-center overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-fuchsia-500/20 blur-xl"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 bg-cyan-500/20 blur-xl"></div>
                    <div className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">NEON</div>
                    <div className="h-1 w-12 bg-gradient-to-r from-cyan-400 to-fuchsia-500 mt-2 rounded-full"></div>
                </div>
            );
        case 'luxe-gold':
            return (
                <div className="w-full h-full bg-black border border-stone-800 flex flex-col items-center justify-center p-3 text-center">
                    <div className="text-xl font-serif text-amber-500 italic">Luxe</div>
                    <div className="h-[1px] w-8 bg-amber-500 my-2"></div>
                    <div className="text-[8px] text-stone-400 uppercase tracking-widest">Premium</div>
                </div>
            );
        case 'bold-editorial':
            return (
                <div className="w-full h-full bg-white border-4 border-black flex flex-col items-center justify-center p-2 text-center">
                    <div className="bg-black text-white px-2 py-0.5 text-[8px] font-bold uppercase mb-1 -rotate-2">Warning</div>
                    <div className="text-lg font-black text-black uppercase leading-none">
                        BOLD<br /><span className="text-red-600">AF</span>
                    </div>
                </div>
            );
        default:
            return (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <i className={`fi fi-sr-apps flex items-center justify-center ${"w-8 h-8 text-gray-400"}`}  ></i>
                </div>
            );
    }
};

export default function StepVisualFork({ data, updateData, onComplete }: StepVisualForkProps) {
    const tier = data.subscriptionTier || 'starter';
    const [subStep, setSubStep] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

    // Define flow based on tier
    const flow = tier === 'creator'
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
            const timer = setTimeout(() => {
                onComplete();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [flow.length, onComplete]);

    // Upload photos to Supabase Storage
    const handlePhotoUpload = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            Array.from(files).forEach((file, index) => {
                formData.append(`file_${index}`, file);
            });

            const response = await fetch('/api/upload/avatar', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            // Update data with real URLs
            const existingUrls = data.avatar_urls || [];
            updateData({ avatar_urls: [...existingUrls, ...result.urls] });
            setUploadedFiles(prev => [...prev, ...Array.from(files)]);

        } catch (err) {
            console.error('Photo upload error:', err);
            setUploadError(err instanceof Error ? err.message : 'Failed to upload photos');
        } finally {
            setUploading(false);
        }
    }, [data.avatar_urls, updateData]);

    const removePhoto = (index: number) => {
        const newUrls = [...(data.avatar_urls || [])];
        newUrls.splice(index, 1);
        updateData({ avatar_urls: newUrls });

        const newFiles = [...uploadedFiles];
        newFiles.splice(index, 1);
        setUploadedFiles(newFiles);
    };

    // Loading state for Starter tier auto-complete
    if (!currentType) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
                <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
                <h2 className="text-xl font-bold">Finalizing your workspace...</h2>
                <p className="text-[var(--foreground-muted)]">Almost there!</p>
            </div>
        );
    }

    const photoCount = (data.avatar_urls?.length || 0);
    const canProceedFromPhotos = photoCount >= 3;

    // Helper to get options for current type
    const getOptions = (): { id: string; title: string }[] => {
        switch (currentType) {
            case 'faceless': return facelessStyles;
            case 'face': return faceStyles;
            case 'carousel':
                // Map global carousel styles to format expected by UI
                return CAROUSEL_STYLES.map(s => ({ id: s.id, title: s.name }));
            default: return [];
        }
    };

    const options = getOptions();

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

            {/* STYLE SELECTION UI */}
            {(currentType === 'faceless' || currentType === 'face' || currentType === 'carousel') && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {options.map(opt => (
                        <div
                            key={opt.id}
                            onClick={() => updateData({ [`style_${currentType}`]: opt.id })}
                            className={`
                                relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all
                                ${data[`style_${currentType}`] === opt.id ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20' : 'border-transparent hover:border-[var(--border)]'}
                            `}
                        >
                            <div className="aspect-video bg-[var(--background-secondary)] flex items-center justify-center text-[var(--foreground-muted)] overflow-hidden">
                                {currentType === 'carousel' ? (
                                    <MiniSlide styleId={opt.id} />
                                ) : (opt as any).preview ? (
                                    <img src={(opt as any).preview} alt={opt.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                ) : (
                                    <i className={`fi fi-sr-picture flex items-center justify-center ${"w-8 h-8"}`}  ></i>
                                )}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white font-medium">
                                {opt.title}
                            </div>
                            {(() => {
                                const isSelected = data[`style_${currentType}`] === opt.id ||
                                    (opt.id === 'photorealistic' && ['ted', 'office', 'lifestyle', 'studio'].includes(data[`style_${currentType}`]));
                                return isSelected && (
                                    <div className="absolute top-2 right-2 bg-[var(--primary)] text-white p-1 rounded-full shadow-lg">
                                        <i className={`fi fi-sr-check flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                    </div>
                                );
                            })()}
                        </div>
                    ))}
                </div>
            )}

            {/* PHOTO UPLOAD UI */}
            {currentType === 'photos' && (
                <div className="space-y-4">
                    {/* Uploaded photos preview */}
                    {photoCount > 0 && (
                        <div className="grid grid-cols-5 gap-3">
                            {(data.avatar_urls || []).map((url: string, idx: number) => (
                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-[var(--background-secondary)]">
                                    {/* If it's a blob URL, show the file, otherwise show placeholder */}
                                    {url.startsWith('blob:') || url.startsWith('http') ? (
                                        <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[var(--foreground-muted)]">
                                            <i className={`fi fi-sr-camera flex items-center justify-center ${"w-6 h-6"}`}  ></i>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => removePhoto(idx)}
                                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                                    >
                                        <i className={`fi fi-sr-cross-small flex items-center justify-center ${"w-3 h-3 text-white"}`}  ></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Upload area */}
                    <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors relative ${uploading ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] hover:bg-[var(--background-secondary)]'
                        }`}>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            disabled={uploading}
                            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            onChange={(e) => handlePhotoUpload(e.target.files)}
                        />
                        <div className="w-14 h-14 bg-[var(--background)] rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                            {uploading ? (
                                <i className={`fi fi-sr-spinner flex items-center justify-center ${"w-7 h-7 text-[var(--primary)] animate-spin"}`}  ></i>
                            ) : (
                                <i className={`fi fi-sr-upload flex items-center justify-center ${"w-7 h-7 text-[var(--foreground-muted)]"}`}  ></i>
                            )}
                        </div>
                        <h3 className="text-lg font-bold mb-1">
                            {uploading ? 'Uploading...' : 'Drop your selfies here'}
                        </h3>
                        <p className="text-sm text-[var(--foreground-muted)] max-w-xs mx-auto">
                            Clear lighting, no sunglasses, generic background preferred.
                        </p>

                        {/* Progress indicator */}
                        {photoCount > 0 && (
                            <div className={`mt-4 font-medium flex items-center justify-center gap-2 ${canProceedFromPhotos ? 'text-emerald-500' : 'text-amber-500'
                                }`}>
                                {canProceedFromPhotos ? (
                                    <>
                                        <i className={`fi fi-sr-check flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                        {photoCount} photos uploaded - Ready!
                                    </>
                                ) : (
                                    <>
                                        <i className={`fi fi-sr-camera flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                        {photoCount}/3 minimum photos
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Error message */}
                    {uploadError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                            {uploadError}
                        </div>
                    )}
                </div>
            )}

            <button
                onClick={handleNext}
                disabled={currentType === 'photos' && !canProceedFromPhotos}
                className="w-full py-4 mt-8 bg-[var(--primary)] text-white rounded-xl font-bold text-lg hover:bg-[var(--primary-hover)] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Continue <i className={`fi fi-sr-angle-right flex items-center justify-center ${"w-5 h-5"}`}  ></i>
            </button>
        </motion.div>
    );
}
