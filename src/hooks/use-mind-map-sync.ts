'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { MindMapData, NestedExpansionItem, GeneratedImage } from '@/types/mind-map';
import { toPlainObject } from '@/lib/serialize';
import { summarizeTopicAction } from '@/app/actions';

interface UseMindMapSyncOptions {
  data: MindMapData;
  status: 'idle' | 'loading' | 'error';
  providerOptions: {
    provider: 'pollinations';
    apiKey?: string;
    model?: string;
    userId?: string;
  };
  propNestedExpansions?: NestedExpansionItem[];
  onUpdate?: (updates: Partial<MindMapData>) => void;
}

export function useMindMapSync(options: UseMindMapSyncOptions) {
  const { data, status, providerOptions, propNestedExpansions, onUpdate } = options;
  const { toast } = useToast();

  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>(data.savedImages || []);
  const [nestedExpansions, setNestedExpansions] = useState<NestedExpansionItem[]>(propNestedExpansions || data.nestedExpansions || []);
  const [explanations, setExplanations] = useState<Record<string, string[]>>(data.explanations || {});
  const [summaryContent, setSummaryContent] = useState(data.summary || '');
  const [isSummarizing, setIsSummarizing] = useState(false);

  const lastSyncedImagesRef = useRef<string>('');
  const lastSyncedExpansionsRef = useRef<string>('');
  const lastSyncedExplanationsRef = useRef<string>('');
  const lastNotifiedRef = useRef<string>('');

  useEffect(() => {
    if (data.savedImages) {
      const imagesStr = JSON.stringify(data.savedImages);
      if (imagesStr !== lastSyncedImagesRef.current) {
        lastSyncedImagesRef.current = imagesStr;
        setGeneratedImages(data.savedImages);
      }
    }
  }, [data.savedImages]);

  useEffect(() => {
    if (data.nestedExpansions) {
      const expansionsStr = JSON.stringify(data.nestedExpansions);
      if (expansionsStr !== lastSyncedExpansionsRef.current) {
        lastSyncedExpansionsRef.current = expansionsStr;
        setNestedExpansions(data.nestedExpansions);
      }
    }
  }, [data.nestedExpansions]);

  useEffect(() => {
    if (data.explanations) {
      const explanationsStr = JSON.stringify(data.explanations);
      if (explanationsStr !== lastSyncedExplanationsRef.current) {
        lastSyncedExplanationsRef.current = explanationsStr;
        setExplanations(data.explanations);
      }
    }
  }, [data.explanations]);

  useEffect(() => {
    if (propNestedExpansions) {
      const nestedStr = JSON.stringify(propNestedExpansions);
      if (nestedStr !== lastSyncedExpansionsRef.current) {
        lastSyncedExpansionsRef.current = nestedStr;
        setNestedExpansions(propNestedExpansions);
      }
    }
  }, [propNestedExpansions]);

  const regenerateSummary = useCallback(async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    setSummaryContent('');

    try {
      const { summary, error } = await summarizeTopicAction({
        mindMapData: toPlainObject(data)
      }, providerOptions);

      if (error) throw new Error(error);
      if (summary) {
        setSummaryContent(summary);
        if (onUpdate) onUpdate({ summary });
        toast({
          title: "Summary Updated",
          description: "A fresh AI synthesis has been generated.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Regeneration Failed",
        description: err.message,
      });
    } finally {
      setIsSummarizing(false);
    }
  }, [data, providerOptions, onUpdate, toast, isSummarizing]);

  // Auto-summarize is handled at the component level (mind-map.tsx)
  // Removed duplicate useEffect to prevent double LLM calls

  useEffect(() => {
    if (onUpdate) {
      const sanitizedExpansions = nestedExpansions.map(item => {
        const { fullData, ...rest } = item;
        return rest;
      });

      const dataToNotify = toPlainObject({
        nestedExpansions: sanitizedExpansions,
        savedImages: generatedImages,
        explanations: explanations
      });

      const hasMeaningfulChanges =
        JSON.stringify(nestedExpansions) !== JSON.stringify(propNestedExpansions || data.nestedExpansions || []) ||
        JSON.stringify(generatedImages) !== JSON.stringify(data.savedImages || []) ||
        JSON.stringify(explanations) !== JSON.stringify(data.explanations || {});

      if (!hasMeaningfulChanges) return;

      const stringified = JSON.stringify(dataToNotify);
      if (stringified !== lastNotifiedRef.current) {
        lastNotifiedRef.current = stringified;
        onUpdate(dataToNotify);
      }
    }
  }, [nestedExpansions, generatedImages, explanations, onUpdate, propNestedExpansions, data]);

  return {
    generatedImages,
    setGeneratedImages,
    nestedExpansions,
    setNestedExpansions,
    explanations,
    setExplanations,
    summaryContent,
    setSummaryContent,
    isSummarizing,
    regenerateSummary,
  };
}
