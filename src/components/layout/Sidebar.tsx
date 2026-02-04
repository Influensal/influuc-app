'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Twitter,
    Linkedin,
    Lightbulb,
    Settings,
    User,
    LogOut,
    Moon,
    Sun,
    Sparkles,
    ChevronDown,
    Archive,
} from 'lucide-react';
import { useTheme, useAuth } from '@/contexts';

interface SidebarProps {
    profileName?: string;
}

interface UserProfile {
    name: string;
    platforms: {
        x: boolean;
        linkedin: boolean;
    };
}

// Group Account, Billing, and Settings into one navigation item to reduce clutter?
// Or keep separate as requested ("Settings, Billings, Accounts and shit pages")
const bottomNavItems = [
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ profileName = 'Demo Founder' }: SidebarProps) {
    const pathname = usePathname();
    const { resolvedTheme, toggleTheme } = useTheme();
    const { signOut, user } = useAuth(); // Use auth context
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    // Fetch user profile to get selected platforms
    useEffect(() => {
        async function fetchProfile() {
            try {
                const response = await fetch('/api/profile');
                if (response.ok) {
                    const data = await response.json();
                    setUserProfile(data.profile);
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            }
        }
        // Only fetch if we have a user (or in demo mode)
        fetchProfile();
    }, []);

    // Build navigation items based on user's selected platforms
    const mainNavItems = [
        { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, alwaysShow: true },
    ];

    // Only add platform links if user has selected them
    if (userProfile?.platforms?.x) {
        mainNavItems.push({ href: '/dashboard/x', label: 'X', icon: Twitter, alwaysShow: false });
    }
    if (userProfile?.platforms?.linkedin) {
        mainNavItems.push({ href: '/dashboard/linkedin', label: 'LinkedIn', icon: Linkedin, alwaysShow: false });
    }

    // Always show Ideas and Library
    mainNavItems.push({ href: '/dashboard/ideas', label: 'Spontaneous Ideas', icon: Lightbulb, alwaysShow: true });
    // Carousels
    mainNavItems.push({ href: '/dashboard/carousels', label: 'Carousels', icon: Archive, alwaysShow: true });
    mainNavItems.push({ href: '/dashboard/library', label: 'Content Library', icon: Archive, alwaysShow: true });

    const displayName = userProfile?.name || profileName;

    return (
        <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className="sidebar"
        >
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Sparkles className="w-5 h-5" />
                </div>
                <span className="sidebar-logo-text">Influuc</span>
            </div>

            {/* User Profile - Static Display (No multiple profiles) */}
            <div className="mb-8">
                <div className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[var(--background)] border border-[var(--border)]">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-bold truncate">{displayName}</p>
                        <p className="text-xs text-[var(--foreground-muted)] truncate">{user?.email || 'Founder Plan'}</p>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <div className="sidebar-section flex-1">
                <p className="sidebar-section-title">Main Menu</p>
                <nav className="sidebar-nav">
                    {mainNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                            >
                                <Icon className="sidebar-link-icon" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Bottom Navigation */}
            <div className="sidebar-section">
                <p className="sidebar-section-title">System</p>
                <nav className="sidebar-nav">
                    {bottomNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                            >
                                <Icon className="sidebar-link-icon" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="sidebar-link w-full"
                    >
                        {resolvedTheme === 'dark' ? (
                            <Sun className="sidebar-link-icon" />
                        ) : (
                            <Moon className="sidebar-link-icon" />
                        )}
                        <span>{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>

                    {/* Logout */}
                    <button
                        onClick={() => signOut()}
                        className="sidebar-link w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <LogOut className="sidebar-link-icon" />
                        <span>Sign Out</span>
                    </button>
                </nav>
            </div>
        </motion.aside>
    );
}
