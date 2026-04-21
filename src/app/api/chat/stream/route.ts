import { NextRequest, NextResponse } from 'next/server';
import { generateSearchContext } from '@/app/actions/generateSearchContext';
import { z } from 'zod';

const ChatStreamInputSchema = z.object({
  question: z.string(),
  topic: z.string(),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional(),
  persona: z.enum(['Teacher', 'Concise', 'Creative', 'Sage']).optional().default('Teacher'),
  attachments: z.array(z.object({ type: z.enum(['text', 'pdf', 'image']), name: z.string(), content: z.string() })).optional(),
  pdfContext: z.object({ summary: z.string(), concepts: z.array(z.object({ title: z.string(), description: z.string() })) }).optional(),
  usePdfContext: z.boolean().optional(),
  sessionId: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = ChatStreamInputSchema.parse(body);
    const { apiKey: effectiveApiKey, topic, persona, history, question, attachments, pdfContext, model: requestedModel } = input;

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
- Start with a brief intro.
- Maintain conversation continuity - refer to previous exchanges when relevant.
- NO HALLUCINATION: If unsure → say "Not in current context" rather than guessing.
- DO NOT include any URLs, links, or web addresses in your response.
- Answer directly without asking clarifying questions unless absolutely necessary.
${!isUserGuideMode ? `- Adjust style for persona: ${persona}` : ''}

Provide your response as plain text (no JSON wrapper). Stream the response word by word.`;

    const userPrompt = `Provide your response.`;

    // Build messages for streaming
    const images = attachments?.filter(a => a.type === 'image').map(a => {
      const base64Data = a.content.split(',')[1] || a.content;
      const mimeMatch = a.content.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
      return { inlineData: { mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg', data: base64Data } };
    });

    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    let userContent: any;
    if (images && images.length > 0) {
      userContent = [{ type: 'text', text: userPrompt }];
      images.forEach(img => {
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`
          }
        });
      });
    } else {
      userContent = userPrompt;
    }

    messages.push({ role: 'user', content: userContent });

    // Create streaming response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              messages,
              model: requestedModel || 'openai',
              stream: true,
              max_tokens: 8192,
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            controller.enqueue(encoder.encode(`[ERROR] ${response.status}: ${errorText}`));
            controller.close();
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            controller.enqueue(encoder.encode('[ERROR] No response body'));
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            
            // Process SSE lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') {
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }

          controller.close();
        } catch (error: any) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`[ERROR] ${error.message || 'Stream failed'}`));
          controller.close();
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
