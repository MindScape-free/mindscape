/**
 * Pollinations AI Adapter
 *
 * Wraps the existing generateContentWithPollinations function
 * into the IAIProvider interface. Preserves all current behavior:
 * model selection, retry within adapter, JSON repair, deep extraction.
 */

import {
  IAIProvider,
  AIRequest,
  AIResponse,
  AIProviderCapability,
  ProviderHealthStatus,
  AIStreamChunk,
  AIStreamCallback,
} from './types';
import { postProcess, isReasoningOnly } from './post-processor';

// ── Model Registry (synced with existing pollinations-client.ts) ──────

interface ModelDef {
  id: string;
  feature: AIProviderCapability;
  description: string;
  context: number;
  isFree: boolean;
}

const AVAILABLE_MODELS: ModelDef[] = [
  // Fast & Search
  { id: 'gemini-fast', feature: 'fast', description: 'Google Gemini 2.5 Flash Lite', context: 32000, isFree: true },
  { id: 'perplexity-fast', feature: 'fast', description: 'Perplexity Sonar', context: 32000, isFree: true },
  { id: 'gemini-search', feature: 'fast', description: 'Google Gemini 2.5 Flash Lite + Search', context: 32000, isFree: true },
  { id: 'openai-fast', feature: 'fast', description: 'OpenAI GPT-5 Nano', context: 128000, isFree: true },
  { id: 'nova-fast', feature: 'fast', description: 'Amazon Nova Micro', context: 32000, isFree: true },
  { id: 'step-3.5-flash', feature: 'fast', description: 'Step 3.5 Flash', context: 12800, isFree: true },
  // Creative
  { id: 'openai', feature: 'creative', description: 'OpenAI GPT-5 Mini', context: 128000, isFree: true },
  { id: 'claude-fast', feature: 'creative', description: 'Anthropic Claude Haiku 4.5', context: 128000, isFree: true },
  { id: 'minimax', feature: 'creative', description: 'MiniMax M2.5', context: 32000, isFree: true },
  { id: 'claude-airforce', feature: 'creative', description: 'Claude Sonnet 4.6', context: 250000, isFree: true },
  // Reasoning
  { id: 'deepseek', feature: 'reasoning', description: 'DeepSeek V3.2', context: 64000, isFree: true },
  { id: 'kimi', feature: 'reasoning', description: 'Moonshot Kimi K2.5', context: 256000, isFree: true },
  { id: 'perplexity-reasoning', feature: 'reasoning', description: 'Perplexity Sonar Reasoning', context: 32000, isFree: true },
  // Coding
  { id: 'mistral', feature: 'coding', description: 'Mistral Small 3.2 24B', context: 32000, isFree: true },
  { id: 'qwen-coder', feature: 'coding', description: 'Qwen3 Coder 30B', context: 32000, isFree: true },
  { id: 'qwen-safety', feature: 'coding', description: 'Qwen3Guard 8B', context: 125000, isFree: true },
];

function selectModel(capability: AIProviderCapability = 'creative', attempt: number = 0): string {
  const validModels = AVAILABLE_MODELS.filter(m => m.feature === capability && m.isFree);
  if (validModels.length > 0 && attempt < validModels.length) return validModels[attempt].id;
  const allFree = AVAILABLE_MODELS.filter(m => m.isFree);
  if (allFree.length === 0) return 'mistral';
  return allFree[attempt % allFree.length].id;
}

// ── Health Tracking (internal to adapter) ──────────────────────────────

let successCount = 0;
let failureCount = 0;
let consecutiveFailures = 0;
let lastErrorAt: number | undefined;
const latencyWindow: number[] = [];
const MAX_WINDOW = 50;

function recordLatency(ms: number) {
  latencyWindow.push(ms);
  if (latencyWindow.length > MAX_WINDOW) latencyWindow.shift();
}

function getP95Latency(): number {
  if (latencyWindow.length === 0) return 0;
  const sorted = [...latencyWindow].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.95);
  return sorted[Math.min(idx, sorted.length - 1)];
}

// ── Adapter Implementation ─────────────────────────────────────────────

export class PollinationsAdapter implements IAIProvider {
  readonly name = 'pollinations';

  private readonly BASE_URL = 'https://gen.pollinations.ai/v1/chat/completions';
  private readonly STREAM_URL = 'https://gen.pollinations.ai/v1/chat/completions';

  supports(capability: AIProviderCapability): boolean {
    return AVAILABLE_MODELS.some(m => m.feature === capability && m.isFree);
  }

  health(): ProviderHealthStatus {
    const total = successCount + failureCount;
    const rate = total > 0 ? successCount / total : 1;
    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (consecutiveFailures > 5) status = 'down';
    else if (consecutiveFailures > 2 || (total >= 5 && rate < 0.75)) status = 'degraded';

    return {
      status,
      successRate: rate,
      p95LatencyMs: getP95Latency(),
      lastErrorAt,
      consecutiveFailures,
      totalCalls: total,
    };
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const hasImages = request.images && request.images.length > 0;
    const attempt = request.attempt || 0;

    // Model selection
    let model = request.model || (hasImages ? 'openai' : selectModel(request.capability || 'creative', attempt));

    // Validate model exists
    if (request.model && !AVAILABLE_MODELS.find(m => m.id === request.model)) {
      console.warn(`⚠️ Pollinations: Model "${request.model}" not found, falling back to auto-select.`);
      model = hasImages ? 'openai' : selectModel(request.capability || 'creative', attempt);
    }

    // Vision model rotation
    if (hasImages) {
      const visionModels = ['openai', 'gemini', 'qwen-vl'];
      model = visionModels[attempt % visionModels.length];
    } else if (request.systemPrompt.toLowerCase().includes('search') && attempt === 0) {
      model = request.model || 'openai';
    }

    console.log(`🤖 Pollinations: Model=${model}, Capability=${request.capability || 'creative'}, Attempt=${attempt}`);

    try {
      const raw = await this.callAPI(request, model, attempt);

      // Reasoning-only check
      if (isReasoningOnly(raw, request.schema, attempt >= 1)) {
        throw new Error('Pollinations returned reasoning-only or empty data (retryable)');
      }

      // Post-process
      const { data, repairApplied, salvaged } = postProcess(raw, request.schema, request.strict);

      const latencyMs = Date.now() - startTime;
      recordLatency(latencyMs);
      successCount++;
      consecutiveFailures = 0;

      return {
        content: data,
        raw: typeof raw === 'string' ? raw : JSON.stringify(raw),
        provider: this.name,
        model,
        latencyMs,
        repairApplied,
        salvaged,
      };
    } catch (error: any) {
      failureCount++;
      consecutiveFailures++;
      lastErrorAt = Date.now();
      recordLatency(Date.now() - startTime);
      throw error;
    }
  }

  async generateStream(request: AIRequest, onChunk: AIStreamCallback): Promise<AIResponse> {
    const startTime = Date.now();
    const model = request.model || selectModel(request.capability || 'creative', request.attempt || 0);
    const apiKey = request.apiKey;

    if (!apiKey) throw new Error('No API key provided for Pollinations streaming');

    const messages = this.buildMessages(request);
    const body: any = { messages, model: model.trim().replace(/\s+/g, '-').toLowerCase(), stream: true };

    const response = await fetch(this.STREAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`Pollinations stream error: ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No readable stream');

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      const chunk = decoder.decode(value || new Uint8Array(), { stream: !done });
      buffer += chunk;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last partial line in buffer

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

    // Process any remaining buffer if it looks like a valid data line
    if (buffer.trim().startsWith('data: ')) {
      try {
        const data = buffer.trim().slice(6).trim();
        if (data !== '[DONE]') {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            onChunk({ text: delta, done: false, model });
          }
        }
      } catch { /* skip */ }
    }

    const latencyMs = Date.now() - startTime;
    recordLatency(latencyMs);
    successCount++;
    consecutiveFailures = 0;

    return {
      content: fullText,
      raw: fullText,
      provider: this.name,
      model,
      latencyMs,
      repairApplied: false,
      salvaged: false,
    };
  }

  // ── Internal API Call ──────────────────────────────────────────────

  private async callAPI(request: AIRequest, model: string, attempt: number): Promise<any> {
    const apiKey = request.apiKey;
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Authentication failed: No API key available. Please add your Pollinations API key in settings.');
    }

    const isStructured = request.schema || request.systemPrompt.toLowerCase().includes('json');
    const messages = this.buildMessages(request, isStructured);
    const targetModelDef = AVAILABLE_MODELS.find(m => m.id === model);

    const body: any = {
      messages,
      model: model.trim().replace(/\s+/g, '-').toLowerCase(),
      stream: false,
    };

    // Response format
    if (request.schema) {
      body.response_format = { type: 'json_object' };
    }

    // Token limits
    if (targetModelDef && targetModelDef.context >= 16000) {
      if (model?.includes('deepseek')) body.max_tokens = 8192;
      else if (['qwen-coder', 'gemini-fast', 'gemini-search'].includes(model)) body.max_tokens = 16000;
      else if (['openai', 'openai-fast'].includes(model)) body.max_tokens = 12000;
      else body.max_tokens = 8192;
    } else {
      body.max_tokens = 8192;
    }

    const controller = new AbortController();
    const timeout = request.timeout || 120_000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleErrorResponse(response, request, model, attempt);
      }

      const data = await response.json();
      let text = data.choices?.[0]?.message?.content || '';
      if (!text || text.trim() === '') {
        throw new Error('Pollinations returned empty content (retryable)');
      }

      // Strip markdown fences
      text = text.replace(/```json\n?|\n?```/g, '').trim();

      // Try parse
      try {
        return JSON.parse(text);
      } catch {
        // Let post-processor handle repair
        const firstBrace = text.indexOf('{');
        if (firstBrace === -1) return text; // Not JSON, return as text
        return text; // Return raw for post-processor to handle
      }
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        throw new Error(`Pollinations API request timed out (${timeout}ms)`);
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildMessages(request: AIRequest, isStructured?: boolean): any[] {
    const systemContent = isStructured
      ? `${request.systemPrompt}\n\nCRITICAL SAFETY & OUTPUT RULES:\n- Return ONLY the final structured JSON answer.\n- Do NOT include internal reasoning outside the JSON.\n- Output ONLY the raw JSON string, starting with '{' and ending with '}'.\n- NEVER include comments in the JSON.`
      : request.systemPrompt;

    const messages: any[] = [{ role: 'system', content: systemContent }];

    let userContent: any;
    if (request.images && request.images.length > 0) {
      userContent = [{ type: 'text', text: request.userPrompt }];
      request.images.forEach(img => {
        userContent.push({
          type: 'image_url',
          image_url: { url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` }
        });
      });
    } else {
      userContent = request.userPrompt;
    }

    messages.push({ role: 'user', content: userContent });
    return messages;
  }

  private async handleErrorResponse(response: Response, request: AIRequest, model: string, attempt: number): Promise<never> {
    const status = response.status;
    let errorMessage = response.statusText;

    try {
      const errorBody = await response.json();
      if (errorBody?.error?.message) errorMessage = errorBody.error.message;
      else if (errorBody) errorMessage = JSON.stringify(errorBody);
    } catch {
      try { errorMessage = await response.text(); } catch { /* use statusText */ }
    }

    console.error(`❌ Pollinations API Error [${status}]: ${errorMessage}`);

    if (status === 401 || status === 403) {
      throw new Error('Authentication failed: Your API key is invalid or has no balance.');
    }

    throw new Error(`Pollinations API error: ${status} ${errorMessage}`);
  }
}
