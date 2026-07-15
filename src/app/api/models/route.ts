import { NextResponse } from 'next/server';

// In-memory cache
let pollinationsTextCache: any = null;
let pollinationsImageCache: any = null;
let pollinationsLastFetch = 0;

let openrouterTextCache: any = null;
let openrouterLastFetch = 0;

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'all'; // 'text' | 'image' | 'all'
  const provider = searchParams.get('provider') || 'pollinations'; // 'pollinations' | 'openrouter'

  const now = Date.now();

  if (provider === 'openrouter') {
    const isExpired = now - openrouterLastFetch > CACHE_TTL;
    if (isExpired || !openrouterTextCache) {
      try {
        console.log('🌐 Fetching latest models from OpenRouter...');
        const response = await fetch('https://openrouter.ai/api/v1/models');
        if (!response.ok) throw new Error(`OpenRouter returned ${response.status}`);
        
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          openrouterTextCache = data.data
            // OpenRouter models are mostly text models, filter out embedding/image generation if needed, but typically all are text/multimodal
            .map((m: any) => {
              const costPrompt = parseFloat(m.pricing?.prompt || '0');
              const costCompletion = parseFloat(m.pricing?.completion || '0');
              const isFree = costPrompt === 0 && costCompletion === 0;
              
              return {
                id: m.id,
                name: m.name || m.id,
                description: m.description || m.name || m.id,
                feature: m.context_length > 32000 ? 'reasoning' : 'creative',
                cost: costCompletion * 1000000, // Normalized to something displayable
                isFree
              };
            });
            // Let's sort them so free models or popular models are near the top, or just alphabetize
            openrouterTextCache.sort((a: any, b: any) => (a.isFree === b.isFree ? 0 : a.isFree ? -1 : 1));
        }
        openrouterLastFetch = now;
      } catch (error) {
        console.warn('⚠️ Failed to fetch OpenRouter models:', error);
      }
    }

    const headers = { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' };
    if (type === 'text' || type === 'all') {
      return NextResponse.json({ models: openrouterTextCache || [] }, { headers });
    }
    // OpenRouter doesn't have a specific image models list API that matches Pollinations structure for this app right now
    return NextResponse.json({ models: [] }, { headers });
  }

  // Pollinations logic
  const isExpired = now - pollinationsLastFetch > CACHE_TTL;
  if (isExpired || !pollinationsTextCache || !pollinationsImageCache) {
    try {
      console.log('🌐 Fetching latest models from Pollinations...');
      
      // Fetch unified models list
      const response = await fetch('https://gen.pollinations.ai/models');
      if (!response.ok) throw new Error(`Pollinations returned ${response.status}`);
      
      const allModelsRes = await response.json();

      if (Array.isArray(allModelsRes)) {
        // Process Text Models — text-capable
        pollinationsTextCache = allModelsRes
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
        pollinationsImageCache = allModelsRes
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

      pollinationsLastFetch = now;
    } catch (error) {
      console.warn('⚠️ Failed to fetch dynamic models, using stale cache or empty fallback:', error);
      // Don't throw — use stale cache if available, or let the route return empty arrays gracefully
    }
  }

  const headers = { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' };

  if (type === 'text') return NextResponse.json({ models: pollinationsTextCache }, { headers });
  if (type === 'image') return NextResponse.json({ models: pollinationsImageCache }, { headers });
  
  return NextResponse.json({ textModels: pollinationsTextCache, imageModels: pollinationsImageCache }, { headers });
}
