/**
 * Anthropic/Claude Provider
 * Uses Claude 3.5 Sonnet for all content generation
 */

import { AIProviderInterface, AICompletionOptions, AICompletionResult } from './index';

// Claude Sonnet 4.5 - best for writing and reasoning
// Claude 3.5 Sonnet
const CLAUDE_MODEL = 'claude-sonnet-4-5';

export class AnthropicProvider implements AIProviderInterface {
    name = 'anthropic' as const;
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    async complete(options: AICompletionOptions): Promise<AICompletionResult> {
        if (!this.isConfigured()) {
            throw new Error('Anthropic API key is not configured. Set ANTHROPIC_API_KEY environment variable.');
        }

        // Extract system message if present
        const systemMessage = options.messages.find(m => m.role === 'system')?.content;
        const otherMessages = options.messages.filter(m => m.role !== 'system');

        const requestBody: Record<string, unknown> = {
            model: CLAUDE_MODEL,
            max_tokens: options.maxTokens ?? 4096,
            messages: otherMessages.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content,
            })),
        };

        // Add system prompt if present
        if (systemMessage) {
            requestBody.system = systemMessage;
        }

        // Add temperature if specified
        if (options.temperature !== undefined) {
            requestBody.temperature = options.temperature;
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Anthropic API error: ${error.error?.message || JSON.stringify(error)}`);
        }

        const data = await response.json();

        return {
            content: data.content[0]?.text || '',
            provider: 'anthropic',
            tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        };
    }
}
