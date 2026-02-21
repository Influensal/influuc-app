/**
 * Weekly Goal Reminder Cron Job
 * Runs daily at 6 AM UTC to send "Pick your goal" reminders
 * 
 * Does NOT auto-generate content - user triggers that via /api/generation/start
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const maxDuration = 60;

import { sendWeekReadyEmail } from '@/lib/email/resend';

// Create admin client (bypasses RLS)
function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.warn('[Weekly Reminder Cron] Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    console.log(`[Weekly Reminder Cron] Running at ${now.toISOString()}`);

    try {
        // Get profiles due for generation (next_generation_date <= today)
        // Fetch FULL profile data needed for generation
        const { data: dueProfiles, error: queryError } = await supabase
            .from('founder_profiles')
            .select('*')
            .lte('next_generation_date', now.toISOString());

        if (queryError) {
            console.error('[Weekly Cron] Query error:', queryError);
            return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
        }

        if (!dueProfiles || dueProfiles.length === 0) {
            console.log('[Weekly Cron] No users due for generation/reminders');
            return NextResponse.json({
                message: 'No users due',
                date: today,
                processed: 0
            });
        }

        console.log(`[Weekly Cron] Found ${dueProfiles.length} profiles to process`);

        let generatedCount = 0;
        let remindedCount = 0;
        let failedCount = 0;

        for (const profile of dueProfiles) {
            try {
                // Get user email
                const { data: userData } = await supabase.auth.admin.getUserById(profile.account_id);
                const userEmail = userData?.user?.email;

                if (!userEmail) {
                    console.warn(`[Weekly Cron] No email for user ${profile.account_id}`);
                    continue;
                }

                // ============================================================
                // NOTIFY USER (Weekly Review)
                // ============================================================

                // Always notify if due, regardless of goal status
                if (!profile.awaiting_goal_input) {
                    // Mark as notified
                    await supabase
                        .from('founder_profiles')
                        .update({ awaiting_goal_input: true })
                        .eq('id', profile.id);

                    // Send "Strategy Ready" email
                    // Using the existing helper defined below
                    await sendGoalReminderEmail(
                        userEmail,
                        profile.company_name || 'there'
                    );

                    // Create in-app notification
                    await supabase
                        .from('notifications')
                        .insert({
                            account_id: profile.account_id,
                            type: 'week_ready',
                            title: "Your Weekly Strategy is Ready! 🚀",
                            message: 'Review last week\'s performance and generate your new content plan.',
                            action_url: '/dashboard'
                        });

                    remindedCount++;
                    console.log(`[Weekly Cron] Notified user ${profile.account_id} for review`);
                }

            } catch (err) {
                console.error(`[Weekly Cron] Failed for profile ${profile.id}:`, err);
                failedCount++;
            }
        }

        return NextResponse.json({
            message: 'Weekly cron complete',
            date: today,
            stats: {
                processed: dueProfiles.length,
                generated: generatedCount,
                reminded: remindedCount,
                failed: failedCount
            }
        });

    } catch (error) {
        console.error('[Weekly Cron] Unexpected error:', error);
        return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
    }
}

// Helper for labels
function getGoalLabel(goal: string): string {
    const labels: Record<string, string> = {
        recruiting: 'Attracting Talent',
        fundraising: 'Investor Attention',
        sales: 'Lead Generation',
        credibility: 'Building Authority',
        growth: 'Audience Growth',
        balanced: 'Balanced Mix'
    };
    return labels[goal] || goal;
}

/**
 * Send "Pick your goal" reminder email
 */
async function sendGoalReminderEmail(userEmail: string, userName: string): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
        console.warn('[Email] RESEND_API_KEY not configured, skipping reminder email');
        return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://influuc.com';
    const fromEmail = process.env.EMAIL_FROM || 'Influuc <noreply@influuc.com>';

    await resend.emails.send({
        from: fromEmail,
        to: userEmail,
        subject: "🎯 What's your focus this week?",
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #18181b;">
                🚀 Influuc
            </h1>
        </div>
        
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
                Hey ${userName}! 👋
            </h2>
            
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #52525b;">
                It's time to create this week's content. But first...
            </p>
            
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
                <p style="margin: 0; font-size: 20px; font-weight: 600; color: white;">
                    What do you want to achieve this week?
                </p>
            </div>
            
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #52525b;">
                Recruiting? Fundraising? Building credibility? Tell us your focus, and we'll generate content optimized for that goal.
            </p>
            
            <a href="${appUrl}/dashboard" 
               style="display: inline-block; width: 100%; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 28px; border-radius: 10px; font-weight: 600; font-size: 16px; box-sizing: border-box;">
                Set My Goal & Generate Content →
            </a>
            
            <p style="margin: 24px 0 0; font-size: 14px; color: #71717a; text-align: center;">
                Takes less than 30 seconds
            </p>
        </div>
    </div>
</body>
</html>
        `.trim()
    });
}
