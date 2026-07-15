'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Manages source file content/type state for the canvas page.
 * Tracks uploaded files (PDFs, images, text, website content, etc.)
 * and syncs them to a stable ref for closures.
 */
export function useCanvasSourceFiles() {
  const [sourceFileContent, setSourceFileContent] = useState<string | null>(null);
  const [sourceFileType, setSourceFileType] = useState<string | null>(null);
  const [originalPdfFileContent, setOriginalPdfFileContent] = useState<string | null>(null);
  const [sourceFile2Content, setSourceFile2Content] = useState<string | null>(null);
  const [sourceFile2Type, setSourceFile2Type] = useState<string | null>(null);
  const [originalPdf2FileContent, setOriginalPdf2FileContent] = useState<string | null>(null);
  const [isSourceFileModalOpen, setIsSourceFileModalOpen] = useState(false);

  // Stable ref for closures (avoids stale closure issues in callbacks)
  const sourceContextRefs = useRef({
    content: null as string | null,
    type: null as string | null,
    originalPdf: null as string | null,
  });

  // Sync refs whenever state changes
  useEffect(() => {
    sourceContextRefs.current = {
      content: sourceFileContent,
      type: sourceFileType,
      originalPdf: originalPdfFileContent,
    };
  }, [sourceFileContent, sourceFileType, originalPdfFileContent]);

  /** Bulk-update state from a mind map's source file fields */
  const syncFromMapData = useCallback((mapData: {
    sourceFileContent?: string | null;
    sourceFileType?: string | null;
    originalPdfFileContent?: string | null;
    sourceFile2Content?: string | null;
    sourceFile2Type?: string | null;
    originalPdf2FileContent?: string | null;
  }) => {
    if (mapData.sourceFileContent) setSourceFileContent(mapData.sourceFileContent);
    if (mapData.sourceFileType) setSourceFileType(mapData.sourceFileType);
    if (mapData.originalPdfFileContent) setOriginalPdfFileContent(mapData.originalPdfFileContent);
    if (mapData.sourceFile2Content) setSourceFile2Content(mapData.sourceFile2Content);
    if (mapData.sourceFile2Type) setSourceFile2Type(mapData.sourceFile2Type);
    if (mapData.originalPdf2FileContent) setOriginalPdf2FileContent(mapData.originalPdf2FileContent);
  }, []);

  /** Bulk-update state from session storage content */
  const syncFromSession = useCallback((sessionContent: {
    file?: string;
    text?: string;
    originalFile?: string;
    file2?: string;
    file2Type?: string;
  }, sessionType?: string) => {
    if (sessionType) setSourceFileType(sessionType);
    if (sessionContent.file) {
      setSourceFileContent(sessionContent.file);
      sourceContextRefs.current.content = sessionContent.file;
    }
    if (sessionContent.originalFile) {
      setOriginalPdfFileContent(sessionContent.originalFile);
      sourceContextRefs.current.originalPdf = sessionContent.originalFile;
    }
    if (sessionContent.file2) setSourceFile2Content(sessionContent.file2);
    if (sessionContent.file2Type) setSourceFile2Type(sessionContent.file2Type);
  }, []);

  const openSourceModal = useCallback(() => setIsSourceFileModalOpen(true), []);
  const closeSourceModal = useCallback(() => setIsSourceFileModalOpen(false), []);

  return {
    // State
    sourceFileContent,
    sourceFileType,
    originalPdfFileContent,
    sourceFile2Content,
    sourceFile2Type,
    originalPdf2FileContent,
    isSourceFileModalOpen,
    sourceContextRefs,

    // Setters
    setSourceFileContent,
    setSourceFileType,
    setOriginalPdfFileContent,
    setSourceFile2Content,
    setSourceFile2Type,
    setOriginalPdf2FileContent,
    setIsSourceFileModalOpen,

    // Helpers
    syncFromMapData,
    syncFromSession,
    openSourceModal,
    closeSourceModal,
  };
}
