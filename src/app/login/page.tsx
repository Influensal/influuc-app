'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { motion } from 'framer-motion';


function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/dashboard';
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
                return;
            }

            router.push(returnUrl);
            router.refresh();
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <div className="min-h-screen bg-[var(--background-secondary)] flex items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-6xl bg-[var(--card)] rounded-2xl md:rounded-[32px] shadow-2xl overflow-hidden grid lg:grid-cols-2 border border-[var(--border)] min-h-[700px]">
                {/* Left: Form */}
                <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 py-12">
                    <div className="w-full max-w-sm mx-auto">
                        <div className="mb-10">
                            <Link href="/" className="text-2xl font-bold tracking-tight mb-2 block">Influuc</Link>
                            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">Welcome back</h1>
                            <p className="text-[var(--foreground-muted)]">Enter your details to access your account.</p>
                        </div>



                        <form onSubmit={handleLogin} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm flex items-center gap-2">
                                    <i className={`fi fi-sr-info flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                    {error}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-[var(--foreground-secondary)] px-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-[var(--background-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-colors"
                                    placeholder="name@company.com"
                                    autoComplete="email"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-[var(--foreground-secondary)] px-1">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-[var(--background-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-colors"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 rounded-xl flex items-center justify-center gap-2 mt-2 font-medium bg-white text-black hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <i className={`fi fi-sr-spinner flex items-center justify-center ${"w-5 h-5 animate-spin"}`}  ></i>
                                ) : (
                                    <>
                                        Sign In <i className={`fi fi-sr-angle-right flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="mt-8 text-center text-sm text-[var(--foreground-muted)]">
                            Don't have an account?{' '}
                            <Link href="/signup" className="font-medium text-[var(--foreground)] hover:underline">
                                Sign up for free
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Right: Visual */}
                <div className="hidden lg:flex p-3 sm:p-4 lg:p-6 relative">
                    <div className="w-full h-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] rounded-2xl md:rounded-[28px] flex flex-col justify-center p-12 relative overflow-hidden shadow-inner">
                        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
                        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white opacity-10 blur-3xl rounded-full mix-blend-overlay pointer-events-none"></div>
                        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white opacity-10 blur-3xl rounded-full mix-blend-overlay pointer-events-none"></div>

                        <div className="relative z-10 max-w-lg">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-8 shadow-2xl">
                                <motion.div
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                    </svg>
                                </motion.div>
                            </div>
                            <blockquote className="text-3xl font-medium leading-tight text-white mb-8">
                                "Stop brainstorming. Start posting. Influence is about showing up, not just thinking about it."
                            </blockquote>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white/20 border border-white/10" />
                                <div>
                                    <div className="font-semibold text-white">Automated by AI</div>
                                    <div className="text-sm text-white/70">Your Content Engine</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Wrapper with Suspense to fix useSearchParams prerender error
export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <i className={`fi fi-sr-spinner flex items-center justify-center ${"w-8 h-8 animate-spin text-[var(--primary)]"}`}  ></i>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
