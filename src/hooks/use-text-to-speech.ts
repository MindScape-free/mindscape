'use client';

import { useState, useRef, useCallback } from 'react';
import { useAIConfig } from '@/contexts/ai-config-context';

interface UseTextToSpeechOptions {
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onGenerated?: () => void; // called once after successful generation
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}) {
  const { config } = useAIConfig();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const generateAndPlay = useCallback(async (text: string, voice: string = 'alloy') => {
    if (!text) return;

    // Check if we can use native browser SpeechSynthesis (completely free, zero latency, offline-capable)
    const hasBrowserSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const usePremiumVoice = (config as any).usePremiumVoice === true;

    if (hasBrowserSpeech && !usePremiumVoice) {
      options.onStart?.();
      setIsPlaying(true);
      
      try {
        // Cancel any active speech synthesis
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;

        // Try to match appropriate local system voice based on standard model voices
        if (window.speechSynthesis.getVoices) {
          const voices = window.speechSynthesis.getVoices();
          const isFemaleVoice = ['nova', 'shimmer', 'fable'].includes(voice.toLowerCase());
          const matchedVoice = voices.find(v => {
            const langMatch = v.lang.startsWith('en');
            if (!langMatch) return false;
            const name = v.name.toLowerCase();
            if (isFemaleVoice) {
              return name.includes('female') || name.includes('zira') || name.includes('samantha') || name.includes('google us english');
            } else {
              return name.includes('male') || name.includes('david') || name.includes('google uk english male');
            }
          }) || voices.find(v => v.lang.startsWith('en'));

          if (matchedVoice) {
            utterance.voice = matchedVoice;
          }
        }

        utterance.onend = () => {
          setIsPlaying(false);
          options.onEnd?.();
          options.onGenerated?.();
        };

        utterance.onerror = (err) => {
          // If native synthesis errors out, fallback to server-side audio API
          console.warn('SpeechSynthesis encountered error, falling back to server-side:', err);
          window.speechSynthesis.cancel();
          generateAndPlayServer(text, voice);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis failed, falling back to server-side:', err);
        generateAndPlayServer(text, voice);
      }
      return;
    }

    // Fallback/Premium execution helper
    generateAndPlayServer(text, voice);
  }, [config, options]);

  // Server-side generation fallback helper
  const generateAndPlayServer = useCallback(async (text: string, voice: string) => {
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

      options.onGenerated?.();
    } catch (error: any) {
      console.error('Server TTS Error:', error);
      options.onError?.(error.message || 'Failed to generate audio');
    } finally {
      setIsGenerating(false);
    }
  }, [config.pollinationsApiKey, config.apiKey, options]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    options.onEnd?.();
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
