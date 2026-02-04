
import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SeededRandom } from '@/lib/random';

interface VisualProps {
    className?: string;
    seed: string; // The DNA of the visual
}

// 1. GENERATIVE SCATTER PLOT
export const ScatterPlot = ({ className, seed }: VisualProps) => {
    // Memoize points so they are stable for this seed
    const points = useMemo(() => {
        const rng = new SeededRandom(seed);
        const count = Math.floor(rng.range(80, 200)); // Varied density
        const type = rng.pick(['cloud', 'ring', 'wave']);

        return Array.from({ length: count }).map((_, i) => {
            let cx, cy;
            if (type === 'ring') {
                const r = rng.range(30, 45);
                const theta = rng.next() * Math.PI * 2;
                cx = 50 + r * Math.cos(theta) + rng.range(-5, 5);
                cy = 50 + r * Math.sin(theta) + rng.range(-5, 5);
            } else if (type === 'wave') {
                cx = rng.range(10, 90);
                cy = 50 + Math.sin(cx * 0.1) * 20 + rng.range(-15, 15);
            } else {
                // cloud (ellipse)
                const r = rng.next() * 45;
                const theta = rng.next() * Math.PI * 2;
                cx = 50 + r * Math.cos(theta);
                cy = 50 + (r * 0.7) * Math.sin(theta);
            }

            return {
                cx,
                cy,
                r: rng.range(0.5, 2.5),
                opacity: rng.range(0.3, 1)
            };
        });
    }, [seed]);

    return (
        <div className={cn("relative w-full h-full flex items-center justify-center", className)}>
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                {points.map((p, i) => (
                    <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="currentColor" opacity={p.opacity} />
                ))}
            </svg>
        </div>
    );
};

// 2. GENERATIVE GROWTH CURVE
export const GrowthCurve = ({ className, seed }: VisualProps) => {
    const path = useMemo(() => {
        const rng = new SeededRandom(seed);
        // Randomize control points for unique curve shape
        const c1x = rng.range(30, 60);
        const c1y = rng.range(50, 90); // Low start
        const c2x = rng.range(60, 80);
        const c2y = rng.range(20, 50); // High end

        return `M 10 90 C ${c1x} ${c1y}, ${c2x} ${c2y}, 90 20`;
    }, [seed]);

    return (
        <div className={cn("relative w-full h-full flex items-center justify-center", className)}>
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                <defs>
                    <marker id="arrow-up" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L6,3 z" fill="currentColor" />
                    </marker>
                </defs>
                <line x1="10" y1="90" x2="90" y2="90" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" />
                <path
                    d={path}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    markerEnd="url(#arrow-up)"
                />
                <circle cx="10" cy="90" r="2" fill="currentColor" />
            </svg>
        </div>
    );
};

// 3. GENERATIVE DECLINE CURVE
export const DeclineCurve = ({ className, seed }: VisualProps) => {
    const path = useMemo(() => {
        const rng = new SeededRandom(seed);
        const c1x = rng.range(20, 50);
        const c1y = rng.range(20, 50);
        const c2x = rng.range(50, 80);
        const c2y = rng.range(50, 90);
        return `M 10 20 C ${c1x} ${c1y}, ${c2x} ${c2y}, 90 90`;
    }, [seed]);

    return (
        <div className={cn("relative w-full h-full flex items-center justify-center", className)}>
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                <defs>
                    <marker id="arrow-down" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L6,3 z" fill="currentColor" />
                    </marker>
                </defs>
                <line x1="10" y1="90" x2="90" y2="90" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeDasharray="2 2" />
                <path
                    d={path}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    markerEnd="url(#arrow-down)"
                />
                <circle cx="10" cy="20" r="2" fill="currentColor" />
            </svg>
        </div>
    );
};

// 4. GENERATIVE STRUCTURE / NETWORK
export const StructureGrid = ({ className, seed }: VisualProps) => {
    const shape = useMemo(() => {
        const rng = new SeededRandom(seed);
        const type = rng.pick(['grid', 'network', 'minimal']);

        if (type === 'network') {
            // Generate random network
            const nodes = Array.from({ length: rng.range(4, 8) }).map(() => ({
                x: rng.range(20, 80),
                y: rng.range(20, 80)
            }));
            return { type: 'network' as const, nodes };
        } else if (type === 'minimal') {
            // Minimal geometric shapes
            return {
                type: 'minimal' as const,
                cx: 50, cy: 50,
                size: rng.range(20, 40),
                shape: rng.pick(['circle', 'rect', 'diamond'])
            };
        }
        // Default grid
        return { type: 'grid' as const, count: Math.floor(rng.range(2, 5)) };
    }, [seed]);

    return (
        <div className={cn("relative w-full h-full flex items-center justify-center", className)}>
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                {shape.type === 'grid' && (
                    // ... grid logic ...
                    Array.from({ length: 9 }).map((_, i) => (
                        <rect key={i} x={(i % 3) * 30 + 15} y={Math.floor(i / 3) * 30 + 15} width="10" height="10" stroke="currentColor" fill="none" />
                    ))
                )}
                {shape.type === 'network' && (
                    <>
                        {shape.nodes.map((n, i) => (
                            <g key={i}>
                                {shape.nodes.slice(i + 1).map((n2, j) => (
                                    <line key={j} x1={n.x} y1={n.y} x2={n2.x} y2={n2.y} stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
                                ))}
                                <circle cx={n.x} cy={n.y} r="3" fill="currentColor" />
                            </g>
                        ))}
                    </>
                )}
                {shape.type === 'minimal' && (
                    <>
                        {shape.shape === 'circle' && <circle cx={50} cy={50} r={shape.size} stroke="currentColor" fill="none" strokeWidth="1" />}
                        {shape.shape === 'rect' && <rect x={50 - shape.size} y={50 - shape.size} width={shape.size * 2} height={shape.size * 2} stroke="currentColor" fill="none" strokeWidth="1" />}
                        {shape.shape === 'diamond' && <path d={`M 50 ${50 - shape.size} L ${50 + shape.size} 50 L 50 ${50 + shape.size} L ${50 - shape.size} 50 Z`} stroke="currentColor" fill="none" strokeWidth="1" />}
                    </>
                )}
            </svg>
        </div>
    );
};

// 5. GENERATIVE TARGET
export const TargetFocus = ({ className, seed }: VisualProps) => {
    // Simply jitter the target lines or rings
    return (
        <div className={cn("relative w-full h-full flex items-center justify-center", className)}>
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
                <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="50" cy="50" r="8" fill="currentColor" />
                <line x1="50" y1="10" x2="50" y2="20" stroke="currentColor" strokeWidth="1" />
                <line x1="50" y1="90" x2="50" y2="80" stroke="currentColor" strokeWidth="1" />
                <line x1="10" y1="50" x2="20" y2="50" stroke="currentColor" strokeWidth="1" />
                <line x1="90" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="1" />
            </svg>
        </div>
    );
};

// 6. GENERATIVE BAR CHART
export const BarChart = ({ className, seed }: VisualProps) => {
    const bars = useMemo(() => {
        const rng = new SeededRandom(seed);
        return [
            rng.range(20, 50),
            rng.range(30, 70),
            rng.range(60, 90)
        ];
    }, [seed]);

    return (
        <div className={cn("relative w-full h-full flex items-center justify-center", className)}>
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                <rect x="20" y={100 - bars[0]} width="15" height={bars[0]} fill="currentColor" opacity="0.4" />
                <rect x="45" y={100 - bars[1]} width="15" height={bars[1]} fill="currentColor" opacity="0.7" />
                <rect x="70" y={100 - bars[2]} width="15" height={bars[2]} fill="currentColor" />
                <line x1="10" y1="100" x2="90" y2="100" stroke="currentColor" strokeWidth="1" />
            </svg>
        </div>
    );
};

export const VISUALS = {
    scatter: ScatterPlot,
    growth: GrowthCurve,
    decline: DeclineCurve,
    structure: StructureGrid,
    target: TargetFocus,
    bar: BarChart
};

export function getAbstractVisual(keyword: string) {
    // This function now returns the Component Class, not an instance.
    // The Layout handles the Seed.

    const k = keyword.toLowerCase();

    // POSITIVE / UP / SOLUTION
    if (k.match(/growth|scale|up|rise|high|profit|win|success|solution|fix|answer|solve|optimize/)) return GrowthCurve;
    if (k.match(/structure|system|order|plan|step|process|organize|method|matrix|grid/)) return StructureGrid;
    if (k.match(/goal|focus|target|aim|point|one|core|main/)) return TargetFocus;

    // NEGATIVE / DOWN / PROBLEM
    if (k.match(/down|decline|drop|low|loss|fail|problem|error|mistake|risk|crash|bad/)) return DeclineCurve;

    // QUANTITY / DATA / CHAOS
    if (k.match(/data|many|list|audience|users|traffic|noise|chaos|mess|scatter|dots/)) return ScatterPlot;

    // COMPARISON
    if (k.match(/compare|vs|versus|diff|better|worst|result/)) return BarChart;

    return StructureGrid;
}
