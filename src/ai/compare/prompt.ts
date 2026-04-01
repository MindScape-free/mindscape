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

export const systemPrompt = `${SYSTEM_GUARANTEES}

You are an elite Intelligence Architect and Lead Strategic Consultant.

Your task is to conduct a high-stakes comparative analysis between TWO topics.
You specialize in identifying non-obvious structural patterns, sharp logical contrasts, and strategic convergences.

INTERNAL THINKING (do not output — think before generating):
1. Identify the core dimensions of contrast between the two topics.
2. Generate sharp, evidence-based insights for each dimension.
3. Assemble the final JSON.

RULES:
- Return RAW JSON only — no prose, preamble, or conclusion.
- Maintain sophisticated, professional, authoritative tone.
- Use precise, high-impact vocabulary.
- Ensure all JSON strings are properly escaped.
- When search context is provided → weave it as factual grounding.
- Prefer recent, technical, authoritative data points.
`;

export const userPromptTemplate = (
  topicA: string,
  topicB: string,
  depth: 'low' | 'medium' | 'deep' = 'low',
  searchContextA?: any,
  searchContextB?: any
) => {
  const countMap = {
    low:    { nexus: '3–4', dims: '4–5', insights: '3–4 per topic' },
    medium: { nexus: '4',   dims: '5',   insights: '4–6 per topic' },
    deep:   { nexus: '4',   dims: '5–6', insights: '6–8 per topic' },
  };
  const counts = countMap[depth] || countMap.low;

  let searchSection = '';
  if (searchContextA || searchContextB) {
    searchSection = `
REAL-TIME WEB INFORMATION:

Topic A (${topicA}):
${searchContextA
  ? `Summary: ${searchContextA.summary}\nSources: ${searchContextA.sources.slice(0, 3).map((s: any) => s.title).join(', ')}\nDate: ${new Date(searchContextA.timestamp).toLocaleDateString()}`
  : 'No search data available'}

Topic B (${topicB}):
${searchContextB
  ? `Summary: ${searchContextB.summary}\nSources: ${searchContextB.sources.slice(0, 3).map((s: any) => s.title).join(', ')}\nDate: ${new Date(searchContextB.timestamp).toLocaleDateString()}`
  : 'No search data available'}

Ground your comparison in these recent facts. Incorporate up-to-date information into the analysis.`;
  }

  return `Generate a structured, high-fidelity comparison between:
Topic A: ${topicA}
Topic B: ${topicB}

LIMITS:
- Unity Nexus: exactly ${counts.nexus} items (MAX 4 total)
- Dimensions: exactly ${counts.dims} items (MAX 5 total — each must be clearly distinct, no overlap)
- Insights: ${counts.insights}

DIMENSION RULES:
- Each dimension must cover a clearly different axis of comparison (e.g., Performance, Philosophy, Scalability, Ecosystem, Use Cases).
- No two dimensions should overlap in meaning.
- topicAInsight and topicBInsight must be sharp, technical, and analytically rigorous.
- neutralSynthesis must offer a "third-way" perspective or definitive structural bridge.
${searchSection}

INSTRUCTIONS:
1. Unity Nexus: ${counts.nexus} shared fundamental principles where Topic A and B overlap in core DNA.
2. Dimensions: ${counts.dims} major axes of contrast with sharp insights for both topics.
3. Synthesis Horizon: expert verdict on current relationship + visionary 10-year outlook.
4. Relevant Links: 3–4 authoritative resources.

OUTPUT FORMAT (RAW JSON only):
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
      { "id": "nexus-1", "title": "...", "description": "One high-impact sentence on the shared principle.", "icon": "lucide-kebab" }
    ],
    "dimensions": [
      {
        "name": "Dimension Name",
        "icon": "lucide-kebab",
        "topicAInsight": "Sharp, technical sentence about ${topicA}.",
        "topicBInsight": "Sharp, technical sentence about ${topicB}.",
        "neutralSynthesis": "Sophisticated third-way perspective or structural bridge."
      }
    ],
    "synthesisHorizon": {
      "expertVerdict": "Elite consultant's final strategic judgment.",
      "futureEvolution": "Specific trajectory or emerging paradigm shift."
    },
    "relevantLinks": [
      { "title": "...", "url": "...", "description": "..." }
    ]
  }
}

CRITICAL RULES:
- Icons: kebab-case lucide names (zap, layers, shield, database, cpu, network, activity).
- Nexus descriptions: exactly 1 powerful, conceptually dense sentence.
- expertVerdict: sounds like an elite consultant's final judgment.
- futureEvolution: identifies a specific convergence trajectory.
- Return RAW JSON only.`;
};
