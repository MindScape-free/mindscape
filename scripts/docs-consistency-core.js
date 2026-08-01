'use strict';

/**
 * Docs-consistency lint core.
 *
 * Pure, dependency-free detection logic shared by the CLI wrapper
 * (scripts/check-docs-consistency.mjs) and unit tests. The CLI adds file
 * discovery and exit-code handling on top of `lintLines`/`lintContent`.
 *
 * Banned items are tables that do NOT exist in the linked remote DB and code
 * symbols that were removed from the codebase. Lines that merely document an
 * item's absence (educational mentions, e.g. "does not exist", to_regclass
 * guards, "was removed") are allowed, as are lines opting out via the
 * per-line `docs-lint:ignore` escape hatch.
 */

/**
 * Tables that do NOT exist in the linked remote DB. References implying they
 * exist (e.g. "writes to the user_notifications table") are stale docs.
 * Add newly-removed/never-created tables here.
 */
const BANNED_TABLES = ['user_notifications', 'community_posts'];

/**
 * Code symbols removed from the codebase (dead-code removal). References
 * implying they still exist (e.g. "providerMonitor detects degradation") are
 * stale docs. Add newly-removed symbols here.
 */
const BANNED_SYMBOLS = [
  'providerMonitor',
  'useAIHealth',
  'agentMode',
  'generateContentWithPollinations',
];

/** All banned items scanned for. */
const BANNED = [...BANNED_TABLES, ...BANNED_SYMBOLS];

/**
 * A line that mentions a banned item is allowed if it also documents the
 * item's absence (educational reference) — e.g. the Not-Created Tables
 * section in DATABASE_DICTIONARY.md, to_regclass future-proofing guards, or
 * "the X table does not exist" statements. Heuristic: a negation phrase
 * ("no ... exists", "does not exist", etc.) on the same line is treated as
 * documenting absence, which may over-allow contrived phrasings but never
 * blocks the intended educational references.
 */
const EDUCATIONAL =
  /(?:never created|not created|does not exist|doesn't exist|don't exist|do not exist|to_regclass|future-guarded|not-created|was removed|is removed|removed in|removed from|🚫|\bno\b[^.\n]{0,80}?exists?)/i;

/**
 * Per-line escape hatch. A line containing `docs-lint:ignore` is skipped
 * entirely. The scoped form `docs-lint:ignore <term>` (captured in group 1)
 * whitelists only that term on the line, leaving other banned terms on the
 * same line flagged.
 */
const IGNORE_RE = /docs-lint:ignore\b(?:\s+([A-Za-z_][A-Za-z0-9_]*))?/;

/**
 * Scan an array of document lines for stale references.
 *
 * @param {string[]} lines - document lines (already split on newlines)
 * @returns {Array<{lineNumber: number, text: string, term: string}>}
 *   one entry per stale reference, with 1-based line number, trimmed line
 *   text, and the offending banned term.
 */
function lintLines(lines) {
  const violations = [];
  lines.forEach((line, i) => {
    const ignore = line.match(IGNORE_RE);
    for (const term of BANNED) {
      if (!line.includes(term)) continue;
      // Escape hatch: whole-line `docs-lint:ignore`, or scoped to this term.
      if (ignore && (!ignore[1] || ignore[1] === term)) continue;
      if (EDUCATIONAL.test(line)) continue;
      violations.push({ lineNumber: i + 1, text: line.trim(), term });
    }
  });
  return violations;
}

/**
 * Scan a single file's content.
 *
 * @param {string} rel - file path (relative to repo root) for diagnostics
 * @param {string} content - full file content
 * @returns {Array<{file: string, lineNumber: number, text: string, term: string}>}
 */
function lintContent(rel, content) {
  return lintLines(content.split(/\r?\n/)).map((v) => ({ file: rel, ...v }));
}

module.exports = {
  BANNED,
  BANNED_TABLES,
  BANNED_SYMBOLS,
  EDUCATIONAL,
  IGNORE_RE,
  lintLines,
  lintContent,
};
