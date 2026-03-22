'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { ArticleCard, NewsArticle } from '@/components/dashboard/newsjacking/ArticleCard';
import { NewsjackingGenerator } from '@/components/dashboard/newsjacking/NewsjackingGenerator';
import { useAuth } from '@/contexts';
import { FeatureLock } from '@/components/dashboard/FeatureLock';

export default function NewsjackingPage() {
    const { activeProfile, isLoading: isAuthLoading, setActiveProfile } = useAuth();
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
    const [startIndex, setStartIndex] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [isLocalHealing, setIsLocalHealing] = useState(false);
    const fetchIdRef = useRef(0);
    const lastFetchedTopicRef = useRef<string | null>(null);

    // Auto-Heal: If AuthContext fails to provide activeProfile, try fixing it ourselves
    useEffect(() => {
        if (!isAuthLoading && !activeProfile && !isLocalHealing) {
            const attemptHeal = async () => {
                setIsLocalHealing(true);
                try {
                    const { createClient } = await import('@/utils/supabase/client');
                    const supabase = createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        console.log('[Newsjacking] Attempting direct profile fetch auto-heal for user', user.id);
                        const { data } = await supabase
                            .from('founder_profiles')
                            .select('*')
                            .eq('account_id', user.id)
                            .order('created_at', { ascending: true })
                            .limit(1);

                        if (data && data.length > 0) {
                            const dbProfile = data[0];
                            setActiveProfile({
                                ...dbProfile,
                                awaitingGoalInput: dbProfile.awaiting_goal_input || false,
                                weekNumber: dbProfile.week_number || 1,
                                subscriptionTier: dbProfile.subscription_tier || 'starter',
                            });
                        } else {
                            console.warn('[Newsjacking] Verified user has absolutely no profile in DB');
                        }
                    }
                } catch (e) {
                    console.error('[Newsjacking] Auto-heal failed', e);
                } finally {
                    setIsLocalHealing(false);
                }
            };
            attemptHeal();
        }
    }, [isAuthLoading, activeProfile]);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!activeProfile) return;

        const fetchRecommendedNews = async () => {
            const currentFetchId = ++fetchIdRef.current;
            setIsLoading(true);
            setError(null);

            try {
                let searchQuery = '';
                const industry = activeProfile.industry || '';
                const description = (activeProfile.business_description || activeProfile.context_data?.aboutYou || '').toLowerCase();
                const topics = activeProfile.topics || [];

                // 1. Start with the core industry
                searchQuery = industry;

                // 2. Smart Expansion: If industry is too broad (Agency/Services/Consulting) or generic,
                // scan the context for high-signal keywords.
                const needsExpansion = !industry || 
                    industry.toLowerCase().includes('agency') || 
                    industry.toLowerCase().includes('services') || 
                    industry.toLowerCase().includes('consulting') ||
                    industry === 'Modern Operator';

                if (needsExpansion) {
                    const signals = [];
                    if (description.includes('saas')) signals.push('SaaS');
                    if (description.includes(' ai ') || description.includes('artificial intelligence') || description.includes('generative ai')) signals.push('AI');
                    if (description.includes('software')) signals.push('Software');
                    if (description.includes('startup')) signals.push('Startup');
                    if (description.includes('marketing')) signals.push('Marketing');

                    if (signals.length > 0) {
                        searchQuery = (searchQuery ? `${searchQuery} ` : '') + signals.join(' ');
                    }
                }

                // 3. Fallback to first topic if still empty
                if (!searchQuery && topics.length > 0) {
                    searchQuery = topics[0];
                }

                // 4. Final Failsafe
                if (!searchQuery) searchQuery = 'Tech';

                console.log(`[Newsjacking] Engineered Smart Query: "${searchQuery}"`);

                if (lastFetchedTopicRef.current === searchQuery && articles.length > 0) {
                    setIsLoading(false);
                    return;
                }

                const url = `/api/newsjacking/search?topic=${encodeURIComponent(searchQuery)}`;
                const res = await fetch(url, { method: 'GET', cache: 'no-store' });

                if (currentFetchId !== fetchIdRef.current) return; 

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || `Server Error ${res.status}`);
                }

                const data = await res.json();
                if (currentFetchId !== fetchIdRef.current) return;

                if (data.results) {
                    setArticles(data.results);
                    lastFetchedTopicRef.current = searchQuery;
                }
            } catch (err: any) {
                if (currentFetchId === fetchIdRef.current) {
                    setError(err.message || "Failed to load news");
                }
            } finally {
                if (currentFetchId === fetchIdRef.current) {
                    setIsLoading(false);
                }
            }
        };

        fetchRecommendedNews();
    }, [activeProfile?.id, isAuthLoading]);

    const handleSpin = () => {
        setIsSpinning(true);
        setTimeout(() => {
            setStartIndex((prev) => (prev + 3) % articles.length);
            setIsSpinning(false);
        }, 500);
    };

    const visibleArticles = articles.slice(startIndex, startIndex + 3);

    return (
        <FeatureLock feature="newsjacking">
            <div className="h-[calc(100vh-40px)] overflow-hidden bg-[#030208] text-white selection:bg-[var(--primary)] selection:text-white flex flex-col p-10 font-sans">
                {/* Subtle Lighting */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[20%] bg-[var(--primary)] opacity-[0.03] blur-[150px]"></div>
                </div>

                {/* Header: Refined & Sophisticated */}
                <header className="relative z-10 flex items-end justify-between mb-12">
                    <div>
                        <h1 className="text-3xl font-medium tracking-tight mb-2">Newsjacking</h1>
                        <p className="text-sm text-white/40 font-medium">
                            Curation based on <span className="text-white/60">{activeProfile?.industry || 'Modern Operator'}</span> targets.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-[10px] font-bold tracking-[0.1em] text-white/20 uppercase mb-0.5">VAULT STATUS</div>
                            <div className="text-xs font-semibold text-white/60">{articles.length} Aggregated Insights</div>
                        </div>
                    </div>
                </header>

                {/* Main Viewport */}
                <main className="relative flex-1 flex flex-col min-h-0">
                    {isAuthLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-6">
                            <div className="w-8 h-8 border-2 border-white/5 border-t-[var(--primary)] rounded-full animate-spin"></div>
                            <p className="text-[10px] font-bold tracking-widest text-white/20 uppercase">Initialising Engine...</p>
                        </div>
                    ) : !activeProfile ? (
                        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto text-center gap-6">
                            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                                <i className="fi fi-sr-user text-white/20 text-xl"></i>
                            </div>
                            <h3 className="text-xl font-bold tracking-tight uppercase">Profile Required</h3>
                            <p className="text-sm text-white/40 leading-relaxed">
                                We couldn't find an active profile for your account. Please complete your onboarding or select a profile to continue.
                            </p>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={async () => {
                                        setIsLoading(true);
                                        const { createClient } = await import('@/utils/supabase/client');
                                        const supabase = createClient();
                                        const { data: { user } } = await supabase.auth.getUser();
                                        if (user) {
                                            const { data } = await supabase.from('founder_profiles').select('*').eq('account_id', user.id).limit(1);
                                            if (data && data[0]) setActiveProfile(data[0]);
                                        }
                                        window.location.reload();
                                    }} 
                                    className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-full text-xs font-bold hover:bg-white/10 transition-all"
                                >
                                    Force Sync Session
                                </button>
                                <button onClick={() => window.location.href = '/onboarding'} className="px-8 py-3 bg-white text-black rounded-full text-xs font-bold hover:scale-105 transition-all">
                                    Complete Onboarding
                                </button>
                            </div>
                        </div>
                    ) : isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-6">
                            <div className="w-8 h-8 border-2 border-white/5 border-t-[var(--primary)] rounded-full animate-spin"></div>
                            <p className="text-[10px] font-bold tracking-widest text-white/20 uppercase">Analyzing Pipeline...</p>
                        </div>
                    ) : error ? (
                        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto text-center">
                            <h3 className="text-xl font-bold mb-4">Uplink Interrupted</h3>
                            <p className="text-sm text-white/40 mb-8 leading-relaxed font-medium">{error}</p>
                            <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold hover:bg-white/10 transition-all">Re-establish Connection</button>
                        </div>
                    ) : articles.length > 0 ? (
                        <div className="flex-1 flex flex-col min-h-0">
                            {/* Article Grid */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8 min-h-0">
                                <AnimatePresence mode="wait">
                                    {visibleArticles.map((article, i) => (
                                        <motion.div
                                            key={`${startIndex}-${i}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                                            transition={{ duration: 0.4, delay: i * 0.05 }}
                                            className="h-full min-h-0"
                                        >
                                            <ArticleCard
                                                article={article}
                                                onSpinStory={(a) => setSelectedArticle(a)}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Minimal Navigation Bar */}
                            <footer className="mt-12 flex items-center justify-center">
                                <button
                                    onClick={handleSpin}
                                    disabled={isSpinning || articles.length <= 3}
                                    className={`
                                        group relative flex items-center gap-4 px-8 py-3.5 rounded-full font-bold text-xs tracking-wide transition-all duration-300
                                        ${isSpinning ? 'opacity-50' : 'hover:bg-white hover:text-black'}
                                        bg-white/5 border border-white/10 text-white
                                    `}
                                >
                                    <span className={isSpinning ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}>
                                        <i className="fi fi-sr-rotate-right"></i>
                                    </span>
                                    {isSpinning ? 'Refreshing...' : 'Spin for more insights'}
                                </button>
                            </footer>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <h3 className="text-2xl font-bold mb-4 opacity-20">Scanning industry signals...</h3>
                            <p className="text-white/20 text-sm max-w-xs mx-auto">The news vault is currently synchronizing. Check back shortly for curated industry gems.</p>
                        </div>
                    )}
                </main>

                <NewsjackingGenerator
                    article={selectedArticle}
                    onClose={() => setSelectedArticle(null)}
                />
            </div>
        </FeatureLock>
    );
}
