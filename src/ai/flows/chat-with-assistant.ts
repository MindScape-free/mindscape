
'use server';

import { z } from 'zod';
import { generateSearchContext } from '@/app/actions/generateSearchContext';
import { mindscapeMap } from '@/lib/mindscape-data';

const ChatWithAssistantInputSchema = z.object({
  question: z.string(),
  topic: z.string(),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional(),
  persona: z.enum(['Teacher', 'Concise', 'Creative', 'Sage']).optional().default('Teacher'),
  attachments: z.array(z.object({ type: z.enum(['text', 'pdf', 'image']), name: z.string(), content: z.string() })).optional(),
  pdfContext: z.object({ summary: z.string(), concepts: z.array(z.object({ title: z.string(), description: z.string() })) }).optional(),
  usePdfContext: z.boolean().optional(),
  sessionId: z.string().optional(),
});
export type ChatWithAssistantInput = z.infer<typeof ChatWithAssistantInputSchema>;

const ChatWithAssistantOutputSchema = z.object({ answer: z.string() });
export type ChatWithAssistantOutput = z.infer<typeof ChatWithAssistantOutputSchema>;

import { generateContent, AIProvider } from '@/ai/client-dispatcher';

const SYSTEM_GUARANTEES = `SYSTEM GUARANTEES:
- Output MUST be valid JSON (no markdown, no extra text)
- If invalid → internally self-correct before final output
- Do NOT explain, only generate

PRIORITY ORDER:
1. JSON schema correctness
2. Factual accuracy
3. Completeness
4. Brevity
5. Style/persona

CONFLICT RESOLVER: If instructions conflict → schema > brevity > ignore style`;

export async function chatWithAssistant(
  input: ChatWithAssistantInput & { apiKey?: string; provider?: AIProvider }
): Promise<ChatWithAssistantOutput> {
  const { provider, apiKey, topic, persona, history, question, attachments, pdfContext } = input;

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  let searchBlock = `📅 Current Date: ${currentDate}`;

  try {
    const searchResult = await generateSearchContext({ query: question, depth: 'basic', apiKey, provider });
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

## MindScape Feature Map (Source of Truth)
${JSON.stringify(mindscapeMap, null, 2)}

## Navigation
- Toolbar: floating bar at top (Practice, Challenge, Summary, etc.)
- Navbar: top bar (Home, Library, Community)
- Home Page: landing page for generating maps
- Deep Dive: network icon or node menu action

## Rules
1. Be specific: "Click the Practice button in the Toolbar" not "use practice mode".
2. Reference the Feature Map above.
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

  const systemPrompt = `${SYSTEM_GUARANTEES}

${basePrompt}

${!isUserGuideMode ? `PERSONA: ${persona}` : ''}
${historyText ? `CHAT HISTORY:\n${historyText}` : ''}

USER QUESTION: "${question}"

---

RESPONSE RULES:
- Use Markdown formatting (bullets, bold, tables for comparisons).
- Start with a brief intro.
- NO HALLUCINATION: If unsure → say "Not in current context" rather than guessing.
- DO NOT include any URLs, links, or web addresses in your response.
${!isUserGuideMode ? `- Adjust style for persona: ${persona}` : ''}

Return ONLY this JSON:
{
  "answer": "Your formatted markdown response here"
}`;

  const userPrompt = `Provide your response.`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const images = attachments?.filter(a => a.type === 'image').map(a => {
        const base64Data = a.content.split(',')[1] || a.content;
        const mimeMatch = a.content.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
        return { inlineData: { mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg', data: base64Data } };
      });

      return await generateContent({
        provider, apiKey, systemPrompt, userPrompt,
        images: images && images.length > 0 ? images : undefined,
        schema: ChatWithAssistantOutputSchema,
      });
    } catch (e: any) {
      console.error(`❌ Chat attempt ${attempt} failed:`, e.message);
      if (attempt === 2) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Chat generation failed');
}
