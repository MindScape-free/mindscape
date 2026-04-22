'use server';

import { FeedbackSchema, FeedbackInput } from '@/ai/schemas/feedback-schema';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import { getTrackingIdPrefix, formatDateForTrackingId, formatSeriesNumber, FeedbackType } from '@/types/feedback';

async function generateTrackingId(type: FeedbackType): Promise<string> {
  const now = new Date();
  const prefix = getTrackingIdPrefix(type);
  const dateStr = formatDateForTrackingId(now);
  const counterId = `${prefix}-${dateStr}`;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('feedback_counters').select('last_number').eq('id', counterId).single();
  const seriesNumber = (data?.last_number || 0) + 1;

  await supabase.from('feedback_counters').upsert({ id: counterId, last_number: seriesNumber, last_updated: now.toISOString() }, { onConflict: 'id' });

  return `${prefix}-${dateStr}-${formatSeriesNumber(seriesNumber)}`;
}

export async function submitFeedbackAction(input: FeedbackInput) {
  try {
    const validated = FeedbackSchema.parse(input);
    const supabase = getSupabaseAdmin();
    const feedbackId = uuidv4();
    const now = new Date().toISOString();
    const trackingId = await generateTrackingId(validated.type as FeedbackType);

    await supabase.from('feedback').insert({
      id: feedbackId,
      type: validated.type,
      title: validated.title,
      description: validated.description,
      affected_area: validated.affectedArea,
      priority: validated.priority,
      user_email: validated.userEmail,
      user_id: validated.userId,
      user_name: validated.userName,
      attachments: validated.attachments,
      tracking_id: trackingId,
      status: 'OPEN',
      upvotes: 0,
      created_at: now,
      updated_at: now,
    });

    return { success: true, id: feedbackId, trackingId };
  } catch (error: any) {
    console.error('Error submitting feedback:', error);
    return { success: false, error: error.message || 'Failed to submit feedback' };
  }
}

export async function getFeedbackAction(filters?: { type?: string; status?: string; priority?: string }) {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from('feedback').select('*').order('created_at', { ascending: false });

    if (filters?.type && filters.type !== 'all') query = query.eq('type', filters.type);
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.priority && filters.priority !== 'all') query = query.eq('priority', filters.priority);

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error getting feedback:', error);
    return { success: false, error: error.message || 'Failed to get feedback' };
  }
}

export async function updateFeedbackAction(feedbackId: string, updates: { status?: string; adminNotes?: string }, adminUserId: string) {
  try {
    const supabase = getSupabaseAdmin();
    const mappedUpdates: any = { ...updates };
    if (updates.adminNotes) {
      mappedUpdates.admin_notes = updates.adminNotes;
      delete mappedUpdates.adminNotes;
    }
    await supabase.from('feedback').update({ ...mappedUpdates, updated_at: new Date().toISOString() }).eq('id', feedbackId);
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating feedback:', error);
    return { success: false, error: error.message || 'Failed to update feedback' };
  }
}
