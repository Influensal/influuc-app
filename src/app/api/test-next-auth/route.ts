import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        console.log("---- TEST ROUTE RUNNING ----");
        const supabase = await createClient();

        // Let's manually trigger the same Supabase fetch as the frontend does
        const { data: { user } } = await supabase.auth.getUser();
        console.log("User:", user?.id);

        if (!user) {
            console.log("No user");
            return NextResponse.json({ error: 'Unauthorized' });
        }

        const { data: profile } = await supabase
            .from('founder_profiles')
            .select('id')
            .eq('account_id', user.id)
            .single();

        console.log("Profile:", profile?.id);

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' });
        }

        // Just fetch one idea
        const { data: ideas } = await supabase
            .from('spontaneous_ideas')
            .select('id')
            .eq('profile_id', profile.id)
            .limit(1);

        console.log("Ideas:", ideas);

        if (!ideas || ideas.length === 0) return NextResponse.json({ error: 'No ideas left to delete' });

        const ideaId = ideas[0].id;

        // Try deleting it
        const { error } = await supabase
            .from('spontaneous_ideas')
            .delete()
            .eq('id', ideaId)
            .eq('profile_id', profile.id);

        console.log("Supabase error from delete:", error);

        if (error) {
            throw new Error(error.message);
        }

        return NextResponse.json({ success: true, deleted: ideaId });
    } catch (e: any) {
        console.error("CATCH BLOCK!", e);
        return NextResponse.json({ error: e.message, stack: e.stack });
    }
}
