'use client';

import { useState, useCallback } from 'react';

/**
 * Manages dialog state for the canvas page.
 * Tracks regeneration configuration dialog and nested map deletion confirmation.
 */
export function useCanvasDialogs() {
  // ── Regeneration Dialog ──────────────────────────────────────────────
  const [isRegenDialogOpen, setIsRegenDialogOpen] = useState(false);
  const [tempPersona, setTempPersona] = useState<string>('Teacher');
  const [tempDepth, setTempDepth] = useState<'low' | 'medium' | 'deep'>('low');
  const [dynamicItemRange, setDynamicItemRange] = useState<{
    min: number;
    max: number;
  }>({ min: 24, max: 40 });

  const openRegenDialog = useCallback(
    (initialPersona: string, initialDepth: 'low' | 'medium' | 'deep', range: { min: number; max: number }) => {
      setTempPersona(initialPersona);
      setTempDepth(initialDepth);
      setDynamicItemRange(range);
      setIsRegenDialogOpen(true);
    },
    []
  );

  const closeRegenDialog = useCallback(() => {
    setIsRegenDialogOpen(false);
  }, []);

  // ── Delete Confirmation ──────────────────────────────────────────────
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const requestDelete = useCallback((id: string) => {
    setPendingDeleteId(id);
  }, []);

  const cancelDelete = useCallback(() => {
    setPendingDeleteId(null);
  }, []);

  return {
    // Regen Dialog
    isRegenDialogOpen,
    tempPersona,
    tempDepth,
    dynamicItemRange,
    setTempPersona,
    setTempDepth,
    setDynamicItemRange,
    setIsRegenDialogOpen,
    openRegenDialog,
    closeRegenDialog,

    // Delete Confirmation
    pendingDeleteId,
    setPendingDeleteId,
    requestDelete,
    cancelDelete,
  };
}
