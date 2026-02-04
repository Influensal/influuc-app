
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CarouselEditor from '@/components/carousels/CarouselEditor';
import { CarouselData } from '@/components/carousels/types'; // Assuming this exists

// Define Page Props manually for Next.js 15+ if needed, but standard prop works generally
interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function CarouselEditorPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // Fetch Post
    // 1. Get Profile ID first
    const { data: profile } = await supabase
        .from('founder_profiles')
        .select('id')
        .eq('account_id', user.id)
        .single();

    if (!profile) {
        console.error('Profile not found for user', user.id);
        redirect('/dashboard');
    }

    // 2. Fetch Post using Profile ID
    const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .eq('profile_id', profile.id)
        .single();

    if (error || !post) {
        console.error('Failed to fetch carousel:', error ? JSON.stringify(error, null, 2) : 'Post not found');
        redirect('/dashboard/carousels');
    }

    if (post.format !== 'carousel') {
        redirect('/dashboard/carousels');
    }

    // Parse Content
    let carouselData: CarouselData;
    try {
        carouselData = JSON.parse(post.content);
    } catch {
        // Fallback for empty or invalid content
        carouselData = {
            slides: [],
            theme: 'swiss',
            settings: { showPersonalBranding: true, showPageNumbers: true }
        };
    }

    // Pass postId to component for saving
    return (
        <CarouselEditor
            initialData={carouselData}
            postId={post.id}
        />
    );
}
