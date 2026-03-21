/**
 * Anthropic/Claude Provider
 * Uses Claude 3.5 Sonnet for all content generation
 */

import { AIProviderInterface, AICompletionOptions, AICompletionResult } from './index';

// Claude Sonnet 4.5 - best for writing and reasoning
// Claude 3.5 Sonnet
const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';

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
            max_tokens: options.maxTokens ?? 8192,
            messages: otherMessages.map(m => {
                const contentBlocks = typeof m.content === 'string'
                    ? [{ type: 'text' as const, text: m.content }]
                    : m.content.map(part => {
                        if (part.type === 'image') {
                            const match = part.image?.match(/^data:(image\/\w+);base64,(.+)$/);
                            if (match) {
                                return {
                                    type: 'image' as const,
                                    source: {
                                        type: 'base64' as const,
                                        media_type: match[1],
                                        data: match[2],
                                    },
                                };
                            }
                            return {
                                type: 'image' as const,
                                source: {
                                    type: 'base64' as const,
                                    media_type: 'image/jpeg',
                                    data: part.image || '',
                                },
                            };
                        }
                        return { type: 'text' as const, text: part.text || '' };
                    });

                // Attach cache_control to the LAST block if present
                if (m.cache_control && contentBlocks.length > 0) {
                    (contentBlocks[contentBlocks.length - 1] as any).cache_control = m.cache_control;
                }

                return {
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: contentBlocks,
                };
            }),
        };

        // Add system prompt if present
        if (systemMessage) {
            const systemMsgObj = options.messages.find(m => m.role === 'system');
            if (systemMsgObj?.cache_control) {
                requestBody.system = [
                    { type: 'text', text: systemMessage, cache_control: systemMsgObj.cache_control }
                ];
            } else {
                requestBody.system = systemMessage;
            }
        }

        // Add temperature if specified
        if (options.temperature !== undefined) {
            requestBody.temperature = options.temperature;
        }

        let lastError: Error | null = null;
        const maxRetries = 3;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`[Anthropic] Provider overloaded/error. Retrying in ${delay}ms (Attempt ${attempt}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01',
                        'anthropic-beta': 'prompt-caching-2024-07-31',
                    },
                    body: JSON.stringify(requestBody),
                    signal: AbortSignal.timeout(300000), // 5 minute override to prevent Next.js automatic client aborts
                    cache: 'no-store'
                });

                if (response.status === 529 || response.status >= 500) {
                    const errorText = await response.text();
                    throw new Error(`Anthropic Server Error (${response.status}): ${errorText}`);
                }

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
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // If it's not a server error (e.g. 400 Bad Request), throw immediately
                if (lastError.message.includes('Anthropic API error')) throw lastError;

                // If last attempt, throw
                if (attempt === maxRetries) throw lastError;
            }
        }

        throw lastError;
    }
}
