
import React from 'react';
import { CarouselTemplateProps } from '../types';
import { cn } from '@/lib/utils';
import { getAbstractVisual } from '../visuals/AbstractVisuals';

// Glitch Text Component
const GlitchText = ({ text, className }: { text: string, className?: string }) => (
    <div className={cn("relative inline-block hover:animate-pulse", className)}>
        <span className="relative z-10">{text}</span>
        <span className="absolute left-[2px] top-0 text-red-500 opacity-70 -z-10 mix-blend-screen animate-pulse">{text}</span>
        <span className="absolute left-[-2px] top-0 text-blue-500 opacity-70 -z-10 mix-blend-screen animate-pulse delay-75">{text}</span>
    </div>
);

export default function TemplateNoir({ data, slide, index, total, scale = 1 }: CarouselTemplateProps) {
    const style = {
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: '1080px',
        height: '1350px',
        flexShrink: 0
    };

    // Unique Seed
    const seed = `${slide.id}-${slide.title}-${index}`;

    // Generative Layout Select: 0=Terminal, 1=CyberGrid, 2=ScanData
    const layoutIndex = index % 3;

    const isCover = slide.type === 'cover' || index === 0;
    const isCTA = slide.type === 'cta';

    // Use the same visuals but wrap them in "Tech" containers
    const VisualComponent = getAbstractVisual(slide.visualCue || slide.title || "tech");

    return (
        <div style={style} className="bg-[#050505] text-[#00FF41] overflow-hidden relative flex flex-col font-mono select-none">

            {/* --- LAYER 0: CRT SCANLINES & VIGNETTE --- */}
            <div className="absolute inset-0 pointer-events-none z-50 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.15),rgba(0,0,0,0.15)_1px,transparent_1px,transparent_2px)]" />
            <div className="absolute inset-0 pointer-events-none z-50 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)]" />

            {/* --- LAYER 1: DYNAMIC BACKGROUND GRID --- */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="w-[200%] h-[200%] absolute top-[-50%] left-[-50%] border-[0.5px] border-[#00FF41]/30"
                    style={{
                        backgroundImage: 'linear-gradient(#00FF41 1px, transparent 1px), linear-gradient(90deg, #00FF41 1px, transparent 1px)',
                        backgroundSize: '80px 80px',
                        transform: 'perspective(1000px) rotateX(60deg) translateY(100px) translateZ(-200px)'
                    }}
                />
            </div>

            {/* --- HEADER UI --- */}
            <div className="relative z-20 p-12 flex justify-between items-start border-b border-[#00FF41]/20 bg-black/40 backdrop-blur-sm">
                <div className="flex flex-col">
                    <div className="text-xs text-[#00FF41] opacity-70 mb-1"> SYSTEM.ID: {data.author?.handle || 'GHOST'}</div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#00FF41] rounded-full animate-ping" />
                        <span className="text-sm tracking-widest uppercase">ONLINE</span>
                    </div>
                </div>
                <div className="text-xl font-bold tracking-widest border border-[#00FF41] px-4 py-1">
                    {index < 9 ? `0${index + 1}` : index + 1} // {total}
                </div>
            </div>

            {/* --- MAIN CONTENT LAYERS --- */}
            <div className="flex-1 relative z-10 flex flex-col">

                {/* === COVER === */}
                {isCover && (
                    <div className="flex-1 flex flex-col justify-center px-16 relative">
                        <div className="absolute top-[20%] right-0 w-[600px] h-[1px] bg-[#00FF41] opacity-50" />
                        <div className="absolute top-[21%] right-0 w-[400px] h-[1px] bg-[#00FF41] opacity-30" />

                        <div className="mb-8 inline-block border-l-4 border-[#00FF41] pl-4">
                            <div className="text-sm text-[#00FF41] opacity-80 mb-2 typewriter"> INITIALIZING UPLINK...</div>
                        </div>

                        <h1 className="text-8xl font-black uppercase leading-[0.85] tracking-tighter text-white mix-blend-screen mb-12 drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]">
                            <GlitchText text={slide.title} />
                        </h1>

                        {slide.subtitle && (
                            <div className="bg-[#00FF41]/10 border border-[#00FF41]/30 p-8 max-w-3xl backdrop-blur-md">
                                <p className="text-2xl text-[#00FF41] font-bold leading-relaxed tracking-wide">
                                    &gt; {slide.subtitle}<span className="animate-pulse">_</span>
                                </p>
                            </div>
                        )}

                        {/* Visual Decoder */}
                        <div className="absolute bottom-12 right-12 w-[300px] h-[300px] border border-[#00FF41] p-2 opacity-60">
                            <div className="relative w-full h-full border border-dashed border-[#00FF41]/50 flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 bg-[#00FF41]/10 animate-pulse" />
                                <VisualComponent seed={seed} className="w-48 h-48 text-[#00FF41]" />
                                <div className="absolute bottom-2 left-2 text-[10px]">DECODING VISUAL CUE...</div>
                            </div>
                        </div>
                    </div>
                )}


                {/* === CONTENT A: TERMINAL FOCUS (Layout 0) === */}
                {!isCover && !isCTA && layoutIndex === 0 && (
                    <div className="flex-1 flex flex-col px-16 py-12">
                        <div className="w-full border-b border-[#00FF41]/40 mb-12 pb-4 flex justify-between items-end">
                            <h2 className="text-5xl font-bold uppercase tracking-tighter text-white">
                                {slide.title}
                            </h2>
                            <div className="text-xs opacity-50">MODE: TERMINAL_READ</div>
                        </div>

                        <div className="flex-1 flex gap-12">
                            {/* Text Column */}
                            <div className="flex-1 font-mono text-3xl leading-relaxed text-[#00FF41]/90">
                                {slide.body?.split('\n').map((line, i) => (
                                    <p key={i} className="mb-8">
                                        <span className="text-xs opacity-50 mr-4 align-top py-2">{i + 10}</span>
                                        {line}
                                    </p>
                                ))}
                            </div>

                            {/* Visual Column */}
                            <div className="w-1/3 border-l border-[#00FF41]/20 pl-12 flex flex-col justify-center opacity-80">
                                <VisualComponent seed={seed} className="w-full h-auto text-[#00FF41]" />
                                <div className="mt-8 text-xs text-center border-t border-[#00FF41]/20 pt-4">
                                    FIG_DAT_{index}.SVG
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* === CONTENT B: CYBER GRID (Layout 1) === */}
                {!isCover && !isCTA && layoutIndex === 1 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-24">
                        <div className="w-[800px] h-[400px] border-x border-[#00FF41]/30 relative mb-16 flex items-center justify-center bg-[#00FF41]/5">
                            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#00FF41]" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#00FF41]" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[#00FF41]" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[#00FF41]" />

                            <VisualComponent seed={seed} className="w-3/4 h-3/4 text-[#00FF41] drop-shadow-[0_0_15px_rgba(0,255,65,0.4)]" />
                        </div>

                        <h2 className="text-6xl font-black uppercase text-white mb-8 tracking-tighter">
                            {slide.title}
                        </h2>
                        {slide.body && (
                            <p className="text-3xl text-[#00FF41]/80 max-w-4xl leading-relaxed bg-black border border-[#00FF41]/20 p-6 shadow-[0_0_30px_rgba(0,255,65,0.1)]">
                                {slide.body}
                            </p>
                        )}
                    </div>
                )}


                {/* === CONTENT C: ASYMMETRIC SCAN (Layout 2) === */}
                {!isCover && !isCTA && layoutIndex === 2 && (
                    <div className="flex-1 flex flex-col justify-center relative px-20">
                        {/* Background Visual */}
                        <div className="absolute right-[-200px] top-[10%] opacity-10">
                            <VisualComponent seed={seed} className="w-[1000px] h-[1000px] animate-spin-slow" />
                        </div>

                        <div className="w-24 h-6 bg-[#00FF41] mb-12 skew-x-12" />

                        <h2 className="text-7xl font-bold text-white uppercase mb-12 leading-[0.9] tracking-tight max-w-2xl">
                            {slide.title}
                        </h2>

                        <div className="pl-8 border-l-2 border-white/20">
                            {slide.body && (
                                <p className="text-4xl text-[#00FF41] leading-relaxed max-w-3xl font-bold">
                                    {slide.body}
                                </p>
                            )}
                        </div>

                        <div className="mt-16 flex items-center gap-4 opacity-50">
                            <div className="w-full h-[1px] bg-[#00FF41]" />
                            <div className="whitespace-nowrap text-xs">END_BLOCK</div>
                        </div>
                    </div>
                )}


                {/* --- CTA --- */}
                {isCTA && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center relative z-20">
                        <div className="w-[800px] h-[800px] absolute border border-[#00FF41]/10 rounded-full animate-pulse pointer-events-none" />
                        <div className="w-[600px] h-[600px] absolute border border-[#00FF41]/20 rounded-full pointer-events-none" />

                        <h2 className="text-9xl font-black italic text-white mb-8 drop-shadow-[5px_5px_0px_#00FF41]">
                            {slide.title || "FIN."}
                        </h2>
                        <div className="bg-[#00FF41] text-black text-4xl font-bold px-12 py-4 transform -skew-x-12 mb-16">
                            {slide.subtitle || "EXECUTE_SUBSCRIBE()"}
                        </div>

                        {data.author && (
                            <div className="flex flex-col items-center gap-4">
                                {data.author.image && (
                                    <img src={data.author.image} className="w-32 h-32 rounded-full border-4 border-[#00FF41] grayscale contrast-125" />
                                )}
                                <div className="text-2xl tracking-[0.2em] font-bold text-white">
                                    @{data.author.handle}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- FOOTER DECORATION --- */}
            <div className="h-8 bg-[#00FF41] w-full mt-auto flex items-center justify-between px-4 text-black font-bold text-xs uppercase overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => (
                    <span key={i} className="opacity-50"> // SYSTEM_OK</span>
                ))}
            </div>
        </div>
    );
}
