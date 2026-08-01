import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  computeImportEdits,
  parseArgs,
  parseErrorLines,
} from '../../../scripts/remove-unused-imports-core.js';

// ── parseArgs: flag-as-path edge case ────────────────────────────────────

describe('remove-unused-imports core — parseArgs', () => {
  it('never treats the --scan flag as the errorsFile path (regression)', () => {
    // process.argv shape: [node, script, ...args]. The first non-flag arg must
    // be the errors file; a leading --scan must fall back to the default path.
    const args = parseArgs(['node', 'remove-unused-imports.mjs', '--scan', '--dry']);
    expect(args).toEqual({
      errorsFile: 'tmp/unused-imports.txt',
      dryRun: true,
      scanFlag: true,
    });
  });

  it('uses an explicit errors file when one is given before --dry', () => {
    const args = parseArgs(['node', 'remove-unused-imports.mjs', 'report.txt', '--dry']);
    expect(args).toEqual({
      errorsFile: 'report.txt',
      dryRun: true,
      scanFlag: false,
    });
  });

  it('defaults the errors file when only --scan is passed', () => {
    const args = parseArgs(['node', 'remove-unused-imports.mjs', '--scan']);
    expect(args).toEqual({
      errorsFile: 'tmp/unused-imports.txt',
      dryRun: false,
      scanFlag: true,
    });
  });

  it('defaults the errors file when no args are passed', () => {
    const args = parseArgs(['node', 'remove-unused-imports.mjs']);
    expect(args).toEqual({
      errorsFile: 'tmp/unused-imports.txt',
      dryRun: false,
      scanFlag: false,
    });
  });
});

// ── parseErrorLines ───────────────────────────────────────────────────────

describe('remove-unused-imports core — parseErrorLines', () => {
  it('parses file, line, col, code and flagged name', () => {
    const text = [
      'src/__tests__/helpers/supabase-mock.ts(68,11): error TS6133: \'_select\' is declared but its value is never read.',
      'src/foo.ts(1,10): error TS6192: All imports in import declaration are unused.',
      'not-an-error',
    ].join('\n');
    const byFile = parseErrorLines(text);
    expect(byFile.size).toBe(2);
    expect(byFile.get('src/__tests__/helpers/supabase-mock.ts')).toEqual([
      { ln: 68, col: 11, code: '6133', name: '_select' },
    ]);
    expect(byFile.get('src/foo.ts')).toEqual([
      { ln: 1, col: 10, code: '6192', name: null },
    ]);
  });

  it('ignores non-error lines', () => {
    const byFile = parseErrorLines(['# noise', '', 'some text'].join('\n'));
    expect(byFile.size).toBe(0);
  });
});

// ── computeImportEdits: field-vs-import safety guarantee ─────────────────

describe('remove-unused-imports core — field-vs-import safety', () => {
  it('removes a fully-unused import declaration but never a class field', () => {
    const src = [
      "import { unusedThing } from './mod';",
      'class Mock {',
      '  private _select: string | null = null;',
      '}',
      '',
    ].join('\n');
    const errs = [
      // Unused import binding at line 1, col 10 (`unusedThing`).
      { ln: 1, col: 10, code: '6133', name: 'unusedThing' },
      // Unused CLASS FIELD — must NEVER produce an edit.
      { ln: 3, col: 11, code: '6133', name: '_select' },
    ];
    const { edits, removedDeclarations } = computeImportEdits('src/test.ts', src, errs);

    // Only the import is removed — the field error is ignored.
    expect(edits).toHaveLength(1);
    expect(removedDeclarations.some((d) => d.includes('unusedThing'))).toBe(true);

    let out = src;
    for (let i = edits.length - 1; i >= 0; i--) {
      out = out.slice(0, edits[i].start) + out.slice(edits[i].end);
    }
    expect(out).not.toContain('unusedThing');
    expect(out).toContain('_select');
    expect(out).toContain('class Mock');
  });

  it('removes only the flagged specifier from a multi-binding import', () => {
    const src = "import { kept, dropped } from './mod';";
    const errs = [{ ln: 1, col: 16, code: '6133', name: 'dropped' }];
    const { edits } = computeImportEdits('src/test.ts', src, errs);
    expect(edits).toHaveLength(1);

    let out = src;
    for (let i = edits.length - 1; i >= 0; i--) {
      out = out.slice(0, edits[i].start) + out.slice(edits[i].end);
    }
    expect(out).toBe("import { kept } from './mod';");
  });

  it('removes a whole declaration on TS6192', () => {
    const src = "import * as EntireThing from './gone';";
    const errs = [{ ln: 1, col: 1, code: '6192', name: null }];
    const { edits } = computeImportEdits('src/test.ts', src, errs);
    expect(edits).toHaveLength(1);

    let out = src;
    for (let i = edits.length - 1; i >= 0; i--) {
      out = out.slice(0, edits[i].start) + out.slice(edits[i].end);
    }
    expect(out.trim()).toBe('');
  });

  it('produces no edits when the only flagged symbol is a local, not an import', () => {
    const src = [
      'export function f() {',
      '  const unusedLocal = 1;',
      '  return 2;',
      '}',
    ].join('\n');
    const errs = [{ ln: 2, col: 9, code: '6133', name: 'unusedLocal' }];
    const { edits, removedDeclarations } = computeImportEdits('src/test.ts', src, errs);
    expect(edits).toEqual([]);
    expect(removedDeclarations).toEqual([]);
  });
});

// ── CLI smoke tests (end-to-end wiring) ───────────────────────────────────

const CLI = path.resolve(__dirname, '../../../scripts/remove-unused-imports.mjs');

/**
 * Run the real CLI against a temp fixture tree. The CLI only edits files whose
 * report path starts with `src/`, so fixtures live under `src/` in the temp
 * dir and the report uses `src/...` paths (cwd = temp dir).
 */
function runCliWithFixture(fixtureSrc: string, reportLines: string[], cliArgs: string[] = []) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rui-cli-'));
  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
  const fixture = path.join(tmp, 'src', 'sample.ts');
  fs.writeFileSync(fixture, fixtureSrc);
  const report = path.join(tmp, 'report.txt');
  fs.writeFileSync(report, reportLines.join('\n') + '\n');
  const result = spawnSync(process.execPath, [CLI, report, ...cliArgs], {
    encoding: 'utf8',
    cwd: tmp,
  });
  const after = fs.readFileSync(fixture, 'utf8');
  fs.rmSync(tmp, { recursive: true, force: true });
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '', after };
}

describe('remove-unused-imports CLI', () => {
  it('applies a real edit to a fixture file and never touches a class field', () => {
    const res = runCliWithFixture(
      [
        "import { unusedThing } from './mod';",
        'class Mock {',
        '  private _select: string | null = null;',
        '}',
        // Trailing '' element keeps the final newline, which the expected
        // post-fix content below depends on.
        '',
      ].join('\n'),
      [
        "src/sample.ts(1,10): error TS6133: 'unusedThing' is declared but its value is never read.",
        "src/sample.ts(3,11): error TS6133: '_select' is declared but its value is never read.",
      ],
    );
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('[FIX] src/sample.ts: 1 edit(s)');
    expect(res.stdout).toContain('Files touched: 1, total edits: 1');
    // The import line is removed wholesale; the field and class survive untouched.
    expect(res.after).toBe(
      'class Mock {\n' + '  private _select: string | null = null;\n' + '}\n',
    );
  });

  it('dry run previews edits without writing the file', () => {
    const res = runCliWithFixture(
      "import { unusedThing } from './mod';\nconst x = 1;\n",
      ["src/sample.ts(1,10): error TS6133: 'unusedThing' is declared but its value is never read."],
      ['--dry'],
    );
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('[DRY] src/sample.ts: 1 edit(s)');
    expect(res.stdout).toContain('DRY RUN - no files written.');
    // File must be byte-identical after a dry run.
    expect(res.after).toContain('unusedThing');
  });

  it('exits 1 with a clear message when the report file is missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rui-cli-'));
    const result = spawnSync(process.execPath, [CLI, 'no-such-report.txt'], {
      encoding: 'utf8',
      cwd: tmp,
    });
    fs.rmSync(tmp, { recursive: true, force: true });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Error file not found');
  });

  it('skips report entries for files outside src/', () => {
    const res = runCliWithFixture('const x = 1;\n', [
      "scripts/other.ts(1,10): error TS6133: 'x' is declared but its value is never read.",
    ]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Files touched: 0, total edits: 0');
    expect(res.after).toBe('const x = 1;\n');
  });
});
