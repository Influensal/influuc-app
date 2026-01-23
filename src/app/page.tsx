'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Mic, CalendarX, Mail } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[var(--background)] relative overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 p-6 flex items-center justify-between max-w-7xl mx-auto z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--foreground)] flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg tracking-tight">Influuc</span>
        </div>
        <button
          onClick={() => router.push('/login')}
          className="px-6 py-2.5 text-sm font-medium rounded-full border border-[var(--border)] hover:bg-[var(--card)] transition-colors"
        >
          Sign In
        </button>
      </nav>

      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-blue-500/10 via-purple-500/10 to-transparent blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6 max-w-5xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] shadow-sm mb-8 hover:border-[var(--primary)] transition-colors cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary)]"></span>
            </span>
            <span className="text-sm font-medium text-[var(--foreground-secondary)]">Now in Early Access</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-[1.1] tracking-tight text-[var(--foreground)]">
            Content, decided for you. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Every single week.</span>
          </h1>

          <p className="text-xl text-[var(--foreground-secondary)] mb-12 max-w-2xl mx-auto leading-relaxed">
            A decision engine for founder content. No planning. No brainstorming.
            No calendar management. Just show up, post, and leave.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => router.push('/signup')}
              className="group relative px-8 py-4 text-base font-semibold rounded-full bg-[var(--foreground)] text-[var(--background)] hover:scale-105 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="px-8 py-4 text-base font-semibold rounded-full text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--card)] transition-colors"
            >
              View Demo
            </button>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 text-left"
        >
          {[
            {
              title: 'Sunday Delivery',
              desc: 'Get your week\'s content every Sunday, ready to post.',
              icon: Mail
            },
            {
              title: 'Your Voice',
              desc: 'AI learns your unique writing style from your past posts.',
              icon: Mic
            },
            {
              title: 'Zero Planning',
              desc: 'No brainstorming, no calendars, no strategy sessions.',
              icon: CalendarX
            },
          ].map((feature, i) => (
            <div key={feature.title} className="p-8 rounded-[2rem] bg-[var(--card)] shadow-[var(--shadow)] border border-[var(--border)] hover:shadow-[var(--shadow-lg)] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[var(--background-secondary)] flex items-center justify-center mb-6 text-[var(--foreground)]">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-3">{feature.title}</h3>
              <p className="text-[var(--foreground-secondary)] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
