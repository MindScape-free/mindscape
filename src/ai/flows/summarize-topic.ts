
'use server';

import { z } from 'zod';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';
import { MindMapData } from '@/types/mind-map';

const SummarizeTopicOutputSchema = z.object({
    summary: z.string(),
});

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

export async function summarizeTopic(
    input: { mindMapData: MindMapData; apiKey?: string; provider?: AIProvider }
): Promise<z.infer<typeof SummarizeTopicOutputSchema>> {
    const { provider = 'pollinations', apiKey, mindMapData } = input;
    const topic = mindMapData.topic;
    const isCompare = mindMapData.mode === 'compare';

    let summaryContext = '';
    if (isCompare) {
        const cd = mindMapData.compareData;
        summaryContext = `TOPIC A vs B: ${topic}
SHARED CORE: ${JSON.stringify(cd.unityNexus.map((n: any) => n.title))}
DIMENSIONS: ${JSON.stringify(cd.dimensions)}
EXPERT VERDICT: ${cd.synthesisHorizon.expertVerdict}
FUTURE EVOLUTION: ${cd.synthesisHorizon.futureEvolution}`;
    } else {
        summaryContext = JSON.stringify(mindMapData).substring(0, 20000);
    }

    const systemPrompt = isCompare
        ? `${SYSTEM_GUARANTEES}

You are a Strategic Analyst and Comparative Synthesizer.

TASK: Summarize the comparison data for "${topic}" in 2–3 paragraphs.

FOCUS ON:
1. Why this comparison is significant (specific, not generic).
2. Unity Nexus (shared core) vs primary dimensional differences.
3. Expert Verdict and Future Evolution trajectory.

RULES:
- Avoid generic summaries like "Both topics are important in their fields."
- Use specific terms, named concepts, and concrete distinctions.
- DO NOT include URLs, links, or references.
- Style: professional executive summary.

Return ONLY: { "summary": "text" }`
        : `${SYSTEM_GUARANTEES}

You are an expert educational synthesizer.

TASK: Summarize the mind map for "${topic}" in 2–3 paragraphs.

FOCUS ON:
1. The hierarchical structure and how branches relate.
2. Key insights and non-obvious connections between concepts.
3. Relationships between subTopics — what ties them together.

RULES:
- Avoid generic summaries like "This mind map covers various aspects of ${topic}."
- Use specific node names and concrete insights from the map data.
- DO NOT include URLs, links, or references.

Return ONLY: { "summary": "text" }`;

    const userPrompt = isCompare
        ? `Strategic synthesis for "${topic}":\n\n${summaryContext}`
        : `Summarize mind map for "${topic}":\n\n${summaryContext}`;

    try {
        const result = await generateContent({ provider, apiKey, systemPrompt, userPrompt, schema: SummarizeTopicOutputSchema });
        if (!result?.summary) return { summary: `A structured exploration of ${topic} covering its core dimensions and key relationships.` };
        return result;
    } catch (e: any) {
        console.error('❌ Summarization failed:', e.message);
        return { summary: `A deep dive into ${topic}, revealing its intricate structure and essential insights.` };
    }
}
