'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';


export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailSent, setEmailSent] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                },
            });

            if (signUpError) {
                setError(signUpError.message);
                return;
            }

            // Show success state
            setEmailSent(true);

        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };



    if (emailSent) {
        return (
            <div className="min-h-screen bg-[var(--background-secondary)] flex items-center justify-center p-4 sm:p-8">
                <div className="w-full max-w-6xl bg-[var(--card)] rounded-2xl md:rounded-[32px] shadow-2xl overflow-hidden grid lg:grid-cols-2 border border-[var(--border)] min-h-[700px]">
                    {/* Left: Success State */}
                    <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 py-12">
                        <div className="w-full max-w-sm mx-auto text-center">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <i className={`fi fi-sr-envelope flex items-center justify-center ${"w-8 h-8"}`}  ></i>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-4">Check your email</h1>
                            <p className="text-[var(--foreground-muted)] mb-8">
                                We've sent a confirmation link to <span className="font-medium text-[var(--foreground)]">{email}</span>. Please check your inbox to activate your account.
                            </p>

                            <div className="space-y-4">
                                <Link
                                    href="/login"
                                    className="btn btn-outline w-full py-3 flex items-center justify-center gap-2"
                                >
                                    <i className={`fi fi-sr-angle-right flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                    Return to Sign In
                                </Link>
                            </div>

                            <p className="mt-8 text-sm text-[var(--foreground-muted)]">
                                Didn't receive the email? <button onClick={() => setEmailSent(false)} className="text-[var(--primary)] hover:underline">Try again</button> or check your spam folder.
                            </p>
                        </div>
                    </div>

                    {/* Right: Visual (Same as before) */}
                    <div className="hidden lg:flex p-3 sm:p-4 lg:p-6 relative">
                        <div className="w-full h-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] rounded-2xl md:rounded-[28px] flex flex-col justify-center p-12 relative overflow-hidden shadow-inner">
                            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
                            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white opacity-10 blur-3xl rounded-full mix-blend-overlay pointer-events-none"></div>
                            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white opacity-10 blur-3xl rounded-full mix-blend-overlay pointer-events-none"></div>

                            <div className="relative z-10 max-w-lg">
                                <h2 className="text-3xl font-medium leading-tight text-white mb-4">
                                    Almost there.
                                </h2>
                                <p className="text-white/80 text-lg">
                                    Your personal AI content director is ready to be unleashed.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background-secondary)] flex items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-6xl bg-[var(--card)] rounded-2xl md:rounded-[32px] shadow-2xl overflow-hidden grid lg:grid-cols-2 border border-[var(--border)] min-h-[700px]">
                {/* Left: Form */}
                <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 py-12">
                    <div className="w-full max-w-sm mx-auto">
                        <div className="mb-10">
                            <Link href="/" className="text-2xl font-bold tracking-tight mb-2 block">Influuc</Link>
                            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">Create an account</h1>
                            <p className="text-[var(--foreground-muted)]">Join hundreds of founders reclaiming their time.</p>
                        </div>



                        <form onSubmit={handleSignup} className="space-y-4">
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
                                    autoComplete="new-password"
                                    required
                                    minLength={6}
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
                                        Create Account <i className={`fi fi-sr-angle-right flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="mt-8 text-center text-sm text-[var(--foreground-muted)]">
                            Already have an account?{' '}
                            <Link href="/login" className="font-medium text-[var(--foreground)] hover:underline">
                                Sign in
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
                            {/* Visual Element */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-white/10 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/20"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center mb-3">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                                    </div>
                                    <p className="text-xs text-white/70 mb-1">Monday 10:00 AM</p>
                                    <p className="text-sm font-medium text-white">Why we're betting everything on AI...</p>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-white/10 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/20 mt-8"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center mb-3">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                    </div>
                                    <p className="text-xs text-white/70 mb-1">Wednesday 2:00 PM</p>
                                    <p className="text-sm font-medium text-white">Thread: 5 lessons from scaling to $1M...</p>
                                </motion.div>
                            </div>

                            <h2 className="text-3xl font-medium leading-tight text-white mb-4">
                                Plan a week of content in 5 minutes.
                            </h2>
                            <p className="text-white/80 text-lg">
                                AI-powered content planning for founders who'd rather build than brainstorm.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
