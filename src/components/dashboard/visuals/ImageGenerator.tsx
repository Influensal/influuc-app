'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Image as ImageIcon, Download, Sparkles, Wand2 } from 'lucide-react';

interface ImageGeneratorProps {
    mode: 'faceless' | 'digital_twin';
}

const ASPECT_RATIOS = [
    { id: '1:1', label: 'Square (1:1)', desc: 'Best for LinkedIn/Instagram' },
    { id: '16:9', label: 'Landscape (16:9)', desc: 'Best for X/Twitter headers' }
];

const PRESET_STYLES = [
    { id: 'cinematic', label: 'Cinematic', modifier: 'highly detailed, cinematic lighting, 8k resolution, photorealistic' },
    { id: 'minimalist', label: 'Minimalist', modifier: 'minimalist, clean lines, solid background, corporate, modern' },
    { id: 'cyberpunk', label: 'Tech Noir', modifier: 'cyberpunk, neon lighting, dark mood, futuristic, tech startup' },
    { id: 'studio', label: 'Studio Portrait', modifier: 'professional studio lighting, clean backdrop, sharp focus, magazine quality' }
];

export function ImageGenerator({ mode }: ImageGeneratorProps) {
    const [prompt, setPrompt] = useState(
        mode === 'digital_twin'
            ? 'A cinematic shot of OHWX speaking confidently on a TED talk stage, dramatic lighting'
            : 'A sleek minimalist desk setup with a glowing laptop, moody blue lighting'
    );
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [styleModifier, setStyleModifier] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [error, setError] = useState('');

    // Temporary state for testing Gemini Edit directly without profile
    const [testImageBase64, setTestImageBase64] = useState<string | null>(null);
    const [testFileName, setTestFileName] = useState<string>('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setTestFileName(selectedFile.name);
            const reader = new FileReader();
            reader.onload = (e) => setTestImageBase64(e.target?.result as string);
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        setError('');

        try {
            // Combine user prompt with style modifier if selected
            const finalPrompt = styleModifier
                ? `${prompt}. ${styleModifier}`
                : prompt;

            const res = await fetch('/api/visuals/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: finalPrompt,
                    mode,
                    aspectRatio,
                    imageBase64: testImageBase64 // Pass the test image if uploaded
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate image');
            }

            setGeneratedImageUrl(data.imageUrl);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Controls Panel */}
            <div className="lg:col-span-5 space-y-8">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xl font-bold text-[var(--foreground)] mb-6 flex items-center">
                        <Wand2 className="w-5 h-5 mr-2 text-[var(--primary)]" />
                        Generation Settings
                    </h3>

                    {error && (
                        <div className="p-4 mb-6 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl text-[var(--error)] text-sm">
                            {error}
                        </div>
                    )}

                    {/* Prompt Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                            {mode === 'digital_twin' ? 'Scene Description (Use OHWX as your name)' : 'Image Prompt'}
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the image you want to generate..."
                            className="w-full h-32 p-4 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none resize-none transition-all mb-4"
                        />

                        {/* Temporary File Upload for API Testing */}
                        {mode === 'digital_twin' && (
                            <div className="p-4 border border-[var(--border)] border-dashed rounded-xl bg-[var(--background)]">
                                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                                    Temporary Reference Photo (For testing Gemini edit without DB setup)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-[var(--foreground-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary)]/10 file:text-[var(--primary)] hover:file:bg-[var(--primary)]/20"
                                />
                                {testFileName && <p className="mt-2 text-xs text-green-500 font-medium">✓ {testFileName} loaded</p>}
                            </div>
                        )}
                    </div>

                    {/* Aspect Ratio */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-3">
                            Aspect Ratio
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {ASPECT_RATIOS.map(ratio => (
                                <button
                                    key={ratio.id}
                                    onClick={() => setAspectRatio(ratio.id)}
                                    className={`p-3 rounded-xl border text-left transition-all ${aspectRatio === ratio.id
                                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                                        : 'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--foreground-muted)]'
                                        }`}
                                >
                                    <div className="font-medium">{ratio.label}</div>
                                    <div className="text-xs opacity-70 mt-1">{ratio.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Style Presets */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-3">
                            Aesthetic Filter (Optional)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_STYLES.map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => setStyleModifier(styleModifier === style.modifier ? null : style.modifier)}
                                    className={`px-4 py-2 rounded-lg text-sm transition-all border ${styleModifier === style.modifier
                                        ? 'bg-white text-black border-white'
                                        : 'bg-[var(--background)] border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground-muted)]'
                                        }`}
                                >
                                    {style.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt}
                        className="w-full flex items-center justify-center py-4 rounded-xl bg-[var(--primary)] text-white font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                Generating Visual...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5 mr-3" />
                                Generate Image
                            </>
                        )}
                    </button>
                    {isGenerating && (
                        <p className="text-center text-xs text-[var(--foreground-muted)] mt-4">
                            Usually takes 5-10 seconds powered by Flux.
                        </p>
                    )}
                </div>
            </div>

            {/* Output Panel */}
            <div className="lg:col-span-7">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 min-h-[600px] flex flex-col shadow-sm">
                    <h3 className="text-xl font-bold text-[var(--foreground)] mb-6">Generated Result</h3>

                    <div className="flex-grow flex items-center justify-center bg-[var(--background)] rounded-xl border border-[var(--border)] border-dashed overflow-hidden relative">
                        {generatedImageUrl ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full h-full flex items-center justify-center p-4 relative group"
                            >
                                <img
                                    src={generatedImageUrl}
                                    alt="Generated Visual"
                                    className={`max-h-full object-contain rounded-lg shadow-2xl ${aspectRatio === '16:9' ? 'aspect-[16/9] w-full' : 'aspect-square w-auto h-full'
                                        }`}
                                />

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <a
                                        href={generatedImageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center px-6 py-3 bg-white text-black rounded-xl font-bold hover:scale-105 transition-transform"
                                    >
                                        <Download className="w-5 h-5 mr-2" />
                                        Download HD Image
                                    </a>
                                </div>
                            </motion.div>
                        ) : isGenerating ? (
                            <div className="text-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                    className="w-16 h-16 border-4 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-6"
                                />
                                <p className="text-[var(--foreground)] font-medium animate-pulse">Rendering pixels...</p>
                            </div>
                        ) : (
                            <div className="text-center text-[var(--foreground-muted)]">
                                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p>Your generated visual will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
