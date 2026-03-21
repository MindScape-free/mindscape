import { SourceItem } from '@/types/multi-source';

/**
 * Merges multiple source contents into a single formatted string for AI processing.
 */
export function mergeSourceContents(sources: SourceItem[]): string {
  const readySources = sources.filter(s => s.status === 'ready');
  
  if (readySources.length === 0) return '';

  return readySources.map(source => {
    let header = `--- SOURCE: ${source.label} (${source.type.toUpperCase()}) ---`;
    return `${header}\n\n${source.content}\n\n`;
  }).join('\n');
}

/**
 * Calculates approximate context usage (simple character-based for now).
 * Assuming a safe limit of around 100k characters for the prompt context.
 */
export function calculateContextUsage(sources: SourceItem[]): number {
  const maxChars = 100000;
  const totalChars = sources.reduce((acc, s) => acc + (s.content?.length || 0), 0);
  return Math.min((totalChars / maxChars) * 100, 100);
}
