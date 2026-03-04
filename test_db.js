const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zvhaadgzksnuyflyngci.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2aGFhZGd6a3NudXlmbHluZ2NpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODkwMzA3NSwiZXhwIjoyMDg0NDc5MDc1fQ.ig6FbMee57aIf3oHZ4AuliU0mEsFJwKEkDEbSQB3c5A';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPosts() {
    const { data, error } = await supabase
        .from('posts')
        .select('id, content, platform, format')
        .like('content', '%NaN%');

    if (error) {
        console.error('Error fetching posts:', error);
    } else {
        console.log('Posts containing NaN:', JSON.stringify(data, null, 2));
    }
}

checkPosts();
