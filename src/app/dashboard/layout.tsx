import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import DashboardClientWrapper from '@/components/dashboard/DashboardClientWrapper';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    // 1. Check Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/auth/signout');
    }

    // 2. Check Profile Existence (Force Onboarding)
    const { data: profiles, error } = await supabase
        .from('founder_profiles')
        .select('id')
        .eq('account_id', user.id)
        .limit(1);

    console.log('[Dashboard Layout] User:', user.id, 'Profiles:', profiles, 'Error:', error);

    if (!profiles || profiles.length === 0) {
        redirect('/onboarding');
    }

    return (
        <div className="flex h-screen bg-[var(--background)]">
            <Sidebar />
            <main className="flex-1 overflow-y-auto ml-[320px]">
                <div className="p-8 md:p-12 max-w-[1600px] mx-auto">
                    <DashboardClientWrapper>
                        {children}
                    </DashboardClientWrapper>
                </div>
            </main>
        </div>
    );
}

