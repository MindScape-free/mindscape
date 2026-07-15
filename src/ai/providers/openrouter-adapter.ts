import {
  IAIProvider,
  AIRequest,
  AIResponse,
  AIProviderCapability,
  ProviderHealthStatus,
  AIStreamCallback,
} from './types';
import { postProcess } from './post-processor';

// ── Module-level state: persists across adapter instances within the same process ──
// This lets the client query which model was actually used and whether the fallback
// chain has advanced, without needing per-request persistence.
let _lastModel = 'openrouter/free';
let _lastFallbackIndex = 0;

/**
 * Returns the last-used OpenRouter model and the current fallback index.
 * Called by the server action to expose status to the navbar badge.
 */
export function getOpenRouterStatus() {
  return {
    model: _lastModel,
    fallbackIndex: _lastFallbackIndex,
    chain: [
      'openrouter/free',
      'google/gemma-3-27b-it:free',
      'google/gemma-3-12b-it:free',
      'nvidia/nemotron-3-super-49b-v1:free',
    ],
  };
}

export class OpenRouterAdapter implements IAIProvider {
  readonly name = 'openrouter';

  private healthStatus: ProviderHealthStatus = {
    status: 'healthy',
    successRate: 1.0,
    p95LatencyMs: 2000,
    consecutiveFailures: 0,
    totalCalls: 0,
  };

  // Track models that OpenRouter has rejected to avoid wasting requests on retry.
  private rejectedModels = new Set<string>();

  supports(capability: AIProviderCapability): boolean {
    return ['fast', 'creative', 'reasoning', 'coding'].includes(capability);
  }

  health(): ProviderHealthStatus {
    return this.healthStatus;
  }

  // Ordered fallback chain for free models. If the primary is rate-limited or deprecated,
  // the adapter tries the next one before falling back to openrouter/free.
  private readonly freeModelChain: string[] = [
    'openrouter/free',
    'google/gemma-3-27b-it:free',
    'google/gemma-3-12b-it:free',
    'nvidia/nemotron-3-super-49b-v1:free',
  ];
  private fallbackIndex = 0;

  private selectModel(capability: AIProviderCapability = 'creative', attempt: number = 0): string {
    // Use the current fallback index to choose a model.
    // This advances when a model is rejected by OpenRouter (400 invalid model).
    const idx = Math.min(this.fallbackIndex, this.freeModelChain.length - 1);
    return this.freeModelChain[idx];
  }

  /**
   * Shared model resolution: uses mapped model or free model chain.
   *
   * The orchestrator now maps Pollinations model names (e.g. 'openai') to valid
   * OpenRouter model IDs (e.g. 'openai/gpt-4o-mini') via the model-mapper before
   * passing them here. If a mapped model is present and looks like a valid
   * OpenRouter ID (contains '/'), trust it. Otherwise fall back to our free
   * model chain (Gemma 4 → Nemotron → openrouter/free).
   */
  private resolveModel(request: AIRequest): string {
    // If the orchestrator mapped a provider-specific model ID, use it directly.
    if (request.model && request.model.includes('/')) {
      console.log(`🔀 [OpenRouter] Using mapped model: ${request.model}`);
      return request.model;
    }

    // Fall back to the free model chain.
    let model = this.selectModel(request.capability, request.attempt || 0);

    // Skip to next in chain if this model was previously rejected by OpenRouter.
    if (this.rejectedModels.has(model)) {
      model = this.selectModel(request.capability, request.attempt || 0);
      console.warn(`⚠️ [OpenRouter] Model already rejected, using ${model}`);
    }

    return model;
  }

  /**
   * Shared: build a RequestInit with consistent headers and timeout.
   */
  private buildFetchOptions(body: any, apiKey: string, signal?: AbortSignal): RequestInit {
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://mindscape.vercel.app',
        'X-Title': 'MindScape',
      },
      body: JSON.stringify(body),
      signal,
    };
  }

  async generateStream(request: AIRequest, onChunk: AIStreamCallback): Promise<AIResponse> {
    const startTime = Date.now();
    this.healthStatus.totalCalls++;

    let model = this.resolveModel(request);
    const apiKey = request.apiKey || process.env.OPENROUTER_API_KEY || '';

    // Guard: Require API key
    if (!apiKey) {
      const errMsg = 'Authentication failed: OpenRouter API key missing. Please configure OPENROUTER_API_KEY in environment variables.';
      this.healthStatus.status = 'degraded';
      throw new Error(errMsg);
    }

    const messages = [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt }
    ];

    const controller = new AbortController();
    const timeout = request.timeout || 120_000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    /**
     * Send a streaming request. Returns the response directly — caller handles SSE parsing.
     */
    const attemptStream = async (modelToUse: string): Promise<Response> => {
      const body: any = {
        model: modelToUse,
        messages,
        stream: true,
        temperature: 0.7,
      };

      if (request.schema) {
        body.response_format = { type: 'json_object' };
      }

      return fetch('https://openrouter.ai/api/v1/chat/completions', {
        ...this.buildFetchOptions(body, apiKey),
        signal: controller.signal,
      });
    };

    try {
      let response = await attemptStream(model);

      if (!response.ok) {
        let errDetails = response.statusText;
        let errBody: any = null;
        try {
          errBody = await response.json();
          console.error("OpenRouter error:", JSON.stringify(errBody, null, 2));
          if (errBody?.error?.message) errDetails = errBody.error.message;
        } catch {}

        const isFallbackError = response.status === 429 || response.status === 503 || 
          (response.status === 400 && errDetails.toLowerCase().match(/(not a valid model|invalid model|model not found)/));

        if (isFallbackError) {
          console.warn(`⚠️ [OpenRouter] Model "${model}" rejected or unavailable in stream (${errDetails}). Falling back.`);
          this.rejectedModels.add(model);
          this.fallbackIndex = Math.min(this.fallbackIndex + 1, this.freeModelChain.length - 1);
          const fallbackModel = this.selectModel(request.capability, request.attempt || 0);
          response = await attemptStream(fallbackModel);
          model = fallbackModel;

          if (!response.ok) {
            errDetails = response.statusText;
            try {
              errBody = await response.json();
              console.error("OpenRouter error (fallback stream):", JSON.stringify(errBody, null, 2));
              if (errBody?.error?.message) errDetails = errBody.error.message;
            } catch {}
             
            if (response.status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              if (retryAfter) {
                errDetails += ` (retry after ${retryAfter}s)`;
              }
            }
            throw new Error(`OpenRouter stream error (${response.status}): ${errDetails}`);
          }
        } else {
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            if (retryAfter) {
              errDetails += ` (retry after ${retryAfter}s)`;
            }
          }
          throw new Error(`OpenRouter stream error (${response.status}): ${errDetails}`);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream from OpenRouter');

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        const chunk = decoder.decode(value || new Uint8Array(), { stream: !done });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          
          const data = trimmed.slice(6).trim();
          if (data === '[DONE]') {
            onChunk({ text: '', done: true, model });
            break;
          }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              onChunk({ text: delta, done: false, model });
            }
          } catch { /* skip unparseable chunks */ }
        }

        if (done) break;
      }

      const latencyMs = Date.now() - startTime;

      // Update health
      this.healthStatus.successRate = (this.healthStatus.successRate * 9 + 1) / 10;
      this.healthStatus.consecutiveFailures = 0;
      this.healthStatus.status = 'healthy';

      // Sync module-level state so the navbar badge can show the live model
      _lastModel = model;
      _lastFallbackIndex = this.fallbackIndex;

      return {
        content: fullText,
        raw: fullText,
        provider: this.name,
        model,
        latencyMs,
        repairApplied: false,
        salvaged: false,
      };
    } catch (fetchError: any) {
      this.healthStatus.consecutiveFailures++;
      this.healthStatus.successRate = (this.healthStatus.successRate * 9 + 0) / 10;
      if (this.healthStatus.consecutiveFailures >= 3) {
        this.healthStatus.status = 'down';
      } else {
        this.healthStatus.status = 'degraded';
      }

      if (fetchError.name === 'AbortError') {
        throw new Error(`OpenRouter streaming timed out after ${timeout}ms`);
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    this.healthStatus.totalCalls++;

    let model = this.resolveModel(request);

    const apiKey = request.apiKey || process.env.OPENROUTER_API_KEY || '';

    // Guard: Require API key
    if (!apiKey) {
      const errMsg = 'Authentication failed: OpenRouter API key missing. Please configure OPENROUTER_API_KEY in environment variables.';
      this.healthStatus.status = 'degraded';
      throw new Error(errMsg);
    }

    const messages = [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt }
    ];

    /**
     * Attempts to generate with the given model. If OpenRouter returns a 400
     * indicating the model ID is invalid, we fall back to a default free model.
     * This prevents a stale/bad model ID from permanently blocking generation.
     */
    const attemptGenerate = async (modelToUse: string): Promise<Response> => {
      const body: any = {
        model: modelToUse,
        messages,
        temperature: 0.7,
      };

      // If a JSON schema validation is requested, suggest JSON format
      if (request.schema) {
        body.response_format = { type: 'json_object' };
      }

      return fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://mindscape.vercel.app',
          'X-Title': 'MindScape',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(
          request.timeout || 
          (await import('@/lib/env')).getEnv().aiProviderTimeout || 
          120000
        ),
      });
    };

    try {
      let response = await attemptGenerate(model);

      if (!response.ok) {
        let errDetails = response.statusText;
        let errBody: any = null;
        try {
          errBody = await response.json();
          console.error("OpenRouter error:", JSON.stringify(errBody, null, 2));
          if (errBody?.error?.message) errDetails = errBody.error.message;
        } catch {}

        const isFallbackError = response.status === 429 || response.status === 503 || 
          (response.status === 400 && errDetails.toLowerCase().match(/(not a valid model|invalid model|model not found)/));

        if (isFallbackError) {
          console.warn(`⚠️ [OpenRouter] Model "${model}" rejected or unavailable (${errDetails}). Falling back to default free model.`);
          // Remember this model was rejected so retries skip straight to fallback
          this.rejectedModels.add(model);
          // Advance the fallback index so subsequent calls skip the rejected model
          this.fallbackIndex = Math.min(this.fallbackIndex + 1, this.freeModelChain.length - 1);
          const fallbackModel = this.selectModel(request.capability, request.attempt || 0);
          response = await attemptGenerate(fallbackModel);
          // Update model reference for the response metadata
          model = fallbackModel;

          if (!response.ok) {
            errDetails = response.statusText;
            try {
              errBody = await response.json();
              console.error("OpenRouter error (fallback):", JSON.stringify(errBody, null, 2));
              if (errBody?.error?.message) errDetails = errBody.error.message;
            } catch {}
            
            if (response.status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              if (retryAfter) {
                errDetails += ` (retry after ${retryAfter}s)`;
              }
            }
            throw new Error(`OpenRouter Error (${response.status}): ${errDetails}`);
          }
        } else {
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            if (retryAfter) {
              errDetails += ` (retry after ${retryAfter}s)`;
            }
          }
          throw new Error(`OpenRouter Error (${response.status}): ${errDetails}`);
        }
      }

      const responseData = await response.json();
      const rawText = responseData?.choices?.[0]?.message?.content || '';

      if (!rawText) {
        throw new Error('OpenRouter response contains empty content');
      }

      const latencyMs = Date.now() - startTime;
      
      // Update Health
      this.healthStatus.successRate = (this.healthStatus.successRate * 9 + 1) / 10;
      this.healthStatus.consecutiveFailures = 0;
      this.healthStatus.status = 'healthy';

      // Run standardized schema parsing and JSON repair using postProcess
      const parsedContent = postProcess(rawText, request.schema, request.strict);

      // Sync module-level state so the navbar badge can show the live model
      _lastModel = model;
      _lastFallbackIndex = this.fallbackIndex;

      return {
        content: parsedContent.data,
        raw: rawText,
        provider: this.name,
        model,
        latencyMs,
        usage: {
          promptTokens: responseData?.usage?.prompt_tokens || 0,
          completionTokens: responseData?.usage?.completion_tokens || 0,
        },
        repairApplied: parsedContent.repairApplied,
        salvaged: parsedContent.salvaged,
      };

    } catch (error: any) {
      this.healthStatus.consecutiveFailures++;
      this.healthStatus.successRate = (this.healthStatus.successRate * 9 + 0) / 10;
      if (this.healthStatus.consecutiveFailures >= 3) {
        this.healthStatus.status = 'down';
      } else {
        this.healthStatus.status = 'degraded';
      }
      throw error;
    }
  }
}
