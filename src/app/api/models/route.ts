import { NextResponse } from 'next/server';

// Fallback Text Models
const FALLBACK_TEXT_MODELS = [
  { id: 'openai', feature: 'creative', description: 'OpenAI GPT-4o Mini', context: 128000, isFree: true },
  { id: 'mistral', feature: 'coding', description: 'Mistral Small 3.2 24B', context: 32000, isFree: true },
  { id: 'deepseek', feature: 'reasoning', description: 'DeepSeek V3.2', context: 64000, isFree: true },
  { id: 'qwen-coder', feature: 'coding', description: 'Qwen 2.5 Coder 32B', context: 32000, isFree: true },
  { id: 'gemini-fast', feature: 'fast', description: 'Google Gemini 2.0 Flash Lite', context: 32000, isFree: true },
];

// Fallback Image Models
const FALLBACK_IMAGE_MODELS = [
  { id: 'flux', quality: 'high', description: 'Flux Schnell - High-speed high-quality generation', isFree: true },
  { id: 'qwen-image', quality: 'high', description: 'Qwen Image Plus - High-fidelity visual synthesis', isFree: true },
  { id: 'zimage', quality: 'high', description: 'Z-Image Turbo - Fast 6B Flux Upgraded', isFree: true },
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

      // Process Text Models
      if (Array.isArray(textRes.data)) {
        textCache = textRes.data
          .filter((m: any) => !m.paid_only)
          .map((m: any) => ({
            id: m.id,
            description: m.description || m.id,
            feature: m.modality === 'text' ? 'creative' : 'specialized',
            isFree: true
          }));
      }

      // Process Image Models
      if (Array.isArray(imageRes)) {
        imageCache = imageRes
          .filter((m: any) => !m.paid_only)
          .map((m: any) => ({
            id: m.name,
            description: m.description || m.name,
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

  if (type === 'text') return NextResponse.json({ models: t });
  if (type === 'image') return NextResponse.json({ models: i });
  
  return NextResponse.json({ textModels: t, imageModels: i });
}
