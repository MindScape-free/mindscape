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
  const isExpired = now - lastFetch > CACHE_TTL;    if (isExpired || !textCache || !imageCache) {
    try {
      console.log('🌐 Fetching latest models from Pollinations...');
      
      // Fetch unified models list
      const response = await fetch('https://gen.pollinations.ai/models');
      if (!response.ok) throw new Error(`Pollinations returned ${response.status}`);
      
      const allModelsRes = await response.json();

      if (Array.isArray(allModelsRes)) {
        // Process Text Models — text-capable
        textCache = allModelsRes
          .filter((m: any) => m.output_modalities?.includes('text') && m.category === 'text')
          .map((m: any) => {
            const cost = m.pricing?.completionTextTokens ? parseFloat(m.pricing.completionTextTokens) : 0;
            // Free text models are explicitly not paid AND have a cost <= 0.000001 pollen
            const isFree = m.paid_only === true ? false : (cost === 0 || cost <= 0.000001);
            
            return {
              id: m.name,
              name: m.title || m.name,
              description: m.description || m.name,
              feature: m.reasoning ? 'reasoning' : m.tools ? 'creative' : 'fast',
              cost,
              isFree
            };
          });

        // Process Image Models — only image-output
        imageCache = allModelsRes
          .filter((m: any) => m.output_modalities?.includes('image') && m.category === 'image')
          .map((m: any) => {
            const cost = m.pricing?.completionImageTokens ? parseFloat(m.pricing.completionImageTokens) : 0.04;
            // Free image models are explicitly not paid AND have a cost < 0.005 pollen
            const isFree = m.paid_only === true ? false : (cost < 0.005);

            return {
              id: m.name,
              name: m.title || m.name,
              description: m.description || m.name,
              cost,
              quality: 'high',
              isFree
            };
          });
      }

      lastFetch = now;
    } catch (error) {
      console.warn('⚠️ Failed to fetch dynamic models, using stale cache or empty fallback:', error);
      // Don't throw — use stale cache if available, or let the route return empty arrays gracefully
    }
  }

  const headers = { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' };

  if (type === 'text') return NextResponse.json({ models: textCache }, { headers });
  if (type === 'image') return NextResponse.json({ models: imageCache }, { headers });
  
  return NextResponse.json({ textModels: textCache, imageModels: imageCache }, { headers });
}
