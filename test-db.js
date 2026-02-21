const { createClient } = require('@supabase/supabase-js');

// To run this script, we need the env vars.
// We can just print them if needed, but easier to use the ones from process.env if we run it via dotenv.
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log("Checking spontaneous_ideas table...");
    const { data, error } = await supabase.from('spontaneous_ideas').select('*').limit(5);
    console.log("Data:", data);
    console.log("Error:", error);
}

check();
