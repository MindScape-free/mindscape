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

    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
       const basicRes = await fetch(url);
       const html = await basicRes.text();
       const titleMatch = html.match(/<title>(.*?)<\/title>/i);
       const title = titleMatch ? titleMatch[1] : url;
       return NextResponse.json({ 
        title, 
        content: "Content extraction failed. Using page title as context." 
      });
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
