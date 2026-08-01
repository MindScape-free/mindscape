#!/usr/bin/env node
/**
 * Docs consistency lint — fails on references to known-nonexistent tables and
 * removed code symbols.
 *
 * The linked remote DB has tables that were never created, and the codebase has
 * symbols that were removed, but docs may still reference them as if they exist
 * (see DATABASE_DICTIONARY.md "Not-Created Tables (Future-Guarded)"). This
 * script greps every Markdown file under docs/ (plus any extra paths passed as
 * args) and fails with a non-zero exit code when it finds a reference to a
 * banned table or symbol that is NOT merely documenting its removal/absence.
 *
 * Usage:
 *   node scripts/check-docs-consistency.mjs            # scan docs/ recursively
 *   node scripts/check-docs-consistency.mjs README.md  # also scan extra files
 *   node scripts/check-docs-consistency.mjs --selftest # run the built-in self-test
 *
 * Educational mentions (e.g. "user_notifications does not exist", to_regclass
 * guards, the Not-Created Tables section) are allowed — the check only flags
 * references that imply the item exists.
 *
 * Per-line escape hatch: append `docs-lint:ignore` to a line to skip it
 * entirely (e.g. when quoting a banned term verbatim). The scoped form
 * `docs-lint:ignore <term>` whitelists only that term on the line, so other
 * banned terms on the same line are still flagged.
 *
 * Detection logic lives in scripts/docs-consistency-core.js (pure CommonJS,
 * unit-tested); this file is the I/O wrapper (file discovery + exit codes).
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'url';
import docsCore from './docs-consistency-core.js';

const { lintLines, lintContent, BANNED, BANNED_TABLES, BANNED_SYMBOLS } = docsCore;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');

/** Recursively collect Markdown files under a directory. */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && /\.mdx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Built-in self-test: runs the same fixture scenarios as
 * src/__tests__/unit/docs-consistency.test.ts using only Node built-ins
 * (no jest). Exits 0 on success, 1 on failure.
 *
 * Usage: node scripts/check-docs-consistency.mjs --selftest
 */
function runSelfTest() {
  const results = [];
  let failures = 0;

  const check = (name, fn) => {
    try {
      fn();
      results.push(`  ✅ ${name}`);
    } catch (err) {
      failures += 1;
      results.push(`  ❌ ${name}: ${err.message}`);
    }
  };

  const SCRIPT = path.join(__dirname, 'check-docs-consistency.mjs');
  const CLI_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-lint-selftest-'));

  const runCli = (content, name = 'fixture.md') => {
    const fixture = path.join(CLI_DIR, name);
    fs.writeFileSync(fixture, content);
    return spawnSync(process.execPath, [SCRIPT, fixture], { encoding: 'utf8' });
  };

  try {
    // ── clean pass ────────────────────────────────────────────────────
    check('clean lines produce no violations', () => {
      assert.deepStrictEqual(
        lintLines(['# Title', 'Everything is fine.', 'No banned terms here.']),
        []
      );
    });
    check('empty input produces no violations', () => {
      assert.deepStrictEqual(lintLines([]), []);
    });
    check('educational-only mentions produce no violations', () => {
      const educational = [
        'The user_notifications table does not exist.',
        'community_posts was never created in the schema.',
        'providerMonitor was removed during the dead-code pass.',
        'useAIHealth is removed from the codebase.',
      ];
      assert.deepStrictEqual(lintLines(educational), []);
    });

    // ── stale references (tables) ─────────────────────────────────────
    for (const term of BANNED_TABLES) {
      check(`flags stale table reference to ${term}`, () => {
        const violations = lintLines([`The ${term} table stores notifications.`]);
        assert.strictEqual(violations.length, 1);
        assert.deepStrictEqual(violations[0], {
          lineNumber: 1,
          text: `The ${term} table stores notifications.`,
          term,
        });
      });
    }

    // ── stale references (symbols) ────────────────────────────────────
    for (const term of BANNED_SYMBOLS) {
      check(`flags stale symbol reference to ${term}`, () => {
        const violations = lintLines([`${term} detects degradation in production.`]);
        assert.strictEqual(violations.length, 1);
        assert.strictEqual(violations[0].lineNumber, 1);
        assert.strictEqual(violations[0].term, term);
      });
    }

    // ── violation details ─────────────────────────────────────────────
    check('reports the 1-based line number', () => {
      const violations = lintLines(['# OK', '', 'The community_posts table stores posts.']);
      assert.strictEqual(violations.length, 1);
      assert.strictEqual(violations[0].lineNumber, 3);
    });
    check('flags multiple stale terms on a single line', () => {
      const violations = lintLines(['user_notifications and community_posts are both stale.']);
      assert.deepStrictEqual(
        violations.map((v) => v.term).sort(),
        ['community_posts', 'user_notifications']
      );
    });
    check('keeps the trimmed text of the offending line', () => {
      const violations = lintLines(['   useAIHealth is active here.   ']);
      assert.strictEqual(violations.length, 1);
      assert.strictEqual(violations[0].text, 'useAIHealth is active here.');
    });

    // ── educational exemptions (tables) ───────────────────────────────
    const eduTables = [
      'The user_notifications table does not exist.',
      'community_posts was never created.',
      'Both tables are guarded by to_regclass for future-proofing.',
      'No user_notifications table exists.',
      "The community_posts table doesn't exist.",
    ];
    for (const line of eduTables) {
      check(`exempts educational table mention: ${line}`, () => {
        assert.deepStrictEqual(lintLines([line]), []);
      });
    }

    // ── educational exemptions (symbols) ──────────────────────────────
    const eduSymbols = [
      'providerMonitor was removed during the dead-code pass.',
      'useAIHealth is removed from the codebase.',
      'agentMode was removed in commit abc123.',
      'generateContentWithPollinations is removed from the dispatcher.',
    ];
    for (const line of eduSymbols) {
      check(`exempts educational symbol mention: ${line}`, () => {
        assert.deepStrictEqual(lintLines([line]), []);
      });
    }

    // ── line-scoped educational exemption ─────────────────────────────
    check('educational phrase exempts every banned term on that line', () => {
      assert.deepStrictEqual(
        lintLines(['providerMonitor was removed, and community_posts was too.']),
        []
      );
    });

    // ── per-line escape hatch ─────────────────────────────────────────
    check('whole-line docs-lint:ignore skips the line', () => {
      assert.deepStrictEqual(
        lintLines(['The user_notifications table is quoted. docs-lint:ignore']),
        []
      );
    });
    check('scoped docs-lint:ignore exempts only the named term', () => {
      const violations = lintLines([
        'Both user_notifications and community_posts. docs-lint:ignore community_posts',
      ]);
      assert.strictEqual(violations.length, 1);
      assert.strictEqual(violations[0].term, 'user_notifications');
    });

    // ── lintContent ───────────────────────────────────────────────────
    check('lintContent prefixes the file path and parses newlines', () => {
      const violations = lintContent(
        'docs/example.md',
        '# Title\n\nThe community_posts table stores posts.\n'
      );
      assert.strictEqual(violations.length, 1);
      assert.deepStrictEqual(violations[0], {
        file: 'docs/example.md',
        lineNumber: 3,
        text: 'The community_posts table stores posts.',
        term: 'community_posts',
      });
    });

    // ── BANNED composition ────────────────────────────────────────────
    check('BANNED is the union of tables and symbols', () => {
      assert.deepStrictEqual(BANNED, [...BANNED_TABLES, ...BANNED_SYMBOLS]);
    });

    // ── CLI smoke tests (end-to-end wiring) ───────────────────────────
    // Like the jest smoke tests, the exit-0 cases assume the real docs/
    // tree is clean — enforced by the lint, the pre-commit hook, and CI.
    check('CLI exits 0 on a clean tree', () => {
      const res = runCli('# Clean\n\nAll good.\n', 'clean.md');
      assert.strictEqual(res.status, 0, `expected exit 0, got ${res.status}`);
      assert.ok(res.stdout.includes('Docs consistency check passed'));
    });
    check('CLI exits 1 and reports a stale table reference', () => {
      const res = runCli('# Stale\n\nThe community_posts table stores posts.\n', 'stale-table.md');
      assert.strictEqual(res.status, 1, `expected exit 1, got ${res.status}`);
      assert.ok(res.stderr.includes('community_posts'));
      assert.ok(res.stderr.includes('stale reference'));
    });
    check('CLI exits 1 and reports a stale symbol reference', () => {
      const res = runCli('# Stale\n\nproviderMonitor detects degradation.\n', 'stale-symbol.md');
      assert.strictEqual(res.status, 1, `expected exit 1, got ${res.status}`);
      assert.ok(res.stderr.includes('providerMonitor'));
    });
    check('CLI exits 0 when the only mention is educational', () => {
      const res = runCli('# Edu\n\nuser_notifications does not exist.\n', 'edu.md');
      assert.strictEqual(res.status, 0, `expected exit 0, got ${res.status}`);
      assert.ok(res.stdout.includes('Docs consistency check passed'));
    });
  } finally {
    fs.rmSync(CLI_DIR, { recursive: true, force: true });
  }

  const passed = results.length - failures;
  console.log(
    `\n📄 Docs consistency self-test — ${failures === 0 ? 'PASSED' : 'FAILED'} ` +
      `(${passed}/${results.length} checks passed)`
  );
  console.log(results.join('\n'));
  return failures === 0;
}

if (process.argv.includes('--selftest')) {
  process.exit(runSelfTest() ? 0 : 1);
}

const extraTargets = process.argv.slice(2).map((t) => path.resolve(ROOT, t));
const missing = extraTargets.filter((f) => !fs.existsSync(f));
for (const m of missing) {
  console.error(`⚠️  extra target not found (skipped): ${path.relative(ROOT, m)}`);
}
const extraFiles = extraTargets.filter((f) => {
  try {
    return fs.statSync(f).isFile(); // skips missing paths (ENOENT) and directories (isFile() false)
  } catch {
    return false;
  }
});
const files = [...walk(DOCS_DIR), ...extraFiles].sort();

let violations = 0;

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');
  for (const v of lintContent(rel, content)) {
    violations += 1;
    console.error(`❌ ${v.file}:${v.lineNumber}: stale reference to removed/nonexistent \`${v.term}\``);
    console.error(`   ${v.text}`);
  }
}

if (violations > 0) {
  console.error(
    `\n📄 Docs consistency check FAILED — ${violations} stale reference(s) to ` +
      `removed/nonexistent items (${BANNED.join(', ')}).`
  );
  console.error('   Educational mentions documenting absence are allowed.');
  console.error('   Per-line `docs-lint:ignore` escapes are allowed.');
  process.exit(1);
}

console.log(
  `✅ Docs consistency check passed — no stale references to removed/nonexistent ` +
    `items (${BANNED.join(', ')}). Per-line \`docs-lint:ignore\` escapes respected.`
);
