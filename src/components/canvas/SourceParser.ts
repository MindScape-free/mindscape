'use client';

interface ParsedSource {
  title: string;
  type: string;
  content: string;
}

export function parseSourceContent(content: string): ParsedSource[] {
  if (!content) return [];
  
  const sourceRegex = /--- SOURCE: (.*?) \((.*?)\) ---/g;
  const chunks: ParsedSource[] = [];
  
  let lastIndex = 0;
  let match;
  
  while ((match = sourceRegex.exec(content)) !== null) {
    if (chunks.length > 0) {
      chunks[chunks.length - 1].content = content.substring(lastIndex, match.index).trim();
    }
    chunks.push({
      title: match[1],
      type: match[2],
      content: ''
    });
    lastIndex = sourceRegex.lastIndex;
  }
  
  if (chunks.length > 0) {
    chunks[chunks.length - 1].content = content.substring(lastIndex).trim();
  } else {
    return [{ title: 'Source Content', type: 'text', content: content.trim() }];
  }
  
  return chunks;
}
