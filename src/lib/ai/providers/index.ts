/**
 * AI Provider Abstraction Layer
 * Easy switch between Anthropic, OpenAI, and Gemini
 */

export type AIProvider = 'mock' | 'openai' | 'anthropic' | 'gemini';

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AICompletionOptions {
    messages: AIMessage[];
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: 'text' | 'json_object' };
}

export interface AICompletionResult {
    content: string;
    provider: AIProvider;
    tokensUsed?: number;
}

// Provider interface that all providers must implement
export interface AIProviderInterface {
    name: AIProvider;
    complete(options: AICompletionOptions): Promise<AICompletionResult>;
    isConfigured(): boolean;
}

// Get the configured provider
export function getActiveProvider(): AIProvider {
    const provider = process.env.NEXT_PUBLIC_AI_PROVIDER as AIProvider;
    return provider || 'mock';
}

// Factory function to get provider instance
export async function getProvider(): Promise<AIProviderInterface> {
    const activeProvider = getActiveProvider();

    switch (activeProvider) {
        case 'openai':
            const { OpenAIProvider } = await import('./openai');
            return new OpenAIProvider();
        case 'anthropic':
            const { AnthropicProvider } = await import('./anthropic');
            return new AnthropicProvider();
        case 'gemini':
            const { GeminiProvider } = await import('./gemini');
            return new GeminiProvider();
        case 'mock':
        default:
            const { MockProvider } = await import('./mock');
            return new MockProvider();
    }
}

// Convenience function for generating content
export async function generateContent(prompt: string, systemPrompt?: string): Promise<string> {
    const provider = await getProvider();

    const messages: AIMessage[] = [];

    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const result = await provider.complete({ messages });
    return result.content;
}
