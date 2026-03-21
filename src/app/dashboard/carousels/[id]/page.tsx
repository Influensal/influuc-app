'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { motion, AnimatePresence } from 'framer-motion';
import { generatePDFFromContainer } from '@/lib/pdf-export';

interface CarouselPost {
    id: string;
    topic?: string;
    content: string;
    carousel_slides: string[] | null;
    carousel_style: string | null;
    format: string;
    status: string;
}

export default function CarouselViewPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [post, setPost] = useState<CarouselPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [postId, setPostId] = useState<string>('');
    const [isExporting, setIsExporting] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        params.then(p => setPostId(p.id));
    }, [params]);

    useEffect(() => {
        if (!postId) return;
        async function fetchPost() {
            try {
                const res = await fetch(`/api/posts/${postId}`);
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json();
                setPost(data.post);
            } catch (err) {
                console.error('Error fetching carousel post:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchPost();
    }, [postId]);

    const handleDownload = async () => {
        setIsExporting(true);
        try {
            await generatePDFFromContainer('carousel-export-container', post?.topic || 'carousel');
        } catch (e: any) {
            console.error('Export failed', e);
            alert(`Export failed: ${e.message || 'Unknown error'}`);
        } finally {
            setIsExporting(false);
        }
    };

    const handlePublish = async () => {
        if (!post) return;
        setIsPublishing(true);
        setPublishStatus('idle');
        try {
            const res = await fetch(`/api/posts/${post.id}/publish`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to publish');
            setPublishStatus('success');
            setTimeout(() => setPublishStatus('idle'), 3000);
        } catch (e) {
            console.error('Publish failed', e);
            setPublishStatus('error');
        } finally {
            setIsPublishing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <i className="fi fi-sr-spinner flex items-center justify-center w-8 h-8 animate-spin text-emerald-600"></i>
            </div>
        );
    }

    if (!post || !post.carousel_slides || post.carousel_slides.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <i className="fi fi-sr-layers flex items-center justify-center w-12 h-12 text-[var(--foreground-muted)] mb-4"></i>
                <h2 className="text-xl font-semibold mb-2">No Carousel Data</h2>
                <p className="text-[var(--foreground-muted)] mb-4">This carousel hasn&apos;t been generated yet.</p>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl font-medium"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const slides = post.carousel_slides;

    return (
        <div className="max-w-7xl px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-[var(--background-secondary)] rounded-xl transition-colors"
                    >
                        <i className="fi fi-sr-angle-left flex items-center justify-center w-5 h-5"></i>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">Carousel Viewer</h1>
                        <p className="text-sm text-[var(--foreground-muted)]">
                            {slides.length} slides • {post.carousel_style || 'Default'} style
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleDownload}
                        disabled={isExporting}
                        className="px-4 py-2 bg-[var(--background-secondary)] hover:bg-[var(--border)] rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {isExporting ? <i className="fi fi-sr-spinner flex items-center justify-center w-4 h-4 animate-spin"></i> : <i className="fi fi-sr-download flex items-center justify-center w-4 h-4"></i>}
                        Download PDF
                    </button>

                    {publishStatus === 'success' ? (
                        <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl font-medium flex items-center gap-2">
                            <i className="fi fi-sr-check flex items-center justify-center w-4 h-4"></i>
                            Published!
                        </div>
                    ) : (
                        <button
                            onClick={handlePublish}
                            disabled={isPublishing || post.status === 'posted'}
                            className="px-4 py-2 bg-[#0A66C2] text-white hover:bg-[#004182] rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isPublishing ? <i className="fi fi-sr-spinner flex items-center justify-center w-4 h-4 animate-spin"></i> : <i className="fi fi-sr-paper-plane flex items-center justify-center w-4 h-4"></i>}
                            {post.status === 'posted' ? 'Posted' : 'Post to LinkedIn'}
                        </button>
                    )}
                </div>
            </div>

            {/* Slide Viewer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Preview */}
                <div className="lg:col-span-2">
                    <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200">
                        <div className="aspect-[4/5] relative overflow-hidden bg-stone-100">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentSlideIndex}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    dangerouslySetInnerHTML={{ __html: slides[currentSlideIndex] || '' }}
                                    className="w-full h-full"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                />
                            </AnimatePresence>
                        </div>

                        {/* Navigation */}
                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/50 to-transparent">
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                                    disabled={currentSlideIndex === 0}
                                    className="p-3 bg-white/90 hover:bg-white rounded-full shadow-lg disabled:opacity-30 transition-all"
                                >
                                    <i className="fi fi-sr-angle-left flex items-center justify-center w-6 h-6 text-stone-800"></i>
                                </button>
                                <div className="flex gap-2">
                                    {slides.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentSlideIndex(i)}
                                            className={`w-2 h-2 rounded-full transition-all ${i === currentSlideIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                                    disabled={currentSlideIndex === slides.length - 1}
                                    className="p-3 bg-white/90 hover:bg-white rounded-full shadow-lg disabled:opacity-30 transition-all"
                                >
                                    <i className="fi fi-sr-angle-right flex items-center justify-center w-6 h-6 text-stone-800"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filmstrip */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--foreground-secondary)] uppercase tracking-wider">
                        <i className="fi fi-sr-layers flex items-center justify-center w-4 h-4"></i>
                        All Slides
                    </div>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                        {slides.map((slide, i) => (
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

            {/* Hidden Container for PDF Export */}
            <div className="fixed top-0 left-[-9999px] pointer-events-none">
                <div id="carousel-export-container">
                    {slides.map((slide, i) => (
                        <div key={i} className="bg-white" style={{ width: '1080px', height: '1350px' }}>
                            <div
                                dangerouslySetInnerHTML={{ __html: slide }}
                                className="w-full h-full [&>*]:w-full [&>*]:h-full"
                                style={{ transform: 'none' }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
