import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { scrapeWebsite, extractBusinessSummary } from '@/lib/scraper';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 second timeout for scraping

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { url } = await request.json();

        if (!url || typeof url !== 'string') {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        // Validate URL format
        try {
            new URL(url);
        } catch {
            return NextResponse.json(
                { error: 'Invalid URL format' },
                { status: 400 }
            );
        }

        // Scrape the website
        const scrapedData = await scrapeWebsite(url);
        const summary = extractBusinessSummary(scrapedData);

        return NextResponse.json({
            success: true,
            data: {
                title: scrapedData.title,
                description: scrapedData.description,
                headings: scrapedData.headings,
                summary,
            },
        });
    } catch (error) {
        console.error('Error in scrape API:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to scrape website' },
            { status: 500 }
        );
    }
}
