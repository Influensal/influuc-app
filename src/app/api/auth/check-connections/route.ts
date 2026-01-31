/**
 * Check status of social connections
 * Returns which connections are expired or need reauthorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get all connections for this user
        const { data: connections, error } = await supabase
            .from('social_connections')
            .select('platform, connection_status, token_expires_at, last_validated_at')
            .eq('user_id', user.id);

        if (error) {
            console.error('Failed to fetch connections:', error);
            return NextResponse.json({ error: 'Failed to check connections' }, { status: 500 });
        }

        const now = new Date();
        const expired: { platform: string; expired_at?: string }[] = [];
        const active: string[] = [];

        for (const conn of connections || []) {
            // Check if explicitly expired
            if (conn.connection_status === 'expired' || conn.connection_status === 'revoked') {
                expired.push({
                    platform: conn.platform,
                    expired_at: conn.token_expires_at
                });
                continue;
            }

            // Check if token has expired based on expiry time
            if (conn.token_expires_at) {
                const expiryDate = new Date(conn.token_expires_at);
                if (expiryDate < now) {
                    expired.push({
                        platform: conn.platform,
                        expired_at: conn.token_expires_at
                    });
                    continue;
                }
            }

            // Check if last validation was too long ago (> 7 days)
            // This catches cases where we don't have explicit expiry
            if (conn.last_validated_at) {
                const lastValidated = new Date(conn.last_validated_at);
                const daysSinceValidation = (now.getTime() - lastValidated.getTime()) / (1000 * 60 * 60 * 24);

                if (daysSinceValidation > 7) {
                    // Mark as potentially expired - should revalidate
                    expired.push({ platform: conn.platform });
                    continue;
                }
            }

            active.push(conn.platform);
        }

        return NextResponse.json({
            expired,
            active,
            total: connections?.length || 0
        });

    } catch (error) {
        console.error('Connection check error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
