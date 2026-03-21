
'use server';

/**
 * @fileOverview A conversational AI assistant for answering user questions.
 *
 * - chatWithAssistant - A function that handles the chat conversation.
 * - ChatWithAssistantInput - The input type for the chatWithAssistant function.
 * - ChatWithAssistantOutput - The return type for the chatWithAssistant function.
 */

import { z } from 'zod';
import { generateSearchContext } from '@/app/actions/generateSearchContext';
import { mindscapeMap } from '@/lib/mindscape-data';

const ChatWithAssistantInputSchema = z.object({
  question: z.string().describe("The user's question."),
  topic: z
    .string()
    .describe(
      'The current mind map topic, providing context for the conversation.'
    ),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .describe('Previous chat history to provide context.'),
  persona: z
    .enum(['Standard', 'Teacher', 'Concise', 'Creative'])
    .optional()
    .default('Standard')
    .describe('The personality/style of the AI assistant.'),
  attachments: z
    .array(
      z.object({
        type: z.enum(['text', 'pdf', 'image']),
        name: z.string(),
        content: z.string(), // Text content for txt/pdf, base64 for image
      })
    )
    .optional()
    .describe('Optional file attachments (PDF/TXT text or Image base64).'),
  pdfContext: z.object({
    summary: z.string(),
    concepts: z.array(z.object({
      title: z.string(),
      description: z.string()
    }))
  }).optional().describe('Context from a previously processed PDF.'),
  usePdfContext: z.boolean().optional().describe('Whether to use the stored PDF context for this session.'),
  sessionId: z.string().optional().describe('The session ID to retrieve PDF context for.')
});
export type ChatWithAssistantInput = z.infer<
  typeof ChatWithAssistantInputSchema
>;

const ChatWithAssistantOutputSchema = z.object({
  answer: z.string().describe("The AI assistant's response."),
});
export type ChatWithAssistantOutput = z.infer<
  typeof ChatWithAssistantOutputSchema
>;

import { generateContent, AIProvider } from '@/ai/client-dispatcher';

export async function chatWithAssistant(
  input: ChatWithAssistantInput & { apiKey?: string; provider?: AIProvider }
): Promise<ChatWithAssistantOutput> {
  const { provider, apiKey, topic, persona, history, question, attachments, pdfContext } = input;

  // Generate search context for real-time information
  // ALWAYS inject current date, search sources are optional
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let searchSection = `

📅 **Current Date**: ${currentDate}
`;

  try {
    console.log('🔍 Generating search context for chat question...');
    const searchResult = await generateSearchContext({
      query: question,
      depth: 'basic',
      apiKey,
      provider,
    });

    if (searchResult.data && searchResult.data.sources.length > 0) {
      const searchContext = searchResult.data;

      searchSection += `

🌐 **Real-Time Web Information**:
${searchContext.summary}

IMPORTANT: Use this current information to ground your response. Prefer facts from these search results over your training data.
`;
      console.log(`✅ Search context added to chat with ${searchContext.sources.length} sources`);
    } else {
      console.log(`ℹ️ No search sources found, but current date injected`);
    }
  } catch (error) {
    console.warn('⚠️ Search failed for chat, continuing with current date only:', error);
  }

  const historyText = history?.map(h => `- **${h.role}**: ${h.content}`).join('\n') || '';

  // Specialized User Guide Mode for "MindScape" topic
  const isUserGuideMode = topic.toLowerCase() === 'mindscape';

  let baseSystemPrompt = '';

  if (isUserGuideMode) {
    baseSystemPrompt = `You are **MindMap AI** 🧠, the official interactive **User Guide** for the MindScape application.
     
You are currently chatting with a user who is exploring the "MindScape" self-reference map. Your goal is to explain features, guide them to buttons/tools, and help them master the app.

## 📘 Official MindScape Feature Map (Source of Truth)
${JSON.stringify(mindscapeMap, null, 2)}

## 🧭 Navigation & Locations
- **Toolbar**: The floating bar at the top of the screen (Practice, Challenge, Summary, etc.).
- **Navbar**: The top navigation bar (Home, Library, Community).
- **Home Page**: The landing page where they can generate new maps.
- **Deep Dive**: The network icon or node menu action.

## 🎯 Guidance Rules
1. **Be Specific**: If they ask "How do I make a quiz?", say "Click the **Practice** button in the Toolbar." (Don't just say "You can use practice mode").
2. **Use the Map Data**: Reference the content in the Feature Map above.
3. **Tone**: Expert, helpful, and concise.
`;
  } else {
    baseSystemPrompt = `You are **MindSpark** ✨, a helpful and futuristic AI assistant integrated into the **MindScape** mind mapping application.
     
🚀 **LIVE ACCESS ENABLED**: You have active access to real-time Google Search results and current date information. Never claim you cannot access current events or real-time data.

🧠 **Current Topic**: ${topic}
${searchSection}

${pdfContext ? `
📄 **DOCUMENT-AWARE MODE ENABLED**:
You have been provided with the extracted context from a PDF document uploaded by the user. 
- **PRIORITY**: Always use the provided document context to answer questions about the topic.
- **GROUNDING**: If the user's question is covered in the PDF, your answer MUST be based on it.
- **IDENTIFICATION**: Briefly mention if your answer is based on the provided document when appropriate (e.g., "According to the document...").

**Document Summary**:
${pdfContext.summary}

**Knowledge Graph / Key Concepts**:
${pdfContext.concepts.map(c => `- **${c.title}**: ${c.description}`).join('\n')}
` : ''}

${attachments && attachments.length > 0 ? `
📎 **Attached Files**:
${attachments
          .filter(a => a.type !== 'image')
          .map(a => `--- File: ${a.name} (${a.type}) ---\n${a.content}\n--- End of File ---`)
          .join('\n\n')}

IMPORTANT: Reference the content of the attached files to provide a contextually relevant response. If an image is attached, it has been sent directly to your vision module (if available).
` : ''}
`;
  }

  const systemPrompt = `${baseSystemPrompt}

${!isUserGuideMode ? `🎭 **Current Persona**: ${persona}` : ''}

${historyText ? `**Chat History**:\n${historyText}` : ''}

**User Question**:
"${question}"

---

## 🎯 Your Mission
Provide clear, engaging, and visually structured responses${pdfContext ? ' based primarily on the DOCUMENT CONTEXT above' : !isUserGuideMode ? ' based on the MOST RECENT information available in the search results above' : ', acting as the ultimate MindScape expert'}.

## 📋 Formatting Guidelines (Use Markdown)
- Start with a brief intro.
- Use bullet points and bold text for readability.
- Use tables for comparisons.
- **CRITICAL**: DO NOT include any URLs, links, or web addresses (e.g., [link](url)) in your response.
- Be encouraging and positive.
${!isUserGuideMode ? `
## 🎭 Persona Instructions
**Current Persona Mode**: ${persona}
Adjust your response style based on the persona (Standard, Teacher, Concise, Creative).` : ''}

The output MUST be a valid JSON object with the following structure:
{
  "answer": "Your formatted markdown response here"
}

IMPORTANT: Return ONLY the raw JSON object, no other text or explanation.`;

  const userPrompt = "Provide your response.";

  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const images = attachments
        ?.filter(a => a.type === 'image')
        .map(a => {
          const base64Data = a.content.split(',')[1] || a.content;
          const mimeTypeMatch = a.content.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
          const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
          return { inlineData: { mimeType, data: base64Data } };
        });

      const result = await generateContent({
        provider,
        apiKey,
        systemPrompt,
        userPrompt,
        images: images && images.length > 0 ? images : undefined,
        schema: ChatWithAssistantOutputSchema,
      });

      return result;
    } catch (e: any) {
      lastError = e;
      console.error(`❌ Chat attempt ${attempt} failed:`, e.message);
      if (attempt === maxAttempts) throw e;
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  throw lastError || new Error('Chat generation failed');
}


