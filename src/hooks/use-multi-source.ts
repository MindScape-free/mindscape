'use client';

import { useState, useCallback } from 'react';
import { SourceItem, SourceType } from '@/types/multi-source';
import { detectInputType } from '@/lib/detect-source-type';
import { parsePdfContent } from '@/lib/pdf-processor';
import { mergeSourceContents, calculateContextUsage } from '@/lib/source-merger';
import { analyzeImageContentAction } from '@/app/actions';

export interface MultiSourceOptions {
  apiKey?: string;
  userId?: string;
}

export function useMultiSource(options?: MultiSourceOptions) {
  const [sources, setSources] = useState<SourceItem[]>([]);

  const addSourceItem = useCallback((item: SourceItem) => {
    setSources(prev => [...prev, item]);
  }, []);

  const updateSourceItem = useCallback((id: string, updates: Partial<SourceItem>) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const removeSource = useCallback((id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  }, []);

  const addTextOrUrl = useCallback(async (value: string) => {
    const type = detectInputType(value);
    const id = Math.random().toString(36).substr(2, 9);
      
    const newItem: SourceItem = {
      id,
      type: type === 'youtube' ? 'youtube' : type === 'website' ? 'website' : 'text',
      label: type === 'website' || type === 'youtube' ? value : value.slice(0, 30) + (value.length > 30 ? '...' : ''),
      rawValue: value,
      content: '',
      status: 'loading'
    };

    addSourceItem(newItem);

    try {
      if (type === 'text') {
        updateSourceItem(id, { content: value, status: 'ready' });
      } else if (type === 'youtube') {
        // Extract video ID
        const videoIdMatch = value.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;
        
        if (!videoId) throw new Error('Invalid YouTube URL');

        const res = await fetch(`/api/youtube-transcript?videoId=${videoId}`);
        if (!res.ok) throw new Error('Failed to fetch transcript');
        const data = await res.json();
        
        updateSourceItem(id, { 
          label: data.title || newItem.label, 
          content: data.transcript, 
          status: 'ready' 
        });
      } else if (type === 'website') {
        const res = await fetch('/api/scrape-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: value })
        });
        if (!res.ok) throw new Error('Failed to scrape URL');
        const data = await res.json();
        
        updateSourceItem(id, { 
          label: data.title || new URL(value).hostname, 
          content: data.content, 
          status: 'ready' 
        });
      }
    } catch (err: any) {
      updateSourceItem(id, { status: 'error', error: err.message });
    }
  }, [addSourceItem, updateSourceItem, options]);

  const addFile = useCallback(async (file: File) => {
    const id = Math.random().toString(36).substr(2, 9);
    const type: SourceType = file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : 'text';

    const newItem: SourceItem = {
      id,
      type,
      label: file.name,
      rawValue: file.name,
      content: '',
      status: 'loading'
    };

    addSourceItem(newItem);

    try {
      if (type === 'pdf') {
        const buffer = await file.arrayBuffer();
        const { content } = await parsePdfContent(buffer, (progress) => {
           updateSourceItem(id, { progress: (progress.current / progress.total) * 100 });
        });
        updateSourceItem(id, { content, status: 'ready' });
      } else if (type === 'image') {
        const reader = new FileReader();
        const dataUri = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        
        // Analyze image content using AI flow
        const result = await analyzeImageContentAction(
          { imageDataUri: dataUri },
          { apiKey: options?.apiKey, userId: options?.userId }
        );
        
        if (result.error || !result.data) {
          throw new Error(result.error || 'Failed to analyze image');
        }

        updateSourceItem(id, { 
          content: result.data.content, 
          status: 'ready', 
          originalFile: dataUri 
        });
      } else {
        const content = await file.text();
        updateSourceItem(id, { content, status: 'ready' });
      }
    } catch (err: any) {
      updateSourceItem(id, { status: 'error', error: err.message });
    }
  }, [addSourceItem, updateSourceItem, options]);

  const clearSources = useCallback(() => {
    setSources([]);
  }, []);

  const buildPayload = useCallback(() => {
    return mergeSourceContents(sources);
  }, [sources]);

  return {
    sources,
    addSource: addTextOrUrl,
    addFile,
    removeSource,
    clearSources,
    buildPayload,
    isProcessing: sources.some(s => s.status === 'loading'),
    canGenerate: sources.filter(s => s.status === 'ready').length >= 1,
    contextUsage: calculateContextUsage(sources)
  };
}
