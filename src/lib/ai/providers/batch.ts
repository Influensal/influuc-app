/**
 * Anthropic Message Batches API
 * Submits multiple message requests as a single batch for async processing.
 * 50% cost savings vs standard API calls.
 * 
 * Docs: https://docs.anthropic.com/en/docs/build-with-claude/batch-processing
 */

const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';
const BATCH_API_URL = 'https://api.anthropic.com/v1/messages/batches';

// ============================================
// TYPES
// ============================================

export interface BatchRequestParams {
    model?: string;
    max_tokens: number;
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    temperature?: number;
}

export interface BatchRequestItem {
    custom_id: string;
    params: BatchRequestParams;
}

export interface BatchResponse {
    id: string;
    type: 'message_batch';
    processing_status: 'in_progress' | 'canceling' | 'ended';
    request_counts: {
        processing: number;
        succeeded: number;
        errored: number;
        canceled: number;
        expired: number;
    };
    ended_at: string | null;
    created_at: string;
    expires_at: string;
    results_url: string | null;
}

export interface BatchResultItem {
    custom_id: string;
    result: {
        type: 'succeeded' | 'errored' | 'canceled' | 'expired';
        message?: {
            id: string;
            content: Array<{ type: 'text'; text: string }>;
            usage: { input_tokens: number; output_tokens: number };
        };
        error?: {
            type: string;
            message: string;
        };
    };
}

// ============================================
// HELPERS
// ============================================

function getApiKey(): string {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
    return key;
}

function getHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'x-api-key': getApiKey(),
        'anthropic-version': '2023-06-01',
    };
}

// ============================================
// BATCH API FUNCTIONS
// ============================================

/**
 * Submit a batch of message requests for async processing.
 * Returns the batch object with an ID for polling.
 */
export async function createBatch(requests: BatchRequestItem[]): Promise<BatchResponse> {
    // Ensure all requests have the model set
    const normalizedRequests = requests.map(req => ({
        custom_id: req.custom_id,
        params: {
            model: req.params.model || CLAUDE_MODEL,
            ...req.params,
        },
    }));

    console.log(`[Batch] Submitting batch with ${normalizedRequests.length} requests...`);

    const response = await fetch(BATCH_API_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ requests: normalizedRequests }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Batch API create failed (${response.status}): ${error}`);
    }

    const batch: BatchResponse = await response.json();
    console.log(`[Batch] Created batch ${batch.id} — status: ${batch.processing_status}`);
    return batch;
}

/**
 * Poll a batch for its current status.
 */
export async function getBatchStatus(batchId: string): Promise<BatchResponse> {
    const response = await fetch(`${BATCH_API_URL}/${batchId}`, {
        method: 'GET',
        headers: getHeaders(),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Batch API status failed (${response.status}): ${error}`);
    }

    return response.json();
}

/**
 * Fetch batch results from the results_url (JSONL format).
 * Each line is a JSON object with { custom_id, result }.
 */
export async function getBatchResults(resultsUrl: string): Promise<BatchResultItem[]> {
    const response = await fetch(resultsUrl, {
        method: 'GET',
        headers: getHeaders(),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Batch results fetch failed (${response.status}): ${error}`);
    }

    const text = await response.text();

    // JSONL: each line is a separate JSON object
    const results: BatchResultItem[] = text
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

    return results;
}

/**
 * Poll a batch until it completes or times out.
 * Returns the final batch status and results.
 * 
 * @param batchId - The batch ID to poll
 * @param maxWaitMs - Maximum time to wait (default: 100 seconds)
 * @param pollIntervalMs - Time between polls (default: 5 seconds)
 */
export async function waitForBatch(
    batchId: string,
    maxWaitMs: number = 100_000,
    pollIntervalMs: number = 5_000
): Promise<{ batch: BatchResponse; results: BatchResultItem[] }> {
    const startTime = Date.now();
    let batch: BatchResponse;

    console.log(`[Batch] Waiting for batch ${batchId} (max ${maxWaitMs / 1000}s)...`);

    while (true) {
        batch = await getBatchStatus(batchId);

        if (batch.processing_status === 'ended') {
            console.log(`[Batch] Batch ${batchId} completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
            console.log(`[Batch] Results: ${batch.request_counts.succeeded} succeeded, ${batch.request_counts.errored} errored`);
            break;
        }

        const elapsed = Date.now() - startTime;
        if (elapsed >= maxWaitMs) {
            throw new Error(
                `Batch ${batchId} timed out after ${maxWaitMs / 1000}s. ` +
                `Status: ${batch.processing_status}, ` +
                `Processing: ${batch.request_counts.processing}, ` +
                `Succeeded: ${batch.request_counts.succeeded}`
            );
        }

        const remaining = Math.ceil((maxWaitMs - elapsed) / 1000);
        console.log(
            `[Batch] Still processing... ` +
            `(${batch.request_counts.succeeded}/${batch.request_counts.processing + batch.request_counts.succeeded} done, ` +
            `${remaining}s remaining)`
        );

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    // Fetch results
    if (!batch.results_url) {
        throw new Error(`Batch ${batchId} ended but has no results_url`);
    }

    const results = await getBatchResults(batch.results_url);
    return { batch, results };
}

/**
 * Extract the text content from a successful batch result item.
 */
export function extractResultContent(item: BatchResultItem): string | null {
    if (item.result.type !== 'succeeded' || !item.result.message) {
        console.error(`[Batch] Result for ${item.custom_id} failed: ${item.result.type}`, item.result.error);
        return null;
    }

    const textBlock = item.result.message.content.find(c => c.type === 'text');
    return textBlock?.text || null;
}
