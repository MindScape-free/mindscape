/**
 * AI Provider Configuration — Pollinations Only
 */

import { AIProviderSystemConfig } from './types';
import { getEnv } from '@/lib/env';

let _cachedConfig: AIProviderSystemConfig | null = null;

export function loadAIConfig(): AIProviderSystemConfig {
  if (_cachedConfig) return _cachedConfig;

  const { pollinationsApiKey, aiProviderTimeout } = getEnv();

  _cachedConfig = {
    multiProviderEnabled: false,
    providerPriorities: ['pollinations'],
    defaultTimeout: aiProviderTimeout,
    providers: {
      pollinations: {
        name: 'pollinations',
        baseUrl: 'https://gen.pollinations.ai/v1',
        apiKey: pollinationsApiKey || '',
        defaultModel: 'openai',
        capabilities: ['fast', 'creative', 'reasoning', 'coding'],
      },
    },
    pipelineOverrides: {},
    shadowProvider: undefined,
  };

  return _cachedConfig;
}

export async function resetConfigCache() {
  _cachedConfig = null;
}
