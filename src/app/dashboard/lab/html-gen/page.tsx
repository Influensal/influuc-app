
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function HTMLGeneratorLab() {
    const [prompt, setPrompt] = useState("");
    const [slides, setSlides] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        console.log("Generating with prompt:", prompt);
        setLoading(true);
        setSlides([]);
        setCurrentIndex(0);

        try {
            const res = await fetch("/api/ai/lab/generate-html", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt })
            });
            console.log("Response status:", res.status);

            if (!res.ok) {
                const text = await res.text();
                console.error("API Error:", text);
                return;
            }

            const data = await res.json();
            console.log("Data received:", data);

            if (data.slides && Array.isArray(data.slides)) {
                setSlides(data.slides);
            } else if (data.html) {
                // Fallback for logic mismatch
                setSlides([data.html]);
            }

        } catch (e) {
            console.error("Fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    const nextSlide = () => setCurrentIndex(prev => Math.min(prev + 1, slides.length - 1));
    const prevSlide = () => setCurrentIndex(prev => Math.max(prev - 1, 0));

    return (
        <div className="flex bg-gray-100 min-h-screen">
            {/* INPUT */}
            <div className="w-1/3 p-8 border-r bg-white flex flex-col gap-6 h-screen overflow-hidden">
                <div className="flex-none">
                    <h1 className="text-2xl font-bold">🧪 HTML Gen Lab</h1>
                    <p className="text-sm text-gray-500 mb-4">
                        Testing "Raw HTML" generation vs "JSON Templates".
                        The LLM has full control over layout here.
                    </p>

                    <Textarea
                        placeholder="Describe your carousel... (e.g., '10 slides about dumb ways to die')"
                        className="h-32 mb-4"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />

                    <Button onClick={handleGenerate} disabled={loading} className="w-full">
                        {loading ? "Generating Carousel..." : "Generate HTML"}
                    </Button>
                </div>

                {/* LOGS / CODE */}
                <div className="flex-1 overflow-auto bg-gray-50 p-4 rounded text-xs font-mono border">
                    {slides.length > 0 ? (
                        <>
                            <div className="font-bold text-gray-400 mb-2">SOURCE CODE (Slide {currentIndex + 1})</div>
                            {slides[currentIndex]}
                        </>
                    ) : (
                        <div className="text-gray-400 italic">Waiting for generation...</div>
                    )}
                </div>
            </div>

            {/* PREVIEW */}
            <div className="w-2/3 flex flex-col items-center justify-center p-12 bg-gray-200 h-screen relative">

                {/* NAVIGATION */}
                {slides.length > 0 && (
                    <div className="absolute top-8 flex items-center gap-4 bg-white p-2 rounded-full shadow-lg z-10">
                        <Button variant="outline" size="sm" onClick={prevSlide} disabled={currentIndex === 0}>
                            ←
                        </Button>
                        <span className="font-mono text-sm font-bold min-w-[3rem] text-center">
                            {currentIndex + 1} / {slides.length}
                        </span>
                        <Button variant="outline" size="sm" onClick={nextSlide} disabled={currentIndex === slides.length - 1}>
                            →
                        </Button>
                    </div>
                )}

                {slides.length > 0 ? (
                    <div
                        className="w-[1080px] h-[1350px] bg-white shadow-2xl overflow-hidden scale-[0.6] origin-center transition-all duration-300"
                        dangerouslySetInnerHTML={{ __html: slides[currentIndex] }}
                    />
                ) : (
                    <div className="text-gray-400 border-2 border-dashed border-gray-300 rounded-xl w-[400px] h-[500px] flex items-center justify-center">
                        Preview Area
                    </div>
                )}
            </div>
        </div>
    );
}
