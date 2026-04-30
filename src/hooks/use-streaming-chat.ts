'use client';

import { useState, useCallback, useRef } from 'react';

interface StreamingChatOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: string) => void;
}

interface StreamingChatResult {
  text: string;
  isStreaming: boolean;
  error: string | null;
  reasoning: string;
  toolCalls: { name: string; args: any; result?: any; status: 'calling' | 'completed' }[];
  startStream: (input: StreamInput) => void;
  stopStream: () => void;
  reset: () => void;
}

interface StreamInput {
  question: string;
  topic: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  persona?: string;
  attachments?: { type: 'text' | 'pdf' | 'image'; name: string; content: string }[];
  pdfContext?: { summary: string; concepts: { title: string; description: string }[] };
  usePdfContext?: boolean;
  sessionId?: string;
  model?: string;
  apiKey?: string;
  agentMode?: boolean;
}

export function useStreamingChat(options: StreamingChatOptions = {}): StreamingChatResult {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [toolCalls, setToolCalls] = useState<StreamingChatResult['toolCalls']>([]);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const fullTextRef = useRef('');

  const startStream = useCallback((input: StreamInput) => {
    // Clean up any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset state
    setText('');
    setError(null);
    setReasoning('');
    setToolCalls([]);
    fullTextRef.current = '';
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Stream failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        if (controller.signal.aborted) {
          break;
        }

        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Check for error markers
        if (chunk.startsWith('[ERROR]')) {
          throw new Error(chunk.replace('[ERROR]', '').trim());
        }

        if (input.agentMode) {
          // Parse prefixed events: T: (Text), R: (Reasoning), C: (Call), O: (Output)
          // Note: chunks might contain multiple events or partial events if we're not careful.
          // For simplicity in this implementation, we assume well-delimited events for now.
          // In a production app, we'd use a more robust parser (like ndjson).
          const events = chunk.split(/(?=[TRCO]:)/);
          
          for (const event of events) {
            if (event.startsWith('T:')) {
              const delta = event.slice(2);
              accumulatedText += delta;
              fullTextRef.current = accumulatedText;
              setText(accumulatedText);
              options.onChunk?.(delta);
            } else if (event.startsWith('R:')) {
              const rText = event.slice(2);
              setReasoning(rText);
            } else if (event.startsWith('C:')) {
              try {
                const { name, args } = JSON.parse(event.slice(2));
                setToolCalls(prev => [...prev, { name, args, status: 'calling' }]);
              } catch (e) { console.error('Failed to parse tool call', e); }
            } else if (event.startsWith('O:')) {
              try {
                const { callId, result } = JSON.parse(event.slice(2));
                setToolCalls(prev => {
                  const last = prev[prev.length - 1];
                  if (last && last.status === 'calling') {
                    return [...prev.slice(0, -1), { ...last, result, status: 'completed' }];
                  }
                  return prev;
                });
              } catch (e) { console.error('Failed to parse tool result', e); }
            }
          }
        } else {
          accumulatedText += chunk;
          fullTextRef.current = accumulatedText;
          setText(accumulatedText);
          options.onChunk?.(chunk);
        }
      }

      setIsStreaming(false);
      options.onComplete?.(accumulatedText);
    })
    .catch((err) => {
      if (err.name === 'AbortError') {
        // User cancelled, don't show error
        setIsStreaming(false);
        return;
      }

      const errorMessage = err.message || 'Stream failed';
      setError(errorMessage);
      setIsStreaming(false);
      options.onError?.(errorMessage);
    });
  }, [options]);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    
    // Keep the partial text
    if (fullTextRef.current) {
      setText(fullTextRef.current);
    }
  }, []);

  const reset = useCallback(() => {
    stopStream();
    setText('');
    setError(null);
    setReasoning('');
    setToolCalls([]);
    fullTextRef.current = '';
  }, [stopStream]);

  return {
    text,
    isStreaming,
    error,
    reasoning,
    toolCalls,
    startStream,
    stopStream,
    reset,
  };
}
