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
import { synthesizeNodes } from '@/ai/flows/synthesize-nodes';
import { generateRelatedQuestions } from '@/ai/flows/generate-related-questions';
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
  RelatedQuestionsInput,
} from '@/ai/flows/generate-related-questions';
import { RelatedQuestionsOutput } from '@/ai/schemas/related-questions-schema';
import {
  generateComparisonMapV2,
  GenerateComparisonMapOutputV2,
} from '@/ai/compare/flow';
import { GenerateComparisonMapInput } from '@/ai/compare/schema';
import { MindMapData, SingleMindMapData, CompareMindMapData, SubTopic, Category, SubCategory, DepthSuggestion, DepthAnalysis } from '@/types/mind-map';

import { generateSearchContext } from './actions/generateSearchContext';
import { awardPoints } from '@/lib/points-engine';

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
function stableId(id: string | undefined, prefix: string, name: string): string {
  if (id) return id;
  let hash = 0;
  const key = `${prefix}-${name}`;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  return `${prefix}-${Math.abs(hash).toString(36)}`;
}

export async function mapToMindMapData(raw: any, depth: 'low' | 'medium' | 'deep' = 'low'): Promise<MindMapData> {
  // SAFETY: Do NOT spread raw AI output into the result — use only known fields
  // to prevent unexpected properties from leaking through.

  if (raw.mode === 'compare' || raw.compareData) {
    const unityNexusLength = raw.compareData?.unityNexus?.length || raw.similarities?.length || 0;
    const dimensionsLength = raw.compareData?.dimensions?.length || 0;
    const nodeCount = 1 + unityNexusLength + dimensionsLength;

    if (raw.compareData) {
      return {
        mode: 'compare' as const,
        depth,
        nodeCount,
        topic: raw.topic || 'Comparison',
        icon: raw.icon || 'git-compare',
        createdAt: raw.createdAt || raw.created_at || Date.now(),
        updatedAt: raw.updatedAt || raw.updated_at || Date.now(),
        shortTitle: raw.short_title || raw.shortTitle || raw.content?.shortTitle,
        compareData: {
          ...raw.compareData,
          unityNexus: (raw.compareData.unityNexus || []).map((n: any) => ({
            ...n,
            id: stableId(n.id, 'nexus', n.title || n.name || '')
          })),
          dimensions: (raw.compareData.dimensions || []).map((d: any) => ({ ...d }))
        }
      } as CompareMindMapData;
    }

    return {
      mode: 'compare' as const,
      depth,
      nodeCount,
      topic: raw.topic || 'Comparison',
      icon: raw.icon || 'git-compare',
      createdAt: raw.createdAt || raw.created_at || Date.now(),
      updatedAt: raw.updatedAt || raw.updated_at || Date.now(),
      shortTitle: raw.short_title || raw.shortTitle || raw.content?.shortTitle,
      compareData: {
        root: raw.root || { title: raw.topic || 'Comparison' },
        unityNexus: (raw.similarities || []).map((n: any) => ({ ...n, id: stableId(n.id, 'nexus', n.title || n.name || '') })),
        dimensions: [],
        synthesisHorizon: { expertVerdict: '', futureEvolution: '' },
        relevantLinks: raw.relevantLinks || []
      }
    } as CompareMindMapData;
  }

  // Handle single mode — compute node count during mapping to avoid a second iteration
  let nodeCount = 1; // start with root

  const mappedSubTopics = (raw.subTopics || []).map((st: any): SubTopic => {
    const normalizedName = (st.name || '').trim().replace(/[:.!?]$/, '');
    nodeCount++; // add subtopic
    return {
      name: normalizedName,
      icon: st.icon || 'flag',
      insight: st.insight || '',
      id: stableId(st.id, 'topic', normalizedName),
      categories: (st.categories || []).map((cat: any): Category => {
        const catName = (cat.name || '').trim().replace(/[:.!?]$/, '');
        nodeCount++; // add category
        return {
          name: catName,
          icon: cat.icon || 'folder',
          insight: cat.insight || '',
          id: stableId(cat.id, 'cat', catName),
          subCategories: (cat.subCategories || [])
            .map((sub: any) => {
              if (typeof sub === 'string') {
                const subContent = sub.trim().replace(/[:.!?]$/, '');
                return { name: subContent, description: `Details about ${subContent}`, icon: 'book-open', tags: [] };
              }
              return sub;
            })
            .filter((sub: any) => sub && typeof sub.name === 'string' && sub.name.trim() !== '')
            .map((sub: any): SubCategory => {
              nodeCount++; // add subcategory
              return {
                name: (sub.name || '').trim().replace(/[:.!?]$/, ''),
                description: sub.description || '',
                icon: sub.icon || 'book-open',
                tags: Array.isArray(sub.tags) ? sub.tags : [],
                id: stableId(sub.id, 'sub', sub.name || ''),
                isExpanded: false
              };
            })
        };
      })
    };
  });

  return {
    mode: 'single' as const,
    depth,
    nodeCount,
    topic: raw.topic || 'Mind Map',
    icon: raw.icon || 'brain-circuit',
    thought: raw.thought,
    userId: raw.userId,
    uid: raw.uid,
    parentMapId: raw.parentMapId,
    createdAt: raw.createdAt || raw.created_at || Date.now(),
    updatedAt: raw.updatedAt || raw.updated_at || Date.now(),
    summary: raw.summary,
    summaryAudioUrl: raw.summaryAudioUrl,
    thumbnailUrl: raw.thumbnailUrl,
    thumbnailPrompt: raw.thumbnailPrompt,
    isPublic: raw.isPublic,
    isShared: raw.isShared,
    publicCategories: raw.publicCategories,
    views: raw.views,
    publicViews: raw.publicViews,
    originalAuthorId: raw.originalAuthorId,
    authorName: raw.authorName,
    authorAvatar: raw.authorAvatar,
    searchSources: raw.searchSources,
    searchImages: raw.searchImages,
    searchTimestamp: raw.searchTimestamp,
    pdfContext: raw.pdfContext,
    sourceFileContent: raw.sourceFileContent,
    sourceFileType: raw.sourceFileType,
    originalPdfFileContent: raw.originalPdfFileContent,
    sourceFile2Content: raw.sourceFile2Content,
    sourceFile2Type: raw.sourceFile2Type,
    sourceUrl: raw.sourceUrl,
    videoId: raw.videoId,
    sourceType: raw.sourceType,
    categoriesCount: raw.categoriesCount,
    sourcesCount: raw.sourcesCount,
    aiPersona: raw.aiPersona,
    explanations: raw.explanations,        nestedExpansions: (raw.nestedExpansions || []).map((ne: any) => ({
      id: ne.id,
      parentName: ne.parentName,
      topic: ne.topic,
      icon: ne.icon,
      createdAt: ne.createdAt,
      depth: ne.depth,
      path: ne.path,
      status: ne.status,
      fullData: ne.fullData || undefined,
      subCategories: (ne.subCategories || []).map((sub: any) => ({
        name: sub.name,
        description: sub.description,
        icon: sub.icon,
        tags: Array.isArray(sub.tags) ? sub.tags : []
      }))
    })),
    savedImages: raw.savedImages,
    subTopics: mappedSubTopics
  } as SingleMindMapData;
}

export interface GenerateMindMapFromImageInput {
  imageDataUri: string;
  targetLang?: string;
  persona?: string;
  depth?: 'low' | 'medium' | 'deep';
  sessionId?: string;
  context?: string;
}

/**
 * Internal helper to resolve the effective API key for AI generation.
 * Prioritizes explicitly provided keys, then user-specific keys from supabase, 
 * and finally falls back to server-side environmental variables.
 */
// Server-side API key cache: userId -> { key, timestamp }
// Avoids repeated supabase reads for the same user within a short window
// Evicts entries older than TTL on every access
const apiKeyCache = new Map<string, { key: string | undefined; timestamp: number }>();
const API_KEY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Periodically sweep stale entries to prevent unbounded growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - API_KEY_CACHE_TTL;
    for (const [key, entry] of apiKeyCache.entries()) {
      if (entry.timestamp < cutoff) apiKeyCache.delete(key);
    }
  }, 5 * 60 * 1000);
}

export async function resolveApiKey(options: AIActionOptions): Promise<string | undefined> {
  let effectiveApiKey = options.apiKey;
  let source = effectiveApiKey ? 'options' : 'none';

  // If no API key provided, try to fetch from user profile on server
  if (!effectiveApiKey && options.userId && (options.provider === 'pollinations' || !options.provider)) {
    // Check cache first
    const cached = apiKeyCache.get(options.userId);
    if (cached && Date.now() - cached.timestamp < API_KEY_CACHE_TTL) {
      effectiveApiKey = cached.key;
      source = 'supabase-cache';
    } else {
      try {
        const { getUserImageSettingsAdmin } = await import('@/lib/supabase-server');
        if (typeof getUserImageSettingsAdmin !== 'function') {
          throw new Error('getUserImageSettingsAdmin is not a function');
        }
        const userSettings = await getUserImageSettingsAdmin(options.userId);
        if (userSettings?.pollinationsApiKey) {
          effectiveApiKey = userSettings.pollinationsApiKey;
          source = 'supabase-admin';
          // Cache the result
          apiKeyCache.set(options.userId, { key: effectiveApiKey, timestamp: Date.now() });
          console.log(`🔑 Using Pollinations API key from supabase Admin for user: ${options.userId}`);
        } else {
          // Cache the miss too (avoid repeated supabase reads for users without keys)
          apiKeyCache.set(options.userId, { key: undefined, timestamp: Date.now() });
        }
      } catch (err: any) {
        console.warn(`⚠️ resolveApiKey: Failed to fetch user API key from supabase Admin (${err.message}). Using server default.`);
      }
    }
  }

  // Use server-side environment variable as primary default
  if (!effectiveApiKey) {
    effectiveApiKey = process.env.POLLINATIONS_API_KEY;
    if (effectiveApiKey) {
      source = 'system-default';
      console.log(`ℹ️ No user API key found for ${options.userId || 'anonymous'}. Using System Default Pollinations key.`);
    }
  }

  const masked = effectiveApiKey ? `${effectiveApiKey.slice(0, 6)}...${effectiveApiKey.slice(-4)}` : 'none';
  console.log(`🔑 resolveApiKey -> [${source}] ${effectiveApiKey ? 'Success' : 'Missing'} (key: ${masked})`);

  return effectiveApiKey;
}

const KEYWORD_CATEGORIES = {
  technical: [
    'react', 'angular', 'vue', 'javascript', 'typescript', 'python', 'java', 'rust', 'golang',
    'api', 'rest', 'graphql', 'database', 'sql', 'nosql', 'mongodb', 'postgresql',
    'algorithm', 'data structure', 'compiler', 'interpreter', 'runtime', 'framework',
    'kubernetes', 'docker', 'devops', 'ci/cd', 'microservice', 'serverless',
    'aws', 'azure', 'gcp', 'cloud', 'infrastructure', 'deployment',
    'authentication', 'authorization', 'encryption', 'security', 'vulnerability',
  ],
  academic: [
    'theory', 'analysis', 'principles', 'framework', 'methodology', 'paradigm',
    'research', 'study', 'examination', 'investigation', 'systematic',
    'concept', 'model', 'approach', 'perspective', 'viewpoint',
    'philosophy', 'epistemology', 'metaphysics', 'ethics', 'aesthetics',
    'sociology', 'psychology', 'anthropology', 'political science',
  ],
  scientific: [
    'physics', 'chemistry', 'biology', 'quantum', 'thermodynamics', 'relativity',
    'genetics', 'genomics', 'molecular', 'cellular', 'biochemistry',
    'neuroscience', 'astronomy', 'astrophysics', 'cosmology', 'geology',
    'evolution', 'ecology', 'physiology', 'anatomy', 'pharmacology',
    'thermodynamics', 'mechanics', 'electromagnetism', 'optics',
  ],
  business: [
    'strategy', 'management', 'optimization', 'enterprise', 'corporate',
    'marketing', 'branding', 'advertising', 'sales', 'revenue',
    'investment', 'portfolio', 'venture', 'acquisition', 'merger',
    'leadership', 'organizational', 'hierarchical', 'restructuring',
    'competitive', 'market share', 'revenue model', 'profitability',
  ],
  complex: [
    'consciousness', 'conscious', 'intelligence', 'cognition', 'cognition',
    'emergence', 'complexity', 'nonlinear', 'chaos', 'entropy',
    'artificial intelligence', 'machine learning', 'deep learning', 'neural network',
    'cognitive science', 'computational', 'nanotechnology', 'biotechnology',
    'cryptocurrency', 'blockchain', 'quantum computing', 'string theory',
    'socioeconomic', 'geopolitical', 'existentialism', 'phenomenology',
    'climate change', 'global warming', 'sustainable', 'ecosystem',
  ],
};

const LOW_TOPICS = new Set([
  'hello world', 'apple', 'banana', 'cat', 'dog', 'sun', 'moon', 'star',
  'water', 'fire', 'earth', 'wind', 'tree', 'flower', 'bird', 'leaf',
  'fish', 'car', 'book', 'pen', 'chair', 'table', 'house', 'phone',
  'color', 'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink',
  'number', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'food', 'rice', 'bread', 'meat', 'fruit', 'vegetable', 'coffee', 'tea',
  'time', 'day', 'night', 'morning', 'evening', 'hour', 'minute',
  'money', 'coin', 'paper', 'pencil', 'bag', 'shoe', 'hat', 'shirt', 'pants',
]);

export async function analyzeTopicComplexity(topic: string): Promise<DepthAnalysis> {
  const t = topic.toLowerCase().trim();
  const words = t.split(/\s+/);
  const wordCount = words.length;
  const charCount = t.length;
  
  const scores = {
    technical: 0,
    academic: 0,
    scientific: 0,
    business: 0,
    complexity: 0,
    multiConcept: 0,
    questionType: 'none' as 'how' | 'what' | 'why' | 'comparison' | 'none',
  };

  for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
    for (const keyword of keywords) {
      if (t.includes(keyword)) {
        scores[category as keyof Omit<DepthAnalysis, 'questionType'>] += 1;
      }
    }
  }

  if (/\b(how|how to|how do|how does)\b/i.test(t)) {
    scores.questionType = 'how';
  } else if (/\b(what|what is|what are|what does)\b/i.test(t)) {
    scores.questionType = 'what';
  } else if (/\b(why|why do|why does|why is)\b/i.test(t)) {
    scores.questionType = 'why';
  }

  if (/\b(and|vs|versus|comparison|between|compare|difference|vs\.?)\b/i.test(t)) {
    scores.multiConcept = wordCount;
  }

  return scores;
}

export async function getSuggestedItemCount(depth: 'low' | 'medium' | 'deep', analysis: DepthAnalysis): Promise<{ min: number; max: number; label: string }> {
  const baseRanges = {
    low: { min: 24, max: 40, label: 'Quick Overview' },
    medium: { min: 60, max: 90, label: 'Balanced Exploration' },
    deep: { min: 100, max: 150, label: 'Deep Knowledge Dive' },
  };

  const base = baseRanges[depth];
  const bonus = Math.min(30, analysis.complexity * 5 + analysis.multiConcept * 2);

  return {
    min: base.min + bonus,
    max: base.max + bonus,
    label: base.label,
  };
}

/**
 * Fast rule-based complexity analyzer with confidence scoring.
 * Replaces the LLM-based resolveDepth() which added 5-15s per generation.
 * Returns a DepthSuggestion with depth, confidence, reasons, and suggested item count.
 */
export async function resolveDepthFast(
  topic: string,
): Promise<'low' | 'medium' | 'deep'> {
  const suggestion = await resolveDepthWithConfidence(topic);
  return suggestion.depth;
}

export async function resolveDepthWithConfidence(topic: string): Promise<DepthSuggestion> {
  const t = topic.toLowerCase().trim();
  const wordParts = t.split(/\s+/);
  const words = wordParts.length;
  const charCount = t.length;
  const analysis = await analyzeTopicComplexity(t);
  const reasons: string[] = [];
  let depthScore = 0;
  let confidence = 50;

  if (charCount <= 15 && words <= 2) {
    reasons.push('Simple, short topic');
    depthScore -= 2;
    confidence += 20;
  }

  if (LOW_TOPICS.has(t) || (wordParts[0] && LOW_TOPICS.has(wordParts[0]))) {
    reasons.push('Common everyday topic');
    depthScore -= 2;
    confidence += 15;
  }

  const complexScore = analysis.complexity;
  if (complexScore >= 2) {
    reasons.push('Highly complex domain');
    depthScore += 3;
    confidence += 25;
  } else if (complexScore >= 1) {
    reasons.push('Complex subject matter');
    depthScore += 2;
    confidence += 15;
  }

  const techScore = analysis.technical;
  if (techScore >= 3) {
    reasons.push('Technical topic requiring depth');
    depthScore += 2;
    confidence += 15;
  } else if (techScore >= 1) {
    reasons.push('Technical subject');
    depthScore += 1;
    confidence += 10;
  }

  const academicScore = analysis.academic;
  if (academicScore >= 2) {
    reasons.push('Academic/theoretical topic');
    depthScore += 2;
    confidence += 15;
  } else if (academicScore >= 1) {
    reasons.push('Scholarly subject');
    depthScore += 1;
    confidence += 10;
  }

  const scientificScore = analysis.scientific;
  if (scientificScore >= 2) {
    reasons.push('Scientific domain');
    depthScore += 2;
    confidence += 15;
  } else if (scientificScore >= 1) {
    reasons.push('Scientific subject');
    depthScore += 1;
    confidence += 10;
  }

  const businessScore = analysis.business;
  if (businessScore >= 2) {
    reasons.push('Business strategy topic');
    depthScore += 1;
    confidence += 10;
  }

  if (analysis.multiConcept > 0) {
    reasons.push('Multi-concept comparison');
    depthScore += Math.min(2, analysis.multiConcept / 2);
    confidence += 15;
  }

  if (analysis.questionType === 'why') {
    reasons.push('Explanatory question');
    depthScore += 1;
    confidence += 5;
  } else if (analysis.questionType === 'how') {
    reasons.push('Procedural topic');
    depthScore += 0.5;
    confidence += 5;
  }

  if (words >= 6) {
    reasons.push('Complex multi-word topic');
    depthScore += 1;
    confidence += 10;
  }

  confidence = Math.min(95, Math.max(40, confidence));

  let depth: 'low' | 'medium' | 'deep';
  if (depthScore >= 2) {
    depth = 'deep';
  } else if (depthScore >= 0) {
    depth = 'medium';
  } else {
    depth = 'low';
  }

  if (reasons.length === 0) {
    reasons.push('Average complexity topic');
    confidence = 60;
  }

  return {
    depth,
    confidence,
    reasons,
    suggestedItems: await getSuggestedItemCount(depth, analysis),
  };
}


function normalizeDepth(d: string | undefined): 'low' | 'medium' | 'deep' {
  if (!d) return 'medium';
  const clean = d.toLowerCase().trim();
  if (clean === 'low' || clean === 'quick') return 'low';
  if (clean === 'deep' || clean === 'detailed') return 'deep';
  return 'medium';
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

    const effectiveApiKey = await resolveApiKey(options);
    const rawDepth = input.depth || 'auto';
    let normalizedDepth: 'low' | 'medium' | 'deep';
    if (rawDepth === ('auto' as any)) {
      normalizedDepth = await resolveDepthFast(topic);
    } else {
      normalizedDepth = normalizeDepth(String(rawDepth));
    }

    if (input.context) {
      console.log(`📝 [Action] Context provided (${input.context.length} chars) for topic: "${topic}"`);
    }

    let searchContext = null;
    if (input.useSearch) {
      try {
        console.log(`🔍 [Action] Waiting for search context for: "${topic}"`);
        const searchResult = await generateSearchContext({
          query: topic,
          depth: normalizedDepth === 'deep' ? 'deep' : 'basic',
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

    const generationResult = await generateMindMap({
      ...input,
      topic,
      depth: normalizedDepth === 'low' ? 'quick' as const : (normalizedDepth === 'deep' ? 'detailed' as const : 'balanced' as const),
      searchContext, 
      ...options,
      apiKey: effectiveApiKey,
      capability: normalizedDepth === 'deep' ? 'reasoning' : (normalizedDepth === 'medium' ? 'creative' : 'fast') 
    });

    if (!generationResult) return { data: null, error: 'AI failed to generate content.' };

    const sanitized = await mapToMindMapData(generationResult, normalizedDepth);
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
const balanceCache = new Map<string, { balance: number | null; error: string | null; timestamp: number }>();

// Periodic sweep to prevent balanceCache memory leak
// Also evicts stale entries on access for immediate cleanup
function sweepBalanceCache() {
  const cutoff = Date.now() - 60000;
  for (const [key, entry] of balanceCache.entries()) {
    if (entry.timestamp < cutoff) balanceCache.delete(key);
  }
}

if (typeof setInterval !== 'undefined') {
  setInterval(sweepBalanceCache, 60000);
}

export async function checkPollenBalanceAction(
  options: { apiKey?: string; userId?: string } = {}
): Promise<{ balance: number | null; error: string | null }> {
  try {
    const effectiveApiKey = await resolveApiKey(options);

    if (!effectiveApiKey) {
      return { balance: null, error: 'No API key provided. Please check your settings.' };
    }

    const cacheKey = effectiveApiKey;
    const now = Date.now();
    const cached = balanceCache.get(cacheKey);
    if (cached && now - cached.timestamp < 15000) {
      return { balance: cached.balance, error: cached.error };
    }

    let checkPollinationsBalance;
    try {
      const pollinationsModule = await import('@/ai/pollinations-client');
      checkPollinationsBalance = pollinationsModule.checkPollinationsBalance;
      if (typeof checkPollinationsBalance !== 'function') {
        throw new Error('checkPollinationsBalance is not a function in the imported module');
      }
    } catch (importErr: any) {
      console.error('❌ Failed to import pollinations-client:', importErr.message);
      return { balance: null, error: `Critical error: AI client configuration issue. Please contact support.` };
    }

    const balance = await checkPollinationsBalance(effectiveApiKey);
    if (balance === null) {
        const result = { balance: null, error: 'Authorization failed or account balance is empty.' };
        balanceCache.set(cacheKey, { ...result, timestamp: now });
        return result;
    }
    const result = { balance, error: null };
    balanceCache.set(cacheKey, { ...result, timestamp: now });
    return result;
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
    const rawDepth = input.depth || 'auto';
    const depth = (rawDepth === 'auto')
      ? await resolveDepthFast(input.text.substring(0, 200))
      : normalizeDepth(String(rawDepth));
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
    const rawDepth = input.depth || 'auto';
    const depth = (rawDepth === 'auto')
      ? await resolveDepthFast(input.text.substring(0, 300))
      : normalizeDepth(String(rawDepth));
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
    context?: string;
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

    const validDepths = ['low', 'medium', 'deep'] as const;
    const safeDepth = validDepths.includes(input.depth as any)
      ? (input.depth as 'low' | 'medium' | 'deep')
      : 'low';

    const sanitized = await mapToMindMapData(result.data, safeDepth);
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
    const rawDepth = input.depth || 'auto';
    const depth = (rawDepth === 'auto')
      ? await resolveDepthFast(extractionResult.title || input.url)
      : normalizeDepth(String(rawDepth));

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
      
      const subTopicCount = result.data.mode === 'single' ? (result.data as SingleMindMapData).subTopics?.length || 0 : (result.data as any).compareData?.unityNexus?.length || 0;
      const answerText = `🗺️ **Mind Map Created: "${topic}"**\n\nYour mind map has been generated with ${subTopicCount} main topics. Click to view the full interactive map.`;
      
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

      if (!pdfContext && input.sessionId && !input.sessionId.startsWith('session-')) {
        try {
          const { getMindMapAdmin } = await import('@/lib/supabase-server');
          const mapData = await getMindMapAdmin(input.sessionId);
          if (mapData && mapData.pdfContext) {
            console.log(`🧠 chatAction: Retrieved PDF context from supabase for doc ${input.sessionId}`);
            pdfContext = mapData.pdfContext;

            // Also store it back in memory for next time
            const { setPdfContext } = await import('@/lib/pdf-context-store');
            setPdfContext(input.sessionId, pdfContext as any);
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch PDF context from supabase:', err);
        }
      }
    }

    const result = await chatWithAssistant({
      ...input,
      ...options,
      pdfContext,
      apiKey: effectiveApiKey
    });
    return { 
      response: { 
        answer: result.answer,
        reasoning: result.reasoning,
        thoughtChain: result.thoughtChain 
      }, 
      error: null 
    };
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

/**
 * Server action to generate topic-specific FAQs for the canvas page.
 * Returns an array of { question, answer } items relevant to the given topic.
 */
export async function generateTopicFAQsAction(
  input: { topic: string; summary?: string },
  options: AIActionOptions = {}
): Promise<{ data: Array<{ question: string; answer: string }> | null; error: string | null }> {
  try {
    const effectiveApiKey = await resolveApiKey(options);
    const { generateTopicFAQs } = await import('@/ai/flows/generate-topic-faqs');
    const result = await generateTopicFAQs({ ...input, ...options, apiKey: effectiveApiKey });
    return { data: result.faqs, error: null };
  } catch (error: any) {
    console.error('Error in generateTopicFAQsAction:', error.message);
    return { data: null, error: error.message || 'Failed to generate topic FAQs' };
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
  input: GenerateComparisonMapInput & { useSearch?: boolean; images?: { inlineData: { mimeType: string; data: string } }[] },
  options: { apiKey?: string; provider?: AIProvider; userId?: string; model?: string } = {}
): Promise<{ data: CompareMindMapData | null; error: string | null }> {


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
    // Note: XP for MAP_COMPARE is awarded client-side via awardXP() to avoid double-counting

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

      // Skipping fallback to supabase Admin lookup locally
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
 * #10 — Quiz-adaptive deepening: generate new nodes for a weak section.
 * Passes existing node names to prevent duplication.
 */
export async function generateQuizDepthNodesAction(
  input: {
    mainTopic: string;
    sectionName: string;
    existingNodes: string[];
    quizScore: number;
    persona?: string;
  },
  options: AIActionOptions = {}
): Promise<{ data: SubCategory[] | null; error: string | null }> {
  try {
    const effectiveApiKey = await resolveApiKey(options);
    const existingList = input.existingNodes.slice(0, 20).join(', ');

    const { generateContent } = await import('@/ai/client-dispatcher');
    const { z } = await import('zod');

    const NodeArraySchema = z.array(z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      icon: z.string().optional(),
    })).min(1).max(5);

    const systemPrompt = `Output ONLY a valid JSON array of objects. No markdown, no explanation.`;
    const userPrompt = `You are expanding an existing mind map section.
Topic: "${input.mainTopic}"
Section: "${input.sectionName}"
User quiz score on this section: ${input.quizScore}%
Existing nodes (DO NOT duplicate any of these): ${existingList || 'none'}

Generate 3-5 NEW sub-categories that:
- Do NOT duplicate any existing node name
- Focus on concepts a user scoring ${input.quizScore}% likely misunderstood or needs reinforcement on
- Are concrete, specific, and actionable
- Each description is exactly 1 sentence, ≤20 words

Return ONLY a JSON array:
[{"name":"Specific Concept","description":"One sentence ≤20 words.","icon":"lucide-kebab-case"}]`;

    const result = await generateContent({
      provider: options.provider as any,
      apiKey: effectiveApiKey,
      systemPrompt,
      userPrompt,
      schema: NodeArraySchema,
      options: { capability: 'fast' },
    });

    const nodes: SubCategory[] = (Array.isArray(result) ? result : []).map((n: any) => ({
      name: (n.name || '').trim().replace(/[:.!?]$/, ''),
      description: n.description || '',
      icon: n.icon || 'lightbulb',
      tags: [],
      id: stableId(undefined, 'quiz', n.name || ''),
      isExpanded: false,
      source: 'quiz' as const,
      quizScore: input.quizScore,
    })).filter((n: SubCategory) => n.name.length > 0);

    return { data: nodes, error: null };
  } catch (error) {
    console.error('Error in generateQuizDepthNodesAction:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Failed to generate quiz depth nodes.' };
  }
}

/**
 * Server action to log administrative activity.
 * Bypasses client-side security rules by using the Supabase Service Role.
 * Also performs incremental stats updates for real-time dashboarding.
 */
export async function logAdminActivityAction(entry: any) {
  // Fire and forget (background execution)
  Promise.resolve().then(async () => {
    try {
      const { logActivityAdmin } = await import('@/lib/supabase-server');
      await logActivityAdmin(entry);
      // admin_stats incremental updates are deprecated —
      // metrics are now computed from user_profiles/events via
      // recompute_platform_stats() and recompute_all_user_profiles().
    } catch (error: any) {
      console.error('❌ Failed to log admin activity:', error.message);
    }
  }).catch(() => {});
}

/**
 * Server action to synthesize two mind map nodes.
 */
export async function synthesizeNodesAction(
  input: { nodeA: string; nodeB: string; topic: string; persona?: string },
  options: AIActionOptions = {}
): Promise<{ data: any | null; error: string | null }> {
  try {
    const effectiveApiKey = await resolveApiKey(options);
    const effectivePersona = (input.persona === 'Teacher' || input.persona === 'Concise' || input.persona === 'Creative' || input.persona === 'Sage')
      ? input.persona
      : 'Teacher';
    const result = await synthesizeNodes({
      ...input,
      ...options,
      persona: effectivePersona,
      apiKey: effectiveApiKey
    });
    
    return { data: result, error: null };
  } catch (error) {
    console.error('Error in synthesizeNodesAction:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { data: null, error: `Failed to synthesize nodes: ${errorMessage}` };
  }
}

/**
 * Server action to synchronize and recalculate a user's statistics.
 * This ensures the profile dashboard reflects actual database content.
 */
/**
 * Server action to generate an AI-enhanced thumbnail for a mind map topic.
 * Always uses AI to create a topic-specific prompt instead of static templates.
 * @param input.topic - The mind map topic to generate a thumbnail for
 * @param input.context - Optional summary/description for richer prompt context
 * @param input.width - Image width (default 512)
 * @param input.height - Image height (default 288)
 * @returns The generated image as a data URL and the enhanced prompt text
 */
export async function generateThumbnailAction(
  input: {
    topic: string;
    context?: string;
    width?: number;
    height?: number;
  },
  options: AIActionOptions = {}
): Promise<{
  imageUrl: string | null;
  enhancedPrompt: string | null;
  error: string | null;
}> {
  try {
    const effectiveApiKey = await resolveApiKey(options);

    if (!input.topic || input.topic.trim().length === 0) {
      return { imageUrl: null, enhancedPrompt: null, error: 'Topic is required' };
    }

    // 1. AI-enhance the prompt with topic-specific visual description
    const promptInput = input.context
      ? `${input.topic}: ${input.context}`
      : input.topic;

    const enhancement = await enhanceImagePrompt({
      prompt: promptInput,
      style: 'cinematic',
      composition: 'close-up',
      mood: 'dramatic',
      apiKey: effectiveApiKey,
    });

    const enhancedPrompt = enhancement?.enhancedPrompt || null;

    // 2. Fallback prompt if AI enhancement fails — still topic-specific
    const finalPrompt = enhancedPrompt || `Cinematic educational documentary scene representing "${input.topic}", a detailed richly textured environment with visual elements directly related to the subject, dramatic professional lighting, warm amber and cool teal color grading, foreground subject in sharp focus with beautiful background bokeh, 8k resolution, National Geographic quality photography, sharp focus, no text, no watermarks`;

    // 3. Generate the image via Pollinations API
    const width = Math.min(Math.max(input.width || 512, 256), 1280);
    const height = Math.min(Math.max(input.height || 288, 256), 1280);

    const baseUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(finalPrompt)}`;
    const params = new URLSearchParams({
      model: 'flux',
      width: width.toString(),
      height: height.toString(),
      seed: Math.floor(Math.random() * 1000000).toString(),
      nologo: 'true',
      enhance: 'false',
    });

    const fullUrl = `${baseUrl}?${params}`;

    // Verify the image URL is reachable with a HEAD request before returning it
    const headResp = await fetch(fullUrl, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${effectiveApiKey || process.env.POLLINATIONS_API_KEY || ''}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!headResp.ok && headResp.status !== 405) {
      // HEAD not supported (405) is fine; actual errors are not
      const errorText = await headResp.text().catch(() => '');
      throw new Error(`Image generation failed (${headResp.status}): ${errorText.substring(0, 200)}`);
    }

    return {
      imageUrl: fullUrl,
      enhancedPrompt: finalPrompt,
      error: null,
    };
  } catch (error: any) {
    console.error('❌ generateThumbnailAction failed:', error.message);
    return {
      imageUrl: null,
      enhancedPrompt: null,
      error: error.message || 'Failed to generate thumbnail',
    };
  }
}

export async function syncUserStatisticsAction(userId: string) {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase-server');
    const supabase = getSupabaseAdmin();

    // 1. Full recompute via the database function
    const { data: profile, error: recomputeError } = await supabase
      .rpc('recompute_user_profile', { p_user_id: userId });

    if (recomputeError) throw recomputeError;

    // 2. Return the recomputed profile data
    return { success: true, stats: profile };
  } catch (error: any) {
    console.error('❌ syncUserStatisticsAction failed:', error.message);
    return { success: false, error: error.message };
  }
}
