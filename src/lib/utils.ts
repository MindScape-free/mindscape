
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
 * Supports: headings, bold, italic, code, lists, tables, and emojis.
 * @param {string} text - The block of text to format.
 * @returns {string} A string containing the formatted HTML.
 */
export const formatText = (text: string): string => {
  if (!text) return '';

  // Clean citations first
  const cleanedText = cleanCitations(text);
  const lines = cleanedText.split('\n');
  let html = '';
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let inTable = false;
  let tableRows: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // PREVENT XSS: Escape raw HTML tags from AI output
    let processedLine = line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .trim();

    // Handle table rows
    if (processedLine.startsWith('|') && processedLine.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(processedLine);

      // Check if next line is not a table row or is the last line
      const nextLine = lines[i + 1]?.trim();
      if (!nextLine || (!nextLine.startsWith('|') || !nextLine.endsWith('|'))) {
        // Process complete table
        html += formatTable(tableRows);
        inTable = false;
        tableRows = [];
      }
      continue;
    }

    // Close list if we're in one and hit a non-list line
    if (inList) {
      const isListItem = /^\s*([*-]|\d+\.)\s+/.test(line);
      const isEmptyLine = !processedLine;

      // If it's not a list item, check if it's just an empty line between list items (loose list)
      if (!isListItem) {
        let shouldCloseList = true;

        if (isEmptyLine) {
          // Look ahead to see if the next non-empty line is a list item of the same type
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
      let level = processedLine.match(/^#+/)![0].length;
      let content = processedLine.substring(level).trim();
      content = formatInlineMarkdown(content);
      html += `<h${level}>${content}</h${level}>`;
      continue;
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
      // Handle paragraphs
      if (processedLine) {
        html += `<p>${formatInlineMarkdown(processedLine)}</p>`;
      }
    }
  }

  if (inList) {
    html += `</${listType}>`;
  }

  return html.replace(/<p><\/p>/g, '');
};

/**
 * Formats inline markdown (bold, italic, code).
 */
function formatInlineMarkdown(text: string): string {
  // Code blocks (backticks)
  text = text.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-muted rounded text-sm font-mono">$1</code>');

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

  let html = '<table class="w-full border-collapse my-4"><thead>';

  // Header row
  const headerCells = rows[0].split('|').filter(cell => cell.trim());
  html += '<tr>';
  headerCells.forEach(cell => {
    html += `<th class="border border-border px-3 py-2 bg-muted font-semibold text-left">${formatInlineMarkdown(cell.trim())}</th>`;
  });
  html += '</tr></thead><tbody>';

  // Skip separator row (index 1) and process data rows
  for (let i = 2; i < rows.length; i++) {
    const cells = rows[i].split('|').filter(cell => cell.trim());
    html += '<tr>';
    cells.forEach(cell => {
      html += `<td class="border border-border px-3 py-2">${formatInlineMarkdown(cell.trim())}</td>`;
    });
    html += '</tr>';
  }

  html += '</tbody></table>';
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
