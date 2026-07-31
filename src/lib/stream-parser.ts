/**
 * Shared streaming protocol parser for MindScape chat / quick-explain streams.
 *
 * The server (`src/app/api/chat/stream/route.ts`) emits prefixed events:
 *   T:<text delta>        - assistant text
 *   R:<reasoning delta>   - chain-of-thought reasoning
 *   C:<tool-call JSON>    - `{ "name", "args" }`
 *   O:<tool-result JSON>  - `{ "result" }`
 *
 * Network chunks are arbitrary byte slices that may contain zero, one, or many
 * concatenated events, so we split on the prefix boundaries and route each
 * segment to the matching handler.
 *
 * LOSS LESS-BY-DESIGN: AI prose can legitimately contain "A:", "S:", "H:",
 * "C:", "O:", etc. (e.g. "Options: C: red, C: blue"). Only the four protocol
 * prefixes above are treated as markers. Anything else - and any C:/O:
 * segment that is NOT valid JSON - is emitted as text so no content is ever
 * silently dropped mid-response.
 *
 * KNOWN LIMITATION: "R:" appearing in the middle of free-form prose is routed
 * to onReasoning (it is a genuine protocol event the server emits for
 * chain-of-thought). In the chat panel it is surfaced in the reasoning
 * section rather than lost; consumers with no reasoning surface should pass
 * an onReasoning handler if they must never drop content. Fully eliminating
 * this ambiguity would require server-side event delimiting (length-prefixed
 * framing), which is intentionally out of scope for this minimal fix.
 */

export interface StreamEventHandlers {
  /** Assistant text delta. */
  onText?: (text: string) => void;
  /** Reasoning delta (chain-of-thought). */
  onReasoning?: (text: string) => void;
  /** Valid tool-call event: name + parsed args. */
  onToolCall?: (call: { name: string; args: any }) => void;
  /** Valid tool-result event: parsed result payload. */
  onToolResult?: (result: any) => void;
}

// Only the real protocol prefixes. NOTE: intentionally NOT A/S/H - those are
// plain text and must never be treated as event boundaries.
const EVENT_PREFIX = /(?=[TRCO]:)/;

export function parseStreamChunk(chunk: string, handlers: StreamEventHandlers): void {
  const events = chunk.split(EVENT_PREFIX);
  for (const event of events) {
    if (!event) continue;

    if (event.startsWith('T:')) {
      handlers.onText?.(event.slice(2));
    } else if (event.startsWith('R:')) {
      handlers.onReasoning?.(event.slice(2));
    } else if (event.startsWith('C:')) {
      try {
        const { name, args } = JSON.parse(event.slice(2));
        handlers.onToolCall?.({ name: name as string, args });
      } catch {
        // Not a tool call - plain AI text that happens to contain "C:". Preserve it.
        handlers.onText?.(event);
      }
    } else if (event.startsWith('O:')) {
      try {
        const { result } = JSON.parse(event.slice(2));
        handlers.onToolResult?.(result);
      } catch {
        // Not a tool result - plain AI text that happens to contain "O:". Preserve it.
        handlers.onText?.(event);
      }
    } else {
      // No known prefix - plain text. This covers chunks that start mid-event
      // as well as prose containing arbitrary colons ("Note: ...").
      handlers.onText?.(event);
    }
  }
}
