
import { createClient } from '@supabase/supabase-js';

import path from 'path';
import fs from 'fs';

// Manual .env loading
function loadEnv(filename: string) {
    try {
        const envPath = path.resolve(process.cwd(), filename);
        if (!fs.existsSync(envPath)) return;
        console.log(`Loading ${filename}...`);
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;

            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();

                // Handle quotes
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }

                if (!process.env[key]) process.env[key] = value;
            }
        });
    } catch (e) {
        console.warn(`Could not load ${filename}`);
    }
}

loadEnv('.env.local');
loadEnv('.env');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectSlides() {
    // Get the most recent carousel post
    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('format', 'carousel')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching posts:', error);
        return;
    }

    if (!posts || posts.length === 0) {
        console.log('No carousel posts found.');
        return;
    }

    const post = posts[0];
    console.log(`Inspecting post: ${post.id}`);

    if (post.carousel_slides) {
        post.carousel_slides.forEach((slide: string, i: number) => {
            if (slide.includes('lab(')) {
                console.log(`\n[Slide ${i}] FAIL: Contains "lab("`);
                console.log(slide.substring(slide.indexOf('lab(') - 20, slide.indexOf('lab(') + 50));
            } else {
                console.log(`[Slide ${i}] OK: No "lab(" found`);
            }
        });
    } else {
        console.log('No slides in this post.');
    }
}

inspectSlides();
