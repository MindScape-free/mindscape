import { generateContentWithPollinations, ModelCapability } from './pollinations-client';
export type AIProvider = 'pollinations';

interface GenerateContentOptions {
    provider?: AIProvider;
    apiKey?: string;
    systemPrompt: string;
    userPrompt: string;
    images?: { inlineData: { mimeType: string, data: string } }[];
    schema?: any; // Zod schema for validation
    model?: string; // Optional model name
    capability?: ModelCapability; // Optional capability hint
    strict?: boolean; // Optional strict response validation
    options?: {
        model?: string;
        capability?: ModelCapability;
    };
}

export class StructuredOutputError extends Error {
    constructor(message: string, public rawOutput: string, public zodError?: any) {
        super(message);
        this.name = 'StructuredOutputError';
    }
}

/**
 * Helper to retry a function with exponential backoff
 */
async function retry<T>(fn: (attempt: number) => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn(i);
        } catch (err: any) {
            lastError = err;

            const errorMessage = err.message || "";
            const statusCode = err.status || (err.response && err.response.status);

            const isRateLimit = statusCode === 429 || errorMessage.toLowerCase().includes('rate limit');
            const isTimeout = statusCode === 408 ||
                errorMessage.toLowerCase().includes('timeout') ||
                err.code === 'UND_ERR_HEADERS_TIMEOUT';
            const isRetryableServerErr = statusCode >= 500 || [502, 503, 504].includes(statusCode);

            // AI-specific retryable errors: syntax errors in JSON and reasoning-only outputs
            const isAISyntaxError = (err instanceof StructuredOutputError || err.name === 'StructuredOutputError') && !err.zodError;
            const isReasoningOnlyErr =
                errorMessage.toLowerCase().includes('reasoning-only') ||
                errorMessage.toLowerCase().includes('empty content') ||
                errorMessage.toLowerCase().includes('reasoning-heavy');

            const shouldRetry = isRateLimit || isTimeout || isRetryableServerErr || isAISyntaxError || isReasoningOnlyErr;

            if (i < retries - 1 && shouldRetry) {
                // For rate limits or AI errors, we wait and retry
                const jitter = Math.random() * 2000;
                const waitTime = isRateLimit
                    ? (5000 * (i + 1)) + jitter
                    : (isAISyntaxError || isReasoningOnlyErr)
                        ? 1000 + jitter // Short wait for AI to "think again"
                        : delayMs * Math.pow(2, i) + jitter;

                console.warn(`Attempt ${i + 1} failed (${isRateLimit ? 'Rate Limit' : isAISyntaxError ? 'JSON Syntax' : isReasoningOnlyErr ? 'Reasoning Only' : 'Provider Error'}), retrying in ${Math.round(waitTime)}ms...`, errorMessage);
                await new Promise(res => setTimeout(res, waitTime));
            } else {
                // Non-retryable error or out of retries
                throw err;
            }
        }
    }
    throw lastError;
}

// Simple in-memory circuit breaker
let pollinationsDisabledUntil = 0;

function isPollinationsAvailable() {
    return Date.now() > pollinationsDisabledUntil;
}

function disablePollinations(minutes = 10) {
    pollinationsDisabledUntil = Date.now() + minutes * 60 * 1000;
    console.warn(`🚫 Pollinations disabled for ${minutes} minutes due to repeated failures.`);
}

/**
 * Health monitor for AI providers to enable smart fallback
 */
class ProviderMonitor {
    private health: Record<AIProvider, { success: number; failure: number; status: 'healthy' | 'degraded' | 'down' }> = {
        pollinations: { success: 0, failure: 0, status: 'healthy' }
    };

    recordSuccess(provider: AIProvider) {
        if (!this.health[provider]) return;
        this.health[provider].success++;
        this.health[provider].failure = 0; // Reset failures on success
        this.updateStatus(provider);
    }

    recordFailure(provider: AIProvider) {
        if (!this.health[provider]) return;
        this.health[provider].failure++;
        this.updateStatus(provider);
    }

    getStatus(provider: AIProvider) {
        return this.health[provider]?.status || 'healthy';
    }

    getFailureCount(provider: AIProvider): number {
        return this.health[provider]?.failure || 0;
    }

    private updateStatus(provider: AIProvider) {
        const p = this.health[provider];
        if (p.failure > 5) p.status = 'down';
        else if (p.failure > 2) p.status = 'degraded';
        else p.status = 'healthy';
    }
}

const providerMonitor = new ProviderMonitor();

/**
 * Detects if a response object contains only AI reasoning/planning 
 * but lacks the actual structured data fields.
 */
function isReasoningOnly(raw: any, schema?: any, isFinalAttempt: boolean = false): boolean {
    if (typeof raw !== 'object' || raw === null) return false;

    // Detect reasoning-heavy fields used by various models
    const hasReasoning = !!raw.reasoning_content || !!raw.reasoning || (typeof raw.thought === 'string' && raw.thought.length > 200);

    // Check for "meaningful" data.
    const hasSubTopics = Array.isArray(raw.subTopics) && raw.subTopics.length > 0;
    const hasCompareData = !!raw.compareData || !!raw.similarities || !!raw.differences;
    const hasRootData = !!raw.root || !!raw.topic;

    // Check for general content fields (for non-mindmap tasks)
    const hasGeneralContent = !!raw.content || !!raw.text || !!raw.enhancedPrompt || !!raw.answer || !!raw.result;

    // Mind Map detection
    const isMindMapSchema = (schema?.description || '').toLowerCase().includes('mind map') || JSON.stringify(schema || {}).toLowerCase().includes('subtopics');

    if (isMindMapSchema && hasRootData && !hasSubTopics) {
        if (isFinalAttempt) {
            console.warn('⚠️ Final attempt: Accepting response with topic but no subTopics.');
            return false;
        }
        return true;
    }

    // If it has reasoning but ALSO has either mindmap data, compare data, OR general content, it's NOT reasoning-only.
    const hasActualData = hasSubTopics || hasCompareData || hasGeneralContent;

    // If it's a very small object and has reasoning, it's likely reasoning-only
    if (Object.keys(raw).length <= 2 && hasReasoning && !hasActualData) {
        return !isFinalAttempt;
    }

    // If it's not a mindmap or compare task, be much more lenient
    if (!isMindMapSchema && !hasCompareData) {
        // If it has any data at all, it's fine
        if (hasActualData) return false;
        // If it only has reasoning and it's not the final attempt, retry
        return hasReasoning && !isFinalAttempt;
    }

    return hasReasoning && !hasActualData;
}

/**
 * Unified AI Client Dispatcher
 * Routes requests to the appropriate provider (Pollinations only now!)
 */
export async function generateContent(options: GenerateContentOptions): Promise<any> {
    const provider: AIProvider = 'pollinations'; // Force pollinations
    const { apiKey, systemPrompt, userPrompt, images, schema } = options;
    const strict = false; // Rigidly disabled

    // Inject JSON-only instruction into system prompt if schema is provided
    const effectiveSystemPrompt = schema
        ? `${systemPrompt}\n\nPlease respond with a valid JSON object matching the requested schema.`
        : systemPrompt;

    console.log('🔌 AI Provider: pollinations (Single engine active)');

    try {
        const result = await retry(async (retryIndex) => {
            const retriesCount = 2;
            const isFinalAttempt = retryIndex === retriesCount - 1;

            // Tracking total attempt for model rotation (monitor failures + current retry index)
            const baseFailureCount = providerMonitor.getFailureCount('pollinations');
            const currentAttempt = baseFailureCount + retryIndex;

            const raw = await generateContentWithPollinations(effectiveSystemPrompt, userPrompt, images, {
                model: options.model || options.options?.model,
                capability: options.capability || options.options?.capability,
                apiKey: options.apiKey,
                response_format: schema ? { type: 'json_object' } : undefined,
                attempt: currentAttempt
            });

            if (isReasoningOnly(raw, schema, isFinalAttempt)) {
                throw new Error('Pollinations returned reasoning-only or empty data (retryable)');
            }

            console.log(`✅ Pollinations Response Success. Raw length: ${JSON.stringify(raw).length} chars`);
            return validateAndParse(raw, schema, strict);
        }, 2); // 2 retries as requested

        providerMonitor.recordSuccess('pollinations');
        return result;
    } catch (error: any) {
        providerMonitor.recordFailure('pollinations');
        console.error("Pollinations AI Error:", error);
        throw error;
    }
}

/**
 * Normalizes a {name, children} tree format into the expected mind map schema.
 * Some models (gemini-fast) return a generic tree instead of the exact schema.
 * 
 * Tree depth mapping:
 *   Root          → { topic, shortTitle, icon, subTopics }
 *   Level 1       → subTopics: [{ name, icon, categories }]
 *   Level 2       → categories: [{ name, icon, subCategories }]
 *   Level 3+      → subCategories: [{ name, description, icon }]
 */
function normalizeMindMapTree(tree: any): any {
    const rootName = tree.name || tree.title || 'Document Mind Map';
    const rootChildren = tree.children || [];

    // Build subTopics from level 1 children
    const subTopics = rootChildren.map((l1: any) => {
        const l1Children = l1.children || [];

        // Build categories from level 2 children
        const categories = l1Children.map((l2: any) => {
            const l2Children = l2.children || [];

            // Build subCategories from level 3+ children
            const subCategories = l2Children.map((l3: any) => ({
                name: l3.name || l3.title || 'Detail',
                description: l3.description || l3.value || l3.content
                    || (l3.children && l3.children.length > 0
                        ? l3.children.map((c: any) => c.name || c.title || '').join(', ')
                        : `Details about ${l3.name || 'this item'}`),
                icon: l3.icon || 'circle',
                tags: l3.tags || [],
            }));

            return {
                name: l2.name || l2.title || 'Category',
                icon: l2.icon || 'folder',
                subCategories: subCategories.length > 0 ? subCategories : [
                    { name: l2.name || 'Detail', description: l2.description || `About ${l2.name}`, icon: 'circle' }
                ],
            };
        });

        return {
            name: l1.name || l1.title || 'Sub-Topic',
            icon: l1.icon || 'layers',
            categories: categories.length > 0 ? categories : [
                {
                    name: l1.name || 'Overview',
                    icon: 'folder',
                    subCategories: [
                        { name: l1.name || 'Detail', description: l1.description || `About ${l1.name}`, icon: 'circle' }
                    ]
                }
            ],
        };
    });

    const normalized = {
        mode: 'single' as const,
        topic: rootName,
        shortTitle: rootName.split(' ').slice(0, 3).join(' '),
        icon: tree.icon || 'brain',
        subTopics: subTopics.length > 0 ? subTopics : [],
    };

    console.log(`🔄 Normalized: topic="${normalized.topic}", subTopics=${normalized.subTopics.length}`);
    return normalized;
}

/**
 * Validates and parses the AI response text.
 * Handles markdown stripping, robust JSON extraction, and schema validation.
 */
function validateAndParse(raw: any, schema?: any, strict: boolean = false): any {
    // 1. Convert string responses to objects if needed
    let parsed: any = raw;
    if (typeof raw === 'string') {
        let cleaned = raw.trim();
        if (cleaned.includes('```')) {
            cleaned = cleaned.replace(/```[a-z]*\n?([\s\S]*?)\n?```/g, '$1').trim();
        }

        try {
            parsed = JSON.parse(cleaned);
        } catch (e) {
            if (!schema) return cleaned;
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const extracted = cleaned.substring(firstBrace, lastBrace + 1);
                try {
                    parsed = JSON.parse(extracted);
                } catch (innerError: any) {
                    throw new StructuredOutputError(`Failed to parse extracted AI response: ${innerError.message}`, extracted);
                }
            } else {
                throw new StructuredOutputError(`Failed to parse AI response as JSON: ${(e as any).message}`, cleaned);
            }
        }
    }

    // 2. Pre-process the object (Key Mapping & Normalization)
    if (typeof parsed === 'object' && parsed !== null) {
        const keys = Object.keys(parsed);
        console.log(`🔍 validateAndParse: Processing object with keys [${keys.slice(0, 10).join(', ')}]`);

        // Map common model variations to expected schema keys
        if (parsed.centralTopic && !parsed.topic) parsed.topic = parsed.centralTopic;
        if (parsed.title && !parsed.topic) parsed.topic = parsed.title;
        if (parsed.topic && !parsed.shortTitle) {
            parsed.shortTitle = typeof parsed.topic === 'string' ? parsed.topic.split(' ').slice(0, 4).join(' ') : 'Topic';
        }
        if (!parsed.icon) parsed.icon = 'brain-circuit';

        // Unwrap common containers
        if (!parsed.topic && !parsed.subTopics && !parsed.compareData) {
            const wrapperKeys = ['mindMap', 'mindmap', 'data', 'result', 'output', 'response', 'mind_map'];
            for (const key of wrapperKeys) {
                if (parsed[key] && typeof parsed[key] === 'object') {
                    console.log(`🔍 validateAndParse: Unwrapping nested data from "${key}" key`);
                    parsed = parsed[key];
                    break;
                }
            }
        }

        // Fallback for tree format
        if (!parsed.topic && parsed.name && Array.isArray(parsed.children)) {
            console.log(`🔄 validateAndParse: Normalizing {name, children} format → schema format`);
            parsed = normalizeMindMapTree(parsed);
        }
    }

    // 3. Perform Schema Validation and Salvage
    return performSchemaValidation(parsed, schema, typeof raw === 'string' ? raw : JSON.stringify(raw), strict);
}

/**
 * Internal helper to run Zod validation if schema exists
 */
function performSchemaValidation(parsed: any, schema: any, originalRaw: string, strict: boolean = false): any {
    if (!schema) return parsed;

    const result = schema.safeParse(parsed);
    console.log(`🔍 Schema validation: success=${result.success}, keys=${result.success ? Object.keys(result.data || {}).join(',') : 'N/A'}`);
    
    if (!result.success) {
        // --- Enhanced Partial Salvage Acceptance ---
        const partial = parsed as any;

        // FIX: Detect if 'categories' were generated at the root level instead of inside 'subTopics'
        // This is a common failure mode when the AI loses track of nesting.
        if (Array.isArray(partial.categories) && partial.categories.length > 0 && (!partial.subTopics || partial.subTopics.length === 0)) {
            console.warn('🔄 Salvage: Detected root-level categories. Mapping to a default sub-topic.');
            partial.subTopics = [{
                name: 'Core Concepts',
                icon: 'layers',
                thought: 'Automatically recovered categories from root level.',
                categories: partial.categories
            }];
            delete partial.categories;
        }

        // Ensure top-level structure
        if (!partial.subTopics || !Array.isArray(partial.subTopics)) {
            partial.subTopics = [];
        }

        // Recursive sanitization to ensure every node has its required fields
        partial.subTopics.forEach((st: any) => {
            if (!st.name) st.name = 'Sub-Topic';
            if (!st.icon) st.icon = 'layers';
            if (!st.categories || !Array.isArray(st.categories)) {
                st.categories = [];
            }
            st.categories.forEach((cat: any) => {
                if (!cat.name) cat.name = 'Category';
                if (!cat.icon) cat.icon = 'folder';
                if (!cat.subCategories || !Array.isArray(cat.subCategories)) {
                    cat.subCategories = [];
                }
                cat.subCategories.forEach((sc: any) => {
                    if (!sc.name) sc.name = 'Detail';
                    if (!sc.icon) sc.icon = 'circle';
                    if (!sc.description) sc.description = 'Additional information about this item.';
                });
            });
        });

        // If we have at least 1 subTopic (or were able to salvage one) OR we are in loose mode, proceed.
        if (partial.subTopics.length >= 1 || !strict) {
            console.warn('⚠️ Salvaging partial mind map after schema mismatch. Zod Error:', result.error.message);
            return partial;
        }

        if (strict) {
            console.error("❌ Schema Validation Error:", result.error);
            result.error.issues.forEach((issue: any) => {
                console.error(`  - Path: ${issue.path.join('.')}, Message: ${issue.message}`);
            });
            throw new StructuredOutputError("AI response did not match the required schema structure.", originalRaw, result.error);
        } else {
            console.warn("⚠️ Schema validation failed (non-strict). Issues:", result.error.message);
        }
    }
    
    // Defensive: Ensure result.data has expected structure
    const validatedData = result.data;
    if (!validatedData || typeof validatedData !== 'object' || Array.isArray(validatedData)) {
        console.warn('⚠️ Zod returned invalid data structure, falling back to parsed data');
        return parsed;
    }
    
    // Ensure subTopics exists and has at least 1 item
    if (!Array.isArray(validatedData.subTopics) || validatedData.subTopics.length === 0) {
        console.warn('⚠️ Zod returned empty subTopics, falling back to parsed data');
        return parsed.subTopics && parsed.subTopics.length > 0 ? parsed : validatedData;
    }
    
    return validatedData;
}

