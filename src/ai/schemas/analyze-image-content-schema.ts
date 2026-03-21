import { z } from 'zod';

export const AnalyzeImageContentInputSchema = z.object({
  imageDataUri: z.string().describe("Data URI of the image to analyze"),
});

export type AnalyzeImageContentInput = z.infer<typeof AnalyzeImageContentInputSchema>;

export const AnalyzeImageContentOutputSchema = z.object({
  extracted_text: z.string().optional().describe("All visible text exactly as it appears"),
  visual_elements: z.string().optional().describe("Description of key visual elements, charts, diagrams, etc."),
  identified_entities: z.string().optional().describe("Names, dates, numbers, and technical terms"),
  field_value_pairs: z.any().optional().describe("Key-value pairs if the image is a form or ID"),
  summary: z.string().optional().describe("A cohesive textual summary of the image"),
  insight: z.string().optional().describe("Deeper interpretation or context"),
  content: z.string().describe("A single consolidated string of all extracted information"),
});

export type AnalyzeImageContentOutput = z.infer<typeof AnalyzeImageContentOutputSchema>;
