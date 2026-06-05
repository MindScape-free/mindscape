import { NextResponse } from 'next/server';

// Fallback Text Models
const FALLBACK_TEXT_MODELS = [
  { id: 'openai', feature: 'creative', description: 'GPT-5 Mini', context: 128000, isFree: true },
  { id: 'openai-fast', feature: 'fast', description: 'GPT-5 Nano', context: 128000, isFree: true },
  { id: 'gemini-fast', feature: 'fast', description: 'Gemini Flash Lite 3.1', context: 32000, isFree: true },
  { id: 'gemini', feature: 'creative', description: 'Gemini 2.5 Flash', context: 32000, isFree: true },
  { id: 'claude-fast', feature: 'creative', description: 'Claude Haiku 4.5', context: 128000, isFree: true },
  { id: 'claude', feature: 'creative', description: 'Claude Sonnet 4.5', context: 200000, isFree: true },
  { id: 'deepseek', feature: 'reasoning', description: 'DeepSeek V3', context: 64000, isFree: true },
  { id: 'deepseek-pro', feature: 'reasoning', description: 'DeepSeek R2', context: 64000, isFree: true },
  { id: 'kimi', feature: 'reasoning', description: 'Kimi K2', context: 256000, isFree: true },
  { id: 'kimi-k2.6', feature: 'reasoning', description: 'Kimi K2.6', context: 256000, isFree: true },
  { id: 'mistral', feature: 'coding', description: 'Mistral Small 3.2', context: 32000, isFree: true },
  { id: 'mistral-large', feature: 'coding', description: 'Mistral Large 3.2', context: 128000, isFree: true },
  { id: 'qwen-coder', feature: 'coding', description: 'Qwen3 Coder 30B', context: 32000, isFree: true },
  { id: 'qwen-coder-large', feature: 'coding', description: 'Qwen3 Coder 235B', context: 32000, isFree: true },
  { id: 'grok', feature: 'creative', description: 'Grok 3 Mini', context: 128000, isFree: true },
  { id: 'llama', feature: 'creative', description: 'Llama 4 Maverick', context: 128000, isFree: true },
  { id: 'llama-scout', feature: 'fast', description: 'Llama 4 Scout', context: 128000, isFree: true },
  { id: 'nova-fast', feature: 'fast', description: 'Amazon Nova Micro', context: 32000, isFree: true },
  { id: 'nova', feature: 'creative', description: 'Amazon Nova Lite', context: 32000, isFree: true },
  { id: 'perplexity', feature: 'reasoning', description: 'Perplexity Sonar Pro', context: 32000, isFree: true },
  { id: 'perplexity-reasoning', feature: 'reasoning', description: 'Perplexity Sonar Reasoning', context: 32000, isFree: true },
  { id: 'gemini-search', feature: 'reasoning', description: 'Gemini 2.5 Flash + Search', context: 32000, isFree: true },
  { id: 'gemini-search-fast', feature: 'fast', description: 'Gemini Flash Lite + Search', context: 32000, isFree: true },
  { id: 'minimax', feature: 'creative', description: 'MiniMax M2.5', context: 32000, isFree: true },
  { id: 'minimax-m3', feature: 'creative', description: 'MiniMax M3', context: 32000, isFree: true },
  { id: 'step-flash', feature: 'fast', description: 'Step Flash', context: 32000, isFree: true },
  { id: 'step-3.5-flash', feature: 'fast', description: 'Step 3.5 Flash', context: 32000, isFree: true },
  { id: 'qwen-large', feature: 'reasoning', description: 'Qwen3 235B', context: 32000, isFree: true },
  { id: 'glm', feature: 'creative', description: 'GLM-4', context: 128000, isFree: true },
  { id: 'qwen-safety', feature: 'coding', description: 'Qwen3Guard 8B', context: 125000, isFree: true },
];

// Fallback Image Models
const FALLBACK_IMAGE_MODELS = [
  { id: 'nanobanana-2', cost: 0.001, quality: 'rapid', description: 'NanoBanana 2 - Ultra-fast generation', isFree: true },
  { id: 'nanobanana', cost: 0.001, quality: 'rapid', description: 'NanoBanana - Ultra-fast generation', isFree: true },
  { id: 'zimage', cost: 0.002, quality: 'high', description: 'Z-Image Turbo - Fast 6B Flux with 2x upscaling', isFree: true },
  { id: 'wan-image', cost: 0.005, quality: 'high', description: 'Wan Image - Multi-style generation', isFree: true },
  { id: 'flux', cost: 0.001, quality: 'high', description: 'Flux Schnell - High-speed generation', isFree: true },
  { id: 'klein', cost: 0.01, quality: 'high', description: 'FLUX.2 Klein 4B - Compact high-quality', isFree: true },
  { id: 'seedream', cost: 0.005, quality: 'high', description: 'SeeDream - High quality image gen', isFree: true },
  { id: 'gptimage', cost: 0.0105, quality: 'high', description: 'GPT Image 1 Mini', isFree: true },
  { id: 'qwen-image', cost: 0.03, quality: 'high', description: 'Qwen Image Plus - High-fidelity', isFree: true },
  { id: 'kontext', cost: 0.02, quality: 'ultra', description: 'Kontext - Context-aware image editing', isFree: true },
  { id: 'nova-canvas', cost: 0.01, quality: 'high', description: 'Amazon Nova Canvas', isFree: true },
  { id: 'p-image', cost: 0.01, quality: 'high', description: 'P-Image - Pollinations native model', isFree: true },
];

// In-memory cache
let textCache: any = null;
let imageCache: any = null;
let lastFetch = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'all'; // 'text' | 'image' | 'all'

  const now = Date.now();
  const isExpired = now - lastFetch > CACHE_TTL;

  if (isExpired || !textCache || !imageCache) {
    try {
      console.log('🌐 Fetching latest models from Pollinations...');
      
      // Fetch both simultaneously
      const [textRes, imageRes] = await Promise.all([
        fetch('https://gen.pollinations.ai/v1/models').then(r => r.json()),
        fetch('https://gen.pollinations.ai/image/models').then(r => r.json())
      ]);

      // Process Text Models — only non-paid, text-capable (allow multimodal models too)
      if (Array.isArray(textRes.data)) {
        textCache = textRes.data
          .filter((m: any) => !m.paid_only && m.output_modalities?.includes('text'))
          .map((m: any) => ({
            id: m.id,
            description: m.description || m.id,
            feature: m.reasoning ? 'reasoning' : m.tools ? 'creative' : 'fast',
            isFree: true
          }));
      }

      // Process Image Models — only image-output, non-paid
      if (Array.isArray(imageRes)) {
        imageCache = imageRes
          .filter((m: any) => !m.paid_only && m.output_modalities?.includes('image'))
          .map((m: any) => ({
            id: m.name,
            description: m.description || m.name,
            cost: parseFloat(m.pricing?.completionImageTokens ?? '0.04'),
            quality: 'high',
            isFree: true
          }));
      }

      lastFetch = now;
    } catch (error) {
      console.warn('⚠️ Failed to fetch dynamic models, using fallbacks');
      textCache = textCache || FALLBACK_TEXT_MODELS;
      imageCache = imageCache || FALLBACK_IMAGE_MODELS;
    }
  }

  // Ensure we have something
  const t = textCache || FALLBACK_TEXT_MODELS;
  const i = imageCache || FALLBACK_IMAGE_MODELS;

  const headers = { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' };

  if (type === 'text') return NextResponse.json({ models: t }, { headers });
  if (type === 'image') return NextResponse.json({ models: i }, { headers });
  
  return NextResponse.json({ textModels: t, imageModels: i }, { headers });
}
