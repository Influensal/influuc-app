
import React from 'react';
import { CarouselTemplateProps } from '../types';
import { cn } from '@/lib/utils';
import { getAbstractVisual } from '../visuals/AbstractVisuals';

export default function TemplateLuxury({ data, slide, index, total, scale = 1 }: CarouselTemplateProps) {
    const style = {
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: '1080px',
        height: '1350px',
        flexShrink: 0
    };

    // Unique Seed
    const seed = `${slide.id}-${slide.title}-${index}`;

    // Layout variation: 0=Centered, 1=Split, 2=Magazine
    const layoutIndex = index % 3;

    const isCover = slide.type === 'cover' || index === 0;
    const isCTA = slide.type === 'cta';

    const VisualComponent = getAbstractVisual(slide.visualCue || slide.title || "luxury");

    return (
        <div style={style} className="bg-[#080808] text-[#FDFDFD] overflow-hidden relative flex flex-col select-none font-serif">
            {/* AMBIENT GRADIENT */}
            <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.15),transparent_60%)]" />

            {/* HEADER */}
            <div className="absolute top-12 left-0 right-0 z-20 px-12 flex justify-between items-center">
                <div className="text-[#D4AF37] tracking-[0.3em] uppercase text-xs border-b border-[#D4AF37]/30 pb-2">
                    {data.author?.name || 'Exclusive'}
                </div>
                <div className="font-sans text-xs text-[#D4AF37]/50 tracking-widest">
                    NO. {index + 1}
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 relative z-10 flex flex-col p-12 pt-0 h-full">

                {/* --- COVER --- */}
                {isCover && (
                    <div className="flex-1 flex flex-col justify-center items-center text-center relative border-[0.5px] border-[#D4AF37]/20 m-4 mt-20 p-8">
                        <div className="absolute top-[-1px] left-1/2 -translate-x-1/2 w-24 h-[1px] bg-[#D4AF37]" />
                        <div className="absolute bottom-[-1px] left-1/2 -translate-x-1/2 w-24 h-[1px] bg-[#D4AF37]" />

                        <div className="mb-12">
                            <span className="font-sans text-[#D4AF37] tracking-[0.5em] text-sm uppercase">The Collection</span>
                        </div>

                        <h1 className="text-8xl leading-none italic mb-12 font-medium max-w-4xl">
                            {slide.title}
                        </h1>

                        {slide.subtitle && (
                            <div className="max-w-xl border-t border-[#D4AF37]/30 pt-8 mt-8">
                                <p className="font-sans text-xl tracking-wide uppercase text-gray-400 leading-relaxed">
                                    {slide.subtitle}
                                </p>
                            </div>
                        )}

                        {/* Elegant Visual Overlay */}
                        <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
                            <VisualComponent seed={seed} className="w-[800px] h-[800px] text-[#D4AF37]" />
                        </div>
                    </div>
                )}

                {/* --- MAGAZINE LAYOUT (Text Heavy) --- */}
                {!isCover && !isCTA && layoutIndex === 0 && (
                    <div className="flex-1 flex flex-col justify-center px-12 relative">
                        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-[#D4AF37]/10" />

                        <h2 className="text-6xl italic mb-12 text-[#D4AF37]">
                            {slide.title}
                        </h2>

                        <div className="flex gap-12">
                            <div className="w-[1px] bg-[#D4AF37] opacity-50" />
                            {slide.body && (
                                <p className="font-sans text-3xl leading-loose text-gray-300 max-w-3xl font-light">
                                    {slide.body}
                                </p>
                            )}
                        </div>

                        <div className="absolute bottom-12 right-12 opacity-20">
                            <VisualComponent seed={seed} className="w-64 h-64 text-[#D4AF37]" />
                        </div>
                    </div>
                )}

                {/* --- SPLIT LAYOUT (Visual Heavy) --- */}
                {!isCover && !isCTA && layoutIndex === 1 && (
                    <div className="flex-1 flex flex-col">
                        <div className="h-[55%] w-full relative flex items-center justify-center border-b border-[#D4AF37]/20 mb-12">
                            <div className="absolute inset-0 bg-[#D4AF37]/5" />
                            <VisualComponent seed={seed} className="w-2/3 h-2/3 text-[#D4AF37]/80" />
                        </div>

                        <div className="px-12 flex flex-col justify-center flex-1">
                            <h2 className="text-5xl mb-6 font-medium">{slide.title}</h2>
                            {slide.body && <p className="font-sans text-2xl text-gray-400 font-light leading-relaxed max-w-3xl">{slide.body}</p>}
                        </div>
                    </div>
                )}

                {/* --- CENTERED FOCUS --- */}
                {!isCover && !isCTA && layoutIndex === 2 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-24">
                        <div className="w-[400px] h-[400px] border border-[#D4AF37]/30 rounded-full flex items-center justify-center mb-16 relative">
                            <div className="absolute inset-2 border border-[#D4AF37]/10 rounded-full" />
                            <VisualComponent seed={seed} className="w-1/2 h-1/2 text-[#D4AF37]" />
                        </div>

                        <h2 className="text-6xl mb-8">{slide.title}</h2>
                        {slide.body && <p className="font-sans text-3xl text-gray-400 font-light max-w-2xl">{slide.body}</p>}
                    </div>
                )}

                {/* --- CTA --- */}
                {isCTA && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <h2 className="text-8xl italic text-[#D4AF37] mb-12">
                            {slide.title || "Finis"}
                        </h2>

                        <div className="border border-[#D4AF37] px-16 py-6 tracking-[0.2em] uppercase font-sans hover:bg-[#D4AF37] hover:text-black transition-colors mb-16">
                            {slide.subtitle || "Join the Circle"}
                        </div>

                        {data.author && (
                            <div className="flex flex-col items-center gap-6">
                                {data.author.image && (
                                    <img src={data.author.image} className="w-24 h-24 rounded-full border border-[#D4AF37] grayscale" />
                                )}
                                <span className="font-serif italic text-xl text-gray-400">@{data.author.handle}</span>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
