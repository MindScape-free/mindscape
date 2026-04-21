import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { Feedback } from '@/types/feedback';

export async function getAllFeedbackAdmin(limit = 50, orderByField = 'created_at', orderDirection: 'desc' | 'asc' = 'desc'): Promise<Feedback[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('feedback').select('*').order(orderByField, { ascending: orderDirection === 'asc' }).limit(limit);
    if (error) throw error;
    return (data || []) as Feedback[];
  } catch (error) {
    console.error('Error in getAllFeedbackAdmin:', error);
    return [];
  }
}

export async function getFeedbackByIdAdmin(feedbackId: string): Promise<Feedback | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('feedback').select('*').eq('id', feedbackId).single();
    if (error || !data) return null;
    return data as Feedback;
  } catch (error) {
    console.error('Error in getFeedbackByIdAdmin:', error);
    return null;
  }
}
