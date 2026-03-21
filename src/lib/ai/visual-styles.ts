export interface VisualStyle {
    id: string;
    name: string;
    prompt: string | string[];
}

export const FACELESS_STYLES: VisualStyle[] = [
    {
        id: 'abstract',
        name: 'Abstract',
        prompt: "A high-end 3D abstract geometric composition representing [TOPIC]. Extremely clean, mathematical precision, smooth organic curves meeting sharp industrial edges. Soft volumetric lighting with a focus on depth. Color Palette: The scene is dominated by [BACKGROUND_COLOR], with primary forms in [PRIMARY_COLOR] and sharp intricate details in [ACCENT_COLOR]. Cinematic 8K render, Octane, minimal and authoritative."
    },
    {
        id: 'neon',
        name: 'Neon',
        prompt: "A futuristic cyber-tech environment featuring [TOPIC]. Glowing neon data pathways, holographic interfaces, and volumetric light beams. The atmosphere is nocturnal and energetic. Color Palette: Deep [BACKGROUND_COLOR] shadows, with [PRIMARY_COLOR] neon glows and [ACCENT_COLOR] highlights pulsing through the scene. High-contrast, sharp focus, cinematic sci-fi realism."
    },
    {
        id: 'minimal',
        name: 'Minimal',
        prompt: "An elegant, minimal editorial still life of [TOPIC]. Focus on texture and light in an architectural space. Polished concrete, matte metals, and soft frosted glass. Color Palette: Massive [BACKGROUND_COLOR] negative space, with subtle [PRIMARY_COLOR] structural elements and tiny [ACCENT_COLOR] focal points. Calm, professional, timeless aesthetic."
    },
    {
        id: 'noir',
        name: 'Noir',
        prompt: "A dramatic, high-contrast noir scene focusing on [TOPIC]. Intense chiaroscuro lighting, deep shadows, and cinematic film grain. The vibe is mysterious and powerful. Color Palette: Predominantly [BACKGROUND_COLOR] (dark/black), with [PRIMARY_COLOR] being the ONLY vivid light source cutting through the darkness. Restrained use of [ACCENT_COLOR] for metallic reflections."
    },
    {
        id: 'journal',
        name: 'Journal',
        prompt: [
            "A top-down cinematic shot of a premium open grid-paper diary lying on a rustic oak wooden table. The pages are filled with detailed handwritten notes and artistic sketches about [TOPIC]. Centered at the top in large, bold, black ink handwritten typography is: '[TEXT]'. Soft morning sunlight casting gentle shadows. 8k, highly detailed paper texture.",
            "A high-angle professional photo of an open minimalist notebook on a polished white marble desk. Clean, elegant handwriting across the pages discussing [TOPIC]. The main title '[TEXT]' is written in clean, modern script at the top. A high-end fountain pen lies next to it. Bright, airy [BACKGROUND_COLOR] aesthetic, masterpiece.",
            "A cinematic overhead view of a leather-bound journal open on a minimalist slate grey concrete table. The handwriting is raw and authentic, filled with ideas about [TOPIC]. The heading '[TEXT]' is written in large, expressive ink. Moody, directional lighting with deep [BACKGROUND_COLOR] tones and [PRIMARY_COLOR] accents.",
            "An aesthetic close-up of a journal on a dark mahogany executive desk. The pages contain structured lists and diagrams about [TOPIC]. The one-line title '[TEXT]' is written clearly at the top. A steaming cup of coffee is partially visible in the blurred background. Warm, rich tones, shot on 35mm film.",
            "A stylish top-down shot of a grid notebook on a glass coffee table with blurred morning greenery in the background. Handwritten insights about [TOPIC] cover the page. The main heading '[TEXT]' is prominently written in the upper third. Clean, vibrant [BACKGROUND_COLOR] lighting with [ACCENT_COLOR] pops."
        ]
    },
    {
        id: 'hypercinematic',
        name: 'Hypercinematic',
        prompt: [
            "A hyper-realistic 3D cinematic scene. In the foreground, glowing neon translucent logos of AI companies (like OpenAI and Gemini) and a metallic 3D 'AI' letter sit on a dark, wet asphalt texture that reflects vibrant [PRIMARY_COLOR] and [ACCENT_COLOR] light. In the background, 'SECRETLY WON' is written in massive, bold, semi-transparent grey typography, with the subtitle 'while everyone was distracted' below it. A single dramatic spotlight cuts through a dark, smoky [BACKGROUND_COLOR] atmosphere with floating dust particles. 8k resolution, Unreal Engine 5 render, masterpiece.",
            "A futuristic cinematic visual featuring six glowing translucent glass pillars standing in a row on a dark reflective floor. Each pillar contains vertical white text: 'CONTEXT', 'OBJECTIVE', 'STYLE', 'TONE', 'AUDIENCE', 'RESPONSE FORMAT'. A bright glowing orb of [PRIMARY_COLOR] energy on the left sends flowing light trails through the pillars. Background is dark and smoky with distant [ACCENT_COLOR] blurred bokeh. Bottom features the text '\"[TEXT]\"' in elegant white serif typography. Shot on 35mm, volumetric lighting, hyper-detailed textures."
        ]
    },
    {
        id: 'architectural',
        name: 'Architectural',
        prompt: "A top-down, clean architectural blueprint of [TOPIC] spread across a minimalist white designer's desk. The blueprint features intricate technical drawings, geometric shapes, and mathematical annotations. Scattered across the plans are hand-sketched notes and red pen 'corrections'. The main heading '[TEXT]' is written in a precise, professional architectural font in the title block. Natural side-lighting from a large window. Color Palette: Pure [BACKGROUND_COLOR] paper, [PRIMARY_COLOR] ink lines, and subtle [ACCENT_COLOR] highlights on drafted elements. 8k, hyper-detailed."
    },
    {
        id: 'glassmorphism',
        name: 'Glassmorphism',
        prompt: "An elegant, Apple-style marketing visual of [TOPIC]. Multiple 3D translucent glass panels with frosted edges float in a deep, volumetric space. The panels display sharp, minimalist UI elements and code snippets related to the topic. Behind the glass, vibrant blurry gradients of [PRIMARY_COLOR] and [ACCENT_COLOR] create a sense of depth and energy. The foreground features bold, white sans-serif typography: '[TEXT]'. Soft, diffused [BACKGROUND_COLOR] environment, cinematic 8k render, Octane, premium tech aesthetic."
    },
    {
        id: 'paper-craft',
        name: 'Paper-Craft',
        prompt: "A sophisticated 3D paper-cut art composition representing [TOPIC]. Distinct layers of high-textured paper creates a deep, tactile scene with sharp, physical shadows. The forms are stylized and symbolic. Color Palette: The primary layers are [BACKGROUND_COLOR], with focal elements in [PRIMARY_COLOR] and [ACCENT_COLOR]. The text '[TEXT]' is intricately 'cut out' from the top layer of paper, revealing a glowing light underneath. Macro photography, sharp focus on paper grain, masterpiece."
    },
    {
        id: 'dark-terminal',
        name: 'Dark Terminal',
        prompt: "A high-end, nocturnal macro shot of a pro-tech setup. A high-quality mechanical keyboard with [PRIMARY_COLOR] RGB backlighting is in the blurred foreground. In the background, a tilted 4K monitor displays complex terminal code and data visualizations about [TOPIC]. The entire scene is bathed in a dark, moody [BACKGROUND_COLOR] atmosphere with sharp [ACCENT_COLOR] highlights. Centered on the screen in a clean, terminal-style monospaced font is the text: '[TEXT]'. Cinematic film grain, shot on 35mm, technologist expert vibe."
    }
];

export const FACE_STYLES: VisualStyle[] = [
    {
        id: 'photorealistic',
        name: 'Photorealistic',
        prompt: [
            "A world-class keynote speaker on a professional stage, captured mid-speech. Large, dimly lit audience in the blurred background. Warm spotlight hitting the speaker. Professional attire. Stage lighting and screen graphics incorporate [PRIMARY_COLOR] and [ACCENT_COLOR]. High-end event photography, dramatic wide-angle lens.",
            "A high-powered founder in a modern, luxury glass-walled office overlooking a city skyline. Soft sunset light coming through the window. Clean desk with a MacBook and a espresso cup. Extremely sharp focus. Interior accents and branding elements in [PRIMARY_COLOR]. 85mm lens, shallow depth of field, premium corporate lifestyle photography.",
            "A confident founder in a premium, industrial-designed urban loft. Large windows, brick walls, and plants. Captured in a candid, authentic moment. Natural daylight. CONFIDENT but approachable posture. Environment details like pillows or books in [PRIMARY_COLOR] and [ACCENT_COLOR]. High-end lifestyle photography, soft bokeh.",
            "A professional editorial studio portrait against a clean, textured [BACKGROUND_COLOR] backdrop. Three-point balanced lighting creating soft highlights on the face and sharp clothing detail. Minimalist and authoritative. One subtle [PRIMARY_COLOR] rim light on the shoulder. Vogue-style editorial photography, high-resolution.",
            "A premium portrait of the user in a high-end rooftop lounge at sunset, warm golden hour lighting, blurred city lights in the background, sophisticated and elegant.",
            "A professional photo of the user in a minimalist art gallery with clean white walls and soft ambient lighting, sophisticated intellectual vibe, high contrast.",
            "A creative professional portrait of the user in an industrial loft workspace with brick walls and large windows, natural light mixed with warm interior lamps, authentic and modern.",
            "A vibrant professional photo of the user in a lush botanical garden or high-end greenhouse, soft dappled sunlight filtering through leaves, fresh and energetic atmosphere.",
            "A scholarly professional portrait of the user in a sleek modern library with floor-to-ceiling bookshelves, soft overhead lighting, intelligent and authoritative presence.",
            "An authoritative professional photo of the user in a premium executive boardroom with a panoramic city view, cool professional tones, sharp focus on subject, high-stakes atmosphere."
        ]
    },
    {
        id: 'authority',
        name: 'Authority',
        prompt: "A premium, high-contrast portrait of a confident founder on the RIGHT side of the frame, looking towards the camera with an expressive gaze. The LEFT side of the frame is massive cinematic negative space containing the focal text: '[TEXT]'. The text is rendered in high-impact, professional bold typography. Key words are emphasized with a solid [PRIMARY_COLOR] background box and white text. Background is a professional [BACKGROUND_COLOR] podcast studio with soft bokeh and [ACCENT_COLOR] practical lights. Dramatic Rembrandt lighting with a sharp [PRIMARY_COLOR] rim light for separation. 8k, photorealistic, 50mm lens, YouTube thumbnail aesthetic."
    },
    {
        id: 'viral',
        name: 'Viral',
        prompt: "A high-energy, creative social media thumbnail. A cinematic portrait of a confident founder is the dominant center focus. Surrounding the subject is a dynamic, multi-layered collage of floating 3D icons, UI elements, and graphics representing '[TOPIC]'. Include relevant app icons and illustrative symbols scattered artistically with varying depths. Top of frame features bold, outlined typography: '[TEXT]'. Use a vibrant [BACKGROUND_COLOR] with [PRIMARY_COLOR] and [ACCENT_COLOR] glowing accents. Each generation should vary the spatial arrangement and selection of graphics for a unique layout. 8k, hyper-detailed, trending on YouTube aesthetic."
    },
    {
        id: 'candid-cinematic',
        name: 'Candid Cinematic',
        prompt: "A hyper-realistic, candid cinematic shot of a founder [TOPIC]. The subject is captured in a natural, unposed moment, showing raw focus and authentic emotion. The setting is a premium, modern environment with cinematic lighting—warm, moody, and high-contrast 'golden hour' tones. Shallow depth of field with a beautifully blurred background. Centered in the upper third of the frame is a simple, bold, one-line plain text in white sans-serif typography: '[TEXT]'. 8k resolution, shot on 35mm film, highly detailed textures, masterpiece."
    },
    {
        id: 'masterclass',
        name: 'Masterclass',
        prompt: "A premium, intellectual portrait of a founder in a dark, scholarly studio. The background is composed of deep-toned floor-to-ceiling bookshelves and heavy velvet curtains. A single, large, incredibly soft key light illuminates the subject's face, creating a sophisticated 'Masterclass' aesthetic. Centered at the bottom in elegant, thin white serif typography is: '[TEXT]'. High-contrast, masterful composition, 8k resolution, Vogue-style editorial."
    },
    {
        id: 'pov-lifestyle',
        name: 'POV Lifestyle',
        prompt: "A first-person perspective shot from the viewpoint of a high-growth founder. The founder's hands are visible in the foreground, either holding a luxury steering wheel, typing on a MacBook at a sunny beach club, or holding an espresso overlooking a vibrant city skyline during golden hour. The background represents '[TOPIC]' and is beautifully blurred. A clean, white sans-serif text overlay at the top reads: '[TEXT]'. Immersive, aspirational, high-end lifestyle photography."
    },
    {
        id: 'analog-loft',
        name: 'Analog Loft',
        prompt: "A raw and authentic portrait of a creative founder in a sun-drenched industrial loft. The space is filled with lush monsteras, vintage cameras, and organic textures. Shot on 35mm film with natural grain and slight warm color shifts. The founder is captured in a relaxed, 'creative maverick' pose. Soft, natural daylight filters through large warehouse windows. A simple, hand-drawn style text overlay at the top says: '[TEXT]'. 8k resolution, authentic and modern."
    }
];

export function getFacelessStyle(id: string): VisualStyle | undefined {
    return FACELESS_STYLES.find(s => s.id === id);
}

export function getFaceStyle(id: string): VisualStyle | undefined {
    const legacyMap: Record<string, string> = {
        'ted': 'photorealistic',
        'office': 'photorealistic',
        'lifestyle': 'photorealistic',
        'studio': 'photorealistic'
    };

    const targetId = legacyMap[id] || id;
    return FACE_STYLES.find(s => s.id === targetId);
}

export function compileVisualPrompt(
    basePrompt: string,
    style: VisualStyle,
    colors: { primary: string; background: string; accent: string },
    text?: string
): string {
    let prompt = Array.isArray(style.prompt)
        ? style.prompt[Math.floor(Math.random() * style.prompt.length)]
        : style.prompt;

    // Replace template placeholders
    prompt = prompt.replace(/\[TOPIC\]/g, basePrompt);
    prompt = prompt.replace(/\[TEXT\]/g, text || basePrompt);
    prompt = prompt.replace(/\[PRIMARY_COLOR\]/g, colors.primary);
    prompt = prompt.replace(/\[BACKGROUND_COLOR\]/g, colors.background);
    prompt = prompt.replace(/\[ACCENT_COLOR\]/g, colors.accent);

    return prompt;
}
