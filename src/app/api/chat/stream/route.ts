import { NextRequest, NextResponse } from 'next/server';
import { executeGoogleSearch } from '@/ai/search/google-search';
import { normalizeSearchResults, filterAuthoritativeSources } from '@/ai/search/search-normalizer';
import { SearchRequestSchema } from '@/ai/search/search-schema';
import { z } from 'zod';
import { orchestrateStream } from '@/ai/providers/orchestrator';
import { rateLimit, createRateLimitResponse } from '@/lib/rate-limit';
import { getEnv } from '@/lib/env';

const ChatStreamInputSchema = z.object({
  question: z.string(),
  topic: z.string().optional().default('General Conversation'),
  history: z.array(z.object({ 
    role: z.enum(['user', 'assistant', 'ai', 'system']), 
    content: z.string() 
  })).optional(),
  persona: z.string().optional().default('Teacher'),
  attachments: z.array(z.any()).optional(),
  pdfContext: z.object({ 
    summary: z.string(), 
    concepts: z.array(z.object({ title: z.string(), description: z.string() })) 
  }).optional(),
  usePdfContext: z.boolean().optional(),
  sessionId: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  agentMode: z.boolean().optional().default(false),
  mindMapData: z.any().optional(),
});

export async function POST(req: NextRequest) {
  console.log('🚀 [ChatStream] POST request received');
  const startTime = Date.now();
  
  try {
    const body = await req.json();
    console.log('📦 [ChatStream] Request body parsed');
    const input = ChatStreamInputSchema.parse(body);
    console.log('✅ [ChatStream] Input validated');
    const { apiKey: effectiveApiKey, topic, persona, history, question, attachments, pdfContext, model: requestedModel, agentMode, mindMapData } = input;

    // Authenticate user
    let currentUserId: string | undefined;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase-server');
        const supabase = getSupabaseAdmin();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
          return NextResponse.json({ error: 'Invalid or expired authentication token.' }, { status: 401 });
        }
        currentUserId = user.id;

        // Rate limit by authenticated user ID (after auth to prevent token consumption by unauthenticated requests)
        const rateLimitResult = rateLimit(currentUserId, 'chat');
        const rateLimitResponse = createRateLimitResponse(rateLimitResult);
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
        const { trackChat } = await import('@/lib/tracker');
        await trackChat(supabase, user.id).catch(() => {});
      } catch (err) {
        console.warn('[ChatStream] Auth verification error:', err);
        return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Authorization header required.' }, { status: 401 });
    }

    // Ensure we have at least some API key to work with (user provided or system default)
    if (!effectiveApiKey && !process.env.POLLINATIONS_API_KEY) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const searchApiKey = effectiveApiKey || process.env.POLLINATIONS_API_KEY;

    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let searchBlock = `📅 Current Date: ${currentDate}`;

    try {
      console.log('🔍 [ChatStream] Executing search context...');
      const validatedSearchParams = SearchRequestSchema.parse({
        query: question,
        depth: 'basic',
        maxResults: 5,
      });

      const rawResults = await executeGoogleSearch({
        ...validatedSearchParams,
        apiKey: searchApiKey as string,
      });

      const searchContext = normalizeSearchResults(rawResults, validatedSearchParams.query);
      if (searchContext.sources.length > 0) {
        const filteredSources = filterAuthoritativeSources(searchContext.sources);
        searchBlock += `\n\n🌐 Real-Time Web Info:\n${searchContext.summary}\nUse this to ground your response. Prefer search facts over training data.`;
        console.log(`✅ [ChatStream] Search context found: ${filteredSources.length} sources`);
      }
    } catch (err) {
      console.warn('[ChatStream] Search context failed (skipping):', err);
    }

    const historyText = history?.map(h => `${h.role}: ${h.content}`).join('\n') || '';
    const isUserGuideMode = topic.toLowerCase() === 'mindscape';

    let basePrompt = '';

    if (isUserGuideMode) {
      basePrompt = `You are **MindMap AI** 🧠, the official interactive User Guide for MindScape.

## Core Features
- Canvas: Interactive mind map visualization with accordion and radial views
- Toolbar: Practice (Quiz), Summary, Data View, Nested Maps, Image Gallery, Share, Save, Publish
- Navbar: Home, About, Library, Community, Feedback
- AI Chat: Contextual assistant with multiple personas (Teacher, Concise, Creative, Sage)
- File Support: PDF, images, text files, YouTube videos, websites
- Export: PDF export, image generation, public sharing

## Navigation
- Toolbar: floating bar at top (Practice, Challenge, Summary, etc.)
- Navbar: top bar (Home, Library, Community)
- Home Page: landing page for generating maps
- Deep Dive: network icon or node menu action

## Rules
1. Be specific: "Click the Practice button in the Toolbar" not "use practice mode".
2. Reference the Core Features above when answering.
3. Tone: expert, helpful, concise.`;
    } else {
      // Build a compact structural overview of the mind map canvas
      let mindMapBlock = '';
      if (mindMapData) {
        try {
          const mm = typeof mindMapData === 'string' ? JSON.parse(mindMapData) : mindMapData;
          const mapParts: string[] = [`📋 CANVAS MIND MAP STRUCTURE: "${mm.topic || topic}"`];

          if (mm.mode === 'compare' && mm.compareData) {
            const cd = mm.compareData;
            mapParts.push(`Mode: Comparison (${cd.root?.title || 'A vs B'})`);
            if (cd.dimensions?.length) {
              mapParts.push('Dimensions:');
              cd.dimensions.forEach((d: any) => mapParts.push(`  - ${d.name}`));
            }
            if (cd.unityNexus?.length) {
              mapParts.push('Shared Core:');
              cd.unityNexus.forEach((n: any) => mapParts.push(`  - ${n.title}: ${n.description || ''}`));
            }
            if (cd.synthesisHorizon) {
              mapParts.push(`Synthesis: ${cd.synthesisHorizon.expertVerdict}`);
            }
          } else if (mm.subTopics?.length) {
            const subTopicList = mm.subTopics.slice(0, 15).map((st: any) => {
              const catNames = (st.categories || []).slice(0, 8).map((c: any) => c.name).join(', ');
              const leafCount = (st.categories || []).reduce((sum: number, c: any) => sum + (c.subCategories?.length || 0), 0);
              return `  - ${st.name} (${st.categories?.length || 0} categories, ${leafCount} items)${catNames ? ': ' + catNames : ''}`;
            });
            mapParts.push(`Sub-Topics (${mm.subTopics.length} total):`);
            mapParts.push(...subTopicList);
          }

          if (mm.explanations && Object.keys(mm.explanations).length > 0) {
            mapParts.push(`Explanations available for: ${Object.keys(mm.explanations).slice(0, 10).join(', ')}`);
          }
          if (mm.nestedExpansions?.length) {
            mapParts.push(`Nested Sub-Maps: ${mm.nestedExpansions.map((e: any) => e.topic).join(', ')}`);
          }
          if (mm.sourceType) {
            mapParts.push(`Source: ${mm.sourceType}`);
          }

          mindMapBlock = `\n\n${mapParts.join('\n')}\n\n**CONTEXT RULE**: When answering, anchor your response within this mind map structure. Mention specific nodes, categories, or relationships from the map that are relevant to the user's question. If the user asks about a specific node, explain how it connects to other parts of the map.`;
        } catch (e) {
          console.warn('[ChatStream] Failed to parse mindMapData:', e);
        }
      }

      basePrompt = `You are **MindSpark** ✨, an AI assistant in the MindScape mind mapping app.

🚀 LIVE ACCESS: You have real-time search results and current date. Never claim you cannot access current events.

🧠 Topic: ${topic}
${searchBlock}
${mindMapBlock}

${pdfContext ? `📄 DOCUMENT-AWARE MODE:
- PRIORITY: Use document context to answer questions about the topic.
- If question is covered in the PDF → base answer on it.
- Mention "According to the document..." when relevant.

Document Summary: ${pdfContext.summary}

Key Concepts:
${pdfContext.concepts.map(c => `- **${c.title}**: ${c.description}`).join('\n')}` : ''}

${attachments && attachments.length > 0 ? `📎 Attached Files:
${attachments.filter(a => a.type !== 'image').map(a => `--- ${a.name} (${a.type}) ---\n${a.content}\n---`).join('\n\n')}
Reference attached file content in your response.` : ''}`;
    }

    const systemPrompt = `${basePrompt}

${!isUserGuideMode ? `PERSONA: ${persona}` : ''}

${historyText ? `## CONVERSATION HISTORY (Read carefully for context)
${historyText}
---` : ''}

## CURRENT QUESTION
"${question}"

---

## RESPONSE REQUIREMENTS
- Use Markdown formatting (bullets, bold, tables for comparisons).
- Use standard LaTeX for mathematical formulas (wrap in $...$ for inline or $$...$$ for display).
- **Use [[Topic Name]] syntax for key entities, concepts, or terms that the user might want to explore further in a mind map.**
- Provide YouTube links or direct image URLs when a visual reference would significantly enhance the explanation.
- Start with a brief intro.
- Maintain conversation continuity - refer to previous exchanges when relevant.
- NO HALLUCINATION: If unsure → say "Not in current context" rather than guessing.
- Answer directly without asking clarifying questions unless absolutely necessary.
${!isUserGuideMode ? `- Adjust style for persona: ${persona}` : ''}

Provide your response as plain text (no JSON wrapper). Stream the response word by word.`;

    const userPrompt = `Provide your response.`;

    // Extract image attachments for the orchestrator
    const images = attachments?.filter(a => a.type === 'image').map(a => {
      const base64Data = a.content.split(',')[1] || a.content;
      const mimeMatch = a.content.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
      return { inlineData: { mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg', data: base64Data } };
    });

    // Create streaming response via orchestrator
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {


          console.log('🌊 [ChatStream] Starting Orchestrator mode...');

          const { aiProviderTimeout } = getEnv();

          await orchestrateStream(
            {
              systemPrompt,
              userPrompt,
              images: images && images.length > 0 ? images : undefined,
              capability: 'creative',
              model: requestedModel || undefined,
              apiKey: effectiveApiKey,
              stream: true,
              timeout: aiProviderTimeout,
            },
            (chunk) => {
              if (chunk.reasoning) {
                controller.enqueue(encoder.encode(`R:${chunk.reasoning}`));
              }
              if (chunk.text) {
                // For Phase 3 consistency, we now use T: prefix for all chat text
                controller.enqueue(encoder.encode(`T:${chunk.text}`));
              }
              if (chunk.done) {
                controller.close();
                return;
              }
            },
            { taskType: 'chat-stream' }
          );

          // Ensure stream is closed if orchestrateStream resolves without emitting done
          try { controller.close(); } catch { /* already closed */ }
        } catch (error: any) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`[ERROR] ${error.message || 'Stream failed'}`));
          try { controller.close(); } catch { /* already closed */ }
        }
      }
    });

    console.log(`✨ [ChatStream] Stream response ready (init took ${Date.now() - startTime}ms)`);
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Chat stream error:', error);
    return NextResponse.json(
      { error: error.message || 'Stream initialization failed' },
      { status: 500 }
    );
  }
}
