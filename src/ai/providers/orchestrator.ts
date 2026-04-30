/**
 * AI Orchestrator
 *
 * Central routing engine for all AI requests.
 * Routes to providers based on: priority, health, cost, capability, task overrides.
 * Handles: ordered failover, per-adapter retry, latency budgets, shadow testing.
 */

import {
  IAIProvider,
  AIRequest,
  AIResponse,
  AIProviderCapability,
  OrchestratorOptions,
  AIStreamChunk,
  AIStreamCallback,
  AICallRecord,
} from './types';
import { getProviderRegistry } from './registry';
import { loadAIConfig } from './config';

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
      if (msg.includes('Authentication failed') || msg.includes('invalid')) {
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

// ── Provider Scoring ───────────────────────────────────────────────────

const COLD_START_BASELINE_LATENCY = 800; // ms — assumed p95 for new providers
const MIN_SAMPLES_FOR_DEGRADATION = 5;   // Don't degrade providers with < N calls

function scoreProvider(provider: IAIProvider, maxCostPerCall?: number): number {
  const h = provider.health();

  // Down providers always score 0
  if (h.status === 'down') return 0;

  // Health score (0-1)
  const healthScore = h.status === 'healthy' ? 1.0
    : h.status === 'degraded' ? 0.3
    : 0.0;

  // Cold-start handling: new providers with insufficient data
  // use baseline values instead of being incorrectly preferred
  const isColdStart = h.totalCalls < MIN_SAMPLES_FOR_DEGRADATION;
  const effectiveLatency = isColdStart ? COLD_START_BASELINE_LATENCY : h.p95LatencyMs;
  const effectiveHealth = isColdStart ? 0.7 : healthScore; // Slight discount for unknowns

  // Latency norm (0-1, lower latency = higher score)
  const latencyNorm = effectiveLatency > 0
    ? Math.min(1, effectiveLatency / 120_000)
    : 0.01;

  // Cost norm (0-1, placeholder — extend when cost data is available)
  const costNorm = 0;

  // score = health×0.5 − latency×0.3 − cost×0.2
  const score = (effectiveHealth * 0.5) - (latencyNorm * 0.3) - (costNorm * 0.2);

  return Math.max(0, score);
}

// ── Telemetry Buffer ───────────────────────────────────────────────────

const telemetryBuffer: AICallRecord[] = [];
const FLUSH_INTERVAL = 30_000;
const MAX_BUFFER = 100;
const HARD_DROP_LIMIT = 500; // Drop oldest records if buffer exceeds this
const TELEMETRY_MAX_RETRIES = 3;

function bufferTelemetry(record: AICallRecord) {
  // Drop policy: if buffer exceeds hard limit, discard oldest 50%
  if (telemetryBuffer.length >= HARD_DROP_LIMIT) {
    const dropped = telemetryBuffer.splice(0, Math.floor(HARD_DROP_LIMIT / 2));
    console.warn(`⚠️ Telemetry backpressure: dropped ${dropped.length} oldest records`);
  }

  telemetryBuffer.push(record);

  if (telemetryBuffer.length >= MAX_BUFFER) {
    flushTelemetry().catch(console.error);
  }
}

async function flushTelemetry() {
  if (telemetryBuffer.length === 0) return;
  const batch = telemetryBuffer.splice(0, telemetryBuffer.length);

  const rows = batch.map(r => ({
    task_type: r.taskType,
    provider: r.provider,
    model: r.model,
    capability: r.capability,
    latency_ms: r.latencyMs,
    success: r.success,
    repair_applied: r.repairApplied,
    salvaged: r.salvaged,
    error_class: r.errorClass,
    input_tokens: r.inputTokens,
    output_tokens: r.outputTokens,
    is_shadow: r.isShadow,
    created_at: new Date(r.timestamp).toISOString(),
  }));

  // Retry with exponential backoff (3 attempts)
  for (let attempt = 0; attempt < TELEMETRY_MAX_RETRIES; attempt++) {
    try {
      const { getSupabaseAdmin } = await import('@/lib/supabase-server');
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from('ai_calls').insert(rows);
      if (error) throw error;
      return; // Success
    } catch (e) {
      if (attempt < TELEMETRY_MAX_RETRIES - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(`⚠️ Telemetry flush attempt ${attempt + 1} failed, retrying in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.warn('⚠️ Telemetry flush failed after all retries (non-critical):', e);
        // Return records to buffer if space allows, otherwise drop
        const spaceAvailable = HARD_DROP_LIMIT - telemetryBuffer.length;
        if (spaceAvailable > 0) {
          telemetryBuffer.unshift(...batch.slice(0, spaceAvailable));
        }
      }
    }
  }
}

// Schedule periodic flush
if (typeof globalThis !== 'undefined') {
  const existing = (globalThis as any).__ai_telemetry_interval;
  if (!existing) {
    (globalThis as any).__ai_telemetry_interval = setInterval(() => {
      flushTelemetry().catch(console.error);
    }, FLUSH_INTERVAL);
  }
}

// ── Orchestrator ───────────────────────────────────────────────────────

export async function orchestrate(
  request: AIRequest,
  options: OrchestratorOptions = {}
): Promise<AIResponse> {
  const config = loadAIConfig();
  const registry = getProviderRegistry();

  // If multi-provider is disabled, force pollinations only
  if (!config.multiProviderEnabled && !options.providerOverride) {
    options.providerOverride = 'pollinations';
  }

  // Get providers in order
  let providers: IAIProvider[];

  if (options.providerOverride) {
    const forced = registry.get(options.providerOverride);
    if (!forced) throw new Error(`Provider "${options.providerOverride}" not registered`);
    providers = [forced];
  } else if (options.taskType && config.pipelineOverrides[options.taskType]) {
    providers = registry.getForTask(options.taskType, config);
  } else if (request.capability) {
    providers = registry.getForCapability(request.capability);
    // If no capability-specific providers, fallback to all
    if (providers.length === 0) providers = registry.getOrdered();
  } else {
    providers = registry.getOrdered();
  }

  // Sort by score (health + latency + cost)
  providers.sort((a, b) => scoreProvider(b, options.maxCostPerCall) - scoreProvider(a, options.maxCostPerCall));

  // Filter out down providers (unless it's the only one)
  const healthy = providers.filter(p => p.health().status !== 'down');
  if (healthy.length > 0) providers = healthy;

  if (providers.length === 0) {
    throw new Error('No AI providers available');
  }

  console.log(`🎯 Orchestrator: Task=${options.taskType || 'unknown'}, Providers=[${providers.map(p => `${p.name}(${p.health().status})`).join(', ')}]`);

  // Try each provider with per-provider retry
  const errors: Array<{ provider: string; error: string }> = [];

  for (const provider of providers) {
    try {
      const result = await retryWithProvider(
        async (attempt) => {
          return await provider.generate({
            ...request,
            attempt,
            apiKey: request.apiKey || undefined,
          });
        },
        2 // 2 attempts per provider
      );

      // Record telemetry
      bufferTelemetry({
        id: `ac_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        taskType: options.taskType || 'unknown',
        provider: result.provider,
        model: result.model,
        capability: request.capability || 'creative',
        latencyMs: result.latencyMs,
        success: true,
        repairApplied: result.repairApplied,
        salvaged: result.salvaged,
        isShadow: false,
        inputTokens: result.usage?.promptTokens,
        outputTokens: result.usage?.completionTokens,
        timestamp: Date.now(),
      });

      // Shadow testing: run secondary in background (no user impact)
      const shadowTarget = options.shadowProvider || config.shadowProvider;
      if (shadowTarget && shadowTarget !== provider.name) {
        const shadowProv = registry.get(shadowTarget);
        if (shadowProv) {
          runShadow(shadowProv, request, options).catch(() => {});
        }
      }

      return result;
    } catch (err: any) {
      const errMsg = err.message || String(err);
      errors.push({ provider: provider.name, error: errMsg });
      console.warn(`❌ Provider ${provider.name} failed: ${errMsg}`);

      // Record failure telemetry
      bufferTelemetry({
        id: `ac_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        taskType: options.taskType || 'unknown',
        provider: provider.name,
        model: request.model || 'unknown',
        capability: request.capability || 'creative',
        latencyMs: 0,
        success: false,
        repairApplied: false,
        salvaged: false,
        errorClass: classifyError(errMsg),
        isShadow: false,
        timestamp: Date.now(),
      });

      // Auth errors for primary → don't failover (user's key is bad)
      if (errMsg.includes('Authentication failed') && provider === providers[0]) {
        throw err;
      }

      // Continue to next provider
    }
  }

  // All providers failed
  const errSummary = errors.map(e => `${e.provider}: ${e.error}`).join('; ');
  throw new Error(`All AI providers failed. ${errSummary}`);
}

// ── Streaming Orchestration ────────────────────────────────────────────

export async function orchestrateStream(
  request: AIRequest,
  onChunk: AIStreamCallback,
  options: OrchestratorOptions = {}
): Promise<AIResponse> {
  const config = loadAIConfig();
  const registry = getProviderRegistry();

  if (!config.multiProviderEnabled && !options.providerOverride) {
    options.providerOverride = 'pollinations';
  }

  let providers: IAIProvider[];

  if (options.providerOverride) {
    const forced = registry.get(options.providerOverride);
    if (!forced) throw new Error(`Provider "${options.providerOverride}" not registered`);
    providers = [forced];
  } else {
    providers = registry.getOrdered();
  }

  const healthy = providers.filter(p => p.health().status !== 'down');
  if (healthy.length > 0) providers = healthy;

  for (const provider of providers) {
    if (!provider.generateStream) {
      // Fallback: use non-streaming and emit full result
      try {
        const result = await provider.generate(request);
        onChunk({ text: typeof result.content === 'string' ? result.content : JSON.stringify(result.content), done: true, model: result.model });
        return result;
      } catch (err: any) {
        console.warn(`❌ Provider ${provider.name} (buffered stream) failed: ${err.message}`);
        continue;
      }
    }

    try {
      return await provider.generateStream(request, onChunk);
    } catch (err: any) {
      console.warn(`❌ Provider ${provider.name} stream failed: ${err.message}`);
      continue;
    }
  }

  throw new Error('All AI providers failed for streaming');
}

// ── Shadow Testing ─────────────────────────────────────────────────────

async function runShadow(
  provider: IAIProvider,
  request: AIRequest,
  options: OrchestratorOptions
) {
  try {
    // Strip apiKey from shadow request — shadow providers must use their own configured key,
    // not the primary provider's key (which would cause auth failures across providers)
    const shadowRequest = { ...request, apiKey: undefined };
    const result = await provider.generate(shadowRequest);

    bufferTelemetry({
      id: `ac_${Date.now()}_shadow_${Math.random().toString(36).substr(2, 6)}`,
      taskType: options.taskType || 'unknown',
      provider: result.provider,
      model: result.model,
      capability: request.capability || 'creative',
      latencyMs: result.latencyMs,
      success: true,
      repairApplied: result.repairApplied,
      salvaged: result.salvaged,
      isShadow: true,
      timestamp: Date.now(),
    });

    console.log(`👻 Shadow [${provider.name}]: ✅ ${result.latencyMs}ms, repair=${result.repairApplied}, salvaged=${result.salvaged}`);
  } catch (err: any) {
    bufferTelemetry({
      id: `ac_${Date.now()}_shadow_${Math.random().toString(36).substr(2, 6)}`,
      taskType: options.taskType || 'unknown',
      provider: provider.name,
      model: request.model || 'unknown',
      capability: request.capability || 'creative',
      latencyMs: 0,
      success: false,
      repairApplied: false,
      salvaged: false,
      errorClass: classifyError(err.message),
      isShadow: true,
      timestamp: Date.now(),
    });
    console.log(`👻 Shadow [${provider.name}]: ❌ ${err.message}`);
  }
}

// ── Error Classification ───────────────────────────────────────────────

function classifyError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('timeout') || lower.includes('abort')) return 'timeout';
  if (lower.includes('auth') || lower.includes('401') || lower.includes('403')) return 'auth';
  if (lower.includes('rate limit') || lower.includes('429')) return 'rate_limit';
  if (lower.includes('500') || lower.includes('502') || lower.includes('503')) return 'server';
  if (lower.includes('parse') || lower.includes('json') || lower.includes('schema')) return 'parse';
  return 'unknown';
}
