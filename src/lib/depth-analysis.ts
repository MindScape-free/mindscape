'use client';

import { DepthSuggestion, DepthAnalysis } from '@/types/mind-map';

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

export function analyzeTopicComplexity(topic: string): DepthAnalysis {
  const t = topic.toLowerCase().trim();
  const words = t.split(/\s+/);
  const wordCount = words.length;
  
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

export function getSuggestedItemCount(depth: 'low' | 'medium' | 'deep', analysis: DepthAnalysis): { min: number; max: number; label: string } {
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

export function resolveDepthWithConfidence(topic: string): DepthSuggestion {
  const t = topic.toLowerCase().trim();
  const wordParts = t.split(/\s+/);
  const words = wordParts.length;
  const charCount = t.length;
  const analysis = analyzeTopicComplexity(t);
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
    suggestedItems: getSuggestedItemCount(depth, analysis),
  };
}

export function getDepthLabel(depth: 'low' | 'medium' | 'deep'): string {
  const labels = {
    low: 'Quick',
    medium: 'Balanced',
    deep: 'Detailed',
  };
  return labels[depth];
}

export function getDepthColor(depth: 'low' | 'medium' | 'deep'): string {
  const colors = {
    low: 'text-green-400',
    medium: 'text-blue-400',
    deep: 'text-purple-400',
  };
  return colors[depth];
}
