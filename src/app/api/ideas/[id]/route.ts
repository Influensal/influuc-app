import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createServerClient();
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

        console.log(`[DELETE IDEA] Attempting to delete ID: ${id} for profile: ${profile.id}`);

        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error } = await supabaseAdmin
            .from('spontaneous_ideas')
            .delete()
            .eq('id', id)
            .eq('profile_id', profile.id); // Ensure user owns the idea

        if (error) {
            console.error('[DELETE IDEA] Supabase error:', error);
            return NextResponse.json({ error: 'Failed to delete idea', details: error.message }, { status: 500 });
        }

        console.log(`[DELETE IDEA] Successfully deleted ID: ${id}`);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[DELETE IDEA] Exception caught:', error);
        return NextResponse.json({ error: 'Internal server error', message: error?.message, stack: error?.stack }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createServerClient();
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
        const { generatedContent } = body;

        // Note: Using Admin Client temporarily just like DELETE
        // to bypass missing DB RLS rule while ensuring profile_id matches
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: updated, error } = await supabaseAdmin
            .from('spontaneous_ideas')
            .update({
                generated_content: JSON.stringify(generatedContent),
            })
            .eq('id', id)
            .eq('profile_id', profile.id)
            .select()
            .single();

        if (error) {
            console.error('[PATCH IDEA] Supabase error:', error);
            return NextResponse.json({ error: 'Failed to update idea', details: error.message }, { status: 500 });
        }

        return NextResponse.json({ idea: updated });
    } catch (error: any) {
        console.error('[PATCH IDEA] Exception caught:', error);
        return NextResponse.json({ error: 'Internal server error', message: error?.message, stack: error?.stack }, { status: 500 });
    }
}
