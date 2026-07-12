'use server';

import { awardPoints, AwardResult } from '@/lib/points-engine';
import { PointEventType } from '@/types/points';
import { requireAuth } from '@/lib/require-auth';

export async function awardPointsAction(
  userId: string,
  eventType: PointEventType,
  metadata?: Record<string, any>
): Promise<{ data: AwardResult | null; error: string | null }> {
  try {
    // Verify the caller is the same user they claim to be
    const verifiedUserId = await requireAuth();
    if (verifiedUserId !== userId) {
      return { data: null, error: 'Unauthorized: user ID mismatch.' };
    }

    const result = await awardPoints(verifiedUserId, eventType, metadata);
    return { data: result, error: null };
  } catch (error) {
    console.error(`[awardPointsAction] Failed for ${eventType}:`, error);
    return { data: null, error: error instanceof Error ? error.message : 'Failed to award points.' };
  }
}
