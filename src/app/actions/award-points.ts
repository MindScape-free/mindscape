'use server';

import { awardPoints, AwardResult } from '@/lib/points-engine';
import { PointEventType } from '@/types/points';

export async function awardPointsAction(
  userId: string,
  eventType: PointEventType,
  metadata?: Record<string, any>
): Promise<{ data: AwardResult | null; error: string | null }> {
  try {
    const result = await awardPoints(userId, eventType, metadata);
    return { data: result, error: null };
  } catch (error) {
    console.error(`[awardPointsAction] Failed for ${eventType}:`, error);
    return { data: null, error: error instanceof Error ? error.message : 'Failed to award points.' };
  }
}
