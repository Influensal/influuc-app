
'use client';

import { useState } from 'react';
import { CarouselData, Slide } from './types';
import TemplateSwiss from './templates/TemplateSwiss';
import TemplateLuxury from './templates/TemplateLuxury';
import TemplateNoir from './templates/TemplateNoir';
import { ChevronLeft, ChevronRight, Download, Plus, Trash2, Save, GripVertical, Settings, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generatePDF } from '@/lib/pdf-export';
import { useRouter } from 'next/navigation';

interface CarouselEditorProps {
    initialData: CarouselData;
    postId: string;
    onSave?: (data: CarouselData) => Promise<void>;
}

export default function CarouselEditor({ initialData, postId, onSave }: CarouselEditorProps) {
    const router = useRouter();
    const [data, setData] = useState<CarouselData>(initialData);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const currentSlide = data.slides[currentSlideIndex];

    const updateSlide = (key: keyof Slide, value: string) => {
        const newSlides = [...data.slides];
        newSlides[currentSlideIndex] = { ...newSlides[currentSlideIndex], [key]: value };
        setData({ ...data, slides: newSlides });
    };

    const addSlide = () => {
        const newSlide: Slide = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'content',
            title: 'New Slide',
            body: 'Enter your content here...'
        };
        const newSlides = [...data.slides];
        newSlides.splice(currentSlideIndex + 1, 0, newSlide);
        setData({ ...data, slides: newSlides });
        setCurrentSlideIndex(currentSlideIndex + 1);
    };

    const deleteSlide = () => {
        if (data.slides.length <= 1) return;
        const newSlides = data.slides.filter((_, i) => i !== currentSlideIndex);
        setData({ ...data, slides: newSlides });
        setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Backend PATCH
            const res = await fetch(`/api/posts/${postId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: JSON.stringify(data),
                    // Update main topic if first slide title changed? Maybe optional.
                })
            });

            if (!res.ok) throw new Error('Failed to save');

            // Refresh router to sync server data
            router.refresh();
        } catch (e) {
            console.error('Save failed', e);
            alert('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        // Save first to ensure sync? Optional.
        try {
            // Use the hidden ID container
            await generatePDF(data, 'carousel-export-container');
        } catch (e) {
            console.error('Export failed', e);
            alert('Export failed. Please check console.');
        } finally {
            setIsExporting(false);
        }
    };

    // Render helper for both Preview and Export
    const renderTemplate = (slide: Slide, index: number, total: number, scale: number) => {
        const props = {
            data,
            slide,
            index,
            total,
            scale
        };

        switch (data.theme) {
            case 'luxury': return <TemplateLuxury {...props} />;
            case 'noir': return <TemplateNoir {...props} />;
            default: return <TemplateSwiss {...props} />;
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50 border-t">
            {/* LEFT: Editor Panel */}
            <div className="w-[400px] border-r bg-white flex flex-col shadow-sm z-10">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-white">
                    <h2 className="font-bold text-lg">Edit Slide {currentSlideIndex + 1}</h2>
                    <div className="flex gap-2">
                        <button onClick={handleSave} className="flex items-center gap-2 p-2 px-3 text-sm font-bold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors">
                            {isSaving ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={deleteSlide} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Slide Type</label>
                        <select
                            value={currentSlide.type}
                            onChange={(e) => updateSlide('type', e.target.value as any)}
                            className="w-full p-2 bg-white border rounded-lg text-sm"
                        >
                            <option value="cover">Cover</option>
                            <option value="content">Content</option>
                            <option value="cta">Call to Action</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Title</label>
                        <textarea
                            value={currentSlide.title}
                            onChange={(e) => updateSlide('title', e.target.value)}
                            className="w-full p-3 bg-white border rounded-lg font-bold min-h-[80px]"
                            placeholder="Slide Title"
                        />
                    </div>

                    {(currentSlide.type === 'cover' || currentSlide.type === 'cta') && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subtitle</label>
                            <input
                                value={currentSlide.subtitle || ''}
                                onChange={(e) => updateSlide('subtitle', e.target.value)}
                                className="w-full p-3 bg-white border rounded-lg"
                                placeholder="Subtitle"
                            />
                        </div>
                    )}

                    {currentSlide.type === 'content' && (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Body Text</label>
                                <textarea
                                    value={currentSlide.body || ''}
                                    onChange={(e) => updateSlide('body', e.target.value)}
                                    className="w-full p-3 bg-white border rounded-lg min-h-[150px]"
                                    placeholder="Enter your main content..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Visual Cue</label>
                                <input
                                    value={currentSlide.visualCue || ''}
                                    onChange={(e) => updateSlide('visualCue', e.target.value)}
                                    className="w-full p-3 bg-white border border-dashed rounded-lg text-sm text-gray-600"
                                    placeholder="e.g. 'Chart showing growth'"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Theme Selector (Bottom) */}
                <div className="p-4 border-t bg-gray-50">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Theme</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['swiss', 'luxury', 'noir'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setData({ ...data, theme: t })}
                                className={cn(
                                    "px-3 py-2 text-xs font-bold rounded-lg border uppercase transition-colors scale-95 hover:scale-100",
                                    data.theme === t
                                        ? "bg-black text-white border-black scale-100 ring-2 ring-black/20"
                                        : "bg-white text-gray-600 hover:bg-gray-100"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: Preview Area */}
            <div className="flex-1 relative flex flex-col">
                {/* Toolbar */}
                <div className="h-16 border-b bg-white flex items-center justify-between px-6 shadow-sm z-10">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">
                            Slide {currentSlideIndex + 1} of {data.slides.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors font-medium text-sm disabled:opacity-50"
                            disabled={isExporting}
                        >
                            {isExporting ? <LoaderWheel /> : <Download className="w-4 h-4" />}
                            {isExporting ? 'Generating PDF...' : 'Download PDF'}
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 bg-[#e5e5e5] overflow-hidden relative flex items-center justify-center p-8">
                    {/* Preview Container */}
                    <div
                        className="relative shadow-xl transition-all duration-300 ring-1 ring-black/5 bg-white"
                        style={{
                            width: `${1080 * 0.4}px`,
                            height: `${1350 * 0.4}px`
                        }}
                    >
                        {renderTemplate(currentSlide, currentSlideIndex, data.slides.length, 0.4)}
                    </div>
                </div>

                {/* Bottom Navigation */}
                <div className="h-24 bg-white border-t flex items-center justify-center gap-4 relative z-10 px-8">
                    <button
                        onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                        disabled={currentSlideIndex === 0}
                        className="p-3 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <div className="flex gap-3 overflow-x-auto max-w-2xl px-2 py-4 scrollbar-hide">
                        {data.slides.map((s, i) => (
                            <button
                                key={s.id || i}
                                onClick={() => setCurrentSlideIndex(i)}
                                className={cn(
                                    "w-12 h-16 border rounded bg-gray-50 flex items-center justify-center text-[10px] relative transition-all shadow-sm",
                                    currentSlideIndex === i ? "ring-2 ring-black border-transparent scale-110 z-10 bg-white" : "hover:border-gray-400 opacity-60 hover:opacity-100 hover:scale-105"
                                )}
                            >
                                <span className={cn("font-bold", currentSlideIndex === i ? "text-black" : "text-gray-400")}>
                                    {i + 1}
                                </span>
                            </button>
                        ))}
                        <button
                            onClick={addSlide}
                            className="w-12 h-16 border border-dashed border-gray-300 rounded hover:border-black hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-black transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => setCurrentSlideIndex(Math.min(data.slides.length - 1, currentSlideIndex + 1))}
                        disabled={currentSlideIndex === data.slides.length - 1}
                        className="p-3 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* HIDDEN EXPORT CONTAINER - Rendered at full scale for high-res PDF */}
            <div className="fixed top-0 left-[-9999px] pointer-events-none">
                <div id="carousel-export-container">
                    {data.slides.map((slide, i) => (
                        <div key={i} className="mb-4" style={{ width: '1080px', height: '1350px' }}>
                            {renderTemplate(slide, i, data.slides.length, 1)}
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}

function LoaderWheel() {
    return <Sparkles className="w-4 h-4 animate-spin" />;
}
