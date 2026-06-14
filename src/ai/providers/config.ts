/**
 * AI Provider Configuration — Pollinations Only
 */

import { AIProviderSystemConfig } from './types';

let _cachedConfig: AIProviderSystemConfig | null = null;

export function loadAIConfig(): AIProviderSystemConfig {
  if (_cachedConfig) return _cachedConfig;

  const defaultTimeout = parseInt(process.env.AI_PROVIDER_TIMEOUT || '120000', 10);

  _cachedConfig = {
    multiProviderEnabled: false,
    providerPriorities: ['pollinations'],
    defaultTimeout,
    providers: {
      pollinations: {
        name: 'pollinations',
        baseUrl: 'https://gen.pollinations.ai/v1',
        apiKey: process.env.POLLINATIONS_API_KEY || '',
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
