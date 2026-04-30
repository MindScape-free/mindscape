/**
 * AI Provider Registry
 *
 * Manages adapter instances, priority ordering, and capability filtering.
 * Initialized from environment config via ProviderRegistry.fromConfig().
 */

import {
  IAIProvider,
  AIProviderCapability,
} from './types';
import { PollinationsAdapter } from './pollinations-adapter';
import { OpenAICompatibleAdapter } from './openai-compatible-adapter';
import { loadAIConfig } from './config';

// ── Registry ───────────────────────────────────────────────────────────

class ProviderRegistry {
  private providers = new Map<string, IAIProvider>();
  private priorities: string[] = [];

  register(provider: IAIProvider, priority?: number): void {
    this.providers.set(provider.name, provider);
    if (priority !== undefined) {
      this.priorities.splice(priority, 0, provider.name);
    } else {
      if (!this.priorities.includes(provider.name)) {
        this.priorities.push(provider.name);
      }
    }
  }

  get(name: string): IAIProvider | undefined {
    return this.providers.get(name);
  }

  getOrdered(): IAIProvider[] {
    return this.priorities
      .map(name => this.providers.get(name))
      .filter((p): p is IAIProvider => p !== undefined);
  }

  getForCapability(capability: AIProviderCapability): IAIProvider[] {
    return this.getOrdered().filter(p => p.supports(capability));
  }

  getForTask(taskType: string, config?: ReturnType<typeof loadAIConfig>): IAIProvider[] {
    if (config?.pipelineOverrides[taskType]) {
      const overrideNames = config.pipelineOverrides[taskType];
      const overrideProviders = overrideNames
        .map(name => this.providers.get(name))
        .filter((p): p is IAIProvider => p !== undefined);
      if (overrideProviders.length > 0) return overrideProviders;
    }
    return this.getOrdered();
  }

  getAllNames(): string[] {
    return [...this.providers.keys()];
  }

  size(): number {
    return this.providers.size;
  }
}

// ── Singleton ──────────────────────────────────────────────────────────

let _registryInstance: ProviderRegistry | null = null;

export function getProviderRegistry(): ProviderRegistry {
  if (_registryInstance) return _registryInstance;

  const config = loadAIConfig();
  const registry = new ProviderRegistry();

  // Register Pollinations (always available)
  registry.register(new PollinationsAdapter());

  // Register secondary providers based on config
  for (const [name, providerConfig] of Object.entries(config.providers)) {
    if (name === 'pollinations') continue; // Already registered

    if (providerConfig.baseUrl && providerConfig.apiKey) {
      registry.register(new OpenAICompatibleAdapter(providerConfig));
      console.log(`🔌 Registered AI provider: ${name} (${providerConfig.baseUrl})`);
    }
  }

  // Set priority order from config
  for (const name of config.providerPriorities) {
    if (registry.get(name)) {
      // Already in registry, just ensure priority order
    }
  }

  console.log(`🔌 AI Provider Registry: ${registry.size()} providers [${registry.getAllNames().join(', ')}]`);

  _registryInstance = registry;
  return registry;
}

export async function resetRegistry() {
  _registryInstance = null;
}
