
import { getVideoId } from '@/utils/youtube/extract-id';
import { fetchTranscriptParts, normalizeTranscript, getVideoMetadata, TranscriptPart } from '@/utils/youtube/transcript';
import { generateContent } from '@/ai/client-dispatcher';
import { AIGeneratedMindMapSchema } from '@/ai/mind-map-schema';
import { MindMapData } from '@/types/mind-map';

export interface GenerateYouTubeMindMapInput {
  url: string;
  targetLang?: string;
  persona?: string;
  depth?: 'low' | 'medium' | 'deep';
  sessionId?: string;
}

export interface GenerateYouTubeMindMapOutput {
  data: MindMapData | null;
  error: string | null;
}

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

CONFLICT RESOLVER: If instructions conflict → schema > brevity > ignore style

GLOBAL RULES:
- Descriptions: exactly 1 sentence, ≤20 words
- Avoid vague words (important, various, many)
- Prefer concrete, specific terms
- Optional fields (thought, insight, tags, timestamp): omit if not adding value — never fabricate`;

function buildPersona(persona: string): string {
  const p = (persona || 'teacher').toLowerCase().trim();
  if (p === 'concise') return `PERSONA: Concise — remove all explanations, use keywords only.`;
  if (p === 'creative') return `PERSONA: Creative — allow metaphors and non-obvious angles.`;
  if (p === 'sage') return `PERSONA: Cognitive Sage — reveal patterns, cross-domain links, philosophical depth.`;
  return `PERSONA: Structured Expert — clear, specific, curriculum-style.`;
}

export async function generateYouTubeMindMap(
  input: GenerateYouTubeMindMapInput,
  options: { provider?: string; apiKey?: string; model?: string; userId?: string }
): Promise<GenerateYouTubeMindMapOutput> {
  const { url, targetLang = 'en', persona = 'Teacher', depth = 'medium' } = input;

  try {
    const videoId = getVideoId(url);
    if (!videoId) return { data: null, error: 'Invalid YouTube URL' };

    let transcriptParts: TranscriptPart[] = [];
    let metadata = await getVideoMetadata(videoId);
    let isFallback = false;

    try {
      transcriptParts = await fetchTranscriptParts(videoId);
    } catch (err: any) {
      console.warn('Transcript fetch failed, using metadata fallback:', err.message);
      if (!metadata) throw err;
      isFallback = true;
    }

    const fullTranscript = isFallback ? '' : normalizeTranscript(transcriptParts, 120);
    const truncatedTranscript = fullTranscript.length > 25000
      ? fullTranscript.substring(0, 25000) + '\n\n[transcript truncated]'
      : fullTranscript;

    const densityMap: Record<string, string> = {
      low:    `subTopics: 4 | categories: 2 | subCategories: 2–3`,
      medium: `subTopics: 4–5 | categories: 3 | subCategories: 3–4`,
      deep:   `subTopics: 6–7 | categories: 4 | subCategories: 4–5`,
    };
    const density = densityMap[depth] || densityMap.medium;

    const contextSource = isFallback
      ? `VIDEO METADATA (no transcript available):
Title: ${metadata?.title}
Creator: ${metadata?.author_name}
Description: ${metadata?.description || 'No description.'}

FALLBACK RULE: No transcript available → use video title and description as primary source.
If description is detailed → use it as factual basis.
If description is sparse → use structured knowledge about this topic.`
      : `VIDEO CONTENT:
Title: ${metadata?.title}
Creator: ${metadata?.author_name}
Description: ${metadata?.description ? metadata.description.substring(0, 500) : 'N/A'}

TRANSCRIPT:
${truncatedTranscript}`;

    const systemPrompt = `${SYSTEM_GUARANTEES}

You are a professional YouTube Mind Map Generator.

${buildPersona(persona)}
LANGUAGE: ${targetLang}
DENSITY: ${density}

TRANSCRIPT RULES:
- If transcript is incomplete or missing → fallback to topic-based structured knowledge.
- Use chapter markers in transcript as primary subTopic names if present.
- Each leaf node (subCategory) MUST have a "description" and optionally a "timestamp" (seconds, integer).

SCHEMA (return ONLY this JSON):
{
  "mode": "single",
  "topic": "Central video topic",
  "shortTitle": "2–4 word title",
  "icon": "lucide-kebab-case",
  "subTopics": [
    {
      "name": "Chapter or Theme Name",
      "icon": "lucide-kebab-case",
      "categories": [
        {
          "name": "Category Name",
          "icon": "lucide-kebab-case",
          "subCategories": [
            {
              "name": "Specific Point",
              "description": "Exactly 1 sentence, ≤20 words, concrete.",
              "icon": "lucide-kebab-case",
              "timestamp": 0
            }
          ]
        }
      ]
    }
  ]
}

VALIDATION:
1. Root uses "topic" (not "centralTopic")
2. Every object has "icon"
3. Every subTopic has "categories"
4. Every category has "subCategories"
5. subCategories have "description"
6. timestamps are integers (seconds)`;

    const userPrompt = `Generate a comprehensive mind map for this YouTube video:\n\n${contextSource}`;

    const result = await generateContent({
      provider: (options.provider as any) || 'pollinations',
      apiKey: options.apiKey,
      systemPrompt,
      userPrompt,
      schema: AIGeneratedMindMapSchema,
      options: { model: options.model || 'openai', capability: depth === 'deep' ? 'fast' : 'creative' },
    });

    if (!result) return { data: null, error: 'AI returned empty result.' };

    const data = result as MindMapData;
    data.sourceUrl = url;
    data.videoId = videoId;
    data.sourceType = 'youtube';
    data.sourceFileType = 'youtube';
    data.depth = depth;
    data.thumbnailUrl = metadata?.thumbnail_url || (data as any).thumbnailUrl;

    return { data, error: null };
  } catch (error: any) {
    console.error('❌ YouTube MindMap Error:', error);
    if (error.name === 'StructuredOutputError') {
      return { data: null, error: `AI response malformed. Try different depth or persona.` };
    }
    return { data: null, error: error.message || 'Failed to generate mind map from YouTube.' };
  }
}
