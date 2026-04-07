import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { html, url } = await req.json();

    if (!html) {
      return NextResponse.json({ error: "Missing HTML content" }, { status: 400 });
    }

    // Dynamic imports to avoid ESM/Next.js runtime issues in Server Components
    const { JSDOM } = await import("jsdom");
    const { Readability } = await import("@mozilla/readability");

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    return NextResponse.json({ article });
  } catch (error: any) {
    console.error("Extraction API Error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to extract content",
      article: null 
    }, { status: 500 });
  }
}
