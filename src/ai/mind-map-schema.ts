
import { z } from 'zod';

/**
 * Schema for a nested expansion - a mini mind map that expands from a sub-category
 */
const NestedSubCategorySchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string().describe('The name of the sub-category.'),
    description: z.string().describe('A brief description of the sub-category.'),
    icon: z
      .string()
      .optional()
      .describe(
        'A relevant icon name from the lucide-react library, in kebab-case (e.g., "book-open").'
      ),
    // Tags removed as they are not used in UI

    // Nested expansion support
    nestedExpansion: z
      .object({
        id: z.string().describe('Unique ID for this nested expansion'),
        topic: z.string().describe('The expanded topic name'),
        icon: z.string(),
        subCategories: z.array(z.lazy(() => NestedSubCategorySchema)),
        createdAt: z.number().optional(),
      })
      .optional()
      .describe('Nested sub-mindmap expansion for this category'),
    isExpanded: z.boolean().optional(),
  })
);

const SubCategorySchema = z.object({
  name: z.string().describe('The name of the sub-category.'),
  description: z.string().describe('A brief description of the sub-category.'),
  icon: z
    .string()
    .optional()
    .describe(
      'A relevant icon name from the lucide-react library, in kebab-case (e.g., "book-open").'
    ),
  // Tags removed as they are not used in UI

  // Nested expansion support
  nestedExpansion: z
    .object({
      id: z.string().describe('Unique ID for this nested expansion'),
      topic: z.string().describe('The expanded topic name'),
      icon: z.string(),
      subCategories: z.array(NestedSubCategorySchema),
      createdAt: z.number().optional(),
    })
    .optional()
    .describe('Nested sub-mindmap expansion for this category'),
  isExpanded: z.boolean().optional(),
});

const CategorySchema = z.object({
  name: z.string().describe('The name of the category.'),
  thought: z.string().optional().describe('Analysis and planning for this category.'),
  icon: z
    .string()
    .optional()
    .describe(
      'A relevant icon name from the lucide-react library, in kebab-case (e.g., "folder").'
    ),
  subCategories: z
    .array(SubCategorySchema)
    .min(1)
    .describe('A list of detailed sub-categories.'),
  insight: z.string().optional().describe('A deeper philosophical or analytical insight about this category.'),
});

const SubTopicSchema = z.object({
  name: z.string().describe('The name of the sub-topic.'),
  thought: z.string().optional().describe('Analysis and planning for this branch.'),
  icon: z
    .string()
    .optional()
    .describe(
      'A relevant icon name from the lucide-react library, in kebab-case (e.g., "flag").'
    ),
  categories: z.array(CategorySchema).min(1).describe('A list of categories.'),
  insight: z.string().optional().describe('A high-level philosophical or analytical insight about this sub-topic.'),
});

export const GeneratedImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['generating', 'completed', 'failed']),
});

export const NestedExpansionItemSchema = z.object({
  id: z.string(),
  parentName: z.string(),
  topic: z.string(),
  icon: z.string(),
  subCategories: z.array(z.object({
    name: z.string(),
    description: z.string(),
    icon: z.string(),
    tags: z.array(z.string()).optional(),
  })),
  createdAt: z.number(),
  depth: z.number(),
  path: z.string().optional(),
  status: z.enum(['generating', 'completed', 'failed']).optional(),
  fullData: z.any().optional(), // Self-reference limit
});

export const CompareNodeSchema = z.object({
  id: z.string().optional(),
  title: z.string().describe('Short name of the core principle.'),
  description: z.string().optional().describe('Evocative one-sentence explanation.'),
  icon: z.string().describe('Lucide icon name.'),
  children: z.array(z.lazy(() => z.any())).optional(), // Simplified for now
});

export const CompareMindMapSchema = z.object({
  mode: z.literal('compare'),
  topic: z.string(),
  shortTitle: z.string().optional(),
  icon: z.string().optional(),
  compareData: z.object({
    root: z.object({
      title: z.string(),
      description: z.string().optional(),
      icon: z.string().optional(),
    }),
    unityNexus: z.array(CompareNodeSchema).describe('Shared core concepts between the topics.'),
    dimensions: z.array(z.object({
      name: z.string().describe('The dimension of comparison (e.g., "Performance").'),
      icon: z.string().describe('Icon name for the dimension.'),
      topicAInsight: z.string().describe('Insight for the first topic.'),
      topicBInsight: z.string().describe('Insight for the second topic.'),
      neutralSynthesis: z.string().describe('A neutral bridge or synthesis for this dimension.'),
    })).min(4).describe('Detailed comparison dimensions (Bento grid items).'),
    synthesisHorizon: z.object({
      expertVerdict: z.string().describe('High-level conclusion or professional judgment.'),
      futureEvolution: z.string().describe('How these topics might converge or evolve in the future.'),
    }),
    relevantLinks: z.array(z.object({
      title: z.string(),
      url: z.string(),
      description: z.string().optional(),
    })),
  }),
  id: z.string().optional(),
  nestedExpansions: z.array(NestedExpansionItemSchema).optional(),
  savedImages: z.array(GeneratedImageSchema).optional(),
  thumbnailUrl: z.string().optional(),
  depth: z.enum(['low', 'medium', 'deep']).optional(),
});

export const SingleMindMapSchema = z.object({
  mode: z.literal('single').default('single').describe('The mode of the mind map (single topic)'),
  topic: z.string().describe('The main topic of the mind map.'),
  shortTitle: z.string().optional().describe('A condensed version of the topic (max 3-4 words) for focused display.'),
  icon: z
    .string()
    .optional()
    .describe(
      'A relevant icon name from the lucide-react library, in kebab-case (e.g., "brain-circuit").'
    ),
  subTopics: z.array(SubTopicSchema).min(1).describe('A list of main sub-topics.'),
  isSubMap: z.boolean().optional().describe('Whether this map is a nested sub-map'),
  parentMapId: z.string().optional().describe('The ID of the parent mind map'),
  id: z.string().optional(),
  nestedExpansions: z.array(NestedExpansionItemSchema).optional(),
  savedImages: z.array(GeneratedImageSchema).optional(),
  thumbnailUrl: z.string().optional(),
  depth: z.enum(['low', 'medium', 'deep']).optional(),
});

export const MindMapSchema = z.union([SingleMindMapSchema, CompareMindMapSchema]);

/**
 * Schema for nested expansion output from AI
 */
export const NestedExpansionOutputSchema = z.object({
  topic: z.string().describe('The topic being expanded'),
  icon: z.string().describe('Icon for the expansion'),
  subCategories: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      icon: z.string(),
      tags: z.array(z.string()).optional(),
    })
  ).min(4).describe('4-6 sub-categories for the expanded node'),
});

export type NestedExpansionOutput = z.infer<typeof NestedExpansionOutputSchema>;

/**
 * CLEAN SCHEMA for AI GENERATION
 * This schema only contains fields the AI should actually produce.
 */
export const AIGeneratedMindMapSchema = z.object({
  mode: z.literal('single').default('single'),
  topic: z.string().describe('The primary focus of the mind map.'),
  thought: z.string().optional().describe('Strategic reasoning about the layout and content.'),
  shortTitle: z.string().describe('Condensed 2-4 word title for UI display.'),
  icon: z.string().describe('Lucide-react icon name for the main topic.'),
  subTopics: z.array(z.object({
    name: z.string().min(1).describe('Title of the sub-topic section.'),
    thought: z.string().optional().describe('Reasoning for this specific sub-topic branch.'),
    icon: z.string().describe('Lucide-react icon name.'),
    insight: z.string().optional().describe('A deeper synthesis of this sub-topic.'),
    categories: z.array(z.object({
      name: z.string().min(1).describe('The conceptual category name.'),
      thought: z.string().optional(),
      icon: z.string().describe('Lucide-react icon name.'),
      insight: z.string().optional(),
      subCategories: z.array(z.object({
        name: z.string().min(1).describe('The name of the leaf node.'),
        description: z.string().min(1).describe('A one-sentence detailed explanation of this node.'),
        icon: z.string().optional(),
        tags: z.array(z.string()).optional(),
        timestamp: z.number().optional().describe('Video timestamp in seconds for this concept.')
      })).min(1).describe('Crucial leaf nodes with detailed descriptions.')
    })).min(1)
  })).min(1)
});

export type AIGeneratedMindMap = z.infer<typeof AIGeneratedMindMapSchema>;
export type SubCategory = z.infer<typeof SubCategorySchema>;
export type Category = z.infer<typeof CategorySchema>;
export type SubTopic = z.infer<typeof SubTopicSchema>;
export type MindMap = z.infer<typeof MindMapSchema>;
