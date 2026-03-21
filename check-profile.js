const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log("Checking founder_profiles...");
    const { data: profiles, error } = await supabase.from('founder_profiles').select('*');
    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }
    console.log("Profiles found:", profiles.length);
    profiles.forEach(p => {
        console.log(`- Profile: ${p.id}, Industry: ${p.industry}, Topics: ${JSON.stringify(p.topics)}`);
    });
}

check();
