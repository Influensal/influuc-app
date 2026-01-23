/**
 * Mock AI Provider
 * Returns realistic placeholder content for development
 */

import { AIProviderInterface, AICompletionOptions, AICompletionResult } from './index';

export class MockProvider implements AIProviderInterface {
    name = 'mock' as const;

    isConfigured(): boolean {
        return true; // Mock is always available
    }

    async complete(options: AICompletionOptions): Promise<AICompletionResult> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

        const userMessage = options.messages.find(m => m.role === 'user')?.content || '';

        // Generate contextual mock responses based on the prompt
        const content = this.generateMockResponse(userMessage);

        return {
            content,
            provider: 'mock',
            tokensUsed: Math.floor(content.length / 4),
        };
    }

    private generateMockResponse(prompt: string): string {
        const lowerPrompt = prompt.toLowerCase();

        // Voice analysis mock
        if (lowerPrompt.includes('voice') || lowerPrompt.includes('analyze') || lowerPrompt.includes('writing')) {
            return JSON.stringify({
                tone: 'conversational',
                formality: 'professional-casual',
                sentence_length: 'mixed',
                vocabulary: 'accessible',
                pov: 'first-person',
                opinion_density: 'high',
                hooks: 'question-based',
                structure: 'punchy-paragraphs',
            });
        }

        // Weekly content planning mock - MUST return posts array format
        if (lowerPrompt.includes('plan') || lowerPrompt.includes('week') || lowerPrompt.includes('schedule') || lowerPrompt.includes('calendar') || lowerPrompt.includes('strategy')) {
            return JSON.stringify({
                posts: [
                    { day: 'Monday', platform: 'linkedin', format: 'long_form', topic: 'Industry insight on SaaS trends', time: '10:00 AM' },
                    { day: 'Wednesday', platform: 'linkedin', format: 'single', topic: 'Leadership lesson learned', time: '11:00 AM' },
                    { day: 'Friday', platform: 'linkedin', format: 'thread', topic: 'How-to guide for founders', time: '9:00 AM' },
                ],
                themes: ['Leadership', 'SaaS Growth', 'Founder Journey'],
            });
        }

        // X/Twitter post mock
        if (lowerPrompt.includes('twitter') || lowerPrompt.includes(' x ') || lowerPrompt.includes('tweet')) {
            const tweets = [
                "The best founders I know don't chase trends.\n\nThey obsess over problems.\n\nTrends fade. Problems compound.",
                "Building in public taught me one thing:\n\nPeople don't follow your product.\nThey follow your journey.\n\nShare the messy middle.",
                "Hot take: Your content strategy shouldn't feel like strategy.\n\nIf it feels forced, your audience knows.\n\nWrite what you'd actually say to a friend.",
            ];
            return tweets[Math.floor(Math.random() * tweets.length)];
        }

        // LinkedIn post mock - return just the content, no JSON
        if (lowerPrompt.includes('linkedin') || lowerPrompt.includes('write a post')) {
            return `I've been thinking a lot about founder burnout.

Last month, I hit a wall. Not the "I need a vacation" kind—the "why am I doing this?" kind.

Here's what helped me reset:

1. I stopped checking metrics every hour. Obsessive tracking doesn't equal progress.

2. I talked to customers instead of investors. Reminded me why we started.

3. I blocked 2 hours daily for deep work. No Slack, no email, no exceptions.

The irony? Our best month happened when I stepped back.

Sometimes the most productive thing you can do is trust your team and get out of the way.

What's your reset ritual when you hit a wall?`;
        }



        // Default mock response
        return "This is mock-generated content. Connect an AI provider (OpenAI, Anthropic, or Gemini) for real content generation.";
    }
}
