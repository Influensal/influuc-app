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

// Style 3: Luxe Gold
const STYLE_LUXE_GOLD: CarouselStyle = {
  id: 'luxe-gold',
  name: 'Luxe Gold', // Luxurious, Premium
  description: 'Elegant black and gold theme with serif typography. Ideal for high-end brands and authority figures.',
  prompt: `
You are a luxury brand designer. Create HIGH-END, PREMIUM Instagram slides.

OUTPUT: {"slides": ["<div>...</div>", ...]}
- Valid JSON only

CANVAS: "w-full h-full flex flex-col items-center justify-center p-8 bg-black border border-stone-800"

COLOR PALETTE:
- Background: bg-black, bg-stone-950
- Primary: text-amber-400, text-amber-500 (Gold)
- Secondary: text-stone-400
- Border: border-amber-500/20

TYPOGRAPHY:
- Title: "text-5xl font-serif text-white text-center mb-8 leading-snug"
- Body: "text-2xl font-light text-stone-300 text-center mt-6"
- Labels: "text-amber-500 uppercase tracking-widest text-sm"

=== HOOK SLIDES (SLIDE 1) ===

HOOK A - GOLDEN NUMBER:
<div class="w-full h-full flex flex-col items-center justify-center p-8 bg-black relative">
  <div class="absolute inset-4 border border-stone-800"></div>
  <div class="text-9xl font-serif text-amber-500 italic">[N]</div>
  <div class="text-4xl font-light text-white mt-6 uppercase tracking-widest text-center">[Title]</div>
  <div class="w-16 h-[1px] bg-amber-500 mt-8"></div>
</div>

HOOK B - ELEGANT STATEMENT:
<div class="w-full h-full flex flex-col items-center justify-center p-8 bg-black bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-900 to-black">
  <div class="text-5xl font-serif text-white text-center leading-relaxed">
    "Simplicity is the key to <span class="text-amber-400 italic">elegance</span>."
  </div>
  <div class="text-xl text-stone-500 mt-8 uppercase tracking-widest">[Topic]</div>
</div>

=== CONTENT SLIDES ===

1. GOLD BORDER CARD:
<div class="p-8 border border-amber-500/30 bg-stone-950/50 flex flex-col items-center text-center max-w-lg">
  <div class="text-4xl text-amber-400 mb-4">✦</div>
  <div class="text-3xl font-serif text-white">[Key concept]</div>
  <div class="text-xl text-stone-400 mt-4 leading-relaxed font-light">[Explanation text]</div>
</div>

2. NUMBERED LIST (SERIF):
<div class="flex flex-col gap-6 w-full max-w-md mt-6">
  <div class="flex items-baseline gap-4 border-b border-stone-800 pb-4">
    <span class="text-3xl font-serif text-amber-500">01.</span>
    <span class="text-2xl text-stone-200">First strategic pillar</span>
  </div>
  <div class="flex items-baseline gap-4 border-b border-stone-800 pb-4">
    <span class="text-3xl font-serif text-amber-500">02.</span>
    <span class="text-2xl text-stone-200">Second strategic pillar</span>
  </div>
</div>

3. QUOTE (SERIF):
<div class="flex flex-col items-center text-center max-w-xl mt-8">
  <div class="text-6xl text-amber-500 font-serif mb-6">"</div>
  <div class="text-4xl font-serif text-white leading-normal italic">
    Wealth is not about having money, it's about having options.
  </div>
  <div class="w-12 h-[1px] bg-amber-500 mt-8 mb-4"></div>
  <div class="text-lg text-stone-400 uppercase tracking-widest">Focus</div>
</div>

4. GOLDEN CHART:
<div class="flex items-end gap-6 h-64 mt-8 pb-4 border-b border-stone-800 w-full max-w-md px-8">
  <div class="w-1/4 h-1/3 bg-stone-800 border-t border-amber-500/20"></div>
  <div class="w-1/4 h-1/2 bg-stone-700 border-t border-amber-500/40"></div>
  <div class="w-1/4 h-3/4 bg-amber-900/30 border-t border-x border-amber-500"></div>
  <div class="w-1/4 h-full bg-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]"></div>
</div>

5. COMPARISON TABLE:
<div class="w-full max-w-lg mt-8 border border-stone-800">
  <div class="grid grid-cols-2 text-center py-4 border-b border-stone-800">
    <div class="text-stone-500 uppercase text-sm">Average</div>
    <div class="text-amber-500 uppercase text-sm">Elite</div>
  </div>
  <div class="grid grid-cols-2 text-center py-6 border-b border-stone-800/50">
    <div class="text-stone-400 text-xl">React</div>
    <div class="text-white text-xl">Respond</div>
  </div>
  <div class="grid grid-cols-2 text-center py-6">
    <div class="text-stone-400 text-xl">Busy</div>
    <div class="text-white text-xl">Productive</div>
  </div>
</div>

SLIDE STRUCTURE:
- Slide 1: Hook with frame or serif typography
- Slides 2+: Content with thin borders, serif headings, gold accents
- Last slide: Simple elegant call to action

NEVER DO:
- Thick borders
- Bright/Neon colors (use Amber/Gold/Stone)
- Sans-serif for titles (Use font-serif)

Output ONLY valid JSON.
`
};

// Style 4: Bold Editorial
const STYLE_BOLD_EDITORIAL: CarouselStyle = {
  id: 'bold-editorial',
  name: 'Bold Editorial',
  description: 'Brutalist, high-contrast design. Red, Black, and White. Impactful and authoritative.',
  prompt: `
You are a brutalist designer. Create HIGH-CONTRAST, AGGRESSIVE Instagram slides.

OUTPUT: {"slides": ["<div>...</div>", ...]}
- Valid JSON only

CANVAS: "w-full h-full flex flex-col items-center justify-center p-6 bg-white border-8 border-black"

COLOR PALETTE:
- Background: bg-white or bg-red-600 (accent slides)
- Text: text-black, text-white (on red)
- Accent: bg-red-600, border-black

TYPOGRAPHY:
- Title: "text-6xl font-black uppercase tracking-tighter text-black text-center mb-6 leading-[0.9]"
- Body: "text-3xl font-bold text-black text-center mt-4 leading-tight"
- Labels: "bg-black text-white px-2 py-1 font-mono text-sm uppercase"

=== HOOK SLIDES (SLIDE 1) ===

HOOK A - GIANT TEXT:
<div class="w-full h-full flex flex-col items-center justify-center p-6 bg-white border-8 border-black">
  <div class="bg-black text-white px-6 py-2 text-xl font-bold uppercase mb-8 transform -rotate-2">Warning</div>
  <div class="text-8xl font-black text-black uppercase tracking-tighter leading-none text-center">
    STOP<br/><span class="text-red-600">DOING</span><br/>THIS
  </div>
</div>

HOOK B - RED ALERT:
<div class="w-full h-full flex flex-col items-center justify-center p-6 bg-red-600 border-8 border-black">
  <div class="text-7xl font-black text-white uppercase tracking-tighter leading-none text-center">
    THE<br/>SHOCKING<br/>TRUTH
  </div>
  <div class="mt-8 bg-white border-4 border-black px-6 py-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
    <span class="text-2xl font-bold text-black">Read Now</span>
  </div>
</div>

=== CONTENT SLIDES ===

1. BRUTAL CARD:
<div class="w-full max-w-sm bg-white border-4 border-black p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] mt-8">
  <div class="bg-black text-white inline-block px-3 py-1 font-mono mb-4 text-sm">ERROR 404</div>
  <div class="text-4xl font-black text-black leading-none uppercase">You are missing the point</div>
  <div class="mt-4 text-xl font-bold border-t-4 border-black pt-4">Fix it now.</div>
</div>

2. BIG LIST (SOLID):
<div class="flex flex-col gap-4 w-full mt-6">
  <div class="bg-black text-white p-4 font-bold text-2xl border-4 border-black">1. IGNORE THE NOISE</div>
  <div class="bg-white text-black p-4 font-bold text-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">2. FOCUS ON VALUE</div>
  <div class="bg-white text-black p-4 font-bold text-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">3. SHIP DAILY</div>
</div>

3. VS COMPARISON:
<div class="flex w-full h-64 border-4 border-black mt-8">
  <div class="w-1/2 bg-red-600 flex items-center justify-center border-r-4 border-black">
    <span class="text-white font-black text-4xl uppercase -rotate-90">Weak</span>
  </div>
  <div class="w-1/2 bg-white flex items-center justify-center">
    <span class="text-black font-black text-4xl uppercase -rotate-90">Strong</span>
  </div>
</div>

4. MASKED IMAGE / TEXT:
<div class="relative mt-8">
  <div class="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-black to-gray-500 leading-none">NO</div>
  <div class="absolute inset-0 flex items-center justify-center text-4xl font-bold text-red-600 uppercase tracking-widest bg-white/80 mix-blend-screen">Excuses</div>
</div>

5. STAT ATTACK:
<div class="flex flex-col items-center mt-8">
  <span class="text-9xl font-black text-black leading-none border-b-8 border-red-600">100%</span>
  <span class="text-3xl font-bold bg-black text-white px-4 py-1 mt-2 rotate-1">RESULTS</span>
</div>

SLIDE STRUCTURE:
- Slide 1: High impact typography, thick borders
- Slides 2+: Brutalist elements, hard shadows, high contrast
- Last slide: Aggressive CTA (e.g. "DO IT NOW")

NEVER DO:
- Gradients (use solid colors)
- Rounded corners (use rounded-none or very small)
- Opacity/Transparency (keep it solid 100%)
- Serif fonts

Output ONLY valid JSON.
`
};

// All available styles
export const CAROUSEL_STYLES: CarouselStyle[] = [
  STYLE_MINIMAL_STONE,
  STYLE_NEON_DARK,
  STYLE_LUXE_GOLD,
  STYLE_BOLD_EDITORIAL,
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
