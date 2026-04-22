import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mindscape-free.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/profile/',
          '/canvas/loading',
          '/auth/',
          '/signup/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
