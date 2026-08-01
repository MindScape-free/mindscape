'use strict';

/**
 * remove-unused-imports core.
 *
 * Pure, testable logic shared by the CLI wrapper
 * (scripts/remove-unused-imports.mjs) and unit tests. The CLI adds the tsc
 * --scan, file I/O, and dry-run/apply handling on top of these functions.
 *
 * Safety guarantee (unit-tested): edits are ONLY ever produced for IMPORT
 * DECLARATIONS. Unused-symbol errors on class fields, locals, or function
 * params (e.g. TS6133 on `_select` in supabase-mock.ts) never match an import
 * binding, so no edit is emitted for them.
 */
const ts = require('typescript');

/**
 * Parse CLI arguments.
 *
 * @param {string[]} [argv] process.argv (defaults to the real one)
 * @returns {{ errorsFile: string, dryRun: boolean, scanFlag: boolean }}
 */
function parseArgs(argv = process.argv) {
  const args = argv.slice(2);
  const dryRun = args.includes('--dry');
  const scanFlag = args.includes('--scan');
  // First non-flag arg is the errors file; when --scan runs tsc it defaults to
  // tmp/unused-imports.txt (gitignored). Never treat a flag like --scan as a path.
  const errorsFile = args.find((a) => !a.startsWith('--')) || 'tmp/unused-imports.txt';
  return { errorsFile, dryRun, scanFlag };
}

/**
 * Parse tsc error lines: file(line,col): error TSxxxx: 'name' message
 *
 * @param {string} text
 * @returns {Map<string, Array<{ln:number, col:number, code:string, name:string|null}>>}
 */
function parseErrorLines(text) {
  const byFile = new Map();
  for (const line of text.split('\n')) {
    const m = line.match(/^([^(]+)\((\d+),(\d+)\): error TS(\d+): (.*)$/);
    if (!m) continue;
    const file = m[1];
    const ln = Number(m[2]);
    const col = Number(m[3]);
    const code = m[4];
    const rest = m[5];
    const nameM = rest.match(/^'([^']+)'/);
    const name = nameM ? nameM[1] : null;
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push({ ln, col, code, name });
  }
  return byFile;
}

// Convert 1-based line/col to absolute source offset
function posAt(sf, ln, col) {
  const lineStart = sf.getLineStarts()[ln - 1];
  return lineStart + (col - 1);
}

function lineRangeOf(sf, startPos, endPos) {
  const startLine = sf.getLineAndCharacterOfPosition(startPos).line;
  const endLine = sf.getLineAndCharacterOfPosition(endPos).line;
  const lc = sf.getLineStarts();
  const removeStart = lc[startLine];
  const nextLineStart = endLine + 1 < lc.length ? lc[endLine + 1] : sf.text.length;
  return { start: removeStart, end: nextLineStart };
}

/**
 * Compute import-removal edits for a single file.
 *
 * Only `ImportDeclaration` nodes are ever edited. TS6192 (whole declaration
 * unused) and TS6133 on import bindings produce edits; TS6133 on class fields,
 * locals, or params never matches a binding position, so they are ignored.
 *
 * @param {string} file        path used for the source file (must exist)
 * @param {string} src         file text
 * @param {Array<{ln:number, col:number, code:string, name:string|null}>} errs
 * @returns {{ edits: Array<{start:number, end:number}>, removedDeclarations: string[] }}
 *          edits are merged non-overlapping and ordered by DESCENDING start, so
 *          callers apply them by slicing from the end of the source (earlier
 *          offsets stay valid).
 */
function computeImportEdits(file, src, errs) {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const edits = [];
  const removedDeclarations = [];
  let fileChanged = false;

  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      const decl = node;
      const clause = decl.importClause;
      const declStart = decl.getStart(sf);
      const declEnd = decl.getEnd();

      // Whole declaration dead? (TS6192 position points inside this decl and it has no named elements)
      const has6192 = errs.some(e => e.code === '6192' && e.ln >= sf.getLineAndCharacterOfPosition(declStart).line + 1 && e.ln <= sf.getLineAndCharacterOfPosition(declEnd).line + 1);
      if (has6192) {
        const r = lineRangeOf(sf, declStart, declEnd);
        edits.push(r);
        removedDeclarations.push(file + ': ' + decl.getText(sf).replace(/\s+/g, ' ').slice(0, 120));
        fileChanged = true;
        return;
      }

      let bindingCount = 0;
      const bindingNames = [];
      let namedNode = null;
      let defaultNode = null;
      if (clause) {
        if (clause.name) { bindingCount++; bindingNames.push(clause.name.text); defaultNode = clause.name; }
        if (clause.namedBindings) {
          if (ts.isNamespaceImport(clause.namedBindings)) {
            bindingCount++;
            bindingNames.push(clause.namedBindings.name.text);
          } else if (ts.isNamedImports(clause.namedBindings)) {
            namedNode = clause.namedBindings;
            for (const el of clause.namedBindings.elements) {
              bindingCount++;
              bindingNames.push(el.name.text);
            }
          }
        }
      }

      // For each binding, determine if it was flagged at its exact position
      const isFlaggedAt = (bindingStart, bindingEnd, name) => {
        return errs.some(e => {
          if (e.code !== '6133' || e.name !== name) return false;
          const p = posAt(sf, e.ln, e.col);
          return p >= bindingStart && p <= bindingEnd;
        });
      };

      // All bindings flagged -> remove whole declaration
      const flaggedBindingCount = [];
      if (defaultNode && isFlaggedAt(defaultNode.getStart(sf), defaultNode.getEnd(), defaultNode.text)) flaggedBindingCount.push('default');
      if (namedNode) {
        for (const el of namedNode.elements) {
          if (isFlaggedAt(el.getStart(sf), el.getEnd(), el.name.text)) flaggedBindingCount.push(el.name.text);
        }
      }
      if (flaggedBindingCount.length > 0 && flaggedBindingCount.length === bindingCount) {
        const r = lineRangeOf(sf, declStart, declEnd);
        edits.push(r);
        removedDeclarations.push(file + ': ' + decl.getText(sf).replace(/\s+/g, ' ').slice(0, 120));
        fileChanged = true;
        return;
      }

      // Remove individual flagged specifiers
      if (defaultNode && isFlaggedAt(defaultNode.getStart(sf), defaultNode.getEnd(), defaultNode.text)) {
        let startPos = clause.getStart(sf);
        let endPos = defaultNode.getEnd();
        if (namedNode) endPos = namedNode.getStart();
        edits.push({ start: startPos, end: endPos });
        fileChanged = true;
      }
      if (namedNode) {
        const elems = namedNode.elements;
        for (let i = 0; i < elems.length; i++) {
          const el = elems[i];
          if (!isFlaggedAt(el.getStart(sf), el.getEnd(), el.name.text)) continue;
          let s, e;
          if (i < elems.length - 1) {
            s = el.getStart(sf);
            e = elems[i + 1].getStart(sf);
          } else {
            s = i > 0 ? elems[i - 1].getEnd() : el.getStart(sf);
            e = el.getEnd();
          }
          edits.push({ start: s, end: e });
          fileChanged = true;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (!fileChanged || edits.length === 0) return { edits: [], removedDeclarations };

  edits.sort((a, b) => b.start - a.start);
  const merged = [];
  for (const ed of edits) {
    const last = merged[merged.length - 1];
    if (last && ed.end >= last.start) {
      last.start = Math.min(last.start, ed.start);
      last.end = Math.max(last.end, ed.end);
    } else {
      merged.push({ start: ed.start, end: ed.end });
    }
  }

  return { edits: merged, removedDeclarations };
}

module.exports = { parseArgs, parseErrorLines, computeImportEdits };
