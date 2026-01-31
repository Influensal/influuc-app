'use client';

import { Suspense, ReactNode } from 'react';
import ConnectionStatusBanner from './ConnectionStatusBanner';
import TierUpgradeModal from './TierUpgradeModal';

interface DashboardClientWrapperProps {
    children: ReactNode;
}

export default function DashboardClientWrapper({ children }: DashboardClientWrapperProps) {
    return (
        <>
            <ConnectionStatusBanner />
            <Suspense fallback={null}>
                <TierUpgradeModal />
            </Suspense>
            {children}
        </>
    );
}
