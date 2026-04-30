/**
 * AI Provider System — Barrel Export
 */

export type {
  IAIProvider,
  AIRequest,
  AIResponse,
  AIProviderCapability,
  ProviderHealthStatus,
  AIStreamChunk,
  AIStreamCallback,
  OrchestratorOptions,
  AICallRecord,
  SingleProviderConfig,
  AIProviderSystemConfig,
} from './types';

export { PollinationsAdapter } from './pollinations-adapter';
export { OpenAICompatibleAdapter } from './openai-compatible-adapter';
export { getProviderRegistry } from './registry';
export { loadAIConfig } from './config';
export { orchestrate, orchestrateStream } from './orchestrator';
export {
  postProcess,
  repairJSON,
  deepExtract,
  normalizeMindMapTree,
  performSchemaValidation,
  isReasoningOnly,
  StructuredOutputError,
} from './post-processor';
