import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Use a public proxy or simple fetch + basic regex for title
    // In a real app, use a dedicated scraping service like Jina or Firecrawl
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
       // Fallback to basic fetch if Jina fails
       const basicRes = await fetch(url);
       const html = await basicRes.text();
       const titleMatch = html.match(/<title>(.*?)<\/title>/i);
       const title = titleMatch ? titleMatch[1] : url;
       return NextResponse.json({ title, content: "Content extraction failed. Using page title as context." });
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
