'use server';

/**
 * @fileOverview Generates a mind map from extracted website content.
 */

import {
  GenerateMindMapFromWebsiteInput,
  GenerateMindMapFromWebsiteOutput,
  GenerateMindMapFromWebsiteOutputSchema,
} from '@/ai/schemas/generate-mind-map-from-website-schema';

import { generateContent, AIProvider } from '@/ai/client-dispatcher';

export async function generateMindMapFromWebsite(
  input: GenerateMindMapFromWebsiteInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<GenerateMindMapFromWebsiteOutput> {
  const { provider, apiKey, context, targetLang, content, persona, strict, depth = 'low' } = input;

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
  const selectedPersona = persona || 'Teacher';
  if (selectedPersona === 'Teacher') {
    personaInstruction = `
    ADOPT PERSONA: "Expert Teacher"
    - Use educational analogies to explain complex concepts found in the website content.
    - Focus on "How" and "Why" in descriptions.
    - Structure sub-topics like a curriculum or learning path based on the site's structure.
    - Descriptions should be encouraging and clear.`;
  } else if (selectedPersona === 'Concise') {
    personaInstruction = `
    ADOPT PERSONA: "Efficiency Expert"
    - Keep all text extracted from the website extremely brief.
    - Use fragments or high-impact keywords instead of long sentences.
    - Focus only on the most critical information summarized from the page.
    - Descriptions should be very short (max 15 words).`;
  } else if (selectedPersona === 'Creative') {
    personaInstruction = `
    ADOPT PERSONA: "Creative Visionary"
    - Explore unique connections and innovative angles within the website's themes.
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
    - Use educational analogies to explain complex concepts found in the website content.
    - Focus on "How" and "Why" in descriptions.
    - Structure sub-topics like a curriculum or learning path.
    - Descriptions should be encouraging and clear.`;
  }

  const contextInstruction = context
    ? `The user has provided the following additional context or instructions, which you should prioritize: "${context}"`
    : '';

  const targetLangInstruction = targetLang
    ? `The entire mind map, including all topics, categories, and descriptions, MUST be in the following language: ${targetLang}.`
    : `The entire mind map MUST be in English.`;

  // Use the extracted heading structure as a guide
  const structuralGuide = content.textBlocks
    .filter(block => block.type === 'heading')
    .map(block => `${'  '.repeat((block.level || 1) - 1)}- ${block.content}`)
    .join('\n');

  const structuralSection = structuralGuide.length > 0
    ? `
    **WEBSITE HIERARCHY (use as structural guide)**:
    The following headings were detected from the webpage structure.
    Use this as a guide for your subTopics and categories where appropriate.

    ${structuralGuide}
    ---`
    : '';

  const systemPrompt = `You are an expert in analyzing website content and creating structured, comprehensive mind maps from it.
  
    ${personaInstruction}
  
    Analyze the provided website content (Title: "${content.title}") and generate a detailed, multi-layered mind map based on its themes and structure. 
    
    ${structuralSection}

    **WEBSITE ANALYSIS RULES**:
    - Identify the main purpose and key message of the page.
    - Look for key sections, features, or arguments presented on the site.
    - If the page is a blog post, focus on the main points and takeaways.
    - If the page is a product or service page, focus on features, benefits, and use cases.
    - If the page is academic or technical, ensure accurate terminology is preserved.

    **EXTRACTION RULES**:
    - Prioritize information density and logical hierarchy.
    - Each \`subCategory\` MUST contain a specific fact, feature, or insight from the website.
    - Avoid repetitive or redundant nodes.
    - Synthesize the core message of each section provided in the text.

    ${densityInstruction}
  
    ${contextInstruction}
  
    ${targetLangInstruction}
  
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

  const userPrompt = `Website Content to analyze:\n---\nTitle: ${content.title}\nContent:\n${content.textContent.substring(0, 15000)}\n---`; // Limit content to 15k chars for prompt safety

  try {
    const result = await generateContent({
      provider,
      apiKey,
      systemPrompt,
      userPrompt,
      schema: GenerateMindMapFromWebsiteOutputSchema,
      strict
    });

    return result;
  } catch (e: any) {
    console.error(`❌ Website-to-map generation failed:`, e.message);
    throw e;
  }
}
