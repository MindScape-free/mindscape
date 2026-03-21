
'use server';
/**
 * @fileOverview A flow to summarize a chat history into a short topic.
 *
 * - summarizeChat - A function that takes chat history and returns a topic.
 */

import {
  SummarizeChatInput,
  SummarizeChatOutput,
  SummarizeChatOutputSchema,
} from '@/ai/schemas/summarize-chat-schema';

import { generateContent, AIProvider } from '@/ai/client-dispatcher';

export async function summarizeChat(
  input: SummarizeChatInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<SummarizeChatOutput> {
  const { provider, apiKey, strict } = input;
  const historyText = input.history.map(h => `${h.role}: ${h.content}`).join('\n');
  const systemPrompt = `Based on the following conversation history, create a short, descriptive topic title (3-5 words).

  Example:
  - History: "User: Tell me about photosynthesis. Model: Photosynthesis is the process..." -> Topic: "The Process of Photosynthesis"
  - History: "User: I need ideas for a fantasy story. Model: How about a dragon..." -> Topic: "Fantasy Story Brainstorming"

  Conversation:
  ${historyText}

  Generate a concise topic title for this conversation. Return valid JSON { "topic": "Title" }`;

  const userPrompt = "Summarize the chat history into a JSON { topic: 'Title' } object.";
  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await generateContent({
        provider: provider,
        apiKey: apiKey,
        systemPrompt,
        userPrompt,
        schema: SummarizeChatOutputSchema,
        strict
      });

      return result;
    } catch (e: any) {
      lastError = e;
      console.error(`❌ Chat summarization attempt ${attempt} failed:`, e.message);
      if (attempt === maxAttempts) throw e;
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  throw lastError || new Error('Chat summarization failed');
}
