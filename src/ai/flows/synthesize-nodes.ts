'use server';

import { z } from 'zod';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';

const SynthesizeNodesInputSchema = z.object({
  nodeA: z.string(),
  nodeB: z.string(),
  topic: z.string(),
  persona: z.enum(['Teacher', 'Concise', 'Creative', 'Sage']).optional().default('Teacher'),
});
export type SynthesizeNodesInput = z.infer<typeof SynthesizeNodesInputSchema>;

const SynthesizeNodesOutputSchema = z.object({
  nexusTitle: z.string(),
  explanation: z.string(),
  reasoning: z.string(),
  subConcepts: z.array(z.object({
    title: z.string(),
    description: z.string(),
    leafNodes: z.array(z.object({
      title: z.string(),
      description: z.string()
    }))
  }))
});
export type SynthesizeNodesOutput = z.infer<typeof SynthesizeNodesOutputSchema>;

export async function synthesizeNodes(
  input: SynthesizeNodesInput & { apiKey?: string; provider?: AIProvider }
): Promise<SynthesizeNodesOutput> {
  const { nodeA, nodeB, topic, apiKey, provider } = input;

  const systemPrompt = `You are a **Knowledge Alchemist** ⚗️.
Your task is to perform "Synthesis" between two distinct concepts within the context of "${topic}".

## The Concepts
1. **${nodeA}**
2. **${nodeB}**

## Your Mission
Generate a "Nexus Node" that bridges these two concepts. 
Do not just explain both. Find the **intersect**, the **hybrid**, or the **higher-order abstraction** that connects them.

## Rules
- **Nexus Title**: A creative, evocative name for the fusion (e.g. "Quantum Stoicism" for Quantum Physics + Stoicism).
- **Explanation**: A deep, insightful explanation of how these two ideas resonate or collide.
- **Sub-Concepts**: 3 specific categories that explore this fusion.
- **Leaf Nodes**: For each category, provide 2-3 specific leaf nodes (sub-categories) with brief descriptions.
- **Reasoning**: Explain your philosophical logic for this synthesis.

Return ONLY this JSON:
{
  "nexusTitle": "Evocative Title",
  "explanation": "Deep synthesis explanation...",
  "reasoning": "Why you chose this connection...",
  "subConcepts": [
    { 
      "title": "Category 1", 
      "description": "...",
      "leafNodes": [
        { "title": "Leaf 1", "description": "..." },
        { "title": "Leaf 2", "description": "..." }
      ]
    },
    ...
  ]
}`;

  const userPrompt = `Synthesize "${nodeA}" and "${nodeB}" in the field of "${topic}".`;

  return await generateContent({
    provider,
    apiKey,
    systemPrompt,
    userPrompt,
    schema: SynthesizeNodesOutputSchema,
  });
}
