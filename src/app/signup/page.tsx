'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, ArrowRight, CheckCircle2, Mail } from 'lucide-react';

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

    const handleGoogleSignup = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred with Google Signup');
            setIsLoading(false);
        }
    };

    if (emailSent) {
        return (
            <div className="min-h-screen grid lg:grid-cols-2">
                {/* Left: Success State */}
                <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-20 xl:px-24 bg-[var(--background)]">
                    <div className="w-full max-w-sm mx-auto text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Mail className="w-8 h-8" />
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
                                <ArrowRight className="w-4 h-4" />
                                Return to Sign In
                            </Link>
                        </div>

                        <p className="mt-8 text-sm text-[var(--foreground-muted)]">
                            Didn't receive the email? <button onClick={() => setEmailSent(false)} className="text-[var(--primary)] hover:underline">Try again</button> or check your spam folder.
                        </p>
                    </div>
                </div>

                {/* Right: Visual (Same as before) */}
                <div className="hidden lg:flex flex-col justify-center bg-[var(--background-secondary)] relative overflow-hidden p-20">
                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
                    <div className="relative z-10 max-w-lg">
                        <h2 className="text-3xl font-medium leading-tight text-[var(--foreground)] mb-4">
                            Almost there.
                        </h2>
                        <p className="text-[var(--foreground-muted)] text-lg">
                            Your personal AI content director is ready to be unleashed.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left: Form */}
            <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-20 xl:px-24 bg-[var(--background)]">
                <div className="w-full max-w-sm mx-auto">
                    <div className="mb-10">
                        <Link href="/" className="text-2xl font-bold tracking-tight mb-2 block">Influuc</Link>
                        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">Create an account</h1>
                        <p className="text-[var(--foreground-muted)]">Join hundreds of founders reclaiming their time.</p>
                    </div>

                    <button
                        onClick={handleGoogleSignup}
                        type="button"
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--background-secondary)] transition-all mb-6"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Sign up with Google
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[var(--border)]"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-[var(--background)] text-[var(--foreground-muted)]">Or continue with email</span>
                        </div>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
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
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Create Account <ArrowRight className="w-4 h-4" />
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
            <div className="hidden lg:flex flex-col justify-center bg-[var(--background-secondary)] relative overflow-hidden p-20">
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
                <div className="relative z-10 max-w-lg">
                    {/* Visual Element */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-[var(--card)] p-4 rounded-2xl shadow-lg border border-[var(--border)]"
                        >
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                            </div>
                            <p className="text-xs text-[var(--foreground-muted)] mb-1">Monday 10:00 AM</p>
                            <p className="text-sm font-medium text-[var(--foreground)]">Why we're betting everything on AI...</p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-[var(--card)] p-4 rounded-2xl shadow-lg border border-[var(--border)] mt-8"
                        >
                            <div className="w-8 h-8 rounded-lg bg-black/10 dark:bg-white/10 text-[var(--foreground)] flex items-center justify-center mb-3">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                            </div>
                            <p className="text-xs text-[var(--foreground-muted)] mb-1">Wednesday 2:00 PM</p>
                            <p className="text-sm font-medium text-[var(--foreground)]">Thread: 5 lessons from scaling to $1M...</p>
                        </motion.div>
                    </div>

                    <h2 className="text-3xl font-medium leading-tight text-[var(--foreground)] mb-4">
                        Plan a week of content in 5 minutes.
                    </h2>
                    <p className="text-[var(--foreground-muted)] text-lg">
                        AI-powered content planning for founders who'd rather build than brainstorm.
                    </p>
                </div>
            </div>
        </div>
    );
}
