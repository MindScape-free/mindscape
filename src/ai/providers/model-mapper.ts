/**
 * Model Mapper — translates user-selected Pollinations model names
 * into provider-specific model IDs for NVIDIA and OpenRouter.
 *
 * Why this exists:
 * Users select models from Pollinations' model list (e.g. "openai", "llama"),
 * but those names are meaningless on NVIDIA or OpenRouter. This mapper
 * translates them so the user's model preference works regardless of provider.
 *
 * If no mapping exists for a given model, the adapter falls back to its
 * capability-based default (e.g. "meta/llama-3.1-70b-instruct" for NVIDIA,
 * "openrouter/free" for OpenRouter).
 */

type ModelMapping = Record<string, string | undefined>;

/**
 * Mapping table: Pollinations model name → per-provider model ID.
 *
 * Only models that have an entry here will be translated when the provider
 * is not Pollinations. Unknown models are passed through as-is for
 * Pollinations, or stripped (→ adapter default) for other providers.
 */
const MODEL_MAP: Record<string, ModelMapping> = {
  // ── OpenAI ────────────────────────────────────────────────────────
  'openai': {
    openrouter: 'openai/gpt-4o-mini',
    nvidia: 'meta/llama-3.1-70b-instruct',
  },
  'openai-large': {
    openrouter: 'openai/gpt-4o',
    nvidia: 'meta/llama-3.1-70b-instruct',
  },
  'gpt-4o-mini': {
    openrouter: 'openai/gpt-4o-mini',
    nvidia: 'meta/llama-3.1-70b-instruct',
  },
  'gpt-4o': {
    openrouter: 'openai/gpt-4o',
    nvidia: 'meta/llama-3.1-70b-instruct',
  },

  // ── Google Gemini ─────────────────────────────────────────────────
  'gemini-2.0-flash': {
    openrouter: 'google/gemini-2.0-flash-001',
    nvidia: 'meta/llama-3.1-70b-instruct',
  },
  'gemini-1.5-pro': {
    openrouter: 'google/gemini-1.5-pro-001',
    nvidia: 'meta/llama-3.1-70b-instruct',
  },
  'gemini-1.5-flash': {
    openrouter: 'google/gemini-1.5-flash-001',
    nvidia: 'meta/llama-3.1-70b-instruct',
  },
  'gemma-2-27b-it': {
    openrouter: 'google/gemma-2-27b-it',
    nvidia: 'meta/llama-3.1-70b-instruct',
  },
  'gemma-2-9b-it': {
    openrouter: 'google/gemma-2-9b-it',
    nvidia: 'meta/llama-3.1-8b-instruct',
  },

  // ── Anthropic ─────────────────────────────────────────────────────
  'claude-3.5-sonnet': {
    openrouter: 'anthropic/claude-3.5-sonnet',
    nvidia: 'meta/llama-3.1-70b-instruct',
  },
  'claude-3-haiku': {
    openrouter: 'anthropic/claude-3-haiku',
    nvidia: 'meta/llama-3.1-8b-instruct',
  },

  // ── Meta Llama ────────────────────────────────────────────────────
  'llama': {
    openrouter: 'meta-llama/llama-3.1-8b-instruct',
    nvidia: 'meta/llama-3.1-8b-instruct',
  },
  'llama-3.1-8b': {
    openrouter: 'meta-llama/llama-3.1-8b-instruct',
    nvidia: 'meta/llama-3.1-8b-instruct',
  },
  'llama-3.1-70b': {
    openrouter: 'meta-llama/llama-3.1-70b-instruct',
    nvidia: 'meta/llama-3.1-70b-instruct',
  },
  'llama-3.1-405b': {
    openrouter: 'meta-llama/llama-3.1-405b-instruct',
    nvidia: 'meta/llama-3.1-70b-instruct',
  },

  // ── Mistral ───────────────────────────────────────────────────────
  'mistral': {
    openrouter: 'mistralai/mistral-7b-instruct',
    nvidia: 'mistralai/mistral-7b-instruct',
  },
  'mistral-large': {
    openrouter: 'mistralai/mistral-large',
    nvidia: 'mistralai/mistral-large',
  },
  'mixtral': {
    openrouter: 'mistralai/mixtral-8x7b-instruct',
    nvidia: 'mistralai/mixtral-8x7b-instruct',
  },

  // ── DeepSeek ──────────────────────────────────────────────────────
  'deepseek-chat': {
    openrouter: 'deepseek/deepseek-chat',
    nvidia: 'meta/llama-3.1-8b-instruct',
  },
  'deepseek-reasoner': {
    openrouter: 'deepseek/deepseek-r1',
    nvidia: 'meta/llama-3.1-70b-instruct',
  },

  // ── Qwen ──────────────────────────────────────────────────────────
  'qwen': {
    openrouter: 'qwen/qwen-2.5-72b-instruct',
    nvidia: 'meta/llama-3.1-70b-instruct',
  },
  'qwen-2.5-coder': {
    openrouter: 'qwen/qwen-2.5-coder-32b-instruct',
    nvidia: 'meta/llama-3.1-70b-instruct',
  },

  // ── Other ─────────────────────────────────────────────────────────
  'phi-3-medium': {
    openrouter: 'microsoft/phi-3-medium-4k-instruct',
    nvidia: 'microsoft/phi-3-medium-4k-instruct',
  },
  'nvidia-nemotron': {
    openrouter: 'nvidia/nemotron-4-340b-instruct',
    nvidia: 'nvidia/llama-3.1-nemotron-51b-instruct',
  },
};

/**
 * Map a Pollinations model name to the equivalent model ID for the given provider.
 *
 * @param provider - The target provider ('pollinations', 'openrouter', 'nvidia')
 * @param model - The model name selected by the user (from Pollinations list)
 * @returns The mapped model ID for the target provider, or undefined if no mapping exists
 */
export function mapModel(provider: string, model: string | undefined): string | undefined {
  if (!model) return undefined;

  // Pollinations uses the model name as-is
  if (provider === 'pollinations') return model;

  // Look up the model in the mapping table
  const mapping = MODEL_MAP[model];
  if (mapping) {
    const mapped = mapping[provider];
    if (mapped) return mapped;
  }

  // No mapping exists — return undefined so the adapter falls back to its default
  return undefined;
}


