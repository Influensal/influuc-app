const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
    console.log("Fetching an idea to delete...");
    const { data: ideas } = await supabase.from('spontaneous_ideas').select('*').limit(1);

    if (!ideas || ideas.length === 0) {
        console.log("No ideas found.");
        return;
    }

    const idea = ideas[0];
    console.log("Attempting to delete idea:", idea.id);

    // Using the same syntax as the route
    const { data, error } = await supabase
        .from('spontaneous_ideas')
        .delete()
        .eq('id', idea.id)
        .eq('profile_id', idea.profile_id);

    console.log("Delete result data:", data);
    console.log("Delete result error:", error);
}

testDelete();
