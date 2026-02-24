import { NextRequest, NextResponse } from 'next/server';
import { tavily } from '@tavily/core';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { topic } = await req.json();

        if (!topic) {
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
        }

        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'TAVILY_API_KEY is missing in environment variables' }, { status: 500 });
        }

        const tvly = tavily({ apiKey });

        // Search for recent news using Tavily with advanced depth
        const response = await tvly.search(topic, {
            searchDepth: "advanced",
            topic: "general", // "general" works better when strictly forcing niche domains than "news"
            includeDomains: [
                "news.ycombinator.com", // Hacker News only
                "producthunt.com"       // Product Hunt only
            ],
            includeImages: true,
            days: 5, // Expanded from 3 to 5 to accommodate the high specificity of HN/PH launches
        });

        return NextResponse.json({ results: response.results });
    } catch (error: any) {
        console.error('Tavily search error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error during search' }, { status: 500 });
    }
}
