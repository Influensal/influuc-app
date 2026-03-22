import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const topic = searchParams.get('topic');

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase
            .from('founder_profiles')
            .select('subscription_tier')
            .eq('account_id', user.id)
            .single();

        if (profile?.subscription_tier !== 'authority') {
            return NextResponse.json({ error: 'Newsjacking is only available on the Authority plan.' }, { status: 403 });
        }

        console.log(`[NEWSJACKING API] Searching internal vault for: "${topic}"`);

        // 1. Sanitize the topic into clean keywords to match against our categories and text
        let targetKeywords = topic ? topic
            .replace(/newly launched /gi, '')
            .replace(/ tool or startup on Hacker News or Product Hunt/gi, '')
            .replace(/\//g, ' ')
            .split(' ')
            .map(w => w.trim())
            .filter(w => w.length > 1) : []; // Allow 2-letter words like 'AI'

        // 2. Fetch the latest high-quality articles from the vault
        const { data: articles, error } = await supabase
            .from('news_vault')
            .select('*')
            .order('published_at', { ascending: false })
            .limit(100); // Pull a large batch to score in-memory

        if (error) {
            console.error('[NEWSJACKING API] Supabase error:', error);
            throw new Error('Failed to fetch from news vault');
        }
        
        let filtered = articles || [];

        // 3. Score and Sort the articles against the user's focus keywords
        if (targetKeywords.length > 0) {
            filtered.forEach(article => {
                let matchScore = 0;
                const textTarget = (article.title + ' ' + (article.summary || '') + ' ' + (article.category || []).join(' ')).toLowerCase();
                
                targetKeywords.forEach(kw => {
                    const lkw = kw.toLowerCase();
                    // Heavily weight exact category matches
                    if (article.category && article.category.some((c: string) => c.toLowerCase().includes(lkw))) {
                        matchScore += 10;
                    }
                    // Weight title/summary matches
                    if (kw.length <= 3) {
                        const regex = new RegExp(`\\b${lkw}\\b`, 'i');
                        if (regex.test(textTarget)) {
                            matchScore += 3;
                        }
                    } else if (textTarget.includes(lkw)) {
                        matchScore += 3;
                    }
                });
                
                // Add base AI relevance score (1-10) to boost inherently good articles
                article._hybridScore = matchScore + (article.relevance_score || 5);

                // NOISE REDUCTION: If user provided keywords but this article matched NONE, 
                // penalize it heavily so it doesn't leak in from "Energy" or "Healthcare" 
                // unless it is exceptionally high quality.
                if (targetKeywords.length > 0 && matchScore === 0) {
                    article._hybridScore -= 20;
                }

                // CATEGORY PENALTY: Distrust generic over-tagged categories if not requested
                const categories = (article.category || []).map((c: string) => c.toLowerCase());
                const requestedKeywords = targetKeywords.map(k => k.toLowerCase());
                
                if (categories.includes('web3') && !requestedKeywords.includes('web3')) {
                    article._hybridScore -= 2;
                }
                if (categories.includes('healthcare') && !requestedKeywords.includes('healthcare')) {
                    article._hybridScore -= 2;
                }
            });
            
            // STRICT FILTERING: Drop anything that was heavily penalized (noise)
            const goodArticles = filtered.filter(article => article._hybridScore >= 0);
            // Fallback: If we don't have enough highly relevant articles in the vault, just show what we have so the user isn't stuck empty-handed
            if (goodArticles.length >= 1) {
                filtered = goodArticles;
            }

            // Sort by our hybrid score (highest first), fallback to most recent
            filtered.sort((a, b) => {
                if (b._hybridScore !== a._hybridScore) {
                    return (b._hybridScore || 0) - (a._hybridScore || 0);
                }
                return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
            });
        }

        // 4. Map to frontend expected format
        const mappedResults = filtered.slice(0, 12).map(article => ({
            title: article.title,
            url: article.url,
            // Fallback to summary if tldr is missing (e.g. before AI processed it)
            content: article.tldr || article.summary || 'Click the link to read the full article.',
            publishedDate: article.published_at,
            image: null, // RSS doesn't reliably provide images, skip for cleaner UI
            score: article.relevance_score,
            source: article.source_name || 'News Vault',
            spiky_take: article.spiky_take,
            category: article.category
        }));

        console.log(`[NEWSJACKING API] Sending ${mappedResults.length} curated articles back to browser.`);
        return NextResponse.json({ results: mappedResults });
        
    } catch (error: any) {
        console.error('[NEWSJACKING API] search error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error during search' }, { status: 500 });
    }
}
