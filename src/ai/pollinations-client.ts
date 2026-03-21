/**
 * AI Client using Pollinations.ai
 * Provides free text and image generation using open source models.
 */

'use server';

// ----------------------------------------------------------------------
// Types & Constants
// ----------------------------------------------------------------------

export type ModelCapability = 'reasoning' | 'coding' | 'fast' | 'creative';

interface ModelDef {
    id: string;
    feature: ModelCapability;
    description: string;
    context: number; // max context
    isFree: boolean;
}

// Registry of available models (synced with enter.pollinations.ai — free only)
const AVAILABLE_MODELS: ModelDef[] = [
    // --- FAST & SEARCH OPTIMIZED ---
    { id: 'gemini-fast', feature: 'fast', description: 'Google Gemini 2.5 Flash Lite', context: 32000, isFree: true },
    { id: 'perplexity-fast', feature: 'fast', description: 'Perplexity Sonar', context: 32000, isFree: true },
    { id: 'gemini-search', feature: 'fast', description: 'Google Gemini 2.5 Flash Lite + Search', context: 32000, isFree: true },
    { id: 'openai-fast', feature: 'fast', description: 'OpenAI GPT-5 Nano', context: 128000, isFree: true },
    { id: 'nova-fast', feature: 'fast', description: 'Amazon Nova Micro', context: 32000, isFree: true },
    { id: 'step-3.5-flash', feature: 'fast', description: 'Step 3.5 Flash (api.airforce)', context: 12800, isFree: true },

    // --- CREATIVE & HIGH-QUALITY ---
    { id: 'openai', feature: 'creative', description: 'OpenAI GPT-5 Mini', context: 128000, isFree: true },
    { id: 'claude-fast', feature: 'creative', description: 'Anthropic Claude Haiku 4.5', context: 128000, isFree: true },
    { id: 'minimax', feature: 'creative', description: 'MiniMax M2.5', context: 32000, isFree: true },
    { id: 'claude-airforce', feature: 'creative', description: 'Claude Sonnet 4.6 (api.airforce)', context: 250000, isFree: true },

    // --- REASONING & DEPTH ---
    { id: 'deepseek', feature: 'reasoning', description: 'DeepSeek V3.2', context: 64000, isFree: true },
    { id: 'kimi', feature: 'reasoning', description: 'Moonshot Kimi K2.5', context: 256000, isFree: true },
    { id: 'perplexity-reasoning', feature: 'reasoning', description: 'Perplexity Sonar Reasoning', context: 32000, isFree: true },

    // --- CODING & SAFETY ---
    { id: 'mistral', feature: 'coding', description: 'Mistral Small 3.2 24B', context: 32000, isFree: true },
    { id: 'qwen-coder', feature: 'coding', description: 'Qwen3 Coder 30B', context: 32000, isFree: true },
    { id: 'qwen-safety', feature: 'coding', description: 'Qwen3Guard 8B', context: 125000, isFree: true },
];

/**
 * Selects the best available model based on requested capability.
 * Handles fallbacks based on attempt count.
 */
function selectModel(capability: ModelCapability = 'creative', attempt: number = 0): string {
    // 1. Filter models matching capability and are free
    const validModels = AVAILABLE_MODELS.filter(m => m.feature === capability && m.isFree === true);

    // 2. If models found and we are on an early attempt, stay within capability
    if (validModels.length > 0 && attempt < validModels.length) {
        return validModels[attempt].id;
    }

    // 3. Fallback: Rotate through ALL free models
    const allFreeModels = AVAILABLE_MODELS.filter(m => m.isFree === true);
    if (allFreeModels.length === 0) return 'mistral'; // Hard fallback
    return allFreeModels[attempt % allFreeModels.length].id;
}

export async function generateContentWithPollinations(
    systemPrompt: string,
    userPrompt: string,
    images?: { inlineData: { mimeType: string, data: string } }[],
    options: {
        model?: string,
        capability?: ModelCapability, // New: Request specific capability
        response_format?: any,
        apiKey?: string,
        skipApiKey?: boolean,
        attempt?: number,
        _stripParameters?: boolean,
        _isFailover?: boolean
    } = {}
): Promise<any> {
    const hasImages = images && images.length > 0;
    const attempt = options.attempt || 0;

    // Use specific model if provided, OR select based on capability, OR default to creative
    let model = options.model || (hasImages ? 'openai' : selectModel(options.capability || 'creative', attempt));

    // Validate model: if user has a saved model that's no longer available, fall back
    if (options.model && !AVAILABLE_MODELS.find(m => m.id === options.model)) {
        console.warn(`⚠️ Model "${options.model}" not found in available models, falling back to auto-select.`);
        model = hasImages ? 'openai' : selectModel(options.capability || 'creative', attempt);
        // Clear the invalid model from options so retries don't re-use it
        options = { ...options, model: undefined };
    }

    // Override if specific capabilities are needed
    if (hasImages) {
        // Rotate vision models instead of retrying the same one
        const visionModels = ['openai', 'gemini', 'qwen-vl'];
        model = visionModels[attempt % visionModels.length];
    } else if (systemPrompt.toLowerCase().includes('search') && attempt === 0) {
        // Use high-reliability model for grounded JSON tasks on first try
        model = options.model || 'openai';
    }

    console.log(`🤖 Pollinations Expert Selector: Mode=${hasImages ? 'Vision' : 'Text'}, Model=${model}, Attempt=${attempt}`);

    try {
        // Only inject JSON rules if we are explicitly asking for a structured response
        const isStructured = options.response_format || systemPrompt.toLowerCase().includes('json');

        const messages: any[] = [
            {
                role: 'system',
                content: systemPrompt + (isStructured ? `
                
CRITICAL SAFETY & OUTPUT RULES:
- You must return ONLY the final structured JSON answer.
- Do NOT include internal reasoning, analysis, planning, or hidden thoughts OUTSIDE the JSON.
- Reasoning is ONLY permitted within the designated JSON fields (e.g., "thought", "insight").
- If you cannot complete the task, return a minimal valid JSON response instead of an empty output.
- Keep the response concise, factual, and strictly schema-compliant.
- Output ONLY the raw JSON string, starting with '{' and ending with '}'.
- NEVER include comments (// or /* ... */) in the JSON.
` : '')
            }
        ];

        let userContent: any;
        if (images && images.length > 0) {
            userContent = [{ type: 'text', text: userPrompt }];
            images.forEach(img => {
                userContent.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`
                    }
                });
            });
        } else {
            userContent = userPrompt;
        }

        messages.push({ role: 'user', content: userContent });

        // Sanitize model name: strip spaces, convert to kebab-case
        const sanitizedModel = model ? model.trim().replace(/\s+/g, '-').toLowerCase() : model;
        const targetModelDef = AVAILABLE_MODELS.find(m => m.id === model);

        // Construct request body carefully to avoid 400 validation errors
        const body: any = {
            messages: messages,
            model: sanitizedModel,
            stream: false,
        };

        // Only add response_format if a schema/format is requested AND model likely supports it
        if (options.response_format && !(options as any)._stripParameters) {
            body.response_format = options.response_format;
        }

        // Context token management
        if (targetModelDef && targetModelDef.context >= 16000 && !(options as any)._stripParameters) {
            if (model?.includes('deepseek')) {
                body.max_tokens = 4092;
            } else if (model === 'qwen-coder' || model === 'gemini-fast') {
                body.max_tokens = 9000;
            } else if (model === 'openai' || model === 'sur' || model === 'openai-fast' || model === 'mistral-nemo' || model === 'mistral') {
                body.max_tokens = 8192;
            } else {
                body.max_tokens = 4092;
            }
        } else if (!targetModelDef && !(options as any)._stripParameters) {
            body.max_tokens = 4092;
        }

        // API Key logic: STRICT client-only enforcement
        const effectiveApiKey = (options.apiKey && options.apiKey.trim() !== "") ? options.apiKey : null;

        if (!effectiveApiKey) {
            console.error(`❌ Pollinations Error: No API key provided (Client-only policy enforced)`);
            throw new Error(`Authentication failed: No API key available. Please add your Pollinations API key in settings.`);
        }

        console.log(`🔑 Using Pollinations Key: ${effectiveApiKey.substring(0, 7)}... (Client-side)`);

        let response: Response;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

        try {
            response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(effectiveApiKey ? { 'Authorization': `Bearer ${effectiveApiKey}` } : {})
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });
        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                console.warn(`🕒 Pollinations API request timed out (120s). Attempt: ${attempt}`);
                if (attempt < 2) {
                    return generateContentWithPollinations(systemPrompt, userPrompt, images, {
                        ...options,
                        attempt: attempt + 1,
                        model: selectModel(options.capability || 'creative', attempt + 1)
                    });
                }
                throw new Error('Pollinations API request timed out after multiple attempts.');
            }
            throw fetchError;
        } finally {
            clearTimeout(timeoutId);
        }

        const status = response.status;
        if (!response.ok) {
            let errorMessage = response.statusText;
            let errorBody: any = null;

            try {
                errorBody = await response.json();
                if (errorBody && errorBody.error && typeof errorBody.error === 'object') {
                    errorMessage = errorBody.error.message || JSON.stringify(errorBody.error);
                } else if (errorBody && typeof errorBody === 'object') {
                    errorMessage = JSON.stringify(errorBody);
                }
            } catch (e) {
                try {
                    errorMessage = await response.text() || response.statusText;
                } catch {
                    errorMessage = response.statusText;
                }
            }

            console.error(`❌ Pollinations API Error [${status}]: ${errorMessage}`);

            // Error handling (Auth, 400, 5xx)
            if (status === 401 || status === 403) {
                console.error(`❌ Pollinations Auth Failed (${status}). Ensure your API key is correct and has balance.`);
                throw new Error(`Authentication failed: Your API key is invalid or has no balance. Please check your settings.`);
            }

            if (status === 400) {
                const alreadyStripped = (options as any)._stripParameters;
                if (!alreadyStripped && (options.response_format || body.max_tokens)) {
                    return generateContentWithPollinations(systemPrompt, userPrompt, images, {
                        ...options,
                        _stripParameters: true
                    });
                } else if (attempt < 2) {
                    return generateContentWithPollinations(systemPrompt, userPrompt, images, {
                        ...options,
                        attempt: attempt + 1,
                        _stripParameters: false,
                        model: selectModel(options.capability || 'creative', attempt + 1)
                    });
                }
            }

            if ((status >= 500 || status === 429) && attempt < 2) {
                const retryAfter = status === 429 ? 2000 : 1000;
                console.warn(`⚠️ Pollinations API error (${status}). Retrying in ${retryAfter}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter));
                return generateContentWithPollinations(systemPrompt, userPrompt, images, {
                    ...options,
                    attempt: attempt + 1,
                    model: selectModel(options.capability || 'creative', attempt + 1)
                });
            }

            throw new Error(`Pollinations API error: ${status} ${errorMessage}`);
        }

        const data = await response.json();
        console.log(`✅ Pollinations Response Success [Model: ${model}]`);

        let text = data.choices?.[0]?.message?.content || "";
        if (!text || text.trim() === '') {
            throw new Error('Pollinations returned empty content (retryable)');
        }

        // Sanitization & JSON Repair
        text = text.replace(/```json\n?|\n?```/g, '').trim();

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(text);
        } catch (e) {
            // Find the first '{' and the LAST valid top-level '}'
            const firstBrace = text.indexOf('{');
            if (firstBrace === -1) return text;

            let braceCount = 0;
            let lastValidBrace = -1;
            let inString = false;
            let isEscaped = false;

            for (let i = firstBrace; i < text.length; i++) {
                const char = text[i];
                if (isEscaped) { isEscaped = false; continue; }
                if (char === '\\') { isEscaped = true; continue; }
                if (char === '"') { inString = !inString; continue; }
                if (!inString) {
                    if (char === '{') braceCount++;
                    else if (char === '}') {
                        braceCount--;
                        if (braceCount === 0) { lastValidBrace = i; break; }
                    }
                }
            }

            if (lastValidBrace === -1) {
                console.warn('⚠️ Incomplete JSON detected, attempting structural repair...');
                let extracted = text.substring(firstBrace).trim();

                // 1. Clean up "..." and other noise that might be mid-structure
                extracted = extracted.replace(/\[\s*\.\.\.\s*\]/g, '[]')
                    .replace(/\.\.\.\s*\(truncated\)/g, '')
                    .replace(/\.\.\./g, '');

                // 2. Remove trailing garbage that would prevent closing (comma, colon, or partial structural symbols)
                // We keep repeating this until no more trailing garbage exists (e.g., if we have ", ")
                while (extracted.length > 0 && /[,:\[\{]\s*$/.test(extracted)) {
                    extracted = extracted.trim().slice(0, -1);
                }

                // 3. Close open quotes if any
                let inString = false;
                let isEscaped = false;
                for (let i = 0; i < extracted.length; i++) {
                    if (isEscaped) { isEscaped = false; continue; }
                    if (extracted[i] === '\\') { isEscaped = true; continue; }
                    if (extracted[i] === '"') inString = !inString;
                }
                if (inString) extracted += '"';

                // 4. Use a stack to track open structural elements and close them in order
                const stack: string[] = [];
                inString = false;
                isEscaped = false;
                for (let i = 0; i < extracted.length; i++) {
                    const char = extracted[i];
                    if (isEscaped) { isEscaped = false; continue; }
                    if (char === '\\') { isEscaped = true; continue; }
                    if (char === '"') { inString = !inString; continue; }
                    if (!inString) {
                        if (char === '{' || char === '[') stack.push(char);
                        else if (char === '}') { if (stack[stack.length - 1] === '{') stack.pop(); }
                        else if (char === ']') { if (stack[stack.length - 1] === '[') stack.pop(); }
                    }
                }

                // Append closing characters in correct reverse order
                while (stack.length > 0) {
                    const openChar = stack.pop();
                    extracted += (openChar === '{' ? '}' : ']');
                }

                try {
                    parsedResponse = JSON.parse(extracted);
                } catch (repairError) {
                    console.error("❌ Stack-based JSON repair failed:", repairError, "\nPartial JSON extracted:", extracted);
                    const { StructuredOutputError } = await import('./client-dispatcher');
                    throw new StructuredOutputError(`Failed to parse or repair JSON: ${repairError}`, extracted);
                }
            } else {
                parsedResponse = JSON.parse(text.substring(firstBrace, lastValidBrace + 1));
            }
        }

        // Deep extraction
        const deepExtract = (obj: any, currentDepth: number = 0): any => {
            if (currentDepth > 10 || !obj || typeof obj !== 'object') return null;
            if (obj.topic || (obj.mode === 'compare' && obj.compareData)) return obj;
            if (obj.similarities || obj.differences) return obj;

            const content = obj.content || obj.text || obj.message?.content || (obj.choices && obj.choices[0]?.message?.content);
            if (content) {
                if (typeof content === 'string') {
                    try {
                        const first = content.indexOf('{');
                        const last = content.lastIndexOf('}');
                        if (first !== -1 && last !== -1) return deepExtract(JSON.parse(content.substring(first, last + 1)), currentDepth + 1);
                        return deepExtract(JSON.parse(content), currentDepth + 1);
                    } catch { }
                } else {
                    return deepExtract(content, currentDepth + 1);
                }
            }

            if (Array.isArray(obj.tool_calls) && obj.tool_calls.length > 0) {
                const args = obj.tool_calls[0].function?.arguments;
                if (args) {
                    try {
                        return deepExtract(typeof args === 'string' ? JSON.parse(args) : args, currentDepth + 1);
                    } catch { }
                }
            }

            for (const key in obj) {
                const found = deepExtract(obj[key], currentDepth + 1);
                if (found) return found;
            }
            return null;
        };

        return deepExtract(parsedResponse) || parsedResponse;
    } catch (error: any) {
        console.error("Pollinations AI Generation Failed:", error);
        throw new Error(`Pollinations API failed: ${error.message}`);
    }
}

/**
 * Checks the current pollen balance for a given API key.
 */
export async function checkPollinationsBalance(apiKey: string): Promise<number | null> {
    try {
        const response = await fetch('https://gen.pollinations.ai/account/balance', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) {
            const data = await response.json();
            return typeof data.balance === 'number' ? data.balance : null;
        }
        return null;
    } catch (e) {
        console.error('⚠️ Failed to check Pollinations balance:', e);
        return null;
    }
}
