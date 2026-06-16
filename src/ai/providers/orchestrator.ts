/**
 * AI Orchestrator — Direct Pollinations routing.
 *
 * Routes all AI requests directly and solely to Pollinations.ai,
 * bypassing multi-provider scoring, health checks, shadow testing, and telemetry logs.
 */

import {
  AIRequest,
  AIResponse,
  OrchestratorOptions,
  AIStreamCallback,
} from './types';
import { PollinationsAdapter } from './pollinations-adapter';

// ── Retry Helper ───────────────────────────────────────────────────────

async function retryWithProvider<T>(
  fn: (attempt: number) => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn(i);
    } catch (err: any) {
      lastError = err;
      const msg = err.message || '';

      // Non-retryable errors
      if (msg.includes('Authentication failed') || msg.includes('invalid') || msg.includes('InsufficientBalance')) {
        throw err;
      }

      // Retryable conditions
      const isRetryable =
        msg.includes('retryable') ||
        msg.includes('timeout') ||
        msg.includes('rate limit') ||
        msg.includes('reasoning-only') ||
        msg.includes('empty content') ||
        msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('429');

      if (i < maxRetries - 1 && isRetryable) {
        const jitter = Math.random() * 2000;
        const waitTime = msg.includes('rate limit')
          ? 5000 * (i + 1) + jitter
          : baseDelay * Math.pow(2, i) + jitter;
        console.warn(`⚠️ Attempt ${i + 1} failed, retrying in ${Math.round(waitTime)}ms...`, msg);
        await new Promise(res => setTimeout(res, waitTime));
      } else if (!isRetryable) {
        throw err;
      }
    }
  }
  throw lastError;
}

// ── Direct Routing Functions ───────────────────────────────────────────

export async function orchestrate(
  request: AIRequest,
  options: OrchestratorOptions = {}
): Promise<AIResponse> {
  const provider = new PollinationsAdapter();
  
  // Resolve API key. If not provided on request, fallback to system env.
  const apiKey = request.apiKey || process.env.POLLINATIONS_API_KEY || '';

  console.log(`🤖 [Orchestrator] Direct Pollinations: Task=${options.taskType || 'unknown'}, Model=${request.model || 'auto'}`);

  return await retryWithProvider(
    async (attempt) => {
      return await provider.generate({
        ...request,
        attempt,
        apiKey,
      });
    },
    2 // 2 attempts per provider
  );
}

export async function orchestrateStream(
  request: AIRequest,
  onChunk: AIStreamCallback,
  options: OrchestratorOptions = {}
): Promise<AIResponse> {
  const provider = new PollinationsAdapter();

  // Resolve API key. If not provided on request, fallback to system env.
  const apiKey = request.apiKey || process.env.POLLINATIONS_API_KEY || '';

  if (!provider.generateStream) {
    throw new Error(`Provider ${provider.name} does not support streaming`);
  }

  console.log(`🌊 [Orchestrator] Direct Stream Pollinations: Task=${options.taskType || 'unknown'}, Model=${request.model || 'auto'}`);

  return await provider.generateStream(
    {
      ...request,
      apiKey,
    },
    onChunk
  );
}
