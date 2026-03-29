
'use server';

/**
 * @fileOverview Production-grade multi-stage PDF → MindMap pipeline (PMG).
 *
 * Pipeline: Clean → Chunk → Concept Extraction (parallel) → SKEE Analysis → Generate → Validate
 *
 * PMG (Progressive Map Generation) replaces sequential chunk summarization
 * with parallel concept extraction for 3-4× speed improvement.
 *
 * SKEE (Smart Knowledge Extraction Engine) adds a deterministic structure
 * analysis layer that detects headings, extracts keywords, and identifies
 * relationships to provide structured scaffolding for the AI generation step.
 */

import { cleanPDFText } from '@/lib/text-cleaner';
import { chunkText } from '@/lib/text-chunker';
import { extractConceptsParallel } from '@/ai/flows/summarize-chunk';
import { deduplicateConcepts, conceptsToPromptContext, ExtractedConcept } from '@/knowledge-engine/concept-extractor';
import { setPdfContext } from '@/lib/pdf-context-store';
import {
    GenerateMindMapFromTextInput,
    GenerateMindMapFromTextOutput,
    GenerateMindMapFromTextOutputSchema,
} from '@/ai/schemas/generate-mind-map-from-text-schema';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';
import { analyzeDocument } from '@/knowledge-engine';

/** Threshold below which we skip chunking and send text directly */
const DIRECT_GENERATION_THRESHOLD = 8000;

/** Maximum retries for the final mind map generation if schema validation fails */
const MAX_GENERATION_RETRIES = 2;

/**
 * PMG PDF → MindMap pipeline.
 *
 * 1. Clean raw PDF text
 * 2. Chunk into 2000-char segments (skip for docs ≤8000 chars)
 * 3. Parallel concept extraction (concurrency: 8)
 * 4. SKEE: Deterministic document structure analysis
 * 5. Generate mind map from concepts + SKEE context
 * 6. Validate with Zod schema (retry up to 2x on failure)
 */
export async function generateMindMapFromPdf(
    input: GenerateMindMapFromTextInput & { apiKey?: string; provider?: AIProvider; strict?: boolean }
): Promise<GenerateMindMapFromTextOutput> {
    const { provider, apiKey, context, targetLang, text, persona, strict, depth = 'low' } = input;

    console.log(`📄 PDF Pipeline: Starting. Raw text length: ${text.length} chars`);

    // ── Stage 1: Clean ──────────────────────────────────────────────
    const cleaned = cleanPDFText(text);
    console.log(`📄 PDF Pipeline: Cleaned text length: ${cleaned.length} chars`);

    // ── Stage 2 & 3: Chunk + Concept Extraction (PMG) ───────────────
    let contentForGeneration: string;
    let extractedConceptsContext = '';
    let rawConceptsArray: ExtractedConcept[] = [];

    if (cleaned.length <= DIRECT_GENERATION_THRESHOLD) {
        // Short/medium document — process as single chunk for concept extraction
        console.log(`📄 PMG Pipeline: Document ≤${DIRECT_GENERATION_THRESHOLD} chars, extracting concepts from single chunk.`);
        const rawConcepts = await extractConceptsParallel([cleaned], 1, apiKey);
        const concepts = deduplicateConcepts(rawConcepts);
        rawConceptsArray = concepts;
        extractedConceptsContext = conceptsToPromptContext(concepts);
        contentForGeneration = cleaned;
    } else {
        // Large document — chunk and extract concepts in parallel
        const chunks = chunkText(cleaned, 2000, 200);
        const chunkTexts = chunks.map(c => c.text);
        console.log(`📄 PMG Pipeline: Created ${chunks.length} chunks. Starting parallel concept extraction...`);

        const rawConcepts = await extractConceptsParallel(chunkTexts, 8, apiKey);
        const concepts = deduplicateConcepts(rawConcepts);
        rawConceptsArray = concepts;

        console.log(`📄 PMG Pipeline: ${rawConcepts.length} raw → ${concepts.length} unique concepts extracted.`);

        if (concepts.length === 0) {
            // Concept extraction failed — fall back to truncated raw text
            console.warn(`⚠️ PMG Pipeline: Concept extraction failed. Falling back to truncated raw text.`);
            contentForGeneration = cleaned.substring(0, 12000);
        } else {
            // Concepts are inherently compact — no truncation needed
            extractedConceptsContext = conceptsToPromptContext(concepts);
            // Also keep a shorter version of the cleaned text for context
            contentForGeneration = cleaned.substring(0, 4000);
        }
    }

    console.log(`📄 PMG Pipeline: Content for generation: ${contentForGeneration.length} chars, concepts context: ${extractedConceptsContext.length} chars`);

    // ── Stage 4: SKEE — Deterministic Document Analysis ─────────────
    // Run on the original cleaned text (not summaries) for best structure detection
    const skeeResult = analyzeDocument(cleaned);
    const hasStructure = skeeResult.structuredContext.length > 0;

    if (hasStructure) {
        console.log(`🧠 SKEE Analysis complete:`, skeeResult.stats);
    } else {
        console.log(`🧠 SKEE Analysis: No strong document structure detected, AI will infer.`);
    }

    // ── Stage 5: Generate MindMap ───────────────────────────────────
    // Dynamic density: use SKEE section count as minimum subTopics when structure is detected
    const skeeSections = hasStructure ? skeeResult.stats.sectionsCreated : 0;
    let densityInstruction = '';
    if (depth === 'medium') {
        const minSubs = Math.max(5, skeeSections);
        densityInstruction = `STRUCTURE DENSITY: Generate EXACTLY ${minSubs} subTopics. Each subTopic MUST have EXACTLY 3 categories. (Target: ~${minSubs * 12} nodes)`;
    } else if (depth === 'deep') {
        const minSubs = Math.max(6, skeeSections);
        densityInstruction = `STRUCTURE DENSITY: Generate EXACTLY ${minSubs} subTopics. Each subTopic MUST have EXACTLY 4 categories. (Target: ~${minSubs * 20} nodes)`;
    } else {
        const minSubs = Math.max(4, skeeSections);
        densityInstruction = `STRUCTURE DENSITY: Generate at least ${minSubs} subTopics. Each subTopic should have 2-3 categories. (Target: ~${minSubs * 8} nodes)`;
    }

    const targetLangInstruction = targetLang
        ? `The entire mind map MUST be in the following language: ${targetLang}.`
        : `The entire mind map MUST be in English.`;

    // Build SKEE context section for the prompt
    const skeeSection = hasStructure
        ? `
    **PRE-ANALYZED DOCUMENT STRUCTURE (use as structural guide)**:
    The following analysis was extracted algorithmically from the document.
    Use this as the PRIMARY scaffold for your mind map hierarchy.
    DO NOT ignore these sections — they represent the actual document structure.

    ${skeeResult.structuredContext}
    ---
    - Your subTopics SHOULD map to the detected sections above.
    - Your categories and subCategories SHOULD reflect the key concepts and relationships found.
    - You may add additional insights, but the core structure must match the document.
    
    **ANTI-REDACTION POLICY**:
    1. DO NOT create generic, conceptual categories like "Cardholder Details" -> "Name" -> "Indicates the name of the person".
    2. YOU MUST USE THE ACTUAL DATA. Combine fields and values: "Megha's Identity" -> "Name: Megha" -> "DOB: 01/01/1990".
    3. Never output a field name (like "Address" or "ID Number") without its corresponding value if it's visible. 
    4. Fill the structure with the **actual, literal data, numbers, dates, and entity names** extracted by OCR from the visual content.
    5. **ANTI-REDACTION POLICY**: DO NOT use placeholders like "[REDACTED]", "[PRIVACY]", or "XXXX". Always provide the actual text found in the image.`
        : `
    **ANTI-REDACTION POLICY**:
    - DO NOT use placeholders like "[REDACTED]", "[PRIVACY]", or "XXXX".
    - You MUST extract and display literal, actual values specifically found in the document (e.g., actual names, account holders, numeric IDs, addresses, and dates).
    - This is for the user's private research on their own files; exact extraction is the goal.`;

    let personaInstruction = '';
    const selectedPersona = persona || 'Teacher';
    if (selectedPersona === 'Teacher') {
        personaInstruction = `
    ADOPT PERSONA: "Expert Teacher"
    - Use educational analogies to explain complex concepts found in the document.
    - Focus on "How" and "Why" in descriptions.
    - Structure sub-topics like a curriculum or learning path.
    - Descriptions should be encouraging and clear.`;
    } else if (selectedPersona === 'Concise') {
        personaInstruction = `
    ADOPT PERSONA: "Efficiency Expert"
    - Keep all text extracted from the document extremely brief.
    - Use fragments or high-impact keywords instead of long sentences.
    - Focus only on the most critical information.
    - Descriptions should be very short (max 15 words).`;
    } else if (selectedPersona === 'Creative') {
        personaInstruction = `
    ADOPT PERSONA: "Creative Visionary"
    - Explore unique connections and innovative angles within the document's content.
    - Use vivid, evocative language in descriptions.
    - Highlight theoretical or "Innovation" aspects.
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
    - Use educational analogies to explain complex concepts found in the document.
    - Focus on "How" and "Why" in descriptions.
    - Structure sub-topics like a curriculum or learning path.
    - Descriptions should be encouraging and clear.`;
    }

    const isMultiSource = (rawConceptsArray.length > 0 && cleaned.length > DIRECT_GENERATION_THRESHOLD) || (context?.includes('--- SOURCE:'));

    /** REQUIRED OUTPUT FORMAT */
    const systemPrompt = `You are a Document Intelligence Expert specializing in converting document summaries into structured mind maps.
    
    ${personaInstruction}
    
    **DOCUMENT ANALYSIS GOALS**:
    1. **Structural Integrity**: Identify major sections, topics, or themes from the summarized content.
    2. **Entity Extraction**: Extract specific names, dates, IDs, and core facts.
    3. **Logical Flow**: Organize content into a logical hierarchy (e.g., Intro -> Methods -> Results -> Conclusion).
    
    **DOCUMENT-SPECIFIC RULES**:
    - If the content looks like an academic paper, focus on: Abstract, Methodology, Key Findings, and Future Work.
    - If the content looks like a technical manual, focus on: Specifications, Installation, Troubleshooting, and FAQ.
    - If the content looks like a business report, focus on: Executive Summary, Market Analysis, Risks, and Recommendations.
    - If it is a personal document (Resume/Invoice), extract literal values (e.g., "Skills: React, Node.js").
    ${skeeSection}

    ${densityInstruction}
    ${targetLangInstruction}
    ${context ? `ADDITIONAL USER CONTEXT: "${context}"` : ''}

    **REQUIRED OUTPUT FORMAT** (return ONLY this JSON structure):
    {
      "mode": "${isMultiSource ? 'multi' : 'single'}",
      "topic": "Main Topic Title",
      "shortTitle": "Short Title",
      "icon": "lucide-icon-name",
      "subTopics": [
        {
          "name": "Sub Topic Name",
          "icon": "lucide-icon-name",
          "categories": [
            {
              "name": "Category Name",
              "icon": "lucide-icon-name",
              "subCategories": [
                {
                  "name": "Detail Name",
                  "description": "One sentence description of this detail.",
                  "icon": "lucide-icon-name"
                }
              ]
            }
          ]
        }
      ]
    }

    CRITICAL: Use exactly the field names shown above: "topic", "shortTitle", "icon", "subTopics", "categories", "subCategories", "description".
    Do NOT use "name" and "children" format. Do NOT wrap the output in any other key.`;

    const conceptSection = extractedConceptsContext
        ? `\n\n${extractedConceptsContext}`
        : '';

    const userPrompt = `DOCUMENT CONTENT:\n---\n${contentForGeneration}\n---${conceptSection}`;

    // ── Stage 6: Generate with retry ────────────────────────────────
    let lastError: any = null;

    for (let attempt = 0; attempt < MAX_GENERATION_RETRIES; attempt++) {
        try {
            console.log(`📄 PMG Pipeline: Generation attempt ${attempt + 1}/${MAX_GENERATION_RETRIES}...`);

            const result = await generateContent({
                provider,
                apiKey,
                systemPrompt,
                userPrompt,
                schema: GenerateMindMapFromTextOutputSchema,
                strict,
                options: {
                    capability: 'fast',
                }
            });

            // Debug: log what the AI actually returned
            if (result) {
                const keys = Object.keys(result);
                console.log(`📄 PMG Pipeline: AI response keys: [${keys.join(', ')}]`);
                console.log(`📄 PMG Pipeline: topic="${result.topic}", subTopics count=${result.subTopics?.length ?? 'N/A'}`);
            }

            // Basic structural validation
            // If the AI wrapped the data in a nested key, try to extract it
            let finalResult = result;
            if (result && !result.topic && !result.subTopics) {
                // Check for common wrapper keys
                const wrapperKeys = ['mindMap', 'mindmap', 'data', 'result', 'output', 'response'];
                for (const key of wrapperKeys) {
                    if (result[key] && typeof result[key] === 'object' && (result[key].topic || result[key].subTopics)) {
                        console.log(`📄 PMG Pipeline: Found nested data under "${key}" — unwrapping.`);
                        finalResult = result[key];
                        break;
                    }
                }
            }

            if (finalResult && (finalResult.subTopics?.length > 0 || finalResult.topic)) {
                console.log(`✅ PMG Pipeline: Mind map generated successfully on attempt ${attempt + 1}.`, {
                    topic: finalResult.topic,
                    subTopicsCount: finalResult.subTopics?.length ?? 0
                });

                // Store PDF context for the chat panel
                const contextKey = input.sessionId || finalResult.topic || 'default';
                setPdfContext(contextKey, {
                    summary: contentForGeneration,
                    concepts: rawConceptsArray,
                    timestamp: Date.now()
                });

                return {
                    ...finalResult,
                    pdfContext: {
                        summary: contentForGeneration,
                        concepts: rawConceptsArray,
                        timestamp: Date.now()
                    }
                };
            }

            console.warn(`⚠️ PMG Pipeline: Attempt ${attempt + 1} returned empty/invalid structure.`);
            lastError = new Error('Generation returned empty structure');
        } catch (err: any) {
            console.warn(`⚠️ PMG Pipeline: Attempt ${attempt + 1} failed:`, err.message);
            lastError = err;
        }

        // Wait before retry
        if (attempt < MAX_GENERATION_RETRIES - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    throw lastError || new Error('PDF mind map generation failed after all retries.');
}
