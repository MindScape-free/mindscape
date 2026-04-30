/**
 * Multi-Provider AI System — Core Type Definitions
 *
 * Defines the contracts that all AI providers must implement,
 * the standardized request/response format, and health monitoring types.
 */

// ── Capability Types ───────────────────────────────────────────────────

export type AIProviderCapability = 'fast' | 'creative' | 'reasoning' | 'coding';

// ── Request ────────────────────────────────────────────────────────────

export interface AIRequest {
  systemPrompt: string;
  userPrompt: string;
  images?: { inlineData: { mimeType: string; data: string } }[];
  schema?: any;                          // Zod schema for validation (null = plain text)
  capability?: AIProviderCapability;
  model?: string;                        // Provider-specific model override
  timeout?: number;                      // ms, default 120_000
  attempt?: number;                      // For model rotation within adapter
  apiKey?: string;                       // Per-call key override
  strict?: boolean;                      // Strict schema enforcement
  taskType?: string;                     // For telemetry (e.g. 'generate-mind-map')
  stream?: boolean;                      // Request streaming response
}

// ── Response ───────────────────────────────────────────────────────────

export interface AIResponse {
  content: any;                          // Parsed object or string
  raw: string;                           // Raw text before parsing
  provider: string;                      // e.g. 'pollinations', 'openrouter'
  model: string;                         // Actual model used
  latencyMs: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
  repairApplied: boolean;                // True if JSON repair was needed
  salvaged: boolean;                     // True if schema salvage was applied
}

// ── Streaming ──────────────────────────────────────────────────────────

export interface AIStreamChunk {
  text: string;                          // Incremental text
  done: boolean;
  model?: string;
}

export type AIStreamCallback = (chunk: AIStreamChunk) => void;

// ── Health ──────────────────────────────────────────────────────────────

export type ProviderHealthState = 'healthy' | 'degraded' | 'down';

export interface ProviderHealthStatus {
  status: ProviderHealthState;
  successRate: number;                   // 0-1, rolling window
  p95LatencyMs: number;
  lastErrorAt?: number;
  consecutiveFailures: number;
  totalCalls: number;
}

// ── Call Result (for monitor) ──────────────────────────────────────────

export interface CallResult {
  success: boolean;
  latencyMs: number;
  errorClass?: 'timeout' | 'auth' | 'rate_limit' | 'server' | 'parse' | 'unknown';
  timestamp: number;
}

// ── Provider Interface ─────────────────────────────────────────────────

export interface IAIProvider {
  readonly name: string;
  generate(request: AIRequest): Promise<AIResponse>;
  generateStream?(request: AIRequest, onChunk: AIStreamCallback): Promise<AIResponse>;
  supports(capability: AIProviderCapability): boolean;
  health(): ProviderHealthStatus;
}

// ── Cost Configuration ─────────────────────────────────────────────────

export interface ProviderCostConfig {
  costPerInputToken: number;             // USD per token
  costPerOutputToken: number;
  estimatedCostPerCall: number;          // Rough average
}

// ── Orchestrator Options ───────────────────────────────────────────────

export interface OrchestratorOptions {
  taskType?: string;
  latencyBudget?: number;                // Max ms before trying next provider
  providerOverride?: string;             // Force specific provider
  maxCostPerCall?: number;               // USD guard
  shadowProvider?: string;               // Run secondary for comparison (no user impact)
}

// ── Telemetry ──────────────────────────────────────────────────────────

export interface AICallRecord {
  id: string;
  taskType: string;
  provider: string;
  model: string;
  capability: string;
  latencyMs: number;
  success: boolean;
  repairApplied: boolean;
  salvaged: boolean;
  errorClass?: string;
  inputTokens?: number;
  outputTokens?: number;
  isShadow: boolean;
  timestamp: number;
}

// ── Provider Config ────────────────────────────────────────────────────

export interface SingleProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  models?: string[];
  capabilities?: AIProviderCapability[];
  cost?: ProviderCostConfig;
  maxConcurrent?: number;                // Rate limiting
  timeoutMs?: number;
}

export interface AIProviderSystemConfig {
  multiProviderEnabled: boolean;
  providerPriorities: string[];
  defaultTimeout: number;
  providers: Record<string, SingleProviderConfig>;
  pipelineOverrides: Record<string, string[]>; // taskType → provider names
  shadowProvider?: string;                     // Run shadow calls against this provider
}
