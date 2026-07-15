'use client';

import { useState, useCallback } from 'react';

/**
 * Manages chat panel state for the canvas page.
 * Tracks open/close state, chat mode, initial messages,
 * and related handler callbacks.
 */
export function useCanvasChatState() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>(undefined);
  const [chatInitialView, setChatInitialView] = useState<
    'chat' | 'history' | 'pins' | 'canvas-pins' | undefined
  >(undefined);
  const [chatMode, setChatMode] = useState<'chat' | 'quiz'>('chat');
  const [chatTopic, setChatTopic] = useState<string | undefined>(undefined);
  const [useFileAwareContext, setUseFileAwareContext] = useState(false);

  const handleToggleFileAware = useCallback(() => {
    setUseFileAwareContext(prev => !prev);
  }, []);

  const handleOpenPinnedMessages = useCallback(() => {
    setChatInitialView('canvas-pins');
    setIsChatOpen(true);
  }, []);

  const handleExplainInChat = useCallback(
    (message: string, hasFileContext?: boolean) => {
      if (hasFileContext) {
        setUseFileAwareContext(true);
      }
      setChatInitialMessage(message);
      setChatMode('chat');
      setChatInitialView(undefined);
      setIsChatOpen(true);
    },
    []
  );

  const handleStartQuizForTopic = useCallback((topic?: string) => {
    setChatTopic(topic);
    setChatMode('quiz');
    setIsChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setChatInitialMessage(undefined);
    setChatInitialView(undefined);
  }, []);

  return {
    // State
    isChatOpen,
    chatInitialMessage,
    chatInitialView,
    chatMode,
    chatTopic,
    useFileAwareContext,

    // Setters
    setIsChatOpen,
    setChatInitialMessage,
    setChatInitialView,
    setChatMode,
    setChatTopic,
    setUseFileAwareContext,

    // Handlers
    handleToggleFileAware,
    handleOpenPinnedMessages,
    handleExplainInChat,
    handleStartQuizForTopic,
    closeChat,
  };
}
