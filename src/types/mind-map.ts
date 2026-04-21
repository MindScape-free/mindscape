
// Timestamp type removed - using string dates
import { PinnedMessage } from './chat';

export interface SubCategory {
  id?: string;
  name: string;
  description: string;
  icon?: string;
  tags?: string[];
  isExpanded?: boolean;
  source?: 'quiz';      // marks nodes injected by quiz-deepening
  quizScore?: number;   // score that triggered this deepening
  nestedExpansion?: {
    id: string;
    topic: string;
    icon: string;
    subCategories: any[];
    createdAt?: number;
  };
  timestamp?: number;
}

export interface Category {
  id?: string;
  name: string;
  thought?: string;
  icon: string;
  subCategories: SubCategory[];
  insight?: string;
  timestamp?: number;
}

export interface SubTopic {
  id?: string;
  name: string;
  thought?: string;
  icon: string;
  categories: Category[];
  insight?: string;
}

export interface MindMap {
  subTopics: SubTopic[];
  isSubMap?: boolean;
  parentMapId?: string;
}

export interface CompareNode {
  id: string;
  title: string;
  description?: string;
  icon: string;
  children?: CompareNode[];
  tags?: string[];
}

export interface ComparisonDimension {
  name: string;
  icon: string;
  topicAInsight: string;
  topicBInsight: string;
  neutralSynthesis: string;
}

export interface CompareData {
  root: {
    title: string;
    description?: string;
    icon?: string;
  };
  unityNexus: CompareNode[]; // Shared core concepts
  dimensions: ComparisonDimension[]; // The Bento Grid items
  synthesisHorizon: {
    expertVerdict: string;
    futureEvolution: string;
  };
  relevantLinks: Array<{
    title: string;
    url: string;
    description?: string;
  }>;
}

export interface GeneratedImage {
  id: string;
  url: string;
  name: string;
  description: string;
  status: 'generating' | 'completed' | 'failed';
  settings?: {
    initialPrompt: string;
    enhancedPrompt: string;
    model: string;
    aspectRatio: string;
    style: string;
    composition?: string;
    mood?: string;
  };
}

export interface NestedExpansionItem {
  id: string;
  parentName: string;
  topic: string;
  icon: string;
  subCategories: Array<{ name: string; description: string; icon: string; tags?: string[] }>;
  createdAt: number;
  depth: number;
  path?: string;
  status?: 'generating' | 'completed' | 'failed';
  fullData?: MindMapData;
}

export interface BaseMindMapData {
  id?: string;
  topic: string;
  thought?: string;
  shortTitle?: string;
  icon?: string;
  uid?: string;
  userId?: string;
  createdAt?: Timestamp | number;
  updatedAt?: Timestamp | number;
  summary?: string;
  summaryAudioUrl?: string;
  thumbnailUrl?: string;
  thumbnailPrompt?: string;
  explanations?: Record<string, string[]>;
  nestedExpansions?: NestedExpansionItem[];
  savedImages?: GeneratedImage[];
  isPublic?: boolean;
  isShared?: boolean;
  publicCategories?: string[];
  views?: number;
  publicViews?: number;
  originalAuthorId?: string;
  authorName?: string;
  authorAvatar?: string;
  depth?: 'low' | 'medium' | 'deep';
  searchSources?: SearchSource[];
  searchImages?: SearchImage[];
  searchTimestamp?: string;
  pdfContext?: PdfContextData;
  sourceFileContent?: string;
  sourceFileType?: string;
  originalPdfFileContent?: string;
  sourceUrl?: string;
  videoId?: string;
  sourceType?: string;
  nodeCount?: number;
  categoriesCount?: number;
  aiPersona?: string;
  sourcesCount?: number;
  mode?: 'single' | 'compare' | 'multi';
  compareData?: CompareData;
  pinnedMessages?: PinnedMessage[];
  enrichments?: Record<string, NodeEnrichment>;
  confidenceRatings?: Record<string, ConfidenceLevel>;
  quizAnswers?: Record<string, string>;
}

export interface PdfContextData {
  summary: string;
  concepts: {
    title: string;
    description: string;
  }[];
  timestamp: number;
}

export interface SearchSource {
  title: string;
  url: string;
  published?: string;
  image?: string;
}

export interface SearchImage {
  url: string;
  title?: string;
  sourceUrl?: string;
}

export interface SingleMindMapData extends BaseMindMapData, MindMap {
  mode: 'single';
}

export interface CompareMindMapData extends BaseMindMapData {
  mode: 'compare';
  compareData: CompareData;
}

export type MindMapData = SingleMindMapData | CompareMindMapData;

export type MindMapWithId = MindMapData & { id: string };

export interface SubCategoryInfo {
  name: string;
  description: string;
}

export interface ExplainableNode {
  name: string;
  type: 'subTopic' | 'category';
}

export type ExplanationMode = 'Beginner' | 'Intermediate' | 'Expert';

export interface DepthSuggestion {
  depth: 'low' | 'medium' | 'deep';
  confidence: number;
  reasons: string[];
  suggestedItems: {
    min: number;
    max: number;
    label: string;
  };
}

export interface DepthAnalysis {
  technical: number;
  academic: number;
  scientific: number;
  business: number;
  complexity: number;
  multiConcept: number;
  questionType: 'how' | 'what' | 'why' | 'comparison' | 'none';
}

// ── Explanation Dialog Enrichment (Dialog 2.0) ─────────────────────────

export interface RelatedNode {
  name: string;
  description: string;
  icon: string;
}

export interface LearningPath {
  before: string;
  after: string;
}

export interface ConceptSnapshot {
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  readTimeMinutes: number;
  similarTo: string;
}

export interface MisconceptionItem {
  claim: string;
  correction: string;
}

export interface RealWorldRadarItem {
  domain: string;
  icon: string;
  color: string;
  application: string;
}

export interface TimelineEvent {
  year: string;
  event: string;
  isKey?: boolean;
}

export interface MicroQuizQuestion {
  question: string;
  options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctId: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface NodeEnrichment {
  relatedNodes: RelatedNode[];
  learningPath: LearningPath;
  snapshot: ConceptSnapshot;
  misconceptions: MisconceptionItem[];
  realWorldRadar: RealWorldRadarItem[];
  timeline: TimelineEvent[];
  microQuiz: MicroQuizQuestion;
}

export type ConfidenceLevel = 1 | 2 | 3 | 4;
