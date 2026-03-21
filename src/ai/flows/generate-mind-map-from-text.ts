
'use server';

/**
 * @fileOverview Generates a mind map from a block of text.
 *
 * - generateMindMapFromText - A function that generates the mind map from text.
 */

import {
  GenerateMindMapFromTextInput,
  GenerateMindMapFromTextInputSchema,
  GenerateMindMapFromTextOutput,
  GenerateMindMapFromTextOutputSchema,
} from '@/ai/schemas/generate-mind-map-from-text-schema';

import { generateContent, AIProvider } from '@/ai/client-dispatcher';
import { analyzeDocument } from '@/knowledge-engine';

// Uses client-dispatcher with SKEE pre-analysis
export async function generateMindMapFromText(
  input: GenerateMindMapFromTextInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<GenerateMindMapFromTextOutput> {
  const { provider, apiKey, context, targetLang, text, persona, strict, depth = 'low' } = input;

  // Map depth to structural density
  let densityInstruction = '';
  if (depth === 'medium') {
    densityInstruction = 'STRUCTURE DENSITY: Generate EXACTLY 5 subTopics. Each subTopic MUST have EXACTLY 3 categories. Each category MUST have EXACTLY 3-4 subCategories. (Target: ~60 nodes)';
  } else if (depth === 'deep') {
    densityInstruction = 'STRUCTURE DENSITY: Generate EXACTLY 6 subTopics. Each subTopic MUST have EXACTLY 4 categories. Each category MUST have EXACTLY 5 subCategories. (Target: ~120 nodes)';
  } else {
    densityInstruction = 'STRUCTURE DENSITY: Generate 4 subTopics. Each subTopic should have 2 categories. Each category should have 3 subCategories. (Target: ~24 nodes)';
  }

  let personaInstruction = '';
  const p = (persona || '').toLowerCase();
  if (p === 'teacher') {
    personaInstruction = `
    ADOPT PERSONA: "Expert Teacher"
    - Use educational analogies to explain complex concepts found in the text.
    - Focus on "How" and "Why" in descriptions.
    - Structure sub-topics like a curriculum or learning path.
    - Descriptions should be encouraging and clear.`;
  } else if (p === 'concise') {
    personaInstruction = `
    ADOPT PERSONA: "Efficiency Expert"
    - Keep all text extracted from the source extremely brief.
    - Use fragments or high-impact keywords instead of long sentences.
    - Focus only on the most critical information from the text.
    - Descriptions should be very short (max 15 words).`;
  } else if (p === 'creative') {
    personaInstruction = `
    ADOPT PERSONA: "Creative Visionary"
    - Explore unique connections and innovative angles within the text.
    - Use vivid, evocative language in descriptions.
    - Highlight theoretical or "Innovation" aspects found in the content.
    - Make the content feel inspired and non-obvious.`;
  } else {
    personaInstruction = `
    ADOPT PERSONA: "Standard Academic Assistant"
    - Provide a balanced and well-structured overview of the provided text.
    - Use clear, professional, yet accessible language.
    - Ensure comprehensive coverage of all key points in the text.
    - Keep descriptions highly focused and exactly one sentence.`;
  }

  let contextInstruction = '';
  if (context) {
    if (context.includes('--- SOURCE:')) {
      contextInstruction = `
    **MULTI-SOURCE CONTEXT**:
    The provided "Context" contains information from multiple different sources delineated by "--- SOURCE: [Name] ---" blocks.
    Your objective is to SYNTHESIZE all this information into a single coherent mind map.
    - Look for common themes, overlapping facts, and shared relationships across the sources.
    - Highlight unique insights or specific data points found only in one source.
    - Use the user's primary focus (the "Text/Topic" provided below) as the central lens to organize this context.

    CONTEXT TO SYNTHESIZE:
    """
    ${context}
    """`;
    } else {
      contextInstruction = `The user has provided the following additional context or instructions, which you should prioritize: "${context}"`;
    }
  }

  const targetLangInstruction = targetLang
    ? `The entire mind map, including all topics, categories, and descriptions, MUST be in the following language: ${targetLang}.`
    : `The entire mind map MUST be in English.`;

  // ── SKEE: Deterministic Document Analysis ──
  // In multi-source mode, the actual "document" is the context (merged sources),
  // while "text" is just the user's focus topic.
  const isMultiSource = !!(context && context.includes('--- SOURCE:'));
  const sourceToAnalyze = (isMultiSource && context) ? context : text;
  
  const skeeResult = analyzeDocument(sourceToAnalyze);
  const hasStructure = skeeResult.structuredContext.length > 0;

  if (hasStructure) {
    console.log(`🧠 SKEE Analysis (${isMultiSource ? 'multi-source' : 'text'} flow):`, skeeResult.stats);
  }

  const skeeSection = hasStructure
    ? `
    **PRE-ANALYZED CONTENT STRUCTURE (use as structural guide)**:
    The following hierarchy was extracted algorithmically from the provided ${isMultiSource ? 'sources' : 'text'}.
    Use this as the PRIMARY scaffold for your mind map.

    ${skeeResult.structuredContext}
    ---
    IMPORTANT: Your subTopics SHOULD align with the detected sections above.
    Your categories and subCategories SHOULD reflect the key concepts and relationships found across the ${isMultiSource ? 'sources' : 'content'}.`
    : '';

  const systemPrompt = `You are an expert in analyzing text and creating structured, comprehensive mind maps from it.
  
    ${personaInstruction}
  
    Analyze the provided text and generate a detailed, multi-layered mind map based on its content. 
    ${skeeSection}

    **DOCUMENT STRUCTURAL AWARENESS**:
    - Look for structural markers like "Chapter", "Section", "Title", or bolded headers to define your \`subTopics\`.
    - If the text has a clear Table of Contents or logical flow, MIRROR that structure in the mind map.
    - Treat double newlines as potential section breaks.

    **ENTITY EXTRACTION RULE**: 
    - For structured docs (IDs, Invoices, Resumes): Extract ACTUAL values (e.g., "Invoice #: 12345").
    - DO NOT use generic placeholders if literal data is available.

    **FOR GENERAL TEXTS**:
    - Prioritize information density and logical hierarchy.
    - Each \`subCategory\` MUST contain a specific fact, definition, or takeaway from the text.
    - Avoid repetitive or redundant nodes.
    - If the text is long, synthesize the core message of each section.

    ${densityInstruction}
  
    ${contextInstruction}
  
    ${targetLangInstruction}
  
    **SYNTHESIS GOAL**:
    Your goal is to build a comprehensive knowledge graph of the provided material. 
    ${isMultiSource ? 'Since you are in MULTI-SOURCE mode, focus on synthesizing the overlapping and unique perspectives from all sources onto the central topic.' : 'Focus on extracting the most important hierarchical information from the provided text.'}
    The output must be a valid JSON object that strictly adheres to the following structure:
    {
      "mode": "single",
      "topic": "Main Topic",
      "shortTitle": "Short Title",
      "icon": "icon-name",
      "subTopics": [
        {
          "name": "Sub-Topic name",
          "icon": "icon-name",
          "categories": [
            {
              "name": "Category name",
              "icon": "icon-name",
              "subCategories": [
                {
                  "name": "Leaf Node Name",
                  "description": "One sentence explanation.",
                  "icon": "icon-name",
                  "tags": ["tag1", "tag2"]
                }
              ]
            }
          ]
        }
      ]
    }
  
    CRITICAL: Do NOT include any extra text or explanations outside the JSON structure. Returns ONLY the raw JSON.`;

  const userPrompt = `Text to analyze:\n---\n${text}\n---`;


  const maxAttempts = 1;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await generateContent({
        provider,
        apiKey,
        systemPrompt,
        userPrompt,
        schema: GenerateMindMapFromTextOutputSchema,
        strict
      });

      return result;
    } catch (e: any) {
      lastError = e;
      console.error(`❌ Text-to-map generation attempt ${attempt} failed:`, e.message);
      if (attempt === maxAttempts) throw e;
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  throw lastError || new Error('Text-to-map generation failed');
}
