
import { createClient } from '@/utils/supabase/server';

interface NewsItem {
    title: string;
    description: string;
    url: string;
    source: string;
    published_at: string;
    image_url?: string;
}

// Mock News Data (for initial version)
// In production, user would provide API key for GNews or similar
const MOCK_NEWS: NewsItem[] = [
    {
        title: "AI Regulation: New EU Act passed today",
        description: "The European Union has finalized the AI Act, setting a global standard for AI regulation.",
        url: "https://example.com/ai-regulation",
        source: "TechCrunch",
        published_at: new Date().toISOString()
    },
    {
        title: "SaaS Multiples hit 5-year low",
        description: "Public market SaaS valuations have compressed significantly, impacting private funding rounds.",
        url: "https://example.com/saas-multiples",
        source: "Bloomberg",
        published_at: new Date().toISOString()
    },
    {
        title: "The Rise of 'Founder Mode'",
        description: "Silicon Valley is buzzing about the return of hands-on founder leadership styles.",
        url: "https://example.com/founder-mode",
        source: "VentureBeat",
        published_at: new Date().toISOString()
    }
];

export async function fetchIndustryNews(industry: string): Promise<NewsItem[]> {
    console.log(`[NewsJacking] Fetching news for industry: ${industry}`);
    // Simulating API latency
    await new Promise(resolve => setTimeout(resolve, 800));

    // In future: Call external API (GNews, NewsAPI)
    // const res = await fetch(`https://newsapi.org/v2/everything?q=${industry}&apiKey=...`)

    return MOCK_NEWS;
}
