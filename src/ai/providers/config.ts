/**
 * AI Provider Configuration
 *
 * Loads provider configuration from environment variables.
 * Supports multi-provider setup with per-pipeline overrides.
 */

import { AIProviderSystemConfig, AIProviderCapability } from './types';

let _cachedConfig: AIProviderSystemConfig | null = null;

export function loadAIConfig(): AIProviderSystemConfig {
  if (_cachedConfig) return _cachedConfig;

  const multiProviderEnabled = process.env.ENABLE_MULTI_PROVIDER === 'true';
  const priorities = (process.env.AI_PROVIDER_PRIORITIES || 'pollinations')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const defaultTimeout = parseInt(process.env.AI_PROVIDER_TIMEOUT || '120000', 10);

  // Build provider configs from env
  const providers: AIProviderSystemConfig['providers'] = {};

  // Pollinations (always configured)
  const pollinationsKey = process.env.POLLINATIONS_API_KEY || '';
  providers['pollinations'] = {
    name: 'pollinations',
    baseUrl: 'https://gen.pollinations.ai/v1',
    apiKey: pollinationsKey,
    defaultModel: 'openai',
    capabilities: ['fast', 'creative', 'reasoning', 'coding'],
  };

  // OpenRouter (secondary)
  const fallbackUrl = process.env.AI_FALLBACK_BASE_URL;
  const fallbackKey = process.env.AI_FALLBACK_API_KEY;
  const fallbackModel = process.env.AI_FALLBACK_MODEL || 'openai/gpt-4o-mini';

  if (fallbackUrl && fallbackKey) {
    providers['openrouter'] = {
      name: 'openrouter',
      baseUrl: fallbackUrl,
      apiKey: fallbackKey,
      defaultModel: fallbackModel,
      capabilities: ['fast', 'creative', 'reasoning', 'coding'],
      cost: {
        costPerInputToken: 0.00000015,
        costPerOutputToken: 0.0000006,
        estimatedCostPerCall: 0.002,
      },
    };
  }

  // Pipeline overrides
  const pipelineOverrides: Record<string, string[]> = {};

  const visionProviders = process.env.AI_VISION_PROVIDERS;
  if (visionProviders) pipelineOverrides['vision'] = visionProviders.split(',').map(s => s.trim());

  const chatProviders = process.env.AI_CHAT_PROVIDERS;
  if (chatProviders) pipelineOverrides['chat'] = chatProviders.split(',').map(s => s.trim());

  const reasoningProviders = process.env.AI_REASONING_PROVIDERS;
  if (reasoningProviders) pipelineOverrides['reasoning'] = reasoningProviders.split(',').map(s => s.trim());

  // Shadow testing provider
  const shadowProvider = process.env.AI_SHADOW_PROVIDER || undefined;

  _cachedConfig = {
    multiProviderEnabled,
    providerPriorities: priorities,
    defaultTimeout,
    providers,
    pipelineOverrides,
    shadowProvider,
  };

  return _cachedConfig;
}

export async function resetConfigCache() {
  _cachedConfig = null;
}
