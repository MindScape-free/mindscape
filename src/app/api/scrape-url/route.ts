import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, createRateLimitResponse, getClientIdentifier } from '@/lib/rate-limit';

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^224\./,
  /^240\./,
  /^localhost$/i,
  /^metadata$/i,
];

const BLOCKED_HOSTNAMES = [
  'metadata.google',
  'metadata.internal',
  '169.254.169.254',
  'metadata.aws',
];

function isPrivateIp(hostname: string): boolean {
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(hostname));
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return BLOCKED_HOSTNAMES.some(blocked => lower === blocked || lower.endsWith(`.${blocked}`));
}

function validateUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }
    
    const hostname = url.hostname.toLowerCase();
    
    if (isPrivateIp(hostname)) {
      return { valid: false, error: 'Access to private IPs is not allowed' };
    }
    
    if (isBlockedHostname(hostname)) {
      return { valid: false, error: 'Access to metadata services is not allowed' };
    }
    
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return { valid: false, error: 'Direct IP addresses are not allowed' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

export async function POST(req: NextRequest) {
  const clientId = getClientIdentifier(req);
  const rateLimitResult = rateLimit(clientId, 'scrape');
  
  const rateLimitResponse = createRateLimitResponse(rateLimitResult);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const validation = validateUrl(url);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // --- YouTube Support ---
    const isYouTube = url.includes('youtube.com/') || url.includes('youtu.be/');
    if (isYouTube) {
      try {
        const { getVideoId } = await import('@/utils/youtube/extract-id');
        const { fetchTranscript, getVideoMetadata } = await import('@/utils/youtube/transcript');
        const videoId = getVideoId(url);
        if (videoId) {
          const [transcript, metadata] = await Promise.all([
            fetchTranscript(videoId).catch(() => null),
            getVideoMetadata(videoId).catch(() => null)
          ]);
          
          if (transcript || (metadata && metadata.description)) {
            return NextResponse.json({
              title: metadata?.title || 'YouTube Video',
              content: transcript ? `[TRANSCRIPT]\n${transcript}` : `[DESCRIPTION]\n${metadata?.description}`,
              sourceType: 'youtube'
            });
          }
        }
      } catch (err) {
        console.warn('⚠️ YouTube specific scraping failed, falling back to general scrape:', err);
      }
    }

    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      console.warn(`⚠️ Jina.ai extraction failed for ${url}, falling back to internal extractor.`);
      try {
        const basicRes = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          }
        });
        
        if (!basicRes.ok) throw new Error(`Basic fetch failed: ${basicRes.statusText}`);
        
        const html = await basicRes.text();
        
        // Call our internal extraction API
        const host = req.headers.get("host");
        const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
        const extractRes = await fetch(`${protocol}://${host}/api/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html, url }),
        });

        if (extractRes.ok) {
          const { article } = await extractRes.json();
          if (article && article.textContent) {
            return NextResponse.json({
              title: article.title || url,
              content: article.textContent.trim(),
              isFallback: true
            });
          }
        }

        // Final fallback if internal extraction also fails
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : url;
        return NextResponse.json({ 
          title, 
          content: "Detailed extraction failed. Using page title as context.",
          isFallback: true
        });
      } catch (err: any) {
        return NextResponse.json({ 
          title: url, 
          content: `Extraction failed: ${err.message}. Please try a different URL.`,
          isFallback: true
        });
      }
    }

    const data = await res.json();
    return NextResponse.json({ 
      title: data.data?.title || url, 
      content: data.data?.content || "No content extracted." 
    });

  } catch (error: any) {
    console.error('Scraping error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
