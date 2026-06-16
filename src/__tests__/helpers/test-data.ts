import type { MindMapData, MindMapWithId, SubTopic, Category, SubCategory } from '@/types/mind-map';

// ── User Fixtures ──────────────────────────────────────────────────────────

export const mockUserId = 'user-abc-123';
export const mockUserIdAlt = 'user-def-456';
export const mockMapId = 'map-abc-123';
export const mockMapIdAlt = 'map-def-456';
export const mockAdminUserId = 'admin-001';

// ── SubTopics / Categories Fixtures ────────────────────────────────────────

export const mockSubTopics: SubTopic[] = [
  {
    id: 'st-1',
    name: 'Machine Learning',
    icon: 'cpu',
    categories: [
      {
        id: 'cat-1-1',
        name: 'Supervised Learning',
        icon: 'book-open',
        subCategories: [
          { name: 'Linear Regression', description: 'Predicts continuous values', icon: 'trending-up', tags: [] },
          { name: 'Classification', description: 'Categorizes data', icon: 'filter', tags: [] },
        ],
      },
      {
        id: 'cat-1-2',
        name: 'Unsupervised Learning',
        icon: 'layers',
        subCategories: [
          { name: 'Clustering', description: 'Groups similar data', icon: 'circle', tags: [] },
        ],
      },
    ],
  },
  {
    id: 'st-2',
    name: 'Deep Learning',
    icon: 'brain',
    categories: [
      {
        id: 'cat-2-1',
        name: 'Neural Networks',
        icon: 'network',
        subCategories: [
          { name: 'CNNs', description: 'Convolutional Neural Networks', icon: 'image', tags: [] },
          { name: 'RNNs', description: 'Recurrent Neural Networks', icon: 'refresh-cw', tags: [] },
        ],
      },
    ],
  },
];

// ── Comparison Data Fixture ────────────────────────────────────────────────

export const mockCompareData = {
  root: { title: 'AI vs ML', description: 'Comparison of AI and Machine Learning', icon: 'git-compare' },
  unityNexus: [
    { id: 'nexus-1', title: 'Data Dependency', description: 'Both rely on data', icon: 'database', children: [] },
    { id: 'nexus-2', title: 'Pattern Recognition', description: 'Core to both fields', icon: 'eye', children: [] },
  ],
  dimensions: [
    {
      name: 'Scope',
      icon: 'globe',
      topicAInsight: 'AI is the broader field',
      topicBInsight: 'ML is a subset of AI',
      neutralSynthesis: 'ML powers most modern AI applications',
    },
    {
      name: 'Techniques',
      icon: 'tool',
      topicAInsight: 'Includes logic, rules, search',
      topicBInsight: 'Statistical models, data-driven',
      neutralSynthesis: 'Increasingly overlap in practice',
    },
  ],
  synthesisHorizon: {
    expertVerdict: 'AI and ML are deeply intertwined',
    futureEvolution: 'The distinction will continue to blur',
  },
  relevantLinks: [
    { title: 'Wikipedia AI', url: 'https://en.wikipedia.org/wiki/Artificial_intelligence', description: 'Overview' },
  ],
};

// ── Mind Map Data Fixtures ─────────────────────────────────────────────────

export const createMockMindMapData = (overrides: Partial<MindMapData> = {}): MindMapWithId => ({
  id: mockMapId,
  topic: 'Introduction to Machine Learning',
  subTopics: mockSubTopics,
  mode: 'single',
  depth: 'medium',
  aiPersona: 'Teacher',
  nodeCount: 10,
  isPublic: false,
  isSubMap: false,
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now(),
  thumbnailUrl: '',
  summary: 'A comprehensive overview of Machine Learning concepts.',
  explanations: {
    'Supervised Learning-Beginner': ['Explanation point 1', 'Explanation point 2'],
  },
  savedImages: [],
  nestedExpansions: [],
  pinnedMessages: [],
  ...overrides,
}) as MindMapWithId;

export const createMockCompareMindMap = (overrides: Partial<MindMapData> = {}): MindMapWithId => ({
  id: mockMapIdAlt,
  topic: 'AI vs Machine Learning',
  mode: 'compare',
  compareData: mockCompareData,
  depth: 'medium',
  aiPersona: 'Teacher',
  nodeCount: 5,
  isPublic: false,
  createdAt: Date.now() - 1800000,
  updatedAt: Date.now(),
  ...overrides,
}) as MindMapWithId;

// ── Database Row Fixtures (snake_case) ─────────────────────────────────────

export const createMockDbRow = (overrides: Record<string, any> = {}) => ({
  id: mockMapId,
  user_id: mockUserId,
  topic: 'Introduction to Machine Learning',
  summary: 'A comprehensive overview of Machine Learning concepts.',
  mode: 'single',
  depth: 'medium',
  ai_persona: 'Teacher',
  source_file_type: null,
  source_url: null,
  thumbnail_url: '',
  thumbnail_prompt: '',
  node_count: 10,
  is_public: false,
  is_sub_map: false,
  parent_map_id: null,
  content: {
    subTopics: mockSubTopics.map(st => ({
      ...st,
      categories: st.categories.map(cat => ({
        ...cat,
        subCategories: cat.subCategories.map(sc => ({
          ...sc,
          tags: sc.tags || [],
        })),
      })),
    })),
    compareData: null,
    nodes: [],
    edges: [],
    explanations: {},
    shortTitle: null,
  },
  pinned_messages: [],
  search_sources: null,
  search_timestamp: null,
  created_at: new Date(Date.now() - 3600000).toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockPublicDbRow = (overrides: Record<string, any> = {}) => ({
  id: mockMapId,
  original_author_id: mockUserId,
  author_name: 'Test User',
  topic: 'Introduction to Machine Learning',
  summary: 'A comprehensive overview.',
  content: {},
  public_categories: ['technology', 'ai'],
  is_public: true,
  public_views: 42,
  published_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ── Common Assertion Helpers ───────────────────────────────────────────────

/** Validates that an object has the shape of a MindMapData with required fields */
export function expectValidMindMap(result: any) {
  expect(result).toBeTruthy();
  expect(typeof result.topic).toBe('string');
  expect(result.topic.length).toBeGreaterThan(0);
  expect(['single', 'compare']).toContain(result.mode);
}

/** Validates a database row has required mindmap fields */
export function expectValidMindMapRow(row: any) {
  expect(row).toBeTruthy();
  expect(row.id).toBeTruthy();
  expect(row.user_id).toBeTruthy();
  expect(row.topic).toBeTruthy();
}
