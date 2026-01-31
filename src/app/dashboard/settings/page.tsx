'use client';

import { useState, useEffect } from 'react';
import { usePosts } from '@/contexts';
import {
    Twitter,
    Linkedin,
    CheckCircle2,
    AlertCircle,
    Loader2,
    LogOut,
    User,
    Building2,
    Settings as SettingsIcon,
    ChevronRight,
    Globe,
    CreditCard,
    Zap,
    Layout,
    Save,
    Link as LinkIcon,
    Type,
    Upload,
    X,
    Plus
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { extractTextFromPdf } from '@/utils/pdf';
import { BillingSection } from '@/components/dashboard/settings/BillingSection';

type TabId = 'general' | 'context' | 'integrations' | 'preferences' | 'billing';

// --- Context Item Component (From Onboarding) ---
function ContextItem({
    item,
    onChange,
    onRemove
}: {
    item: { id: string, type: 'url' | 'text', label: string, value: string },
    onChange: (updates: any) => void,
    onRemove: () => void
}) {
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
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
                        <input
                            type="text"
                            value={item.value}
                            onChange={(e) => onChange({ value: e.target.value })}
                            placeholder="https://example.com"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--background-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none text-sm font-mono"
                        />
                    </div>
                )}

                {activeTab === 'text' && (
                    <textarea
                        value={item.value}
                        onChange={(e) => onChange({ value: e.target.value })}
                        placeholder="Paste text here..."
                        className="w-full h-24 p-3 rounded-xl bg-[var(--background-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none text-sm resize-none"
                    />
                )}

                {activeTab === 'file' && (
                    <div className="relative border-2 border-dashed border-[var(--border)] rounded-xl p-6 text-center hover:bg-[var(--background-secondary)] transition-colors cursor-pointer group/file">
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

export default function SettingsPage() {
    const { profile, loading, refreshPosts } = usePosts();
    const router = useRouter();
    const searchParams = useSearchParams();

    // UI State
    const tabParam = searchParams.get('tab') as TabId | null;
    const [activeTab, setActiveTab] = useState<TabId>(tabParam && ['general', 'context', 'integrations', 'preferences', 'billing'].includes(tabParam) ? tabParam : 'general');
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        companyName: '',
        companyWebsite: '',
        industry: '',
        targetAudience: '',
        autoPublish: false,
        // Context Data
        aboutYou: '',
        personalContext: [] as Array<{ id: string; type: string; label: string; value: string }>,
        productContext: [] as Array<{ id: string; type: string; label: string; value: string }>
    });

    // Sync profile data to form state when loaded
    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name || '',
                role: profile.role || '',
                companyName: profile.companyName || '',
                companyWebsite: profile.companyWebsite || '',
                industry: profile.industry || '',
                targetAudience: profile.targetAudience || '',
                autoPublish: profile.autoPublish || false,
                aboutYou: profile.contextData?.aboutYou || profile.businessDescription || '',
                personalContext: profile.contextData?.personalContext || [],
                productContext: profile.contextData?.productContext || []
            });
        }
    }, [profile]);

    // Handle connection/payment success params
    useEffect(() => {
        if (searchParams.get('connect') === 'success') {
            const platform = searchParams.get('platform');
            setSuccessMessage(`Successfully connected to ${platform === 'x' ? 'X (Twitter)' : 'LinkedIn'}`);
            refreshPosts();
            window.history.replaceState(null, '', '/dashboard/settings?tab=integrations');
            setTimeout(() => setSuccessMessage(null), 3000);
            setActiveTab('integrations');
        } else if (searchParams.get('payment') === 'success') {
            setSuccessMessage('Subscription upgraded successfully! Welcome to your new plan.');
            refreshPosts(); // Refresh profile context to get new limits logic
            window.history.replaceState(null, '', '/dashboard/settings?tab=billing');
            setTimeout(() => setSuccessMessage(null), 5000);
            setActiveTab('billing');
        }
    }, [searchParams, refreshPosts]);

    const handleSignOut = async () => {
        const supabase = createClient();

        // Clear local storage to prevent data leakage to other accounts
        localStorage.removeItem('onboarding_temp_data');

        // Also clear any user-specific keys if possible, or just all onboarding keys
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('onboarding_data_')) {
                localStorage.removeItem(key);
            }
        });

        await supabase.auth.signOut();
        router.push('/signup');
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Reconstruct contextData
            const contextData = {
                aboutYou: formData.aboutYou,
                personalContext: formData.personalContext,
                productContext: formData.productContext
            };

            const payload = {
                ...formData,
                contextData // Ensure backend receives this
            };

            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to update settings');

            await refreshPosts(); // Refresh context
            setSuccessMessage('Settings saved successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError('Failed to save settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Helper functions for Context Items
    const addContextItem = (section: 'personalContext' | 'productContext') => {
        const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'url' as const,
            label: '',
            value: ''
        };
        setFormData(prev => ({ ...prev, [section]: [...prev[section], newItem] }));
    };

    const updateContextItem = (section: 'personalContext' | 'productContext', index: number, updates: any) => {
        setFormData(prev => {
            const newItems = [...prev[section]];
            newItems[index] = { ...newItems[index], ...updates };
            return { ...prev, [section]: newItems };
        });
    };

    const removeContextItem = (section: 'personalContext' | 'productContext', index: number) => {
        setFormData(prev => ({
            ...prev,
            [section]: prev[section].filter((_, i) => i !== index)
        }));
    };

    const isXConnected = profile?.connections?.x === true;
    const isLiConnected = profile?.connections?.linkedin === true;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    const tabs = [
        { id: 'general', label: 'General', icon: User },
        { id: 'context', label: 'Context', icon: Building2 },
        { id: 'integrations', label: 'Integrations', icon: Globe },
        { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
        { id: 'billing', label: 'Billing', icon: CreditCard },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">Settings</h1>
                    <p className="text-[var(--foreground-secondary)] text-lg">Manage your account and workspace.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all font-semibold shadow-lg shadow-[var(--primary)]/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Changes
                </button>
            </div>

            {/* Notifications */}
            <AnimatePresence>
                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-3 font-medium"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        {successMessage}
                    </motion.div>
                )}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 rounded-xl bg-red-500/10 text-red-600 border border-red-500/20 flex items-center gap-3 font-medium"
                    >
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid lg:grid-cols-4 gap-8">
                {/* Sidebar Navigation */}
                <div className="space-y-1 lg:col-span-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabId)}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200
                                    ${isActive
                                        ? 'bg-[var(--card)] text-[var(--foreground)] font-semibold shadow-sm ring-1 ring-[var(--border)]'
                                        : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]'}
                                `}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-[var(--primary)]' : ''}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3 space-y-6">

                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <section className="card p-6 border border-[var(--border)] bg-[var(--card)] rounded-2xl space-y-6">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <User className="w-5 h-5 text-[var(--primary)]" />
                                    Profile Information
                                </h2>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[var(--foreground-muted)]">Full Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                                            placeholder="Your Name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[var(--foreground-muted)]">Role</label>
                                        <input
                                            type="text"
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                                            placeholder="e.g. Founder, CEO"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="card p-6 border border-[var(--border)] bg-[var(--card)] rounded-2xl space-y-6">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-indigo-500" />
                                    Company Basics
                                </h2>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[var(--foreground-muted)]">Company Name</label>
                                        <input
                                            type="text"
                                            value={formData.companyName}
                                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                            className="w-full p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                                            placeholder="Company Name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[var(--foreground-muted)]">Website</label>
                                        <input
                                            type="text"
                                            value={formData.companyWebsite}
                                            onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                                            className="w-full p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                                            placeholder="https://example.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[var(--foreground-muted)]">Industry</label>
                                        <input
                                            type="text"
                                            value={formData.industry}
                                            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                            className="w-full p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                                            placeholder="e.g. SaaS, FinTech"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[var(--foreground-muted)]">Target Audience</label>
                                        <input
                                            type="text"
                                            value={formData.targetAudience}
                                            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                                            className="w-full p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-all"
                                            placeholder="e.g. Small Business Owners"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="pt-4">
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-2 text-red-500 hover:text-red-600 font-medium transition-colors px-4 py-2 rounded-lg hover:bg-red-500/5 ml-auto"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Sign Out of Influuc
                                </button>
                            </section>
                        </motion.div>
                    )}

                    {/* Context Tab */}
                    {activeTab === 'context' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                            {/* About You */}
                            <section className="card p-6 border border-[var(--border)] bg-[var(--card)] rounded-2xl space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-bold flex items-center gap-1">About You</label>
                                        <span className={`text-xs ${(formData.aboutYou || '').length > 1000 ? 'text-red-500' : 'text-[var(--foreground-muted)]'}`}>{(formData.aboutYou || '').length} / 1000</span>
                                    </div>
                                    <textarea
                                        value={formData.aboutYou || ''}
                                        onChange={e => setFormData({ ...formData, aboutYou: e.target.value })}
                                        placeholder="I'm a SaaS founder passionate about... I typically post about..."
                                        className="w-full h-32 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] focus:border-[var(--primary)] outline-none resize-none transition-all placeholder-[var(--foreground-muted)]/50 focus:ring-1 focus:ring-[var(--primary)]"
                                        maxLength={1000}
                                    />
                                    <p className="text-xs text-[var(--foreground-muted)]">
                                        This is the primary context used to create your content.
                                    </p>
                                </div>
                            </section>

                            {/* Personal Context */}
                            <section className="card p-6 border border-[var(--border)] bg-[var(--card)] rounded-2xl space-y-6">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        Personal Context
                                    </h2>
                                    <p className="text-sm text-[var(--foreground-muted)]">Your website, LinkedIn profile, or bio page (optional)</p>
                                </div>

                                <div className="space-y-3">
                                    {(formData.personalContext || []).map((item, i) => (
                                        <ContextItem
                                            key={item.id}
                                            item={item as { id: string; type: 'url' | 'text'; label: string; value: string }}
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
                            </section>

                            {/* Product Context */}
                            <section className="card p-6 border border-[var(--border)] bg-[var(--card)] rounded-2xl space-y-6">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        Product Context
                                    </h2>
                                    <p className="text-sm text-[var(--foreground-muted)]">Landing pages, product docs, or pitch materials (optional)</p>
                                </div>

                                <div className="space-y-3">
                                    {(formData.productContext || []).map((item, i) => (
                                        <ContextItem
                                            key={item.id}
                                            item={item as { id: string; type: 'url' | 'text'; label: string; value: string }}
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
                            </section>
                        </motion.div>
                    )}

                    {/* Preferences Tab */}
                    {activeTab === 'preferences' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <section className="card p-6 border border-[var(--border)] bg-[var(--card)] rounded-2xl space-y-6">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <SettingsIcon className="w-5 h-5 text-gray-500" />
                                    Automation Settings
                                </h2>

                                <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
                                    <div className="space-y-1">
                                        <div className="font-semibold text-lg">Auto-Publish Posts</div>
                                        <p className="text-sm text-[var(--foreground-muted)]">
                                            Automatically publish scheduled posts without manual confirmation.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.autoPublish}
                                            onChange={(e) => setFormData({ ...formData, autoPublish: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                                    </label>
                                </div>
                            </section>
                        </motion.div>
                    )}

                    {/* Integrations Tab */}
                    {activeTab === 'integrations' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            {/* X Connection */}
                            <div className={`
                                relative p-6 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-6
                                ${isXConnected
                                    ? 'bg-[var(--card)] border-[var(--border-hover)]'
                                    : 'bg-[var(--card)] border-[var(--border)]'}
                            `}>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-black text-white dark:bg-white dark:text-black rounded-xl">
                                        <Twitter className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">X (Twitter)</h4>
                                        <p className="text-sm text-[var(--foreground-muted)]">
                                            {isXConnected ? 'Connected via API' : 'Not connected'}
                                        </p>
                                    </div>
                                </div>

                                {isXConnected ? (
                                    <div className="flex items-center gap-4">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            Active
                                        </span>
                                        <a
                                            href="/api/auth/x/init?redirect=/dashboard/settings"
                                            className="text-sm font-semibold text-[var(--foreground-muted)] hover:text-[var(--primary)]"
                                        >
                                            Reconnect
                                        </a>
                                    </div>
                                ) : (
                                    <a
                                        href="/api/auth/x/init?redirect=/dashboard/settings"
                                        className="px-6 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold text-sm hover:opacity-90 transition-all border border-transparent dark:border-gray-200"
                                    >
                                        Connect
                                    </a>
                                )}
                            </div>

                            {/* LinkedIn Connection */}
                            <div className={`
                                relative p-6 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-6
                                ${isLiConnected
                                    ? 'bg-[var(--card)] border-[var(--border-hover)]'
                                    : 'bg-[var(--card)] border-[var(--border)]'}
                            `}>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#0A66C2] text-white rounded-xl">
                                        <Linkedin className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">LinkedIn</h4>
                                        <p className="text-sm text-[var(--foreground-muted)]">
                                            {isLiConnected ? 'Connected via API' : 'Not connected'}
                                        </p>
                                    </div>
                                </div>

                                {isLiConnected ? (
                                    <div className="flex items-center gap-4">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            Active
                                        </span>
                                        <a
                                            href="/api/auth/linkedin/init?redirect=/dashboard/settings"
                                            className="text-sm font-semibold text-[var(--foreground-muted)] hover:text-[var(--primary)]"
                                        >
                                            Reconnect
                                        </a>
                                    </div>
                                ) : (
                                    <a
                                        href="/api/auth/linkedin/init?redirect=/dashboard/settings"
                                        className="px-6 py-2.5 rounded-xl bg-[#0A66C2] text-white font-bold text-sm hover:bg-[#004182] transition-all border border-transparent"
                                    >
                                        Connect
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Billing Tab */}
                    {activeTab === 'billing' && (
                        <BillingSection />
                    )}
                </div>
            </div>
        </div>
    );
}
