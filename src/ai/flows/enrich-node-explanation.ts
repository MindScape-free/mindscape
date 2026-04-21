import { z } from 'zod';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';

// ── Zod Schemas ────────────────────────────────────────────────────────────

const RelatedNodeSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
});

const LearningPathSchema = z.object({
  before: z.string(),
  after: z.string(),
});

const ConceptSnapshotSchema = z.object({
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  readTimeMinutes: z.number().int().min(1).max(5),
  similarTo: z.string().min(1),
});

const MisconceptionSchema = z.object({
  claim: z.string().min(1),
  correction: z.string().min(1),
});

const RadarItemSchema = z.object({
  domain: z.string().min(1),
  icon: z.string().min(1),
  color: z.enum(['rose', 'emerald', 'sky', 'orange', 'violet', 'pink', 'amber', 'cyan']),
  application: z.string().min(1),
});

const TimelineEventSchema = z.object({
  year: z.string().min(1),
  event: z.string().min(1),
  isKey: z.boolean().optional(),
});

const MicroQuizOptionSchema = z.object({
  id: z.enum(['A', 'B', 'C', 'D']),
  text: z.string().min(1),
});

const MicroQuizSchema = z.object({
  question: z.string().min(1),
  options: z.array(MicroQuizOptionSchema).length(4),
  correctId: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().min(1),
});

export const NodeEnrichmentOutputSchema = z.object({
  relatedNodes: z.array(RelatedNodeSchema).min(3).max(5),
  learningPath: LearningPathSchema,
  snapshot: ConceptSnapshotSchema,
  misconceptions: z.array(MisconceptionSchema).min(2).max(3),
  realWorldRadar: z.array(RadarItemSchema).length(4),
  timeline: z.array(TimelineEventSchema).min(4).max(6),
  microQuiz: MicroQuizSchema,
});

export type NodeEnrichmentOutput = z.infer<typeof NodeEnrichmentOutputSchema>;

export interface NodeEnrichmentInput {
  nodeName: string;
  nodeDescription: string;
  mainTopic: string;
  apiKey?: string;
  provider?: AIProvider;
}

// ── Prompt ─────────────────────────────────────────────────────────────────

const SYSTEM_GUARANTEES = `SYSTEM GUARANTEES:
- Output MUST be valid JSON (no markdown, no extra text)
- If invalid → internally self-correct before final output
- Do NOT explain, only generate

PRIORITY ORDER:
1. JSON schema correctness
2. Factual accuracy
3. Completeness
4. Brevity`;

// ── Flow ───────────────────────────────────────────────────────────────────

export async function enrichNodeExplanation(
  input: NodeEnrichmentInput
): Promise<NodeEnrichmentOutput> {
  const { nodeName, nodeDescription, mainTopic, provider, apiKey } = input;

  const systemPrompt = `${SYSTEM_GUARANTEES}

You are an expert knowledge enrichment engine for a mind map learning platform.

Main Topic: "${mainTopic}"
Concept Node: "${nodeName}"
Description: "${nodeDescription}"

Generate a rich enrichment object for this concept. Follow ALL rules below exactly.

RULES FOR EACH FIELD:

relatedNodes (3–5 items):
- Concepts directly related to "${nodeName}" within the context of "${mainTopic}"
- Each description: max 15 words, one sentence
- icon: valid lucide icon in kebab-case (e.g. "brain-circuit", "layers", "git-branch")
- Do NOT include "${nodeName}" itself

learningPath:
- before: the concept a learner should understand BEFORE "${nodeName}" (specific name, not "basics")
- after: the concept that naturally follows AFTER "${nodeName}" (specific name, not "advanced topics")
- Both must be real, named concepts

snapshot:
- difficulty: one of "Beginner", "Intermediate", "Advanced" — based on how hard "${nodeName}" is
- readTimeMinutes: integer 1–5, realistic estimate to read a full explanation
- similarTo: one other concept name that "${nodeName}" is most similar to

misconceptions (2–3 items):
- claim: a common wrong belief about "${nodeName}", max 12 words, no quotes
- correction: the accurate truth, max 20 words

realWorldRadar (EXACTLY 4 items):
- Pick the 4 most relevant real-world domains for "${nodeName}"
- domain: industry name (e.g. "Healthcare", "Finance", "Education", "Robotics")
- icon: lucide icon for that domain in kebab-case
- color: MUST be one of exactly: "rose", "emerald", "sky", "orange", "violet", "pink", "amber", "cyan"
- application: one sentence, max 18 words, describing how "${nodeName}" is used in that domain

timeline (4–6 items, chronological oldest first):
- year: string like "1943" or "Early 2000s" or "2024"
- event: max 10 words describing what happened
- isKey: true for the 1–2 most important milestones, false or omit for others

microQuiz (exactly 1 question):
- question: a clear, specific question about "${nodeName}", not trivially obvious
- options: exactly 4 options with ids A, B, C, D
- correctId: the id of the correct option
- explanation: 1–2 sentences explaining why the correct answer is right

Return ONLY this JSON object, no other text:
{
  "relatedNodes": [...],
  "learningPath": { "before": "...", "after": "..." },
  "snapshot": { "difficulty": "...", "readTimeMinutes": N, "similarTo": "..." },
  "misconceptions": [...],
  "realWorldRadar": [...],
  "timeline": [...],
  "microQuiz": { "question": "...", "options": [...], "correctId": "...", "explanation": "..." }
}`;

  const userPrompt = `Generate the enrichment object for "${nodeName}" in the context of "${mainTopic}".`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await generateContent({
        provider,
        apiKey,
        systemPrompt,
        userPrompt,
        schema: NodeEnrichmentOutputSchema,
        options: { capability: 'fast' },
      });
      return result as NodeEnrichmentOutput;
    } catch (e: any) {
      console.error(`❌ Enrichment attempt ${attempt} failed:`, e.message);
      if (attempt === 2) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Enrichment generation failed');
}
