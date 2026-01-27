'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    ArrowLeft,
    Twitter,
    Linkedin,
    Briefcase,
    Target,
    Lightbulb,
    Calendar,
    Palette,
    FileText,
    Sparkles,
    Check,
    Upload,
    Mic,
    Link,
    Type,
    User,
    Building,
    Zap,
    Loader2,
    Hammer,
    BookOpen,
    Plus,
    Trash2,
    Globe,
    X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LogOut } from 'lucide-react';
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
    industry: string; // Keep for AI context
    targetAudience: string;
    // Context Profile (New Structure)
    aboutYou: string; // The main bio/pitch
    personalContext: {
        id: string;
        type: 'url' | 'text';
        label: string; // e.g. "My Website"
        value: string;
    }[];
    productContext: {
        id: string;
        type: 'url' | 'text';
        label: string; // e.g. "Landing Page"
        value: string;
    }[];

    contentGoal: string;
    topics: string[];

    // Style
    archetype: 'builder' | 'teacher' | 'contrarian' | 'executive' | 'custom';
    tone: { // Keep specifically for 'custom' or fine-tuning
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
    subscriptionTier?: 'starter' | 'growth' | 'authority';
    visualMode?: 'none' | 'faceless' | 'clone';
    style_faceless?: string;
    style_carousel?: string;
    style_face?: string;
    avatar_urls?: string[];
}

const initialData: OnboardingData = {
    name: '',
    role: '',
    companyName: '',
    companyWebsite: '',
    industry: '', // Default

    platforms: { x: true, linkedin: true },
    connections: { x: false, linkedin: false },
    targetAudience: '',
    aboutYou: '',
    personalContext: [],
    productContext: [],

    contentGoal: '',
    topics: [],

    archetype: 'builder', // Default
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
};

// Step Components
const steps = [
    { id: 1, title: 'The Basics', subtitle: 'Who are you?', icon: User },
    // Step 2 Removed: Both platforms enabled by default
    { id: 2, title: 'Industry', subtitle: 'Your Niche', icon: Building }, // Was Step 3
    { id: 3, title: 'Context', subtitle: 'About Business', icon: Briefcase }, // Was Step 4
    { id: 4, title: 'Goals', subtitle: 'Success metric', icon: Target }, // Was Step 5
    { id: 5, title: 'Archetype', subtitle: 'Choose your persona', icon: Palette }, // Was Step 6
    { id: 6, title: 'Topics', subtitle: 'Content pillars', icon: Lightbulb }, // Was Step 7
    { id: 7, title: 'Voice', subtitle: 'Writing style', icon: FileText }, // Was Step 8
    { id: 8, title: 'Connect', subtitle: 'Link accounts', icon: Link }, // Was Step 9
    { id: 9, title: 'Launch', subtitle: 'Generate content', icon: Sparkles }, // Was Step 10
    { id: 10, title: 'Plan', subtitle: 'Choose Tier', icon: Check },
    { id: 11, title: 'Style', subtitle: 'Visual Setup', icon: Palette },
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
    const [error, setError] = useState<string | null>(null);

    // Initial Load & URL Params Check
    useEffect(() => {
        const init = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            const params = new URLSearchParams(window.location.search);
            const isRedirect = params.get('connect') === 'success' || !!params.get('error') || !!params.get('payment');

            // DEBUG: Identify why redirect logic fails
            if (window.location.search.includes('payment') || window.location.search.includes('connect')) {
                alert(`DEBUG: Redirect Detected
                Params: ${window.location.search}
                isRedirect: ${isRedirect}
                LocalStorage: ${localStorage.getItem('onboarding_temp_data') ? 'Found' : 'Missing'}
                `);
            }

            let loadedData = initialData; // Start clean

            // STRATEGY: 
            // 1. If Redirecting back (Auth flow), prioritize TEMP data (most recent).
            // 2. If Normal load (Logged in), prioritize USER SAVED data.

            if (isRedirect) {
                // Redirect Case: We just came back from X/LinkedIn/Stripe.
                // Priority 1: Temp Data (most recent in-memory state)
                const tempData = localStorage.getItem('onboarding_temp_data');

                // Priority 2: Saved Data (persisted user state)
                const savedData = user ? localStorage.getItem(`onboarding_data_${user?.id}`) : null;

                if (tempData) {
                    try {
                        loadedData = JSON.parse(tempData);
                    } catch (e) { console.error('Failed to parse temp data', e); }
                } else if (savedData) {
                    try {
                        loadedData = JSON.parse(savedData);
                    } catch (e) { console.error('Failed to parse saved data', e); }
                }
            } else if (user) {
                // Normal Load Case: Check user saved data first
                const savedData = localStorage.getItem(`onboarding_data_${user.id}`);
                if (savedData) {
                    try {
                        loadedData = JSON.parse(savedData);
                        console.log('[Onboarding] Restored USER Saved data');
                    } catch (e) {
                        console.error('Failed to parse user data', e);
                    }
                } else {
                    // Fallback to temp if no user data found (e.g. reload before save)
                    const tempData = localStorage.getItem('onboarding_temp_data');
                    if (tempData) {
                        try {
                            loadedData = JSON.parse(tempData);
                        } catch (e) { }
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

            // Set Data First
            setData(loadedData);

            // Then Set Step (Delay slightly to ensure render if needed, but here sync is fine)
            if (isRedirect) {
                // Handle Payment Redirects
                if (params.get('payment') === 'success') {
                    setCurrentStep(11); // Move to Visual Setup
                } else if (params.get('payment') === 'cancelled') {
                    setCurrentStep(10); // Back to Payment to try again
                    setError('Payment was cancelled.');
                } else {
                    // Auth Redirect
                    setCurrentStep(8); // Force Step 8 (Connect)
                }
            } else {
                // Optional: Restore last step? For now start at 1 or keep logic simple.
                // If data is filled, maybe jump? 
                // Let's stick to 1 unless redirected for predictability, OR check if "Launch" was ready.
            }
        };

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
        // Validation handled in render or canProceed
        if (currentStep < 11) {
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
            case 5: // Archetype
                return true;
            case 6: // Topics
                return data.topics.length > 0;
            case 7: // Voice
                return true;
            case 8: // Connect
                return true;
            case 9: // Connect
                return true;
            case 10: // Payment
                return !!data.subscriptionTier; // Block until tier selected
            case 11: // Visuals
                return true; // handled internally
            default:
                return false;
        }
    };

    const handleGenerate = async () => {
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
                        <Sparkles className="w-5 h-5 text-white" />
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
                                        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
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
                        <LogOut className="w-4 h-4" />
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
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold">Influuc</span>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="absolute right-4 top-4 p-2 text-[var(--foreground-muted)] hover:text-red-500"
                    >
                        <LogOut className="w-5 h-5" />
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

                {/* Content area */}
                <div className="flex-1 flex items-center justify-center p-4 lg:p-8 overflow-y-auto">
                    <div className={`w-full transition-all duration-500 ${currentStep === 10 ? 'max-w-6xl' : currentStep === 11 ? 'max-w-4xl' : 'max-w-xl'}`}>
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
                                    key="step3"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 3 && (
                                <Step4Context
                                    key="step4"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 4 && (
                                <Step5Goals
                                    key="step5"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 5 && (
                                <Step6Archetype
                                    key="step6"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 6 && (
                                <Step7Topics
                                    key="step7"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 7 && (
                                <Step8Voice
                                    key="step8"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 8 && (
                                <Step9Connect
                                    key="step9"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 9 && (
                                <Step9Connect
                                    key="step9"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 10 && (
                                <StepPayment
                                    key="step10_pay"
                                    data={data}
                                    updateData={updateData}
                                    onNext={() => {
                                        // Logic Fork
                                        if (data.subscriptionTier === 'starter') {
                                            handleGenerate(); // Tier 1 ends here
                                        } else {
                                            nextStep(); // Tier 2/3 go to visuals
                                        }
                                    }}
                                />
                            )}
                            {currentStep === 11 && (
                                <StepVisualFork
                                    key="step11_visual"
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
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>

                        {/* Show Continue button for steps 1-9 (Launch is now handled differently? No, Step 9 is Connect. Step 10 is Payment.) */}
                        {/* Actually, Step 9 (Connect) needs 'Continue' to go to Paywall. */}
                        {/* Step 10 (Payment) has internal selection buttons, but maybe hide main continue? */}
                        {currentStep < 10 ? (
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
                                <ArrowRight className="w-4 h-4" />
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
                        {p === 'x' ? <Twitter className="w-6 h-6" /> : <Linkedin className="w-6 h-6" />}
                        <span className="font-bold capitalize">{p}</span>
                        <div className="ml-auto">{data.platforms[p as 'x' | 'linkedin'] && <Check className="w-4 h-4 text-[var(--primary)]" />}</div>
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
                            {tab === 'url' ? <Globe className="w-3 h-3" /> : tab === 'text' ? <Type className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                            {tab === 'url' ? 'Website' : tab === 'text' ? 'Text' : 'File'}
                        </button>
                    ))}
                </div>
                <button onClick={onRemove} className="text-[var(--foreground-muted)] hover:text-red-500 transition-colors p-1">
                    <X className="w-4 h-4" />
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
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
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
                            <Upload className="w-4 h-4" />
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
                                        <Trash2 className="w-4 h-4" />
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
                            <Zap className="w-3 h-3" /> Presets
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
                                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                    </div>
                                    <p className="text-xs text-[var(--foreground-muted)]">{preset.desc}</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {inputType === 'file' && (
                        <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center hover:bg-[var(--card)] transition-colors cursor-pointer group relative">
                            <div className="w-12 h-12 bg-[var(--background-secondary)] rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <Upload className="w-6 h-6 text-[var(--foreground-muted)]" />
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
                        <Plus className="w-4 h-4" /> Add personal context
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
                        <Plus className="w-4 h-4" /> Add product context
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
        { id: 'sales', label: 'Drive Sales / Leeds', icon: Zap },
        { id: 'hiring', label: 'Attract Talent', icon: User },
        { id: 'authority', label: 'Build Authority', icon: StarIcon },
        { id: 'investors', label: 'Attract Investors', icon: Briefcase },
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
        { id: 'builder', label: 'The Builder', desc: 'Build in public. Share wins, losses, and raw lessons.', icon: Hammer },
        { id: 'teacher', label: 'The Teacher', desc: 'Break down complex topics into frameworks.', icon: BookOpen },
        { id: 'contrarian', label: 'The Contrarian', desc: 'Challenge the status quo. Say what others won\'t.', icon: Mic },
        { id: 'executive', label: 'The Executive', desc: 'High-level vision, culture, and leadership.', icon: Briefcase },
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






// Step 9: Connect (Added Auto-Publish)
function Step9Connect({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const handleConnect = (platform: 'x' | 'linkedin') => {
        window.location.href = `/api/auth/${platform}/init?redirect=/onboarding`;
    };

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <h1 className="text-3xl font-bold mb-2">Connect Accounts</h1>
            <p className="text-[var(--foreground-muted)] mb-8">Link your profiles so we can publish for you.</p>

            <div className="space-y-4">
                <button onClick={() => handleConnect('x')} disabled={data.connections.x} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${data.connections.x ? 'border-green-500/50 bg-green-500/10' : 'border-[var(--border)] hover:bg-[var(--background-secondary)]'}`}>
                    <div className="flex items-center gap-4">
                        <Twitter className="w-5 h-5" />
                        <div className="text-left">
                            <div className="font-bold">X (Twitter)</div>
                            <div className="text-xs opacity-70">{data.connections.x ? 'Connected' : 'Not connected'}</div>
                        </div>
                    </div>
                    {data.connections.x ? <Check className="text-green-500" /> : <ArrowRight className="text-[var(--muted-foreground)]" />}
                </button>

                <button onClick={() => handleConnect('linkedin')} disabled={data.connections.linkedin} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${data.connections.linkedin ? 'border-green-500/50 bg-green-500/10' : 'border-[var(--border)] hover:bg-[var(--background-secondary)]'}`}>
                    <div className="flex items-center gap-4">
                        <Linkedin className="w-5 h-5" />
                        <div className="text-left">
                            <div className="font-bold">LinkedIn</div>
                            <div className="text-xs opacity-70">{data.connections.linkedin ? 'Connected' : 'Not connected'}</div>
                        </div>
                    </div>
                    {data.connections.linkedin ? <Check className="text-green-500" /> : <ArrowRight className="text-[var(--muted-foreground)]" />}
                </button>
            </div>

            {/* Auto Publish Toggle (Moved from old step 9) */}
            <div className="mt-8 pt-8 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold">Auto-Publish</h3>
                        <p className="text-sm text-[var(--foreground-muted)]">Post automatically at scheduled times?</p>
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
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Crafting your posts...
                        </span>
                    ) : (
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            <Sparkles className="w-5 h-5" /> Unlock My Schedule
                        </span>
                    )}
                </button>
                <p className="mt-4 text-sm text-[var(--foreground-muted)] text-center">Takes about 45 seconds to write 12 posts</p>
            </div>
        </motion.div>
    );
}

