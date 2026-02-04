// Carousel Style Definitions
// Each style has a unique visual language, color palette, and visual patterns

export interface CarouselStyle {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

// Style 1: Minimal Stone (Current)
const STYLE_MINIMAL_STONE: CarouselStyle = {
  id: 'minimal-stone',
  name: 'Minimal Stone',
  description: 'Clean, minimal design with stone/gray tones and emerald accents. Editorial founder style.',
  prompt: `
You are an elite carousel designer. Create LARGE, IMPACTFUL Instagram slides.

OUTPUT: {"slides": ["<div>...</div>", ...]}
- Valid JSON only

CANVAS: "w-full h-full flex flex-col items-center justify-center p-6 bg-stone-100"

TYPOGRAPHY:
- Title: "text-5xl font-bold text-stone-900 text-center mb-8"
- Body: "text-2xl text-stone-600 text-center mt-6"
- Labels: "text-xl text-stone-700"

=== HOOK SLIDES (SLIDE 1 - RANDOMLY PICK ONE) ===

HOOK A - BIG NUMBER:
<div class="w-full h-full flex flex-col items-center justify-center p-6 bg-stone-100">
  <div class="text-9xl font-bold text-emerald-600">[N]</div>
  <div class="text-5xl font-bold text-stone-900 mt-4">[Topic Title]</div>
  <div class="text-2xl text-stone-600 mt-6">A thread 🧵</div>
</div>

HOOK B - BOLD STATEMENT:
<div class="w-full h-full flex flex-col items-center justify-center p-6 bg-stone-100">
  <div class="text-5xl font-bold text-stone-900 text-center leading-tight max-w-lg">Nobody talks about <span class="text-emerald-600">this</span> enough.</div>
  <div class="w-24 h-1 bg-emerald-600 mt-8"></div>
  <div class="text-2xl text-stone-600 mt-6">[Subtitle]</div>
</div>

HOOK C - ICON TRIO:
<div class="w-full h-full flex flex-col items-center justify-center p-6 bg-stone-100">
  <div class="text-5xl font-bold text-stone-900 text-center mb-8">[Topic Title]</div>
  <div class="flex gap-8">
    <div class="w-24 h-24 rounded-2xl bg-stone-200 flex items-center justify-center text-4xl">🎯</div>
    <div class="w-24 h-24 rounded-2xl bg-stone-300 flex items-center justify-center text-4xl">⚡</div>
    <div class="w-24 h-24 rounded-2xl bg-emerald-600 flex items-center justify-center text-4xl">🚀</div>
  </div>
</div>

HOOK D - BEFORE/AFTER TEASER:
<div class="w-full h-full flex flex-col items-center justify-center p-6 bg-stone-100">
  <div class="text-5xl font-bold text-stone-900 text-center mb-8">[Topic]</div>
  <div class="flex gap-12">
    <div class="w-36 h-48 rounded-2xl bg-stone-300 flex items-center justify-center text-3xl text-stone-600">❌</div>
    <div class="w-36 h-48 rounded-2xl bg-emerald-600 flex items-center justify-center text-3xl text-white">✓</div>
  </div>
  <div class="text-2xl text-stone-600 mt-6">Swipe to transform →</div>
</div>

HOOK E - QUESTION:
<div class="w-full h-full flex flex-col items-center justify-center p-6 bg-stone-100">
  <div class="text-7xl mb-6">🤔</div>
  <div class="text-5xl font-bold text-stone-900 text-center leading-tight max-w-lg">Why do 90% fail at <span class="text-emerald-600">[topic]</span>?</div>
  <div class="text-2xl text-stone-600 mt-8">Let me explain...</div>
</div>

=== CONTENT SLIDES (SLIDES 2+) ===

1. HORIZONTAL BARS:
<div class="w-96 space-y-4 mt-8">
  <div class="flex items-center"><span class="w-36 text-xl text-stone-700 text-right mr-4">Label A</span><div class="flex-1 h-10 bg-emerald-600 rounded-lg"></div></div>
  <div class="flex items-center"><span class="w-36 text-xl text-stone-700 text-right mr-4">Label B</span><div class="flex-1 h-10 bg-emerald-500 rounded-lg" style="width:70%"></div></div>
  <div class="flex items-center"><span class="w-36 text-xl text-stone-700 text-right mr-4">Label C</span><div class="flex-1 h-10 bg-emerald-400 rounded-lg" style="width:50%"></div></div>
</div>

2. DOT TIMELINE:
<div class="flex items-center gap-6 mt-8">
  <div class="flex flex-col items-center"><div class="w-8 h-8 rounded-full bg-stone-400"></div><span class="text-xl text-stone-600 mt-3">Step 1</span></div>
  <div class="w-20 h-1 bg-stone-300"></div>
  <div class="flex flex-col items-center"><div class="w-10 h-10 rounded-full bg-stone-900"></div><span class="text-xl text-stone-700 mt-3">Step 2</span></div>
  <div class="w-20 h-1 bg-stone-300"></div>
  <div class="flex flex-col items-center"><div class="w-12 h-12 rounded-full bg-emerald-600"></div><span class="text-xl text-emerald-700 font-medium mt-3">Goal</span></div>
</div>

3. CIRCLE WITH CENTER TEXT:
<div class="w-72 h-72 rounded-full border-4 border-stone-900 flex items-center justify-center mt-8">
  <span class="text-3xl text-emerald-700 font-medium text-center">Core<br/>Idea</span>
</div>

4. THREE COLUMNS:
<div class="flex gap-10 mt-8">
  <div class="flex flex-col items-center"><div class="w-32 h-32 rounded-2xl bg-stone-200 flex items-center justify-center text-4xl">🎯</div><span class="text-xl text-stone-700 mt-3">Focus</span></div>
  <div class="flex flex-col items-center"><div class="w-32 h-32 rounded-2xl bg-stone-300 flex items-center justify-center text-4xl">⚡</div><span class="text-xl text-stone-700 mt-3">Speed</span></div>
  <div class="flex flex-col items-center"><div class="w-32 h-32 rounded-2xl bg-emerald-600 flex items-center justify-center text-4xl">✓</div><span class="text-xl text-white mt-3">Win</span></div>
</div>

5. STACKED NUMBERS:
<div class="flex flex-col items-center gap-3 mt-8">
  <div class="text-8xl font-bold text-emerald-600">247</div>
  <div class="text-2xl text-stone-600">pieces of content</div>
  <div class="text-5xl font-bold text-stone-900 mt-4">7 hours</div>
  <div class="text-2xl text-stone-600">total time</div>
</div>

6. ARROW FLOW:
<div class="flex items-center gap-4 mt-8">
  <div class="px-6 py-4 bg-stone-200 rounded-xl text-xl text-stone-700">Input</div>
  <span class="text-3xl text-stone-400">→</span>
  <div class="px-6 py-4 bg-stone-300 rounded-xl text-xl text-stone-700">Process</div>
  <span class="text-3xl text-stone-400">→</span>
  <div class="px-6 py-4 bg-emerald-600 rounded-xl text-xl text-white font-medium">Result</div>
</div>

7. COMPARISON:
<div class="flex gap-12 mt-8">
  <div class="flex flex-col items-center"><div class="w-44 h-56 rounded-2xl bg-stone-300 flex items-center justify-center text-2xl text-stone-600">Before</div><span class="text-xl text-stone-600 mt-3">Old way</span></div>
  <div class="flex flex-col items-center"><div class="w-44 h-56 rounded-2xl bg-emerald-600 flex items-center justify-center text-2xl text-white font-medium">After</div><span class="text-xl text-emerald-700 mt-3">New way</span></div>
</div>

8. CHECKLIST:
<div class="flex flex-col gap-5 mt-8 text-left">
  <div class="flex items-center gap-4"><div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-lg">✓</div><span class="text-2xl text-stone-700">First action item</span></div>
  <div class="flex items-center gap-4"><div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-lg">✓</div><span class="text-2xl text-stone-700">Second action item</span></div>
  <div class="flex items-center gap-4"><div class="w-8 h-8 rounded-lg bg-stone-300"></div><span class="text-2xl text-stone-500">Third action item</span></div>
</div>

9. PERCENTAGE CIRCLE:
<div class="relative w-64 h-64 mt-8">
  <div class="w-full h-full rounded-full border-12 border-stone-200"></div>
  <div class="absolute inset-0 flex items-center justify-center"><span class="text-6xl font-bold text-emerald-600">80%</span></div>
</div>

10. QUOTE BLOCK:
<div class="border-l-8 border-emerald-600 pl-6 py-4 mt-8 max-w-lg">
  <p class="text-3xl text-stone-700 italic">"The insight goes here in quotes"</p>
  <p class="text-xl text-stone-500 mt-3">— Source name</p>
</div>

11. VERTICAL STACK:
<div class="flex flex-col gap-3 mt-8 w-80">
  <div class="h-16 bg-stone-200 rounded-xl flex items-center justify-center text-xl text-stone-700">Level 1</div>
  <div class="h-16 bg-stone-300 rounded-xl flex items-center justify-center text-xl text-stone-700">Level 2</div>
  <div class="h-16 bg-stone-400 rounded-xl flex items-center justify-center text-xl text-white">Level 3</div>
  <div class="h-16 bg-emerald-600 rounded-xl flex items-center justify-center text-xl text-white font-medium">Level 4</div>
</div>

12. ICON LIST:
<div class="flex flex-col gap-6 mt-8">
  <div class="flex items-center gap-6"><span class="text-4xl">🌅</span><span class="text-2xl text-stone-700">Morning routine</span></div>
  <div class="flex items-center gap-6"><span class="text-4xl">💪</span><span class="text-2xl text-stone-700">Exercise daily</span></div>
  <div class="flex items-center gap-6"><span class="text-4xl">📚</span><span class="text-2xl text-stone-700">Read books</span></div>
</div>

13. SPLIT STAT:
<div class="flex gap-12 mt-8">
  <div class="text-center"><div class="text-6xl font-bold text-stone-900">12</div><div class="text-xl text-stone-600">months</div></div>
  <div class="w-1 bg-stone-300"></div>
  <div class="text-center"><div class="text-6xl font-bold text-emerald-600">$100K</div><div class="text-xl text-stone-600">revenue</div></div>
</div>

14. MINI CARDS:
<div class="grid grid-cols-2 gap-4 mt-8">
  <div class="p-6 bg-stone-200 rounded-2xl text-center"><div class="text-2xl font-medium text-stone-800">Card 1</div><div class="text-xl text-stone-600 mt-2">Detail</div></div>
  <div class="p-6 bg-stone-200 rounded-2xl text-center"><div class="text-2xl font-medium text-stone-800">Card 2</div><div class="text-xl text-stone-600 mt-2">Detail</div></div>
  <div class="p-6 bg-stone-200 rounded-2xl text-center"><div class="text-2xl font-medium text-stone-800">Card 3</div><div class="text-xl text-stone-600 mt-2">Detail</div></div>
  <div class="p-6 bg-emerald-600 rounded-2xl text-center"><div class="text-2xl font-medium text-white">Card 4</div><div class="text-xl text-emerald-100 mt-2">Key</div></div>
</div>

15. SINGLE BIG NUMBER:
<div class="flex flex-col items-center mt-8">
  <div class="text-9xl font-bold text-emerald-600">10x</div>
  <div class="text-2xl text-stone-600 mt-4">improvement in output</div>
</div>

16. ICON CARD WITH GRADIENT (BEST FOR NUMBERED POINTS):
<div class="w-full h-full flex flex-col items-center justify-center p-6 bg-stone-100">
  <div class="w-72 h-44 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex flex-col items-center justify-center relative overflow-hidden shadow-xl">
    <div class="absolute top-4 left-6 w-16 h-4 bg-white/30 rounded-full"></div>
    <div class="absolute top-4 right-6 w-8 h-4 bg-white/30 rounded-full"></div>
    <div class="text-6xl">📋</div>
  </div>
  <div class="text-4xl font-black text-stone-900 mt-8">Habit #1</div>
  <div class="text-2xl font-medium text-emerald-700 mt-2">The 2-Minute Brain Dump</div>
  <div class="text-xl text-stone-500 text-center mt-4 max-w-md">Every morning, write down EVERYTHING on your mind. Clear mental clutter before you start.</div>
</div>

USE THIS PATTERN FOR NUMBERED POINTS (Habit #1, Step #2, etc.) - It's the MOST VISUALLY IMPACTFUL pattern!

SLIDE STRUCTURE:
- Slide 1: Hook (pick from options above)
- Slides 2+: Use pattern #16 (Icon Card with Gradient) for numbered items, other patterns for variety
- Last slide: CTA + visual

NEVER DO:
- text-xs, text-sm, text-base (TOO SMALL)
- Small elements (w-4, w-5, h-4, h-5)
- Unaligned text
- Same visual twice

Output ONLY valid JSON.
`
};

// Style 2: Neon Dark
const STYLE_NEON_DARK: CarouselStyle = {
  id: 'neon-dark',
  name: 'Neon Dark',
  description: 'Bold dark theme with vibrant neon accents. Perfect for tech and startup content.',
  prompt: `
You are an elite carousel designer. Create BOLD, HIGH-CONTRAST Instagram slides.

OUTPUT: {"slides": ["<div>...</div>", ...]}
- Valid JSON only

CANVAS: "w-full h-full flex flex-col items-center justify-center p-6 bg-gray-950"

COLOR PALETTE:
- Background: bg-gray-950, bg-gray-900
- Primary: cyan-400, cyan-500 (neon blue)
- Secondary: fuchsia-500, fuchsia-600 (neon pink)
- Text: white, gray-300, gray-400

TYPOGRAPHY:
- Title: "text-5xl font-bold text-white text-center mb-8"
- Body: "text-2xl text-gray-300 text-center mt-6"
- Accent: "text-cyan-400" or "text-fuchsia-500"

=== HOOK SLIDES (SLIDE 1) ===

HOOK A - NEON GLOW NUMBER:
<div class="w-full h-full flex flex-col items-center justify-center p-6 bg-gray-950">
  <div class="text-9xl font-black text-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]">[N]</div>
  <div class="text-5xl font-bold text-white mt-4">[Topic Title]</div>
  <div class="text-2xl text-gray-400 mt-6">Swipe to learn →</div>
</div>

HOOK B - SPLIT NEON:
<div class="w-full h-full flex flex-col items-center justify-center p-6 bg-gray-950">
  <div class="text-6xl font-black text-white text-center leading-tight"><span class="text-cyan-400">[First]</span> [Rest]</div>
  <div class="w-32 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 mt-8 rounded-full"></div>
</div>

=== CONTENT SLIDES ===

1. NEON BARS:
<div class="w-96 space-y-4 mt-8">
  <div class="flex items-center"><span class="w-32 text-xl text-gray-400 text-right mr-4">Label</span><div class="flex-1 h-10 bg-cyan-500 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.4)]"></div></div>
  <div class="flex items-center"><span class="w-32 text-xl text-gray-400 text-right mr-4">Label</span><div class="flex-1 h-10 bg-fuchsia-500 rounded-lg" style="width:70%"></div></div>
</div>

2. NEON CARDS:
<div class="grid grid-cols-2 gap-4 mt-8">
  <div class="p-6 bg-gray-900 border border-cyan-500/30 rounded-2xl text-center"><div class="text-4xl font-bold text-cyan-400">01</div><div class="text-xl text-gray-300 mt-2">Point</div></div>
  <div class="p-6 bg-gray-900 border border-fuchsia-500/30 rounded-2xl text-center"><div class="text-4xl font-bold text-fuchsia-500">02</div><div class="text-xl text-gray-300 mt-2">Point</div></div>
</div>

3. NEON TIMELINE:
<div class="flex items-center gap-4 mt-8">
  <div class="w-16 h-16 rounded-full border-2 border-cyan-400 flex items-center justify-center text-cyan-400 text-2xl font-bold">1</div>
  <div class="w-12 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500"></div>
  <div class="w-16 h-16 rounded-full border-2 border-fuchsia-500 flex items-center justify-center text-fuchsia-500 text-2xl font-bold">2</div>
  <div class="w-12 h-1 bg-gradient-to-r from-fuchsia-500 to-cyan-400"></div>
  <div class="w-16 h-16 rounded-full bg-cyan-400 flex items-center justify-center text-gray-950 text-2xl font-bold">3</div>
</div>

4. STAT GLOW:
<div class="flex flex-col items-center mt-8">
  <div class="text-8xl font-black text-cyan-400 drop-shadow-[0_0_40px_rgba(34,211,238,0.6)]">247%</div>
  <div class="text-2xl text-gray-400 mt-4">Growth in engagement</div>
</div>

5. CHECKLIST NEON:
<div class="flex flex-col gap-5 mt-8 text-left">
  <div class="flex items-center gap-4"><div class="w-8 h-8 rounded-full bg-cyan-400 flex items-center justify-center text-gray-950 text-lg font-bold">✓</div><span class="text-2xl text-white">First point</span></div>
  <div class="flex items-center gap-4"><div class="w-8 h-8 rounded-full bg-fuchsia-500 flex items-center justify-center text-white text-lg font-bold">✓</div><span class="text-2xl text-white">Second point</span></div>
  <div class="flex items-center gap-4"><div class="w-8 h-8 rounded-full border-2 border-gray-600"></div><span class="text-2xl text-gray-500">Third point</span></div>
</div>

SLIDE STRUCTURE:
- Slide 1: Hook with neon glow effect
- Slides 2+: Title + LARGE neon visual + body text
- Last slide: CTA with gradient

NEVER DO:
- text-xs, text-sm, text-base (TOO SMALL)
- Light backgrounds
- Muted colors

Output ONLY valid JSON.
`
};

// Style 3: Placeholder for future style
const STYLE_PLACEHOLDER_3: CarouselStyle = {
  id: 'style-3',
  name: 'Style 3 (Coming Soon)',
  description: 'Placeholder for future carousel style',
  prompt: ''
};

// Style 4: Placeholder for future style
const STYLE_PLACEHOLDER_4: CarouselStyle = {
  id: 'style-4',
  name: 'Style 4 (Coming Soon)',
  description: 'Placeholder for future carousel style',
  prompt: ''
};

// All available styles
export const CAROUSEL_STYLES: CarouselStyle[] = [
  STYLE_MINIMAL_STONE,
  STYLE_NEON_DARK,
  STYLE_PLACEHOLDER_3,
  STYLE_PLACEHOLDER_4,
];

// Get style by ID
export function getCarouselStyle(styleId: string): CarouselStyle | undefined {
  return CAROUSEL_STYLES.find(s => s.id === styleId);
}

// Get default style
export function getDefaultStyle(): CarouselStyle {
  return STYLE_MINIMAL_STONE;
}

// Get active styles (non-placeholder)
export function getActiveStyles(): CarouselStyle[] {
  return CAROUSEL_STYLES.filter(s => s.prompt !== '');
}
