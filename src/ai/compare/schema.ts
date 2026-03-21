import { z } from 'zod';

/**
 * Recursive schema for comparison nodes (used in Unity Nexus).
 */
export const CompareNodeSchema: z.ZodType<any> = z.lazy(() =>
    z.object({
        id: z.string().describe('Unique ID for the node'),
        title: z.string().describe('The name of the point or topic'),
        description: z.string().describe('A detailed informative sentence explaining the comparison/point. DO NOT USE PLACEHOLDERS.'),
        icon: z.string().optional().describe('Lucide-react icon name in kebab-case'),
        children: z.array(z.lazy(() => CompareNodeSchema)).optional().describe('Nested comparison details'),
    })
);

export const ComparisonDimensionSchema = z.object({
    name: z.string().describe('The dimension of comparison (e.g., "Performance").'),
    icon: z.string().describe('Icon name for the dimension (kebab-case).'),
    topicAInsight: z.string().describe('Sharp, informative sentence about Topic A in this dimension.'),
    topicBInsight: z.string().describe('Sharp, informative sentence about Topic B in this dimension.'),
    neutralSynthesis: z.string().describe('A neutral bridge or technical synthesis for this dimension.'),
});

/**
 * NEW Dimensional Architect Schema.
 */
export const CompareMindMapSchema = z.object({
    mode: z.literal('compare').default('compare'),
    topic: z.string().describe('Main comparison title.'),
    shortTitle: z.string().optional(),
    icon: z.string().optional().default('scale'),

    compareData: z.object({
        root: z.object({
            title: z.string(),
            description: z.string().optional(),
            icon: z.string().optional().default('scale'),
        }),
        unityNexus: z.array(CompareNodeSchema).min(4).describe('Shared core principles.'),
        dimensions: z.array(ComparisonDimensionSchema).min(5).describe('Bento grid dimensions.'),
        synthesisHorizon: z.object({
            expertVerdict: z.string().describe('Expert stand or professional judgment.'),
            futureEvolution: z.string().describe('Potential convergence or evolution.'),
        }),
        relevantLinks: z.array(
            z.object({
                title: z.string(),
                url: z.string().url(),
                description: z.string(),
            })
        ).min(3),
    })
});

export type CompareMindMap = z.infer<typeof CompareMindMapSchema>;
export type CompareNode = z.infer<typeof CompareNodeSchema>;

export const GenerateComparisonMapInputSchema = z.object({
    topic1: z.string().describe('The first topic for comparison.'),
    topic2: z.string().describe('The second topic for comparison.'),
    targetLang: z
        .string()
        .optional()
        .describe('The target language for the mind map content (e.g., "es").'),
    persona: z
        .string()
        .optional()
        .describe('The AI persona / style to use (e.g., "Teacher", "Concise", "Creative").'),
    depth: z
        .enum(['low', 'medium', 'deep'])
        .default('low')
        .describe('The level of detail/depth for the mind map structure.'),
    apiKey: z.string().optional().describe('Optional custom API key to use for this request.'),
});

export type GenerateComparisonMapInput = z.infer<typeof GenerateComparisonMapInputSchema>;
