"use server";

import * as cheerio from "cheerio";
import { headers } from "next/headers";

/**
 * Extracts the main content from a website URL.
 * Includes security checks to prevent SSRF and excessive resource usage.
 * 
 * @param url The URL of the website to extract content from.
 * @returns An object containing the title, main content, and text blocks.
 */
export async function extractWebsiteContent(url: string) {
  try {
    // 1. URL Validation & Safety Checks
    const validatedUrl = new URL(url);
    if (!['http:', 'https:'].includes(validatedUrl.protocol)) {
      throw new Error("Invalid protocol. Only HTTP and HTTPS are supported.");
    }

    // SSRF Prevention: Block local/private IP ranges
    const hostname = validatedUrl.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    const isPrivateIp = /^(10\.|172\.(1[6-9]|2[0-9]|3[12])\.|192\.168\.)/.test(hostname);

    if (isLocalhost || isPrivateIp) {
      throw new Error("Access to local or private networks is restricted.");
    }

    // 2. Fetch HTML
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch website content: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      throw new Error("Only HTML pages are supported.");
    }

    const html = await response.text();

    // 3. Content Size Check
    if (html.length > 5 * 1024 * 1024) { // 5MB limit
      throw new Error("Page content is too large. Max size is 5MB.");
    }

    // 4. Parse & Clean HTML with Cheerio
    const $ = cheerio.load(html);
    
    // Remove scripts, styles, iframes, etc.
    $('script, style, iframe, nav, footer, ads, .ads, #ads').remove();

    const cleanedHtml = $.html();

    // 5. Extract Main Content via internal API (Node.js runtime required for JSDOM)
    let articleData = null;
    try {
      const headersList = await headers();
      const host = headersList.get("host") || 'localhost:3000';
      const protocol = headersList.get("x-forwarded-proto") || (process.env.NODE_ENV === "development" ? "http" : "https");
      
      const apiResponse = await fetch(`${protocol}://${host}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: cleanedHtml, url: validatedUrl.origin }),
      });

      if (apiResponse.ok) {
        articleData = await apiResponse.json();
      }
    } catch (apiErr) {
      console.warn("Internal API extraction failed, using basic fallback:", apiErr);
    }

    const article = articleData?.article;
    const error = articleData?.error;

    if (error || !article) {
      // Basic fallback if API fails
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

    // 6. Further Structure Extraction (Headings & Paragraphs)
    const textBlocks: { type: string; content: string; level?: number }[] = [];
    const $article = cheerio.load(article.content || '');

    $article('h1, h2, h3, h4, h5, h6, p, li').each((_, element) => {
      const tagName = element.tagName.toLowerCase();
      const content = $(element).text().trim();
      
      if (content) {
        if (tagName.startsWith('h')) {
          textBlocks.push({
            type: 'heading',
            content,
            level: parseInt(tagName.substring(1)),
          });
        } else if (tagName === 'p') {
          textBlocks.push({
            type: 'paragraph',
            content,
          });
        } else if (tagName === 'li') {
          textBlocks.push({
            type: 'list-item',
            content,
          });
        }
      }
    });

    return {
      success: true,
      title: article.title,
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
