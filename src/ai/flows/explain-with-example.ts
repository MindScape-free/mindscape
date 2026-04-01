
'use server';

import { z } from 'zod';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';

const ExplainWithExampleInputSchema = z.object({
  mainTopic: z.string(),
  topicName: z.string(),
  explanationMode: z.enum(['Beginner', 'Intermediate', 'Expert']),
  pdfContext: z.string().optional(),
});
export type ExplainWithExampleInput = z.infer<typeof ExplainWithExampleInputSchema>;

const ExplainWithExampleOutputSchema = z.object({ example: z.string() });
export type ExplainWithExampleOutput = z.infer<typeof ExplainWithExampleOutputSchema>;

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

export async function explainWithExample(
  input: ExplainWithExampleInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<ExplainWithExampleOutput> {
  const { provider, apiKey, mainTopic, topicName, explanationMode, strict, pdfContext } = input;

  const systemPrompt = `${SYSTEM_GUARANTEES}

You are an expert at explaining concepts with precise, direct real-life examples.

Topic: "${mainTopic}"
Concept: "${topicName}"
Level: "${explanationMode}"

LEVEL GUIDE:
- Beginner: simple everyday analogy.
- Intermediate: detailed but accessible real-world scenario.
- Expert: specific technical or industry-related case study.

EXAMPLE RULES:
- Example must map DIRECTLY to the concept — no loose or tangential analogies.
- The example must clearly illustrate the specific mechanism or property of "${topicName}".
- Concrete and specific — name real tools, systems, or scenarios.
${pdfContext ? `\nSOURCE CONTEXT (use if relevant to make example more specific):\n${pdfContext}` : ''}

Return ONLY: { "example": "Your example text here" }`;

  const userPrompt = `Generate the example.`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await generateContent({ provider, apiKey, systemPrompt, userPrompt, schema: ExplainWithExampleOutputSchema, strict });
    } catch (e: any) {
      console.error(`❌ Example attempt ${attempt} failed:`, e.message);
      if (attempt === 2) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Example generation failed');
}
