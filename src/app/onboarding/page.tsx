'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

import { extractTextFromPdf } from '@/utils/pdf';
import MindBlowingLoader from '@/components/MindBlowingLoader';
import StepPayment from '@/components/onboarding/StepPayment';
import StepVisualFork from '@/components/onboarding/StepVisualFork';


// Types
interface OnboardingData {
    // Basics
    name: string;
    role: string;
    companyName: string;
    companyWebsite: string;

    // Strategy
    platforms: {
        x: boolean;
        linkedin: boolean;
    };
    connections: {
        x: boolean;
        linkedin: boolean;
    };
    industry: string;
    targetAudience: string;
    // Context Profile
    aboutYou: string;
    personalContext: {
        id: string;
        type: 'url' | 'text';
        label: string;
        value: string;
    }[];
    productContext: {
        id: string;
        type: 'url' | 'text';
        label: string;
        value: string;
    }[];

    contentGoal: string;
    topics: string[]; // Legacy — kept for backward compat

    // Strategic Foundation (NEW)
    archetypeDiscovery: {
        q1: string; // "what feels most natural"
        q2: string; // "what do people come to you for"
        q3: string; // "what do you hate seeing"
    };
    positioningStatement: string;
    povStatement: string;
    identityGap: string;
    competitors: string[]; // 3 names/URLs
    contentPillars: {
        name: string;
        description: string;
        job: 'authority' | 'relatability' | 'proof';
    }[];

    // Style (archetype is now auto-detected, kept for legacy)
    archetype: 'builder' | 'teacher' | 'contrarian' | 'executive' | 'custom';
    tone: {
        formality: 'professional' | 'casual';
        boldness: 'bold' | 'measured';
        style: 'educational' | 'conversational';
        approach: 'story-driven' | 'data-driven';
    };
    voiceSamples: {
        content: string;
        type: 'paste' | 'upload' | 'voicenote' | 'url';
    }[];

    // Connect
    autoPublish: boolean;

    // Subscription & Visuals
    subscriptionTier?: 'starter' | 'creator' | 'authority';
    visualMode?: 'none' | 'faceless' | 'clone';
    style_faceless?: string;
    style_carousel?: string;
    style_face?: string;
    avatar_urls?: string[];

    // Brand Kit
    brandColors?: {
        primary: string;
        background: string;
        accent: string;
    };
}

const initialData: OnboardingData = {
    name: '',
    role: '',
    companyName: '',
    companyWebsite: '',
    industry: '',

    platforms: { x: true, linkedin: true },
    connections: { x: false, linkedin: false },
    targetAudience: '',
    aboutYou: '',
    personalContext: [],
    productContext: [],

    contentGoal: '',
    topics: [],

    // Strategic Foundation (NEW)
    archetypeDiscovery: { q1: '', q2: '', q3: '' },
    positioningStatement: '',
    povStatement: '',
    identityGap: '',
    competitors: ['', '', ''],
    contentPillars: [],

    archetype: 'builder',
    tone: {
        formality: 'professional',
        boldness: 'bold',
        style: 'educational',
        approach: 'story-driven',
    },
    voiceSamples: [],

    autoPublish: false,
    subscriptionTier: undefined,
    visualMode: 'none',
    style_faceless: undefined,
    style_carousel: undefined,
    style_face: undefined,
    avatar_urls: [],

    brandColors: {
        primary: '#10B981',
        background: '#09090B',
        accent: '#F59E0B',
    }
};

// Step Components
const steps = [
    { id: 1, title: 'The Basics', subtitle: 'Who are you?', icon: 'fi-sr-user' },
    { id: 2, title: 'Industry', subtitle: 'Your Niche', icon: 'fi-sr-building' },
    { id: 3, title: 'Context', subtitle: 'About Business', icon: 'fi-sr-briefcase' },
    { id: 4, title: 'Goals', subtitle: 'Success metric', icon: 'fi-sr-bullseye' },
    { id: 5, title: 'Discovery', subtitle: 'Your persona', icon: 'fi-sr-search' },
    { id: 6, title: 'Voice', subtitle: 'Writing style', icon: 'fi-sr-document' },
    { id: 7, title: 'Brand', subtitle: 'Colors', icon: 'fi-sr-paint-roller' },
    { id: 8, title: 'Connect', subtitle: 'Link accounts', icon: 'fi-sr-link' },
    { id: 9, title: 'Plan', subtitle: 'Choose Tier', icon: 'fi-sr-check' },
    { id: 10, title: 'Launch', subtitle: 'Go live', icon: 'fi-sr-magic-wand' },
];

// Animation variants
const pageVariants = {
    initial: { opacity: 0, x: 50, scale: 0.98 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -50, scale: 0.98 },
};

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
};

export default function OnboardingPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [data, setData] = useState<OnboardingData>(initialData);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRestoringSession, setIsRestoringSession] = useState(true); // New loading state
    const [error, setError] = useState<string | null>(null);

    // Initial Load & URL Params Check
    useEffect(() => {
        // GLOBAL FAILSAFE: Force UI to render after 4 seconds no matter what
        const failSafeTimer = setTimeout(() => {
            console.warn('[Onboarding] Failsafe triggered: Force-hiding loader');
            setIsRestoringSession(false);
        }, 4000);

        const init = async () => {
            let loadedData = initialData;
            const params = new URLSearchParams(window.location.search);

            // 1. ROBUST AUTH CHECK WITH TIMEOUT
            // Don't let a slow network request block the entire UI
            let user = null;
            try {
                const supabase = createClient();
                const timeoutDetails = { timedOut: false };
                const authPromise = supabase.auth.getUser();
                const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) => {
                    setTimeout(() => {
                        timeoutDetails.timedOut = true;
                        resolve({ data: { user: null } });
                    }, 2000); // 2s max for auth
                });

                const { data } = await Promise.race([authPromise, timeoutPromise]);
                user = data.user;
                if (timeoutDetails.timedOut) console.warn('[Onboarding] Auth check timed out');
            } catch (authErr) {
                console.warn('[Onboarding] Auth check failed/skipped', authErr);
            }

            const isRedirect = params.get('connect') === 'success' || !!params.get('error') || !!params.get('payment');

            // 2. ROBUST DATA LOADING (Swallow all errors, fallback to initialData)
            try {
                if (isRedirect) {
                    const tempData = localStorage.getItem('onboarding_temp_data');
                    const savedData = user ? localStorage.getItem(`onboarding_data_${user?.id}`) : null;

                    if (tempData) {
                        try { loadedData = JSON.parse(tempData); } catch (e) { console.error('Parsed temp error', e); }
                    } else if (savedData) {
                        try { loadedData = JSON.parse(savedData); } catch (e) { console.error('Parsed saved error', e); }
                    }
                } else if (user) {
                    const savedData = localStorage.getItem(`onboarding_data_${user.id}`);
                    if (savedData) {
                        try { loadedData = JSON.parse(savedData); } catch (e) { }
                    } else {
                        // Try temp as fallback
                        const tempData = localStorage.getItem('onboarding_temp_data');
                        if (tempData) {
                            try { loadedData = JSON.parse(tempData); } catch (e) { }
                        }
                    }
                }

                // Apply platform connection success state to data
                if (params.get('connect') === 'success') {
                    const platform = params.get('platform');
                    if (platform === 'x' || platform === 'linkedin') {
                        loadedData = {
                            ...loadedData,
                            connections: {
                                ...loadedData.connections,
                                [platform]: true
                            }
                        };
                    }
                }
            } catch (dataErr) {
                console.error('[Onboarding] Critical data load error', dataErr);
                // Keep loadedData as initialData
            }

            // 3. FAST TRACK MOCK DATA (If data needed for testing)
            if (params.get('test_mode') === 'true') {
                console.log('⚡ FAST TRACK ACTIVE');
                loadedData = {
                    ...initialData,
                    name: "Test User",
                    role: "Founder",
                    companyName: "Test Co",
                    companyWebsite: "https://example.com",
                    platforms: { x: true, linkedin: true },
                    connections: { x: true, linkedin: true },
                    industry: "SaaS",
                    targetAudience: "Founders",
                    aboutYou: "Building cool stuff",
                    contentGoal: "Growth",
                    topics: ["Tech", "Business"],
                    archetype: "builder",
                    tone: initialData.tone
                };
            }

            // 4. SET DATA
            setData(loadedData);

            // 5. SET STEP - THE CRITICAL PART
            // We do this LAST to ensure data is ready, but OUTSIDE any try/catch blocks that might fail.
            if (params.get('payment') === 'success') {
                console.log('💰 Payment Success Detected -> Forcing Step 10');
                setCurrentStep(10);
            } else if (params.get('payment') === 'cancelled') {
                setCurrentStep(9);
                setError('Payment was cancelled.');
            } else if (params.get('test_mode') === 'true') {
                setCurrentStep(9);
            } else if (isRedirect && !params.get('payment')) {
                // Auth/Connect redirect
                setCurrentStep(8);
            } else {
                // Default normal load - Restore step from database if available
                if (user) {
                    try {
                        const supabase = createClient();
                        const { data: profile } = await supabase
                            .from('founder_profiles')
                            .select('onboarding_step, onboarding_status')
                            .eq('account_id', user.id)
                            .single();

                        if (profile?.onboarding_step && profile.onboarding_step > 0) {
                            console.log(`[Onboarding] Restoring step ${profile.onboarding_step} from DB`);
                            setCurrentStep(profile.onboarding_step);
                        }

                        // If already completed, redirect to dashboard
                        if (profile?.onboarding_status === 'complete') {
                            console.log('[Onboarding] User already completed onboarding, redirecting...');
                            router.push('/dashboard');
                            return;
                        }
                    } catch (e) {
                        console.warn('[Onboarding] Could not restore step from DB:', e);
                    }
                }
            }

            setIsRestoringSession(false);
            clearTimeout(failSafeTimer); // Clear failsafe if we finish normally
        };

        // Run immediately
        init();
    }, []);

    // Persistence on Change
    useEffect(() => {
        const save = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            const json = JSON.stringify(data);

            if (json === JSON.stringify(initialData)) return;

            // Always save to temp (backup for redirects)
            localStorage.setItem('onboarding_temp_data', json);

            if (user) {
                localStorage.setItem(`onboarding_data_${user.id}`, json);
            }
        };
        save();
    }, [data]);

    // Save current step to database for persistence across refreshes/redirects
    useEffect(() => {
        const saveStep = async () => {
            // Don't save if still initializing or on step 1 (default)
            if (isRestoringSession || currentStep <= 1) return;

            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    await supabase
                        .from('founder_profiles')
                        .update({
                            onboarding_step: currentStep,
                            updated_at: new Date().toISOString()
                        })
                        .eq('account_id', user.id);

                    console.log(`[Onboarding] Saved step ${currentStep} to DB`);
                }
            } catch (e) {
                console.warn('[Onboarding] Could not save step to DB:', e);
            }
        };

        saveStep();
    }, [currentStep, isRestoringSession]);






    const handleSignOut = async () => {
        try {
            const supabase = createClient();

            // Clear local storage to prevent data leakage to other accounts
            localStorage.removeItem('onboarding_temp_data');

            // Also clear any user-specific keys if possible, or just all onboarding keys
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('onboarding_data_')) {
                    localStorage.removeItem(key);
                }
            });
            const { data: { user } } = await supabase.auth.getUser();

            // Clear all local storage
            localStorage.removeItem('onboarding_temp_data');
            if (user) {
                localStorage.removeItem(`onboarding_data_${user.id}`);
            }

            await supabase.auth.signOut();
            console.log('[Onboarding] Signed out successfully');
        } catch (error) {
            console.error('[Onboarding] Sign out error:', error);
        } finally {
            // Force hard redirect to clear state
            window.location.href = '/signup';
        }
    };

    const updateData = (updates: Partial<OnboardingData>) => {
        setData(prev => ({ ...prev, ...updates }));
    };


    const nextStep = () => {
        if (currentStep < 10) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1: // Basics
                return data.name !== '' && data.role !== '' && data.companyName !== '';
            case 2: // Industry & Audience
                return data.industry !== '' && data.targetAudience !== '';
            case 3: // Context
                return data.aboutYou !== '';
            case 4: // Goals
                return data.contentGoal !== '';
            case 5: // Archetype Discovery
                return data.archetypeDiscovery.q1 !== '' && data.archetypeDiscovery.q2 !== '' && data.archetypeDiscovery.q3 !== '';
            case 6: // Voice
                return data.voiceSamples.length > 0;
            case 7: // Brand Colors
                return data.brandColors !== undefined && data.brandColors.primary !== '';
            case 8: // Connect
                return true;
            case 9: // Payment
                return true;
            case 10: // Launch
                return true;
            default:
                return true;
        }
    };

    const handleGenerate = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        setError(null);

        try {
            // Save the onboarding profile data and redirect to dashboard
            const profileResponse = await fetch('/api/onboarding/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!profileResponse.ok) {
                const errorData = await profileResponse.json();
                throw new Error(errorData.error || 'Failed to save profile');
            }

            const profileResult = await profileResponse.json();
            console.log('[Onboarding] Profile saved:', profileResult);

            // Redirect to dashboard
            router.push('/dashboard');
        } catch (err) {
            console.error('[Onboarding] Error:', err);
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
            setIsGenerating(false);
        }
    };

    // KEYBOARD NAVIGATION
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                // Ignore if in <a> or <button> (native behavior handles click)
                if (document.activeElement?.tagName === 'BUTTON' || document.activeElement?.tagName === 'A') return;

                // Stop inputs/textareas from doing their default 'Enter' behavior if we are navigating
                // But only if we can actually proceed (otherwise let them type)
                if (canProceed() && currentStep < 9) {
                    e.preventDefault();

                    if (currentStep === 8 && data.subscriptionTier === 'starter') {
                        handleGenerate();
                        return;
                    }
                    if (currentStep === 9) return;

                    nextStep();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStep, data]); // removed functions from dep array to avoid complexity, they satisfy closure via re-render binding





    return (
        <div className="h-screen overflow-hidden bg-[var(--background)] flex">
            <AnimatePresence>
                {isGenerating && <MindBlowingLoader />}
            </AnimatePresence>
            {/* Left side - Progress */}
            <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:flex w-80 bg-[var(--card)] border-r border-[var(--border)] flex-col p-8"
            >
                {/* Logo */}
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center">
                        <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-5 h-5 text-white"}`}  ></i>
                    </div>
                    <span className="text-xl font-bold">Influuc</span>
                </div>

                {/* Progress Steps */}
                <div className="flex-1">
                    <div className="space-y-2">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = currentStep === step.id;
                            const isCompleted = currentStep > step.id;

                            return (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`
                    flex items-center gap-4 p-3 rounded-xl transition-all duration-300
                    ${isActive ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/20' : 'border border-transparent'}
                    ${isCompleted ? 'opacity-60' : ''}
                  `}
                                >
                                    <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                    ${isActive ? 'bg-[var(--primary)] text-white' :
                                            isCompleted ? 'bg-[var(--success)] text-white' :
                                                'bg-[var(--background-secondary)]'}
                  `}>
                                        {isCompleted ? <i className={`fi fi-sr-check flex items-center justify-center ${"w-5 h-5"}`}  ></i> : <i className={`fi ${Icon} flex items-center justify-center w-5 h-5`}></i>}
                                    </div>
                                    <div>
                                        <p className={`font-medium ${isActive ? 'text-[var(--primary)]' : ''}`}>
                                            {step.title}
                                        </p>
                                        <p className="text-sm text-[var(--foreground-muted)]">{step.subtitle}</p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Help text & Logout */}
                <div className="flex items-center justify-between text-sm text-[var(--foreground-muted)] pt-6 border-t border-[var(--border)]">
                    <span>Takes about 3 minutes</span>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 hover:text-red-500 transition-colors"
                    >
                        <i className={`fi fi-sr-sign-out-alt flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                        Sign Out
                    </button>
                </div>
            </motion.div>

            {/* Right side - Content */}
            <div className="flex-1 flex flex-col">
                {/* Mobile header */}
                <div className="lg:hidden p-4 border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                            <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-4 h-4 text-white"}`}  ></i>
                        </div>
                        <span className="font-bold">Influuc</span>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="absolute right-4 top-4 p-2 text-[var(--foreground-muted)] hover:text-red-500"
                    >
                        <i className={`fi fi-sr-sign-out-alt flex items-center justify-center ${"w-5 h-5"}`}  ></i>
                    </button>
                    {/* Mobile progress */}
                    <div className="mt-4 flex gap-1">
                        {steps.map((step) => (
                            <div
                                key={step.id}
                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${currentStep >= step.id ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-4 lg:p-8 overflow-y-auto">
                    <div className={`w-full transition-all duration-500 ${currentStep === 9 ? 'max-w-4xl' : currentStep >= 7 ? 'max-w-6xl' : 'max-w-xl'}`}>
                        <AnimatePresence mode="wait">
                            {currentStep === 1 && (
                                <Step1Basics
                                    key="step1"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 2 && (
                                <Step3Industry
                                    key="step2"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 3 && (
                                <Step4Context
                                    key="step3"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 4 && (
                                <Step5Goals
                                    key="step4"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 5 && (
                                <StepArchetypeDiscovery
                                    key="step5"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 6 && (
                                <Step8Voice
                                    key="step6"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 7 && (
                                <StepBrandColors
                                    key="step7"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 8 && (
                                <Step9Connect
                                    key="step8"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 9 && (
                                <StepPayment
                                    key="step9"
                                    data={data}
                                    updateData={updateData}
                                    onNext={() => {
                                        if (data.subscriptionTier === 'starter') {
                                            handleGenerate();
                                        } else {
                                            nextStep();
                                        }
                                    }}
                                />
                            )}
                            {currentStep === 10 && (
                                <StepVisualFork
                                    key="step10"
                                    data={data}
                                    updateData={updateData}
                                    onComplete={handleGenerate}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Bottom navigation */}
                <div className="p-4 lg:p-4 border-t border-[var(--border)]">
                    <div className="max-w-2xl mx-auto flex items-center justify-between">
                        <button
                            onClick={prevStep}
                            disabled={currentStep === 1}
                            className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300
                ${currentStep === 1
                                    ? 'opacity-0 pointer-events-none'
                                    : 'hover:bg-[var(--background-secondary)]'}
              `}
                        >
                            <i className={`fi fi-sr-angle-left flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                            Back
                        </button>

                        {/* Show Continue button for steps 1-9 (Launch is now handled differently? No, Step 9 is Connect. Step 10 is Payment.) */}
                        {/* Actually, Step 9 (Connect) needs 'Continue' to go to Paywall. */}
                        {/* Step 10 (Payment) has internal selection buttons, but maybe hide main continue? */}
                        {/* Show Continue button for steps 1-8. Step 9 (Payment) and 10 (Visuals) have their own buttons. */}
                        {currentStep < 9 ? (
                            <button
                                onClick={nextStep}
                                disabled={!canProceed()}
                                className={`
                  flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all duration-300
                  ${canProceed()
                                        ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-lg shadow-[var(--primary)]/25'
                                        : 'bg-[var(--border)] text-[var(--foreground-muted)] cursor-not-allowed'}
                `}
                            >
                                Continue
                                <i className={`fi fi-sr-angle-right flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );

}

// Step 1: Basics (New)
// Step 1: Basics (New)
// Step 1: Basics (New)
function Step1Basics({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const roles = [
        "Founder / Co-Founder",
        "C-Suite (CEO, CTO, CMO)",
        "VP / Head of",
        "Director",
        "Manager",
        "Individual Contributor",
        "Freelancer / Consultant",
        "Other"
    ];

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }}>
            <motion.h1 className="text-2xl md:text-3xl font-bold mb-2">First things first.</motion.h1>
            <motion.p className="text-base text-[var(--foreground-secondary)] mb-6">What do we call you?</motion.p>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Your Name</label>
                    <input type="text" value={data.name} onChange={e => updateData({ name: e.target.value })} placeholder="e.g. Elon Musk" className="w-full p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all placeholder-[var(--foreground-muted)]/50" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Your Role</label>
                        <div className="relative">
                            <select
                                value={data.role}
                                onChange={e => updateData({ role: e.target.value })}
                                className="w-full p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all appearance-none cursor-pointer pr-10"
                            >
                                <option value="" disabled>Select your role</option>
                                {roles.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--foreground-muted)]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Company Name</label>
                        <input type="text" value={data.companyName} onChange={e => updateData({ companyName: e.target.value })} placeholder="e.g. SpaceX" className="w-full p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all placeholder-[var(--foreground-muted)]/50" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// Step 2: Platforms (Renamed from Step1Platforms)
function Step2Platforms({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const toggle = (p: 'x' | 'linkedin') => updateData({ platforms: { ...data.platforms, [p]: !data.platforms[p] } });
    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <h1 className="text-3xl font-bold mb-2">Where do you post?</h1>
            <div className="grid gap-3 mt-6">
                {['x', 'linkedin'].map(p => (
                    <div key={p} onClick={() => toggle(p as any)} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${data.platforms[p as 'x' | 'linkedin'] ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] hover:bg-[var(--card)]'}`}>
                        {p === 'x' ? <i className={`fi fi-brands-twitter flex items-center justify-center ${"w-6 h-6"}`}  ></i> : <i className={`fi fi-brands-linkedin flex items-center justify-center ${"w-6 h-6"}`}  ></i>}
                        <span className="font-bold capitalize">{p}</span>
                        <div className="ml-auto">{data.platforms[p as 'x' | 'linkedin'] && <i className={`fi fi-sr-check flex items-center justify-center ${"w-4 h-4 text-[var(--primary)]"}`}  ></i>}</div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

// Step 3: Strategy (Merged Context)
// Step 3: Strategy (Merged Context)
// Step 3: Strategy (Overhauled UI)
// Context Item Component (Inline for simplicity)
function ContextItem({
    item,
    onChange,
    onRemove
}: {
    item: { id: string, type: 'url' | 'text', label: string, value: string },
    onChange: (updates: any) => void,
    onRemove: () => void
}) {
    // Local state for the tab, initialize based on item type or default to 'url'
    // If the item has value but type mismatch, the user can switch tabs to see other input types if needed, 
    // but here we simplify: type drives the view.
    const [activeTab, setActiveTab] = useState<'url' | 'text' | 'file'>(item.type === 'url' ? 'url' : 'text');

    return (
        <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] group animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1 bg-[var(--background)] p-1 rounded-lg border border-[var(--border)]">
                    {(['url', 'text', 'file'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                // If switching to URL, set type to URL. If text/file, set type to text (file content becomes text)
                                onChange({ type: tab === 'url' ? 'url' : 'text' });
                            }}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-[var(--card)] shadow-sm text-[var(--foreground)]' : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'}`}
                        >
                            {tab === 'url' ? <i className={`fi fi-sr-globe flex items-center justify-center ${"w-3 h-3"}`}  ></i> : tab === 'text' ? <i className={`fi fi-sr-font flex items-center justify-center ${"w-3 h-3"}`}  ></i> : <i className={`fi fi-sr-upload flex items-center justify-center ${"w-3 h-3"}`}  ></i>}
                            {tab === 'url' ? 'Website' : tab === 'text' ? 'Text' : 'File'}
                        </button>
                    ))}
                </div>
                <button onClick={onRemove} className="text-[var(--foreground-muted)] hover:text-red-500 transition-colors p-1">
                    <i className={`fi fi-sr-cross-small flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                </button>
            </div>

            <div className="space-y-3">
                <input
                    type="text"
                    value={item.label}
                    onChange={(e) => onChange({ label: e.target.value })}
                    placeholder="Label (e.g. My Website, Company Bio)"
                    className="w-full bg-transparent border-none p-0 text-sm font-semibold placeholder-[var(--foreground-muted)] focus:ring-0"
                />

                {activeTab === 'url' && (
                    <div className="relative">
                        <i className={`fi fi-sr-link flex items-center justify-center ${"absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]"}`}  ></i>
                        <input
                            type="text"
                            value={item.value}
                            onChange={(e) => onChange({ value: e.target.value })}
                            placeholder="https://example.com"
                            className="w-full pl-10 pr-4 py-3 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none text-sm font-mono"
                        />
                    </div>
                )}

                {activeTab === 'text' && (
                    <textarea
                        value={item.value}
                        onChange={(e) => onChange({ value: e.target.value })}
                        placeholder="Paste text here..."
                        className="w-full h-24 p-3 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none text-sm resize-none"
                    />
                )}

                {activeTab === 'file' && (
                    <div className="relative border-2 border-dashed border-[var(--border)] rounded-lg p-6 text-center hover:bg-[var(--background-secondary)] transition-colors cursor-pointer group/file">
                        <div className="w-8 h-8 bg-[var(--background)] rounded-full flex items-center justify-center mx-auto mb-2 text-[var(--foreground-muted)]">
                            <i className={`fi fi-sr-upload flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                        </div>
                        <p className="text-xs text-[var(--foreground-muted)]">Click to upload PDF/TXT</p>
                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept=".pdf,.txt,.md"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                                        try {
                                            const text = await extractTextFromPdf(file);
                                            onChange({ value: text, type: 'text' });
                                            setActiveTab('text');
                                        } catch (e) { alert("Failed to parse PDF"); }
                                    } else {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            onChange({ value: ev.target?.result as string, type: 'text' });
                                            setActiveTab('text');
                                        };
                                        reader.readAsText(file);
                                    }
                                }
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Smart Defaults Configuration ---
const INDUSTRY_AUDIENCES: Record<string, string[]> = {
    'SaaS / Software': ['B2B Founders', 'Product Managers', 'Devs / CTOs', 'Investors', 'Enterprise Buyers'],
    'E-commerce / DTC': ['DTC Founders', 'Brand Owners', 'Marketers', 'Gen Z Consumers', 'Agency Owners'],
    'Fintech / Finance': ['CFOs', 'Traders', 'Retail Investors', 'Crypto Natvies', 'Financial Advisors'],
    'Healthcare / Biotech': ['Doctors', 'Patients', 'MedTech Investors', 'Health Conscious', 'Researchers'],
    'Agency / Services': ['B2B Clients', 'Marketing Directors', 'Small Business Owners', 'Freelancers'],
    'Creator Economy': ['YouTubers', 'Influencers', 'Course Creators', 'Aspiring Creators', 'Brands'],
    'AI / Machine Learning': ['AI Researchers', 'Tech Optimists', 'Developers', 'Startup Founders', 'VCs'],
    'Other': ['General Public', 'Professionals', 'Students', 'Hobbyists']
};

const INDUSTRY_TOPICS: Record<string, string[]> = {
    'SaaS / Software': ['SaaS Ops', 'Fundraising', 'Product-Led Growth', 'Go-To-Market', 'Engineering Culture'],
    'E-commerce / DTC': ['Brand Building', 'FB Ads', 'Retention', 'Supply Chain', 'Viral Marketing'],
    'Fintech / Finance': ['Investing', 'Personal Finance', 'Macroeconomics', 'Crypto/Web3', 'Wealth Management'],
    'Healthcare / Biotech': ['Longevity', 'Biohacking', 'Mental Health', 'Future of Medicine', 'Wellness'],
    'Agency / Services': ['Client Acquisition', 'Offer Creation', 'Team Scaling', 'Sales Processes', 'Remote Work'],
    'Creator Economy': ['Audience Building', 'Monetization', 'Video Editing', 'Storytelling', 'Personal Branding'],
    'AI / Machine Learning': ['LLMs', 'Automation', 'Future of Work', 'Prompt Engineering', 'AGI'],
    'Other': ['Productivity', 'Mindset', 'Career Growth', 'Leadership', 'Motivation']
};

const VOICE_PRESETS = [
    { id: 'visionary', label: 'The Visionary', desc: 'Like Steve Jobs. Crisp, inspiring, minimal.', text: "Here's to the crazy ones. The misfits. The rebels. We don't just build products; we craft experiences that change how people live. Simplicity is the ultimate sophistication." },
    { id: 'operator', label: 'The Operator', desc: 'Like Alex Hormozi. Direct, value-packed, no fluff.', text: "Stop trying to be smart. Be useful. Volume negates luck. If you want to make $1M, solve a $1M problem. Do the work everyone else is afraid to do." },
    { id: 'academic', label: 'The Professor', desc: 'Like Adam Grant. Insightful, research-backed, thoughtful.', text: "We often mistake confidence for competence. The data suggests that humility is the single biggest predictor of long-term leadership success. Rethink what you know." },
    { id: 'contrarian', label: 'The Contrarian', desc: 'Like Naval. Philosophical, high-signal, punchy.', text: "Play long term games with long term people. Specific knowledge cannot be taught, but it can be learned. Wealth is having assets that earn while you sleep." }
];

// Step 3: Industry & Audience (New)
function Step3Industry({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const industries = [
        { id: 'SaaS / Software', icon: '💻' },
        { id: 'E-commerce / DTC', icon: '🛍️' },
        { id: 'Fintech / Finance', icon: '💰' },
        { id: 'Healthcare / Biotech', icon: '🏥' },
        { id: 'Agency / Services', icon: '🏢' },
        { id: 'Creator Economy', icon: '🎨' },
        { id: 'AI / Machine Learning', icon: '🤖' },
        { id: 'Other', icon: '✨' }
    ];

    const audiences = data.industry ? INDUSTRY_AUDIENCES[data.industry] || [] : [];

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="max-w-2xl mx-auto pb-10">
            <div className="text-left mb-8">
                <h1 className="text-3xl font-bold mb-2">What's your niche?</h1>
                <p className="text-[var(--foreground-muted)]">We'll tailor content to this industry.</p>
            </div>

            <div className="space-y-8">
                <div className="space-y-2">
                    <label className="text-sm font-bold">Industry</label>
                    <div className="grid grid-cols-2 gap-2">
                        {industries.map((ind) => (
                            <button
                                key={ind.id}
                                onClick={() => updateData({ industry: ind.id })}
                                className={`
                                    flex items-center gap-2 p-3 rounded-lg border transition-all text-left
                                    ${data.industry === ind.id
                                        ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--foreground)]'
                                        : 'border-[var(--border)] hover:bg-[var(--card)] text-[var(--foreground-secondary)]'}
                                `}
                            >
                                <span className="text-lg">{ind.icon}</span>
                                <span className="font-medium text-xs sm:text-sm">{ind.id}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold">Target Audience</label>
                    <input
                        type="text"
                        value={data.targetAudience}
                        onChange={e => updateData({ targetAudience: e.target.value })}
                        placeholder="e.g. B2B SaaS founders"
                        className="w-full p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:border-[var(--primary)] outline-none"
                    />
                    {/* Smart Chips */}
                    {audiences.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {audiences.map(aud => (
                                <button
                                    key={aud}
                                    onClick={() => updateData({ targetAudience: aud })}
                                    className="text-xs px-3 py-1 rounded-full bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                                >
                                    + {aud}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ... Step 4, 5, 6 remain unchanged ...

// Step 7: Topics (Renamed from Step6Topics)
function Step7Topics({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const genericTopics = [
        'Leadership', 'Product', 'Fundraising', 'Growth', 'Sales',
        'Marketing', 'Engineering', 'Culture', 'Hiring', 'Strategy',
        'Remote Work', 'Startups', 'Productivity', 'Innovation'
    ];

    // Merge generic with industry specific
    const industryTopics = data.industry ? (INDUSTRY_TOPICS[data.industry] || []) : [];
    // Combine, unique, and prioritize industry ones
    const suggestedTopics = Array.from(new Set([...industryTopics, ...genericTopics]));

    const [customTopic, setCustomTopic] = useState('');

    const toggleTopic = (topic: string) => {
        if (data.topics.includes(topic)) {
            updateData({ topics: data.topics.filter(t => t !== topic) });
        } else {
            updateData({ topics: [...data.topics, topic] });
        }
    };

    const addCustomTopic = () => {
        if (customTopic.trim() && !data.topics.includes(customTopic.trim())) {
            updateData({ topics: [...data.topics, customTopic.trim()] });
            setCustomTopic('');
        }
    };


    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <h1 className="text-3xl font-bold mb-2">Content Pillars</h1>
            <p className="text-[var(--foreground-muted)] mb-6">What 3-5 topics will you own?</p>



            <div className="flex flex-wrap gap-2 mb-8 max-h-60 overflow-y-auto custom-scrollbar p-1">
                {suggestedTopics.map((topic) => {
                    const isIndustrySpecific = industryTopics.includes(topic);
                    return (
                        <button
                            key={topic}
                            onClick={() => toggleTopic(topic)}
                            className={`
                                px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border
                                ${data.topics.includes(topic)
                                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                                    : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--primary)]/50'}
                                ${isIndustrySpecific ? 'ring-1 ring-[var(--primary)]/20 shadow-sm' : ''}
                            `}
                        >
                            {isIndustrySpecific && <span className="mr-1 text-xs opacity-70">✨</span>}
                            {topic}
                        </button>
                    );
                })}
            </div>

            <div className="flex gap-3">
                <input
                    value={customTopic}
                    onChange={e => setCustomTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomTopic()}
                    placeholder="Add a custom topic..."
                    className="flex-1 p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:border-[var(--primary)] outline-none"
                />
                <button
                    onClick={addCustomTopic}
                    disabled={!customTopic.trim()}
                    className="px-6 rounded-xl bg-[var(--primary)] text-white font-medium disabled:opacity-50 hover:bg-[var(--primary-hover)] transition-colors"
                >
                    Add
                </button>
            </div>

            {data.topics.length > 0 && (
                <div className="mt-6">
                    <p className="text-sm text-[var(--foreground-muted)] mb-3">Selected ({data.topics.length})</p>
                    <div className="flex flex-wrap gap-2">
                        {data.topics.map((t) => (
                            <span key={t} className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-sm border border-[var(--primary)]/20">
                                {t}
                                <button onClick={() => toggleTopic(t)} className="hover:text-[var(--primary-hover)]">×</button>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// Step 8: Voice (Renamed from Step7Voice)
function Step8Voice({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const [pendingContent, setPendingContent] = useState('');
    const [inputType, setInputType] = useState<'text' | 'file' | 'preset'>('text');

    const addSample = (content: string, type: 'paste' | 'upload' = 'paste') => {
        if (!content.trim()) return;
        updateData({
            voiceSamples: [...data.voiceSamples, { content: content.trim(), type }]
        });
        setPendingContent('');
        setInputType('text');
    };

    const removeSample = (index: number) => {
        updateData({
            voiceSamples: data.voiceSamples.filter((_, i) => i !== index)
        });
    };

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="max-w-xl mx-auto">
            <div className="text-left mb-6">
                <h1 className="text-3xl font-bold mb-2">Teach us your Voice</h1>
                <p className="text-[var(--foreground-muted)] text-lg">Examples help AI sound just like you.</p>
            </div>

            <div className="space-y-6">
                {/* List of saved samples */}
                {data.voiceSamples.length > 0 && (
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-[var(--foreground-muted)]">Saved Posts ({data.voiceSamples.length})</label>
                        <div className="grid gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {data.voiceSamples.map((sample, i) => (
                                <div key={i} className="group relative p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider font-semibold">
                                            {`Sample ${i + 1}`}
                                        </p>
                                    </div>
                                    <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap line-clamp-3">{sample.content}</p>
                                    <button
                                        onClick={() => removeSample(i)}
                                        className="absolute top-2 right-2 p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remove post"
                                    >
                                        <i className={`fi fi-sr-trash flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div>
                    <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                        <button
                            onClick={() => setInputType('text')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${inputType === 'text' ? 'bg-[var(--primary)] text-white' : 'text-[var(--foreground-muted)] hover:bg-[var(--card)]'}`}
                        >
                            Paste Text
                        </button>
                        <button
                            onClick={() => setInputType('preset')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 ${inputType === 'preset' ? 'bg-[var(--primary)] text-white' : 'text-[var(--foreground-muted)] hover:bg-[var(--card)]'}`}
                        >
                            <i className={`fi fi-sr-bolt flex items-center justify-center ${"w-3 h-3"}`}  ></i> Presets
                        </button>
                        <button
                            onClick={() => setInputType('file')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${inputType === 'file' ? 'bg-[var(--primary)] text-white' : 'text-[var(--foreground-muted)] hover:bg-[var(--card)]'}`}
                        >
                            Upload File
                        </button>
                    </div>

                    {inputType === 'text' && (
                        <div className="space-y-3">
                            <textarea
                                value={pendingContent}
                                onChange={e => setPendingContent(e.target.value)}
                                placeholder="Paste a recent high-performing post here..."
                                className="w-full h-32 p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:border-[var(--primary)] outline-none resize-none transition-all placeholder-[var(--foreground-muted)]/50"
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={() => addSample(pendingContent)}
                                    disabled={!pendingContent.trim()}
                                    className="px-6 py-2 rounded-xl bg-[var(--primary)] text-white font-medium disabled:opacity-50 hover:bg-[var(--primary-hover)] transition-colors"
                                >
                                    Add Sample
                                </button>
                            </div>
                        </div>
                    )}

                    {inputType === 'preset' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {VOICE_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => addSample(preset.text, 'paste')}
                                    className="p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 text-left transition-all group"
                                >
                                    <div className="font-bold flex items-center gap-2 mb-1 group-hover:text-[var(--primary)]">
                                        {preset.label}
                                        <i className={`fi fi-sr-angle-right flex items-center justify-center ${"w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all"}`}  ></i>
                                    </div>
                                    <p className="text-xs text-[var(--foreground-muted)]">{preset.desc}</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {inputType === 'file' && (
                        <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center hover:bg-[var(--card)] transition-colors cursor-pointer group relative">
                            <div className="w-12 h-12 bg-[var(--background-secondary)] rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <i className={`fi fi-sr-upload flex items-center justify-center ${"w-6 h-6 text-[var(--foreground-muted)]"}`}  ></i>
                            </div>
                            <p className="text-sm font-medium mb-1">Click to upload text file</p>
                            <p className="text-xs text-[var(--foreground-muted)]">.txt or .md only</p>
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept=".txt,.md,.pdf"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                                            try {
                                                const text = await extractTextFromPdf(file);
                                                addSample(text, 'upload');
                                            } catch (e) { alert("Failed"); }
                                        } else {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => addSample(ev.target?.result as string, 'upload');
                                            reader.readAsText(file);
                                        }
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// Step 4: Context (Refactored from Step3Strategy)
function Step4Context({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    // Removed Industries array logic from here

    const addContextItem = (section: 'personalContext' | 'productContext') => {
        const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'url' as const,
            label: '',
            value: ''
        };
        updateData({ [section]: [...(data[section] || []), newItem] });
    };

    const updateContextItem = (section: 'personalContext' | 'productContext', index: number, updates: any) => {
        const newItems = [...(data[section] || [])];
        newItems[index] = { ...newItems[index], ...updates };
        updateData({ [section]: newItems });
    };

    const removeContextItem = (section: 'personalContext' | 'productContext', index: number) => {
        const newItems = (data[section] || []).filter((_, i) => i !== index);
        updateData({ [section]: newItems });
    };

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="max-w-2xl mx-auto pb-10">
            <div className="text-left mb-8">
                <h1 className="text-3xl font-bold mb-2">Help us understand your business</h1>
                <p className="text-[var(--foreground-muted)]">We'll use this to generate personalized content ideas.</p>
            </div>

            <div className="space-y-8">
                {/* About You */}
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <label className="text-sm font-bold flex items-center gap-1">About You <span className="text-red-500">*</span></label>
                        <span className={`text-xs ${(data.aboutYou || '').length > 1000 ? 'text-red-500' : 'text-[var(--foreground-muted)]'}`}>{(data.aboutYou || '').length} / 1000</span>
                    </div>
                    <textarea
                        value={data.aboutYou || ''}
                        onChange={e => updateData({ aboutYou: e.target.value })}
                        placeholder="I'm a SaaS founder passionate about... I typically post about..."
                        className="w-full h-32 p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:border-[var(--primary)] outline-none resize-none transition-all placeholder-[var(--foreground-muted)]/50 focus:ring-1 focus:ring-[var(--primary)]"
                        maxLength={1000}
                    />
                </div>

                {/* Personal Context */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-bold">Personal Context</label>
                        <p className="text-xs text-[var(--foreground-muted)]">Your website, LinkedIn profile, or bio page (optional)</p>
                    </div>

                    <div className="space-y-3">
                        {(data.personalContext || []).map((item, i) => (
                            <ContextItem
                                key={item.id}
                                item={item}
                                onChange={(updates) => updateContextItem('personalContext', i, updates)}
                                onRemove={() => removeContextItem('personalContext', i)}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => addContextItem('personalContext')}
                        className="flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors px-2 py-1"
                    >
                        <i className={`fi fi-sr-plus-small flex items-center justify-center ${"w-4 h-4"}`}  ></i> Add personal context
                    </button>
                </div>

                {/* Product Context */}
                <div className="space-y-4 pt-4 border-t border-[var(--border)]/50">
                    <div className="space-y-1">
                        <label className="text-sm font-bold">Product Context</label>
                        <p className="text-xs text-[var(--foreground-muted)]">Landing pages, product docs, or pitch materials (optional)</p>
                    </div>

                    <div className="space-y-3">
                        {(data.productContext || []).map((item, i) => (
                            <ContextItem
                                key={item.id}
                                item={item}
                                onChange={(updates) => updateContextItem('productContext', i, updates)}
                                onRemove={() => removeContextItem('productContext', i)}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => addContextItem('productContext')}
                        className="flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors px-2 py-1"
                    >
                        <i className={`fi fi-sr-plus-small flex items-center justify-center ${"w-4 h-4"}`}  ></i> Add product context
                    </button>
                </div>

                {/* Industry/Audience removed from here */}
            </div>
        </motion.div>
    );
}

// Step 5: Goals (Renamed from Step4Goals)
function Step5Goals({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const goals = [
        { id: 'sales', label: 'Drive Sales / Leeds', icon: 'fi-sr-bolt' },
        { id: 'hiring', label: 'Attract Talent', icon: 'fi-sr-user' },
        { id: 'authority', label: 'Build Authority', icon: 'fi-sr-star' },
        { id: 'investors', label: 'Attract Investors', icon: 'fi-sr-briefcase' },
    ];
    // Simple icon placeholder
    function StarIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>; }

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <h1 className="text-3xl font-bold mb-6">Primary Goal</h1>
            <div className="grid grid-cols-1 gap-3">
                {goals.map(g => (
                    <button key={g.id} onClick={() => updateData({ contentGoal: g.id })} className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${data.contentGoal === g.id ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] hover:bg-[var(--card)]'}`}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${data.contentGoal === g.id ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)]'}`}>
                            <g.icon className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-lg">{g.label}</span>
                    </button>
                ))}
            </div>
        </motion.div>
    );
}

// Step 6: Archetype (Renamed from Step5Archetype)
function Step6Archetype({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    // Replaced broken emojis with Lucide icons (using mapped icons or SVG placeholders if needed)
    // Using simple emojis that are standard, or we can use Lucide icons. Let's use Lucide icons for a premium feel.
    const archetypes = [
        { id: 'builder', label: 'The Builder', desc: 'Build in public. Share wins, losses, and raw lessons.', icon: 'fi-sr-hammer' },
        { id: 'teacher', label: 'The Teacher', desc: 'Break down complex topics into frameworks.', icon: 'fi-sr-book-open-cover' },
        { id: 'contrarian', label: 'The Contrarian', desc: 'Challenge the status quo. Say what others won\'t.', icon: 'fi-sr-microphone' },
        { id: 'executive', label: 'The Executive', desc: 'High-level vision, culture, and leadership.', icon: 'fi-sr-briefcase' },
    ];

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <h1 className="text-3xl font-bold mb-2">Choose your Persona</h1>
            <p className="text-[var(--foreground-muted)] mb-6">How should the AI write for you?</p>
            <div className="grid grid-cols-1 gap-4">
                {archetypes.map(a => (
                    <button key={a.id} onClick={() => updateData({ archetype: a.id as any })} className={`text-left p-5 rounded-xl border-2 transition-all ${data.archetype === a.id ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] hover:bg-[var(--card)]'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <a.icon className={`w-6 h-6 ${data.archetype === a.id ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`} />
                            <span className="font-bold text-lg">{a.label}</span>
                        </div>
                        <p className="text-sm text-[var(--foreground-secondary)]">{a.desc}</p>
                    </button>
                ))}
            </div>
        </motion.div>
    );
}

// ============================================
// NEW: Strategic Foundation Steps (5-10)
// ============================================

// Step 5: Archetype Discovery (3 guided questions)
function StepArchetypeDiscovery({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    // Use local state so typing doesn't advance the question
    const [currentQ, setCurrentQ] = useState(() => {
        // Initialize to first unanswered question (for returning users)
        if (!data.archetypeDiscovery.q1) return 0;
        if (!data.archetypeDiscovery.q2) return 1;
        if (!data.archetypeDiscovery.q3) return 2;
        return 2; // All answered, show last
    });

    const questions = [
        {
            key: 'q1' as const,
            question: "When you create content, what feels most natural?",
            options: [
                {
                    text: "Showing how I built something — the real process, mistakes and all",
                    persona: "The Builder",
                    icon: 'fi-sr-hammer',
                    badge: "Process-First",
                    color: "#10B981"
                },
                {
                    text: "Breaking down a complex topic into a clear framework others can use",
                    persona: "The Teacher",
                    icon: 'fi-sr-book-open-cover',
                    badge: "Framework-Driven",
                    color: "#3B82F6"
                },
                {
                    text: "Challenging how people in my industry think — saying what others won't",
                    persona: "The Contrarian",
                    icon: 'fi-sr-bolt',
                    badge: "Sharp Perspective",
                    color: "#F59E0B"
                },
            ],
        },
        {
            key: 'q2' as const,
            question: "What do people most often come to you for?",
            options: [
                {
                    text: "Seeing my process — they want the 'how' behind the results",
                    persona: "The Expert",
                    icon: 'fi-sr-hammer',
                    badge: "Execution",
                    color: "#10B981"
                },
                {
                    text: "Getting clarity — I make complicated things simple",
                    persona: "The Guide",
                    icon: 'fi-sr-book-open-cover',
                    badge: "Simplification",
                    color: "#3B82F6"
                },
                {
                    text: "A perspective that cuts through the noise — I say it straight",
                    persona: "The Voice",
                    icon: 'fi-sr-bolt',
                    badge: "Signal",
                    color: "#F59E0B"
                },
            ],
        },
        {
            key: 'q3' as const,
            question: "What do you hate seeing most in your space?",
            options: [
                {
                    text: "Sloppy execution — people who talk big but ship nothing",
                    persona: "Integrity",
                    icon: 'fi-sr-hammer',
                    badge: "Quality",
                    color: "#10B981"
                },
                {
                    text: "Vague advice — generic tips with zero depth",
                    persona: "Substance",
                    icon: 'fi-sr-book-open-cover',
                    badge: "Depth",
                    color: "#3B82F6"
                },
                {
                    text: "People playing it safe — everyone saying the same recycled takes",
                    persona: "Originality",
                    icon: 'fi-sr-bolt',
                    badge: "Unique",
                    color: "#F59E0B"
                },
            ],
        },
    ];

    const selectOption = (value: string) => {
        updateData({
            archetypeDiscovery: {
                ...data.archetypeDiscovery,
                [questions[currentQ].key]: value,
            },
        });
        // Auto-advance to next question after a brief delay
        if (currentQ < 2) {
            setTimeout(() => setCurrentQ(currentQ + 1), 300);
        }
    };

    const currentValue = data.archetypeDiscovery[questions[currentQ].key];

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-3 tracking-tight">Discover Your Voice</h1>
                <p className="text-[var(--foreground-muted)] text-lg">
                    Pick what feels closest — we'll figure out your content persona.
                </p>
            </div>

            {/* Progress indicators */}
            <div className="flex gap-3 mb-12">
                {questions.map((_, i) => (
                    <div key={i} className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                        <motion.div
                            className="h-full bg-[var(--primary)]"
                            initial={{ width: 0 }}
                            animate={{ width: i <= currentQ ? '100%' : '0%' }}
                            transition={{ duration: 0.5 }}
                            style={{ opacity: i === currentQ ? 0.6 : 1 }}
                        />
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentQ}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.05, y: -10 }}
                    transition={{ type: "spring", damping: 20, stiffness: 100 }}
                    className="space-y-4"
                >
                    <h2 className="text-xl font-bold mb-6 text-center text-[var(--foreground)] opacity-90">
                        {questions[currentQ].question}
                    </h2>

                    <div className="grid gap-4">
                        {questions[currentQ].options.map((option, i) => {
                            const isSelected = currentValue === option.text;
                            const Icon = option.icon;

                            return (
                                <motion.button
                                    key={i}
                                    whileHover={{ scale: 1.01, translateY: -2 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => selectOption(option.text)}
                                    className={`relative group w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${isSelected
                                            ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-lg shadow-[var(--primary)]/10'
                                            : 'border-[var(--border)] bg-[var(--card)]/40 hover:border-[var(--primary)]/30 hover:bg-[var(--card)]/80'
                                        }`}
                                >
                                    {/* Selection Glow */}
                                    {isSelected && (
                                        <motion.div
                                            layoutId="selection-glow"
                                            className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/5 to-transparent pointer-events-none"
                                        />
                                    )}

                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${isSelected
                                                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-md shadow-[var(--primary)]/20'
                                                : 'bg-[var(--background)] text-[var(--foreground-muted)] border-[var(--border)] group-hover:border-[var(--primary)]/30 group-hover:text-[var(--primary)]'
                                            }`}>
                                            <i className={`fi ${Icon} flex items-center justify-center w-7 h-7`}></i>
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isSelected ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'bg-[var(--border)] text-[var(--foreground-muted)]'
                                                    }`}>
                                                    {option.badge}
                                                </span>
                                                <span className="text-[10px] font-medium opacity-50 uppercase tracking-widest">{option.persona}</span>
                                            </div>
                                            <p className={`text-sm md:text-base font-medium leading-relaxed ${isSelected ? 'text-[var(--foreground)]' : 'text-[var(--foreground-secondary)]'
                                                }`}>
                                                {option.text}
                                            </p>
                                        </div>

                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isSelected ? 'border-[var(--primary)] bg-[var(--primary)] scale-110' : 'border-[var(--border)] group-hover:border-[var(--primary)]/40'
                                            }`}>
                                            {isSelected && <i className={`fi fi-sr-check flex items-center justify-center ${"w-3.5 h-3.5 text-white"}`}  ></i>}
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation Footer */}
            <div className="mt-10 flex items-center justify-center">
                {currentQ > 0 ? (
                    <button
                        onClick={() => setCurrentQ(currentQ - 1)}
                        className="group text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all flex items-center gap-2 py-2 px-4 rounded-full hover:bg-[var(--card)]"
                    >
                        <i className={`fi fi-sr-angle-left flex items-center justify-center ${"w-4 h-4 group-hover:-translate-x-1 transition-transform"}`}  ></i>
                        Go to previous question
                    </button>
                ) : (
                    <div className="h-9" /> // Spacer to prevent jumps
                )}
            </div>
        </motion.div>
    );
}

// Step 6: Positioning Statement
function StepPositioning({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const [isGenerating, setIsGenerating] = useState(false);

    const autoGenerate = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch('/api/ai/generate-posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: `Generate a positioning statement for a ${data.role} at ${data.companyName} in the ${data.industry} industry. Their audience is ${data.targetAudience}. Their goal is ${data.contentGoal}. Format: "I help [specific who] achieve [specific outcome] without [specific pain] using [specific method]." Return ONLY the statement, nothing else.`,
                    platform: 'linkedin',
                    format: 'single',
                }),
            });
            const result = await res.json();
            if (result.post?.content) {
                // Extract the statement from quotation marks if present
                let statement = result.post.content.replace(/^["']|["']$/g, '').trim();
                updateData({ positioningStatement: statement });
            }
        } catch (e) {
            console.error('Auto-generate failed:', e);
        }
        setIsGenerating(false);
    };

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <h1 className="text-3xl font-bold mb-2">Your Positioning</h1>
            <p className="text-[var(--foreground-muted)] mb-4">
                Complete this sentence as specifically as you can. This becomes the throughline of all your content.
            </p>

            <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)]/50 mb-4">
                <p className="text-sm text-[var(--foreground-muted)] mb-3 font-medium">
                    &quot;I help <span className="text-[var(--primary)]">[who]</span> achieve <span className="text-[var(--primary)]">[what outcome]</span> without <span className="text-[var(--primary)]">[what pain]</span> using <span className="text-[var(--primary)]">[what method]</span>.&quot;
                </p>
                <textarea
                    value={data.positioningStatement}
                    onChange={(e) => updateData({ positioningStatement: e.target.value })}
                    placeholder="I help early-stage SaaS founders hit $1M ARR without burning through runway using lean growth frameworks."
                    rows={3}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 resize-none"
                />
            </div>

            <button
                onClick={autoGenerate}
                disabled={isGenerating}
                className="w-full py-3 rounded-xl border border-[var(--primary)]/30 text-[var(--primary)] font-medium text-sm hover:bg-[var(--primary)]/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isGenerating ? (
                    <><i className={`fi fi-sr-spinner flex items-center justify-center ${"w-4 h-4 animate-spin"}`}  ></i> Generating...</>
                ) : (
                    <><i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-4 h-4"}`}  ></i> Auto-generate from my profile</>
                )}
            </button>
        </motion.div>
    );
}

// Step 7: Point of View
function StepPOV({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <h1 className="text-3xl font-bold mb-2">Your Point of View</h1>
            <p className="text-[var(--foreground-muted)] mb-8">
                What do you believe about your industry that most people get wrong? One sentence, as direct as possible.
            </p>

            <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)]/50 mb-6">
                <p className="text-xs font-bold uppercase text-[var(--foreground-muted)] tracking-wider mb-3">Your contrarian belief</p>
                <textarea
                    value={data.povStatement}
                    onChange={(e) => updateData({ povStatement: e.target.value })}
                    placeholder="Most SaaS companies die not because they can't build — but because they build before they sell."
                    rows={3}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 resize-none"
                />
            </div>

            <div className="p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                <p className="text-sm text-[var(--foreground-muted)]">
                    <strong className="text-[var(--foreground)]">Why this matters:</strong> This becomes the anchor for every piece of authority content. Your audience should finish reading your posts and think: &quot;They're right — why did I ever think otherwise?&quot;
                </p>
            </div>
        </motion.div>
    );
}

// Step 8: Audience Identity Gap
function StepIdentityGap({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <h1 className="text-3xl font-bold mb-2">The Identity Gap</h1>
            <p className="text-[var(--foreground-muted)] mb-8">
                Your target audience — what do they want to <strong>become</strong>? Not what they want to achieve. Who do they want to <em>be</em>?
            </p>

            <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)]/50 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                        <i className={`fi fi-sr-bullseye flex items-center justify-center ${"w-5 h-5 text-[var(--primary)]"}`}  ></i>
                    </div>
                    <div>
                        <p className="font-bold text-sm">Your audience: {data.targetAudience || 'Not set'}</p>
                        <p className="text-xs text-[var(--foreground-muted)]">Who they want to become ↓</p>
                    </div>
                </div>
                <textarea
                    value={data.identityGap}
                    onChange={(e) => updateData({ identityGap: e.target.value })}
                    placeholder="They want to be the founder who scaled without chaos — calm, strategic, in control of growth instead of chasing it."
                    rows={3}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 resize-none"
                />
            </div>

            <div className="p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                <p className="text-sm text-[var(--foreground-muted)]">
                    <strong className="text-[var(--foreground)]">Every post lives in this gap</strong> — the space between who your audience is now and who they want to be. Your content bridges it.
                </p>
            </div>
        </motion.div>
    );
}

// Step 9: Competitor Context
function StepCompetitors({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const updateCompetitor = (index: number, value: string) => {
        const updated = [...data.competitors];
        updated[index] = value;
        updateData({ competitors: updated });
    };

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <h1 className="text-3xl font-bold mb-2">Your Competitor Landscape</h1>
            <p className="text-[var(--foreground-muted)] mb-8">
                Name 3 people or brands your ideal client follows <strong>before</strong> they find you. We'll analyze what they all share — and find the gap where you win.
            </p>

            <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--border)] flex items-center justify-center text-sm font-bold text-[var(--foreground-muted)]">
                            {i + 1}
                        </div>
                        <input
                            type="text"
                            value={data.competitors[i] || ''}
                            onChange={(e) => updateCompetitor(i, e.target.value)}
                            placeholder={`Competitor ${i + 1} — name, handle, or URL`}
                            className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                        />
                    </div>
                ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                <p className="text-sm text-[var(--foreground-muted)]">
                    <strong className="text-[var(--foreground)]">Your content strategy goes in the opposite direction</strong> of what they all share in common. If everyone does threads, you do sharp single posts. If everyone teaches theory, you show execution.
                </p>
            </div>
        </motion.div>
    );
}

// Step 10: Content Pillars (3 pillars with job assignment)
function StepContentPillars({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const jobs: Array<{ id: 'authority' | 'relatability' | 'proof'; label: string; metric: string; emoji: string }> = [
        { id: 'authority', label: 'Authority', metric: 'Saves + Follows', emoji: '🏛️' },
        { id: 'relatability', label: 'Relatability', metric: 'Shares + Reach', emoji: '🤝' },
        { id: 'proof', label: 'Proof', metric: 'DMs + Leads', emoji: '🔥' },
    ];

    const pillars = data.contentPillars.length >= 3 ? data.contentPillars : [
        { name: '', description: '', job: 'authority' as const },
        { name: '', description: '', job: 'relatability' as const },
        { name: '', description: '', job: 'proof' as const },
    ];

    const updatePillar = (index: number, updates: Partial<typeof pillars[0]>) => {
        const updated = [...pillars];
        updated[index] = { ...updated[index], ...updates };
        updateData({ contentPillars: updated });
    };

    // Auto-init pillars if empty
    useEffect(() => {
        if (data.contentPillars.length === 0) {
            updateData({
                contentPillars: [
                    { name: '', description: '', job: 'authority' },
                    { name: '', description: '', job: 'relatability' },
                    { name: '', description: '', job: 'proof' },
                ],
            });
        }
    }, []);

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <h1 className="text-3xl font-bold mb-2">Content Pillars</h1>
            <p className="text-[var(--foreground-muted)] mb-2">
                3 pillars. Not 5. Three creates identity without diluting it. Each pillar has a <strong>job</strong>.
            </p>
            <p className="text-xs text-[var(--foreground-muted)] mb-8">
                Ratio: 50% Authority • 30% Relatability • 20% Proof
            </p>

            <div className="space-y-5">
                {pillars.map((pillar, i) => {
                    const job = jobs.find(j => j.id === pillar.job) || jobs[i];
                    return (
                        <div key={i} className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)]/50">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-xl">{job.emoji}</span>
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                                        {job.label}
                                    </span>
                                    <span className="text-xs text-[var(--foreground-muted)] ml-2">
                                        Metric: {job.metric}
                                    </span>
                                </div>
                            </div>
                            <input
                                type="text"
                                value={pillar.name}
                                onChange={(e) => updatePillar(i, { name: e.target.value })}
                                placeholder={`Pillar ${i + 1} name (e.g., "Growth Frameworks")`}
                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-3 text-sm font-bold mb-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                            />
                            <input
                                type="text"
                                value={pillar.description}
                                onChange={(e) => updatePillar(i, { description: e.target.value })}
                                placeholder="Short description of what this pillar covers"
                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                            />
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}

// Step 8: Brand Colors
function StepBrandColors({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractError, setExtractError] = useState<string | null>(null);

    const handleColorChange = (key: 'primary' | 'background' | 'accent', value: string) => {
        // Ensure hex format
        if (!value.startsWith('#')) value = '#' + value;
        updateData({
            brandColors: {
                ...(data.brandColors || { primary: '#10B981', background: '#09090B', accent: '#F59E0B' }),
                [key]: value
            }
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsExtracting(true);
        setExtractError(null);

        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const res = await fetch('/api/ai/extract-colors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64 }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Extraction failed');
            }

            const palette = await res.json();
            updateData({ brandColors: palette });
        } catch (err) {
            console.error('[BrandColors] Extraction error:', err);
            setExtractError(err instanceof Error ? err.message : 'Failed to analyze image colors. Try another image.');
        } finally {
            setIsExtracting(false);
        }
    };

    const presetPalettes = [
        { name: "Emerald Dark", primary: "#10B981", background: "#09090B", accent: "#F59E0B" },
        { name: "Ocean Blue", primary: "#3B82F6", background: "#FFFFFF", accent: "#F97316" },
        { name: "Neon Cyber", primary: "#8B5CF6", background: "#000000", accent: "#EC4899" },
        { name: "Minimal Stone", primary: "#000000", background: "#FAFAFA", accent: "#52525B" },
    ];

    const currentColors = data.brandColors || { primary: '#10B981', background: '#09090B', accent: '#F59E0B' };

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Configure Your Brand Kit</h1>
            <p className="text-[var(--foreground-muted)] mb-8">Set your brand colors for personalized carousels and thumbnails.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Extraction and Presets */}
                <div className="space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-2">
                        <i className={`fi fi-sr-upload flex items-center justify-center ${"w-4 h-4"}`}  ></i> Smart Extraction
                    </h3>
                    <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--card)]/30 hover:bg-[var(--card)]/50 transition-all text-center relative group">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            disabled={isExtracting}
                        />
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                {isExtracting ? <i className={`fi fi-sr-spinner flex items-center justify-center ${"w-6 h-6 text-[var(--primary)] animate-spin"}`}  ></i> : <i className={`fi fi-sr-upload flex items-center justify-center ${"w-6 h-6 text-[var(--primary)]"}`}  ></i>}
                            </div>
                            <h3 className="font-bold text-sm">Extract from Image</h3>
                            <p className="text-xs text-[var(--foreground-muted)] mt-1">Upload logo or screenshot</p>
                        </div>
                    </div>
                    {extractError && <p className="text-xs text-red-500 text-center bg-red-500/10 p-2 rounded-lg">{extractError}</p>}

                    <div className="pt-2">
                        <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-2">
                            <i className={`fi fi-sr-paint-roller flex items-center justify-center ${"w-4 h-4"}`}  ></i> Quick Presets
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                            {presetPalettes.map((preset, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => updateData({ brandColors: preset })}
                                    className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] transition-all flex items-center gap-3 group"
                                >
                                    <div className="flex overflow-hidden rounded-full w-20 h-4 shrink-0 border border-white/10">
                                        <div className="flex-1" style={{ backgroundColor: preset.primary }}></div>
                                        <div className="flex-1" style={{ backgroundColor: preset.background }}></div>
                                        <div className="flex-1" style={{ backgroundColor: preset.accent }}></div>
                                    </div>
                                    <span className="text-xs font-medium group-hover:text-[var(--primary)] transition-colors">{preset.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Manual Selectors */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-2">
                        <i className={`fi fi-sr-settings-sliders flex items-center justify-center ${"w-4 h-4"}`}  ></i> Manual Adjustment
                    </h3>

                    {/* Primary */}
                    <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-xs uppercase tracking-tight opacity-70">Primary Color</span>
                            <div className="w-6 h-6 rounded border border-white/10" style={{ backgroundColor: currentColors.primary }} />
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={currentColors.primary}
                                onChange={(e) => handleColorChange('primary', e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0"
                            />
                            <input
                                type="text"
                                value={currentColors.primary}
                                onChange={(e) => handleColorChange('primary', e.target.value)}
                                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            />
                        </div>
                    </div>

                    {/* Background */}
                    <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-xs uppercase tracking-tight opacity-70">Canvas Base</span>
                            <div className="w-6 h-6 rounded border border-white/10" style={{ backgroundColor: currentColors.background }} />
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={currentColors.background}
                                onChange={(e) => handleColorChange('background', e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0"
                            />
                            <input
                                type="text"
                                value={currentColors.background}
                                onChange={(e) => handleColorChange('background', e.target.value)}
                                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            />
                        </div>
                    </div>

                    {/* Accent */}
                    <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-xs uppercase tracking-tight opacity-70">Accent/Pop</span>
                            <div className="w-6 h-6 rounded border border-white/10" style={{ backgroundColor: currentColors.accent }} />
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={currentColors.accent}
                                onChange={(e) => handleColorChange('accent', e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0"
                            />
                            <input
                                type="text"
                                value={currentColors.accent}
                                onChange={(e) => handleColorChange('accent', e.target.value)}
                                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                            />
                        </div>
                    </div>
                </div>

                {/* Preview */}
                <div className="flex flex-col space-y-4 lg:pl-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-2">
                        <i className={`fi fi-sr-eye flex items-center justify-center ${"w-4 h-4"}`}  ></i> Live Preview
                    </h3>
                    <div
                        className="w-full aspect-[4/5] rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative flex flex-col p-8 transition-all duration-500 items-center justify-center text-center group"
                        style={{ backgroundColor: currentColors.background }}
                    >
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <span
                                className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-6 transition-all duration-500"
                                style={{ backgroundColor: currentColors.primary + '20', color: currentColors.primary, border: `1px solid ${currentColors.primary}30` }}
                            >
                                Topic Tag
                            </span>
                            <h2
                                className="text-2xl font-bold leading-tight mb-6 transition-colors duration-500 tracking-tight"
                                style={{ color: currentColors.background === '#000000' || currentColors.background === '#09090B' || currentColors.background?.toLowerCase() === '#ffffff' ? (currentColors.background?.toLowerCase() === '#ffffff' ? '#000000' : '#ffffff') : '#000000' }}
                            >
                                How to build a high-converting brand.
                            </h2>
                            <div
                                className="w-12 h-1.5 rounded-full transition-all duration-500 shadow-sm"
                                style={{ backgroundColor: currentColors.accent }}
                            ></div>
                        </div>

                        {/* Faux profile footer */}
                        <div className="flex items-center gap-3 mt-auto w-full pt-6 border-t border-white/5">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                                {data.avatar_urls && data.avatar_urls[0] ? (
                                    <img src={data.avatar_urls[0]} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[var(--primary)]/10">
                                        <i className={`fi fi-sr-user flex items-center justify-center ${"w-5 h-5 opacity-50 text-[var(--primary)]"}`}  ></i>
                                    </div>
                                )}
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-sm" style={{ color: currentColors.background === '#000000' || currentColors.background === '#09090B' || currentColors.background?.toLowerCase() === '#ffffff' ? (currentColors.background?.toLowerCase() === '#ffffff' ? '#000000' : '#ffffff') : '#000000' }}>
                                    {data.name || "Alex Smith"}
                                </div>
                                <div className="text-[10px] uppercase tracking-wider opacity-50 font-medium" style={{ color: currentColors.background === '#000000' || currentColors.background === '#09090B' || currentColors.background?.toLowerCase() === '#ffffff' ? (currentColors.background?.toLowerCase() === '#ffffff' ? '#000000' : '#ffffff') : '#000000' }}>
                                    Founder & CEO
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}


// Step 9: Connect (Added Auto-Publish)
function Step9Connect({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const handleConnect = (platform: 'x' | 'linkedin') => {
        window.location.href = `/api/auth/${platform}/init?redirect=/onboarding`;
    };

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <h1 className="text-3xl font-bold mb-2">Connect Accounts</h1>
            <p className="text-[var(--foreground-muted)] mb-8">Link your LinkedIn profile for auto-publishing.</p>

            <div className="space-y-4">
                {/* X (Twitter) removed due to API limitations */}

                <button onClick={() => handleConnect('linkedin')} disabled={data.connections.linkedin} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${data.connections.linkedin ? 'border-green-500/50 bg-green-500/10' : 'border-[var(--border)] hover:bg-[var(--background-secondary)]'}`}>
                    <div className="flex items-center gap-4">
                        <i className={`fi fi-brands-linkedin flex items-center justify-center ${"w-5 h-5"}`}  ></i>
                        <div className="text-left">
                            <div className="font-bold">LinkedIn</div>
                            <div className="text-xs opacity-70">{data.connections.linkedin ? 'Connected' : 'Not connected'}</div>
                        </div>
                    </div>
                    {data.connections.linkedin ? <i className={`fi fi-sr-check flex items-center justify-center ${"text-green-500"}`}  ></i> : <i className={`fi fi-sr-angle-right flex items-center justify-center ${"text-[var(--muted-foreground)]"}`}  ></i>}
                </button>

                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/50">
                    <div className="flex items-center gap-3 mb-2">
                        <i className={`fi fi-brands-twitter flex items-center justify-center ${"w-4 h-4 text-[var(--foreground-muted)]"}`}  ></i>
                        <span className="font-bold text-sm text-[var(--foreground-secondary)]">X (Twitter)</span>
                    </div>
                    <p className="text-xs text-[var(--foreground-muted)]">
                        We'll still generate viral X posts for you! You can copy/paste them directly from your dashboard. Auto-posting is currently unavailable for X.
                    </p>
                </div>
            </div>

            {/* Auto Publish Toggle (Moved from old step 9) */}
            <div className="mt-8 pt-8 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold">Auto-Publish</h3>
                        <p className="text-sm text-[var(--foreground-muted)]">Post automatically to LinkedIn?</p>
                    </div>
                    <button
                        onClick={() => updateData({ autoPublish: !data.autoPublish })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${data.autoPublish ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${data.autoPublish ? 'translate-x-6' : ''}`} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// Deprecated Old Steps
function Step9Publishing(props: any) { return null; }
function Step10Launch(props: any) { return <StepFinal {...props} />; }

// Step 9: Launch (Final)
function StepFinal({ data, isGenerating, onGenerate, error }: { data: OnboardingData; isGenerating: boolean; onGenerate: () => void; error: string | null }) {
    // Generate a mock calendar based on selected topics
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const mockSchedule = days.map((day, i) => ({
        day,
        topic: data.topics[i % data.topics.length] || 'General Strategy',
        type: i % 2 === 0 ? 'Thought Leadership' : 'Engagement'
    }));

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-2">Strategy Locked 🔒</h1>
                <p className="text-[var(--foreground-muted)]">Your first week of content is ready to be revealed.</p>
            </div>

            {/* Visual Calendar */}
            <div className="max-w-2xl mx-auto grid gap-3 mb-10 relative">
                {/* Blur Overlay */}
                <div className="absolute inset-0 bg-[var(--background)]/10 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl border border-[var(--border)]/50 pointer-events-none">
                    <div className="px-6 py-3 bg-[var(--background)]/80 backdrop-blur-md rounded-full shadow-2xl border border-[var(--primary)]/20 flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="font-bold text-sm">AI Agent is ready</span>
                    </div>
                </div>

                {mockSchedule.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/50 opacity-60">
                        <div className="w-24 text-sm font-bold opacity-50">{item.day}</div>
                        <div className="flex-1">
                            <div className="h-4 w-32 bg-[var(--foreground)]/10 rounded mb-2"></div>
                            <div className="flex gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] font-bold">{item.topic}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--border)] text-[var(--foreground-muted)]">{item.type}</span>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[var(--border)]/50" />
                    </div>
                ))}
            </div>

            <div className="max-w-md mx-auto">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="w-full py-4 text-lg font-bold rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-xl shadow-[var(--primary)]/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    {isGenerating ? (
                        <span className="flex items-center justify-center gap-2 relative z-10">
                            <i className={`fi fi-sr-spinner flex items-center justify-center ${"w-5 h-5 animate-spin"}`}  ></i>
                            Crafting your posts...
                        </span>
                    ) : (
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-5 h-5"}`}  ></i> Unlock My Schedule
                        </span>
                    )}
                </button>
                <p className="mt-4 text-sm text-[var(--foreground-muted)] text-center">Takes about 45 seconds to write 12 posts</p>
            </div>
        </motion.div>
    );
}

