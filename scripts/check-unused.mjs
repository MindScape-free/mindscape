#!/usr/bin/env node
/**
 * Strict unused-code gate for CI.
 *
 * Runs `tsc -p tsconfig.strict.json` (base tsconfig + noUnusedLocals +
 * noUnusedParameters) and fails if ANY unused-symbol error is reported,
 * except a small allowlist of intentionally write-only mock API surface
 * (see ALLOWLIST below). This turns the dead-code sweep into a permanent,
 * blocking CI gate so unused declarations can't regress.
 *
 * Usage: node scripts/check-unused.mjs
 * Exit:  0 = pass (warns on stale allowlist entries), 1 = fail (or tsc
 *        could not run)
 */
import { spawnSync } from 'node:child_process';

// ── Documented exceptions ────────────────────────────────────────────────
// Write-only mock API surface in src/__tests__/helpers/supabase-mock.ts:
// `_select`, `_orderColumn`, `_orderAscending`, `_limitCount` are assigned by
// the chainable .select()/.order()/.limit() methods (mirroring the real
// Supabase query builder) but intentionally never read back. They exist to
// keep the mock's fluent chain API surface intact.
//
// NOTE: ALLOWLIST entries must NOT use the /g regex flag — `.test()` is
// stateful with /g (lastIndex advances between calls), which would make
// matchedPerEntry and the violations filter disagree on the same line.
const ALLOWLIST = [
  /supabase-mock\.ts\(\d+,\d+\): error TS6133: '_(select|orderColumn|orderAscending|limitCount)' is declared but its value is never read\./,
];

function main() {
  const result = spawnSync('npx', ['--no-install', 'tsc', '-p', 'tsconfig.strict.json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error('✖ Could not run tsc:', result.error.message);
    process.exit(1);
  }

  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const errorLines = output
    .split('\n')
    .filter((line) => line.includes('error TS'));

  // tsc exits non-zero on any error. Distinguish "tsc crashed / not found"
  // from "tsc ran and found (allowlisted or real) errors".
  const tscRan = result.status === 0 || errorLines.length > 0;
  if (!tscRan) {
    console.error('✖ tsc did not run cleanly (exit', result.status, '):');
    console.error(output.trim() || '(no output)');
    process.exit(1);
  }

  // Per-entry match tracking for allowlist drift detection: if an entry ever
  // stops matching (e.g. the mock fields are made read or removed), we warn so
  // the stale exception gets pruned instead of silently rotting.
  const matchedPerEntry = ALLOWLIST.map(
    (re) => errorLines.filter((line) => re.test(line)).length,
  );

  const violations = errorLines.filter(
    (line) => !ALLOWLIST.some((re) => re.test(line)),
  );

  if (violations.length > 0) {
    console.error(
      `✖ Unused code check FAILED — ${violations.length} unused declaration(s) found:`,
    );
    for (const line of violations) console.error('  ' + line);
    console.error(
      '\nRemove the unused declarations, or — if genuinely intentional — ' +
        'add an entry to ALLOWLIST in scripts/check-unused.mjs with a comment.',
    );
    process.exit(1);
  }

  const allowlisted = errorLines.length - violations.length;

  let staleCount = 0;
  for (let i = 0; i < ALLOWLIST.length; i++) {
    if (matchedPerEntry[i] === 0) {
      staleCount++;
      console.warn(
        `⚠ ALLOWLIST entry #${i + 1} (${String(ALLOWLIST[i])}) matched 0 errors — ` +
          'stale exception. If the allowlisted symbols were fixed or removed, ' +
          'delete this entry from ALLOWLIST in scripts/check-unused.mjs.',
      );
    }
  }

  console.log(
    `✔ Unused code check passed (${allowlisted} allowlisted mock field${allowlisted === 1 ? '' : 's'} ignored).`,
  );
  if (staleCount > 0) {
    console.warn(
      `⚠ Allowlist drift: ${staleCount} stale ALLOWLIST entr${staleCount === 1 ? 'y' : 'ies'} no longer match — prune them from ALLOWLIST.`,
    );
  }
  process.exit(0);
}

main();
