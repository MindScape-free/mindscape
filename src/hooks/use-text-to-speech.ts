'use client';

import { useState, useRef, useCallback } from 'react';
import { useAIConfig } from '@/contexts/ai-config-context';

interface UseTextToSpeechOptions {
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}) {
  const { config } = useAIConfig();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generateAndPlay = useCallback(async (text: string, voice: string = 'alloy') => {
    if (!text) return;
    
    setIsGenerating(true);
    options.onStart?.();

    try {
      const apiKey = config.pollinationsApiKey || config.apiKey;
      
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, apiKey }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate audio');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        options.onEnd?.();
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        options.onEnd?.();
        URL.revokeObjectURL(audioUrl);
      };

      setIsPlaying(true);
      await audio.play();
    } catch (error: any) {
      console.error('TTS Error:', error);
      options.onError?.(error.message || 'Failed to generate audio');
    } finally {
      setIsGenerating(false);
    }
  }, [config.pollinationsApiKey, config.apiKey, options]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      options.onEnd?.();
    }
  }, [options]);

  const downloadAudio = useCallback(async (text: string, filename: string, voice: string = 'alloy') => {
    setIsGenerating(true);

    try {
      const apiKey = config.pollinationsApiKey || config.apiKey;
      
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, apiKey }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate audio');
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error: any) {
      console.error('Download Error:', error);
      options.onError?.(error.message || 'Failed to download audio');
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [config.pollinationsApiKey, config.apiKey, options]);

  return {
    generateAndPlay,
    stop,
    downloadAudio,
    isGenerating,
    isPlaying,
  };
}
