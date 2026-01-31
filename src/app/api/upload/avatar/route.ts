/**
 * Upload avatar/selfie images to Supabase Storage
 * Used by Face Clone feature (Authority tier)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
// Max file size is handled in code (10MB limit per file)

export async function POST(request: NextRequest) {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const uploadedUrls: string[] = [];

        // Process each file
        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                const file = value;

                // Validate file type
                if (!file.type.startsWith('image/')) {
                    continue; // Skip non-image files
                }

                // Validate file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    return NextResponse.json(
                        { error: `File ${file.name} is too large. Max 10MB.` },
                        { status: 400 }
                    );
                }

                // Generate unique filename
                const ext = file.name.split('.').pop() || 'jpg';
                const filename = `${user.id}/${randomUUID()}.${ext}`;

                // Convert File to ArrayBuffer then Buffer
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filename, buffer, {
                        contentType: file.type,
                        upsert: false,
                    });

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    // If bucket doesn't exist, provide helpful error
                    if (uploadError.message.includes('does not exist')) {
                        return NextResponse.json(
                            { error: 'Storage bucket "avatars" not configured. Please create it in Supabase.' },
                            { status: 500 }
                        );
                    }
                    continue; // Skip this file but continue with others
                }

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filename);

                if (urlData?.publicUrl) {
                    uploadedUrls.push(urlData.publicUrl);
                }
            }
        }

        if (uploadedUrls.length === 0) {
            return NextResponse.json(
                { error: 'No valid images were uploaded' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            urls: uploadedUrls,
            count: uploadedUrls.length
        });

    } catch (error) {
        console.error('Avatar upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload images' },
            { status: 500 }
        );
    }
}
