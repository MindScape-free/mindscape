import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  BANNED,
  BANNED_SYMBOLS,
  BANNED_TABLES,
  lintContent,
  lintLines,
} from '../../../scripts/docs-consistency-core.js';

// ── lintLines: clean pass ─────────────────────────────────────────────────

describe('docs-consistency core — clean pass', () => {
  it('returns no violations for clean lines', () => {
    expect(lintLines(['# Title', 'Everything is fine.', 'No banned terms here.'])).toEqual([]);
  });

  it('returns no violations for empty input', () => {
    expect(lintLines([])).toEqual([]);
  });

  it('returns no violations when banned terms appear only in educational mentions', () => {
    const educational = [
      'The user_notifications table does not exist.',
      'community_posts was never created in the schema.',
      'providerMonitor was removed during the dead-code pass.',
      'useAIHealth is removed from the codebase.',
    ];
    expect(lintLines(educational)).toEqual([]);
  });
});

// ── lintLines: stale references ───────────────────────────────────────────

describe('docs-consistency core — stale table references', () => {
  it.each(BANNED_TABLES)('flags a stale reference to %s', (term) => {
    const violations = lintLines([`The ${term} table stores notifications.`]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ lineNumber: 1, term });
  });
});

describe('docs-consistency core — stale symbol references', () => {
  it.each(BANNED_SYMBOLS)('flags a stale reference to %s', (term) => {
    const violations = lintLines([`${term} detects degradation in production.`]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ lineNumber: 1, term });
  });
});

describe('docs-consistency core — violation details', () => {
  it('reports the 1-based line number of the violation', () => {
    const violations = lintLines(['# OK', '', 'The community_posts table stores posts.']);
    expect(violations).toHaveLength(1);
    expect(violations[0].lineNumber).toBe(3);
  });

  it('flags multiple stale terms on a single line', () => {
    const violations = lintLines(['user_notifications and community_posts are both stale.']);
    expect(violations.map((v) => v.term).sort()).toEqual(['community_posts', 'user_notifications']);
  });

  it('keeps the trimmed text of the offending line', () => {
    const violations = lintLines(['   useAIHealth is active here.   ']);
    expect(violations).toHaveLength(1);
    expect(violations[0].text).toBe('useAIHealth is active here.');
  });
});

// ── lintLines: educational exemptions ─────────────────────────────────────

describe('docs-consistency core — educational exemptions for tables', () => {
  it.each([
    'The user_notifications table does not exist.',
    'community_posts was never created.',
    'Both tables are guarded by to_regclass for future-proofing.',
    'No user_notifications table exists.',
    "The community_posts table doesn't exist.",
  ])('exempts: %s', (line) => {
    expect(lintLines([line])).toEqual([]);
  });
});

describe('docs-consistency core — educational exemptions for symbols', () => {
  it.each([
    'providerMonitor was removed during the dead-code pass.',
    'useAIHealth is removed from the codebase.',
    'agentMode was removed in commit abc123.',
    'generateContentWithPollinations is removed from the dispatcher.',
  ])('exempts: %s', (line) => {
    expect(lintLines([line])).toEqual([]);
  });
});

describe('docs-consistency core — educational exemption is line-scoped', () => {
  it('an educational phrase exempts every banned term on that line', () => {
    // The EDUCATIONAL heuristic is line-based by design: a negation/removal
    // phrase anywhere on the line treats the whole line as documenting
    // absence (see the EDUCATIONAL comment in docs-consistency-core.js).
    // Only the `docs-lint:ignore <term>` escape hatch is term-scoped.
    const violations = lintLines([
      'providerMonitor was removed, and community_posts was too.',
    ]);
    expect(violations).toEqual([]);
  });
});

// ── lintLines: per-line escape hatch ──────────────────────────────────────

describe('docs-consistency core — docs-lint:ignore escape hatch', () => {
  it('skips a whole line carrying the bare marker', () => {
    const violations = lintLines(['The user_notifications table is quoted. docs-lint:ignore']);
    expect(violations).toEqual([]);
  });

  it('scoped marker exempts only the named term', () => {
    const violations = lintLines([
      'Both user_notifications and community_posts. docs-lint:ignore community_posts',
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0].term).toBe('user_notifications');
  });
});

// ── lintContent ───────────────────────────────────────────────────────────

describe('docs-consistency core — lintContent()', () => {
  it('prefixes violations with the file path and parses newlines', () => {
    const content = '# Title\n\nThe community_posts table stores posts.\n';
    const violations = lintContent('docs/example.md', content);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ file: 'docs/example.md', lineNumber: 3, term: 'community_posts' });
  });
});

// ── BANNED composition ────────────────────────────────────────────────────

describe('docs-consistency core — banned lists', () => {
  it('BANNED is the union of tables and symbols', () => {
    expect(BANNED).toEqual([...BANNED_TABLES, ...BANNED_SYMBOLS]);
  });
});

// ── CLI smoke tests (end-to-end wiring) ───────────────────────────────────

const CLI = path.resolve(__dirname, '../../../scripts/check-docs-consistency.mjs');

function runCli(fixtureContent: string, fixtureName = 'fixture.md') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-lint-'));
  const fixture = path.join(tmp, fixtureName);
  fs.writeFileSync(fixture, fixtureContent);
  const result = spawnSync(process.execPath, [CLI, fixture], { encoding: 'utf8' });
  fs.rmSync(tmp, { recursive: true, force: true });
  return result;
}

describe('check-docs-consistency CLI', () => {
  // The CLI always scans docs/ plus any extra file args, so the two exit-0
  // smoke tests below assume the real docs/ tree is clean — which the lint
  // itself (and the pre-commit hook) enforce, so this is a stable invariant.
  it('exits 0 and reports success on a clean tree', () => {
    const res = runCli('# Clean\n\nAll good.\n');
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Docs consistency check passed');
  });

  it('exits 1 and reports the stale table reference', () => {
    const res = runCli('# Stale\n\nThe community_posts table stores posts.\n');
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('community_posts');
    expect(res.stderr).toContain('stale reference');
  });

  it('exits 1 and reports the stale symbol reference', () => {
    const res = runCli('# Stale\n\nproviderMonitor detects degradation.\n');
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('providerMonitor');
  });

  it('exits 0 when the only mention is educational', () => {
    const res = runCli('# Edu\n\nuser_notifications does not exist.\n');
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Docs consistency check passed');
  });
});
