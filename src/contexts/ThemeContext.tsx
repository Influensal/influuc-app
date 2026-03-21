'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('dark');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

    // Force application of dark theme regardless of system
    const applyTheme = () => {
        setResolvedTheme('dark');
        setThemeState('dark');

        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.classList.add('dark');

            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', '#030208');
            }
        }
    };

    const setTheme = () => {
        applyTheme();
    };

    const toggleTheme = () => {
        // No-op to prevent switching
    };

    useEffect(() => {
        applyTheme();
    }, []);

    return (
        <ThemeContext.Provider value={{ theme: 'dark', resolvedTheme: 'dark', setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
