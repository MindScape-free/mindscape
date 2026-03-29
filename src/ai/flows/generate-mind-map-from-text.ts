
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

  // ── Multi-Source Detection ──
  const sourceCount = context ? (context.split('--- SOURCE:').length - 1) : 0;
  const isMultiSource = sourceCount > 0;

  // Map depth to structural density
  let densityInstruction = '';
  if (isMultiSource) {
    // Dynamic density implementation for Multi-Source
    // We aim for at least as many subTopics as there are sources, capped at 12 to avoid JSON overflow.
    const minSubTopics = Math.max(4, Math.min(sourceCount, 12));
    const catsPerSub = depth === 'deep' ? 4 : (depth === 'medium' ? 3 : 2);
    const subCatsPerCat = depth === 'deep' ? 5 : (depth === 'medium' ? 4 : 3);
    
    densityInstruction = `
    **MULTI-SOURCE DENSITY PLAN**:
    - Because you are processing ${sourceCount} sources, you MUST generate AT LEAST ${minSubTopics} subTopics.
    - Each subTopic MUST have ${catsPerSub} categories.
    - Each category MUST have ${subCatsPerCat} subCategories.
    - TOTAL COVERAGE: Ensure every one of the ${sourceCount} sources has at least one dedicated subTopic or major category branch. Do NOT omit any source.`;
  } else if (depth === 'medium') {
    densityInstruction = 'STRUCTURE DENSITY: Generate EXACTLY 5 subTopics. Each subTopic MUST have EXACTLY 3 categories. Each category MUST have EXACTLY 3-4 subCategories. (Target: ~60 nodes)';
  } else if (depth === 'deep') {
    densityInstruction = 'STRUCTURE DENSITY: Generate EXACTLY 6 subTopics. Each subTopic MUST have EXACTLY 4 categories. Each category MUST have EXACTLY 5 subCategories. (Target: ~120 nodes)';
  } else {
    densityInstruction = 'STRUCTURE DENSITY: Generate 4 subTopics. Each subTopic should have 2 categories. Each category should have 3 subCategories. (Target: ~24 nodes)';
  }

  let personaInstruction = '';
  const selectedPersona = persona || 'Teacher';
  if (selectedPersona === 'Teacher') {
    personaInstruction = `
    ADOPT PERSONA: "Expert Teacher"
    - Use educational analogies to explain complex concepts found in the content.
    - Focus on "How" and "Why" in descriptions.
    - Structure sub-topics like a curriculum or learning path.
    - Descriptions should be encouraging and clear.`;
  } else if (selectedPersona === 'Concise') {
    personaInstruction = `
    ADOPT PERSONA: "Efficiency Expert"
    - Keep all text extracted from the source extremely brief.
    - Use fragments or high-impact keywords instead of long sentences.
    - Focus only on the most critical information from the text.
    - Descriptions should be very short (max 15 words).`;
  } else if (selectedPersona === 'Creative') {
    personaInstruction = `
    ADOPT PERSONA: "Creative Visionary"
    - Explore unique connections and innovative angles within the text.
    - Use vivid, evocative language in descriptions.
    - Highlight theoretical or "Innovation" aspects found in the content.
    - Make the content feel inspired and non-obvious.`;
  } else if (selectedPersona === 'Sage') {
    personaInstruction = `
    ADOPT PERSONA: "Cognitive Sage"
    - Synthesize deep philosophical perspectives and cross-domain knowledge.
    - Focus on the "Meaning" and "Impact" of the content.
    - Use professional, academic, yet accessible language.
    - Structure content to reveal underlying patterns and wisdom.`;
  } else {
    personaInstruction = `
    ADOPT PERSONA: "Expert Teacher"
    - Use educational analogies to explain complex concepts found in the text.
    - Focus on "How" and "Why" in descriptions.
    - Structure sub-topics like a curriculum or learning path.
    - Descriptions should be encouraging and clear.`;
  }

  let contextInstruction = '';
  if (context) {
    if (context.includes('--- SOURCE:')) {
      contextInstruction = `
    **MULTI-SOURCE CONTEXT**:
    The provided "Context" contains information from ${sourceCount} different sources delineated by "--- SOURCE: [Name] ---" blocks.
    Your absolute priority is to SYNTHESIZE all this information into a single coherent mind map while ensuring TOTAL COVERAGE.
    
    **CRITICAL COVERAGE RULES**:
    1. You MUST ensure that every one of the ${sourceCount} sources is clearly represented in the mind map.
    2. Use the user's primary focus (the "Text/Topic" provided below) as the central lens.
    3. If topics across sources are radically different, create dedicated \`subTopics\` for each distinct source to ensure nothing is lost.
    4. Link overlapping facts across sources using categories, but keep unique data alive in subCategories.

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
    ${isMultiSource ? '- CONCISENESS RULE (MULTI-SOURCE): Keep descriptions extremely brief (MAX 10 words) to ensure all sources fit in the structural map.' : ''}

    ${densityInstruction}
  
    ${contextInstruction}
  
    ${targetLangInstruction}
  
    **SYNTHESIS GOAL**:
    Your goal is to build a comprehensive knowledge graph of the provided material. 
    ${isMultiSource ? 'Since you are in MULTI-SOURCE mode, focus on synthesizing the overlapping and unique perspectives from all sources onto the central topic.' : 'Focus on extracting the most important hierarchical information from the provided text.'}
    The output must be a valid JSON object that strictly adheres to the following structure:
    {
      "mode": "${isMultiSource ? 'multi' : 'single'}",
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
