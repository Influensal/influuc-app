'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Account, FounderProfile } from '@/lib/supabase'; // Keep types from lib

interface User {
    id: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    account: Account | null;
    activeProfile: FounderProfile | null;
    profiles: FounderProfile[];
    isLoading: boolean;
    isAuthenticated: boolean;
    signOut: () => Promise<void>;
    setActiveProfile: (profile: FounderProfile) => void;
    refreshProfiles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [account, setAccount] = useState<Account | null>(null);
    const [profiles, setProfiles] = useState<FounderProfile[]>([]);
    const [activeProfile, setActiveProfileState] = useState<FounderProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Create the Supabase client for Client Components
    const supabase = createClient();

    // Fetch user's account and profiles
    const fetchUserData = async (userId: string) => {
        try {
            // Fetch account
            const { data: accountData } = await supabase
                .from('accounts')
                .select('*')
                .eq('id', userId)
                .single();

            if (accountData) {
                setAccount(accountData as Account);
            }

            // Fetch profiles
            const { data: profilesData } = await supabase
                .from('founder_profiles')
                .select('*')
                .eq('account_id', userId)
                .order('created_at', { ascending: true });

            if (profilesData && profilesData.length > 0) {
                setProfiles(profilesData as FounderProfile[]);

                // Set first profile as active if none selected
                const savedProfileId = localStorage.getItem('influuc-active-profile');
                const savedProfile = profilesData.find(p => p.id === savedProfileId);
                setActiveProfileState(savedProfile || profilesData[0]);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const refreshProfiles = async () => {
        if (user) {
            await fetchUserData(user.id);
        }
    };

    // Sign out
    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setAccount(null);
        setProfiles([]);
        setActiveProfileState(null);
        router.push('/login');
        router.refresh();
    };

    // Set active profile
    const setActiveProfile = (profile: FounderProfile) => {
        setActiveProfileState(profile);
        localStorage.setItem('influuc-active-profile', profile.id);
    };

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            setIsLoading(true);

            // Get initial session
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                setUser({ id: session.user.id, email: session.user.email || '' });
                await fetchUserData(session.user.id);
            }

            setIsLoading(false);
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    setUser({ id: session.user.id, email: session.user.email || '' });
                    // Only fetch data if we didn't have a user before (avoid double fetch on initial load)
                    if (!user) {
                        await fetchUserData(session.user.id);
                    }
                } else {
                    setUser(null);
                    setAccount(null);
                    setProfiles([]);
                    setActiveProfileState(null);
                }
                router.refresh(); // Refresh Server Components when auth state changes
            }
        );

        return () => subscription.unsubscribe();
    }, [supabase, router]); // Added dependencies

    return (
        <AuthContext.Provider
            value={{
                user,
                account,
                activeProfile,
                profiles,
                isLoading,
                isAuthenticated: !!user,
                signOut,
                setActiveProfile,
                refreshProfiles,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
