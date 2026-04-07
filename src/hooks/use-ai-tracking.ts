'use client';

import { useCallback, useRef } from 'react';
import { analytics } from '@/lib/analytics-tracker';
import { useAdminActivityLog } from '@/lib/admin-utils';

interface AIGenerationMeta {
  sourceType: 'pdf' | 'website' | 'youtube' | 'text' | 'image' | 'multi';
  mode: 'single' | 'compare' | 'multi';
  depth: 'low' | 'medium' | 'deep';
  persona: string;
  userId?: string;
}

export function useAITracking() {
  const { logAdminActivity } = useAdminActivityLog();
  const generationStartRef = useRef<Map<string, number>>(new Map());

  const trackGenerationStart = useCallback(async (
    generationId: string,
    meta: AIGenerationMeta
  ) => {
    const startTime = Date.now();
    generationStartRef.current.set(generationId, startTime);

    analytics.trackAIStart(meta.sourceType, meta.mode, meta.depth, meta.persona);

    await logAdminActivity({
      type: 'AI_GENERATION_STARTED',
      targetType: 'mindmap',
      details: `AI generation started: ${meta.sourceType} → ${meta.mode} mode`,
      performedBy: meta.userId,
      metadata: {
        sourceType: meta.sourceType,
        mode: meta.mode,
        depth: meta.depth,
        persona: meta.persona,
      },
    });
  }, [logAdminActivity]);

  const trackGenerationComplete = useCallback(async (
    generationId: string,
    meta: AIGenerationMeta,
    result: {
      nodeCount?: number;
      tokensUsed?: number;
      mapId?: string;
    }
  ) => {
    const startTime = generationStartRef.current.get(generationId);
    const duration = startTime ? Date.now() - startTime : undefined;
    generationStartRef.current.delete(generationId);

    analytics.trackAIComplete(
      meta.sourceType,
      meta.mode,
      result.nodeCount || 0,
      duration || 0,
      result.tokensUsed
    );

    await logAdminActivity({
      type: 'AI_GENERATION_COMPLETED',
      targetType: 'mindmap',
      targetId: result.mapId,
      details: `AI generation completed: ${result.nodeCount || 0} nodes in ${duration}ms`,
      performedBy: meta.userId,
      duration,
      metadata: {
        sourceType: meta.sourceType,
        mode: meta.mode,
        depth: meta.depth,
        persona: meta.persona,
        nodeCount: result.nodeCount,
        tokensUsed: result.tokensUsed,
      },
    });
  }, [logAdminActivity]);

  const trackGenerationFailed = useCallback(async (
    generationId: string,
    meta: AIGenerationMeta,
    error: {
      type: string;
      message: string;
    }
  ) => {
    const startTime = generationStartRef.current.get(generationId);
    const duration = startTime ? Date.now() - startTime : undefined;
    generationStartRef.current.delete(generationId);

    analytics.trackAIFailed(meta.sourceType, error.type, error.message);

    await logAdminActivity({
      type: 'AI_GENERATION_FAILED',
      targetType: 'mindmap',
      details: `AI generation failed: ${error.type} - ${error.message}`,
      performedBy: meta.userId,
      duration,
      metadata: {
        sourceType: meta.sourceType,
        mode: meta.mode,
        depth: meta.depth,
        persona: meta.persona,
        errorType: error.type,
        errorMessage: error.message,
      },
    });
  }, [logAdminActivity]);

  const trackImageGeneration = useCallback(async (
    meta: {
      userId?: string;
      prompt: string;
      model?: string;
    },
    result: {
      success: boolean;
      duration: number;
      error?: string;
    }
  ) => {
    if (result.success) {
      await logAdminActivity({
        type: 'IMAGE_GENERATION_COMPLETED',
        targetType: 'mindmap',
        details: `Image generated successfully in ${result.duration}ms`,
        performedBy: meta.userId,
        duration: result.duration,
        metadata: {
          prompt: meta.prompt.substring(0, 100),
          model: meta.model,
        },
      });
    } else {
      await logAdminActivity({
        type: 'IMAGE_GENERATION_FAILED',
        targetType: 'mindmap',
        details: `Image generation failed: ${result.error}`,
        performedBy: meta.userId,
        duration: result.duration,
        metadata: {
          prompt: meta.prompt.substring(0, 100),
          model: meta.model,
          error: result.error,
        },
      });
    }

    analytics.trackImageGeneration(
      meta.prompt,
      meta.model || 'unknown',
      result.duration,
      result.success
    );
  }, [logAdminActivity]);

  const trackExplanationRequest = useCallback(async (
    meta: {
      userId?: string;
      nodeId: string;
      mapId: string;
      persona: string;
    }
  ) => {
    await logAdminActivity({
      type: 'EXPLANATION_REQUESTED',
      targetType: 'node',
      targetId: meta.nodeId,
      details: `Explanation requested for node`,
      performedBy: meta.userId,
      metadata: {
        mapId: meta.mapId,
        persona: meta.persona,
      },
    });
  }, [logAdminActivity]);

  const trackQuizGeneration = useCallback(async (
    meta: {
      userId?: string;
      mapId: string;
      questionCount: number;
    },
    result: {
      success: boolean;
      duration?: number;
    }
  ) => {
    if (result.success) {
      await logAdminActivity({
        type: 'QUIZ_GENERATED',
        targetType: 'mindmap',
        targetId: meta.mapId,
        details: `Quiz generated: ${meta.questionCount} questions`,
        performedBy: meta.userId,
        duration: result.duration,
        metadata: {
          questionCount: meta.questionCount,
        },
      });
    }
  }, [logAdminActivity]);

  return {
    trackGenerationStart,
    trackGenerationComplete,
    trackGenerationFailed,
    trackImageGeneration,
    trackExplanationRequest,
    trackQuizGeneration,
  };
}
