#!/usr/bin/env node
/**
 * remove-unused-imports.mjs
 *
 * Reads `tsc --noEmit --noUnusedLocals --noUnusedParameters` output and removes
 * the UNUSED IMPORTS it flags (TS6133 on import specifiers, TS6192 on fully
 * unused import declarations). Uses the TypeScript compiler API for precise
 * AST-based text edits so commas, aliases and multi-line imports stay intact.
 *
 * Position-aware: each error's (line, col) is resolved against the AST so only
 * the import binding at that exact position is removed (no name collisions).
 *
 * Deliberately does NOT touch:
 *   - unused locals / state / functions (need manual review)
 *   - unused function params (often required by interface/API shape)
 *
 * Usage:
 *   npx tsc --noEmit --noUnusedLocals --noUnusedParameters > /tmp/unused.txt
 *   node scripts/remove-unused-imports.mjs /tmp/unused.txt            # apply
 *   node scripts/remove-unused-imports.mjs /tmp/unused.txt --dry      # preview
 */
import fs from 'fs';
import ts from 'typescript';

const errorsFile = process.argv[2] || '/tmp/tsc-unused.txt';
const dryRun = process.argv.includes('--dry');

if (!fs.existsSync(errorsFile)) {
  console.error('Error file not found: ' + errorsFile);
  process.exit(1);
}

// Parse tsc error lines: file(line,col): error TSxxxx: 'name' message
const byFile = new Map();
for (const line of fs.readFileSync(errorsFile, 'utf8').split('\n')) {
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

let totalRemoved = 0;
let filesTouched = 0;
const removedDeclarations = [];

for (const [file, errs] of byFile) {
  if (!file.startsWith('src/')) continue;
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const edits = [];
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

  if (!fileChanged || edits.length === 0) continue;

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

  let out = src;
  for (const ed of merged) {
    out = out.slice(0, ed.start) + out.slice(ed.end);
  }

  if (dryRun) {
    console.log('[DRY] ' + file + ': ' + merged.length + ' edit(s)');
    continue;
  }
  fs.writeFileSync(file, out);
  totalRemoved += merged.length;
  filesTouched++;
  console.log('[FIX] ' + file + ': ' + merged.length + ' edit(s)');
}

console.log('');
console.log('----------------------------------------------');
if (dryRun) {
  console.log('DRY RUN - no files written.');
} else {
  console.log('Files touched: ' + filesTouched + ', total edits: ' + totalRemoved);
}
console.log('');
console.log('Whole import declarations removed (' + removedDeclarations.length + '):');
for (const d of removedDeclarations) console.log('  - ' + d);
