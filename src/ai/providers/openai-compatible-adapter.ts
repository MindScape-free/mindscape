/**
 * OpenAI-Compatible AI Adapter
 *
 * Generic adapter for any OpenAI-compatible API endpoint.
 * Primary target: OpenRouter (openrouter.ai/api/v1)
 * Also works with: Together.ai, Groq, self-hosted vLLM, etc.
 */

import {
  IAIProvider,
  AIRequest,
  AIResponse,
  AIProviderCapability,
  ProviderHealthStatus,
  AIStreamChunk,
  AIStreamCallback,
  SingleProviderConfig,
} from './types';
import { postProcess, isReasoningOnly } from './post-processor';

// ── Health Tracking ────────────────────────────────────────────────────

interface AdapterHealth {
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  lastErrorAt?: number;
  latencyWindow: number[];
}

const MAX_WINDOW = 50;

// ── Adapter Implementation ─────────────────────────────────────────────

export class OpenAICompatibleAdapter implements IAIProvider {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly supportedCapabilities: Set<AIProviderCapability>;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;
  private health_: AdapterHealth;

  constructor(config: SingleProviderConfig) {
    this.name = config.name;
    this.baseUrl = config.baseUrl.replace(/\/+$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel;
    this.supportedCapabilities = new Set(config.capabilities || ['fast', 'creative', 'reasoning', 'coding']);
    this.maxTokens = 8192;
    this.timeoutMs = config.timeoutMs || 120_000;
    this.health_ = {
      successCount: 0,
      failureCount: 0,
      consecutiveFailures: 0,
      latencyWindow: [],
    };
  }

  supports(capability: AIProviderCapability): boolean {
    return this.supportedCapabilities.has(capability);
  }

  health(): ProviderHealthStatus {
    const total = this.health_.successCount + this.health_.failureCount;
    const rate = total > 0 ? this.health_.successCount / total : 1;
    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (this.health_.consecutiveFailures > 5) status = 'down';
    else if (this.health_.consecutiveFailures > 2 || (total >= 5 && rate < 0.75)) status = 'degraded';

    return {
      status,
      successRate: rate,
      p95LatencyMs: this.getP95Latency(),
      lastErrorAt: this.health_.lastErrorAt,
      consecutiveFailures: this.health_.consecutiveFailures,
      totalCalls: total,
    };
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const model = request.model || this.defaultModel;
    const apiKey = request.apiKey || this.apiKey;

    if (!apiKey || apiKey.trim() === '') {
      throw new Error(`${this.name}: No API key configured`);
    }

    console.log(`🤖 ${this.name}: Model=${model}, Capability=${request.capability || 'creative'}`);

    try {
      const raw = await this.callAPI(request, model, apiKey);

      // Reasoning-only check
      if (request.schema && isReasoningOnly(raw, request.schema, (request.attempt || 0) >= 1)) {
        throw new Error(`${this.name} returned reasoning-only response (retryable)`);
      }

      // Post-process
      const { data, repairApplied, salvaged } = postProcess(raw, request.schema, request.strict);

      const latencyMs = Date.now() - startTime;
      this.recordSuccess(latencyMs);

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
      this.recordFailure(Date.now() - startTime);
      throw error;
    }
  }

  async generateStream(request: AIRequest, onChunk: AIStreamCallback): Promise<AIResponse> {
    const startTime = Date.now();
    const model = request.model || this.defaultModel;
    const apiKey = request.apiKey || this.apiKey;

    if (!apiKey) throw new Error(`${this.name}: No API key for streaming`);

    const messages = this.buildMessages(request);
    const body: any = {
      messages,
      model,
      stream: true,
      max_tokens: this.maxTokens,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://mindscape.app',
        'X-Title': 'MindScape',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`${this.name} stream error: ${response.status}`);
    }

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
        } catch { /* skip */ }
      }

      if (done) break;
    }

    // Flush remaining buffer
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
    this.recordSuccess(latencyMs);

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

  // ── Internal ─────────────────────────────────────────────────────────

  private async callAPI(request: AIRequest, model: string, apiKey: string): Promise<any> {
    const isStructured = request.schema || request.systemPrompt.toLowerCase().includes('json');
    const messages = this.buildMessages(request, isStructured);

    const body: any = {
      messages,
      model,
      stream: false,
      max_tokens: this.maxTokens,
    };

    if (request.schema) {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), request.timeout || this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://mindscape.app',
          'X-Title': 'MindScape',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const status = response.status;
        let errorMsg = response.statusText;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody?.error?.message || JSON.stringify(errorBody);
        } catch { /* use statusText */ }

        console.error(`❌ ${this.name} API Error [${status}]: ${errorMsg}`);

        if (status === 401 || status === 403) {
          throw new Error(`${this.name}: Authentication failed`);
        }
        throw new Error(`${this.name} API error: ${status} ${errorMsg}`);
      }

      const data = await response.json();
      let text = data.choices?.[0]?.message?.content || '';
      if (!text || text.trim() === '') {
        throw new Error(`${this.name} returned empty content (retryable)`);
      }

      // Strip markdown fences
      text = text.replace(/```json\n?|\n?```/g, '').trim();

      try {
        return JSON.parse(text);
      } catch {
        return text; // Let post-processor handle
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`${this.name} request timed out`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildMessages(request: AIRequest, isStructured?: boolean): any[] {
    const systemContent = isStructured
      ? `${request.systemPrompt}\n\nReturn ONLY valid JSON. No markdown, no extra text. Start with '{', end with '}'.`
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

  private recordSuccess(latencyMs: number) {
    this.health_.successCount++;
    this.health_.consecutiveFailures = 0;
    this.health_.latencyWindow.push(latencyMs);
    if (this.health_.latencyWindow.length > MAX_WINDOW) this.health_.latencyWindow.shift();
  }

  private recordFailure(latencyMs: number) {
    this.health_.failureCount++;
    this.health_.consecutiveFailures++;
    this.health_.lastErrorAt = Date.now();
    this.health_.latencyWindow.push(latencyMs);
    if (this.health_.latencyWindow.length > MAX_WINDOW) this.health_.latencyWindow.shift();
  }

  private getP95Latency(): number {
    if (this.health_.latencyWindow.length === 0) return 0;
    const sorted = [...this.health_.latencyWindow].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[Math.min(idx, sorted.length - 1)];
  }
}
