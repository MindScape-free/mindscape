#!/usr/bin/env node
/**
 * remove-unused-imports.mjs
 *
 * CLI wrapper around scripts/remove-unused-imports-core.js. Reads
 * `tsc --noEmit --noUnusedLocals --noUnusedParameters` output and removes
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
 *   - unused class fields (e.g. the allowlisted supabase-mock write-only fields)
 *
 * Usage (npm scripts — self-contained, runs tsc itself):
 *   npm run sweep:imports            # scan + DRY preview (safe, writes nothing)
 *   npm run sweep:imports:apply      # scan + apply edits
 *
 * Usage (direct):
 *   node scripts/remove-unused-imports.mjs --scan [--dry]   # run tsc, then apply/preview
 *   node scripts/remove-unused-imports.mjs FILE [--dry]     # use an existing error report
 */
import fs from 'fs';
import { spawnSync } from 'node:child_process';
import { parseArgs, parseErrorLines, computeImportEdits } from './remove-unused-imports-core.js';

const { errorsFile, dryRun, scanFlag } = parseArgs();

// --scan: run tsc ourselves and write the error report, so the npm scripts are
// self-contained and don't depend on a pre-generated file. This also sidesteps
// tsc's non-zero exit code (2) when unused-symbol errors exist — the report is
// still written even though tsc 'fails'.
if (scanFlag) {
  fs.mkdirSync('tmp', { recursive: true });
  const result = spawnSync(
    'npx',
    ['--no-install', 'tsc', '--noEmit', '--noUnusedLocals', '--noUnusedParameters'],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  );
  if (result.error) {
    console.error('✖ Could not run tsc:', result.error.message);
    process.exit(1);
  }
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  fs.writeFileSync(errorsFile, output);
  const count = (output.match(/error TS/g) || []).length;
  console.log(`[scan] tsc exit ${result.status}; wrote ${errorsFile} (${count} error line${count === 1 ? '' : 's'})`);
}

if (!fs.existsSync(errorsFile)) {
  console.error('Error file not found: ' + errorsFile);
  process.exit(1);
}

const byFile = parseErrorLines(fs.readFileSync(errorsFile, 'utf8'));

let totalRemoved = 0;
let filesTouched = 0;
const removedDeclarations = [];

for (const [file, errs] of byFile) {
  if (!file.startsWith('src/')) continue;
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  const { edits, removedDeclarations: fileRemovals } = computeImportEdits(file, src, errs);

  if (edits.length === 0) continue;
  removedDeclarations.push(...fileRemovals);

  let out = src;
  // Apply from the end so earlier offsets stay valid.
  for (let i = edits.length - 1; i >= 0; i--) {
    out = out.slice(0, edits[i].start) + out.slice(edits[i].end);
  }

  if (dryRun) {
    console.log('[DRY] ' + file + ': ' + edits.length + ' edit(s)');
    continue;
  }
  fs.writeFileSync(file, out);
  totalRemoved += edits.length;
  filesTouched++;
  console.log('[FIX] ' + file + ': ' + edits.length + ' edit(s)');
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
