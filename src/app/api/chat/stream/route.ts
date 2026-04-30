import { NextRequest, NextResponse } from 'next/server';
import { generateSearchContext } from '@/app/actions/generateSearchContext';
import { z } from 'zod';
import { OpenRouter } from '@openrouter/sdk';
import { createAgent } from '@/ai/agent';
import type { Tool } from '@openrouter/sdk/lib/tool-types.js';
import { EventEmitter } from 'eventemitter3';

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
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = ChatStreamInputSchema.parse(body);
    const { apiKey: effectiveApiKey, topic, persona, history, question, attachments, pdfContext, model: requestedModel, agentMode } = input;

    const apiKey = effectiveApiKey || process.env.POLLINATIONS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let searchBlock = `📅 Current Date: ${currentDate}`;

    try {
      const searchResult = await generateSearchContext({ query: question, depth: 'basic', apiKey, provider: 'pollinations' });
      if (searchResult.data && searchResult.data.sources.length > 0) {
        searchBlock += `\n\n🌐 Real-Time Web Info:\n${searchResult.data.summary}\nUse this to ground your response. Prefer search facts over training data.`;
      }
    } catch {
      // continue with date only
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
      basePrompt = `You are **MindSpark** ✨, an AI assistant in the MindScape mind mapping app.

🚀 LIVE ACCESS: You have real-time search results and current date. Never claim you cannot access current events.

🧠 Topic: ${topic}
${searchBlock}

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
- Use \`\`\`mermaid blocks for diagrams when explaining processes, algorithms, or complex systems.
- Use standard LaTeX for mathematical formulas (wrap in \( ... \) for inline or \[ ... \] for display).
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
          if (agentMode) {
            const { createAgent } = await import('@/ai/agent');
            const { defaultTools } = await import('@/ai/tools');
            
            const agent = createAgent({
              apiKey,
              model: requestedModel || 'openrouter/auto',
              instructions: systemPrompt,
              tools: defaultTools,
            });

            if (history) {
              agent.setMessages(history as any);
            }

            // Hook into agent events and enqueue to stream
            agent.on('stream:delta', (delta) => {
              controller.enqueue(encoder.encode(`T:${delta}`));
            });

            agent.on('reasoning:update', (text) => {
              // We only want the delta or the full text? 
              // Agent class reasoning:update seems to give full text so far.
              // Let's send it as R:full_text
              controller.enqueue(encoder.encode(`R:${text}`));
            });

            agent.on('tool:call', (name, args) => {
              controller.enqueue(encoder.encode(`C:${JSON.stringify({ name, args })}`));
            });

            agent.on('tool:result', (callId, result) => {
              controller.enqueue(encoder.encode(`O:${JSON.stringify({ callId, result })}`));
            });

            await agent.send(question);
            controller.close();
            return;
          }

          const { orchestrateStream } = await import('@/ai/providers/orchestrator');

          await orchestrateStream(
            {
              systemPrompt,
              userPrompt,
              images: images && images.length > 0 ? images : undefined,
              capability: 'creative',
              model: requestedModel || undefined,
              apiKey,
              stream: true,
            },
            (chunk) => {
              if (chunk.text) {
                // For non-agent mode, we just send raw text to maintain backward compatibility
                controller.enqueue(encoder.encode(chunk.text));
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

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
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
