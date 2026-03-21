
'use server';

/**
 * @fileOverview Provides real-life examples for mind map nodes.
 *
 * - explainWithExample - A function that generates a real-life example for a topic.
 * - ExplainWithExampleInput - The input type for the explainWithExample function.
 * - ExplainWithExampleOutput - The return type for the explainWithExample function.
 */

import { z } from 'zod';

const ExplainWithExampleInputSchema = z.object({
  mainTopic: z.string().describe('The main topic of the mind map.'),
  topicName: z.string().describe('The name of the node to explain.'),
  explanationMode: z
    .enum(['Beginner', 'Intermediate', 'Expert'])
    .describe('The desired level of detail for the example.'),
  pdfContext: z.string().optional().describe('Text content from a source PDF or image for context.'),
});
export type ExplainWithExampleInput = z.infer<
  typeof ExplainWithExampleInputSchema
>;

const ExplainWithExampleOutputSchema = z.object({
  example: z
    .string()
    .describe('A short, relatable, real-life example for the topic.'),
});
export type ExplainWithExampleOutput = z.infer<
  typeof ExplainWithExampleOutputSchema
>;

import { generateContent, AIProvider } from '@/ai/client-dispatcher';

export async function explainWithExample(
  input: ExplainWithExampleInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<ExplainWithExampleOutput> {
  const { provider, apiKey, mainTopic, topicName, explanationMode, strict, pdfContext } = input;

  const systemPrompt = `You are an expert at explaining complex topics with simple, relatable, real-life examples.

    The main topic is "${mainTopic}". The user wants an example for the concept: "${topicName}".
    
    The user has requested the example at the "${explanationMode}" level.
    - For "Beginner", use a very simple, everyday analogy.
    - For "Intermediate", use a more detailed but still accessible example.
    - For "Expert", use a specific, technical, or industry-related example.

    ${pdfContext
      ? `
    CONTEXT FROM ATTACHED FILE (PDF/IMAGE):
    The following is relevant text extracted from the user's uploaded document. 
    Use this context to make the example more relevant to the specific document content if applicable.
    
    --- START OF CONTEXT ---
    ${pdfContext}
    --- END OF CONTEXT ---
    `
      : ''
    }
    
    Your goal is to provide a single, concise, and easy-to-understand analogy or example tailored to the requested mode.
    
    The output MUST be a valid JSON object with the following structure:
    {
      "example": "Your example text here"
    }

    IMPORTANT: Return ONLY the raw JSON object, no other text or explanation.`;

  const userPrompt = "Generate the example.";

  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await generateContent({
        provider,
        apiKey,
        systemPrompt,
        userPrompt,
        schema: ExplainWithExampleOutputSchema,
        strict
      });

      return result;
    } catch (e: any) {
      lastError = e;
      console.error(`❌ Example generation attempt ${attempt} failed:`, e.message);
      if (attempt === maxAttempts) throw e;
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  throw new Error("Explanation generation failed after all attempts.");
}
