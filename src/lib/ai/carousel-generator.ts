/**
 * Shared Carousel Generator
 * Used by both the Carousel Studio page and the weekly generation pipeline.
 */

import { AnthropicProvider } from '@/lib/ai/providers/anthropic';
import { getDefaultStyle, getCarouselStyle } from '@/lib/ai/carousel-styles';

const ai = new AnthropicProvider();

// Visual validation: check if slide has substantial visual elements
function validateSlideVisual(slideHtml: string): { valid: boolean; reason: string } {
    const sizePatterns = [/w-\d+/, /h-\d+/, /grid-cols-\d/, /gap-\d/, /text-[2-7]xl/];
    const visualPatterns = [
        /bg-(stone|emerald|gray)-[1-9]00/,
        /border-/,
        /rounded/,
        /text-emerald/,
    ];

    const bgElements = (slideHtml.match(/bg-(stone|emerald|gray)-[1-9]00/g) || []).length;
    const roundedElements = (slideHtml.match(/rounded/g) || []).length;
    const visualElementCount = bgElements + Math.floor(roundedElements / 2);

    const hasGrid = /grid-cols-\d/.test(slideHtml);
    const hasFlex = /flex/.test(slideHtml);
    const hasSizeElement = sizePatterns.some(p => p.test(slideHtml));
    const hasVisualStyle = visualPatterns.some(p => p.test(slideHtml));

    if (visualElementCount < 2 && !hasGrid && !hasFlex) {
        return { valid: false, reason: 'Too few visual elements' };
    }
    if (!hasSizeElement) {
        return { valid: false, reason: 'No size elements found' };
    }
    if (!hasVisualStyle) {
        return { valid: false, reason: 'No visual styling' };
    }

    return { valid: true, reason: 'OK' };
}

export interface CarouselGenerationOptions {
    topic: string;
    styleId?: string;
    userContext?: {
        industry?: string;
        targetAudience?: string;
        role?: string;
        companyName?: string;
    };
}

/**
 * Generate carousel HTML slides for a given topic and style.
 * Returns an array of HTML strings (one per slide).
 */
export async function generateCarouselSlides(
    options: CarouselGenerationOptions
): Promise<{ slides: string[]; styleId: string }> {
    const { topic, styleId, userContext } = options;

    // Get the carousel style (default to minimal-stone)
    const style = styleId ? getCarouselStyle(styleId) : getDefaultStyle();
    if (!style || !style.prompt) {
        throw new Error('Invalid or unavailable carousel style');
    }

    console.log(`[CarouselGen] Using style: ${style.name} for topic: "${topic}"`);

    // Detect slide count from topic
    const numberMatch = topic.match(
        /\b(top\s*)?(\d+)\s*(things?|tips?|ways?|habits?|books?|tools?|ideas?|steps?|reasons?|secrets?|hacks?|strategies?|mistakes?|rules?|principles?|lessons?|facts?|myths?)?/i
    );
    let requestedSlides = 6;
    if (numberMatch && numberMatch[2]) {
        const num = parseInt(numberMatch[2]);
        if (num >= 3 && num <= 15) {
            requestedSlides = num + 2; // +2 for hook + CTA slides
        }
    }

    // Build system prompt from style
    let systemPrompt = style.prompt.replace(
        'OUTPUT: {"slides": ["<div>...</div>", ...]}',
        `OUTPUT: {"slides": ["<div>...</div>", ...]}\n- Valid JSON only, ${requestedSlides} slides`
    );

    // Inject user context if available
    if (userContext) {
        systemPrompt += `\n\nUSER CONTEXT:`;
        if (userContext.industry) systemPrompt += `\n- Industry: ${userContext.industry}`;
        if (userContext.role) systemPrompt += `\n- Role: ${userContext.role}`;
        if (userContext.companyName) systemPrompt += `\n- Company: ${userContext.companyName}`;
        if (userContext.targetAudience) systemPrompt += `\n- Audience: ${userContext.targetAudience}`;
    }

    const userPrompt = `Create a carousel for: "${topic}"`;
    console.log(`[CarouselGen] Calling AI — ${requestedSlides} slides requested...`);

    const result = await ai.complete({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
    });

    // Parse JSON output
    let jsonStr = result.content.replace(/```json/g, '').replace(/```/g, '');
    const firstOpen = jsonStr.indexOf('{');
    const lastClose = jsonStr.lastIndexOf('}');

    if (firstOpen !== -1 && lastClose !== -1) {
        jsonStr = jsonStr.substring(firstOpen, lastClose + 1);
    }

    const data = JSON.parse(jsonStr);
    let slides: string[] = data.slides;

    if (!slides || slides.length === 0) {
        throw new Error('AI returned no slides');
    }

    // Validation pass
    const failedSlides: number[] = [];
    slides.forEach((slide, index) => {
        const validation = validateSlideVisual(slide);
        if (!validation.valid) {
            console.log(`[CarouselGen] Slide ${index + 1} FAILED: ${validation.reason}`);
            failedSlides.push(index);
        }
    });

    // Regeneration pass for failed slides (max 3)
    if (failedSlides.length > 0 && failedSlides.length <= 3) {
        console.log(`[CarouselGen] Regenerating ${failedSlides.length} failed slides...`);

        const regeneratePrompt = `
You previously generated a carousel but slides ${failedSlides.map(i => i + 1).join(', ')} had weak/missing visuals.

REGENERATE ONLY THESE SLIDES with LARGE, SUBSTANTIAL visuals:
- Use w-48/w-64/w-72 widths
- Use h-32/h-40/h-48 heights
- Use grids with 4+ items
- Use solid fills (bg-stone-300, bg-emerald-600)

Original topic: "${topic}"
Failed slide numbers: ${failedSlides.map(i => i + 1).join(', ')}

Output format:
{"fixed_slides": {"${failedSlides.join('": "<div>...</div>", "')}": "<div>...</div>"}}

Each fixed slide MUST have a visual taking up at least 40% of the slide area.
`;

        try {
            const fixResult = await ai.complete({
                messages: [
                    { role: 'system', content: 'You fix carousel slides that have weak visuals. Make visuals LARGE and SUBSTANTIAL. Output only JSON.' },
                    { role: 'user', content: regeneratePrompt },
                ],
            });

            let fixJson = fixResult.content.replace(/```json/g, '').replace(/```/g, '');
            const fo = fixJson.indexOf('{');
            const lc = fixJson.lastIndexOf('}');
            if (fo !== -1 && lc !== -1) {
                fixJson = fixJson.substring(fo, lc + 1);
            }
            const fixData = JSON.parse(fixJson);

            if (fixData.fixed_slides) {
                Object.entries(fixData.fixed_slides).forEach(([idx, html]) => {
                    const i = parseInt(idx);
                    if (!isNaN(i) && i < slides.length) {
                        slides[i] = html as string;
                        console.log(`[CarouselGen] Slide ${i + 1} replaced`);
                    }
                });
            }
        } catch {
            console.log('[CarouselGen] Could not apply slide fixes, using originals');
        }
    }

    return { slides, styleId: style.id };
}
