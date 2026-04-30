'use server';

/**
 * AI Client Dispatcher — Backward-Compatible Facade
 *
 * MIGRATION NOTE: This file now delegates to the multi-provider orchestrator.
 * The `generateContent()` signature is preserved exactly as before so that
 * all 18+ flow files continue to work without any changes.
 *
 * All JSON repair, schema validation, and mind map normalization logic has
 * been extracted to `@/ai/providers/post-processor.ts`.
 */

import { ModelCapability } from './pollinations-client';
import { orchestrate } from './providers/orchestrator';
import { StructuredOutputError } from './providers/post-processor';

export { StructuredOutputError };
export type AIProvider = 'pollinations' | string;

interface GenerateContentOptions {
  provider?: AIProvider;
  apiKey?: string;
  systemPrompt: string;
  userPrompt: string;
  images?: { inlineData: { mimeType: string; data: string } }[];
  schema?: any;
  model?: string;
  capability?: ModelCapability;
  strict?: boolean;
  options?: {
    model?: string;
    capability?: ModelCapability;
  };
}

/**
 * Unified AI generation — backward-compatible entry point.
 *
 * Routes through the multi-provider orchestrator which handles:
 * - Provider selection (health, cost, capability)
 * - Per-provider retry with backoff
 * - Automatic failover to secondary providers (when ENABLE_MULTI_PROVIDER=true)
 * - JSON repair + Zod validation (via shared post-processor)
 * - Telemetry recording
 */
export async function generateContent(options: GenerateContentOptions): Promise<any> {
  const {
    apiKey,
    systemPrompt,
    userPrompt,
    images,
    schema,
    model,
    capability,
    strict,
  } = options;

  // Merge model/capability from nested options (backward compat)
  const effectiveModel = model || options.options?.model;
  const effectiveCapability = capability || options.options?.capability;

  // Inject JSON-only instruction into system prompt if schema is provided (preserving existing behavior)
  const effectiveSystemPrompt = schema
    ? `${systemPrompt}\n\nPlease respond with a valid JSON object matching the requested schema.`
    : systemPrompt;

  console.log(`🔌 AI Dispatcher → Orchestrator (provider=${options.provider || 'auto'})`);

  const result = await orchestrate(
    {
      systemPrompt: effectiveSystemPrompt,
      userPrompt,
      images,
      schema,
      model: effectiveModel,
      capability: effectiveCapability as any,
      strict: strict ?? false,
      apiKey,
    },
    {
      providerOverride: options.provider || undefined,
    }
  );

  // Return just the content (preserving existing return type)
  return result.content;
}
