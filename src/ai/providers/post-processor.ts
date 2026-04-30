/**
 * AI Post-Processor — Shared JSON repair, extraction, and schema validation
 *
 * Extracted from client-dispatcher.ts and pollinations-client.ts into a
 * single shared module used by all provider adapters.
 *
 * Pipeline: Raw AI output → Extract JSON → Repair → Deep Extract → Normalize → Validate
 */

import { jsonrepair } from 'jsonrepair';

// ── StructuredOutputError ──────────────────────────────────────────────

export class StructuredOutputError extends Error {
  constructor(message: string, public rawOutput: string, public zodError?: any) {
    super(message);
    this.name = 'StructuredOutputError';
  }
}

// ── Processing Result ──────────────────────────────────────────────────

export interface PostProcessResult {
  data: any;
  repairApplied: boolean;
  salvaged: boolean;
}

// ── Main Pipeline ──────────────────────────────────────────────────────

export function postProcess(
  raw: any,
  schema?: any,
  strict: boolean = false
): PostProcessResult {
  let repairApplied = false;
  let salvaged = false;

  // Stage 1: If raw is already parsed object, go straight to validation
  if (typeof raw === 'object' && raw !== null) {
    const preprocessed = preprocessObject(raw);
    const result = performSchemaValidation(preprocessed, schema, JSON.stringify(raw), strict);
    salvaged = result !== preprocessed && schema != null;
    return { data: result, repairApplied, salvaged };
  }

  // Stage 2: Parse string responses
  if (typeof raw !== 'string') {
    return { data: raw, repairApplied: false, salvaged: false };
  }

  let parsed: any;
  let cleaned = raw.trim();

  // Strip markdown code fences
  if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/```[a-z]*\n?([\s\S]*?)\n?```/g, '$1').trim();
  }

  // Try standard parse
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // If no schema expected, return as plain text
    if (!schema) return { data: cleaned, repairApplied: false, salvaged: false };

    // Extract JSON boundaries
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extracted = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        parsed = JSON.parse(extracted);
      } catch (innerError) {
        // Attempt repair
        const repaired = repairJSON(extracted);
        if (repaired.success) {
          parsed = repaired.parsed;
          repairApplied = true;
        } else {
          throw new StructuredOutputError(
            `Failed to parse or repair JSON: ${(innerError as any).message}`,
            extracted
          );
        }
      }
    } else {
      throw new StructuredOutputError(
        `Failed to parse AI response as JSON: ${(e as any).message}`,
        cleaned
      );
    }
  }

  // Stage 3: Deep extraction
  const extracted = deepExtract(parsed);
  const target = extracted || parsed;

  // Stage 4: Preprocess and validate
  const preprocessed = preprocessObject(target);
  const validated = performSchemaValidation(preprocessed, schema, raw, strict);
  salvaged = validated !== preprocessed && schema != null;

  return { data: validated, repairApplied, salvaged };
}

// ── JSON Repair Pipeline ───────────────────────────────────────────────

export function repairJSON(text: string): { success: boolean; parsed: any } {
  // 1. Try jsonrepair library
  try {
    const repaired = JSON.parse(jsonrepair(text));
    console.log('🔧 jsonrepair succeeded');
    return { success: true, parsed: repaired };
  } catch {
    console.warn('⚠️ jsonrepair failed, attempting manual structural repair...');
  }

  // 2. Manual structural repair for truncated responses
  let extracted = text;

  // Clean common AI truncation noise
  extracted = extracted
    .replace(/\[\s*\.\.\.\s*\]/g, '[]')
    .replace(/\.\.\.\s*\(truncated\)/g, '')
    .replace(/\.\.\./g, '');

  // Step back: remove trailing fragments
  while (extracted.length > 0 && !/[,:\[\{]\s*$/.test(extracted)) {
    const lastMarker = Math.max(
      extracted.lastIndexOf(','),
      extracted.lastIndexOf(':'),
      extracted.lastIndexOf('['),
      extracted.lastIndexOf('{'),
      extracted.lastIndexOf('"')
    );
    if (lastMarker !== -1) {
      extracted = extracted.substring(0, lastMarker);
    } else {
      break;
    }
  }

  // Remove dangling structural symbol
  extracted = extracted.replace(/[,:\[\{]\s*$/, '').trim();

  // 3. Close open structures using a stack
  const stack: string[] = [];
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < extracted.length; i++) {
    const char = extracted[i];
    if (isEscaped) { isEscaped = false; continue; }
    if (char === '\\') { isEscaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (!inString) {
      if (char === '{' || char === '[') stack.push(char);
      else if (char === '}') { if (stack[stack.length - 1] === '{') stack.pop(); }
      else if (char === ']') { if (stack[stack.length - 1] === '[') stack.pop(); }
    }
  }

  while (stack.length > 0) {
    const openChar = stack.pop();
    extracted += (openChar === '{' ? '}' : ']');
  }

  try {
    const parsed = JSON.parse(extracted);
    console.log('🔧 Manual structural repair succeeded');
    return { success: true, parsed };
  } catch {
    return { success: false, parsed: null };
  }
}

// ── Deep Extraction ────────────────────────────────────────────────────

export function deepExtract(obj: any, currentDepth: number = 0): any {
  if (currentDepth > 10 || !obj || typeof obj !== 'object') return null;

  // Direct mind map or compare data
  if (obj.topic || (obj.mode === 'compare' && obj.compareData)) return obj;
  if (obj.similarities || obj.differences) return obj;

  // Unwrap content wrappers
  const content = obj.content || obj.text || obj.message?.content ||
    (obj.choices && obj.choices[0]?.message?.content);
  if (content) {
    if (typeof content === 'string') {
      try {
        const first = content.indexOf('{');
        const last = content.lastIndexOf('}');
        if (first !== -1 && last !== -1) {
          return deepExtract(JSON.parse(content.substring(first, last + 1)), currentDepth + 1);
        }
        return deepExtract(JSON.parse(content), currentDepth + 1);
      } catch { /* not parseable */ }
    } else {
      return deepExtract(content, currentDepth + 1);
    }
  }

  // Unwrap tool calls
  if (Array.isArray(obj.tool_calls) && obj.tool_calls.length > 0) {
    const args = obj.tool_calls[0].function?.arguments;
    if (args) {
      try {
        return deepExtract(typeof args === 'string' ? JSON.parse(args) : args, currentDepth + 1);
      } catch { /* not parseable */ }
    }
  }

  // Recursive key search
  for (const key in obj) {
    const found = deepExtract(obj[key], currentDepth + 1);
    if (found) return found;
  }
  return null;
}

// ── Object Preprocessing ───────────────────────────────────────────────

function preprocessObject(parsed: any): any {
  if (typeof parsed !== 'object' || parsed === null) return parsed;

  const keys = Object.keys(parsed);
  console.log(`🔍 PostProcessor: Processing object with keys [${keys.slice(0, 10).join(', ')}]`);

  // Map common model variations to expected schema keys
  if (parsed.centralTopic && !parsed.topic) parsed.topic = parsed.centralTopic;
  if (parsed.title && !parsed.topic) parsed.topic = parsed.title;
  if (parsed.topic && !parsed.shortTitle) {
    parsed.shortTitle = typeof parsed.topic === 'string'
      ? parsed.topic.split(' ').slice(0, 4).join(' ')
      : 'Topic';
  }
  if (!parsed.icon) parsed.icon = 'brain-circuit';

  // Unwrap common containers
  if (!parsed.topic && !parsed.subTopics && !parsed.compareData) {
    const wrapperKeys = ['mindMap', 'mindmap', 'data', 'result', 'output', 'response', 'mind_map'];
    for (const key of wrapperKeys) {
      if (parsed[key] && typeof parsed[key] === 'object') {
        console.log(`🔍 PostProcessor: Unwrapping nested data from "${key}" key`);
        parsed = parsed[key];
        break;
      }
    }
  }

  // Fallback for tree format
  if (!parsed.topic && parsed.name && Array.isArray(parsed.children)) {
    console.log(`🔄 PostProcessor: Normalizing {name, children} format → schema format`);
    parsed = normalizeMindMapTree(parsed);
  }

  return parsed;
}

// ── Mind Map Tree Normalization ────────────────────────────────────────

export function normalizeMindMapTree(tree: any): any {
  const rootName = tree.name || tree.title || 'Document Mind Map';
  const rootChildren = tree.children || [];

  const subTopics = rootChildren.map((l1: any) => {
    const l1Children = l1.children || [];
    const categories = l1Children.map((l2: any) => {
      const l2Children = l2.children || [];
      const subCategories = l2Children.map((l3: any) => ({
        name: l3.name || l3.title || 'Detail',
        description: l3.description || l3.value || l3.content
          || (l3.children && l3.children.length > 0
            ? l3.children.map((c: any) => c.name || c.title || '').join(', ')
            : `Details about ${l3.name || 'this item'}`),
        icon: l3.icon || 'circle',
        tags: l3.tags || [],
      }));

      return {
        name: l2.name || l2.title || 'Category',
        icon: l2.icon || 'folder',
        subCategories: subCategories.length > 0 ? subCategories : [
          { name: l2.name || 'Detail', description: l2.description || `About ${l2.name}`, icon: 'circle' }
        ],
      };
    });

    return {
      name: l1.name || l1.title || 'Sub-Topic',
      icon: l1.icon || 'layers',
      categories: categories.length > 0 ? categories : [{
        name: l1.name || 'Overview',
        icon: 'folder',
        subCategories: [
          { name: l1.name || 'Detail', description: l1.description || `About ${l1.name}`, icon: 'circle' }
        ]
      }],
    };
  });

  const normalized = {
    mode: 'single' as const,
    topic: rootName,
    shortTitle: rootName.split(' ').slice(0, 3).join(' '),
    icon: tree.icon || 'brain',
    subTopics: subTopics.length > 0 ? subTopics : [],
  };

  console.log(`🔄 Normalized: topic="${normalized.topic}", subTopics=${normalized.subTopics.length}`);
  return normalized;
}

// ── Schema Validation + Salvage ────────────────────────────────────────

export function performSchemaValidation(
  parsed: any,
  schema: any,
  originalRaw: string,
  strict: boolean = false
): any {
  if (!schema) return parsed;

  const result = schema.safeParse(parsed);
  console.log(`🔍 Schema validation: success=${result.success}, keys=${result.success ? Object.keys(result.data || {}).join(',') : 'N/A'}`);

  if (!result.success) {
    const partial = parsed as any;

    // Detect root-level categories (common AI failure mode)
    if (Array.isArray(partial.categories) && partial.categories.length > 0 &&
        (!partial.subTopics || partial.subTopics.length === 0)) {
      console.warn('🔄 Salvage: Detected root-level categories. Mapping to a default sub-topic.');
      partial.subTopics = [{
        name: 'Core Concepts',
        icon: 'layers',
        thought: 'Automatically recovered categories from root level.',
        categories: partial.categories
      }];
      delete partial.categories;
    }

    // Ensure top-level structure
    if (!partial.subTopics || !Array.isArray(partial.subTopics)) {
      partial.subTopics = [];
    }

    // Recursive sanitization
    partial.subTopics.forEach((st: any) => {
      if (!st.name) st.name = 'Sub-Topic';
      if (!st.icon) st.icon = 'layers';
      if (!st.categories || !Array.isArray(st.categories)) st.categories = [];
      st.categories.forEach((cat: any) => {
        if (!cat.name) cat.name = 'Category';
        if (!cat.icon) cat.icon = 'folder';
        if (!cat.subCategories || !Array.isArray(cat.subCategories)) cat.subCategories = [];
        cat.subCategories.forEach((sc: any) => {
          if (!sc.name) sc.name = 'Detail';
          if (!sc.icon) sc.icon = 'circle';
          if (!sc.description) sc.description = 'Additional information about this item.';
        });
      });
    });

    if (partial.subTopics.length >= 1 || !strict) {
      console.warn('⚠️ Salvaging partial mind map after schema mismatch. Zod Error:', result.error.message);
      return partial;
    }

    if (strict) {
      console.error('❌ Schema Validation Error:', result.error);
      throw new StructuredOutputError(
        'AI response did not match the required schema structure.',
        originalRaw,
        result.error
      );
    } else {
      console.warn('⚠️ Schema validation failed (non-strict). Issues:', result.error.message);
    }
  }

  const validatedData = result.data;
  if (!validatedData || typeof validatedData !== 'object' || Array.isArray(validatedData)) {
    console.warn('⚠️ Zod returned invalid data structure, falling back to parsed data');
    return parsed;
  }

  if (!Array.isArray(validatedData.subTopics) || validatedData.subTopics.length === 0) {
    console.warn('⚠️ Zod returned empty subTopics, falling back to parsed data');
    return parsed.subTopics && parsed.subTopics.length > 0 ? parsed : validatedData;
  }

  return validatedData;
}

// ── Reasoning-Only Detection ───────────────────────────────────────────

export function isReasoningOnly(raw: any, schema?: any, isFinalAttempt: boolean = false): boolean {
  if (typeof raw !== 'object' || raw === null) return false;

  const hasReasoning = !!raw.reasoning_content || !!raw.reasoning ||
    (typeof raw.thought === 'string' && raw.thought.length > 200);

  const hasSubTopics = Array.isArray(raw.subTopics) && raw.subTopics.length > 0;
  const hasCompareData = !!raw.compareData || !!raw.similarities || !!raw.differences;
  const hasRootData = !!raw.root || !!raw.topic;
  const hasGeneralContent = !!raw.content || !!raw.text || !!raw.enhancedPrompt || !!raw.answer || !!raw.result;

  const isMindMapSchema = (schema?.description || '').toLowerCase().includes('mind map') ||
    JSON.stringify(schema || {}).toLowerCase().includes('subtopics');

  if (isMindMapSchema && hasRootData && !hasSubTopics) {
    if (isFinalAttempt) {
      console.warn('⚠️ Final attempt: Accepting response with topic but no subTopics.');
      return false;
    }
    return true;
  }

  const hasActualData = hasSubTopics || hasCompareData || hasGeneralContent;

  if (Object.keys(raw).length <= 2 && hasReasoning && !hasActualData) {
    return !isFinalAttempt;
  }

  if (!isMindMapSchema && !hasCompareData) {
    if (hasActualData) return false;
    return hasReasoning && !isFinalAttempt;
  }

  return hasReasoning && !hasActualData;
}
