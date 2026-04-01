
'use server';

import {
  SummarizeChatInput,
  SummarizeChatOutput,
  SummarizeChatOutputSchema,
} from '@/ai/schemas/summarize-chat-schema';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';

const SYSTEM_GUARANTEES = `SYSTEM GUARANTEES:
- Output MUST be valid JSON (no markdown, no extra text)
- If invalid → internally self-correct before final output
- Do NOT explain, only generate`;

export async function summarizeChat(
  input: SummarizeChatInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<SummarizeChatOutput> {
  const { provider, apiKey, strict } = input;
  const historyText = input.history.map(h => `${h.role}: ${h.content}`).join('\n');

  const systemPrompt = `${SYSTEM_GUARANTEES}

Create a short, specific topic title (3–5 words) for this conversation.

RULES:
- Avoid generic titles like "Discussion about X", "Chat about X", "Conversation on X".
- Use the most specific concept discussed (e.g., "Photosynthesis Light Reactions" not "Biology Discussion").
- Capture the core subject, not the format.

Examples:
- "User: Tell me about photosynthesis..." → "Photosynthesis Light Reactions"
- "User: Fantasy story ideas..." → "Fantasy World Building"
- "User: How does React hooks work..." → "React Hooks Internals"

Conversation:
${historyText}

Return ONLY: { "topic": "Title" }`;

  const userPrompt = `Generate the title.`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await generateContent({ provider, apiKey, systemPrompt, userPrompt, schema: SummarizeChatOutputSchema, strict });
    } catch (e: any) {
      console.error(`❌ Chat summarization attempt ${attempt} failed:`, e.message);
      if (attempt === 2) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Chat summarization failed');
}
