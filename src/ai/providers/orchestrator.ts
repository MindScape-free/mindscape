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
import { OpenRouterAdapter } from './openrouter-adapter';
import { NvidiaAdapter } from './nvidia-adapter';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { mapModel } from './model-mapper';

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
      repair_applied: params.repairApplied || false,
      salvaged: params.salvaged || false,
      metadata: {
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

// ── Error Prioritization ──────────────────────────────────────────────

/**
 * When multiple providers fail, pick the most actionable error to show the user.
 *
 * A "less relevant" error is one that says the fallback provider simply wasn't
 * configured (e.g., "API key missing"). In that case, we prefer the primary
 * provider's error (e.g., "Your Pollinations key is invalid") because it's
 * the actual problem the user needs to fix.
 */
function pickBestError(primaryError: any, fallbackError: any): any {
  if (!fallbackError) return primaryError;
  if (!primaryError) return fallbackError;

  const msg = (fallbackError.message || '').toLowerCase();
  const isMissingKeyError =
    msg.includes('api key missing') ||
    msg.includes('no api key') ||
    msg.includes('not configured') ||
    msg.includes('does not support streaming') ||
    msg.includes('no key available') ||
    msg.includes('authentication failed: openrouter api key missing');

  if (isMissingKeyError) {
    return primaryError;
  }
  return fallbackError;
}

// ── Direct Routing Functions ───────────────────────────────────────────

/**
 * Check if a usable API key exists for a given provider.
 * Returns the key string if available, empty string otherwise.
 */
function hasKeyForProvider(
  providerName: string,
  request: AIRequest,
  options: OrchestratorOptions
): string {
  // If provider-specific keys are explicitly passed in options, use them as the primary source of truth
  if (options.apiKeys) {
    if (providerName === 'pollinations') {
      return options.apiKeys.pollinations || process.env.POLLINATIONS_API_KEY || '';
    }
    if (providerName === 'openrouter') {
      return options.apiKeys.openrouter || process.env.OPENROUTER_API_KEY || '';
    }
    if (providerName === 'nvidia') {
      return options.apiKeys.nvidia || process.env.NVIDIA_API_KEY || '';
    }
  }

  // Determine if the request-level apiKey belongs to this provider
  let isTargeted = false;
  if (request.apiKey) {
    if (options.providerOverride) {
      isTargeted = options.providerOverride === providerName;
    } else {
      // Guess based on common key prefix if override is not specified
      const isOpenRouterKey = request.apiKey.startsWith('sk-or-');
      const isNvidiaKey = request.apiKey.startsWith('nvapi-');
      if (providerName === 'openrouter') {
        isTargeted = isOpenRouterKey;
      } else if (providerName === 'nvidia') {
        isTargeted = isNvidiaKey;
      } else if (providerName === 'pollinations') {
        isTargeted = !isOpenRouterKey && !isNvidiaKey;
      }
    }
  }

  const key = isTargeted ? request.apiKey : undefined;

  if (providerName === 'pollinations') {
    return key || process.env.POLLINATIONS_API_KEY || '';
  }
  if (providerName === 'openrouter') {
    return key || process.env.OPENROUTER_API_KEY || '';
  }
  if (providerName === 'nvidia') {
    return key || process.env.NVIDIA_API_KEY || '';
  }
  return '';
}

/**
 * Build the adapter sequence based on provider override AND key availability.
 * If the primary provider has no key configured, skip it — don't waste time
 * on auth failures before falling back.
 */
function buildAdapterSequence(
  providerOverride: string | undefined,
  request: AIRequest,
  options: OrchestratorOptions
): Array<{ adapter: any; name: string }> {
  const openrouterKey = hasKeyForProvider('openrouter', request, options);
  const pollinationsKey = hasKeyForProvider('pollinations', request, options);
  const nvidiaKey = hasKeyForProvider('nvidia', request, options);
  const hasOpenRouter = !!openrouterKey;
  const hasPollinations = !!pollinationsKey;
  const hasNvidia = !!nvidiaKey;

  const openRouterEntry = { adapter: new OpenRouterAdapter(), name: 'openrouter' };
  const pollinationsEntry = { adapter: new PollinationsAdapter(), name: 'pollinations' };
  const nvidiaEntry = { adapter: new NvidiaAdapter(), name: 'nvidia' };

  // Respect explicit override, but skip providers with no key
  if (providerOverride === 'nvidia' && hasNvidia) {
    return [nvidiaEntry, ...(hasOpenRouter ? [openRouterEntry] : []), ...(hasPollinations ? [pollinationsEntry] : [])];
  }
  if (providerOverride === 'openrouter' && hasOpenRouter) {
    return [openRouterEntry, ...(hasNvidia ? [nvidiaEntry] : []), ...(hasPollinations ? [pollinationsEntry] : [])];
  }
  if (providerOverride === 'pollinations' && hasPollinations) {
    return [pollinationsEntry, ...(hasNvidia ? [nvidiaEntry] : []), ...(hasOpenRouter ? [openRouterEntry] : [])];
  }
  if (providerOverride === 'nvidia' && !hasNvidia) {
    console.log('🔄 [Orchestrator] NVIDIA requested but no key configured, using OpenRouter');
    return hasOpenRouter ? [openRouterEntry] : (hasPollinations ? [pollinationsEntry] : []);
  }
  if (providerOverride === 'openrouter' && !hasOpenRouter) {
    console.log('🔄 [Orchestrator] OpenRouter requested but no key configured, using NVIDIA/Pollinations');
    return hasNvidia ? [nvidiaEntry] : (hasPollinations ? [pollinationsEntry] : []);
  }
  if (providerOverride === 'pollinations' && !hasPollinations) {
    console.log('🔄 [Orchestrator] Pollinations requested but no key configured, using NVIDIA/OpenRouter');
    return hasNvidia ? [nvidiaEntry] : (hasOpenRouter ? [openRouterEntry] : []);
  }

  // No explicit override: prefer the provider that has a key
  const sequence: Array<{ adapter: any; name: string }> = [];
  if (hasNvidia) sequence.push(nvidiaEntry);
  if (hasOpenRouter) sequence.push(openRouterEntry);
  if (hasPollinations) sequence.push(pollinationsEntry);

  if (sequence.length > 0) {
    return sequence;
  }

  // No keys at all — try both anyway (system defaults might save us)
  return [openRouterEntry, pollinationsEntry, nvidiaEntry];
}

export async function orchestrate(
  request: AIRequest,
  options: OrchestratorOptions = {}
): Promise<AIResponse> {
  const providerOverride = options.providerOverride;
  const adaptersToTry = buildAdapterSequence(providerOverride, request, options);

  if (adaptersToTry.length === 0) {
    throw new Error('No AI providers available — configure an API key in your profile settings.');
  }

  let primaryError: any = null;
  let lastError: any = null;
  const startTime = Date.now();

  for (let i = 0; i < adaptersToTry.length; i++) {
    const { adapter, name } = adaptersToTry[i];

    try {
      const apiKey = hasKeyForProvider(name, request, options);

      console.log(`🤖 [Orchestrator] Attempting ${name}: Task=${options.taskType || request.taskType || 'unknown'}, Model=${request.model || 'auto'}`);

      // Map the user's Pollinations model name to a provider-specific model ID.
      // This ensures 'openai' → 'meta/llama-3.1-70b-instruct' on NVIDIA, etc.
      const mappedModel = mapModel(name, i === 0 ? request.model : undefined);
      const providerRequest = {
        ...request,
        attempt: 0,
        apiKey,
        model: mappedModel,
      };

      const result = await retryWithProvider(
        async (attempt) => {
          return await adapter.generate({
            ...providerRequest,
            attempt,
          });
        },
        2
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
      console.warn(`⚠️ [Orchestrator] Provider ${name} failed:`, error.message || error);
      if (i === 0) {
        primaryError = error;
      }
      lastError = pickBestError(primaryError, error);
    }
  }

  // If all providers in the chain fail
  recordTelemetry({
    taskType: options.taskType || request.taskType,
    provider: providerOverride || 'auto',
    model: request.model || 'unknown',
    durationMs: Date.now() - startTime,
    wasError: true,
    errorMessage: lastError?.message || 'All providers failed',
    prompt: request.userPrompt?.substring(0, 500),
    userId: request.userId,
  });

  throw lastError || new Error('No AI providers available');
}

export async function orchestrateStream(
  request: AIRequest,
  onChunk: AIStreamCallback,
  options: OrchestratorOptions = {}
): Promise<AIResponse> {
  const providerOverride = options.providerOverride;
  const adaptersToTry = buildAdapterSequence(providerOverride, request, options);

  if (adaptersToTry.length === 0) {
    throw new Error('No AI providers available — configure an API key in your profile settings.');
  }

  let primaryError: any = null;
  let lastError: any = null;
  const startTime = Date.now();

  for (let i = 0; i < adaptersToTry.length; i++) {
    const { adapter, name } = adaptersToTry[i];

    if (!adapter.generateStream) {
      console.warn(`⚠️ [Orchestrator] Provider ${name} does not support streaming, skipping`);
      continue;
    }

    try {
      const apiKey = hasKeyForProvider(name, request, options);

      console.log(`🌊 [Orchestrator] Attempting stream ${name}: Task=${options.taskType || request.taskType || 'unknown'}, Model=${request.model || 'auto'}`);

      // Map the user's Pollinations model name to a provider-specific model ID.
      const mappedModel = mapModel(name, i === 0 ? request.model : undefined);
      const providerRequest = {
        ...request,
        attempt: 0,
        apiKey,
        model: mappedModel,
      };

      const result = await adapter.generateStream(providerRequest, onChunk);

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
      console.warn(`⚠️ [Orchestrator] Stream provider ${name} failed:`, error.message || error);
      if (i === 0) {
        primaryError = error;
      }
      lastError = pickBestError(primaryError, error);
    }
  }

  // If all providers in the chain fail
  recordTelemetry({
    taskType: options.taskType || request.taskType,
    provider: providerOverride || 'auto',
    model: request.model || 'unknown',
    durationMs: Date.now() - startTime,
    wasError: true,
    errorMessage: lastError?.message || 'All streaming providers failed',
    prompt: request.userPrompt?.substring(0, 500),
    userId: request.userId,
  });

  throw lastError || new Error('No AI streaming providers available');
}
