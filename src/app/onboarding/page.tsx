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
    Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LogOut } from 'lucide-react';

// Types
interface OnboardingData {
    platforms: {
        x: boolean;
        linkedin: boolean;
    };
    industry: string;
    targetAudience: string;
    contentGoal: string;
    topics: string[];
    cadence: 'light' | 'moderate' | 'active';
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
    userContext: {
        role: string;
        companyName: string;
        companyWebsite: string;
        businessDescription: string;
        expertise: string;
    };
    autoPublish: boolean;
}

const initialData: OnboardingData = {
    platforms: { x: false, linkedin: false },
    industry: '',
    targetAudience: '',
    contentGoal: '',
    topics: [],
    cadence: 'moderate',
    tone: {
        formality: 'professional',
        boldness: 'bold',
        style: 'educational',
        approach: 'story-driven',
    },
    voiceSamples: [],
    userContext: {
        role: '',
        companyName: '',
        companyWebsite: '',
        businessDescription: '',
        expertise: '',
    },
    autoPublish: false,
};

// Step Components
const steps = [
    { id: 1, title: 'Platforms', subtitle: 'Where do you want to post?', icon: Target },
    { id: 2, title: 'Industry', subtitle: 'Tell us about your business', icon: Briefcase },
    { id: 3, title: 'Context', subtitle: 'Tell us about you & your business', icon: User },
    { id: 4, title: 'Goals', subtitle: 'What do you want to achieve?', icon: Target },
    { id: 5, title: 'Topics', subtitle: 'What will you talk about?', icon: Lightbulb },
    { id: 6, title: 'Tone', subtitle: 'How do you want to sound?', icon: Palette },
    { id: 7, title: 'Voice', subtitle: 'Help us learn your style', icon: FileText },
    { id: 8, title: 'Connect', subtitle: 'Link your social accounts', icon: Link },
    { id: 9, title: 'Publishing', subtitle: 'How should posts go live?', icon: Zap },
    { id: 10, title: 'Launch', subtitle: 'Ready to generate your first week', icon: Sparkles },
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

            let loadedData = initialData;

            if (user) {
                // 1. Try to load saved state for THIS user
                const savedData = localStorage.getItem(`onboarding_data_${user.id}`);
                if (savedData) {
                    try {
                        loadedData = JSON.parse(savedData);
                    } catch (e) {
                        console.error('Failed to parse saved onboarding data', e);
                    }
                }
            }

            // 2. Check for redirect params (e.g. from OAuth)
            const params = new URLSearchParams(window.location.search);
            if (params.get('connect') === 'success') {
                setCurrentStep(8); // Jump to Connect step

                // Force enable the connected platform
                const platform = params.get('platform');
                if (platform === 'x' || platform === 'linkedin') {
                    // Update loadedData to ensure the connected platform is selected
                    loadedData = {
                        ...loadedData,
                        platforms: {
                            ...loadedData.platforms,
                            [platform]: true
                        }
                    };
                }
            } else if (params.get('error')) {
                setCurrentStep(8); // Jump to Connect step to show error
            }

            setData(loadedData);
        };

        init();
    }, []);

    // Persistence on Change
    useEffect(() => {
        const save = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user && JSON.stringify(data) !== JSON.stringify(initialData)) {
                localStorage.setItem(`onboarding_data_${user.id}`, JSON.stringify(data));
            }
        };
        save();
    }, [data]);

    const handleSignOut = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            localStorage.removeItem(`onboarding_data_${user.id}`);
        }

        await supabase.auth.signOut();
        router.push('/signup');
    };

    const updateData = (updates: Partial<OnboardingData>) => {
        setData(prev => ({ ...prev, ...updates }));
    };

    const nextStep = () => {
        if (currentStep < 9) {
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
            case 1:
                return data.platforms.x || data.platforms.linkedin;
            case 2:
                return data.industry !== '';
            case 3:
                // Context step - require at least role and description
                return data.userContext.role !== '' && data.userContext.businessDescription !== '';
            case 4:
                return data.contentGoal !== '';
            case 5:
                return data.topics.length > 0;
            case 6:
                return true;
            case 7:
                return data.voiceSamples.length > 0 || true; // Allow skip for now
            case 8:
                // Connection step is optional or verified inside component (allow proceed always or check connection?)
                // For now, allow proceed even if skipped, or maybe force at least one?
                // Let's allow skip.
                return true;
            case 9:
                return true;
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
        <div className="min-h-screen bg-[var(--background)] flex">
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
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="w-full max-w-2xl">
                        <AnimatePresence mode="wait">
                            {currentStep === 1 && (
                                <Step1Platforms
                                    key="step1"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 2 && (
                                <Step2Industry
                                    key="step2"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 3 && (
                                <StepUserContext
                                    key="step3"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 4 && (
                                <Step3Goals
                                    key="step4"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 5 && (
                                <Step4Topics
                                    key="step5"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 6 && (
                                <Step6Tone
                                    key="step6"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 7 && (
                                <Step7Voice
                                    key="step7"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 8 && (
                                <StepConnect
                                    key="step8"
                                    data={data}
                                />
                            )}
                            {currentStep === 9 && (
                                <Step9Publishing
                                    key="step9"
                                    data={data}
                                    updateData={updateData}
                                />
                            )}
                            {currentStep === 10 && (
                                <Step10Launch
                                    key="step10"
                                    data={data}
                                    isGenerating={isGenerating}
                                    onGenerate={handleGenerate}
                                    error={error}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Bottom navigation */}
                <div className="p-6 border-t border-[var(--border)]">
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

                        {/* Show Continue button for steps 1-9, hide for step 10 (Launch) */}
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

// Step 1: Platforms
function Step1Platforms({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const togglePlatform = (platform: 'x' | 'linkedin') => {
        updateData({
            platforms: {
                ...data.platforms,
                [platform]: !data.platforms[platform],
            },
        });
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
            <motion.h1
                className="text-4xl font-bold mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                Where do you want to post?
            </motion.h1>
            <motion.p
                className="text-lg text-[var(--foreground-secondary)] mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                Select the platforms where you want to build your presence
            </motion.p>

            <motion.div
                className="grid gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {/* X/Twitter */}
                <motion.button
                    variants={itemVariants}
                    onClick={() => togglePlatform('x')}
                    className={`
            flex items-center gap-5 p-6 rounded-2xl border-2 transition-all duration-300 group
            ${data.platforms.x
                            ? 'border-[var(--primary)] bg-[var(--primary)]/10 shadow-[0_0_30px_-10px_rgba(var(--primary),0.3)]'
                            : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--background-secondary)]'}
          `}
                >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${data.platforms.x ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-[var(--foreground)] group-hover:scale-110 duration-300'
                        }`}>
                        <Twitter className="w-7 h-7" />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className={`text-xl font-semibold transition-colors ${data.platforms.x ? 'text-[var(--primary)]' : ''}`}>X (Twitter)</h3>
                        <p className="text-[var(--foreground-secondary)]">Short-form posts, threads, and quick takes</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${data.platforms.x
                        ? 'border-[var(--primary)] bg-[var(--primary)]'
                        : 'border-[var(--border)]'
                        }`}>
                        {data.platforms.x && <Check className="w-4 h-4 text-white" />}
                    </div>
                </motion.button>

                {/* LinkedIn */}
                <motion.button
                    variants={itemVariants}
                    onClick={() => togglePlatform('linkedin')}
                    className={`
            flex items-center gap-5 p-6 rounded-2xl border-2 transition-all duration-300 group
            ${data.platforms.linkedin
                            ? 'border-[var(--primary)] bg-[var(--primary)]/10 shadow-[0_0_30px_-10px_rgba(var(--primary),0.3)]'
                            : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--background-secondary)]'}
          `}
                >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${data.platforms.linkedin ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-[var(--foreground)] group-hover:scale-110 duration-300'
                        }`}>
                        <Linkedin className="w-7 h-7" />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className={`text-xl font-semibold transition-colors ${data.platforms.linkedin ? 'text-[var(--primary)]' : ''}`}>LinkedIn</h3>
                        <p className="text-[var(--foreground-secondary)]">Professional content, thought leadership, long-form</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${data.platforms.linkedin
                        ? 'border-[var(--primary)] bg-[var(--primary)]'
                        : 'border-[var(--border)]'
                        }`}>
                        {data.platforms.linkedin && <Check className="w-4 h-4 text-white" />}
                    </div>
                </motion.button>


            </motion.div>
        </motion.div>
    );
}

// Step 2: Industry
function Step2Industry({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const industries = [
        { value: 'saas', label: 'SaaS / Software', emoji: '💻' },
        { value: 'ecommerce', label: 'E-commerce / DTC', emoji: '🛍️' },
        { value: 'fintech', label: 'Fintech / Finance', emoji: '💰' },
        { value: 'healthcare', label: 'Healthcare / Biotech', emoji: '🏥' },
        { value: 'agency', label: 'Agency / Services', emoji: '🏢' },
        { value: 'creator', label: 'Creator Economy', emoji: '🎨' },
        { value: 'ai', label: 'AI / Machine Learning', emoji: '🤖' },
        { value: 'other', label: 'Other', emoji: '✨' },
    ];

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
            <motion.h1
                className="text-4xl font-bold mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                What's your industry?
            </motion.h1>
            <motion.p
                className="text-lg text-[var(--foreground-secondary)] mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                This helps us tailor your content to your audience
            </motion.p>

            <motion.div
                className="grid grid-cols-2 gap-3"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {industries.map((industry) => (
                    <motion.button
                        key={industry.value}
                        variants={itemVariants}
                        onClick={() => updateData({ industry: industry.value })}
                        className={`
              flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 text-left hover:scale-[1.02]
              ${data.industry === industry.value
                                ? 'border-[var(--primary)] bg-[var(--primary)]/10 shadow-[0_0_20px_-5px_rgba(var(--primary),0.2)]'
                                : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--background-secondary)]'}
            `}
                    >
                        <span className="text-2xl">{industry.emoji}</span>
                        <span className={`font-medium ${data.industry === industry.value ? 'text-[var(--primary)]' : ''}`}>{industry.label}</span>
                    </motion.button>
                ))}
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-8"
            >
                <label className="block text-sm font-medium mb-2 text-[var(--foreground-secondary)]">
                    Who's your target audience?
                </label>
                <input
                    type="text"
                    value={data.targetAudience}
                    onChange={(e) => updateData({ targetAudience: e.target.value })}
                    placeholder="e.g., B2B SaaS founders, startup CTOs, marketing leaders..."
                    className="input border-[var(--border)] focus:border-[var(--primary)] bg-[var(--background-secondary)]/50"
                />
            </motion.div>
        </motion.div>
    );
}

// Step 3: User Context
function StepUserContext({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const updateContext = (field: keyof OnboardingData['userContext'], value: string) => {
        updateData({
            userContext: {
                ...data.userContext,
                [field]: value
            }
        });
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
            <motion.h1
                className="text-4xl font-bold mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                Tell us about you & your business
            </motion.h1>
            <motion.p
                className="text-lg text-[var(--foreground-secondary)] mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                The more context we have, the better your AI content will be.
            </motion.p>

            <motion.div
                className="space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {/* Role & Company */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div variants={itemVariants}>
                        <label className="block text-sm font-medium mb-2 text-[var(--foreground-secondary)]">
                            Your Role <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.userContext.role}
                            onChange={(e) => updateContext('role', e.target.value)}
                            placeholder="e.g. Founder, CEO, Freelancer"
                            className="input w-full bg-[var(--background-secondary)] border-[var(--border)] focus:border-[var(--primary)]"
                        />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <label className="block text-sm font-medium mb-2 text-[var(--foreground-secondary)]">
                            Company Name
                        </label>
                        <input
                            type="text"
                            value={data.userContext.companyName}
                            onChange={(e) => updateContext('companyName', e.target.value)}
                            placeholder="e.g. Acme Corp"
                            className="input w-full bg-[var(--background-secondary)] border-[var(--border)] focus:border-[var(--primary)]"
                        />
                    </motion.div>
                </div>

                <motion.div variants={itemVariants}>
                    <label className="block text-sm font-medium mb-2 text-[var(--foreground-secondary)]">
                        Company Website <span className="text-xs text-[var(--foreground-muted)]">(We'll scrape this for context)</span>
                    </label>
                    <input
                        type="url"
                        value={data.userContext.companyWebsite}
                        onChange={(e) => updateContext('companyWebsite', e.target.value)}
                        placeholder="https://example.com"
                        className="input w-full bg-[var(--background-secondary)] border-[var(--border)] focus:border-[var(--primary)]"
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <label className="block text-sm font-medium mb-2 text-[var(--foreground-secondary)]">
                        Business Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={data.userContext.businessDescription}
                        onChange={(e) => updateContext('businessDescription', e.target.value)}
                        placeholder="What do you sell? Who do you help? What's your unique value proposition?"
                        className="input w-full h-32 bg-[var(--background-secondary)] border-[var(--border)] focus:border-[var(--primary)]"
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <label className="block text-sm font-medium mb-2 text-[var(--foreground-secondary)]">
                        Your Expertise / Topics
                    </label>
                    <textarea
                        value={data.userContext.expertise}
                        onChange={(e) => updateContext('expertise', e.target.value)}
                        placeholder="What define topics are you an expert in? (e.g. B2B Sales, React Native, Leadership)"
                        className="input w-full h-24 bg-[var(--background-secondary)] border-[var(--border)] focus:border-[var(--primary)] text-sm"
                    />
                </motion.div>
            </motion.div>
        </motion.div>
    );
}

// Step 3: Goals
function Step3Goals({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const goals = [
        { value: 'thought-leadership', label: 'Thought Leadership', description: 'Establish yourself as an industry expert', icon: '🎯' },
        { value: 'lead-generation', label: 'Lead Generation', description: 'Drive inbound leads and sales opportunities', icon: '📈' },
        { value: 'brand-awareness', label: 'Brand Awareness', description: 'Increase visibility for your company', icon: '🌟' },
        { value: 'community', label: 'Community Building', description: 'Build a loyal following and engage with peers', icon: '🤝' },
        { value: 'hiring', label: 'Hiring & Recruiting', description: 'Attract top talent to your team', icon: '👥' },
    ];

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
            <motion.h1
                className="text-4xl font-bold mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                What's your primary goal?
            </motion.h1>
            <motion.p
                className="text-lg text-[var(--foreground-secondary)] mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                We'll optimize your content strategy around this goal
            </motion.p>

            <motion.div
                className="space-y-3"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {goals.map((goal) => (
                    <motion.button
                        key={goal.value}
                        variants={itemVariants}
                        onClick={() => updateData({ contentGoal: goal.value })}
                        className={`
              w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-300 text-left hover:translate-x-1
              ${data.contentGoal === goal.value
                                ? 'border-[var(--primary)] bg-[var(--primary)]/10 shadow-[0_0_20px_-5px_rgba(var(--primary),0.2)]'
                                : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--background-secondary)]'}
            `}
                    >
                        <span className="text-3xl">{goal.icon}</span>
                        <div className="flex-1">
                            <h3 className={`font-semibold text-lg ${data.contentGoal === goal.value ? 'text-[var(--primary)]' : ''}`}>{goal.label}</h3>
                            <p className="text-[var(--foreground-secondary)]">{goal.description}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${data.contentGoal === goal.value
                            ? 'border-[var(--primary)] bg-[var(--primary)]'
                            : 'border-[var(--border)]'
                            }`}>
                            {data.contentGoal === goal.value && <Check className="w-4 h-4 text-white" />}
                        </div>
                    </motion.button>
                ))}
            </motion.div>
        </motion.div>
    );
}

// Step 4: Topics
function Step4Topics({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const suggestedTopics = [
        'Leadership', 'Product', 'Fundraising', 'Growth', 'Sales',
        'Marketing', 'Engineering', 'Culture', 'Hiring', 'Strategy',
        'AI/ML', 'Remote Work', 'Startups', 'Productivity', 'Innovation'
    ];

    const toggleTopic = (topic: string) => {
        if (data.topics.includes(topic)) {
            updateData({ topics: data.topics.filter(t => t !== topic) });
        } else {
            updateData({ topics: [...data.topics, topic] });
        }
    };

    const [customTopic, setCustomTopic] = useState('');

    const addCustomTopic = () => {
        if (customTopic.trim() && !data.topics.includes(customTopic.trim())) {
            updateData({ topics: [...data.topics, customTopic.trim()] });
            setCustomTopic('');
        }
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
            <motion.h1
                className="text-4xl font-bold mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                What topics will you cover?
            </motion.h1>
            <motion.p
                className="text-lg text-[var(--foreground-secondary)] mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                Select topics you're passionate about or add your own
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-2 mb-6"
            >
                {suggestedTopics.map((topic) => (
                    <button
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
              ${data.topics.includes(topic)
                                ? 'bg-[var(--primary)] text-white'
                                : 'bg-[var(--background-secondary)] hover:bg-[var(--border)]'}
            `}
                    >
                        {topic}
                    </button>
                ))}
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex gap-2"
            >
                <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomTopic()}
                    placeholder="Add a custom topic..."
                    className="input flex-1"
                />
                <button
                    onClick={addCustomTopic}
                    disabled={!customTopic.trim()}
                    className="btn btn-primary"
                >
                    Add
                </button>
            </motion.div>

            {data.topics.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-[var(--background-secondary)] rounded-xl"
                >
                    <p className="text-sm text-[var(--foreground-muted)] mb-2">Selected topics ({data.topics.length})</p>
                    <div className="flex flex-wrap gap-2">
                        {data.topics.map((topic) => (
                            <span
                                key={topic}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--primary)] text-white rounded-full text-sm"
                            >
                                {topic}
                                <button onClick={() => toggleTopic(topic)} className="hover:opacity-70">×</button>
                            </span>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

// Step 5: Cadence
function Step5Cadence({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const cadences = [
        {
            value: 'light' as const,
            label: 'Light',
            posts: '2-3 posts/week',
            description: 'Great for getting started or busy schedules',
            icon: '🌱'
        },
        {
            value: 'moderate' as const,
            label: 'Moderate',
            posts: '3-5 posts/week',
            description: 'Consistent presence without overwhelming',
            icon: '🌿',
            recommended: true
        },
        {
            value: 'active' as const,
            label: 'Active',
            posts: '5-7 posts/week',
            description: 'Maximum visibility and engagement',
            icon: '🌳'
        },
    ];

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
            <motion.h1
                className="text-4xl font-bold mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                How often do you want to post?
            </motion.h1>
            <motion.p
                className="text-lg text-[var(--foreground-secondary)] mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                We'll plan your content calendar based on your preferred cadence
            </motion.p>

            <motion.div
                className="space-y-4"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {cadences.map((cadence) => (
                    <motion.button
                        key={cadence.value}
                        variants={itemVariants}
                        onClick={() => updateData({ cadence: cadence.value })}
                        className={`
              w-full flex items-center gap-5 p-6 rounded-2xl border-2 transition-all duration-300 text-left relative hover:translate-x-1 group
              ${data.cadence === cadence.value
                                ? 'border-[var(--primary)] bg-[var(--primary)]/10 shadow-[0_0_20px_-5px_rgba(var(--primary),0.2)]'
                                : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--background-secondary)]'}
            `}
                    >
                        {cadence.recommended && (
                            <span className="absolute -top-2 right-4 px-3 py-0.5 bg-[var(--secondary)] text-white text-xs font-medium rounded-full shadow-lg">
                                Recommended
                            </span>
                        )}
                        <span className="text-4xl group-hover:scale-110 transition-transform">{cadence.icon}</span>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h3 className={`font-semibold text-xl ${data.cadence === cadence.value ? 'text-[var(--primary)]' : ''}`}>{cadence.label}</h3>
                                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${data.cadence === cadence.value ? 'bg-[var(--primary)] text-white' : 'bg-[var(--primary)]/10 text-[var(--primary)]'}`}>
                                    {cadence.posts}
                                </span>
                            </div>
                            <p className="text-[var(--foreground-secondary)] mt-1">{cadence.description}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${data.cadence === cadence.value
                            ? 'border-[var(--primary)] bg-[var(--primary)]'
                            : 'border-[var(--border)]'
                            }`}>
                            {data.cadence === cadence.value && <Check className="w-4 h-4 text-white" />}
                        </div>
                    </motion.button>
                ))}
            </motion.div>
        </motion.div>
    );
}

// Step 6: Tone
function Step6Tone({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const toneOptions = [
        {
            key: 'formality', label: 'Voice', options: [
                { value: 'professional', label: 'Professional', emoji: '👔' },
                { value: 'casual', label: 'Casual', emoji: '😊' },
            ]
        },
        {
            key: 'boldness', label: 'Energy', options: [
                { value: 'bold', label: 'Bold', emoji: '🔥' },
                { value: 'measured', label: 'Measured', emoji: '🎯' },
            ]
        },
        {
            key: 'style', label: 'Approach', options: [
                { value: 'educational', label: 'Educational', emoji: '📚' },
                { value: 'conversational', label: 'Conversational', emoji: '💬' },
            ]
        },
        {
            key: 'approach', label: 'Style', options: [
                { value: 'story-driven', label: 'Story-driven', emoji: '📖' },
                { value: 'data-driven', label: 'Data-driven', emoji: '📊' },
            ]
        },
    ];

    const updateTone = (key: string, value: string) => {
        updateData({
            tone: {
                ...data.tone,
                [key]: value,
            },
        });
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
            <motion.h1
                className="text-4xl font-bold mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                How do you want to sound?
            </motion.h1>
            <motion.p
                className="text-lg text-[var(--foreground-secondary)] mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                Set the tone for all your content
            </motion.p>

            <motion.div
                className="space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {toneOptions.map((option) => (
                    <motion.div key={option.key} variants={itemVariants}>
                        <label className="block text-sm font-medium mb-3 text-[var(--foreground-secondary)] tracking-wide uppercase text-xs">
                            {option.label}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {option.options.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => updateTone(option.key, opt.value)}
                                    className={`
                    flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02]
                    ${(data.tone as Record<string, string>)[option.key] === opt.value
                                            ? 'border-[var(--primary)] bg-[var(--primary)]/10 shadow-[0_0_15px_-5px_rgba(var(--primary),0.2)]'
                                            : 'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--card)]'}
                  `}
                                >
                                    <span className="text-2xl">{opt.emoji}</span>
                                    <span className={`font-medium ${(data.tone as Record<string, string>)[option.key] === opt.value ? 'text-[var(--primary)]' : ''}`}>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </motion.div>
    );
}

// Step 7: Voice
function Step7Voice({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'voicenote' | 'url'>('paste');
    const [pasteContent, setPasteContent] = useState('');

    const wordCount = pasteContent.split(/\s+/).filter(word => word.length > 0).length;
    const minWords = 300;

    const addSample = () => {
        if (pasteContent.trim()) {
            updateData({
                voiceSamples: [...data.voiceSamples, { content: pasteContent, type: activeTab }],
            });
            setPasteContent('');
        }
    };

    const tabs = [
        { id: 'paste' as const, label: 'Paste', icon: Type },
        { id: 'upload' as const, label: 'Upload', icon: Upload },
        { id: 'voicenote' as const, label: 'Voice', icon: Mic },
        { id: 'url' as const, label: 'URL', icon: Link },
    ];

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
            <motion.h1
                className="text-4xl font-bold mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                Help us learn your voice
            </motion.h1>
            <motion.p
                className="text-lg text-[var(--foreground-secondary)] mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                Share examples of your writing so we can match your style
            </motion.p>

            {/* Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex gap-2 mb-6"
            >
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                ${activeTab === tab.id
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'bg-[var(--background-secondary)] hover:bg-[var(--border)]'}
              `}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </motion.div>

            {/* Content based on tab */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
            >
                {activeTab === 'paste' && (
                    <div>
                        <textarea
                            value={pasteContent}
                            onChange={(e) => setPasteContent(e.target.value)}
                            placeholder="Paste a tweet, LinkedIn post, email, or anything you've written that sounds like you..."
                            className="input textarea h-48"
                        />
                        <div className="flex items-center justify-between mt-3">
                            <div className="text-sm">
                                <span className={wordCount >= minWords ? 'text-[var(--success)]' : 'text-[var(--foreground-muted)]'}>
                                    {wordCount} words
                                </span>
                                <span className="text-[var(--foreground-muted)]"> / {minWords} recommended</span>
                            </div>
                            <button
                                onClick={addSample}
                                disabled={!pasteContent.trim()}
                                className="btn btn-primary"
                            >
                                Add Sample
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'upload' && (
                    <div className="border-2 border-dashed border-[var(--border)] rounded-2xl p-12 text-center">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-[var(--foreground-muted)]" />
                        <p className="text-lg font-medium mb-2">Drop files here or click to upload</p>
                        <p className="text-[var(--foreground-muted)]">Supports .txt, .md, .doc files</p>
                    </div>
                )}

                {activeTab === 'voicenote' && (
                    <div className="border-2 border-dashed border-[var(--border)] rounded-2xl p-12 text-center">
                        <Mic className="w-12 h-12 mx-auto mb-4 text-[var(--foreground-muted)]" />
                        <p className="text-lg font-medium mb-2">Record a voice note</p>
                        <p className="text-[var(--foreground-muted)]">We'll transcribe it and learn your speaking style</p>
                        <button className="btn btn-outline mt-4">
                            Start Recording
                        </button>
                    </div>
                )}

                {activeTab === 'url' && (
                    <div>
                        <input
                            type="url"
                            placeholder="Paste a link to your blog post, tweet, or article..."
                            className="input"
                        />
                        <p className="text-sm text-[var(--foreground-muted)] mt-2">
                            We'll extract the content and analyze your writing style
                        </p>
                    </div>
                )}
            </motion.div>

            {/* Existing samples */}
            {data.voiceSamples.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-[var(--background-secondary)] rounded-xl"
                >
                    <p className="text-sm text-[var(--foreground-muted)] mb-2">
                        Added samples ({data.voiceSamples.length})
                    </p>
                    {data.voiceSamples.map((sample, i) => (
                        <div key={i} className="flex items-center gap-2 py-2 border-b border-[var(--border)] last:border-0">
                            <Check className="w-4 h-4 text-[var(--success)]" />
                            <span className="text-sm truncate flex-1">{sample.content.slice(0, 50)}...</span>
                            <span className="text-xs text-[var(--foreground-muted)] capitalize">{sample.type}</span>
                        </div>
                    ))}
                </motion.div>
            )}

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-[var(--foreground-muted)] mt-6"
            >
                💡 The more examples you provide, the better we can match your voice
            </motion.p>
        </motion.div>
    );
}

// Step 9: Subscribe
function Step9Subscribe({
    isLoading,
    onSubscribe,
    error
}: {
    isLoading: boolean;
    onSubscribe: (plan: string) => void;
    error: string | null;
}) {
    const plans = [
        {
            id: 'pro',
            name: 'Pro',
            price: 29,
            description: 'Perfect for founders building their personal brand',
            popular: true,
            features: [
                '7-day free trial',
                'Unlimited AI-generated posts',
                'All platforms',
                'Voice cloning',
                'Weekly content calendar',
            ],
        },
        {
            id: 'agency',
            name: 'Agency',
            price: 99,
            description: 'For teams managing multiple brands',
            popular: false,
            features: [
                'Everything in Pro',
                'Unlimited everything',
                'Multiple profiles',
                'Team collaboration',
                'Priority support',
            ],
        },
    ];

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"
            >
                <Zap className="w-8 h-8 text-white" />
            </motion.div>

            <motion.h1
                className="text-4xl font-bold mb-3 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                Start Your Free Trial
            </motion.h1>
            <motion.p
                className="text-lg text-[var(--foreground-secondary)] mb-8 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                7 days free, cancel anytime. No commitment.
            </motion.p>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm"
                >
                    <strong>Error:</strong> {error}
                </motion.div>
            )}

            <motion.div
                className="grid md:grid-cols-2 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {plans.map((plan) => (
                    <motion.div
                        key={plan.id}
                        variants={itemVariants}
                        className={`
                            relative p-6 rounded-2xl border-2 transition-all duration-300
                            ${plan.popular
                                ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                                : 'border-[var(--border)] hover:border-[var(--border-hover)]'
                            }
                        `}
                    >
                        {plan.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <span className="px-3 py-1 text-xs font-semibold bg-[var(--primary)] text-white rounded-full">
                                    Most Popular
                                </span>
                            </div>
                        )}

                        <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                        <p className="text-sm text-[var(--foreground-secondary)] mb-4">
                            {plan.description}
                        </p>

                        <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-3xl font-bold">${plan.price}</span>
                            <span className="text-[var(--foreground-muted)]">/month</span>
                        </div>

                        <ul className="space-y-2 mb-6">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm">
                                    <Check className="w-4 h-4 text-[var(--success)]" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => onSubscribe(plan.id)}
                            disabled={isLoading}
                            className={`
                                w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all
                                ${plan.popular
                                    ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
                                    : 'bg-[var(--background-secondary)] hover:bg-[var(--border)]'
                                }
                                ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}
                            `}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Start Free Trial
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </motion.div>
                ))}
            </motion.div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center text-sm text-[var(--foreground-muted)] mt-6"
            >
                🔒 Secure payment by Stripe • Cancel anytime
            </motion.p>
        </motion.div>
    );
}

// Step 9: Publishing Mode
function Step9Publishing({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
    const publishingModes = [
        {
            id: 'manual',
            value: false,
            icon: '🔒',
            title: 'Approve Each Post',
            description: 'Review and approve posts before they go live. You\'ll see them in your dashboard and click "Post Now" when ready.',
            features: ['Full control over timing', 'Edit before posting', 'Best for beginners']
        },
        {
            id: 'auto',
            value: true,
            icon: '🚀',
            title: 'Auto-Pilot',
            description: 'Posts go live automatically at their scheduled time. Completely hands-off experience.',
            features: ['Set and forget', 'Consistent posting', 'Best for busy founders']
        }
    ];

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            <motion.div variants={itemVariants} className="text-center mb-8">
                <h2 className="text-3xl font-bold text-[var(--foreground)] mb-3">
                    How should posts go live?
                </h2>
                <p className="text-[var(--foreground-muted)] text-lg">
                    Choose how you want to manage your scheduled content
                </p>
            </motion.div>

            <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">
                {publishingModes.map((mode) => (
                    <button
                        key={mode.id}
                        onClick={() => updateData({ autoPublish: mode.value })}
                        className={`
                            p-6 rounded-2xl border-2 text-left transition-all duration-300
                            ${data.autoPublish === mode.value
                                ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-lg shadow-[var(--primary)]/10'
                                : 'border-[var(--border)] hover:border-[var(--primary)]/50 bg-[var(--card)]'}
                        `}
                    >
                        <div className="flex items-start gap-4">
                            <div className="text-4xl">{mode.icon}</div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-bold text-lg text-[var(--foreground)]">
                                        {mode.title}
                                    </h3>
                                    {data.autoPublish === mode.value && (
                                        <span className="px-2 py-0.5 rounded-full bg-[var(--primary)] text-white text-xs font-bold">
                                            Selected
                                        </span>
                                    )}
                                </div>
                                <p className="text-[var(--foreground-muted)] text-sm mb-4">
                                    {mode.description}
                                </p>
                                <ul className="space-y-1">
                                    {mode.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)]">
                                            <Check className="w-4 h-4 text-[var(--primary)]" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </button>
                ))}
            </motion.div>

            <motion.div variants={itemVariants} className="text-center">
                <p className="text-sm text-[var(--foreground-muted)]">
                    💡 You can change this anytime in Settings
                </p>
            </motion.div>
        </motion.div>
    );
}

// Step 10: Launch
function Step10Launch({
    data,
    isGenerating,
    onGenerate,
    error
}: {
    data: OnboardingData;
    isGenerating: boolean;
    onGenerate: () => void;
    error: string | null;
}) {
    const selectedPlatforms = Object.entries(data.platforms)
        .filter(([_, enabled]) => enabled)
        .map(([platform]) => platform);

    if (isGenerating) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
            >
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 mx-auto mb-8"
                >
                    <div className="w-full h-full rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />
                </motion.div>
                <h2 className="text-3xl font-bold mb-3">Generating your first week...</h2>
                <p className="text-[var(--foreground-secondary)]">
                    Our AI is crafting personalized content just for you
                </p>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3 }}
                    className="h-1 bg-[var(--primary)] rounded-full mt-8 max-w-md mx-auto"
                />
            </motion.div>
        );
    }

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center"
            >
                <Sparkles className="w-10 h-10 text-white" />
            </motion.div>

            <motion.h1
                className="text-4xl font-bold mb-3 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                You're all set!
            </motion.h1>
            <motion.p
                className="text-lg text-[var(--foreground-secondary)] mb-10 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                Here's a summary of your content strategy
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-[var(--card)] rounded-2xl p-6 mb-8 border border-[var(--border)]"
            >
                <div className="grid gap-4">
                    <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                        <span className="text-[var(--foreground-secondary)]">Platforms</span>
                        <span className="font-medium capitalize">{selectedPlatforms.join(', ')}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                        <span className="text-[var(--foreground-secondary)]">Industry</span>
                        <span className="font-medium capitalize">{data.industry || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                        <span className="text-[var(--foreground-secondary)]">Goal</span>
                        <span className="font-medium capitalize">{data.contentGoal.replace('-', ' ') || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                        <span className="text-[var(--foreground-secondary)]">Cadence</span>
                        <span className="font-medium capitalize">{data.cadence}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-[var(--foreground-secondary)]">Topics</span>
                        <span className="font-medium">{data.topics.length} selected</span>
                    </div>
                </div>
            </motion.div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm"
                >
                    <strong>Error:</strong> {error}
                </motion.div>
            )}

            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={onGenerate}
                className="w-full btn py-4 text-lg bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[var(--primary)]/25"
            >
                <Sparkles className="w-5 h-5" />
                Generate My First Week
                <ArrowRight className="w-5 h-5" />
            </motion.button>
        </motion.div>
    );
}

// Step 8: Connect Accounts
function StepConnect({ data }: { data: OnboardingData }) {
    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const connectedPlatform = searchParams.get('platform');
    const connectSuccess = searchParams.get('connect') === 'success';

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
            <motion.h1
                className="text-4xl font-bold mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                Connect your accounts
            </motion.h1>
            <motion.p
                className="text-lg text-[var(--foreground-secondary)] mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                We need permission to post content on your behalf.
            </motion.p>

            <motion.div
                className="grid gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {/* X Connection */}
                {data.platforms.x && (
                    <motion.div variants={itemVariants} className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
                                <Twitter className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">X (Twitter)</h3>
                                <p className="text-sm text-[var(--foreground-secondary)]">Auto-post threads & tweets</p>
                            </div>
                        </div>
                        {connectSuccess && connectedPlatform === 'x' ? (
                            <div className="flex items-center gap-2 text-green-500 font-medium px-4 py-2 bg-green-500/10 rounded-lg">
                                <Check className="w-4 h-4" /> Connected
                            </div>
                        ) : (
                            <a
                                href="/api/auth/x/init"
                                className="px-6 py-2 rounded-lg bg-[var(--foreground)] text-[var(--background)] font-medium hover:opacity-90 transition-opacity"
                            >
                                Connect
                            </a>
                        )}
                    </motion.div>
                )}

                {/* LinkedIn Connection */}
                {data.platforms.linkedin && (
                    <motion.div variants={itemVariants} className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#0077b5] text-white flex items-center justify-center">
                                <Linkedin className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">LinkedIn</h3>
                                <p className="text-sm text-[var(--foreground-secondary)]">Publish posts & articles</p>
                            </div>
                        </div>
                        {connectSuccess && connectedPlatform === 'linkedin' ? (
                            <div className="flex items-center gap-2 text-green-500 font-medium px-4 py-2 bg-green-500/10 rounded-lg">
                                <Check className="w-4 h-4" /> Connected
                            </div>
                        ) : (
                            <a
                                href="/api/auth/linkedin/init"
                                className="px-6 py-2 rounded-lg bg-[var(--foreground)] text-[var(--background)] font-medium hover:opacity-90 transition-opacity"
                            >
                                Connect
                            </a>
                        )}
                    </motion.div>
                )}

                {!data.platforms.x && !data.platforms.linkedin && (
                    <div className="p-6 rounded-xl bg-[var(--background-secondary)] text-center text-[var(--foreground-muted)]">
                        No platforms selected in Step 1. Please go back and select a platform.
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
