import { parseStreamChunk } from '@/lib/stream-parser';

interface Collectors {
  text: string[];
  reasoning: string[];
  toolCalls: { name: string; args: any }[];
  toolResults: any[];
}

function run(chunk: string): Collectors {
  const c: Collectors = { text: [], reasoning: [], toolCalls: [], toolResults: [] };
  parseStreamChunk(chunk, {
    onText: (t) => c.text.push(t),
    onReasoning: (r) => c.reasoning.push(r),
    onToolCall: (call) => c.toolCalls.push(call),
    onToolResult: (result) => c.toolResults.push(result),
  });
  return c;
}

describe('parseStreamChunk()', () => {
  it('routes T: segments to onText (stripping the prefix)', () => {
    const c = run('T:Hello world');
    expect(c.text.join('')).toBe('Hello world');
  });

  it('routes R: segments to onReasoning', () => {
    const c = run('R:thinking step');
    expect(c.reasoning.join('')).toBe('thinking step');
    expect(c.text).toEqual([]);
  });

  it('routes valid C: tool calls to onToolCall', () => {
    const c = run('C:{"name":"search","args":{"q":"x"}}');
    expect(c.toolCalls).toEqual([{ name: 'search', args: { q: 'x' } }]);
    expect(c.text).toEqual([]);
  });

  it('routes valid O: tool results to onToolResult', () => {
    const c = run('O:{"result":{"ok":true}}');
    expect(c.toolResults).toEqual([{ ok: true }]);
    expect(c.text).toEqual([]);
  });

  it('handles multiple concatenated events in one chunk', () => {
    const c = run('R:deep thoughtT:Answer text');
    expect(c.reasoning.join('')).toBe('deep thought');
    expect(c.text.join('')).toBe('Answer text');
  });

  it('PRESERVES prose containing A:/S:/H: (regression: previously dropped)', () => {
    // AI text that legitimately contains "A:"/"S:"/"H:" must survive verbatim.
    const chunk = 'T:Key: A: Option 1, S: Option 2, H: Option 3';
    const c = run(chunk);
    expect(c.text.join('')).toBe('Key: A: Option 1, S: Option 2, H: Option 3');
  });

  it('PRESERVES prose containing C: that is NOT valid JSON (regression: previously dropped)', () => {
    // e.g. "Options: C: red, C: blue" — the C: prefix is prose, not a tool call.
    const chunk = 'T:Options: C: red, C: blue';
    const c = run(chunk);
    expect(c.text.join('')).toBe('Options: C: red, C: blue');
    expect(c.toolCalls).toEqual([]);
  });

  it('PRESERVES prose containing O: that is NOT valid JSON', () => {
    const chunk = 'T:Note: O: the end.';
    const c = run(chunk);
    expect(c.text.join('')).toBe('Note: O: the end.');
    expect(c.toolResults).toEqual([]);
  });

  it('appends plain text with no recognized prefix as text', () => {
    const c = run('some raw delta');
    expect(c.text.join('')).toBe('some raw delta');
  });

  it('preserves A:/S:/H: prefixes as literal text even when they start a segment', () => {
    // A chunk that starts mid-stream at an "A:" boundary must not be parsed
    // as a control event.
    const c = run('A: remainder');
    expect(c.text.join('')).toBe('A: remainder');
  });

  it('does not crash on an empty chunk', () => {
    const c = run('');
    expect(c.text).toEqual([]);
  });
});
