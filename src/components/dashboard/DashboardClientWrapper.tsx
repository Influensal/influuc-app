'use client';

import { ReactNode } from 'react';
import ConnectionStatusBanner from './ConnectionStatusBanner';

interface DashboardClientWrapperProps {
    children: ReactNode;
}

export default function DashboardClientWrapper({ children }: DashboardClientWrapperProps) {
    return (
        <>
            <ConnectionStatusBanner />
            {children}
        </>
    );
}
