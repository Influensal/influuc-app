import * as cheerio from 'cheerio';

export interface ScrapedWebsiteData {
    title: string;
    description: string;
    content: string;
    headings: string[];
    links: { text: string; href: string }[];
}

/**
 * Scrape a website URL and extract relevant business information
 */
export async function scrapeWebsite(url: string): Promise<ScrapedWebsiteData> {
    try {
        // Validate URL
        const validUrl = new URL(url);

        // Fetch the page
        const response = await fetch(validUrl.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Influuc/1.0; +https://influuc.com)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove script and style elements
        $('script, style, nav, footer, header, iframe, noscript').remove();

        // Extract title
        const title = $('title').text().trim() ||
            $('h1').first().text().trim() ||
            '';

        // Extract meta description
        const description = $('meta[name="description"]').attr('content') ||
            $('meta[property="og:description"]').attr('content') ||
            '';

        // Extract headings
        const headings: string[] = [];
        $('h1, h2, h3').each((_, el) => {
            const text = $(el).text().trim();
            if (text && text.length < 200) {
                headings.push(text);
            }
        });

        // Extract main content
        const mainContent: string[] = [];

        // Try to find main content areas
        const contentSelectors = ['main', 'article', '[role="main"]', '.content', '#content', '.main'];
        let contentArea = $('body');

        for (const selector of contentSelectors) {
            if ($(selector).length > 0) {
                contentArea = $(selector).first();
                break;
            }
        }

        contentArea.find('p, li').each((_, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 20 && text.length < 500) {
                mainContent.push(text);
            }
        });

        // Extract important links (avoid navigation)
        const links: { text: string; href: string }[] = [];
        contentArea.find('a').each((_, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href');
            if (text && href && text.length > 2 && text.length < 100) {
                // Only include internal and relevant links
                if (!href.startsWith('#') && !href.includes('javascript:')) {
                    links.push({ text, href });
                }
            }
        });

        // Combine and clean content
        const content = mainContent.slice(0, 20).join('\n\n');

        return {
            title,
            description,
            content: content.slice(0, 5000), // Limit to ~5000 chars
            headings: headings.slice(0, 10),
            links: links.slice(0, 10),
        };
    } catch (error) {
        console.error('Error scraping website:', error);
        throw new Error(`Failed to scrape website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Extract a concise business summary from scraped data
 */
export function extractBusinessSummary(data: ScrapedWebsiteData): string {
    const parts: string[] = [];

    if (data.title) {
        parts.push(`Company: ${data.title}`);
    }

    if (data.description) {
        parts.push(`About: ${data.description}`);
    }

    if (data.headings.length > 0) {
        parts.push(`Key areas: ${data.headings.slice(0, 5).join(', ')}`);
    }

    if (data.content) {
        parts.push(`Details: ${data.content.slice(0, 1000)}`);
    }

    return parts.join('\n\n');
}
