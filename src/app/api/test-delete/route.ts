import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();

        // Find a valid profile first (hack for testing)
        const { data: profile } = await supabase
            .from('founder_profiles')
            .select('id, account_id')
            .limit(1)
            .single();

        if (!profile) return NextResponse.json({ error: 'No profile' });

        // Find an idea to delete
        const { data: ideas } = await supabase
            .from('spontaneous_ideas')
            .select('id')
            .eq('profile_id', profile.id)
            .limit(1);

        if (!ideas || ideas.length === 0) return NextResponse.json({ error: 'No ideas' });

        const ideaId = ideas[0].id;

        // Emulate the exact DELETE route logic exactly, but hardcoded ID
        const testId = ideaId;

        console.log("Mock DELETE. Attempting ID:", testId);

        // Assume Next 15 params promise:
        const mockParams = Promise.resolve({ id: testId });
        const { id } = await mockParams;

        const { error } = await supabase
            .from('spontaneous_ideas')
            .delete()
            .eq('id', id)
            .eq('profile_id', profile.id);

        if (error) {
            return NextResponse.json({ error: 'Supabase Error', details: error });
        }

        return NextResponse.json({ success: true, deletedId: id });
    } catch (e: any) {
        return NextResponse.json({ error: 'Caught exception', message: e.message, stack: e.stack });
    }
}
