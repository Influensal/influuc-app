/**
 * Resend Email Service
 * Handles all transactional emails for Influuc
 */

import { Resend } from 'resend';

// Lazy initialization - only create client when needed
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
    if (!process.env.RESEND_API_KEY) {
        console.warn('[Email] RESEND_API_KEY not configured');
        return null;
    }
    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'Influuc <noreply@influuc.com>';

// ============================================
// EMAIL TYPES
// ============================================

export interface WeekReadyEmailData {
    userEmail: string;
    userName: string;
    xPostsCount: number;
    linkedinPostsCount: number;
    weekNumber: number;
    firstPostDate: string;
    autoPublish: boolean;
}

export interface SubscriptionExpiredEmailData {
    userEmail: string;
    userName: string;
}

export interface TrialEndingEmailData {
    userEmail: string;
    userName: string;
    daysRemaining: number;
}

// ============================================
// SEND WEEK READY EMAIL
// ============================================

export async function sendWeekReadyEmail(data: WeekReadyEmailData): Promise<boolean> {
    const totalPosts = data.xPostsCount + data.linkedinPostsCount;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://influuc.com';

    const platformSummary = [];
    if (data.xPostsCount > 0) platformSummary.push(`${data.xPostsCount} for X`);
    if (data.linkedinPostsCount > 0) platformSummary.push(`${data.linkedinPostsCount} for LinkedIn`);

    const modeMessage = data.autoPublish
        ? '✨ Posts will publish automatically at optimal times.'
        : '👆 Remember to manually publish when ready!';

    try {
        const resend = getResendClient();
        if (!resend) {
            console.warn('[Email] Email service not configured, skipping week ready email');
            return false;
        }

        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: data.userEmail,
            subject: `Your Week ${data.weekNumber} Content is Ready! 🎉`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Content is Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #18181b;">
                🚀 Influuc
            </h1>
        </div>
        
        <!-- Main Card -->
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
                Hey ${data.userName}! 👋
            </h2>
            
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #52525b;">
                Great news! Your Week ${data.weekNumber} content has been generated and is ready for action.
            </p>
            
            <!-- Stats -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 14px; color: rgba(255,255,255,0.8);">
                    THIS WEEK
                </p>
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: white;">
                    ${totalPosts} Posts
                </p>
                <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">
                    ${platformSummary.join(' • ')}
                </p>
            </div>
            
            <!-- Schedule Info -->
            <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #52525b;">
                    📅 First post scheduled for: <strong>${data.firstPostDate}</strong>
                </p>
            </div>
            
            <!-- Mode Reminder -->
            <p style="margin: 0 0 24px; font-size: 14px; color: #71717a;">
                ${modeMessage}
            </p>
            
            <!-- CTA Button -->
            <a href="${appUrl}/dashboard" 
               style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Review Your Content →
            </a>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 32px;">
            <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                © ${new Date().getFullYear()} Influuc. All rights reserved.
            </p>
            <p style="margin: 8px 0 0; font-size: 12px; color: #a1a1aa;">
                <a href="${appUrl}/dashboard/settings" style="color: #6366f1; text-decoration: none;">
                    Manage Email Preferences
                </a>
            </p>
        </div>
    </div>
</body>
</html>
            `.trim()
        });

        if (error) {
            console.error('[Email] Failed to send week ready email:', error);
            return false;
        }

        console.log(`[Email] Week ready email sent to ${data.userEmail}`);
        return true;
    } catch (error) {
        console.error('[Email] Error sending week ready email:', error);
        return false;
    }
}

// ============================================
// SEND SUBSCRIPTION EXPIRED EMAIL
// ============================================

export async function sendSubscriptionExpiredEmail(data: SubscriptionExpiredEmailData): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://influuc.com';

    try {
        const resend = getResendClient();
        if (!resend) {
            console.warn('[Email] Email service not configured, skipping subscription expired email');
            return false;
        }

        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: data.userEmail,
            subject: 'Your Influuc Subscription Has Expired',
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
                We miss you, ${data.userName}! 😢
            </h2>
            
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #52525b;">
                Your Influuc subscription has expired, which means we can't generate your weekly content anymore.
            </p>
            
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #52525b;">
                Resubscribe now to get back on track with consistent, high-quality content every week.
            </p>
            
            <a href="${appUrl}/dashboard/settings" 
               style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Resubscribe Now →
            </a>
        </div>
    </div>
</body>
</html>
            `.trim()
        });

        if (error) {
            console.error('[Email] Failed to send subscription expired email:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[Email] Error sending subscription expired email:', error);
        return false;
    }
}

// ============================================
// SEND TRIAL ENDING EMAIL
// ============================================

export async function sendTrialEndingEmail(data: TrialEndingEmailData): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://influuc.com';

    try {
        const resend = getResendClient();
        if (!resend) {
            console.warn('[Email] Email service not configured, skipping trial ending email');
            return false;
        }

        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: data.userEmail,
            subject: `Your Influuc trial ends in ${data.daysRemaining} day${data.daysRemaining > 1 ? 's' : ''}`,
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
                Hey ${data.userName}! ⏰
            </h2>
            
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #52525b;">
                Your free trial ends in <strong>${data.daysRemaining} day${data.daysRemaining > 1 ? 's' : ''}</strong>.
            </p>
            
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #52525b;">
                Don't lose your content momentum! Subscribe now to keep getting weekly AI-generated content tailored to your voice.
            </p>
            
            <a href="${appUrl}/dashboard/settings" 
               style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Subscribe Now →
            </a>
        </div>
    </div>
</body>
</html>
            `.trim()
        });

        if (error) {
            console.error('[Email] Failed to send trial ending email:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[Email] Error sending trial ending email:', error);
        return false;
    }
}
