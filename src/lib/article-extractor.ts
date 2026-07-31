/**
 * Shared server-side article extraction (JSDOM + Readability).
 *
 * Centralizes the ESM-only dynamic imports so server actions and route
 * handlers can reuse one implementation instead of self-fetching an
 * internal HTTP endpoint (a self-fetch fragility/SSRF vector).
 */

export interface ExtractedArticle {
  title: string | null;
  byline: string | null;
  dir: string | null;
  content: string | null;
  textContent: string | null;
  length: number | null;
  excerpt: string | null;
  siteName: string | null;
  publishedTime: string | null;
}

export async function extractArticleFromHtml(
  html: string,
  url?: string
): Promise<ExtractedArticle | null> {
  try {
    const { JSDOM } = await import('jsdom');
    const { Readability } = await import('@mozilla/readability');

    const dom = new JSDOM(html, url ? { url } : undefined);
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) return null;

    return {
      title: article.title ?? null,
      byline: article.byline ?? null,
      dir: article.dir ?? null,
      content: article.content ?? null,
      textContent: article.textContent ?? null,
      length: article.length ?? null,
      excerpt: article.excerpt ?? null,
      siteName: article.siteName ?? null,
      publishedTime: article.publishedTime ?? null,
    };
  } catch (err) {
    console.error('[article-extractor] Extraction failed:', err);
    return null;
  }
}
