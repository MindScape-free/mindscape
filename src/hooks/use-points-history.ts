'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/lib/auth-context';
import { getSupabaseClient } from '@/lib/supabase-db';
import { PointTransaction } from '@/types/points';

const PAGE_SIZE = 20;

export interface GroupedHistory {
  date: string;
  label: string;
  totalPoints: number;
  transactions: PointTransaction[];
}

export interface UsePointsHistoryReturn {
  history: GroupedHistory[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === today.toISOString().split('T')[0]) return 'Today';
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function groupTransactionsByDate(transactions: PointTransaction[]): GroupedHistory[] {
  const groups: Record<string, PointTransaction[]> = {};
  for (const tx of transactions) {
    const date = new Date(tx.timestamp).toISOString().split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, txs]) => ({
      date,
      label: formatDateLabel(date),
      totalPoints: txs.reduce((sum, tx) => sum + tx.totalPoints, 0),
      transactions: txs.sort((a, b) => b.timestamp - a.timestamp),
    }));
}

export function usePointsHistory(): UsePointsHistoryReturn {
  const { user, isUserLoading } = useUser();
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchTransactions = useCallback(async (reset = false) => {
    if (!user) return;
    if (reset) { setIsLoading(true); setTransactions([]); setOffset(0); setHasMore(true); }

    try {
      const supabase = getSupabaseClient();
      const currentOffset = reset ? 0 : offset;
      const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', user.uid)
        .order('timestamp', { ascending: false })
        .range(currentOffset, currentOffset + PAGE_SIZE - 1);

      if (error || !data || data.length === 0) { setHasMore(false); return; }

      const newTxs = data.map(row => ({ id: row.id, type: row.type, basePoints: row.base_points, bonusPoints: row.bonus_points, totalPoints: row.total_points, multiplier: row.multiplier, timestamp: row.timestamp, metadata: row.metadata } as PointTransaction));
      setHasMore(data.length === PAGE_SIZE);
      setOffset(currentOffset + data.length);
      setTransactions(prev => reset ? newTxs : [...prev, ...newTxs]);
    } catch (err) {
      console.error('Failed to fetch point history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, offset]);

  useEffect(() => {
    if (!isUserLoading) fetchTransactions(true);
  }, [user?.uid, isUserLoading]);

  return {
    history: groupTransactionsByDate(transactions),
    isLoading,
    hasMore,
    loadMore: () => fetchTransactions(false),
    refresh: () => fetchTransactions(true),
  };
}
