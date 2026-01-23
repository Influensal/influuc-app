'use client';

import { ThemeProvider, AuthProvider, PostProvider } from '@/contexts';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <PostProvider>
                    {children}
                </PostProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
