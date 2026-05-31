import { withCircuitBreaker } from '../server-utils/circuitBreaker';

const GEMINI_MODEL = 'gemini-flash-latest';

export const Type = {
    OBJECT: 'OBJECT',
    ARRAY: 'ARRAY',
    STRING: 'STRING',
    INTEGER: 'INTEGER',
} as const;

export async function generateGeminiText(contents: any[], config?: Record<string, any>): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('Gemini API key is not configured.');
    }
    const timeoutMs = Number.parseInt(process.env.GEMINI_REQUEST_TIMEOUT_MS || '35000', 10) || 35000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const normalizedContents = contents.every(item => item && typeof item === 'object' && Array.isArray(item.parts))
        ? contents
        : [{
            parts: contents.map(item => {
                if (typeof item === 'string') return { text: item };
                if (item?.inlineData) return { inlineData: item.inlineData };
                return item;
            }),
        }];

    let response;
    try {
        response = await withCircuitBreaker(
            { name: 'gemini', failureThreshold: Number.parseInt(process.env.GEMINI_CIRCUIT_FAILURE_THRESHOLD || '5', 10) || 5 },
            () => fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: normalizedContents,
                    ...(config ? { generationConfig: config } : {}),
                }),
                signal: controller.signal,
            }
        ));
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Gemini request failed with ${response.status}: ${detail.slice(0, 300)}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => typeof part.text === 'string' ? part.text : '')
        .join('')
        .trim() || '';
}
