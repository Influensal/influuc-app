/**
 * Google Gemini Provider
 * Uses Google's Gemini API for content generation
 */

import { AIProviderInterface, AICompletionOptions, AICompletionResult } from './index';

export class GeminiProvider implements AIProviderInterface {
    name = 'gemini' as const;
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || '';
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    async complete(options: AICompletionOptions): Promise<AICompletionResult> {
        if (!this.isConfigured()) {
            throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY environment variable.');
        }

        // Format messages for Gemini
        const systemInstruction = options.messages.find(m => m.role === 'system')?.content;
        const contents = options.messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: typeof m.content === 'string'
                    ? [{ text: m.content }]
                    : m.content.map(part => {
                        if (part.type === 'image') {
                            const base64Data = part.image?.replace(/^data:image\/\w+;base64,/, "");
                            return {
                                inline_data: {
                                    mime_type: 'image/jpeg', // Defaulting to jpeg
                                    data: base64Data
                                }
                            };
                        }
                        return { text: part.text || '' };
                    }),
            }));

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents,
                    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                    generationConfig: {
                        temperature: options.temperature ?? 0.7,
                        maxOutputTokens: options.maxTokens ?? 2000,
                    },
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();

        return {
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
            provider: 'gemini',
            tokensUsed: data.usageMetadata?.totalTokenCount,
        };
    }
}
