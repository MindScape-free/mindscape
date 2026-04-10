'use server';

import { AIProvider } from '@/ai/client-dispatcher';
import { providerMonitor } from '@/ai/provider-monitor';
import {
  generateMindMap,
  GenerateMindMapOutput,
  GenerateMindMapInput,
} from '@/ai/flows/generate-mind-map';
import {
  generateMindMapFromImage,
  GenerateMindMapFromImageOutput,
} from '@/ai/flows/generate-mind-map-from-image';
import { generateYouTubeMindMap } from '@/ai/flows/youtube-mindmap';
import { generateMindMapFromPdf } from '@/ai/flows/generate-mind-map-from-pdf';
import { analyzeImageContent } from '@/ai/flows/analyze-image-content';
import { generateMindMapFromText } from '@/ai/flows/generate-mind-map-from-text';
import { generateMindMapFromWebsite } from '@/ai/flows/generate-mind-map-from-website';
import { extractWebsiteContent } from './actions/website';
import type {
  GenerateMindMapFromTextInput,
  GenerateMindMapFromTextOutput,
} from '@/ai/schemas/generate-mind-map-from-text-schema';
import type {
  AnalyzeImageContentInput,
  AnalyzeImageContentOutput,
} from '@/ai/schemas/analyze-image-content-schema';
import {
  explainMindMapNode,
  ExplainMindMapNodeInput,
  ExplainMindMapNodeOutput,
} from '@/ai/flows/explain-mind-map-node';
import {
  chatWithAssistant,
  ChatWithAssistantInput,
  ChatWithAssistantOutput,
} from '@/ai/flows/chat-with-assistant';
import {
  translateMindMap,
  TranslateMindMapInput,
  TranslateMindMapOutput,
} from '@/ai/flows/translate-mind-map';
import { summarizeTopic } from '@/ai/flows/summarize-topic';
import { apiCache } from '@/lib/cache';

import {
  explainWithExample,
  ExplainWithExampleInput,
  ExplainWithExampleOutput,
} from '@/ai/flows/explain-with-example';
import { summarizeChat } from '@/ai/flows/summarize-chat';
import type {
  SummarizeChatInput,
  SummarizeChatOutput,
} from '@/ai/schemas/summarize-chat-schema';
import {
  enhanceImagePrompt,
  EnhanceImagePromptInput,
  EnhanceImagePromptOutput,
} from '@/ai/flows/enhance-image-prompt';


import { generateQuizFlow, GenerateQuizInput } from '@/ai/flows/generate-quiz';

import { Quiz } from '@/ai/schemas/quiz-schema';
import {
  generateRelatedQuestions,
  RelatedQuestionsInput,
} from '@/ai/flows/generate-related-questions';
import { RelatedQuestionsOutput } from '@/ai/schemas/related-questions-schema';
import {
  generateComparisonMapV2,
  GenerateComparisonMapOutputV2,
} from '@/ai/compare/flow';
import { GenerateComparisonMapInput } from '@/ai/compare/schema';
import { MindMapData, SingleMindMapData, CompareMindMapData, SubTopic, Category, SubCategory } from '@/types/mind-map';

import { generateSearchContext } from './actions/generateSearchContext';

export interface AIActionOptions {
  apiKey?: string;
  provider?: AIProvider;
  model?: string;
  userId?: string;
}

/**
 * Ensures AI-generated data strictly adheres to the frontend MindMapData interface.
 * Fills in default values for required fields like tags and isExpanded.
 */
export async function mapToMindMapData(raw: any, depth: 'low' | 'medium' | 'deep' = 'low'): Promise<MindMapData> {
  if (raw.mode === 'compare' || raw.compareData) {
    // If the data is already in the new nested compareData format, pass it through
    if (raw.compareData) {
      return {
        ...raw,
        mode: 'compare',
        depth,
        createdAt: raw.createdAt || Date.now(),
        updatedAt: raw.updatedAt || Date.now(),
        compareData: {
          ...raw.compareData,
          unityNexus: (raw.compareData.unityNexus || []).map((n: any) => ({
            ...n,
            id: n.id || `nexus-${Math.random().toString(36).substr(2, 9)}`
          })),
          dimensions: (raw.compareData.dimensions || []).map((d: any) => ({
            ...d
          }))
        }
      } as CompareMindMapData;
    }

    // Legacy Fallback: If it's old flat format, we wrap it (though new generations won't go here)
    return {
      ...raw,
      mode: 'compare',
      depth,
      compareData: {
        root: raw.root || { title: raw.topic || 'Comparison' },
        unityNexus: (raw.similarities || []).map((n: any) => ({ ...n, id: n.id || Math.random().toString(36).substr(2, 9) })),
        dimensions: [], // Old format can't satisfy dimensions easily
        synthesisHorizon: { expertVerdict: '', futureEvolution: '' },
        relevantLinks: raw.relevantLinks || []
      }
    } as CompareMindMapData;
  }

  // Handle single mode
  return {
    ...raw,
    mode: 'single',
    depth,
    createdAt: raw.createdAt || Date.now(),
    updatedAt: raw.updatedAt || Date.now(),
    nestedExpansions: (raw.nestedExpansions || []).map((ne: any) => ({
      ...ne,
      subCategories: (ne.subCategories || []).map((sub: any) => ({
        ...sub,
        tags: Array.isArray(sub.tags) ? sub.tags : []
      }))
    })),
    subTopics: (raw.subTopics || []).map((st: any): SubTopic => {
      const normalizedName = (st.name || '').trim().replace(/[:.!?]$/, '');
      return {
        name: normalizedName,
        icon: st.icon || 'flag',
        insight: st.insight || '',
        id: st.id || `topic-${Math.random().toString(36).substr(2, 9)}`,
        categories: (st.categories || []).map((cat: any): Category => {
          const catName = (cat.name || '').trim().replace(/[:.!?]$/, '');
          return {
            name: catName,
            icon: cat.icon || 'folder',
            insight: cat.insight || '',
            id: cat.id || `cat-${Math.random().toString(36).substr(2, 9)}`,
            subCategories: (cat.subCategories || [])
              .map((sub: any) => {
                if (typeof sub === 'string') {
                  const subContent = sub.trim().replace(/[:.!?]$/, '');
                  return { name: subContent, description: `Details about ${subContent}`, icon: 'book-open', tags: [] };
                }
                return sub;
              })
              .filter((sub: any) => sub && typeof sub.name === 'string' && sub.name.trim() !== '')
              .map((sub: any): SubCategory => ({
                name: (sub.name || '').trim().replace(/[:.!?]$/, ''),
                description: sub.description || '',
                icon: sub.icon || 'book-open',
                tags: Array.isArray(sub.tags) ? sub.tags : [],
                id: sub.id || `sub-${Math.random().toString(36).substr(2, 9)}`,
                isExpanded: false
              }))
          };
        })
      };
    })
  } as SingleMindMapData;
}

export interface GenerateMindMapFromImageInput {
  imageDataUri: string;
  targetLang?: string;
  persona?: string;
  depth?: 'low' | 'medium' | 'deep';
  sessionId?: string;
}

/**
 * Internal helper to resolve the effective API key for AI generation.
 * Prioritizes explicitly provided keys, then user-specific keys from Firestore, 
 * and finally falls back to server-side environmental variables.
 */
// Server-side API key cache: userId -> { key, timestamp }
// Avoids repeated Firestore reads for the same user within a short window
const apiKeyCache = new Map<string, { key: string | undefined; timestamp: number }>();
const API_KEY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function resolveApiKey(options: AIActionOptions): Promise<string | undefined> {
  let effectiveApiKey = options.apiKey;
  let source = effectiveApiKey ? 'options' : 'none';

  // If no API key provided, try to fetch from user profile on server
  if (!effectiveApiKey && options.userId && (options.provider === 'pollinations' || !options.provider)) {
    // Check cache first
    const cached = apiKeyCache.get(options.userId);
    if (cached && Date.now() - cached.timestamp < API_KEY_CACHE_TTL) {
      effectiveApiKey = cached.key;
      source = 'firestore-cache';
    } else {
      try {
        const { getUserImageSettingsAdmin } = await import('@/lib/firestore-server-helpers');
        if (typeof getUserImageSettingsAdmin !== 'function') {
          throw new Error('getUserImageSettingsAdmin is not a function');
        }
        const userSettings = await getUserImageSettingsAdmin(options.userId);
        if (userSettings?.pollinationsApiKey) {
          effectiveApiKey = userSettings.pollinationsApiKey;
          source = 'firestore-admin';
          // Cache the result
          apiKeyCache.set(options.userId, { key: effectiveApiKey, timestamp: Date.now() });
          console.log(`🔑 Using Pollinations API key from Firestore Admin for user: ${options.userId}`);
        } else {
          // Cache the miss too (avoid repeated Firestore reads for users without keys)
          apiKeyCache.set(options.userId, { key: undefined, timestamp: Date.now() });
        }
      } catch (err: any) {
        console.warn(`⚠️ resolveApiKey: Failed to fetch user API key from Firestore Admin (${err.message}). Falling back to server default.`);
      }
    }
  }

  // Final fallback to server-side environment variable
  if (!effectiveApiKey) {
    effectiveApiKey = process.env.POLLINATIONS_API_KEY;
    if (effectiveApiKey) source = 'env-var';
  }

  const masked = effectiveApiKey ? `${effectiveApiKey.slice(0, 6)}...${effectiveApiKey.slice(-4)}` : 'none';
  console.log(`🔑 resolveApiKey -> key ${effectiveApiKey ? 'found' : 'missing'} (source: ${source}, masked: ${masked})`);

  return effectiveApiKey;
}

/**
 * Fast rule-based complexity analyzer.
 * Replaces the LLM-based resolveDepth() which added 5-15s per generation.
 * Returns 'low', 'medium', or 'deep' based on topic heuristics.
 */
export async function resolveDepthFast(
  topic: string,
): Promise<'low' | 'medium' | 'deep'> {
  const t = topic.toLowerCase().trim();
  const words = t.split(/\s+/).length;
  const chars = t.length;

  // Deep indicators: very long topics, multi-concept, or known complex domains
  const deepKeywords = [
    'quantum', 'consciousness', 'conscious', 'philosophy', 'epistemology',
    'metaphysics', 'thermodynamics', 'relativity', 'neuroscience', 'biochemistry',
    'molecular', 'astrophysics', 'cosmology', 'cryptocurrency', 'blockchain',
    'machine learning', 'artificial intelligence', 'deep learning', 'neural network',
    'climate change', 'global warming', 'evolution', 'genetics', 'genomics',
    'quantum computing', 'string theory', 'general relativity', 'human consciousness',
    'socioeconomic', 'geopolitical', 'existentialism', 'phenomenology',
    'cognitive science', 'computational', 'nanotechnology', 'biotechnology',
  ];
  if (deepKeywords.some(k => t.includes(k))) return 'deep';

  // Multi-concept topics (contains "and", "vs", "comparison", "between")
  const multiConcept = /\b(and|vs|versus|comparison|between|compare|difference)\b/i.test(t);
  if (multiConcept && words >= 4) return 'deep';

  // Low indicators: short, simple, well-known topics
  const lowKeywords = [
    'hello world', 'apple', 'banana', 'cat', 'dog', 'sun', 'moon',
    'water', 'fire', 'earth', 'wind', 'tree', 'flower', 'bird',
    'fish', 'car', 'book', 'pen', 'chair', 'table', 'house',
    'color', 'red', 'blue', 'green', 'number', 'one', 'two',
  ];
  if (words <= 2 && chars <= 15) return 'low';
  if (lowKeywords.some(k => t === k)) return 'low';

  // Medium: everything else
  return 'medium';
}

/**
 * @deprecated Use resolveDepthFast() instead.
 * Kept for backward compatibility but no longer makes LLM calls.
 */
export async function resolveDepth(
  topic: string,
  _apiKey?: string
): Promise<'low' | 'medium' | 'deep'> {
  return resolveDepthFast(topic);
}

export async function generateMindMapAction(
  input: GenerateMindMapInput & { useSearch?: boolean },
  options: AIActionOptions = {}
): Promise<{ data: MindMapData | null; error: string | null }> {
  try {
    const topic = String(input.topic);
    if (!topic || topic.length < 1) {
      return { data: null, error: 'Topic must be at least 1 character long.' };
    }

    // FIX #1: Parallelize API key resolution
    const effectiveApiKey = await resolveApiKey(options);
    const depth = (input.depth === ('auto' as any) || !input.depth)
      ? await resolveDepthFast(topic)
      : input.depth as 'low' | 'medium' | 'deep';

    // FIX #2: Wait for search BEFORE generation if enabled (quality + speed)
    let searchContext = null;
    if (input.useSearch) {
      try {
        console.log(`🔍 [Action] Waiting for search context for: "${topic}"`);
        const searchResult = await generateSearchContext({
          query: topic,
          depth: depth === 'deep' ? 'deep' : 'basic',
          apiKey: effectiveApiKey,
          provider: options.provider,
        });
        if (searchResult.data) {
          searchContext = searchResult.data;
          console.log(`✅ [Action] Search context retrieved: ${searchContext.sources.length} sources`);
        }
      } catch (e) {
        console.warn(`⚠️ [Action] Search failed, continuing without search context:`, e);
      }
    }

    // FIX #3: Pass searchContext and 'fast' capability to generation
    const generationResult = await generateMindMap({
      ...input,
      topic,
      depth,
      searchContext, 
      ...options,
      apiKey: effectiveApiKey,
      // Default to fast unless deep
      capability: depth === 'deep' ? 'fast' : 'fast' 
    });

    if (!generationResult) return { data: null, error: 'AI failed to generate content.' };

    const sanitized = await mapToMindMapData(generationResult, depth);
    sanitized.aiPersona = input.persona as string || 'Teacher';

    if (searchContext && searchContext.sources.length > 0) {
      sanitized.searchSources = searchContext.sources;
      sanitized.searchTimestamp = searchContext.timestamp;
    }

    return { data: sanitized, error: null };
  } catch (error) {
    console.error('Error in generateMindMapAction:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { data: null, error: `Failed to generate mind map: ${errorMessage}` };
  }
}



/**
 * Server action to check the pollen balance for the user's API key.
 * Uses the same key resolution chain as other AI actions.
 */
export async function checkPollenBalanceAction(
  options: { apiKey?: string; userId?: string } = {}
): Promise<{ balance: number | null; error: string | null }> {
  try {
    const effectiveApiKey = await resolveApiKey(options);

    if (!effectiveApiKey) {
      return { balance: null, error: 'No API key provided. Please check your settings.' };
    }

    let checkPollinationsBalance;
    try {
      const module = await import('@/ai/pollinations-client');
      checkPollinationsBalance = module.checkPollinationsBalance;
      if (typeof checkPollinationsBalance !== 'function') {
        throw new Error('checkPollinationsBalance is not a function in the imported module');
      }
    } catch (importErr: any) {
      console.error('❌ Failed to import pollinations-client:', importErr.message);
      return { balance: null, error: `Critical error: AI client configuration issue. Please contact support.` };
    }

    const balance = await checkPollinationsBalance(effectiveApiKey);
    if (balance === null) {
        return { balance: null, error: 'Authorization failed or account balance is empty.' };
    }
    return { balance, error: null };
  } catch (error: any) {
    console.error('❌ Error in checkPollenBalanceAction:', error);
    return { balance: null, error: `Failed to verify API key: ${error.message || 'Unknown error'}` };
  }
}



/**
 * Server action to generate a mind map from an image.
 * @param {GenerateMindMapFromImageInput} input - The input containing the image data URI.
 * @returns {Promise<{ data: GenerateMindMapFromImageOutput | null; error: string | null }>} An object with the generated map or an error.
 */
export async function generateMindMapFromImageAction(
  input: GenerateMindMapFromImageInput,
  options: AIActionOptions = {}
): Promise<{ data: MindMapData | null; error: string | null }> {
  if (!input.imageDataUri) {
    return { data: null, error: 'Image data URI is required.' };
  }

  try {
    const depth = input.depth || 'low';
    const effectiveApiKey = await resolveApiKey(options);
    const rawResult = await generateMindMapFromImage({ ...input, depth, ...options, apiKey: effectiveApiKey });
    if (!rawResult) return { data: null, error: 'AI failed to process image.' };

    const sanitized = await mapToMindMapData(rawResult, depth);
    sanitized.aiPersona = input.persona as string || 'Teacher';
    return { data: sanitized, error: null };
  } catch (error) {
    console.error('Error in generateMindMapFromImageAction:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      data: null,
      error: `Failed to generate mind map from image: ${errorMessage}`,
    };
  }
}

export async function generateMindMapFromPdfAction(
  input: GenerateMindMapFromTextInput,
  options: AIActionOptions = {}
): Promise<{ data: MindMapData | null; error: string | null }> {
  if (!input.text || input.text.trim().length < 10) {
    return { data: null, error: 'PDF content is too short to generate a mind map.' };
  }

  try {
    const effectiveApiKey = await resolveApiKey(options);
    const depth = (input.depth === 'auto' || !input.depth)
      ? await resolveDepth(input.text.substring(0, 200), effectiveApiKey)
      : input.depth as 'low' | 'medium' | 'deep';
    const result = await generateMindMapFromPdf({ ...input, depth, ...options, apiKey: effectiveApiKey });
    if (!result) return { data: null, error: 'AI failed to process PDF.' };

    const sanitized = await mapToMindMapData(result, depth);
    sanitized.aiPersona = input.persona as string || 'Teacher';
    return { data: sanitized, error: null };
  } catch (error) {
    console.error('Error in generateMindMapFromPdfAction:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      data: null,
      error: `Failed to generate mind map from PDF: ${errorMessage}`,
    };
  }
}

/**
 * Server action to generate a mind map from a block of text.
 * @param {GenerateMindMapFromTextInput} input - The input containing the text.
 * @returns {Promise<{ data: GenerateMindMapFromTextOutput | null; error: string | null }>} An object with the generated map or an error.
 */
export async function generateMindMapFromTextAction(
  input: GenerateMindMapFromTextInput,
  options: AIActionOptions = {}
): Promise<{ data: MindMapData | null; error: string | null }> {
  if (!input.text || input.text.trim().length < 10) {
    return { data: null, error: 'Text content is too short to generate a mind map.' };
  }

  try {
    const effectiveApiKey = await resolveApiKey(options);
    const depth = (input.depth === 'auto' || !input.depth)
      ? await resolveDepth(input.text.substring(0, 300), effectiveApiKey)
      : input.depth as 'low' | 'medium' | 'deep';
    const result = await generateMindMapFromText({ ...input, depth, ...options, apiKey: effectiveApiKey });
    if (!result) return { data: null, error: 'AI failed to process text.' };
    const sanitized = await mapToMindMapData(result, depth);
    sanitized.aiPersona = input.persona as string || 'Teacher';
    return { data: sanitized, error: null };
  } catch (error) {
    console.error('Error in generateMindMapFromTextAction:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      data: null,
      error: `Failed to generate mind map from text: ${errorMessage}`,
    };
  }
}

/**
 * Server action to generate a mind map from a YouTube URL.
 */
export async function generateYouTubeMindMapAction(
  input: {
    url: string;
    targetLang?: string;
    persona?: string;
    depth?: 'low' | 'medium' | 'deep';
    sessionId?: string;
  },
  options: AIActionOptions = {}
) {
  try {
    const effectiveApiKey = await resolveApiKey(options);
    const finalOptions = {
      provider: options.provider || 'pollinations',
      apiKey: effectiveApiKey,
      model: options.model,
      userId: options.userId,
    };

    const result = await generateYouTubeMindMap(input, finalOptions);
    if (!result.data) return result;

    const sanitized = await mapToMindMapData(result.data, input.depth || 'low');
    sanitized.aiPersona = input.persona as string || 'Teacher';
    return { data: sanitized, error: null };
  } catch (error) {
    console.error('Error in generateYouTubeMindMapAction:', error);
    return { data: null, error: 'Failed to initiate YouTube mind map generation.' };
  }
}

/**
 * Server action to analyze image content (OCR + description).
 */
export async function analyzeImageContentAction(
  input: AnalyzeImageContentInput,
  options: AIActionOptions = {}
): Promise<{ data: AnalyzeImageContentOutput | null; error: string | null }> {
  try {
    const effectiveApiKey = await resolveApiKey(options);
    const result = await analyzeImageContent({ ...input, ...options, apiKey: effectiveApiKey });
    return { data: result, error: null };
  } catch (error) {
    console.error('Error in analyzeImageContentAction:', error);
    return { data: null, error: 'Failed to analyze image content.' };
  }
}

/**
 * Server action to generate a mind map from a website URL.
 */
export async function generateMindMapFromWebsiteAction(
  input: {
    url: string;
    targetLang?: string;
    persona?: string;
    depth?: 'low' | 'medium' | 'deep';
    sessionId?: string;
    context?: string;
  },
  options: AIActionOptions = {}
): Promise<{ data: MindMapData | null; error: string | null }> {
  if (!input.url) {
    return { data: null, error: 'Website URL is required.' };
  }

  try {
    // 1. Extract content from the website
    const extractionResult = await extractWebsiteContent(input.url);
    if (!extractionResult.success || !extractionResult.textContent) {
      return { data: null, error: extractionResult.error || 'Failed to extract content from the website.' };
    }

    const effectiveApiKey = await resolveApiKey(options);
    const depth = (input.depth === ('auto' as any) || !input.depth)
      ? await resolveDepth(extractionResult.title || input.url, effectiveApiKey)
      : input.depth as 'low' | 'medium' | 'deep';

    // 3. Generate the mind map using the AI flow
    const result = await generateMindMapFromWebsite({
      url: input.url,
      content: {
        title: extractionResult.title || 'Untitled Website',
        textContent: extractionResult.textContent,
        textBlocks: extractionResult.textBlocks || [],
      },
      targetLang: input.targetLang,
      persona: input.persona,
      depth: depth,
      context: input.context,
      sessionId: input.sessionId,
      apiKey: effectiveApiKey,
      ...options,
    });

    if (!result) return { data: null, error: 'AI failed to process website content.' };

    // 4. Sanitize and format the output
    const sanitized = await mapToMindMapData(result, depth);
    sanitized.aiPersona = input.persona as string || 'Teacher';
    
    // Attach source metadata
    sanitized.sourceUrl = input.url;
    sanitized.sourceType = 'website';

    return { data: sanitized, error: null };
  } catch (error) {
    console.error('Error in generateMindMapFromWebsiteAction:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      data: null,
      error: `Failed to generate mind map from website: ${errorMessage}`,
    };
  }
}




/**
 * Server action to get a detailed explanation for a specific node in a mind map.
 * @param {ExplainMindMapNodeInput} input - The input containing details about the node to be explained.
 * @returns {Promise<{ explanation: ExplainMindMapNodeOutput | null; error: string | null }>} An object with either the explanation content or an error message.
 */
export async function explainNodeAction(
  input: ExplainMindMapNodeInput & { usePdfContext?: boolean; pdfContext?: string },
  options: AIActionOptions = {}
): Promise<{ explanation: ExplainMindMapNodeOutput | null; error: string | null }> {
  try {
    const cacheKey = `explain_${input.subCategoryName}_${input.mainTopic}_${input.explanationMode}_${input.usePdfContext ? 'aware' : 'simple'}`;
    const cached = apiCache.get<ExplainMindMapNodeOutput>(cacheKey);
    if (cached) {
      console.log(`⚡ Returning cached ${input.explanationMode} explanation for: ${input.subCategoryName}`);
      return { explanation: cached, error: null };
    }

    const effectiveApiKey = await resolveApiKey(options);

    let pdfContext = input.pdfContext;
    if (input.usePdfContext && !pdfContext && input.mainTopic) {
      const { getPdfContext } = await import('@/lib/pdf-context-store');
      const ctx = getPdfContext(input.mainTopic);
      pdfContext = ctx ? JSON.stringify(ctx) : undefined;
    }

    const result = await explainMindMapNode({ ...input, ...options, apiKey: effectiveApiKey, pdfContext });

    if (result) {
      apiCache.set(cacheKey, result);
    }

    return { explanation: result, error: null };
  } catch (error) {
    console.error(error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      explanation: null,
      error: `Failed to get explanation. ${errorMessage}`,
    };
  }
}

/**
 * Server action to handle a chat conversation with the AI assistant.
 * @param {ChatWithAssistantInput} input - The input containing the user's question, topic, chat history, and persona.
 * @returns {Promise<{ response: ChatWithAssistantOutput | null; error: string | null }>} An object with either the chat response or an error message.
 */
const CREATE_MAP_PATTERN = /^(?:create\s+map|generate\s+map|build\s+map|make\s+map|new\s+map|start\s+map)\s*:\s*(.+)/i;

export async function chatAction(
  input: ChatWithAssistantInput,
  options: AIActionOptions = {}
): Promise<{ response: ChatWithAssistantOutput | null; error: string | null; mindMapData?: MindMapData | null }> {
  try {
    const effectiveApiKey = await resolveApiKey(options);

    const mapMatch = input.question.match(CREATE_MAP_PATTERN);
    if (mapMatch) {
      const topic = mapMatch[1].trim();
      const depth = (input as any).depth || 'medium';
      const persona = input.persona || 'Teacher';
      
      const result = await generateMindMapAction({
        topic,
        depth,
        persona,
        useSearch: true,
      }, options);
      
      if (result.error || !result.data) {
        return { 
          response: { answer: `❌ Failed to create mind map: ${result.error || 'Unknown error'}` }, 
          error: null,
          mindMapData: null 
        };
      }
      
      const answerText = `🗺️ **Mind Map Created: "${topic}"**\n\nYour mind map has been generated with ${result.data.subTopics?.length || 0} main topics. Click to view the full interactive map.`;
      
      return { 
        response: { answer: answerText }, 
        error: null,
        mindMapData: result.data 
      };
    }

    // Inject PDF context if requested
    let pdfContext = input.pdfContext;
    if (input.usePdfContext && !pdfContext && (input.sessionId || input.topic)) {
      const { getPdfContext } = await import('@/lib/pdf-context-store');

      // Try memory store first
      const contextKey = input.sessionId || input.topic || 'default';
      pdfContext = getPdfContext(contextKey) || undefined;

      // Fallback: Try Firestore if sessionId is a valid doc ID
      if (!pdfContext && input.sessionId && !input.sessionId.startsWith('session-')) {
        try {
          const { getMindMapAdmin } = await import('@/lib/firestore-server-helpers');
          const mapData = await getMindMapAdmin(input.sessionId);
          if (mapData && mapData.pdfContext) {
            console.log(`🧠 chatAction: Retrieved PDF context from Firestore for doc ${input.sessionId}`);
            pdfContext = mapData.pdfContext;

            // Also store it back in memory for next time
            const { setPdfContext } = await import('@/lib/pdf-context-store');
            setPdfContext(input.sessionId, pdfContext as any);
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch PDF context from Firestore:', err);
        }
      }
    }

    const result = await chatWithAssistant({
      ...input,
      ...options,
      pdfContext,
      apiKey: effectiveApiKey
    });
    return { response: result, error: null };
  } catch (error) {
    console.error(error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      response: null,
      error: `Failed to get chat response. ${errorMessage}`,
    };
  }
}

/**
 * Server action to translate a mind map to a target language.
 * @param {TranslateMindMapInput} input - The input containing the mind map data and the target language.
 * @returns {Promise<{ translation: TranslateMindMapOutput | null; error: string | null }>} An object with either the translated mind map or an error message.
 */
export async function translateMindMapAction(
  input: TranslateMindMapInput,
  options: AIActionOptions = {}
): Promise<{ translation: MindMapData | null; error: string | null }> {
  try {
    const effectiveApiKey = await resolveApiKey(options);
    const result = await translateMindMap({ ...input, ...options, apiKey: effectiveApiKey });
    if (!result) return { translation: null, error: 'AI failed to get translation.' };
    const sanitized = await mapToMindMapData(result);
    return { translation: sanitized, error: null };
  } catch (error) {
    console.error(error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      translation: null,
      error: `Failed to translate mind map. ${errorMessage}`,
    };
  }
}

/**
 * Server action to get a real-life example for a mind map node.
 * @param {ExplainWithExampleInput} input - The input containing the topic name and main topic.
 * @returns {Promise<{ example: ExplainWithExampleOutput | null; error: string | null }>} An object with the example or an error.
 */
export async function explainWithExampleAction(
  input: ExplainWithExampleInput & { usePdfContext?: boolean; pdfContext?: string },
  options: { apiKey?: string; provider?: AIProvider } = {}
): Promise<{ example: ExplainWithExampleOutput | null; error: string | null }> {
  try {
    const cacheKey = `example_${input.topicName}_${input.mainTopic}_${input.explanationMode}_${input.usePdfContext ? 'aware' : 'simple'}`;
    const cached = apiCache.get<ExplainWithExampleOutput>(cacheKey);
    if (cached) {
      console.log(`⚡ Returning cached ${input.explanationMode} example for: ${input.topicName}`);
      return { example: cached, error: null };
    }

    const effectiveApiKey = await resolveApiKey(options);

    let pdfContext = input.pdfContext;
    if (input.usePdfContext && !pdfContext && input.mainTopic) {
      const { getPdfContext } = await import('@/lib/pdf-context-store');

      // Try memory store first
      const ctx = getPdfContext(input.mainTopic);
      pdfContext = ctx ? JSON.stringify(ctx) : undefined;

      // We'll skip fallback to Firestore here to avoid Firebase Admin issues locally
      // unless we're in production or have credentials. 
      // The client should ideally pass the context now.
    }

    const result = await explainWithExample({ ...input, ...options, apiKey: effectiveApiKey, pdfContext });

    if (result) {
      apiCache.set(cacheKey, result);
    }

    return { example: result, error: null };
  } catch (error) {
    console.error('Error in explainWithExampleAction:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      example: null,
      error: `Failed to get example. ${errorMessage}`,
    };
  }
}

/**
 * Server action to summarize a chat history into a topic.
 * @param {SummarizeChatInput} input - The chat history to summarize.
 * @returns {Promise<{ summary: SummarizeChatOutput | null; error: string | null }>} The generated topic or an error.
 */
export async function summarizeChatAction(
  input: SummarizeChatInput,
  options: { apiKey?: string; provider?: AIProvider } = {}
): Promise<{ summary: SummarizeChatOutput | null; error: string | null }> {
  try {
    const effectiveApiKey = await resolveApiKey(options);
    const result = await summarizeChat({ ...input, ...options, apiKey: effectiveApiKey });
    return { summary: result, error: null };
  } catch (error) {
    console.error(error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      summary: null,
      error: `Failed to summarize chat. ${errorMessage}`,
    };
  }
}

/**
 * Server action to generate a concise summary for the entire mind map.
 */
export async function summarizeTopicAction(
  input: { mindMapData: MindMapData },
  options: AIActionOptions = {}
): Promise<{ summary: string | null; error: string | null }> {
  try {
    // Determine a stable key: could hash the data, but for simplicity we'll use topic length or specific ID (here using topic name and length as proxy)
    const topicName = input.mindMapData.topic.substring(0, 50);
    // Rough estimate of tree size to know if we are caching the same map
    const mapSizeHash = JSON.stringify(input.mindMapData).length;
    const cacheKey = `summary_${topicName}_${mapSizeHash}`;

    const cached = apiCache.get<{ summary: string }>(cacheKey);
    if (cached) {
      console.log(`⚡ Returning cached summary for: ${topicName}`);
      return { summary: cached.summary, error: null };
    }

    const effectiveApiKey = await resolveApiKey(options);
    const result = await summarizeTopic({ ...input, ...options, apiKey: effectiveApiKey });

    if (result && result.summary) {
      apiCache.set(cacheKey, { summary: result.summary });
    }

    return { summary: result.summary, error: null };
  } catch (error) {
    console.error('Error in summarizeTopicAction:', error);
    return {
      summary: null,
      error: error instanceof Error ? error.message : 'Failed to generate summary.',
    };
  }
}




/**
 * Server action to enhance a user's prompt for image generation.
 * @param {EnhanceImagePromptInput} input - The user's original prompt.
 * @returns {Promise<{ enhancedPrompt: EnhanceImagePromptOutput | null; error: string | null }>} The enhanced prompt or an error.
 */
export async function enhanceImagePromptAction(
  input: EnhanceImagePromptInput,
  options: AIActionOptions = {}
): Promise<{
  enhancedPrompt: EnhanceImagePromptOutput | null;
  error: string | null;
}> {
  try {
    const effectiveApiKey = await resolveApiKey(options);
    const result = await enhanceImagePrompt({ ...input, ...options, apiKey: effectiveApiKey });
    return { enhancedPrompt: result, error: null };
  } catch (error) {
    console.error('Error in enhanceImagePromptAction:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      enhancedPrompt: null,
      error: `Failed to enhance prompt: ${errorMessage}`,
    };
  }
}







/**
 * Server action to generate related questions based on the current context.
 * @param {RelatedQuestionsInput} input - The context for generating related questions.
 * @returns {Promise<{ data: RelatedQuestionsOutput | null; error: string | null }>} The generated questions or an error.
 */
export async function generateRelatedQuestionsAction(
  input: RelatedQuestionsInput & { usePdfContext?: boolean; pdfContext?: string },
  options: AIActionOptions = {}
): Promise<{ data: RelatedQuestionsOutput | null; error: string | null }> {
  try {
    const effectiveApiKey = await resolveApiKey(options);

    let pdfContext = input.pdfContext;
    if (input.usePdfContext && !pdfContext && input.topic) {
      const { getPdfContext } = await import('@/lib/pdf-context-store');
      const ctx = getPdfContext(input.topic);
      pdfContext = ctx ? JSON.stringify(ctx) : undefined;
    }

    const result = await generateRelatedQuestions({ ...input, ...options, apiKey: effectiveApiKey, pdfContext });
    return { data: result, error: null };
  } catch (error) {
    console.error('Error in generateRelatedQuestionsAction:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      data: null,
      error: `Failed to generate related questions: ${errorMessage}`,
    };
  }
}

export async function getAIHealthReportAction() {
  return providerMonitor.getReport();
}

/**
 * Server action to generate a comparison mind map between two topics.
 * @param {GenerateComparisonMapInput} input - The input containing two topics.
 * @param {boolean} input.useSearch - Optional flag to enable Google Search for both topics
 * @returns {Promise<{ data: GenerateComparisonMapOutputV2 | null; error: string | null }>}
 */
export async function generateComparisonMapAction(
  input: GenerateComparisonMapInput & { useSearch?: boolean },
  options: { apiKey?: string; provider?: AIProvider; userId?: string; model?: string } = {}
): Promise<{ data: CompareMindMapData | null; error: string | null }> {
  // TODO: Validate Firebase ID token server-side before invoking AI

  if (!input.topic1 || !input.topic2) {
    return { data: null, error: 'Both topics are required for comparison.' };
  }

  if (input.topic1.trim().toLowerCase() === input.topic2.trim().toLowerCase()) {
    return { data: null, error: 'Topics must be different to generate a comparison.' };
  }

  try {
    const effectiveApiKey = await resolveApiKey(options);
    let searchContextA = null;
    let searchContextB = null;

    // Generate search contexts for both topics if requested
    if (input.useSearch) {
      console.log(`🔍 Search enabled for comparison: "${input.topic1}" vs "${input.topic2}"`);

      // Execute searches in parallel for better performance
      const [searchResultA, searchResultB] = await Promise.all([
        generateSearchContext({
          query: input.topic1,
          depth: input.depth === 'deep' ? 'deep' : 'basic',
          apiKey: effectiveApiKey,
          provider: options.provider,
        }),
        generateSearchContext({
          query: input.topic2,
          depth: input.depth === 'deep' ? 'deep' : 'basic',
          apiKey: effectiveApiKey,
          provider: options.provider,
        }),
      ]);

      if (searchResultA.data) {
        searchContextA = searchResultA.data;
        console.log(`✅ Search context A retrieved: ${searchContextA.sources.length} sources`);
      } else {
        console.warn(`⚠️ Search A failed: ${searchResultA.error}`);
      }

      if (searchResultB.data) {
        searchContextB = searchResultB.data;
        console.log(`✅ Search context B retrieved: ${searchContextB.sources.length} sources`);
      } else {
        console.warn(`⚠️ Search B failed: ${searchResultB.error}`);
      }
    }

    const result = await generateComparisonMapV2({
      ...input,
      searchContextA,
      searchContextB,
      ...options,
      apiKey: effectiveApiKey
    });

    if (!result) return { data: null, error: 'AI failed to generate comparison.' };

    const sanitized = await mapToMindMapData(result, input.depth || 'low');
    sanitized.aiPersona = input.persona as string || 'Teacher';

    // Attach search metadata if search was used
    if (searchContextA || searchContextB) {
      // Store search sources in the mind map data
      // We'll use a combined array for now, could be separated in the future
      const allSources = [
        ...(searchContextA?.sources || []),
        ...(searchContextB?.sources || []),
      ];
      if (allSources.length > 0) {
        sanitized.searchSources = allSources;
        sanitized.searchTimestamp = searchContextA?.timestamp || searchContextB?.timestamp || new Date().toISOString();
      }
    }

    return { data: sanitized as CompareMindMapData, error: null };
  } catch (error) {
    console.error('Error in generateComparisonMapAction:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      data: null,
      error: `Failed to generate comparison map: ${errorMessage}`,
    };
  }
}
/**
 * Server action to generate a quiz based on a topic and optional mind map data.
 */
export async function generateQuizAction(
  input: GenerateQuizInput & { usePdfContext?: boolean; pdfContext?: string },
  options: { apiKey?: string; provider?: AIProvider } = {}
): Promise<{ data: Quiz | null; error: string | null }> {
  try {
    const effectiveApiKey = await resolveApiKey(options);

    let pdfContext = input.pdfContext;
    if (input.usePdfContext && !pdfContext && input.topic) {
      const { getPdfContext } = await import('@/lib/pdf-context-store');

      // Try memory store first
      const ctx = getPdfContext(input.topic);
      pdfContext = ctx ? JSON.stringify(ctx) : undefined;

      // Skipping fallback to Firestore Admin lookup locally
    }

    const result = await generateQuizFlow({ ...input, ...options, apiKey: effectiveApiKey, pdfContext });
    return { data: result, error: null };
  } catch (error) {
    console.error('Error in generateQuizAction:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to generate quiz.',
    };
  }
}


/**
 * Server action to log administrative activity.
 * Bypasses client-side security rules by using the Admin SDK.
 * Also performs incremental stats updates for real-time dashboarding.
 */
export async function logAdminActivityAction(entry: any) {
  try {
    const { initializeFirebaseServer } = await import('@/firebase/server');
    const { firestore, admin } = initializeFirebaseServer();
    if (!firestore || !admin) throw new Error('Firestore/Admin not initialized');

    const timestamp = entry.timestamp || new Date().toISOString();
    const dateObj = new Date(timestamp);
    const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
    const monthStr = dateStr.substring(0, 7); // YYYY-MM

    // 1. Record the activity log
    await firestore.collection('adminActivityLog').add({
      ...entry,
      timestamp,
    });

    // 2. Perform incremental stats updates if applicable
    const type = entry.type;
    const increments: Record<string, any> = {};

    if (type === 'MAP_CREATED') {
      // totalMindmapsEver: always increment — counts every map ever generated, never decreases
      increments.totalMindmapsEver = admin.firestore.FieldValue.increment(1);
      increments.newMapsToday = admin.firestore.FieldValue.increment(1);
      // totalMindmaps (current library): only increment for root maps, not sub-maps
      // Sub-maps have isSubMap:true in metadata — skip them to avoid inflating the live count
      const isSubMap = entry.metadata?.isSubMap === true || !!entry.metadata?.parentMapId;
      if (!isSubMap) {
        increments.totalMindmaps = admin.firestore.FieldValue.increment(1);
      }
    } else if (type === 'USER_CREATED') {
      increments.totalUsers = admin.firestore.FieldValue.increment(1);
      increments.newUsersToday = admin.firestore.FieldValue.increment(1);
    } else if (type === 'LOGIN') {
      increments.activeUsers = admin.firestore.FieldValue.increment(1);
    } else if (type === 'MAP_DELETED') {
      // Only decrement totalMindmaps (current library) — totalMindmapsEver never decreases
      increments.totalMindmaps = admin.firestore.FieldValue.increment(-1);
    } else if (type === 'CHAT_CREATED') {
      increments.totalChats = admin.firestore.FieldValue.increment(1);
    }

    if (Object.keys(increments).length > 0) {
      const statsBatch = firestore.batch();
      
      // Update All-Time stats
      const allTimeRef = firestore.collection('adminStats').doc('all-time');
      statsBatch.set(allTimeRef, { 
        ...increments, 
        lastUpdated: Date.now(),
        timestamp: new Date().toISOString() 
      }, { merge: true });

      // Update Daily stats
      const dailyRef = firestore.collection('adminStats').doc(`daily_${dateStr}`);
      statsBatch.set(dailyRef, { 
        ...increments,
        date: dateStr,
        lastUpdated: Date.now(),
        timestamp: new Date().toISOString()
      }, { merge: true });

      // Update Monthly stats
      const monthlyRef = firestore.collection('adminStats').doc(`monthly_${monthStr}`);
      statsBatch.set(monthlyRef, { 
        ...increments,
        month: monthStr,
        lastUpdated: Date.now(),
        timestamp: new Date().toISOString()
      }, { merge: true });

      await statsBatch.commit();
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in logAdminActivityAction:', error);
    return { success: false, error: error.message };
  }
}
