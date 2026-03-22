'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

import { useTheme, useAuth, usePosts } from '@/contexts';
import { parseTier, getTierLimits } from '@/lib/subscription';

// Group Account, Billing, and Settings into one navigation item to reduce clutter?
// Or keep separate as requested ("Settings, Billings, Accounts and shit pages")
interface NavItem {
    href: string;
    label: string;
    icon: string;
    alwaysShow: boolean;
    locked?: boolean;
}

const bottomNavItems: NavItem[] = [
    { href: '/dashboard/settings', label: 'Settings', icon: 'fi-sr-settings', alwaysShow: true },
];

export function Sidebar() {
    const pathname = usePathname();
    const { resolvedTheme, toggleTheme } = useTheme();
    const { signOut } = useAuth();
    const { profile: userProfile } = usePosts();

    // Build navigation items based on user's selected platforms
    const mainNavItems: NavItem[] = [
        { href: '/dashboard', label: 'Overview', icon: 'fi-sr-apps', alwaysShow: true },
    ];

    // Only add platform links if user has selected them
    if (userProfile?.platforms?.x) {
        mainNavItems.push({ href: '/dashboard/x', label: 'X', icon: 'fi-brands-twitter', alwaysShow: false });
    }
    if (userProfile?.platforms?.linkedin) {
        mainNavItems.push({ href: '/dashboard/linkedin', label: 'LinkedIn', icon: 'fi-brands-linkedin', alwaysShow: false });
    }

    // Always show Ideas, Carousels and Library
    const tier = parseTier(userProfile?.subscriptionTier);
    const limits = getTierLimits(tier);

    mainNavItems.push({ href: '/dashboard/ideas', label: 'Spontaneous Ideas', icon: 'fi-sr-bulb', alwaysShow: true });
    mainNavItems.push({ 
        href: '/dashboard/carousels', 
        label: 'Carousels', 
        icon: 'fi-sr-layers', 
        alwaysShow: true,
        locked: !limits.hasOnDemandCarousels 
    });
    mainNavItems.push({ 
        href: '/dashboard/newsjacking', 
        label: 'Newsjacking', 
        icon: 'fi-sr-newspaper', 
        alwaysShow: true,
        locked: !limits.hasNewsJacking 
    });
    mainNavItems.push({ href: '/dashboard/library', label: 'Content Library', icon: 'fi-sr-folder', alwaysShow: true });


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
                    <i className="fi fi-sr-magic-wand w-5 h-5 flex items-center justify-center"></i>
                </div>
                <span className="sidebar-logo-text">Influuc</span>
            </div>

            {/* Main Navigation */}
            <div className="sidebar-section flex-1">
                <p className="sidebar-section-title">Main Menu</p>
                <nav className="sidebar-nav">
                    {mainNavItems.map((item) => {
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                            >
                                <i className={`fi ${item.icon} sidebar-link-icon flex items-center justify-center`}></i>
                                <span>{item.label}</span>
                                {item.locked && (
                                    <i className="fi fi-sr-lock text-[10px] ml-auto opacity-40"></i>
                                )}
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
                        const isActive = pathname === item.href || pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                            >
                                <i className={`fi ${item.icon} sidebar-link-icon flex items-center justify-center`}></i>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}

                    {/* Logout */}
                    <button
                        onClick={() => signOut()}
                        className="sidebar-link w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <i className="fi fi-sr-sign-out-alt sidebar-link-icon flex items-center justify-center"></i>
                        <span>Sign Out</span>
                    </button>
                </nav>
            </div>
        </motion.aside>
    );
}
