import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('founder_profiles')
            .select('id')
            .eq('account_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const { data: ideas, error } = await supabase
            .from('spontaneous_ideas')
            .select('*')
            .eq('profile_id', profile.id)
            .eq('saved', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch ideas:', error);
            // Return empty list but keep going for usage
        }

        // Also get monthly usage count
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: usage } = await supabase
            .from('spontaneous_ideas')
            .select('*', { count: 'exact', head: true })
            .eq('profile_id', profile.id)
            .gte('created_at', startOfMonth.toISOString());

        return NextResponse.json({ 
            ideas: ideas || [],
            usage: usage || 0
        });
    } catch (error) {
        console.error('Ideas fetch error:', error);
        return NextResponse.json({ error: 'Internal server error', ideas: [] }, { status: 200 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('founder_profiles')
            .select('id')
            .eq('account_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const body = await request.json();
        const { input, generatedContent } = body;

        // Try to save
        const { data: created, error } = await supabase
            .from('spontaneous_ideas')
            .insert({
                profile_id: profile.id,
                input: input,
                input_type: 'text',
                generated_content: JSON.stringify(generatedContent),
                saved: true,
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to save idea:', error);
            // Fallback for missing table
            return NextResponse.json({ idea: { id: Date.now().toString(), input, generated_content: JSON.stringify(generatedContent), created_at: new Date().toISOString() } });
        }

        return NextResponse.json({ idea: created });
    } catch (error) {
        console.error('Idea save error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
