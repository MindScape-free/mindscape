import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import katex from 'katex';
import Prism from 'prismjs';

// Import Prism languages
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';

/**
 * A utility function to merge Tailwind CSS classes with clsx.
 * @param {...ClassValue[]} inputs - An array of class values.
 * @returns {string} The merged class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Removes citation numbers in brackets (e.g., [1], [2], [1][4]).
 * @param {string} text - The text to clean.
 * @returns {string} The cleaned text.
 */
export const cleanCitations = (text: string): string => {
  if (!text) return '';
  // Match [1], [2], [10] etc. Global flag handles multiple occurrences.
  return text.replace(/\[\d+\]/g, '').trim();
};

/**
 * Formats a block of text, converting markdown-style syntax to HTML.
 * Supports: headings, bold, italic, code blocks, lists, tables, and LaTeX math.
 */
export const formatText = (text: string): string => {
  if (!text) return '';

  // 1. Clean citations
  let processed = cleanCitations(text);

  // 2. Protect Code Blocks (Triple Backticks)
  const codeBlocks: string[] = [];
  processed = processed.replace(/```(\w*)\n([\s\S]+?)```/g, (_, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    const language = lang || 'text';
    
    let highlighted;
    try {
      const grammar = Prism.languages[language] || Prism.languages.text;
      highlighted = Prism.highlight(code.trim(), grammar, language);
    } catch (e) {
      highlighted = code.trim();
    }

    const blockHtml = `
      <div class="block w-full relative my-6 group rounded-[20px] overflow-hidden border border-white/10 bg-[#121212] shadow-2xl not-prose">
        <div class="flex items-center justify-between px-5 py-3 bg-white/[0.03] border-b border-white/5">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-500"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            <span class="text-[11px] font-bold tracking-tight text-zinc-300 capitalize">${language}</span>
          </div>
          <div class="flex items-center gap-3">
            <button 
              class="code-copy-btn p-1.5 text-zinc-500 hover:text-white transition-colors"
              data-code="${btoa(unescape(encodeURIComponent(code.trim())))}"
              title="Copy code"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
            </button>
            <button 
              class="code-run-btn flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition-all active:scale-95"
              data-code="${btoa(unescape(encodeURIComponent(code.trim())))}"
              data-lang="${language}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
              Run
            </button>
          </div>
        </div>
        <pre class="p-6 overflow-x-auto text-[13px] font-mono leading-relaxed text-zinc-300"><code class="language-${language}">${highlighted}</code></pre>
      </div>
    `;
    codeBlocks.push(blockHtml);
    return placeholder;
  });

  // 3. Protect LaTeX blocks
  const mathBlocks: string[] = [];
  
  processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (_, formula) => {
    const placeholder = `__MATH_BLOCK_${mathBlocks.length}__`;
    try {
      mathBlocks.push(katex.renderToString(formula, { displayMode: true, throwOnError: false }));
    } catch (e) {
      mathBlocks.push(`\\[${formula}\\]`);
    }
    return placeholder;
  });

  processed = processed.replace(/\\\(([\s\S]+?)\\\)/g, (_, formula) => {
    const placeholder = `__MATH_BLOCK_${mathBlocks.length}__`;
    try {
      mathBlocks.push(katex.renderToString(formula, { displayMode: false, throwOnError: false }));
    } catch (e) {
      mathBlocks.push(`\\(${formula}\\)`);
    }
    return placeholder;
  });

  const lines = processed.split('\n');
  let html = '';
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let inTable = false;
  let tableRows: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip placeholder lines from XSS escaping
    const isPlaceholder = line.includes('__CODE_BLOCK_') || line.includes('__MATH_BLOCK_');
    
    let processedLine = line;
    if (!isPlaceholder) {
      processedLine = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .trim();
    } else {
      processedLine = line.trim();
    }

    // Handle table rows
    if (processedLine.startsWith('|') && processedLine.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(processedLine);

      const nextLine = lines[i + 1]?.trim();
      if (!nextLine || (!nextLine.startsWith('|') || !nextLine.endsWith('|'))) {
        html += formatTable(tableRows);
        inTable = false;
        tableRows = [];
      }
      continue;
    }

    // Close list
    if (inList) {
      const isListItem = /^\s*([*-]|\d+\.)\s+/.test(line);
      const isEmptyLine = !processedLine;

      if (!isListItem) {
        let shouldCloseList = true;
        if (isEmptyLine) {
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            if (nextLine) {
              const isNextUnordered = /^\s*([*-])\s+/.test(lines[j]);
              const isNextOrdered = /^\s*\d+\.\s+/.test(lines[j]);
              if ((listType === 'ul' && isNextUnordered) || (listType === 'ol' && isNextOrdered)) {
                shouldCloseList = false;
              }
              break;
            }
          }
        }
        if (shouldCloseList) {
          html += `</${listType}>`;
          inList = false;
        }
      }
    }

    // Handle headings
    if (processedLine.startsWith('#')) {
      const match = processedLine.match(/^#+/);
      if (match) {
        const level = match[0].length;
        let content = processedLine.substring(level).trim();
        content = formatInlineMarkdown(content);
        html += `<h${level}>${content}</h${level}>`;
        continue;
      }
    }

    // Handle horizontal rules
    if (processedLine === '---' || processedLine === '***') {
      html += '<hr class="my-4 border-border" />';
      continue;
    }

    // Handle list items
    const isUnorderedListItem = /^\s*([*-])\s+/.test(line);
    const isOrderedListItem = /^\s*\d+\.\s+/.test(line);

    if (isUnorderedListItem || isOrderedListItem) {
      const currentListType = isUnorderedListItem ? 'ul' : 'ol';
      if (!inList) {
        inList = true;
        listType = currentListType;
        html += `<${listType}>`;
      } else if (listType !== currentListType) {
        html += `</${listType}><${currentListType}>`;
        listType = currentListType;
      }

      const listItemContent = line.replace(/^\s*([*-]|\d+\.)\s+/, '').trim();
      html += `<li>${formatInlineMarkdown(listItemContent)}</li>`;
    } else {
      if (processedLine) {
        // If it's a placeholder, wrap in a div to ensure it's a block
        if (isPlaceholder) {
          html += `<div class="w-full block">${formatInlineMarkdown(processedLine)}</div>`;
        } else {
          html += `<p>${formatInlineMarkdown(processedLine)}</p>`;
        }
      }
    }
  }

  if (inList) html += `</${listType}>`;

  // 4. Restore blocks
  let finalHtml = html.replace(/<p><\/p>/g, '');
  
  mathBlocks.forEach((rendered, idx) => {
    finalHtml = finalHtml.replace(`__MATH_BLOCK_${idx}__`, rendered);
  });
  
  codeBlocks.forEach((rendered, idx) => {
    finalHtml = finalHtml.replace(`__CODE_BLOCK_${idx}__`, rendered);
  });

  return finalHtml;
};

/**
 * Formats inline markdown (bold, italic, code).
 */
function formatInlineMarkdown(text: string): string {
  // Code blocks (backticks)
  text = text.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-white/10 rounded text-[13px] font-mono text-emerald-400">$1</code>');

  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Standard Markdown Links [text](url)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline break-all">$1</a>');

  // Linkify remaining plain URLs (prevent double-linkifying if already in a tag)
  const urlRegex = /(?<!href="|">)(https?:\/\/[^\s<]+[^.,\s<])/g;
  text = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline break-all">$1</a>');

  return text;
}

/**
 * Formats markdown table into HTML table.
 */
function formatTable(rows: string[]): string {
  if (rows.length < 2) return '';

  const markdownSource = rows.join('\n');
  const encodedSource = btoa(unescape(encodeURIComponent(markdownSource)));

  let html = `
    <div class="block w-fit max-w-full relative my-8 group rounded-[20px] overflow-hidden border border-white/10 bg-[#121212] shadow-2xl not-prose">
      <div class="flex items-center justify-between px-5 py-2 bg-white/[0.03] border-b border-white/5">
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-500"><path d="M3 3h18v18H3zM3 9h18M9 3v18"></path></svg>
          <span class="text-[10px] font-bold tracking-tight text-zinc-400 uppercase">Table</span>
        </div>
        <button 
          class="table-copy-btn p-1 text-zinc-500 hover:text-white transition-colors"
          data-markdown="${encodedSource}"
          title="Copy Markdown"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-[14px] font-medium">
          <thead>
            <tr class="bg-white/[0.02] border-b border-white/5">
  `;

  // Header row
  const headerCells = rows[0].split('|').filter(cell => cell.trim());
  headerCells.forEach(cell => {
    html += `<th class="px-6 py-4 font-bold uppercase tracking-tight text-zinc-400 text-[11px] whitespace-nowrap">${formatInlineMarkdown(cell.trim())}</th>`;
  });
  html += '</tr></thead><tbody class="divide-y divide-white/[0.03]">';

  // Skip separator row (index 1) and process data rows
  for (let i = 2; i < rows.length; i++) {
    const cells = rows[i].split('|').filter(cell => cell.trim());
    html += '<tr class="hover:bg-white/[0.01] transition-colors">';
    cells.forEach(cell => {
      html += `<td class="px-6 py-4 text-zinc-300 leading-relaxed">${formatInlineMarkdown(cell.trim())}</td>`;
    });
    html += '</tr>';
  }

  html += '</tbody></table></div></div>';
  return html;
}


/**
 * Formats a date into a short, relative time string (e.g., "5m", "2h", "3d").
 * @param {Date} date - The date to format.
 * @returns {string} The formatted short time string.
 */
export function formatShortDistanceToNow(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return '1m'; // Show 1m for anything under a minute
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo`;
  }
  const years = Math.floor(days / 365);
  return `${years}y`;
}

/**
 * Converts a string to PascalCase.
 * @param {string} str - The string to convert.
 * @returns {string} The PascalCase version of the string.
 */
export function toPascalCase(str: string): string {
  if (!str) return '';
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Extracts the YouTube video ID from a URL.
 * @param {string} url - The YouTube URL.
 * @returns {string | null} The video ID, or null if not found.
 */
export function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}
