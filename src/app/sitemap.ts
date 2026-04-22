import { MetadataRoute } from 'next';
import { getSupabaseClient } from '@/lib/supabase-db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mindscape-free.vercel.app';
  const supabase = getSupabaseClient();

  // Static routes
  const staticRoutes = [
    '',
    '/about',
    '/community',
    '/library',
    '/changelog',
    '/feedback',
    '/use-cases/ai-mind-map-generator',
    '/use-cases/visual-learning-tool',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Dynamic routes (Public Maps)
  try {
    const { data: publicMaps } = await supabase
      .from('public_mindmaps')
      .select('id, updated_at')
      .limit(100); // Index the top 100 most recent public maps

    if (publicMaps) {
      const mapRoutes = publicMaps.map((map) => ({
        url: `${baseUrl}/canvas?publicMapId=${map.id}`,
        lastModified: new Date(map.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
      return [...staticRoutes, ...mapRoutes];
    }
  } catch (error) {
    console.error('Error generating sitemap for public maps:', error);
  }

  return staticRoutes;
}
