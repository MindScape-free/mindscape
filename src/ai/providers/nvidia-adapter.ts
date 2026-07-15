import {
  IAIProvider,
  AIRequest,
  AIResponse,
  AIProviderCapability,
  ProviderHealthStatus,
  AIStreamCallback,
} from './types';
import { postProcess } from './post-processor';

export class NvidiaAdapter implements IAIProvider {
  readonly name = 'nvidia';

  private healthStatus: ProviderHealthStatus = {
    status: 'healthy',
    successRate: 1.0,
    p95LatencyMs: 1500,
    consecutiveFailures: 0,
    totalCalls: 0,
  };

  supports(capability: AIProviderCapability): boolean {
    return ['fast', 'creative', 'reasoning', 'coding'].includes(capability);
  }

  health(): ProviderHealthStatus {
    return this.healthStatus;
  }

  private selectModel(capability: AIProviderCapability = 'creative'): string {
    switch (capability) {
      case 'fast':
        return 'meta/llama-3.1-8b-instruct';
      case 'reasoning':
        return 'nvidia/llama-3.1-nemotron-51b-instruct';
      case 'coding':
      case 'creative':
      default:
        return 'meta/llama-3.1-70b-instruct';
    }
  }

  /**
   * Resolve the model to use for NVIDIA API calls.
   *
   * The orchestrator now maps Pollinations model names to valid NVIDIA model
   * IDs via the model-mapper before passing them here. If a mapped model is
   * present, trust it. Otherwise fall back to capability-based selection.
   */
  private resolveModel(request: AIRequest): string {
    if (request.model) {
      return request.model;
    }
    return this.selectModel(request.capability);
  }

  private buildFetchOptions(body: any, apiKey: string, signal?: AbortSignal): RequestInit {
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    };
  }

  async generateStream(request: AIRequest, onChunk: AIStreamCallback): Promise<AIResponse> {
    const startTime = Date.now();
    this.healthStatus.totalCalls++;

    const model = this.resolveModel(request);
    const apiKey = request.apiKey || process.env.NVIDIA_API_KEY || '';

    if (!apiKey) {
      const errMsg = 'Authentication failed: NVIDIA API key missing. Please configure NVIDIA_API_KEY in environment variables.';
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

    try {
      const body: any = {
        model,
        messages,
        stream: true,
        temperature: 0.7,
      };

      if (request.schema) {
        body.response_format = { type: 'json_object' };
      }

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        ...this.buildFetchOptions(body, apiKey),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errDetails = response.statusText;
        try {
          const errBody = await response.json();
          if (errBody?.error?.message) errDetails = errBody.error.message;
        } catch {}
        throw new Error(`NVIDIA stream error (${response.status}): ${errDetails}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream from NVIDIA');

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

      const latencyMs = Date.now() - startTime;
      this.healthStatus.successRate = (this.healthStatus.successRate * 9 + 1) / 10;
      this.healthStatus.consecutiveFailures = 0;
      this.healthStatus.status = 'healthy';

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
      this.healthStatus.status = this.healthStatus.consecutiveFailures >= 3 ? 'down' : 'degraded';

      if (fetchError.name === 'AbortError') {
        throw new Error(`NVIDIA streaming timed out after ${timeout}ms`);
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    this.healthStatus.totalCalls++;

    const model = this.resolveModel(request);
    const apiKey = request.apiKey || process.env.NVIDIA_API_KEY || '';

    if (!apiKey) {
      const errMsg = 'Authentication failed: NVIDIA API key missing. Please configure NVIDIA_API_KEY in environment variables.';
      this.healthStatus.status = 'degraded';
      throw new Error(errMsg);
    }

    const messages = [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt }
    ];

    try {
      const body: any = {
        model,
        messages,
        temperature: 0.7,
      };

      if (request.schema) {
        body.response_format = { type: 'json_object' };
      }

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        ...this.buildFetchOptions(body, apiKey),
        signal: AbortSignal.timeout(
          request.timeout || 
          (await import('@/lib/env')).getEnv().aiProviderTimeout || 
          120000
        ),
      });

      if (!response.ok) {
        let errDetails = response.statusText;
        try {
          const errBody = await response.json();
          if (errBody?.error?.message) errDetails = errBody.error.message;
        } catch {}
        throw new Error(`NVIDIA Error (${response.status}): ${errDetails}`);
      }

      const responseData = await response.json();
      const rawText = responseData?.choices?.[0]?.message?.content || '';

      if (!rawText) {
        throw new Error('NVIDIA response contains empty content');
      }

      const latencyMs = Date.now() - startTime;
      this.healthStatus.successRate = (this.healthStatus.successRate * 9 + 1) / 10;
      this.healthStatus.consecutiveFailures = 0;
      this.healthStatus.status = 'healthy';

      const parsedContent = postProcess(rawText, request.schema, request.strict);

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
      this.healthStatus.status = this.healthStatus.consecutiveFailures >= 3 ? 'down' : 'degraded';
      throw error;
    }
  }
}
