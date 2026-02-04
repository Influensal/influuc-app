
import React from 'react';
import { CarouselTemplateProps } from '../types';
import { cn } from '@/lib/utils';
import { getAbstractVisual } from '../visuals/AbstractVisuals';

export default function TemplateSwiss({ data, slide, index, total, scale = 1 }: CarouselTemplateProps) {
    const style = {
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: '1080px',
        height: '1350px',
        flexShrink: 0
    };

    // Unique Seed for this specific slide's visual
    // Ensures visual is stable but unique to this content
    const seed = `${slide.id}-${slide.title}-${index}`;

    const isCover = slide.type === 'cover' || index === 0;
    const isCTA = slide.type === 'cta';

    // Choose Visual
    const VisualComponent = getAbstractVisual(slide.visualCue || slide.title || "concept");

    return (
        <div style={style} className="bg-[#FFFFFF] text-[#111111] overflow-hidden relative flex flex-col select-none font-sans">
            {/* SOFT PAPER TEXTURE - Subtler */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />

            {/* HEADER */}
            <div className="absolute top-0 left-0 right-0 z-10 px-16 py-12 flex justify-between items-start">
                <div className="font-serif italic text-4xl text-gray-500">
                    Fig. {index + 1}
                </div>
                {/* Minimal Page Counter */}
                <div className="font-mono text-xs tracking-[0.3em] opacity-30">
                    {index + 1} — {total}
                </div>
            </div>

            {/* CONTENT CONTAINER */}
            <div className="flex-1 flex flex-col pt-32 px-16 pb-16 relative z-10">

                {/* --- COVER --- */}
                {isCover && (
                    <div className="flex-1 flex flex-col items-center text-center justify-center -mt-20">
                        <h1 className="font-serif text-[110px] leading-[0.9] text-black tracking-tight mb-16">
                            {slide.title}
                        </h1>

                        {/* Generative Visual - Massive Centerpiece */}
                        <div className="w-full h-[600px] relative mb-16">
                            {/* Decorative curved line behind */}
                            <svg className="absolute inset-0 w-full h-full text-gray-200" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path d="M0 50 Q 50 20, 100 80" fill="none" stroke="currentColor" strokeWidth="0.5" />
                            </svg>
                            <VisualComponent seed={seed} className="w-full h-full text-black/90 p-8" />
                        </div>

                        {data.author && (
                            <div className="absolute bottom-16 flex flex-col items-center gap-2 opacity-60">
                                <span className="font-serif italic text-xl">by {data.author.name}</span>
                            </div>
                        )}
                    </div>
                )}


                {/* --- STANDARD SLIDE --- */}
                {!isCover && !isCTA && (
                    <div className="flex-1 flex flex-col">
                        {/* TOP VISUAL AREA (Fixed Height for Consistency) */}
                        <div className="h-[650px] w-full flex items-center justify-center p-8 bg-gray-50/50 rounded-2xl mb-12 border border-gray-100">
                            <VisualComponent seed={seed} className="w-full h-full text-black/90 scale-90" />
                        </div>

                        {/* TEXT AREA */}
                        <div className="flex-1 flex flex-col justify-end pb-8">
                            {/* Number + Title */}
                            <div className="flex items-start gap-6 mb-6">
                                <span className="font-serif text-3xl mt-2 opacity-50">{index + 1}.</span>
                                <h2 className="font-serif text-5xl leading-tight text-black max-w-4xl">
                                    {slide.title}
                                </h2>
                            </div>

                            {/* Body */}
                            {slide.body && (
                                <p className="font-sans text-4xl leading-relaxed text-gray-600 pl-12 max-w-4xl">
                                    {slide.body}
                                </p>
                            )}
                        </div>
                    </div>
                )}


                {/* --- CTA --- */}
                {isCTA && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="w-[500px] h-[500px] border border-dashed border-gray-300 rounded-full flex items-center justify-center mb-16 bg-gray-50">
                            <VisualComponent seed={seed} className="w-2/3 h-2/3 text-gray-800" />
                        </div>

                        <h2 className="font-serif text-7xl mb-8 italic">
                            {slide.title || "The End."}
                        </h2>
                        <p className="font-sans text-4xl text-gray-500 max-w-2xl">
                            {slide.subtitle || "Save this for later."}
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
}
