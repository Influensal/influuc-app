
import { NextResponse } from 'next/server';
import { AnthropicProvider } from '@/lib/ai/providers/anthropic';
import { getDefaultStyle, getCarouselStyle } from '@/lib/ai/carousel-styles';

const ai = new AnthropicProvider();

// Visual validation: check if slide has substantial visual elements
function validateSlideVisual(slideHtml: string): { valid: boolean; reason: string } {
  // Size indicators (more lenient - includes single digit sizes)
  const sizePatterns = [
    /w-\d+/, // Any width class
    /h-\d+/, // Any height class
    /grid-cols-\d/, // Grid layouts
    /gap-\d/, // Gaps between items
    /text-[2-7]xl/, // Large text (counts as visual)
  ];

  // Visual styling patterns (expanded)
  const visualPatterns = [
    /bg-(stone|emerald|gray)-[1-9]00/, // Background colors
    /border-/, // Any border
    /rounded/, // Any rounded
    /text-emerald/, // Accent text color
  ];

  // Count visual elements
  const bgElements = (slideHtml.match(/bg-(stone|emerald|gray)-[1-9]00/g) || []).length;
  const roundedElements = (slideHtml.match(/rounded/g) || []).length;
  const visualElementCount = bgElements + Math.floor(roundedElements / 2);

  const hasGrid = /grid-cols-\d/.test(slideHtml);
  const hasFlex = /flex/.test(slideHtml);
  const hasSizeElement = sizePatterns.some(p => p.test(slideHtml));
  const hasVisualStyle = visualPatterns.some(p => p.test(slideHtml));

  // More lenient: 2+ visual elements OR grid/flex layout
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("API: Request received", body);
    const { prompt, styleId } = body;

    // Get the carousel style (default to minimal-stone)
    const style = styleId ? getCarouselStyle(styleId) : getDefaultStyle();
    if (!style || !style.prompt) {
      return NextResponse.json({ error: 'Invalid or unavailable style' }, { status: 400 });
    }
    console.log(`API: Using carousel style: ${style.name}`);

    // Detect requested slide count from prompt
    const numberMatch = prompt.match(/\b(top\s*)?(\d+)\s*(things?|tips?|ways?|habits?|books?|tools?|ideas?|steps?|reasons?|secrets?|hacks?|strategies?|mistakes?|rules?|principles?|lessons?|facts?|myths?)?\b/i);
    let requestedSlides = 6; // Default
    if (numberMatch && numberMatch[2]) {
      const num = parseInt(numberMatch[2]);
      if (num >= 3 && num <= 15) {
        requestedSlides = num + 2; // +2 for hook and CTA slides
      }
    }
    console.log(`API: Detected slide count: ${requestedSlides}`);

    // Build the system prompt from the style, injecting slide count
    const systemPrompt = style.prompt.replace(
      'OUTPUT: {"slides": ["<div>...</div>", ...]}',
      `OUTPUT: {"slides": ["<div>...</div>", ...]}\n- Valid JSON only, ${requestedSlides} slides`
    );

    const userPrompt = `Create a carousel for: "${prompt}"`;
    console.log("API: Calling Claude (Sonnet 4.5) - Pass 1...");

    const result = await ai.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    // Parse JSON output
    let jsonStr = result.content;

    // Aggressive cleaning
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '');
    const firstOpen = jsonStr.indexOf('{');
    const lastClose = jsonStr.lastIndexOf('}');

    if (firstOpen !== -1 && lastClose !== -1) {
      jsonStr = jsonStr.substring(firstOpen, lastClose + 1);
    }

    try {
      const data = JSON.parse(jsonStr);
      let slides: string[] = data.slides;

      // VALIDATION PASS: Check each slide
      console.log("API: Validating slides...");
      const failedSlides: number[] = [];

      slides.forEach((slide, index) => {
        const validation = validateSlideVisual(slide);
        if (!validation.valid) {
          console.log(`Slide ${index + 1} FAILED: ${validation.reason}`);
          failedSlides.push(index);
        } else {
          console.log(`Slide ${index + 1} OK`);
        }
      });

      // REGENERATION PASS: Fix failed slides
      if (failedSlides.length > 0 && failedSlides.length <= 3) {
        console.log(`API: Regenerating ${failedSlides.length} failed slides...`);

        const regeneratePrompt = `
You previously generated a carousel but slides ${failedSlides.map(i => i + 1).join(', ')} had weak/missing visuals.

REGENERATE ONLY THESE SLIDES with LARGE, SUBSTANTIAL visuals:
- Use w-48/w-64/w-72 widths
- Use h-32/h-40/h-48 heights
- Use grids with 4+ items
- Use solid fills (bg-stone-300, bg-emerald-600)

Original topic: "${prompt}"
Failed slide numbers: ${failedSlides.map(i => i + 1).join(', ')}

Output format:
{"fixed_slides": {"${failedSlides.join('": "<div>...</div>", "')}": "<div>...</div>"}}

Each fixed slide MUST have a visual taking up at least 40% of the slide area.
`;

        const fixResult = await ai.complete({
          messages: [
            { role: 'system', content: 'You fix carousel slides that have weak visuals. Make visuals LARGE and SUBSTANTIAL. Output only JSON.' },
            { role: 'user', content: regeneratePrompt }
          ]
        });

        // Try to parse and apply fixes
        try {
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
                console.log(`Slide ${i + 1} replaced with fixed version`);
              }
            });
          }
        } catch (fixError) {
          console.log("Could not apply slide fixes, using originals");
        }
      }

      return NextResponse.json({ slides });
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      return NextResponse.json({ slides: [result.content] });
    }

  } catch (error) {
    console.error("HTML Gen Error:", error);
    return NextResponse.json({ error: "Failed to generate: " + String(error) }, { status: 500 });
  }
}
