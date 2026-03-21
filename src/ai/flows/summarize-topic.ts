
'use server';
import { z } from 'zod';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';
import { MindMapData } from '@/types/mind-map';

const SummarizeTopicInputSchema = z.object({
    mindMapData: z.any().describe('The complete mind map data to be summarized.'),
});

const SummarizeTopicOutputSchema = z.object({
    summary: z.string().describe('A concise, engaging 2-3 paragraph summary focusing on the key takeaways.'),
});

export async function summarizeTopic(
    input: { mindMapData: MindMapData; apiKey?: string; provider?: AIProvider }
): Promise<z.infer<typeof SummarizeTopicOutputSchema>> {
    const { provider = 'pollinations', apiKey, mindMapData } = input;

    const topic = mindMapData.topic;
    const isCompare = mindMapData.mode === 'compare';

    // Explicitly extract relevant context for more robust summarization
    let summaryContext = '';
    if (isCompare) {
        const cd = mindMapData.compareData;
        summaryContext = `
TOPIC A vs B: ${topic}
SHARED CORE (Unity Nexus): ${JSON.stringify(cd.unityNexus.map(n => n.title))}
COMPARISON DIMENSIONS: ${JSON.stringify(cd.dimensions)}
EXPERT VERDICT: ${cd.synthesisHorizon.expertVerdict}
FUTURE EVOLUTION: ${cd.synthesisHorizon.futureEvolution}
        `;
    } else {
        summaryContext = JSON.stringify(mindMapData).substring(0, 20000);
    }

    let systemPrompt = '';

    if (isCompare) {
        systemPrompt = `You are an expert Strategic Analyst and Comparative Synthesizer. 
Your task is to provide a comprehensive, high-level summary of the provided "Dimensional Architect" comparison data.

**Context**: You are summarizing a comparison between two major topics (Topic A vs Topic B).

**Your Goal:**
1. **Introduction**: Briefly explain why this comparison is significant.
2. **Key Tensions & Shared Core**: Highlight the 'Unity Nexus' (what they share) and the primary 'Dimensional' differences.
3. **Strategic Synthesis**: Extract the "Expert Verdict" and "Future Evolution" from the data.
4. **Style**: Use professional yet engaging "executive summary" language. 2-3 well-structured paragraphs.
5. **CRITICAL**: DO NOT include any URLs, links, or references.

**Topic**: ${topic}

**Output Format**:
Return ONLY a raw JSON object with this key:
{
  "summary": "Your well-formatted text here."
}
`;
    } else {
        systemPrompt = `You are an expert educational synthesizer. Your task is to provide a comprehensive yet punchy summary of the provided mind map data.
  
**Your Goal:**
- Write 2-3 engaging paragraphs.
- Focus on the structure and key insights of the mind map.
- Make it exciting and informative, as if you are introducing the topic to a curious learner.
- **CRITICAL**: DO NOT include any URLs, links, or references.

**Topic**: ${topic}

**Output Format**:
Return ONLY a raw JSON object with this key:
{
  "summary": "Your well-formatted text here."
}
`;
    }

    const userPrompt = isCompare
        ? `Perform a strategic synthesis for this comparison map of "${topic}". Focus on the shared core and critical differences:\n\n${summaryContext}`
        : `Summarize this mind map data for the topic "${topic}". Highlight the most interesting subtopics:\n\n${summaryContext}`;

    try {
        const result = await generateContent({
            provider,
            apiKey,
            systemPrompt,
            userPrompt,
            schema: SummarizeTopicOutputSchema,
        });

        // Fallback for empty results
        if (!result || !result.summary) {
            return { summary: `A comprehensive exploration of ${topic}, covering its foundational concepts and key developmental paths.` };
        }

        return result;
    } catch (error: any) {
        console.error('❌ Topic summarization flow failed:', error.message);
        return { summary: `A deep dive into ${topic}, revealing its intricate structure and essential insights.` };
    }
}
