'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, Camera, Image as ImageIcon, LayoutTemplate, ArrowRight, Loader2, X, Upload } from 'lucide-react';

interface StepVisualForkProps {
    data: any;
    updateData: (data: any) => void;
    onComplete: () => void;
}

// Style options
const facelessStyles = [
    { id: 'abstract', title: 'Abstract' },
    { id: 'neon', title: 'Neon' },
    { id: 'minimal', title: 'Minimal' },
    { id: 'noir', title: 'Noir' },
];

const faceStyles = [
    { id: 'ted', title: 'TED Talk' },
    { id: 'office', title: 'Office' },
    { id: 'lifestyle', title: 'Lifestyle' },
    { id: 'studio', title: 'Studio' },
];

const carouselStyles = [
    { id: 'modern', title: 'Modern' },
    { id: 'editorial', title: 'Editorial' },
    { id: 'bold', title: 'Bold' },
    { id: 'type', title: 'Typography' },
];

export default function StepVisualFork({ data, updateData, onComplete }: StepVisualForkProps) {
    const tier = data.subscriptionTier || 'starter';
    const [subStep, setSubStep] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

    // Define flow based on tier
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
                                            <Camera className="w-6 h-6" />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => removePhoto(idx)}
                                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                                    >
                                        <X className="w-3 h-3 text-white" />
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
                                <Loader2 className="w-7 h-7 text-[var(--primary)] animate-spin" />
                            ) : (
                                <Upload className="w-7 h-7 text-[var(--foreground-muted)]" />
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
                                        <Check className="w-4 h-4" />
                                        {photoCount} photos uploaded - Ready!
                                    </>
                                ) : (
                                    <>
                                        <Camera className="w-4 h-4" />
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
                Continue <ArrowRight className="w-5 h-5" />
            </button>
        </motion.div>
    );
}
