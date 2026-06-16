import { findMatchingCategory } from './depth-analysis';
import type { SubTopic } from '@/types/mind-map';

// ── Test Fixtures ──────────────────────────────────────────────────────────

const mockSubTopics: SubTopic[] = [
  {
    name: 'Artificial Intelligence',
    icon: 'brain',
    insight: 'Core AI concepts',
    categories: [
      {
        name: 'Machine Learning',
        icon: 'cpu',
        insight: 'Core ML concepts',
        subCategories: [
          { name: 'Supervised Learning', description: 'Learning with labeled data', icon: 'book-open', tags: [] },
          { name: 'Unsupervised Learning', description: 'Learning without labels', icon: 'book-open', tags: [] },
        ],
      },
      {
        name: 'Neural Networks',
        icon: 'network',
        insight: 'NN concepts',
        subCategories: [
          { name: 'CNNs', description: 'Convolutional Neural Networks', icon: 'book-open', tags: [] },
          { name: 'RNNs', description: 'Recurrent Neural Networks', icon: 'book-open', tags: [] },
        ],
      },
    ],
  },
  {
    name: 'Data Science',
    icon: 'bar-chart',
    insight: 'Data science domain',
    categories: [
      {
        name: 'Statistics',
        icon: 'sigma',
        insight: 'Statistical methods',
        subCategories: [
          { name: 'Bayesian', description: 'Bayesian inference', icon: 'book-open', tags: [] },
        ],
      },
      {
        name: 'Data Visualization',
        icon: 'eye',
        insight: 'Visualization tools',
        subCategories: [
          { name: 'Matplotlib', description: 'Python plotting library', icon: 'book-open', tags: [] },
        ],
      },
    ],
  },
];

const singleSubTopic: SubTopic[] = [
  {
    name: 'Physics',
    icon: 'atom',
    categories: [
      {
        name: 'Classical Mechanics',
        icon: 'settings',
        subCategories: [
          { name: 'Newtonian Mechanics', description: 'Laws of motion', icon: 'book-open', tags: [] },
        ],
      },
    ],
  },
];

// ── Tests ──────────────────────────────────────────────────────────────────

describe('findMatchingCategory()', () => {
  // ── Empty / Null Safety ────────────────────────────────────────────────
  describe('empty / null safety', () => {
    it('returns null when subTopics is undefined', () => {
      expect(findMatchingCategory('test', undefined as any)).toBeNull();
    });

    it('returns null when subTopics is null', () => {
      expect(findMatchingCategory('test', null as any)).toBeNull();
    });

    it('returns null when subTopics is an empty array', () => {
      expect(findMatchingCategory('test', [])).toBeNull();
    });

    it('returns null when subTopics array is empty even with a valid tag', () => {
      expect(findMatchingCategory('Physics', [])).toBeNull();
    });
  });

  // ── Level 1: Exact Match ───────────────────────────────────────────────
  describe('Level 1 -- exact match', () => {
    it('matches exact category name', () => {
      const result = findMatchingCategory('Machine Learning', mockSubTopics);
      expect(result).toEqual({
        subTopicIndex: 0, categoryIndex: 0, matchLevel: 'exact',
      });
    });

    it('matches exact subTopic name', () => {
      const result = findMatchingCategory('Artificial Intelligence', mockSubTopics);
      expect(result).toEqual({
        subTopicIndex: 0, categoryIndex: 0, matchLevel: 'exact',
      });
    });

    it('is case-insensitive for exact match', () => {
      const result = findMatchingCategory('machine learning', mockSubTopics);
      expect(result).toEqual({
        subTopicIndex: 0, categoryIndex: 0, matchLevel: 'exact',
      });
    });

    it('ignores non-alphanumeric characters in exact match', () => {
      const result = findMatchingCategory('Data-Visualization!', mockSubTopics);
      expect(result).toEqual({
        subTopicIndex: 1, categoryIndex: 1, matchLevel: 'exact',
      });
    });

    it('matches the first category when subTopic name matches exactly', () => {
      const result = findMatchingCategory('Physics', singleSubTopic);
      expect(result).toEqual({
        subTopicIndex: 0, categoryIndex: 0, matchLevel: 'exact',
      });
    });
  });

  // ── Level 2: Contains Match ────────────────────────────────────────────
  describe('Level 2 -- contains match', () => {
    it('matches when tag is contained in a category name', () => {
      const result = findMatchingCategory('Learn', mockSubTopics);
      expect(result).toMatchObject({ matchLevel: 'contains', subTopicIndex: 0, categoryIndex: 0 });
    });

    it('matches when category name is contained in the tag', () => {
      const result = findMatchingCategory('Machine Learning Concepts', mockSubTopics);
      expect(result).toMatchObject({ matchLevel: 'contains' });
    });

    it('matches when tag is contained in a subTopic name', () => {
      const result = findMatchingCategory('Intelligence', mockSubTopics);
      expect(result).toMatchObject({ matchLevel: 'contains', subTopicIndex: 0, categoryIndex: 0 });
    });

    it('matches on subTopic level when tag contains subTopic name', () => {
      const result = findMatchingCategory('Artificial Intelligence and Robotics', mockSubTopics);
      expect(result).toMatchObject({ matchLevel: 'contains' });
    });
  });

  // ── Level 3: Fuzzy / Levenshtein Match ─────────────────────────────────
  describe('Level 3 -- fuzzy (Levenshtein) match', () => {
    it('matches with a single-character typo', () => {
      const result = findMatchingCategory('Statisticss', mockSubTopics);
      expect(result).toMatchObject({ subTopicIndex: 1, categoryIndex: 0, matchLevel: 'fuzzy' });
    });

    it('matches with a single character missing', () => {
      const result = findMatchingCategory('Neural Network', mockSubTopics);
      expect(result).toMatchObject({ subTopicIndex: 0, categoryIndex: 1, matchLevel: 'fuzzy' });
    });

    it('matches with a transposition', () => {
      const result = findMatchingCategory('Staitstics', mockSubTopics);
      expect(result).toMatchObject({ matchLevel: 'fuzzy' });
    });

    it('does NOT match when Levenshtein distance is >= 3', () => {
      const result = findMatchingCategory('Stat', mockSubTopics);
      expect(result).not.toBeNull();
      expect(result!.matchLevel).toBe('fallback');
    });
  });

  // ── Level 4: Word-Overlap Fallback ─────────────────────────────────────
  describe('Level 4 -- word-overlap fallback', () => {
    it('finds best category via word overlap for a compound tag', () => {
      const result = findMatchingCategory('Machine Vision', mockSubTopics);
      expect(result).toMatchObject({ matchLevel: 'fallback', subTopicIndex: 0, categoryIndex: 0 });
    });

    it('finds best category for partially matching tag', () => {
      const result = findMatchingCategory('Data Visual', mockSubTopics);
      expect(result).toMatchObject({ matchLevel: 'fallback', subTopicIndex: 1, categoryIndex: 1 });
    });

    it('scores subtopic name at 70% weight for categorization', () => {
      const result = findMatchingCategory('Data Mining', mockSubTopics);
      expect(result).not.toBeNull();
      expect(result!.matchLevel).toBe('fallback');
      expect(result!.subTopicIndex).toBe(1);
    });
  });

  // ── Level 5: Ultimate Fallback ─────────────────────────────────────────
  describe('Level 5 -- ultimate fallback', () => {
    it('falls back when no word overlap exists', () => {
      const result = findMatchingCategory('Random Unrelated Topic', mockSubTopics);
      expect(result).toEqual({ subTopicIndex: 0, categoryIndex: 0, matchLevel: 'fallback' });
    });

    it('falls back for single-topic map with completely unrelated tag', () => {
      const result = findMatchingCategory('Cooking Recipe', singleSubTopic);
      expect(result).toEqual({ subTopicIndex: 0, categoryIndex: 0, matchLevel: 'fallback' });
    });
  });

  // ── Priority & Ordering ────────────────────────────────────────────────
  describe('priority & ordering', () => {
    it('prefers exact match over contains', () => {
      const exact = findMatchingCategory('Neural Networks', mockSubTopics);
      expect(exact!.matchLevel).toBe('exact');

      const contains = findMatchingCategory('Networks', mockSubTopics);
      expect(contains!.matchLevel).toBe('contains');
    });

    it('prefers contains over fuzzy', () => {
      const result = findMatchingCategory('Visualization', mockSubTopics);
      expect(result!.matchLevel).toBe('contains');
    });

    it('prefers fuzzy over word-overlap fallback', () => {
      const result = findMatchingCategory('Statzstics', mockSubTopics);
      expect(result!.matchLevel).toBe('fuzzy');
    });
  });
});
