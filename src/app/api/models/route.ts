import { NextResponse } from 'next/server';

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
      console.warn('⚠️ Failed to fetch dynamic models');
      throw error;
    }
  }

  const headers = { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' };

  if (type === 'text') return NextResponse.json({ models: textCache }, { headers });
  if (type === 'image') return NextResponse.json({ models: imageCache }, { headers });
  
  return NextResponse.json({ textModels: textCache, imageModels: imageCache }, { headers });
}
