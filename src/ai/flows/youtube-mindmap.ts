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

/**
 * Main flow for generating a mindmap from a YouTube URL.
 */
export async function generateYouTubeMindMap(
  input: GenerateYouTubeMindMapInput,
  options: {
    provider?: string;
    apiKey?: string;
    model?: string;
    userId?: string;
  }
): Promise<GenerateYouTubeMindMapOutput> {
  const { url, targetLang = 'en', persona = 'Teacher', depth = 'medium' } = input;

  try {
    // 1. Extract Video ID
    const videoId = getVideoId(url);
    console.log('DEBUG: YouTube Video ID:', videoId);
    if (!videoId) {
      return { data: null, error: 'Invalid YouTube URL' };
    }

    // 2. Fetch Transcript and Metadata
    let transcriptParts: TranscriptPart[] = [];
    let metadata = await getVideoMetadata(videoId);
    console.log('DEBUG: YouTube Metadata:', metadata ? 'Found' : 'NULL');
    let isFallback = false;

    try {
      transcriptParts = await fetchTranscriptParts(videoId);
      console.log('DEBUG: Transcript parts fetched:', transcriptParts.length);
    } catch (transcriptError: any) {
      console.warn('Transcript fetch failed, trying metadata fallback:', transcriptError.message);
      if (!metadata) {
        console.error('DEBUG: Both transcript and metadata failed.');
        throw transcriptError;
      }
      isFallback = true;
    }

    // 3. Normalize and Segment Transcript
    // Use 120s segments for better semantic grouping as recommended
    const segmentDuration = 120;
    const fullTranscript = isFallback ? '' : normalizeTranscript(transcriptParts, segmentDuration);
    console.log('DEBUG: Full transcript length:', fullTranscript.length);

    // 4. Handle Size Constraints (Truncate for now, or chunk if needed)
    const maxChars = 25000;
    const truncatedTranscript = fullTranscript.length > maxChars
      ? fullTranscript.substring(0, maxChars) + '\n\n... (transcript truncated for length) ...'
      : fullTranscript;

    // 5. Construct Prompt
    const densityInstruction = depth === 'deep'
      ? 'Generate a very detailed mind map with at least 8 main subtopics and rich categories.'
      : depth === 'medium'
        ? 'Generate a balanced mind map with 5-6 subtopics and moderate detail.'
        : 'Generate a concise mind map with 4 subtopics focusing on the core essentials.';

    const contextSource = isFallback
      ? `VIDEO METADATA (No transcript found):
         Title: ${metadata?.title}
         Creator: ${metadata?.author_name}
         Description: ${metadata?.description || 'No description available.'}
         
         INSTRUCTIONS:
         Since no transcript is available, use the video title and description to understand the core concepts. 
         If the description is detailed, use it as your primary source of facts. 
         Otherwise, use your internal knowledge about this topic to generate the mind map.`
      : `VIDEO CONTENT (Segmented Transcript):
         Title: ${metadata?.title}
         Creator: ${metadata?.author_name}
         Description: ${metadata?.description ? (metadata.description.substring(0, 1000) + '...') : 'N/A'}
         
         SEGMENTED TRANSCRIPT:
         ${truncatedTranscript}`;

    const systemPrompt = `You are a professional Mind Map Generator. Your goal is to transform YouTube video content into a structured, hierarchical JSON mind map.
    
    Target Language: ${targetLang}
    Persona: ${persona}
    Depth: ${depth}
    ${densityInstruction}

    CORE JSON STRUCTURE (MANDATORY KEYS):
    - "topic": The central title (string)
    - "shortTitle": 2-4 word condensed title (string)
    - "icon": Lucide icon name (string, e.g., "brain-circuit")
    - "subTopics": Array of objects containing:
        - "name", "icon", "categories" (Array)
    - "categories": Array of objects containing:
        - "name", "icon", "subCategories" (Array)
    - "subCategories": Array of objects containing:
        - "name", "description", "icon", "timestamp" (number)

    Instructions:
    - Create a central topic that accurately reflects the video content.
    - STRUCTURE IS CRITICAL: You MUST use a strictly hierarchical structure:
      Main Topics -> Categories -> Sub-categories (Leaf Nodes).
    - EACH category MUST have at least 2-3 subCategories (leaf nodes).
    - Leaf nodes (subCategories) MUST have a detailed "description".
    - ICONS ARE MANDATORY: Every single node at every level MUST have a relevant "icon" from lucide-react (kebab-case).
    - USE THE TIMESTAMPS: For each leaf node (subCategory), include the "timestamp" field in seconds if it corresponds to a specific segment or mention in the video.
    - If chapters are evident in the segments, use them as primary "name" for SubTopics.
    - Ensure all text is in ${targetLang}.
    - The output MUST be a valid JSON object matching the provided schema.
    
    Pre-flight Verification:
    1. Does the root use "topic" (not "centralTopic")?
    2. Does every single object have an "icon" field?
    3. Does every subTopic have categories?
    4. Does every category have subCategories?
    5. Do subCategories have descriptions?
    6. Are timestamps integers representing seconds?`;

    const userPrompt = `Please generate a comprehensive mind map for this YouTube video:
    
    ${contextSource}`;

    // 6. Generate Mind Map via AI
    console.log('🤖 Calling AI for YouTube Mind Map generation...');
    const result = await generateContent({
      provider: (options.provider as any) || 'pollinations',
      apiKey: options.apiKey,
      systemPrompt,
      userPrompt,
      schema: AIGeneratedMindMapSchema,
      options: {
        model: options.model || 'openai', // Default to better model for complex structure
        capability: depth === 'deep' ? 'fast' : 'creative'
      }
    });

    if (!result) {
      console.error('❌ YouTube MindMap: AI returned null or empty result');
      return { data: null, error: 'AI failed to generate content or the response format was invalid.' };
    }

    console.log('✅ YouTube MindMap: AI generated content successfully');

    // Attach YouTube-specific metadata
    const data = result as MindMapData;
    data.sourceUrl = url;
    data.videoId = videoId;
    data.sourceType = 'youtube';
    data.sourceFileType = 'youtube';
    data.depth = depth;
    data.thumbnailUrl = metadata?.thumbnail_url || (data as any).thumbnailUrl;

    return { data, error: null };
  } catch (error: any) {
    console.error('❌ YouTube MindMap Flow Error:', error);

    // Check for specific schema errors logged by client-dispatcher
    if (error.name === 'StructuredOutputError') {
      return {
        data: null,
        error: `The AI response was malformed. Try a different depth or persona. (Details in server logs)`
      };
    }

    return { data: null, error: error.message || 'Failed to generate mind map from YouTube video.' };
  }
}
