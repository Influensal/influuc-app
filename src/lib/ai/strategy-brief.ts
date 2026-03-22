/**
 * Strategy Brief Compiler
 * 
 * Assembles a master strategy brief from a user's profile data.
 * This brief is the single source of truth for all AI generation calls.
 * It acts as a "brand strategist's playbook" — every weekly generation
 * receives this as context so the AI writes with strategic intent.
 */

// ============================================
// TYPES
// ============================================

export interface StrategyProfile {
    // Identity
    name: string;
    role: string;
    company_name: string;
    business_description: string;
    industry: string;
    content_goal: string;
    target_audience: string;

    // Archetype
    archetype_primary: string;
    archetype_secondary?: string;
    archetype_flavor?: string;

    // Strategic Foundation
    positioning_statement?: string;
    pov_statement?: string;
    identity_gap?: string;
    competitor_context?: {
        names: string[];
        shared_patterns?: string;
        whitespace?: string;
    };
    limiting_belief?: string;
    weekly_throughline?: string;

    // Content Pillars
    content_pillars?: {
        name: string;
        description: string;
        job: 'authority' | 'relatability' | 'proof';
    }[];

    // EXPERTISE & RAW INTEL (NEW)
    personal_context?: Array<{ type: string; label: string; value: string }>;
    product_context?: Array<{ type: string; label: string; value: string }>;

    // Voice
    voice_analysis?: {
        descriptors: string[];
        positives: string[];
        negatives: string[];
        sentence_pattern?: string;
        vocabulary?: string[];
    };

    // Legacy fields (still used as fallback)
    topics?: string[];
    tone?: {
        formality?: string;
        boldness?: string;
        style?: string;
        approach?: string;
    };
}

export interface VoiceSample {
    content: string;
    type: string;
}

// ============================================
// ARCHETYPE DESCRIPTIONS
// ============================================

const ARCHETYPE_DESCRIPTIONS: Record<string, {
    does: string;
    sounds: string;
    avoids: string;
}> = {
    builder: {
        does: 'documents the building process — wins, failures, raw lessons, real numbers',
        sounds: 'transparent, in-the-trenches, showing-not-telling',
        avoids: 'theory without execution, polished corporate voice, advice from the sideline',
    },
    teacher: {
        does: 'breaks down complex topics into frameworks, mental models, and step-by-step guides',
        sounds: 'clear, structured, patient but never condescending',
        avoids: 'vague advice, storytelling without a takeaway, opinions without structure',
    },
    contrarian: {
        does: 'challenges conventional wisdom, names what others won\'t, reframes the debate',
        sounds: 'direct, provocative, high-conviction, slightly confrontational',
        avoids: 'safe takes, hedging language, agreeing with the crowd, playing it safe',
    },
    executive: {
        does: 'sets standards, shares high-level vision, speaks on leadership and industry direction',
        sounds: 'commanding, calm, confident, above-the-noise',
        avoids: 'tactical details, vulnerability without purpose, casual/meme-driven content',
    },
};

// ============================================
// GOAL → CTA MAPPING
// ============================================

const GOAL_CTA_MAP: Record<string, string> = {
    sales: 'DM me "strategy" to see how we can help →',
    hiring: 'We\'re hiring — link in bio for open roles.',
    authority: 'Follow for more frameworks like this.',
    investors: 'Building something interesting? Let\'s talk — DM open.',
};

// ============================================
// COMPILE STRATEGY BRIEF
// ============================================

/**
 * Compiles a complete strategy brief from profile data.
 * This is the master prompt passed to every AI generation call.
 */
export function compileStrategyBrief(
    profile: StrategyProfile,
    voiceSamples: VoiceSample[] = []
): string {
    const sections: string[] = [];
    const archetype = profile.archetype_primary || 'builder';
    const archetypeDesc = ARCHETYPE_DESCRIPTIONS[archetype] || ARCHETYPE_DESCRIPTIONS.builder;
    const secondaryArchetype = profile.archetype_secondary;
    const secondaryDesc = secondaryArchetype ? ARCHETYPE_DESCRIPTIONS[secondaryArchetype] : null;

    // ── IDENTITY BLOCK ──
    sections.push(`=== IDENTITY ===
${profile.name} is a ${profile.role} at ${profile.company_name}. ${profile.business_description || 'Building in their industry.'}
Primary goal: ${profile.content_goal || 'Building authority'}.
Industry: ${profile.industry}.`);

    // ── EXPERTISE & RAW INTEL ──
    if (profile.personal_context?.length || profile.product_context?.length) {
        let expertiseBlock = `=== EXPERTISE & RAW INTEL ===\n`;
        if (profile.personal_context?.length) {
            expertiseBlock += `PERSONAL HISTORY:\n${profile.personal_context.map(c => `- ${c.label}: ${c.value}`).join('\n')}\n`;
        }
        if (profile.product_context?.length) {
            expertiseBlock += `PRODUCT INTEL:\n${profile.product_context.map(c => `- ${c.label}: ${c.value}`).join('\n')}\n`;
        }
        expertiseBlock += `Use these specific details to ground the content. Avoid generic industry advice; mention specific features, past roles, or lived experiences found above.`;
        sections.push(expertiseBlock);
    }

    // ── ARCHETYPE BLOCK ──
    let archetypeBlock = `=== ARCHETYPE ===
Primary archetype: ${archetype.toUpperCase()}.
Their content ${archetypeDesc.does}.
It sounds ${archetypeDesc.sounds}.
It never ${archetypeDesc.avoids}.`;
    if (secondaryArchetype && secondaryDesc) {
        archetypeBlock += `\nSecondary archetype: ${secondaryArchetype.toUpperCase()} — shows up as occasional ${secondaryDesc.does.split(',')[0]}.`;
    }
    if (profile.archetype_flavor) {
        archetypeBlock += `\nFlavor: ${profile.archetype_flavor}`;
    }
    sections.push(archetypeBlock);

    // ── POSITIONING BLOCK ──
    if (profile.positioning_statement) {
        sections.push(`=== POSITIONING ===
Their positioning: ${profile.positioning_statement}
Every piece of content should reinforce this positioning — directly or indirectly. The audience should finish reading and think: "This person is THE person for this."
The category they own: ${profile.industry}.`);
    }

    // ── POV BLOCK ──
    if (profile.pov_statement) {
        sections.push(`=== POINT OF VIEW (SPIKY POV) ===
Core belief: ${profile.pov_statement}
This is the user's "Spiky POV". Every piece of authority content should move the reader closer to agreeing with this belief.
- Do NOT just state it as a fact.
- Show the framework or logic that makes it undeniably true.
- Use lived experience to prove the POV.`);
    }

    // ── AUDIENCE BLOCK ──
    let audienceBlock = `=== AUDIENCE ===
Target audience: ${profile.target_audience}.`;
    if (profile.identity_gap) {
        audienceBlock += `\nThe identity they want to reach: ${profile.identity_gap}.
Every post should make this person feel seen — like it was written specifically for them. Content lives in the gap between who they are now and who they want to become.`;
    }
    sections.push(audienceBlock);

    // ── COMPETITOR BLOCK ──
    if (profile.competitor_context?.names?.length) {
        let competitorBlock = `=== COMPETITIVE DIFFERENTIATION ===
Main competitors/influences the audience follows: ${profile.competitor_context.names.join(', ')}.`;
        if (profile.competitor_context.shared_patterns) {
            competitorBlock += `\nWhat they all have in common: ${profile.competitor_context.shared_patterns}.`;
        }
        if (profile.competitor_context.whitespace) {
            competitorBlock += `\nThe white space (what nobody is doing): ${profile.competitor_context.whitespace}.
Every piece of content should reinforce this differentiation — consciously or unconsciously.`;
        }
        sections.push(competitorBlock);
    }

    // ── CONTENT PILLARS BLOCK ──
    const pillars = profile.content_pillars?.length ? profile.content_pillars : null;
    if (pillars && pillars.length > 0) {
        const pillarLines = pillars.map((p, i) => {
            const jobMetric = p.job === 'authority' ? 'Saves + Follows'
                : p.job === 'relatability' ? 'Shares + Reach'
                    : 'DMs + Leads';
            return `Pillar ${i + 1}: "${p.name}" — ${p.description}. Job: ${p.job.charAt(0).toUpperCase() + p.job.slice(1)}. Metric: ${jobMetric}.`;
        }).join('\n');

        sections.push(`=== CONTENT PILLARS ===
${pillarLines}
Ratio: 50% Pillar 1 (Authority), 30% Pillar 2 (Relatability), 20% Pillar 3 (Proof).
Pillars are NOT topics. They are jobs each post must do. A single topic can serve different pillars depending on the angle.`);
    } else if (profile.topics?.length) {
        // Fallback to legacy topics
        sections.push(`=== CONTENT TOPICS ===
Core topics: ${profile.topics.join(', ')}.
Balance between educational content, personal insights, and soft conversion.`);
    }

    // ── VOICE BLOCK ──
    const va = profile.voice_analysis;
    let voiceBlock = `=== VOICE ===
Write exactly like ${profile.name}.`;
    if (va?.descriptors?.length) {
        voiceBlock += `\nTheir voice is: ${va.descriptors.join(', ')}.`;
    }
    if (va?.positives?.length) {
        voiceBlock += `\nThey always: ${va.positives.join('; ')}.`;
    }
    if (va?.negatives?.length) {
        voiceBlock += `\nThey never: ${va.negatives.join('; ')}.`;
    }
    if (va?.sentence_pattern) {
        voiceBlock += `\nSentence structure: ${va.sentence_pattern}.`;
    }
    if (va?.vocabulary?.length) {
        voiceBlock += `\nVocabulary markers: ${va.vocabulary.join(', ')}.`;
    }
    if (voiceSamples.length > 0) {
        voiceBlock += `\n\nVOICE SAMPLES (MIMIC STYLE — DO NOT COPY):`;
        voiceSamples.slice(0, 5).forEach((s, i) => {
            voiceBlock += `\nSample ${i + 1}: "${s.content.substring(0, 500)}"`;
        });
        voiceBlock += `\n\nApply: similar sentence length, rhythm, directness, framing.
Do NOT: copy phrases verbatim, introduce jargon not in samples, over-polish the voice.`;
    } else if (profile.tone) {
        // Fallback to legacy tone
        voiceBlock += `\nTone: ${profile.tone.formality || 'professional'}, ${profile.tone.boldness || 'bold'}, ${profile.tone.style || 'educational'}, ${profile.tone.approach || 'story-driven'}.`;
    }
    sections.push(voiceBlock);

    // ── HOOK BLOCK ──
    sections.push(`=== HOOKS ===
Every post must open with one of these hook types:
- Contrarian: challenges a belief the audience holds
- Identity Challenge: attacks the gap between who they are and who they want to be
- Curiosity Gap: withholds just enough to make them stay
- Specific Result: leads with an outcome and makes them think "how?"
Match hook type to content type. Never open with context. Never open with "I". First line is everything.`);

    // ── CTA BLOCK ──
    const signatureCta = GOAL_CTA_MAP[profile.content_goal] || 'Follow for more.';
    sections.push(`=== CTA ===
One CTA per post. Never two, never zero. Match to trust temperature:
- Cold audience content (new reach): Follow / Save
- Warm audience content (existing followers): Comment / Share
- Hot audience content (ready to convert): DM / Link
Signature lead CTA: "${signatureCta}"`);

    // ── QUALITY RULES ──
    sections.push(`=== QUALITY RULES (NON-NEGOTIABLE) ===
- Never write a post that could have been written by anyone in the industry
- Never use generic motivational language without a framework behind it
- Never give advice without a specific mechanism, number, or example
- Never write a hook that starts with "I", "We", "Today", or "Did you know"
- Never end with a question when the goal is leads — questions are for engagement only
- Never generate disconnected posts — every week has a throughline
- Never treat pillars as topics — they are jobs each post must do
- Every post should move the reader one step closer to who they want to become`);

    return sections.join('\n\n');
}

// ============================================
// ARCHETYPE DETECTION FROM DISCOVERY ANSWERS
// ============================================

/**
 * Analyzes the 3 discovery answers to determine primary and secondary archetypes.
 * Uses keyword matching + scoring. Called during onboarding completion.
 */
export function detectArchetypeFromDiscovery(
    q1: string, // "what feels most natural"
    q2: string, // "what do people come to you for"
    q3: string  // "what do you hate seeing"
): { primary: string; secondary: string; flavor: string } {
    const answers = [q1, q2, q3].map(a => a.toLowerCase());
    const combined = answers.join(' ');

    // Score each archetype
    const scores: Record<string, number> = {
        builder: 0,
        teacher: 0,
        contrarian: 0,
        executive: 0,
    };

    // Q1: "what feels most natural"
    const q1Lower = q1.toLowerCase();
    if (q1Lower.includes('built') || q1Lower.includes('build') || q1Lower.includes('process') || q1Lower.includes('ship') || q1Lower.includes('making')) scores.builder += 3;
    if (q1Lower.includes('framework') || q1Lower.includes('break down') || q1Lower.includes('explain') || q1Lower.includes('teach') || q1Lower.includes('clarity')) scores.teacher += 3;
    if (q1Lower.includes('challeng') || q1Lower.includes('disagree') || q1Lower.includes('contrarian') || q1Lower.includes('different') || q1Lower.includes('wrong')) scores.contrarian += 3;
    if (q1Lower.includes('vision') || q1Lower.includes('lead') || q1Lower.includes('standard') || q1Lower.includes('direction') || q1Lower.includes('industry')) scores.executive += 3;

    // Q2: "what do people come to you for"
    const q2Lower = q2.toLowerCase();
    if (q2Lower.includes('process') || q2Lower.includes('how') || q2Lower.includes('behind') || q2Lower.includes('journey') || q2Lower.includes('build')) scores.builder += 3;
    if (q2Lower.includes('clarity') || q2Lower.includes('understand') || q2Lower.includes('learn') || q2Lower.includes('complex') || q2Lower.includes('guide')) scores.teacher += 3;
    if (q2Lower.includes('perspective') || q2Lower.includes('cut') || q2Lower.includes('noise') || q2Lower.includes('honest') || q2Lower.includes('real')) scores.contrarian += 3;
    if (q2Lower.includes('authority') || q2Lower.includes('trust') || q2Lower.includes('experience') || q2Lower.includes('respect') || q2Lower.includes('leadership')) scores.executive += 3;

    // Q3: "what do you hate seeing"
    const q3Lower = q3.toLowerCase();
    if (q3Lower.includes('sloppy') || q3Lower.includes('execution') || q3Lower.includes('quality') || q3Lower.includes('half') || q3Lower.includes('lazy')) scores.builder += 3;
    if (q3Lower.includes('vague') || q3Lower.includes('advice') || q3Lower.includes('fluff') || q3Lower.includes('surface') || q3Lower.includes('generic')) scores.teacher += 3;
    if (q3Lower.includes('safe') || q3Lower.includes('playing') || q3Lower.includes('boring') || q3Lower.includes('same') || q3Lower.includes('copy')) scores.contrarian += 3;
    if (q3Lower.includes('mediocr') || q3Lower.includes('low standard') || q3Lower.includes('amateur') || q3Lower.includes('unprofessional')) scores.executive += 3;

    // Sort by score
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const primary = sorted[0][0];
    const secondary = sorted[1][0];

    // Generate flavor description
    const primaryDesc = ARCHETYPE_DESCRIPTIONS[primary];
    const secondaryDesc = ARCHETYPE_DESCRIPTIONS[secondary];
    const flavor = `${primary.charAt(0).toUpperCase() + primary.slice(1)}-dominant with ${secondary} undertones. Leads with ${primaryDesc.does.split(',')[0]}, occasionally ${secondaryDesc.does.split(',')[0]}.`;

    return { primary, secondary, flavor };
}

// ============================================
// VOICE ANALYSIS (called with AI during onboarding)
// ============================================

/**
 * Builds the prompt to analyze voice samples.
 * The AI extracts positives, negatives, descriptors, patterns.
 */
export function buildVoiceAnalysisPrompt(voiceSamples: VoiceSample[]): string {
    if (voiceSamples.length === 0) return '';

    const samplesText = voiceSamples.map((s, i) =>
        `Sample ${i + 1}: "${s.content}"`
    ).join('\n\n');

    return `Analyze these writing samples from a founder. Extract:

SAMPLES:
${samplesText}

Return ONLY a valid JSON object:
{
    "descriptors": ["3 adjectives that describe their voice"],
    "positives": ["3 things they consistently do in their writing — patterns, structures, habits"],
    "negatives": ["3 things they never do — tones, phrases, styles they avoid"],
    "sentence_pattern": "description of their sentence structure pattern (short/medium/long, punchy vs flowing)",
    "vocabulary": ["5-8 specific words or phrases they use frequently"]
}

Be specific. Don't give generic answers like "professional" — identify what makes THIS voice unique.`;
}

/**
 * Builds the prompt to analyze competitor context.
 */
export function buildCompetitorAnalysisPrompt(
    competitors: string[],
    industry: string,
    scrapedContent?: string
): string {
    return `Analyze these 3 competitors/influences in the ${industry} space:

Competitors: ${competitors.join(', ')}

${scrapedContent ? `SCRAPED CONTENT FROM THEIR PROFILES:\n${scrapedContent}\n` : ''}

These are people/brands that the user's target audience currently follows. Identify:

1. shared_patterns: What do all 3 have in common? (tone, format, content type, positioning)
2. whitespace: What is NONE of them doing? What gap exists in the conversation?

Return ONLY a valid JSON object:
{
    "shared_patterns": "One paragraph describing what they all share",
    "whitespace": "One paragraph describing the opportunity — what nobody is doing"
}`;
}

/**
 * Builds a comprehensive prompt to generate the entire strategic foundation.
 * Used during onboarding completion when the user hasn't provided these manually.
 */
export function buildStrategicFoundationPrompt(
    profile: Partial<StrategyProfile>,
    archetype: { primary: string; secondary: string; flavor: string }
): string {
    return `You are a world-class brand strategist and positioning expert. Your goal is to build a high-leverage, distinct content foundation for a founder.

USER CONTEXT:
- Name: ${profile.name}
- Role: ${profile.role} at ${profile.company_name}
- Industry: ${profile.industry}
- Business: ${profile.business_description || 'Not specified.'}
- Audience: ${profile.target_audience || 'Industry professionals.'}
- Goal: ${profile.content_goal || 'Building authority.'}
- Archetype: ${archetype.primary} / ${archetype.secondary} (${archetype.flavor})

RAW INTEL:
${profile.personal_context?.length ? `PERSONAL HISTORY:\n${profile.personal_context.map(c => `- ${c.label}: ${c.value}`).join('\n')}` : ''}
${profile.product_context?.length ? `PRODUCT INTEL:\n${profile.product_context.map(c => `- ${c.label}: ${c.value}`).join('\n')}` : ''}

TASK:
Generate 5 strategic elements that define this brand. Be sharp, polarizing, and "spiky". Avoid safe, beige advice.

1. positioning_statement: A specific "I help [who] achieve [outcome] without [pain] using [method]" statement. It must feel like a category of one.
2. pov_statement: A "Spiky Point of View". This is a core conviction that is:
    - Polarizing (people might disagree)
    - Personal (based on experience)
    - Valid (you can prove it)
    - Examples: "Performance reviews are a waste of time" or "Quality doesn't scale".
3. identity_gap: A description of the "desired self" the audience wants to become. Focus on the transformation from a specific pain to a specific power.
4. content_pillars: Exactly 3 pillars. Each pillar must have a "Job":
    - Pillar 1 (Authority/Expertise): Teach them something they didn't know.
    - Pillar 2 (Relatability/Story): Show the raw building process.
    - Pillar 3 (Proof/Numbers): Demonstrate that you've actually done it.
5. competitor_whitespaces: Analyze the "beige" noise of the industry (shared_patterns) and identify the specific "blue ocean" gap (whitespace) this user fills.

Return ONLY a valid JSON object:
{
    "positioning_statement": "The full statement",
    "pov_statement": "The spiky conviction",
    "identity_gap": "The specific transformation",
    "content_pillars": [
        { "name": "Pillar 1", "description": "What it covers", "job": "authority" },
        { "name": "Pillar 2", "description": "What it covers", "job": "relatability" },
        { "name": "Pillar 3", "description": "What it covers", "job": "proof" }
    ],
    "competitor_whitespaces": {
        "shared_patterns": "What everyone else is repeating",
        "whitespace": "The specific gap you are filling"
    }
}

Be aggressive with your insights. If the user sounds like everyone else, you have failed.`;
}

/**
 * Builds the MASTER ONBOARDING PROMPT.
 * This is a massive, high-leverage prompt that does 5 things in one call:
 * 1. Voice Analysis
 * 2. Competitor Research
 * 4. Weekly Content Calendar (Plan only — do not generate post content yet)
 */
export function buildMasterOnboardingPrompt(
    data: any, // OnboardingData
    archetype: { primary: string; secondary: string; flavor: string },
    platforms: string[]
): string {
    const tier = data.subscriptionTier || 'starter';
    const isStarter = tier === 'starter';
    
    // For Starter, only use one platform even if multiple were selected in theory (guardrail)
    const activePlatforms = isStarter ? [platforms[0]] : platforms;
    const isX = activePlatforms.includes('x');
    const isLI = activePlatforms.includes('linkedin');
    
    const totalTextPosts = isStarter ? 7 : ((isX ? 7 : 0) + (isLI ? 5 : 0));
    const totalCarousels = isStarter ? 0 : (isLI ? 2 : 0);

    return `You are a world-class Brand Strategist and Content Architect. You do not generate posts. You build a complete brand strategy and then design a weekly content calendar that executes that strategy with surgical precision. Every output must feel like it was built specifically for this person — not generated.

---

USER CONTEXT:
- Name: ${data.name}
- Role: ${data.role} at ${data.companyName}
- Industry: ${data.industry}
- Primary Goal: ${data.contentGoal}
- Target Audience: ${data.targetAudience}
- Bio & Expertise: ${data.aboutYou}
- Primary Archetype: ${archetype.primary}
- Secondary Archetype: ${archetype.secondary}
- Flavor: ${archetype.flavor}

RAW INTEL — ground every strategic decision in this:
${data.personalContext?.length ? `PERSONAL HISTORY:\n${data.personalContext.map((c: any) => `- ${c.label}: ${c.value}`).join('\n')}` : ''}
${data.productContext ? `PRODUCT/OFFERING INTEL:\n${data.productContext}` : ''}

VOICE SAMPLES — analyze rhythm, confidence, sentence length, vocabulary, what they never say:
${data.voiceSamples.map((s: any, i: number) => `Sample ${i + 1}: ${s.content}`).join('\n\n')}

COMPETITOR CONTEXT:
${(data.competitors || []).filter((c: string) => c.trim() !== '').join(', ')}
${data.competitorScrapedData || ''}

---

PART 1: STRATEGIC DEFINITION

Build the brand foundation. Be specific, polarizing, and operator-led. No generic industry advice. No beige positioning. Every element must be derived from the user's actual context — not templated. If the user sounds like a generic corporate bot, you have failed.

1. VOICE ANALYSIS
Analyze the voice samples deeply. Extract:
- 3 descriptors that capture how this person sounds (not personality traits — communication style)
- Sentence rhythm and structure patterns
- Vocabulary markers — specific words and phrases they use consistently
- What they never say — tones, phrases, styles that are completely off-brand
- The one signature element that makes their voice immediately recognizable

2. COMPETITOR WHITESPACE
From the competitor data provided:
- Identify what all competitors have in common — shared tone, format, audience, model, angle (The "Beige" Noise)
- Identify the specific gap none of them are filling (The Blue Ocean)
- Define the category this user can own that no competitor currently occupies

3. BRAND FOUNDATION (THE STRATEGIC MOAT)
Using everything above, define:

POSITIONING STATEMENT
Format: "I help [specific who] achieve [specific outcome] without [specific pain] using [specific method]."
Must be: polarizing enough to repel the wrong people, specific enough to attract the right ones. Avoid "helping people reach potential" — be concrete.

POINT OF VIEW (SPIKY POV)
One sentence. The core belief this person holds about their industry that most people get wrong.
Must be: contrarian, defensible, and something their target audience secretly agrees with but hasn't heard said out loud. 

IDENTITY GAP
The transformation their audience is chasing. Not what they want to achieve — who they want to become.
Format: "From [who they are now] to [who they want to be]."

AUDIENCE LIMITING BELIEF
The one false belief their audience holds that keeps them stuck.
This is what the content must destroy. Your content's job is to make the audience realize their current way of thinking is obsolete.

CONTENT PILLARS
Exactly 3. No more.
Each pillar must:
- Map directly to: Authority (Saves), Relatability (Shares), or Proof (DMs)
- Emerge from the intersection of: archetype + identity gap + competitor whitespace
- Have a clear job — what it makes the audience think, feel, or do
- Ratio: 50% Authority, 30% Relatability, 20% Proof

---

PART 2: WEEKLY CALENDAR DESIGN

Design a cohesive week of content. This is not a list of disconnected posts — it is a weekly narrative with a throughline. Every post serves the strategy. Every post does a specific job.

BEFORE GENERATING ANY POST:
Define the weekly throughline — the single idea or theme that ties the entire week together. Every post this week should contribute to that one idea from a different angle.

PLATFORM RULES — NON-NEGOTIABLE QUANTITIES (TIER: ${tier.toUpperCase()}):
${isStarter ? `
- PLATFORM: Exactly ONE platform (${activePlatforms[0].toUpperCase()}).
- TEXT POSTS: Exactly 7 items total (1 per day for 7 days).
- FORMAT: "short" ONLY.
- NO carousels.` : `
X (if selected): Exactly 7 items total (1 per day for 7 days).
- 3 Long-form posts
- 4 Short posts

LinkedIn (if selected): Exactly 7 items total (1 per day for 7 days).
- 5 Text posts (3 long-form, 2 short-form)
- 2 Carousel topics`}

---

TOTAL ITEMS TO PLAN IN THE CALENDAR (DO NOT GENERATE TEXT CONTENT YET): 
- Posts: Exactly ${totalTextPosts} planned topics across all selected platforms.
- Carousels: Exactly ${totalCarousels} planned topics.

FOR EVERY ITEM IN THE CALENDAR (STRICT JSON ONLY, NO POST BODIES):
- Day (Monday through Sunday) and platform
- Format (long/short/carousel)
- Which pillar it serves (Authority/Relatability/Proof)
- Hook type: Contrarian / Identity Challenge / Curiosity Gap / Specific Result
- The topic — specific, not generic. "Why most [X] fail at [Y]" not "Tips for [industry]"
- CTA type: Follow/Save (new audience) / Comment/Share (warm) / DM/Link (hot)
- Posting time

HOOK RULES — NON-NEGOTIABLE:
- No "I", "We", "Today", or "Did you know". 
- No context first. 
- No generalities. 
- Open with a "Punch to the gut" or a "Framework name".
- The first line must be enough for someone to click "See More".

WEEKLY VALIDATION — before outputting check:
- Is this calendar distinct? 
- Does it leverage the user's specific product context?
- Is the weekly throughline strong?

CRITICAL: DO NOT WRITE THE ACTUAL CONTENT OF THE POSTS IN THIS CALL.
Only generate the "calendar" with topics, days, and metadata. Writing post content here will cause a system failure.

---

OUTPUT: STRICT JSON ONLY

Return ONLY a valid JSON object. No explanation, no markdown, no text outside the JSON.

{
  "weekly_throughline": "The single idea tying this week together",

  "voice_analysis": {
    "descriptors": ["descriptor 1", "descriptor 2", "descriptor 3"],
    "patterns": "Sentence rhythm and structure description",
    "vocabulary": ["marker word 1", "marker word 2", "marker word 3"],
    "never_says": ["phrase or tone 1", "phrase or tone 2", "phrase or tone 3"],
    "signature": "The one thing that makes their voice immediately recognizable"
  },

  "competitor_analysis": {
    "shared_patterns": "What all competitors have in common",
    "whitespace": "The specific gap none of them fill",
    "category_to_own": "The category this user can define and own"
  },

  "foundation": {
    "positioning_statement": "I help [who] achieve [outcome] without [pain] using [method]",
    "pov_statement": "The core contrarian belief — one sentence, no hedging",
    "identity_gap": "From [who they are now] to [who they want to become]",
    "limiting_belief": "The false belief the audience holds that the content must destroy",
    "content_pillars": [
      {
        "name": "Pillar name",
        "description": "What this pillar covers and why it matters",
        "job": "authority",
        "metric": "Saves + Follows"
      },
      {
        "name": "Pillar name",
        "description": "What this pillar covers and why it matters",
        "job": "relatability",
        "metric": "Shares + Reach"
      },
      {
        "name": "Pillar name",
        "description": "What this pillar covers and why it matters",
        "job": "proof",
        "metric": "DMs + Leads"
      }
    ]
  },

  "calendar": {
    "posts": [
      {
        "day": "Monday",
        "platform": "x",
        "format": "long",
        "pillar": "authority",
        "hook_type": "contrarian",
        "topic": "Specific, polarizing topic — not generic",
        "cta_type": "save",
        "time": "9:00 AM"
      }
    ],
    "carousels": [
      {
        "day": "Wednesday",
        "platform": "linkedin",
        "pillar": "authority",
        "topic": "Specific carousel topic",
        "hook_type": "identity_challenge",
        "slide_count": 8
      }
    ]
  }
}

Do not include any explanation or markdown outside the JSON.`;
}
