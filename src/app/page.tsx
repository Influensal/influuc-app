'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useAnimation, useInView, useScroll, useTransform } from 'framer-motion';

import Lenis from '@studio-freight/lenis';

const fadeIn: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function HomePage() {
  const router = useRouter();
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start center", "end center"]
  });

  // Spotlight logic for mouse-aware directional lighting
  const mouseX = useAnimation();
  const mouseY = useAnimation();
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!spotlightRef.current) return;
      const { left, top } = spotlightRef.current.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      spotlightRef.current.style.setProperty("--x", `${x}px`);
      spotlightRef.current.style.setProperty("--y", `${y}px`);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);


  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  return (
    <div className="bg-[#030208] text-[#FAFAFA] selection:bg-violet-500/30 selection:text-white overflow-x-hidden min-h-screen font-sans">

      {/* 
        ============================================================
        BACKGROUND / TEXTURE (Midnight Luxe Base)
        ============================================================
      */}
      <div className="fixed inset-0 z-0 pointer-events-none w-screen h-screen bg-[#030208]" ref={spotlightRef}>
        <div className="absolute inset-0 spotlight-logic opacity-30" />
        {/* Persistent, subtle animated noise texture overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PScwIDAgMjAwIDIwMCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48ZmlsdGVyIGlkPSdub2lzZUZpbHRlcic+PGZlVHVyYnVsZW5jZSB0eXBlPSdmcmFjdGFsTm9pc2UnIGJhc2VGcmVxdWVuY3k9JzAuNjUnIG51bU9jdGF2ZXM9JzMnIHN0aXRjaFRpbGVzPSdzdGl0Y2gnLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWx0ZXI9J3VybCgjbm9pc2VGaWx0ZXIpJyBvcGFjaXR5PScwLjA4JyBtaXgtYmxlbmQtbW9kZT0nb3ZlcmxheScvPjwvc3ZnPg==')] opacity-30 mix-blend-overlay" />

        {/* Soft, ambient radial spotlights that subtly shift over time */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-violet-600/10 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-10000" />
        <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-violet-600/5 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-10000 delay-500" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] bg-violet-950/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      {/* 
        ============================================================
        NAVIGATION
        ============================================================
      */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[1000px] px-6 sm:px-8">
        <div className="flex items-center justify-between bg-[#0A0614]/70 backdrop-blur-[20px] border border-white/[0.05] rounded-[32px] px-6 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)] w-full">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer group shrink-0" onClick={() => router.push('/')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#3B82F6]">
              <path d="M4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 12V12.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xl font-medium tracking-tight text-white ml-1">Influuc</span>
          </div>

          {/* Center Nav Links */}
          <div className="hidden md:flex items-center gap-10 text-lg text-neutral-200 font-medium ml-12">
            <a href="#home" className="hover:text-white transition-colors">Platform</a>
            <a href="#features" className="hover:text-white transition-colors">Infrastructure</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          {/* Right CTA */}
          <button onClick={() => router.push('/signup')} className="relative group px-7 py-3 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white text-lg font-semibold transition-all shadow-[0_4px_24px_rgba(59,130,246,0.4)] shrink-0 ml-auto">
            <span className="relative z-10 flex items-center gap-2">Get Started</span>
          </button>
        </div>
      </nav>

      <main className="relative z-10 pt-32">

        {/* 
          ============================================================
          SECTION 1: HERO
          ============================================================
        */}
        <section id="home" className="relative min-h-[70vh] lg:min-h-[90vh] flex items-center pb-12 lg:pb-24 overflow-hidden">
          {/* Neural Lattice Backdrop (Section Level to avoid boxes) */}
          <div className="absolute inset-x-0 -top-40 h-[1000px] z-0 opacity-20 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <defs>
                <pattern id="neural-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="#3B82F6" fillOpacity="0.4" />
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3B82F6" strokeWidth="0.5" strokeOpacity="0.1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#neural-grid)" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-r from-[#030208] via-transparent to-[#030208] z-10" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#030208] via-transparent to-[#030208] z-10" />
          </div>

          <div className="w-full px-8 lg:pl-24 lg:pr-12 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-0 items-center">
            {/* Left Column: Copy & CTA */}
            <motion.div variants={stagger} initial="hidden" animate="visible" className="z-20 relative lg:ml-0 max-w-3xl">
              <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-neutral-200 text-sm font-bold tracking-[0.2em] uppercase mb-10 shadow-2xl backdrop-blur-xl">
                <span className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.8)]" />
                Proprietary Engine v2.0 Live
              </motion.div>

              <div className="relative">

                <motion.h1
                  className="text-5xl md:text-6xl lg:text-8xl font-semibold tracking-[-0.04em] leading-[1.1] md:leading-[1.0] mb-8 relative z-10 flex flex-col items-start gap-1"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                >
                  <span className="block text-white whitespace-nowrap">Your hands-off</span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-violet-300 to-violet-500 whitespace-nowrap">
                    AI Content Strategist.
                  </span>
                </motion.h1>
              </div>


              <motion.p variants={fadeIn} className="text-xl md:text-2xl text-neutral-200 mb-12 leading-relaxed font-normal max-w-2xl">
                We generate high-converting posts, insightful carousels, and act on breaking industry news—publishing directly to X and LinkedIn so you can focus on building your business.
              </motion.p>

              <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center gap-6 mb-12">
                <button onClick={() => router.push('/signup')} className="relative group w-full sm:w-auto px-12 py-6 rounded-full bg-white text-black text-xl font-bold transition-all hover:scale-[1.02] shadow-[0_0_40px_rgba(255,255,255,0.15)]">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-violet-900 opacity-0 group-hover:opacity-25 blur-2xl transition-opacity duration-700" />
                  <span className="relative z-10">Start Saving Time</span>
                </button>
                <button onClick={() => router.push('/signup')} className="w-full sm:w-auto px-12 py-6 rounded-full bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/20 hover:border-white/40 text-lg font-semibold transition-all backdrop-blur-xl">
                  See How It Works
                </button>
              </motion.div>

              <motion.div variants={fadeIn} className="flex items-center gap-4 text-base text-neutral-200 font-mono tracking-widest uppercase mb-10 lg:mb-20">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,1)]" />
                No More Blank Pages.
              </motion.div>
            </motion.div>



            {/* Right Column: 3D Glowing Dashboard Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40, rotateY: -10 }}
              animate={{ opacity: 1, x: 0, rotateY: -15 }}
              transition={{ duration: 1.2, delay: 0.2 }}
              className="relative hidden lg:block h-[700px] w-full"
            >
              {/* Floating Geometric Orbs */}
              <motion.div
                animate={{ y: [0, -20, 0], rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute top-10 right-20 w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-transparent border border-violet-500/30 backdrop-blur-md z-20 shadow-[0_0_30px_rgba(139,92,246,0.2)]"
              />
              <motion.div
                animate={{ y: [0, 30, 0], rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-20 left-10 w-16 h-16 rounded-full bg-gradient-to-tr from-violet-500/20 to-transparent border border-violet-500/30 backdrop-blur-md z-20 shadow-[0_0_40px_rgba(139,92,246,0.2)]"
              />

              <div className="absolute inset-0 z-10 w-[120%] -ml-[10%] mt-10" style={{ perspective: '1200px' }}>
                <div
                  className="w-full h-full bg-[#080414]/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_0_100px_rgba(139,92,246,0.15)] overflow-hidden relative group"
                  style={{ transform: 'rotateX(4deg) translateZ(0)' }}
                >
                  {/* Laser Scan Line */}
                  <motion.div
                    animate={{ top: ['-10%', '110%'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-transparent z-30 opacity-40 shadow-[0_0_15px_rgba(139,92,246,0.8)]"
                  />

                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-violet-500/5 pointer-events-none" />

                  {/* Top Bar Mockup */}
                  <div className="absolute top-0 inset-x-0 h-12 bg-white/[0.02] border-b border-white/5 flex items-center px-6 gap-2">
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                  </div>

                  {/* Sidebar Mockup */}
                  <div className="absolute left-0 inset-y-0 w-64 bg-white/[0.01] border-r border-white/5 mt-12 hidden md:block p-6">
                    <div className="w-32 h-4 bg-white/10 rounded-full mb-8" />
                    <div className="space-y-4">
                      <div className="w-full h-8 bg-violet-500/20 rounded-md border border-violet-500/30 opacity-60" />
                      <div className="w-24 h-4 bg-white/5 rounded-full" />
                      <div className="w-28 h-4 bg-white/5 rounded-full" />
                    </div>
                  </div>

                  {/* Main Content Mockup */}
                  <div className="absolute top-24 left-[280px] right-8 bottom-8">
                    <div className="w-48 h-8 bg-white/10 rounded-full mb-8" />
                    <div className="grid grid-cols-3 gap-6 mb-6">
                      <div className="h-24 bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-end">
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 mb-2" />
                        <div className="w-16 h-3 bg-white/20 rounded-full mb-2" />
                        <div className="w-24 h-4 bg-white/40 rounded-full" />
                      </div>
                      <div className="h-24 bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-end">
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 mb-2" />
                        <div className="w-16 h-3 bg-white/20 rounded-full mb-2" />
                        <div className="w-24 h-4 bg-white/40 rounded-full" />
                      </div>
                      <div className="h-24 bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-end">
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 mb-2" />
                        <div className="w-16 h-3 bg-white/20 rounded-full mb-2" />
                        <div className="w-24 h-4 bg-white/40 rounded-full" />
                      </div>
                    </div>
                    {/* Big Chart Mockup */}
                    <div className="h-64 bg-white/[0.01] border border-white/5 rounded-xl overflow-hidden relative">
                      <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-violet-500/20 to-transparent" />
                      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                        <motion.path
                          d="M0,200 Q100,100 200,150 T400,80 T600,120 T800,40"
                          fill="none"
                          stroke="rgba(139, 92, 246, 0.5)"
                          strokeWidth="3"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 2, ease: "easeInOut" }}
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* 
          ============================================================
          1.5: VSL / Engine Placeholder
          ============================================================
        */}
        <section className="py-[var(--section-py)] px-8 sm:px-12 relative overflow-hidden">


          <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
            <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="flex-1 w-full aspect-video bg-white/[0.02] backdrop-blur-md rounded-[2rem] border border-white/[0.04] flex flex-col items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_40px_rgba(0,0,0,0.6)] relative overflow-hidden group">
              {/* Glowing Background Ring inside Video */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-600/20 rounded-full blur-[80px] group-hover:scale-110 group-hover:bg-violet-500/20 transition-all duration-1000 ease-out" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PScwIDAgMjAwIDIwMCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48ZmlsdGVyIGlkPSdub2lzZUZpbHRlcic+PGZlVHVyYnVsZW5jZSB0eXBlPSdmcmFjdGFsTm9pc2UnIGJhc2VGcmVxdWVuY3k9JzAuNjUnIG51bU9jdGF2ZXM9JzMnIHN0aXRjaFRpbGVzPSdzdGl0Y2gnLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWx0ZXI9J3VybCgjbm9pc2VGaWx0ZXIpJyBvcGFjaXR5PScwLjA4JyBtaXgtYmxlbmQtbW9kZT0nb3ZlcmxheScvPjwvc3ZnPg==')] opacity-[0.05] pointer-events-none" />

              <button className="relative w-24 h-24 rounded-full bg-white/[0.04] backdrop-blur-xl border border-white/10 text-white flex items-center justify-center z-20 hover:scale-105 hover:bg-white/[0.08] transition-all duration-500 shadow-[0_4px_20px_rgba(0,0,0,0.3)] group-hover:border-violet-500/30">
                <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-current border-b-[10px] border-b-transparent ml-2" />
              </button>
              <div className="absolute bottom-8 font-medium text-neutral-500 text-xs tracking-[0.15em] uppercase z-20">Watch 2-Minute Engine Tour</div>
            </motion.div>

            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="lg:w-[450px]">
              <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1] mb-8">
                <span className="text-neutral-500">Content that converts, </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-700">zero effort required.</span>
              </motion.h2>
              <ul className="space-y-6">
                {[
                  'Auto-generates high-quality posts and carousels.',
                  'Reacts to breaking news in your industry.',
                  'Posts directly to X and LinkedIn with images.'
                ].map((text, i) => (
                  <motion.li variants={fadeIn} key={i} className="flex items-start gap-4 flex-col sm:flex-row group">
                    <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center transition-colors group-hover:border-violet-500/30 group-hover:bg-violet-500/10">
                      <i className={`fi fi-sr-check flex items-center justify-center ${"w-3.5 h-3.5 text-violet-400"}`}  ></i>
                    </div>
                    <span className="text-neutral-200 leading-relaxed text-xl group-hover:text-white transition-colors font-medium">{text}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        {/* 
          ============================================================
          SECTION 2: PROBLEM
          ============================================================
        */}
        <section className="py-[var(--section-py-lg)] px-8 sm:px-12 relative overflow-hidden">


          <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-violet-600/5 blur-[160px] rounded-full pointer-events-none" />


          <div className="max-w-[1200px] mx-auto relative z-10">
            {/* Header Content */}
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="mb-12 md:mb-24">
              <motion.div variants={fadeIn} className="inline-flex items-center px-5 py-2.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-neutral-200 text-base font-bold tracking-[0.3em] uppercase mb-12 shadow-sm backdrop-blur-md">
                The Problem
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.04em] mb-12 leading-[1.1] max-w-4xl">
                <span className="text-neutral-500">Creating content takes </span>
                <span className="text-white">too much time and money.</span>
              </motion.h2>
              <motion.p variants={fadeIn} className="text-neutral-200 text-2xl font-normal leading-relaxed max-w-2xl">
                You know you need to post consistently to grow, but staring at a blank page or paying thousands for a ghostwriter is slowing you down.
              </motion.p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: 'Wasted Time',
                  desc: 'Spending hours every week trying to think of what to post on LinkedIn and X.',
                  icon: (
                    <div className="relative w-full h-16 flex items-center justify-center overflow-hidden">
                      <svg width="120" height="40" viewBox="0 0 120 40" fill="none" className="opacity-60">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <motion.circle
                            key={i}
                            cx={10 + i * 15}
                            cy={20 + Math.sin(i) * 10}
                            r="1.5"
                            fill="currentColor"
                            className="text-violet-500"
                            animate={{
                              opacity: [0.2, 1, 0.2],
                              y: [0, Math.sin(i) * 5, 0]
                            }}
                            transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                        {Array.from({ length: 7 }).map((_, i) => (
                          <motion.path
                            key={i}
                            d={`M ${10 + i * 15} ${20 + Math.sin(i) * 10} L ${10 + (i + 1) * 15} ${20 + Math.sin(i + 1) * 10}`}
                            stroke="currentColor"
                            strokeWidth="0.5"
                            strokeDasharray="2 4"
                            className="text-violet-500/30"
                            animate={{ opacity: [0.1, 0.4, 0.1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/5 to-transparent animate-pulse" />
                    </div>
                  )
                },
                {
                  title: 'High Costs',
                  desc: 'Paying expensive ghostwriters or agencies thousands of dollars a month for generic content.',
                  icon: (
                    <div className="relative w-full h-16 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center relative overflow-hidden group-hover:border-violet-500/30 transition-colors">
                        <motion.div
                          className="w-1 h-1 bg-violet-400 rounded-full shadow-[0_0_15px_rgba(139,92,246,1)]"
                          animate={{ scale: [1, 2, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 4, repeat: Infinity }}
                        />
                        <div className="absolute inset-0 border border-violet-500/10 rounded-full animate-ping" />
                      </div>
                    </div>
                  )
                },
                {
                  title: 'Inconsistent Growth',
                  desc: 'Posting sporadically means you lose momentum and miss out on inbound leads.',
                  icon: (
                    <div className="relative w-full h-16 flex items-center justify-center">
                      <svg width="100" height="40" viewBox="0 0 100 40" fill="none" className="opacity-40">
                        <path d="M10 20 H90" stroke="white" strokeWidth="0.5" strokeOpacity="0.1" />
                        <motion.circle
                          cx="20" cy="20" r="3" fill="#8B5CF6"
                          animate={{ cx: [20, 80, 20] }}
                          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <path d="M50 20 L50 35" stroke="#8B5CF6" strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="2 2" />
                        <path d="M50 20 L50 5" stroke="#8B5CF6" strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="2 2" />
                      </svg>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-violet-500/5 blur-2xl rounded-full" />
                    </div>
                  )
                }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeIn}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/[0.02] backdrop-blur-3xl border border-white/[0.04] p-8 md:p-12 rounded-[2.5rem] shadow-[var(--shadow-luxe)] relative group hover:border-violet-500/20 transition-all duration-700 min-h-[340px] flex flex-col items-center text-center"
                >
                  {/* Subtle Glow Background */}
                  <div className="absolute inset-0 bg-gradient-to-b from-violet-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[2.5rem]" />

                  {/* Internal Reflection */}
                  <div className="absolute inset-[1px] rounded-[2.5rem] bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

                  {/* Icon Container with Glow */}
                  <div className="w-24 h-24 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-10 relative z-10 group-hover:scale-110 transition-transform duration-500 shadow-xl overflow-hidden">
                    <div className="absolute inset-0 bg-violet-600/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    {item.icon}
                  </div>

                  <h3 className="text-3xl font-semibold text-white mb-5 tracking-tight relative z-10">{item.title}</h3>
                  <p className="text-neutral-300 text-xl leading-relaxed font-normal relative z-10 max-w-[320px]">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 
          ============================================================
          SECTION 3: WHY MOST AI TOOLS FAIL
          ============================================================
        */}
        <section className="py-[var(--section-py)] px-6 relative">
          {/* Horizon Mask */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-violet-500/10 to-transparent z-10" />


          <div className="max-w-[1200px] mx-auto">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="mb-12 md:mb-24">
              <motion.h2 variants={fadeIn} className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.04em] mb-12 leading-[1.1]">
                <span className="text-neutral-500">Why standard AI </span>
                <span className="text-white">tools aren't enough.</span>
              </motion.h2>
              <p className="text-neutral-200 text-2xl font-normal leading-relaxed max-w-2xl">
                ChatGPT gives you generic robotic text. You need a system that actually understands your voice and handles the publishing.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  title: 'Generic Output',
                  desc: 'Most tools sound like a robot. We learn your specific tone and expertise so every post sounds exactly like you.',
                  icon: (
                    <div className="relative w-full h-24 flex items-center justify-center">
                      <svg width="200" height="60" viewBox="0 0 200 60" fill="none">
                        <rect x="10" y="10" width="180" height="40" rx="4" stroke="white" strokeWidth="0.5" strokeOpacity="0.1" />
                        <motion.rect
                          x="10" y="10" width="40" height="40" rx="4" fill="#8B5CF6" fillOpacity="0.2"
                          animate={{ x: [10, 150, 10] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <motion.line
                          x1="10" y1="30" x2="190" y2="30" stroke="#8B5CF6" strokeWidth="0.5" strokeOpacity="0.3"
                          animate={{ strokeDashoffset: [0, -20] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          strokeDasharray="4 4"
                        />
                      </svg>
                    </div>
                  )
                },
                {
                  title: 'No Strategy',
                  desc: 'Generating text is easy. Knowing exactly what topics will convert your specific audience is hard. We handle the strategy.',
                  icon: (
                    <div className="relative w-full h-24 flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-12 h-12 text-violet-500"}`}  ></i>
                      </div>
                      <motion.div
                        className="w-16 h-16 rounded-full border border-violet-500/20 flex items-center justify-center backdrop-blur-sm"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      >
                        <div className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_20px_rgba(139,92,246,1)]" />
                      </motion.div>
                      <motion.div
                        className="absolute w-24 h-[1px] bg-gradient-to-r from-transparent via-violet-500 to-transparent"
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  )
                },
                {
                  title: 'You Still Do The Work',
                  desc: 'Other tools give you a text file. You still have to format, find images, and schedule. We post directly to X and LinkedIn for you.',
                  icon: (
                    <div className="relative w-full h-24 flex items-center justify-center">
                      <div className="flex gap-4">
                        {[0.2, 0.4, 0.6].map((op, i) => (
                          <motion.div
                            key={i}
                            className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center"
                            animate={{ borderColor: ['rgba(255,255,255,0.05)', 'rgba(139,92,246,0.5)', 'rgba(255,255,255,0.05)'] }}
                            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                          >
                            <i className={`fi fi-sr-share flex items-center justify-center ${"w-5 h-5 text-violet-400 opacity-40"}`}  ></i>
                          </motion.div>
                        ))}
                      </div>
                      <motion.div
                        className="absolute left-[30%] right-[30%] h-[1px] bg-violet-500/20"
                        animate={{ opacity: [0.2, 0.8, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                  )
                },
                {
                  title: 'Missing Out on Trends',
                  desc: 'Static tools miss what\'s happening today. Our engine monitors industry news and automatically creates timely, relevant content.',
                  icon: (
                    <div className="relative w-full h-24 flex items-center justify-center">
                      <div className="flex items-end gap-2 h-12">
                        {[30, 60, 45, 90, 70].map((h, i) => (
                          <motion.div
                            key={i}
                            className="w-2 bg-violet-500/20 rounded-t-sm relative overflow-hidden"
                            animate={{ height: [`${h}%`, `${h + 10}%`, `${h}%`] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                          >
                            <motion.div
                              className="absolute inset-0 bg-violet-400"
                              animate={{ y: ['100%', '-100%'] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )
                }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeIn}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/[0.02] backdrop-blur-3xl border border-white/[0.04] px-6 py-8 md:px-10 md:py-12 rounded-[2.5rem] shadow-[var(--shadow-luxe)] relative group hover:border-violet-500/20 transition-all duration-700 flex flex-col items-center text-center overflow-hidden min-h-[320px]"
                >
                  {/* Subtle Glow Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[2.5rem]" />

                  {/* Internal Reflection */}
                  <div className="absolute inset-[1px] rounded-[2.5rem] bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

                  {/* Icon Container with Glow */}
                  <div className="w-24 h-24 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-10 relative z-10 group-hover:scale-110 transition-transform duration-500">
                    <div className="absolute inset-0 bg-violet-600/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    {item.icon}
                  </div>

                  <h3 className="text-4xl font-bold text-white mb-6 tracking-tighter relative z-10">{item.title}</h3>
                  <p className="text-neutral-300 text-xl leading-relaxed font-normal relative z-10 max-w-[400px]">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 
      ============================================================
      SECTION 4: THE SHIFT (PARADIGM SHIFT)
      ============================================================
    */}
        <section className="h-[60vh] min-h-[400px] md:min-h-[500px] w-full relative flex items-center justify-center overflow-hidden">
          {/* Horizon Mask */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-violet-500/10 to-transparent z-10" />


          {/* Deep Dark Base Background with smooth gradient blending */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#030208] via-[#0A051A] to-[#030208]" />


          {/* Animated Falling Lines Background overlay */}
          <div className="absolute inset-0 flex justify-between px-[5vw] opacity-30 pointer-events-none z-0">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="w-[1px] h-full bg-gradient-to-b from-transparent via-violet-500/20 to-transparent relative">
                <div
                  className="absolute top-0 left-0 w-full h-[150px] bg-gradient-to-b from-transparent via-violet-200 to-transparent animate-falling-lines"
                  style={{ animationDelay: `${(i % 5) * 0.8}s`, animationDuration: `${3 + (i % 3)}s` }}
                />
              </div>
            ))}
          </div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto mt-[-5vh]">
            <motion.h2 variants={fadeIn} className="text-3xl md:text-5xl lg:text-[64px] font-semibold tracking-tight text-white mb-6 leading-[1.1] drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              Your entire content engine on autopilot.
            </motion.h2>
            <motion.p variants={fadeIn} className="text-xl md:text-3xl text-neutral-400 font-medium tracking-tight leading-tight">
              Save 15+ hours a week and thousands of dollars while building a massive audience on LinkedIn and X.
            </motion.p>
          </motion.div>
        </section>

        {/* 
      ============================================================
      SECTION 5: SCROLLING TIMELINE (3 STEPS)
      ============================================================
    */}
        <section id="how" ref={timelineRef} className="py-[var(--section-py-lg)] px-6 relative">
          {/* Horizon Mask */}
          <div className="absolute top-0 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent z-10" />

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-[1000px] mx-auto relative z-10">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="text-center mb-32">
              <motion.div variants={fadeIn} className="text-base font-mono tracking-[0.2em] text-neutral-200 uppercase mb-6">How It Works</motion.div>
              <motion.h2 variants={fadeIn} className="text-5xl md:text-6xl font-semibold tracking-tight mb-8 text-white leading-[1.1]">
                Start growing in <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600 drop-shadow-[0_0_20px_rgba(139,92,246,0.3)]">5 minutes</span>.
              </motion.h2>
              <motion.p variants={fadeIn} className="text-neutral-200 text-2xl max-w-2xl mx-auto font-normal leading-relaxed">
                Fill out a quick form, and we take care of the rest.
              </motion.p>
            </motion.div>

            <div className="relative space-y-16 md:space-y-32">
              {/* Vertical Connecting Line */}
              <div className="absolute left-10 md:left-1/2 top-12 bottom-12 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent -translate-x-1/2 z-0" />

              {/* Step 1 */}
              <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="flex flex-col md:flex-row items-start md:items-center w-full relative">
                <div className="w-full md:w-1/2 pl-24 pr-6 md:pr-16 md:pl-0 text-left md:text-right relative mb-8 md:mb-0">
                  <div className="text-base font-mono tracking-widest text-violet-400 uppercase font-bold mb-4">Phase 1: Onboarding</div>
                  <h3 className="text-3xl md:text-5xl font-semibold text-white mb-5">Tell us about your brand</h3>
                  <p className="text-xl text-neutral-200 leading-relaxed font-normal md:ml-auto max-w-[480px]">Spend 5 minutes answering questions about your expertise, target audience, and goals.</p>
                </div>
                <div className="absolute left-10 md:left-1/2 -translate-x-1/2 top-0 md:top-auto w-16 h-16 md:w-24 md:h-24 rounded-full bg-[#0A0710] border border-violet-500/40 flex items-center justify-center font-mono text-xl md:text-2xl text-violet-300 shadow-[0_0_50px_rgba(139,92,246,0.3)] z-10 transition-transform hover:scale-110 duration-500 group">
                  <div className="absolute inset-0 rounded-full bg-violet-600/20 blur-2xl pointer-events-none" />
                  01
                </div>
                <div className="hidden md:block w-1/2 pl-12 md:pl-16"></div>
              </motion.div>

              {/* Step 2 */}
              <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="flex flex-col md:flex-row items-start md:items-center w-full relative">
                <div className="hidden md:block w-1/2 pr-12 md:pr-16 text-right"></div>
                <div className="absolute left-10 md:left-1/2 -translate-x-1/2 top-0 md:top-auto w-16 h-16 md:w-24 md:h-24 rounded-full bg-[#0A0710] border border-violet-500/40 flex items-center justify-center font-mono text-xl md:text-2xl text-violet-300 shadow-[0_0_50px_rgba(139,92,246,0.3)] z-10 transition-transform hover:scale-110 duration-500 group">
                  <div className="absolute inset-0 rounded-full bg-violet-600/20 blur-2xl pointer-events-none" />
                  02
                </div>
                <div className="w-full md:w-1/2 pl-24 pr-6 md:pl-16 text-left relative mb-8 md:mb-0">
                  <div className="text-base font-mono tracking-widest text-violet-400 uppercase font-bold mb-4">Phase 2: Strategy</div>
                  <h3 className="text-3xl md:text-5xl font-semibold text-white mb-5">We build your content plan</h3>
                  <p className="text-xl text-neutral-200 leading-relaxed font-normal max-w-[480px]">Our AI instantly generates a tailored content strategy and starts drafting high-quality posts and carousels.</p>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="flex flex-col md:flex-row items-start md:items-center w-full relative">
                <div className="w-full md:w-1/2 pl-24 pr-6 md:pr-16 md:pl-0 text-left md:text-right relative mb-8 md:mb-0">
                  <div className="text-base font-mono tracking-widest text-violet-400 uppercase font-bold mb-4">Phase 3: Execution</div>
                  <h3 className="text-3xl md:text-5xl font-semibold text-white mb-5">We post while you work</h3>
                  <p className="text-xl text-neutral-200 leading-relaxed font-normal md:ml-auto max-w-[480px]">We automatically find the right images, format everything perfectly, and publish directly to your X and LinkedIn accounts.</p>
                </div>
                <div className="absolute left-10 md:left-1/2 -translate-x-1/2 top-0 md:top-auto w-16 h-16 md:w-24 md:h-24 rounded-full bg-[#0A0710] border border-violet-500/40 flex items-center justify-center font-mono text-xl md:text-2xl text-violet-300 shadow-[0_0_50px_rgba(139,92,246,0.3)] z-10 transition-transform hover:scale-110 duration-500 group">
                  <div className="absolute inset-0 rounded-full bg-violet-600/20 blur-2xl pointer-events-none" />
                  03
                </div>
                <div className="hidden md:block w-1/2 pl-12 md:pl-16"></div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 
          ============================================================
          SECTION 5.5: THE 5-MINUTE WEEKLY LOOP
          ============================================================
        */}
        <section className="py-[var(--section-py-lg)] px-6 relative overflow-hidden">
          {/* Horizon Mask */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent z-10" />

          {/* Background Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-violet-600/5 blur-[160px] rounded-full pointer-events-none" />

          <div className="max-w-[1200px] mx-auto relative z-10">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="text-center mb-12 md:mb-24">
              <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-neutral-200 text-sm font-bold tracking-[0.1em] uppercase mb-6 backdrop-blur-md shadow-sm">
                The Workflow
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.02em] mb-8 text-white leading-[1.0] max-w-4xl mx-auto">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-violet-500">80+ posts a month.</span> <br />
                <span className="text-neutral-500">5 minutes a week.</span>
              </motion.h2>
              <motion.p variants={fadeIn} className="text-neutral-200 text-2xl max-w-2xl mx-auto font-normal leading-relaxed">
                No daily grinding. No staring at blank pages. Here is exactly what you do every Monday morning.
              </motion.p>
            </motion.div>

            {/* The Vertical Workflow Timeline */}
            <div className="relative mt-24">
              {/* Central Glowing Line */}
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent -translate-x-1/2">
                <motion.div
                  className="absolute top-0 left-[-1px] w-[3px] h-32 bg-gradient-to-b from-transparent via-violet-500 to-transparent blur-[2px]"
                  animate={{ top: ['0%', '100%'], opacity: [0, 1, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              </div>

              {/* Step 1: Open the App */}
              <div className="relative flex flex-col md:flex-row items-center gap-12 md:gap-24 mb-20 md:mb-48 group">
                <div className="absolute left-8 md:left-1/2 w-4 h-4 rounded-full bg-[#0A0710] border border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.5)] -translate-x-1/2 mt-8 md:mt-0 z-10 hidden md:block" />

                {/* Text Content (Left) */}
                <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="w-full md:w-1/2 pl-24 md:pl-0 md:text-right md:pr-12">
                  <div className="text-violet-400 font-mono text-6xl md:text-8xl font-black opacity-[0.05] absolute top-[-20px] left-20 md:-right-4 md:left-auto z-0 -tracking-[0.05em] pointer-events-none">01</div>
                  <div className="relative z-10">
                    <h3 className="text-3xl md:text-5xl font-semibold text-white mb-6 tracking-tight">Open the App</h3>
                    <p className="text-neutral-200 text-2xl leading-relaxed font-normal mb-8 max-w-lg md:ml-auto">
                      Log in once a week. Influuc is waiting with a perfectly tailored strategy for the next 7 days, powered by billions of data points.
                    </p>
                    <div className="inline-flex items-center gap-3 text-violet-400 text-base font-bold tracking-wide">
                      <i className={`fi fi-sr-apps flex items-center justify-center ${"w-5 h-5"}`}  ></i> <span>Unified Dashboard</span>
                    </div>
                  </div>
                </motion.div>

                {/* Visual Graphic (Right) */}
                <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="w-full md:w-1/2 pl-24 md:pl-12 perspective-[1000px]">
                  <div className="w-full max-w-[500px] aspect-[4/3] bg-[#0A0710]/80 rounded-2xl border border-white/[0.05] shadow-[0_0_50px_rgba(139,92,246,0.05)] overflow-hidden relative group-hover:border-violet-500/30 transition-all duration-700" style={{ transform: 'rotateY(-5deg) rotateX(2deg)' }}>
                    {/* Glow backdrop */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-duration-700 pointer-events-none" />

                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
                      <div className="flex gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      </div>
                      <div className="w-32 h-3 rounded-full bg-white/[0.03]" />
                    </div>
                    {/* Body Setup */}
                    <div className="flex h-full">
                      {/* Nav Bar Mock */}
                      <div className="w-16 border-r border-white/[0.05] p-3 space-y-4">
                        <div className="w-full aspect-square rounded-md bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)]"><i className={`fi fi-sr-apps flex items-center justify-center ${"w-4 h-4 text-violet-400"}`}  ></i></div>
                        <div className="w-full aspect-square rounded-md bg-white/[0.02]" />
                        <div className="w-full aspect-square rounded-md bg-white/[0.02]" />
                      </div>
                      {/* Main Data area */}
                      <div className="flex-1 p-6 flex flex-col gap-4">
                        <div className="w-24 h-4 rounded-full bg-white/20 mb-2" />
                        <div className="w-3/4 h-2 rounded-full bg-white/5" />

                        <div className="flex gap-4 mt-4">
                          <div className="flex-1 h-32 rounded-xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] p-4 flex flex-col justify-end">
                            <div className="w-8 h-8 rounded-full bg-violet-500/20 mb-auto flex items-center justify-center"><i className={`fi fi-sr-arrow-up-right flex items-center justify-center ${"w-4 h-4 text-violet-400"}`}  ></i></div>
                            <div className="w-1/2 h-3 rounded-full bg-white/20 mb-2" />
                            <div className="w-full h-8 flex items-end gap-1">
                              {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                                <motion.div key={i} className="flex-1 bg-violet-500/20 rounded-t-sm" initial={{ height: 0 }} whileInView={{ height: `${h}%` }} transition={{ duration: 1, delay: i * 0.1 }} viewport={{ once: true }} />
                              ))}
                            </div>
                          </div>
                          <div className="flex-1 h-32 rounded-xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] p-4 flex flex-col justify-end">
                            <div className="w-1/2 h-4 rounded-full bg-white/20 mb-2" />
                            <div className="w-3/4 h-2 rounded-full bg-white/10" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Step 2: Tell us about your week */}
              <div className="relative flex flex-col md:flex-row-reverse items-center gap-12 md:gap-24 mb-20 md:mb-48 group">
                <div className="absolute left-8 md:left-1/2 w-4 h-4 rounded-full bg-[#0A0710] border border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.5)] -translate-x-1/2 mt-8 md:mt-0 z-10 hidden md:block" />

                {/* Text Content (Right) */}
                <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="w-full md:w-1/2 pl-24 md:pl-12">
                  <div className="text-violet-400 font-mono text-6xl md:text-8xl font-black opacity-[0.05] absolute top-[-20px] left-20 md:-left-4 md:left-auto z-0 -tracking-[0.05em] pointer-events-none">02</div>
                  <div className="relative z-10">
                    <h3 className="text-3xl md:text-5xl font-semibold text-white mb-6 tracking-tight">Tell us about your week</h3>
                    <p className="text-neutral-200 text-2xl leading-relaxed font-normal mb-8 max-w-lg">
                      Answer a quick conversational prompt. Did you hit any milestones? What personal experiences happened? Any big events or launches?
                    </p>
                    <div className="inline-flex items-center gap-3 text-violet-400 text-base font-bold tracking-wide">
                      <i className={`fi fi-sr-comment flex items-center justify-center ${"w-5 h-5"}`}  ></i> <span>Conversational Input</span>
                    </div>
                  </div>
                </motion.div>

                {/* Visual Graphic (Left) */}
                <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="w-full md:w-1/2 pl-24 md:pl-0 md:pr-12 perspective-[1000px] flex justify-end">
                  <div className="w-full max-w-[500px] aspect-[4/3] bg-[#0A0710]/80 rounded-2xl border border-white/[0.05] shadow-[0_0_50px_rgba(139,92,246,0.05)] overflow-hidden relative group-hover:border-violet-500/30 transition-all duration-700 p-6 flex flex-col justify-end gap-4" style={{ transform: 'rotateY(5deg) rotateX(2deg)' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-duration-700 pointer-events-none" />

                    {/* Chat Bubbles */}
                    <motion.div className="w-[85%] bg-white/[0.03] border border-white/5 rounded-2xl rounded-tl-none p-5 self-start shadow-sm" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center"><i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-3 h-3 text-violet-400"}`}  ></i></div>
                        <div className="h-2 w-24 bg-white/20 rounded-full" />
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full mb-3" />
                      <div className="w-3/4 h-2 bg-white/10 rounded-full mb-3" />
                      <div className="w-1/2 h-2 bg-white/10 rounded-full" />
                    </motion.div>

                    <motion.div className="w-[80%] bg-violet-500/10 border border-violet-500/20 rounded-2xl rounded-br-none p-5 self-end shadow-sm flex flex-col items-end" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} viewport={{ once: true }}>
                      <div className="w-full h-2 bg-white/20 rounded-full mb-3" />
                      <div className="w-5/6 h-2 bg-white/20 rounded-full mb-3" />
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3 bg-violet-400 rounded-sm animate-pulse" />
                      </div>
                    </motion.div>

                    {/* Input Area */}
                    <div className="w-full mt-2 h-12 bg-white/[0.02] border border-white/[0.04] rounded-full flex items-center px-4 justify-between">
                      <div className="w-1/3 h-2 bg-white/5 rounded-full" />
                      <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]"><i className={`fi fi-sr-arrow-up-right flex items-center justify-center ${"w-4 h-4 text-white"}`}  ></i></div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Step 3: Set your target */}
              <div className="relative flex flex-col md:flex-row items-center gap-12 md:gap-24 mb-20 md:mb-48 group">
                <div className="absolute left-8 md:left-1/2 w-4 h-4 rounded-full bg-[#0A0710] border border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.5)] -translate-x-1/2 mt-8 md:mt-0 z-10 hidden md:block" />

                {/* Text Content (Left) */}
                <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="w-full md:w-1/2 pl-24 md:pl-0 md:text-right md:pr-12">
                  <div className="text-violet-400 font-mono text-6xl md:text-8xl font-black opacity-[0.05] absolute top-[-20px] left-20 md:-right-4 md:left-auto z-0 -tracking-[0.05em] pointer-events-none">03</div>
                  <div className="relative z-10">
                    <h3 className="text-3xl md:text-5xl font-semibold text-white mb-6 tracking-tight">Set your target</h3>
                    <p className="text-neutral-200 text-2xl leading-relaxed font-normal mb-8 max-w-lg md:ml-auto">
                      What's the absolute goal for this batch of content? Tell us if you want more followers, VC attention, or to drive specific signups.
                    </p>
                    <div className="inline-flex items-center gap-3 text-violet-400 text-base font-bold tracking-wide">
                      <i className={`fi fi-sr-bullseye flex items-center justify-center ${"w-5 h-5"}`}  ></i> <span>Goal Alignment</span>
                    </div>
                  </div>
                </motion.div>

                {/* Visual Graphic (Right) */}
                <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="w-full md:w-1/2 pl-24 md:pl-12 perspective-[1000px]">
                  <div className="w-full max-w-[500px] aspect-[4/3] bg-[#0A0710]/80 rounded-2xl border border-white/[0.05] shadow-[0_0_50px_rgba(139,92,246,0.05)] overflow-hidden relative group-hover:border-violet-500/30 transition-all duration-700 p-6 flex flex-col" style={{ transform: 'rotateY(-5deg) rotateX(2deg)' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-duration-700 pointer-events-none" />

                    {/* Header Controls */}
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-violet-500/40 flex items-center justify-center bg-violet-500/10">
                          <i className={`fi fi-sr-bullseye flex items-center justify-center ${"w-5 h-5 text-violet-400"}`}  ></i>
                        </div>
                        <div>
                          <div className="w-24 h-3 bg-white/20 rounded-full mb-2" />
                          <div className="w-16 h-2 bg-white/10 rounded-full" />
                        </div>
                      </div>
                      <div className="px-4 py-2 rounded-full border border-violet-500/50 text-violet-400 text-sm font-bold tracking-widest bg-violet-500/10">OPTIMIZED</div>
                    </div>

                    {/* Chart Mockup */}
                    <div className="flex-1 w-full relative pt-4 border-b border-white/[0.05]">
                      {/* Metric Lines */}
                      <div className="absolute inset-x-0 bottom-[25%] h-px bg-white/[0.02]" />
                      <div className="absolute inset-x-0 bottom-[50%] h-px bg-white/[0.02]" />
                      <div className="absolute inset-x-0 bottom-[75%] h-px bg-white/[0.02]" />

                      <div className="absolute bottom-0 inset-x-0 h-full bg-gradient-to-t from-violet-500/20 to-transparent" />
                      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <motion.path
                          d="M0,80 Q25,70 50,50 T75,30 T100,10"
                          fill="none"
                          stroke="rgba(139, 92, 246, 0.8)"
                          strokeWidth="2"
                          initial={{ pathLength: 0, opacity: 0 }}
                          whileInView={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 2.5, ease: "easeInOut" }}
                          viewport={{ once: true }}
                        />
                      </svg>
                      {/* End point dot */}
                      <motion.div
                        className="absolute right-0 top-[10%] w-4 h-4 bg-[#0A0710] border-2 border-violet-500 rounded-full shadow-[0_0_20px_rgba(139,92,246,1)]"
                        initial={{ scale: 0, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 2.5, duration: 0.5 }}
                        viewport={{ once: true }}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Step 4: Generate & Log Off */}
              <div className="relative flex flex-col md:flex-row-reverse items-center gap-12 md:gap-24 mb-16 md:mb-24 group">
                <div className="absolute left-8 md:left-1/2 w-4 h-4 rounded-full bg-[#0A0710] border border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.5)] -translate-x-1/2 mt-8 md:mt-0 z-10 hidden md:block" />

                {/* Text Content (Right) */}
                <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="w-full md:w-1/2 pl-24 md:pl-12">
                  <div className="text-violet-400 font-mono text-6xl md:text-8xl font-black opacity-[0.05] absolute top-[-20px] left-20 md:-left-4 md:left-auto z-0 -tracking-[0.05em] pointer-events-none">04</div>
                  <div className="relative z-10">
                    <h3 className="text-3xl md:text-4xl font-semibold text-white mb-6 tracking-tight">Generate & Log Off</h3>
                    <p className="text-neutral-400 text-lg leading-relaxed font-light mb-8 max-w-md">
                      Click one button. We instantly generate highly formatted posts, compelling carousels, and select images. Everything is published automatically for the next 7 days.
                    </p>
                    <div className="inline-flex items-center gap-2 text-violet-400 text-sm font-medium tracking-wide">
                      <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-4 h-4"}`}  ></i> <span>Autonomous Execution</span>
                    </div>
                  </div>
                </motion.div>

                {/* Visual Graphic (Left) */}
                <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="w-full md:w-1/2 pl-24 md:pl-0 md:pr-12 perspective-[1000px] flex justify-end">
                  <div className="w-full max-w-[500px] aspect-[4/3] bg-[#0A0710]/80 rounded-2xl border border-violet-500/30 shadow-[0_0_80px_rgba(139,92,246,0.15)] overflow-hidden relative transition-all duration-700 flex flex-col items-center justify-center p-8 group-hover:shadow-[0_0_120px_rgba(139,92,246,0.25)]" style={{ transform: 'rotateY(5deg) rotateX(2deg)' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-violet-500/5 to-transparent pointer-events-none" />

                    {/* The Command Button / Status */}
                    <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-[10px] font-mono text-violet-400 uppercase flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                      </span>
                      System Active
                    </div>

                    <div className="relative w-full flex-1 flex flex-col items-center justify-center mb-8" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(15deg) translateY(-20px)' }}>
                      {/* Floating Cards simulating generation */}
                      <motion.div
                        animate={{ y: [-5, 5, -5] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute z-30 w-[90%] h-20 bg-[#0A0710] border border-violet-500/40 rounded-xl shadow-[0_20px_40px_rgba(139,92,246,0.2)] translate-z-[30px] flex items-center px-6 gap-4"
                      >
                        <div className="w-10 h-10 rounded-md bg-violet-500/20 flex items-center justify-center"><i className={`fi fi-sr-check flex items-center justify-center ${"w-5 h-5 text-violet-400"}`}  ></i></div>
                        <div className="flex-1 space-y-2">
                          <div className="w-3/4 h-2 bg-white/30 rounded-full" />
                          <div className="w-1/2 h-2 bg-white/20 rounded-full" />
                        </div>
                      </motion.div>

                      <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                        className="absolute z-20 w-[80%] h-20 bg-[#0A0710] border border-white/10 rounded-xl shadow-2xl -translate-y-6 -translate-z-[10px] flex items-center px-6 gap-4 opacity-80"
                      >
                        <div className="w-10 h-10 rounded-md bg-white/[0.05]" />
                        <div className="flex-1 space-y-2">
                          <div className="w-2/3 h-2 bg-white/20 rounded-full" />
                          <div className="w-full h-2 bg-white/10 rounded-full" />
                        </div>
                      </motion.div>

                      <motion.div
                        animate={{ y: [5, 12, 5] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                        className="absolute z-10 w-[70%] h-20 bg-[#0A0710] border border-white/[0.05] rounded-xl shadow-xl -translate-y-12 -translate-z-[30px] flex items-center px-6 gap-4 opacity-50"
                      >
                        <div className="w-10 h-10 rounded-md bg-white/[0.02]" />
                        <div className="flex-1 space-y-2">
                          <div className="w-1/2 h-2 bg-white/10 rounded-full" />
                        </div>
                      </motion.div>
                    </div>

                    {/* Big Action Button */}
                    <div className="w-[80%] py-4 mt-auto rounded-xl bg-violet-500 hover:bg-violet-400 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(139,92,246,0.3)] group/btn relative overflow-hidden text-black z-40">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
                      <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-5 h-5 text-black"}`}  ></i>
                      <span className="font-bold text-lg tracking-tight">Initiate Launch</span>
                    </div>

                  </div>
                </motion.div>
              </div>

            </div>
          </div>
        </section>

        {/* 
          ============================================================
          SECTION 6: BENTO GRID FEATURES (THE VIOLET GLOW FOCUS)
          ============================================================
        */}
        <section id="features" className="py-[var(--section-py-lg)] px-6 relative">
          {/* Horizon Mask */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent z-10" />



          <div className="max-w-[1400px] mx-auto">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="max-w-3xl mx-auto text-center mb-24">
              <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-neutral-200 text-sm font-bold tracking-[0.1em] uppercase mb-6 backdrop-blur-md shadow-sm">
                Features
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-5xl md:text-6xl font-medium tracking-tight mb-6 mt-4 leading-[1.1]">
                <span className="text-neutral-500">Everything you need to </span>
                <span className="text-white">grow hands-off.</span>
              </motion.h2>
              <motion.p variants={fadeIn} className="text-neutral-200 text-2xl font-normal leading-relaxed">A complete AI content team working for you 24/7.</motion.p>
            </motion.div>

            {/* THE GLOWING BENTO GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Feature 1: Post Orchestration (2x1) */}
              <motion.div variants={fadeIn} className="lg:col-span-2 group relative rounded-[var(--radius-luxe)] overflow-hidden bg-white/[0.02] border border-white/[0.04] backdrop-blur-md shadow-[var(--shadow-luxe)] hover:-translate-y-1 hover:border-violet-500/20 transition-all duration-500 min-h-[400px]">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="relative h-full w-full flex flex-col p-6 md:p-10">
                  {/* High-Fidelity Composer Mock */}
                  <div className="absolute top-10 right-10 left-[25%] md:left-[45%] bottom-[-40px] bg-[#0A0710] border border-white/[0.06] rounded-t-2xl overflow-hidden shadow-2xl flex flex-col transition-transform duration-500 group-hover:translate-y-[-12px]">
                    <div className="h-12 border-b border-white/[0.06] flex items-center px-4 gap-6 bg-white/[0.01]">
                      <div className="flex gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold text-neutral-300 uppercase tracking-widest">
                        <span>Draft</span>
                        <span className="text-violet-400">AI PROTOCOL</span>
                      </div>
                    </div>
                    <div className="p-8 space-y-6">
                      <div className="space-y-3">
                        <div className="h-4 w-3/4 bg-white/[0.03] rounded-full animate-pulse" />
                        <div className="h-4 w-full bg-white/[0.02] rounded-full" />
                        <div className="h-4 w-5/6 bg-white/[0.02] rounded-full" />
                      </div>
                      <div className="flex gap-3">
                        <div className="px-3 py-1.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-xs font-bold text-violet-300">#protocol</div>
                        <div className="px-3 py-1.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-xs font-bold text-violet-300">#dominance</div>
                      </div>
                    </div>
                    {/* Platform Toggles */}
                    <div className="mt-auto border-t border-white/[0.06] p-4 flex items-center gap-4 bg-white/[0.01]">
                      <div className="flex items-center gap-2 text-xs text-white"><i className={`fi fi-sr-apps flex items-center justify-center ${"w-4 h-4 text-violet-400"}`}  ></i> LinkedIn</div>
                      <div className="flex items-center gap-2 text-xs text-neutral-500"><i className={`fi fi-sr-share flex items-center justify-center ${"w-4 h-4"}`}  ></i> X Protocol</div>
                    </div>
                  </div>

                  <div className="relative z-10 w-[70%] sm:w-[50%] md:w-[40%] pr-6 mt-auto">
                    <div className="mb-4 w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                      <i className={`fi fi-sr-document flex items-center justify-center ${"w-5 h-5 text-violet-400"}`}  ></i>
                    </div>
                    <h3 className="text-3xl font-medium text-white mb-3 tracking-tight">High-Quality Posts</h3>
                    <p className="text-xl text-neutral-200 leading-relaxed font-normal">Automatically generated text formatted perfectly for LinkedIn and X.</p>
                  </div>
                </div>
              </motion.div>

              {/* Feature 2: Dynamic Carousels (1x1) */}
              <motion.div variants={fadeIn} className="group relative rounded-[var(--radius-luxe)] overflow-hidden bg-white/[0.02] border border-white/[0.04] backdrop-blur-md shadow-[var(--shadow-luxe)] hover:-translate-y-1 hover:border-violet-500/20 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="relative h-full w-full p-6 md:p-10 flex flex-col">
                  <div className="relative h-[280px] w-full mb-10 perspective-1000">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[85%] h-full bg-[#0A0710] border border-white/[0.08] rounded-2xl shadow-2xl z-30 transition-all duration-700 group-hover:-translate-y-4 group-hover:rotate-2 flex flex-col p-6">
                      <div className="w-full h-24 bg-gradient-to-br from-violet-600/20 to-violet-400/20 rounded-lg mb-4" />
                      <div className="space-y-2">
                        <div className="h-3 w-3/4 bg-white/10 rounded-full" />
                        <div className="h-3 w-1/2 bg-white/5 rounded-full" />
                      </div>
                    </div>
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[85%] h-full bg-[#0A0710] border border-white/[0.05] rounded-2xl shadow-xl z-20 translate-y-4 group-hover:translate-y-0 transition-all duration-700 group-hover:-rotate-3" />
                  </div>

                  <div className="mt-auto">
                    <div className="mb-4 w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                      <i className={`fi fi-sr-apps flex items-center justify-center ${"w-5 h-5 text-violet-400"}`}  ></i>
                    </div>
                    <h3 className="text-3xl font-medium text-white mb-3 tracking-tight">Engaging Carousels</h3>
                    <p className="text-xl text-neutral-200 leading-relaxed font-normal">Automatically create high-retention, beautifully designed carousels that drive massive engagement.</p>
                  </div>
                </div>
              </motion.div>

              {/* Feature 3: AI Image Generation (1x1) */}
              <motion.div variants={fadeIn} className="group relative rounded-[var(--radius-luxe)] overflow-hidden bg-white/[0.02] border border-white/[0.04] backdrop-blur-md shadow-[var(--shadow-luxe)] hover:-translate-y-1 hover:border-violet-500/20 transition-all duration-500 min-h-[340px]">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="relative h-full w-full p-6 md:p-8 flex flex-col">
                  <div className="bg-[#0A0710] border border-white/[0.08] rounded-xl p-4 mb-6 shadow-2xl relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                    <div className="flex items-center gap-2 text-xs text-violet-400 font-bold mb-3 uppercase tracking-wider">
                      <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-3 h-3"}`}  ></i> GEN_PROTOCOL
                    </div>
                    <div className="text-sm text-neutral-200 font-medium italic mb-4">"Futuristic glass architecture with violet refraction..."</div>
                    <div className="flex gap-2">
                      <div className="flex-1 h-12 bg-gradient-to-tr from-violet-600/30 to-violet-400/30 rounded-lg blur-[2px] opacity-60 animate-pulse" />
                    </div>
                  </div>
                  <div className="mt-auto">
                    <h3 className="text-xl font-medium text-white mb-2 tracking-tight">Perfect Images</h3>
                    <p className="text-xl text-neutral-200 font-normal leading-relaxed">We automatically generate or source the perfect, high-quality images to accompany your posts.</p>
                  </div>
                </div>
              </motion.div>

              {/* Feature 4: Newsjacking Engine (1x1) */}
              <motion.div variants={fadeIn} className="group relative rounded-[var(--radius-luxe)] overflow-hidden bg-white/[0.02] border border-white/[0.04] backdrop-blur-md shadow-[var(--shadow-luxe)] hover:-translate-y-1 hover:border-violet-500/20 transition-all duration-500 min-h-[340px]">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="relative h-full w-full p-6 md:p-8 flex flex-col">
                  <div className="flex-grow flex flex-col justify-center gap-4">
                    <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.05] p-3 rounded-full overflow-hidden relative">
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-ping absolute left-4" />
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-500 absolute left-4" />
                      <div className="ml-8 text-sm font-bold text-white tracking-wide uppercase">Trending: AI Governance</div>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <h3 className="text-xl font-medium text-white mb-2 tracking-tight">Breaking News Reaction</h3>
                    <p className="text-xl text-neutral-200 font-normal leading-relaxed">Our system monitors your industry and automatically creates relevant posts about breaking news topics.</p>
                  </div>
                </div>
              </motion.div>

              {/* Feature 5: Smart Auto-Publish (1x1) */}
              <motion.div variants={fadeIn} className="group relative rounded-[var(--radius-luxe)] overflow-hidden bg-white/[0.02] border border-white/[0.04] backdrop-blur-md shadow-[var(--shadow-luxe)] hover:-translate-y-1 hover:border-violet-500/20 transition-all duration-500 min-h-[340px]">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="relative h-full w-full p-6 md:p-8 flex flex-col">
                  <div className="flex-grow flex items-center justify-center relative">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center relative z-20">
                      <i className={`fi fi-sr-bolt flex items-center justify-center ${"w-6 h-6 text-violet-400"}`}  ></i>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <h3 className="text-xl font-medium text-white mb-2 tracking-tight">Auto-Publishing</h3>
                    <p className="text-xl text-neutral-200 font-normal leading-relaxed">We handle all the scheduling and publish directly to your X and LinkedIn profiles. Zero manual work required.</p>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* 
          ============================================================
          SECTION 7: LIVE DEMO SIMULATION
          ============================================================
        */}
        <section className="py-[var(--section-py)] px-6 relative">
          {/* Horizon Mask */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent z-10" />


          <div className="max-w-[1400px] mx-auto">
            <motion.h2 variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="text-5xl md:text-7xl font-semibold tracking-[-0.04em] mb-24 text-center leading-[1.0] text-reveal">
              The Architecture <br /> of Inevitability.
            </motion.h2>

            <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="bg-white/[0.02] border border-white/[0.04] p-3 md:p-4 rounded-[var(--radius-luxe)] max-w-[1200px] mx-auto shadow-[var(--shadow-luxe)] backdrop-blur-xl">
              <div className="bg-[#0A0612] rounded-[32px] overflow-hidden flex flex-col border border-white/[0.05] shadow-inner relative min-h-[600px]">
                {/* Window Header */}
                <div className="border-b border-white/[0.05] p-5 bg-white/[0.01] flex items-center justify-between z-20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-neutral-800" />
                    <div className="w-3 h-3 rounded-full bg-neutral-800" />
                    <div className="w-3 h-3 rounded-full bg-neutral-800" />
                  </div>
                  <div className="text-sm text-neutral-300 font-bold tracking-[0.25em] uppercase flex items-center gap-2">influuc_sys_v4.0</div>
                </div>

                {/* Window Body */}
                <div className="p-6 md:p-16 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 relative overflow-hidden z-10 w-full flex-grow">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full pointer-events-none" />

                  {/* Left Column: Input */}
                  <div className="relative z-10 flex flex-col justify-center">
                    <div className="text-sm font-bold uppercase tracking-[0.3em] text-neutral-200 mb-8 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-violet-500/40" />
                      Context Ingestion Point
                    </div>
                    <div className="bg-white/[0.03] p-8 md:p-12 rounded-[32px] border border-white/[0.08] text-xl md:text-3xl text-neutral-100 leading-relaxed shadow-2xl backdrop-blur-3xl hover:border-violet-500/20 transition-all duration-700 group/input font-medium">
                      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover/input:opacity-100 transition-opacity">
                        <div className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-[10px] md:text-xs font-bold text-neutral-300 uppercase">Input Verified</div>
                      </div>
                      "I spent 10 years scaling B2B SaaS architecture. I want to talk about the hidden costs of monolithic databases versus microservices, and why founders over-engineer early."
                    </div>
                  </div>

                  {/* Right Column: Output */}
                  <div className="relative z-10 flex flex-col justify-center">
                    <div className="text-sm font-bold uppercase tracking-[0.3em] text-white mb-10 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,1)]" />
                      Calculated Strategy Unveiled
                    </div>

                    <div className="space-y-4">
                      {/* Card 1: Authority */}
                      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }} viewport={{ once: true }} className="bg-white/[0.03] p-8 rounded-[24px] border border-white/[0.08] backdrop-blur-3xl shadow-2xl relative overflow-hidden group/card hover:border-violet-500/30 transition-all duration-500">
                        <div className="absolute top-0 right-0 p-5 text-xs font-bold font-mono text-violet-400 opacity-60">INDEX: 0.98</div>
                        <div className="flex items-center gap-5 mb-6">
                          <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                            <i className={`fi fi-sr-bullseye flex items-center justify-center ${"w-6 h-6 text-violet-400"}`}  ></i>
                          </div>
                          <div className="text-white text-2xl font-semibold tracking-tight">Authority Trajectory</div>
                        </div>
                        <div className="text-neutral-200 text-lg font-normal leading-relaxed mb-8">Automated narrative mapping achieved 2.4M organic impressions. Global industry sentiment shifted to "Definitive Expert" within 90 days.</div>
                        <div className="flex gap-4">
                          <div className="px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 font-bold font-mono tracking-widest">+240% Reach</div>
                          <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-400 font-bold font-mono tracking-widest">Saturation: 82%</div>
                        </div>
                      </motion.div>

                      {/* Card 2: Pipeline */}
                      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }} viewport={{ once: true }} className="bg-white/[0.01] p-8 rounded-[24px] border border-white/[0.04] backdrop-blur-3xl opacity-60 hover:opacity-100 hover:border-violet-500/20 transition-all duration-500">
                        <div className="flex items-center gap-5 mb-6">
                          <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                            <i className={`fi fi-sr-bolt flex items-center justify-center ${"w-6 h-6 text-violet-400"}`}  ></i>
                          </div>
                          <div className="text-white text-2xl font-semibold tracking-tight">Pipeline Velocity</div>
                        </div>
                        <div className="text-neutral-200 text-lg font-normal leading-relaxed">Generated 142 enterprise-grade inbound inquiries without a single cold outreach touchpoint.</div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section >

        {/* 
          ============================================================
          SECTION 8: RESULTS & OUTCOMES (CINEMATIC)
          ============================================================
        */}
        <section className="py-[var(--section-py-lg)] w-full relative overflow-hidden">
          {/* Horizon Mask */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent z-20" />


          {/* Deep Dark Base with smooth gradient blending */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#030208] via-[#0A051A] to-[#030208]" />


          {/* Dynamic Orbs */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/10 blur-[150px] rounded-full pointer-events-none" />

          <div className="max-w-[1400px] px-6 mx-auto relative z-10">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="flex flex-col items-center text-center mb-24">
              <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-neutral-200 text-sm font-bold tracking-[0.1em] uppercase mb-8 backdrop-blur-md shadow-sm">
                Proven Results
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.1] max-w-4xl mx-auto">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600">Grow</span> without the grind.
              </motion.h2>
            </motion.div>

            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
              {[
                { val: '300%', label: 'More Impressions', icon: <i className={`fi fi-sr-arrow-up-right flex items-center justify-center ${"w-5 h-5 text-violet-400"}`}  ></i> },
                { val: '15hrs', label: 'Saved Per Week', icon: <i className={`fi fi-sr-bolt flex items-center justify-center ${"w-5 h-5 text-violet-400"}`}  ></i> },
                { val: '$0', label: 'Spent on Ghostwriters', icon: <i className={`fi fi-sr-bullseye flex items-center justify-center ${"w-5 h-5 text-violet-400"}`}  ></i> },
                { val: '100%', label: 'Automated Posting', icon: <i className={`fi fi-sr-check flex items-center justify-center ${"w-5 h-5 text-violet-400"}`}  ></i> }
              ].map((stat, i) => (
                <motion.div
                  variants={fadeIn}
                  key={i}
                  className="group relative bg-white/[0.02] rounded-[var(--radius-luxe)] p-6 md:p-10 border border-white/[0.04] backdrop-blur-2xl overflow-hidden hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-2 hover:shadow-[var(--shadow-luxe)] flex flex-col items-center text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-6 md:mb-8 relative z-10">
                    {stat.icon}
                  </div>
                  <div className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight relative z-10">
                    {stat.val}
                  </div>
                  <div className="text-xl font-bold text-neutral-200 leading-tight relative z-10 uppercase tracking-widest">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>


        {/* 
          ============================================================
          SECTION 10: COMPARISON
          ============================================================
        */}
        <section className="py-[var(--section-py)] px-6 relative overflow-hidden">
          {/* Horizon Mask */}
          <div className="absolute top-0 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent z-10" />


          <div className="max-w-4xl mx-auto">
            <motion.h2 variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="text-5xl md:text-6xl font-semibold tracking-tight text-center mb-24 leading-[1.1]">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600 drop-shadow-[0_0_30px_rgba(139,92,246,0.3)]">Why we beat standard AI.</span>
            </motion.h2>
            <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="bg-white/[0.02] border border-white/[0.04] rounded-[var(--radius-luxe)] shadow-[var(--shadow-luxe)] backdrop-blur-md overflow-hidden p-1 md:p-2">
              <div className="rounded-[var(--radius-luxe)] overflow-hidden bg-[#0A0710] border border-white/[0.04]">
                <div className="grid grid-cols-3 border-b border-white/[0.08] p-4 md:p-8 bg-white/[0.02]">
                  <div className="font-bold text-neutral-300 text-xs md:text-base tracking-[0.1em] md:tracking-[0.2em] uppercase">Feature</div>
                  <div className="font-bold text-white text-center text-xs md:text-base tracking-[0.1em] md:tracking-[0.2em] uppercase">Influuc</div>
                  <div className="font-bold text-neutral-500 text-center text-xs md:text-base tracking-[0.1em] md:tracking-[0.2em] uppercase">Standard AI</div>
                </div>
                {[
                  { cap: "Content Quality", inf: "Matches Your Voice", basic: "Sounds like ChatGPT", icon: <i className={`fi fi-sr-command flex items-center justify-center ${"w-4 h-4"}`}  ></i> },
                  { cap: "Publishing", inf: "Fully Automated", basic: "You Do It Manually", icon: <i className={`fi fi-sr-share flex items-center justify-center ${"w-4 h-4"}`}  ></i> },
                  { cap: "Carousels", inf: "Auto-Generated", basic: "Not Included", icon: <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-4 h-4"}`}  ></i> },
                  { cap: "Newsjacking", inf: "Reacts to Trends", basic: "Outdated Output", icon: <i className={`fi fi-sr-code-simple flex items-center justify-center ${"w-4 h-4"}`}  ></i> }
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-3 border-b border-white/[0.03] p-4 md:p-8 group transition-all duration-500 hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2 md:gap-4 text-neutral-200 text-sm md:text-xl font-semibold group-hover:text-white transition-colors">
                      <div className="hidden md:flex w-10 h-10 rounded-lg bg-white/[0.02] border border-white/[0.05] items-center justify-center opacity-60 group-hover:opacity-100 group-hover:border-violet-500/30 transition-all">{row.icon}</div>
                      {row.cap}
                    </div>
                    <div className="flex items-center justify-center font-bold text-white text-base md:text-2xl tracking-tight text-center">{row.inf}</div>
                    <div className="flex items-center justify-center text-neutral-500 text-sm md:text-xl font-normal text-center">{row.basic}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* 
          ============================================================
          SECTION 11: PRICING (Glow Focus)
          ============================================================
        */}
        <section id="pricing" className="py-[var(--section-py)] md:py-32 px-6 relative">
          {/* Horizon Mask */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent z-10" />

          <div className="w-full max-w-[1200px] mx-auto">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="text-center mb-16 md:mb-24 max-w-2xl mx-auto">
              <motion.h2 variants={fadeIn} className="text-4xl md:text-6xl font-semibold tracking-[-0.04em] mb-6 md:mb-8 leading-[1.0] text-reveal">
                Simple, transparent <br className="hidden md:block" /> pricing.
              </motion.h2>
              <motion.p variants={fadeIn} className="text-neutral-200 font-normal text-2xl tracking-tight">Stop paying thousands for agencies. Start growing today.</motion.p>
            </motion.div>

            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 items-stretch">
              {/* Plan 1: Starter */}
              <motion.div variants={fadeIn} className="bg-white/[0.02] border border-white/[0.05] p-6 md:p-10 lg:p-12 rounded-[2.5rem] flex flex-col relative group transition-all duration-700 hover:border-white/[0.1] hover:bg-white/[0.03] backdrop-blur-3xl shadow-2xl">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
                <div className="relative z-10 flex-grow flex flex-col">
                  <div className="text-neutral-400 font-mono text-sm font-bold uppercase tracking-[0.3em] mb-6">Starter</div>
                  <div className="text-2xl font-semibold text-white mb-6 tracking-tight leading-tight">Essential tools for content creation</div>
                  <div className="text-6xl font-bold text-white tracking-tighter mb-12 leading-none">$19<span className="text-xl text-neutral-500 font-normal tracking-normal ml-2">/mo</span></div>
                  <div className="h-px w-full bg-white/[0.05] mb-12" />
                  <ul className="space-y-6 mb-12 flex-grow">
                    <li className="flex items-start gap-4"><i className={`fi fi-sr-check flex items-center justify-center ${"w-6 h-6 text-neutral-600 mt-0.5 flex-shrink-0"}`}></i> <span className="text-xl text-neutral-300 font-normal leading-relaxed">30 Ideas / Month</span></li>
                    <li className="flex items-start gap-4"><i className={`fi fi-sr-check flex items-center justify-center ${"w-6 h-6 text-neutral-600 mt-0.5 flex-shrink-0"}`}></i> <span className="text-xl text-neutral-300 font-normal leading-relaxed">Basic Text Posts</span></li>
                    <li className="flex items-start gap-4"><i className={`fi fi-sr-check flex items-center justify-center ${"w-6 h-6 text-neutral-600 mt-0.5 flex-shrink-0"}`}></i> <span className="text-xl text-neutral-300 font-normal leading-relaxed">Manual Scheduling</span></li>
                  </ul>
                  <button className="w-full py-6 rounded-2xl bg-white/[0.05] border border-white/20 text-white text-xl font-bold hover:bg-white/[0.08] transition-all duration-300 mt-auto hover:-translate-y-1">Initialize Starter Protocol</button>
                </div>
              </motion.div>

              {/* Plan 2: Creator (Popular) */}
              <motion.div variants={fadeIn} className="bg-[#0A0710] border border-violet-500/40 p-6 md:p-10 lg:p-12 rounded-[2.5rem] flex flex-col relative shadow-[0_30px_100px_rgba(139,92,246,0.25)] text-white group transition-all duration-700 hover:border-violet-500/60 z-20 scale-100 lg:scale-[1.05] backdrop-blur-3xl">
                {/* Popular Badge */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-violet-600 px-6 py-2.5 rounded-full text-white text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(139,92,246,0.5)] z-30 flex items-center gap-2">
                  <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-4 h-4 fill-white"}`}  ></i> Popular Choice
                </div>

                {/* Internal Glows */}
                <div className="absolute inset-0 bg-gradient-to-b from-violet-600/10 via-transparent to-transparent rounded-[2.5rem] pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />

                <div className="relative z-10 flex-grow flex flex-col pt-4">
                  <div className="text-violet-400 font-mono text-sm font-bold uppercase tracking-[0.3em] mb-6">Creator</div>
                  <div className="text-2xl font-bold mb-6 text-white tracking-tight leading-tight">Power up your personal brand</div>
                  <div className="text-6xl font-bold mb-12 tracking-tighter text-white leading-none">$39<span className="text-xl text-violet-400/50 font-normal tracking-normal ml-2">/mo</span></div>
                  <div className="h-px w-full bg-violet-500/20 mb-12" />
                  <ul className="space-y-6 mb-12 flex-grow">
                    <li className="flex items-start gap-4"><i className={`fi fi-sr-check flex items-center justify-center ${"w-6 h-6 text-violet-400 mt-0.5 flex-shrink-0"}`}></i> <span className="text-xl font-bold text-white tracking-tight">Unlimited Ideas</span></li>
                    <li className="flex items-start gap-4"><i className={`fi fi-sr-check flex items-center justify-center ${"w-6 h-6 text-violet-400 mt-0.5 flex-shrink-0"}`}></i> <span className="text-xl font-bold text-white tracking-tight">2 Carousels / Week</span></li>
                    <li className="flex items-start gap-4"><i className={`fi fi-sr-check flex items-center justify-center ${"w-6 h-6 text-violet-400 mt-0.5 flex-shrink-0"}`}></i> <span className="text-xl font-bold text-white tracking-tight">Faceless AI Visuals</span></li>
                    <li className="flex items-start gap-4"><i className={`fi fi-sr-check flex items-center justify-center ${"w-6 h-6 text-violet-400 mt-0.5 flex-shrink-0"}`}></i> <span className="text-xl font-bold text-white tracking-tight">Priority Support</span></li>
                  </ul>
                  <button className="relative w-full py-6 rounded-2xl bg-white text-black text-xl font-black hover:bg-neutral-100 transition-all duration-300 mt-auto shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:-translate-y-1">
                    Initialize Creator Protocol
                  </button>
                </div>
              </motion.div>

              {/* Plan 3: Authority */}
              <motion.div variants={fadeIn} className="bg-white/[0.02] border border-white/[0.05] p-6 md:p-10 lg:p-12 rounded-[2.5rem] flex flex-col relative group transition-all duration-700 hover:border-white/[0.1] hover:bg-white/[0.03] backdrop-blur-3xl shadow-2xl">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
                <div className="relative z-10 flex-grow flex flex-col">
                  <div className="text-neutral-400 font-mono text-sm font-bold uppercase tracking-[0.3em] mb-6">Authority</div>
                  <div className="text-2xl font-semibold text-white mb-6 tracking-tight leading-tight">Complete market dominance</div>
                  <div className="text-6xl font-bold text-white tracking-tighter mb-12 leading-none">$49<span className="text-xl text-neutral-500 font-normal tracking-normal ml-2">/mo</span></div>
                  <div className="h-px w-full bg-white/[0.05] mb-12" />
                  <ul className="space-y-6 mb-12 flex-grow">
                    <li className="flex items-start gap-4"><i className={`fi fi-sr-check flex items-center justify-center ${"w-6 h-6 text-neutral-400 mt-0.5 flex-shrink-0"}`}></i> <span className="text-xl text-neutral-300 font-normal leading-relaxed">Everything in Creator</span></li>
                    <li className="flex items-start gap-4"><i className={`fi fi-sr-check flex items-center justify-center ${"w-6 h-6 text-neutral-400 mt-0.5 flex-shrink-0"}`}></i> <span className="text-xl text-neutral-300 font-normal leading-relaxed">AI Face Clone Integration</span></li>
                    <li className="flex items-start gap-4"><i className={`fi fi-sr-check flex items-center justify-center ${"w-6 h-6 text-neutral-400 mt-0.5 flex-shrink-0"}`}></i> <span className="text-xl text-neutral-300 font-normal leading-relaxed">NewsJacking Engine</span></li>
                  </ul>
                  <button className="w-full py-6 rounded-2xl bg-white/[0.05] border border-white/20 text-white text-xl font-bold hover:bg-white/[0.08] transition-all duration-300 mt-auto hover:-translate-y-1">Initialize Authority Protocol</button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* 
          ============================================================
          SECTION 12: FINAL CTA
          ============================================================
        */}
        <section className="py-[var(--section-py)] px-8 sm:px-12 relative overflow-hidden">
          {/* Horizon Mask */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent z-10" />


          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-900/5 to-transparent pointer-events-none" />
          <div className="max-w-[1400px] mx-auto relative z-10">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="flex flex-col items-center text-center">
              <motion.div variants={fadeIn} className="w-20 h-20 rounded-[2rem] bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-12 shadow-2xl backdrop-blur-3xl">
                <i className={`fi fi-sr-command flex items-center justify-center ${"w-10 h-10 text-white opacity-80"}`}  ></i>
              </motion.div>

              <motion.h2 variants={fadeIn} className="text-4xl md:text-5xl lg:text-7xl font-semibold tracking-tight mb-8 md:mb-12 leading-[1.1] md:leading-[1.0] text-reveal">
                Ready to save time <br className="hidden md:block" /> and grow?
              </motion.h2>

              <motion.p variants={fadeIn} className="text-neutral-200 font-normal text-xl md:text-3xl mb-16 md:mb-24 max-w-2xl mx-auto tracking-tight leading-relaxed">
                Join founders who are saving 15+ hours a week and building massive audiences on autopilot.
              </motion.p>

              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
                <button onClick={() => router.push('/signup')} className="w-full sm:w-auto relative group px-8 py-5 md:px-16 md:py-7 rounded-full bg-white text-black text-lg font-bold transition-all hover:scale-[1.05] shadow-white/20 shadow-2xl">
                  <span className="relative z-10">Start Saving Time</span>
                </button>
                <button className="w-full sm:w-auto px-8 py-5 md:px-12 md:py-7 rounded-full bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.05] text-white font-medium transition-all backdrop-blur-xl text-lg font-semibold">
                  See How It Works
                </button>
              </div>

              <motion.div variants={fadeIn} className="mt-24 text-base text-neutral-500 font-bold tracking-[0.4em] uppercase opacity-60">
                No credit card required for 7-day trial.
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="px-8 sm:px-12 py-12 relative z-10">
          {/* Horizon Mask */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent z-10" />


          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8">
            <div className="flex items-center gap-4 text-white opacity-90">
              <div className="w-10 h-10 rounded-lg bg-white/[0.03] flex items-center justify-center border border-white/10 backdrop-blur-md">
                <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-5 h-5 text-violet-400"}`}  ></i>
              </div>
              <span className="font-bold text-xl tracking-tight">Influuc © 2026</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-10 text-base md:text-lg font-bold text-neutral-400">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
            </div>
          </div>
        </footer>

      </main>
    </div >
  );
}
