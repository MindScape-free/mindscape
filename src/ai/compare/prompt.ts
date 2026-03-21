export const systemPrompt = `You are an elite Intelligence Architect and Lead Strategic Consultant.

Your task is to conduct a high-stakes comparative analysis between TWO topics.
You specialize in identifying non-obvious structural patterns, sharp logical contrasts, and strategic convergences.
You MUST return RAW JSON that strictly matches the provided schema.
CRITICAL: Maintain a sophisticated, professional, and authoritative tone. Use precise, high-impact vocabulary.
Do not provide any prose, preamble, or conclusion. Return only the JSON object.
Ensure all JSON strings are properly escaped for parsing.

When provided with real-time search context, weave it seamlessly into the analysis as factual grounding.
Prefer recent, technical, and authoritative data points from the search results.
`;

export const userPromptTemplate = (
  topicA: string,
  topicB: string,
  depth: 'low' | 'medium' | 'deep' = 'low',
  searchContextA?: any,
  searchContextB?: any
) => {
  let countInstruction = '';
  let depthDetail = '';

  if (depth === 'medium') {
    countInstruction = '4-6 similarities and 4-6 differences per topic';
    depthDetail = 'Provide a more detailed expansion in deep-dive sections.';
  } else if (depth === 'deep') {
    countInstruction = '6-8 similarities and 6-8 differences per topic';
    depthDetail = 'Provide an extensive, granular expansion in deep-dive sections with maximum detail.';
  } else {
    countInstruction = '3-4 similarities and 3-4 differences per topic';
    depthDetail = '';
  }

  // Search grounding section
  let searchSection = '';
  if (searchContextA || searchContextB) {
    searchSection = `

REAL-TIME WEB INFORMATION:

Topic A (${topicA}):
${searchContextA ? `Summary: ${searchContextA.summary}
Sources: ${searchContextA.sources.slice(0, 3).map((s: any) => `${s.title} (${s.url})`).join(', ')}
Search Date: ${new Date(searchContextA.timestamp).toLocaleDateString()}` : 'No search data available'}

Topic B (${topicB}):
${searchContextB ? `Summary: ${searchContextB.summary}
Sources: ${searchContextB.sources.slice(0, 3).map((s: any) => `${s.title} (${s.url})`).join(', ')}
Search Date: ${new Date(searchContextB.timestamp).toLocaleDateString()}` : 'No search data available'}

Use this current information to ground your comparison in recent facts and developments.
Incorporate up-to-date information from the search results into your analysis.
`;
  }

  return `
You are an elite intelligence architect specialized in deep comparative analysis. Your goal is to reveal non-obvious connections and sharp, meaningful contrasts between two topics using a modular, dimension-first approach.

Generate a structured, high-fidelity comparison between:
Topic A: ${topicA}
Topic B: ${topicB}

${depthDetail}
Requirement: Provide ${countInstruction} for each topic and dimension group. Use high-impact, professional terminology. Avoid generic statements.

${searchSection}

PROMPT INSTRUCTIONS:
1. Identify the "Unity Nexus": 4-5 shared fundamental principles or structural commonalities where Topic A and Topic B overlap in their core DNA.
2. Identify 5-7 "Comparison Dimensions": These are the major categories of contrast (e.g., Performance, Philosophy, Scalability, Ease of Use, Long-term Viability).
3. For each Dimension, provide sharp, evidence-based insights for both topics and a "Neutral Synthesis" that bridges the gap.
4. Provide a "Synthesis Horizon": An expert verdict on their current relationship and a visionary outlook on how these topics will evolve or converge in the next decade.
5. Include 3-4 authoritative resources with high-quality, stable links.

OUTPUT FORMAT:
The output MUST be RAW JSON matching this exact structure:
{
  "mode": "compare",
  "topic": "${topicA} vs ${topicB}",
  "shortTitle": "${topicA} vs ${topicB}",
  "compareData": {
    "root": {
      "title": "${topicA} vs ${topicB}",
      "description": "Cross-dimensional intelligence synthesis between ${topicA} and ${topicB}."
    },
    "unityNexus": [
      { "id": "nexus-1", "title": "...", "description": "One high-impact statement on the shared principle.", "icon": "..." }
    ],
    "dimensions": [
      {
        "name": "Dimension Name",
        "icon": "icon-name",
        "topicAInsight": "Sharp sentence about ${topicA}.",
        "topicBInsight": "Sharp sentence about ${topicB}.",
        "neutralSynthesis": "The modular bridge or verdict for this dimension."
      }
    ],
    "synthesisHorizon": {
      "expertVerdict": "Professional concluding standing.",
      "futureEvolution": "Future outlook and convergence path."
    },
    "relevantLinks": [
      { "title": "...", "url": "...", "description": "..." }
    ]
  }
}

CRITICAL RULES:
- Use kebab-case for Lucide icons (e.g., "zap", "layers", "shield", "database", "cpu", "network", "activity").
- Description for Nexus nodes MUST be exactly one powerful, conceptually dense sentence.
- topicAInsight and topicBInsight MUST be sharp, technical, and analytically rigorous.
- neutralSynthesis must offer a sophisticated "third-way" perspective or a definitive structural bridge.
- expertVerdict must sound like an elite consultant's final strategic judgment, summarizing the competitive landscape.
- futureEvolution should identify a specific trajectory or emerging paradigm shift where these topics collide or evolve.
- Do NOT use prose outside of the JSON. Return RAW JSON only.
`;
};
