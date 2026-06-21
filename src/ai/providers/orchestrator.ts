/**
 * AI Orchestrator — Direct Pollinations routing.
 *
 * Routes all AI requests directly and solely to Pollinations.ai,
 * bypassing multi-provider scoring, health checks, shadow testing.
 * Telemetry is recorded to ai_calls table after each generation.
 */

import {
  AIRequest,
  AIResponse,
  OrchestratorOptions,
  AIStreamCallback,
} from './types';
import { PollinationsAdapter } from './pollinations-adapter';
import { getSupabaseAdmin } from '@/lib/supabase-server';

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

// ── Telemetry Recording ──────────────────────────────────────────────

/**
 * Records an AI call to the ai_calls telemetry table.
 * Failures are silently caught so they never break the generation flow.
 */
async function recordTelemetry(params: {
  taskType?: string;
  provider: string;
  model: string;
  durationMs: number;
  wasError: boolean;
  errorMessage?: string;
  prompt?: string;
  userId?: string;
  repairApplied?: boolean;
  salvaged?: boolean;
}) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('ai_calls').insert({
      task_type: params.taskType || 'unspecified',
      provider: params.provider,
      model: params.model,
      duration_ms: params.durationMs,
      was_error: params.wasError,
      error_message: params.errorMessage || null,
      prompt: params.prompt || null,
      user_id: params.userId || null,
      metadata: {
        repairApplied: params.repairApplied || false,
        salvaged: params.salvaged || false,
        model: params.model,
        provider: params.provider,
      },
      created_at: new Date().toISOString(),
    });
  } catch (e: any) {
    // Never let telemetry failures bubble up
    console.warn('[Telemetry] Failed to record AI call:', e?.message || e);
  }
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

  const startTime = Date.now();

  try {
    const result = await retryWithProvider(
      async (attempt) => {
        return await provider.generate({
          ...request,
          attempt,
          apiKey,
        });
      },
      2 // 2 attempts per provider
    );

    // Record successful telemetry
    recordTelemetry({
      taskType: options.taskType || request.taskType,
      provider: result.provider,
      model: result.model,
      durationMs: result.latencyMs,
      wasError: false,
      prompt: request.userPrompt?.substring(0, 500),
      userId: request.userId,
      repairApplied: result.repairApplied,
      salvaged: result.salvaged,
    });

    return result;
  } catch (error: any) {
    // Record failed telemetry
    recordTelemetry({
      taskType: options.taskType || request.taskType,
      provider: provider.name,
      model: request.model || 'unknown',
      durationMs: Date.now() - startTime,
      wasError: true,
      errorMessage: error.message,
      prompt: request.userPrompt?.substring(0, 500),
      userId: request.userId,
    });

    throw error;
  }
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

  const startTime = Date.now();

  try {
    const result = await provider.generateStream(
      {
        ...request,
        apiKey,
      },
      onChunk
    );

    // Record successful stream telemetry
    recordTelemetry({
      taskType: options.taskType || request.taskType,
      provider: result.provider,
      model: result.model,
      durationMs: result.latencyMs,
      wasError: false,
      prompt: request.userPrompt?.substring(0, 500),
      userId: request.userId,
      repairApplied: result.repairApplied,
      salvaged: result.salvaged,
    });

    return result;
  } catch (error: any) {
    // Record failed stream telemetry
    recordTelemetry({
      taskType: options.taskType || request.taskType,
      provider: provider.name,
      model: request.model || 'unknown',
      durationMs: Date.now() - startTime,
      wasError: true,
      errorMessage: error.message,
      prompt: request.userPrompt?.substring(0, 500),
      userId: request.userId,
    });

    throw error;
  }
}
