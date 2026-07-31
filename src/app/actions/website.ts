"use server";

import * as cheerio from "cheerio";
import { safeFetch } from "@/lib/ssrf-guard";
import { extractArticleFromHtml } from "@/lib/article-extractor";

export async function extractWebsiteContent(url: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // P0 SSRF: safeFetch validates the target AND every redirect hop via
    // DNS resolution + private-IP checks before fetching. This replaces the
    // previous hostname-pattern-only check, which was bypassable via
    // DNS rebinding or literal private IPs.
    const response = await safeFetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Failed to fetch website content");
    }

    const html = await response.text();

    if (html.length > 5 * 1024 * 1024) {
      throw new Error("Page content is too large");
    }

    const $ = cheerio.load(html);
    $('script, style, iframe, nav, footer').remove();
    const cleanedHtml = $.html();

    // Direct article extraction — no self-fetch to an internal HTTP endpoint
    // (removes the self-fetch SSRF/fragility vector entirely).
    const article = await extractArticleFromHtml(cleanedHtml, url);

    if (!article) {
      const title = $('title').text() || $('h1').first().text() || url;
      const textContent = $('body').text().replace(/\s+/g, ' ').trim();
      return {
        success: true,
        title,
        textContent: textContent.substring(0, 5000),
        excerpt: textContent.substring(0, 200),
        textBlocks: [],
        url: url,
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
      title: article.title || url,
      textContent: (article.textContent ?? '').trim(),
      excerpt: article.excerpt,
      textBlocks,
      url: url,
    };

  } catch (error: any) {
    console.error("Error extracting website content:", error);
    return {
      success: false,
      error: error.message || "An unknown error occurred while extracting content.",
    };
  }
}
