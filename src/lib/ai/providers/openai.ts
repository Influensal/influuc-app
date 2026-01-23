/**
 * OpenAI Provider
 * Uses OpenAI's API for content generation
 */

import { AIProviderInterface, AICompletionOptions, AICompletionResult } from './index';

export class OpenAIProvider implements AIProviderInterface {
    name = 'openai' as const;
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || '';
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    async complete(options: AICompletionOptions): Promise<AICompletionResult> {
        if (!this.isConfigured()) {
            throw new Error('OpenAI API key is not configured. Set OPENAI_API_KEY environment variable.');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo-preview',
                messages: options.messages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 2000,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();

        return {
            content: data.choices[0]?.message?.content || '',
            provider: 'openai',
            tokensUsed: data.usage?.total_tokens,
        };
    }
}
