"use server";

import * as cheerio from "cheerio";
import { safeFetch } from "@/lib/ssrf-guard";
import { extractArticleFromHtml } from "@/lib/article-extractor";

export async function extractWebsiteContent(url: string) {
  if (!url || typeof url !== 'string') {
    return {
      success: false,
      error: "URL is required.",
    };
  }

  // 1. Normalize protocol scheme if missing
  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://${targetUrl}`;
  }

  try {
    // Tier 1: Try Jina Reader API (handles anti-bot protection & JS rendering)
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${targetUrl}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      });

      if (jinaRes.ok) {
        const jinaData = await jinaRes.json();
        const content = jinaData.data?.content || jinaData.data?.description || '';
        const title = jinaData.data?.title || targetUrl;

        if (content.trim().length > 50) {
          return {
            success: true,
            title,
            textContent: content.trim().substring(0, 20000),
            excerpt: content.trim().substring(0, 200),
            textBlocks: [],
            url: targetUrl,
          };
        }
      }
    } catch (jinaErr) {
      console.warn(`⚠️ [Jina Reader] Extraction failed for ${targetUrl}, falling back to direct fetch:`, jinaErr);
    }

    // Tier 2: Direct SSRF-guarded fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await safeFetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Website returned HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    if (html.length > 5 * 1024 * 1024) {
      throw new Error("Page content is too large");
    }

    const $ = cheerio.load(html);
    $('script, style, iframe, nav, footer, noscript').remove();
    const cleanedHtml = $.html();

    const article = await extractArticleFromHtml(cleanedHtml, targetUrl);

    if (!article || !article.textContent) {
      const title = $('title').text() || $('h1').first().text() || targetUrl;
      const textContent = $('body').text().replace(/\s+/g, ' ').trim();
      return {
        success: true,
        title,
        textContent: textContent.substring(0, 5000) || `Content for ${targetUrl}`,
        excerpt: textContent.substring(0, 200),
        textBlocks: [],
        url: targetUrl,
        isFallback: true
      };
    }

    const textBlocks: { type: string; content: string; level?: number }[] = [];
    const $article = cheerio.load(article.content || '');

    $article('h1, h2, h3, h4, h5, h6, p, li').each((_: any, element: any) => {
      const tagName = element.tagName.toLowerCase();
      const content = $(element).text().trim();
      if (content) {
        if (tagName.startsWith('h')) {
          textBlocks.push({ type: 'heading', content, level: parseInt(tagName.substring(1)) });
        } else if (tagName === 'p') {
          textBlocks.push({ type: 'paragraph', content });
        } else if (tagName === 'li') {
          textBlocks.push({ type: 'list-item', content });
        }
      }
    });

    return {
      success: true,
      title: article.title || targetUrl,
      textContent: (article.textContent ?? '').trim(),
      excerpt: article.excerpt,
      textBlocks,
      url: targetUrl,
    };

  } catch (error: any) {
    console.error("Error extracting website content:", error);
    // Tier 3: Return graceful title-only context instead of crashing the flow
    const domain = targetUrl.replace(/https?:\/\//, '').split('/')[0];
    return {
      success: true,
      title: domain || targetUrl,
      textContent: `Explore key topics and insights about ${targetUrl}.`,
      excerpt: `Website content preview for ${targetUrl}`,
      textBlocks: [],
      url: targetUrl,
      isFallback: true,
    };
  }
}
