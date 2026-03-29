'use client';

import { doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, getDocs, onSnapshot, where, DocumentData } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { UserPlus, UserMinus, UserCheck, Shield, Ban, Unlock, Trash2, Edit, Eye, Star, Flag, Settings, Database, RefreshCw, Download, LogIn, LogOut, Key, AlertTriangle, CheckCircle, XCircle, Activity as ActivityIcon, Brain } from 'lucide-react';

export type ActivityType =
  // User events
  | 'USER_CREATED'
  | 'USER_DELETED'
  | 'USER_UPDATED'
  | 'USER_ROLE_CHANGED'
  | 'USER_BANNED'
  | 'USER_UNBANNED'
  // Map events
  | 'MAP_CREATED'
  | 'MAP_DELETED'
  | 'MAP_UPDATED'
  | 'MAP_PUBLISHED'
  | 'MAP_FEATURED'
  | 'MAP_FLAGGED'
  | 'MAP_UNFLAGGED'
  // System events
  | 'DATA_MODIFIED'
  | 'BACKEND_SYNC'
  | 'FULL_REFRESH'
  | 'SETTINGS_CHANGED'
  | 'CACHE_CLEARED'
  | 'EXPORT_DATA'
  | 'SYSTEM_ERROR'
  | 'SYSTEM_WARNING'
  // Auth events
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_RESET'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_VERIFIED'
  // Moderation events
  | 'CONTENT_APPROVED'
  | 'CONTENT_REJECTED'
  | 'USER_WARNED'
  | 'REPORT_RESOLVED';

export type ActivityCategory = 'users' | 'maps' | 'system' | 'auth' | 'moderation';

export interface AdminActivityLogEntry {
  id?: string;
  timestamp: string;
  type: ActivityType;
  targetId?: string;
  targetType?: 'user' | 'mindmap' | 'chat' | 'settings' | 'system';
  details: string;
  performedBy?: string;
  performedByEmail?: string;
  metadata?: Record<string, any>;
}

export interface ActivityConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: 'emerald' | 'red' | 'blue' | 'orange' | 'violet' | 'amber' | 'cyan' | 'pink' | 'zinc' | 'green';
  bgColor: string;
  borderColor: string;
  textColor: string;
  label: string;
  category: ActivityCategory;
}

export const ACTIVITY_CONFIG: Record<ActivityType, ActivityConfig> = {
  // User events
  USER_CREATED: { icon: UserPlus, color: 'emerald', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', textColor: 'text-emerald-400', label: 'User Created', category: 'users' },
  USER_DELETED: { icon: UserMinus, color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', label: 'User Deleted', category: 'users' },
  USER_UPDATED: { icon: Edit, color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', textColor: 'text-blue-400', label: 'User Updated', category: 'users' },
  USER_ROLE_CHANGED: { icon: Shield, color: 'violet', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', textColor: 'text-violet-400', label: 'Role Changed', category: 'users' },
  USER_BANNED: { icon: Ban, color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', label: 'User Banned', category: 'users' },
  USER_UNBANNED: { icon: Unlock, color: 'green', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', textColor: 'text-green-400', label: 'User Unbanned', category: 'users' },
  // Map events
  MAP_CREATED: { icon: ActivityIcon, color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', textColor: 'text-blue-400', label: 'Map Created', category: 'maps' },
  MAP_DELETED: { icon: Trash2, color: 'orange', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', textColor: 'text-orange-400', label: 'Map Deleted', category: 'maps' },
  MAP_UPDATED: { icon: Edit, color: 'cyan', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', textColor: 'text-cyan-400', label: 'Map Updated', category: 'maps' },
  MAP_PUBLISHED: { icon: Eye, color: 'emerald', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', textColor: 'text-emerald-400', label: 'Map Published', category: 'maps' },
  MAP_FEATURED: { icon: Star, color: 'amber', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', textColor: 'text-amber-400', label: 'Map Featured', category: 'maps' },
  MAP_FLAGGED: { icon: Flag, color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', label: 'Map Flagged', category: 'maps' },
  MAP_UNFLAGGED: { icon: CheckCircle, color: 'green', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', textColor: 'text-green-400', label: 'Map Unflagged', category: 'maps' },
  // System events
  DATA_MODIFIED: { icon: Database, color: 'violet', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', textColor: 'text-violet-400', label: 'Data Modified', category: 'system' },
  BACKEND_SYNC: { icon: RefreshCw, color: 'cyan', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', textColor: 'text-cyan-400', label: 'Backend Sync', category: 'system' },
  FULL_REFRESH: { icon: RefreshCw, color: 'amber', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', textColor: 'text-amber-400', label: 'Full Refresh', category: 'system' },
  SETTINGS_CHANGED: { icon: Settings, color: 'zinc', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20', textColor: 'text-zinc-400', label: 'Settings Changed', category: 'system' },
  CACHE_CLEARED: { icon: Database, color: 'violet', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', textColor: 'text-violet-400', label: 'Cache Cleared', category: 'system' },
  EXPORT_DATA: { icon: Download, color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', textColor: 'text-blue-400', label: 'Data Exported', category: 'system' },
  SYSTEM_ERROR: { icon: AlertTriangle, color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', label: 'System Error', category: 'system' },
  SYSTEM_WARNING: { icon: AlertTriangle, color: 'orange', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', textColor: 'text-orange-400', label: 'System Warning', category: 'system' },
  // Auth events
  LOGIN: { icon: LogIn, color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', textColor: 'text-blue-400', label: 'Admin Login', category: 'auth' },
  LOGOUT: { icon: LogOut, color: 'zinc', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20', textColor: 'text-zinc-400', label: 'Admin Logout', category: 'auth' },
  PASSWORD_RESET: { icon: Key, color: 'amber', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', textColor: 'text-amber-400', label: 'Password Reset', category: 'auth' },
  PASSWORD_CHANGED: { icon: Key, color: 'green', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', textColor: 'text-green-400', label: 'Password Changed', category: 'auth' },
  EMAIL_VERIFIED: { icon: CheckCircle, color: 'green', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', textColor: 'text-green-400', label: 'Email Verified', category: 'auth' },
  // Moderation events
  CONTENT_APPROVED: { icon: CheckCircle, color: 'green', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', textColor: 'text-green-400', label: 'Content Approved', category: 'moderation' },
  CONTENT_REJECTED: { icon: XCircle, color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', label: 'Content Rejected', category: 'moderation' },
  USER_WARNED: { icon: AlertTriangle, color: 'orange', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', textColor: 'text-orange-400', label: 'User Warned', category: 'moderation' },
  REPORT_RESOLVED: { icon: CheckCircle, color: 'emerald', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', textColor: 'text-emerald-400', label: 'Report Resolved', category: 'moderation' },
};

export const FILTER_CATEGORIES: { label: string; value: ActivityCategory | 'all'; types: ActivityType[] }[] = [
  { label: 'All', value: 'all', types: Object.keys(ACTIVITY_CONFIG) as ActivityType[] },
  { label: 'Users', value: 'users', types: Object.entries(ACTIVITY_CONFIG).filter(([, config]) => config.category === 'users').map(([type]) => type as ActivityType) },
  { label: 'Maps', value: 'maps', types: Object.entries(ACTIVITY_CONFIG).filter(([, config]) => config.category === 'maps').map(([type]) => type as ActivityType) },
  { label: 'System', value: 'system', types: Object.entries(ACTIVITY_CONFIG).filter(([, config]) => config.category === 'system').map(([type]) => type as ActivityType) },
  { label: 'Auth', value: 'auth', types: Object.entries(ACTIVITY_CONFIG).filter(([, config]) => config.category === 'auth').map(([type]) => type as ActivityType) },
  { label: 'Moderation', value: 'moderation', types: Object.entries(ACTIVITY_CONFIG).filter(([, config]) => config.category === 'moderation').map(([type]) => type as ActivityType) },
];

const ACTIVITY_LOG_COLLECTION = 'adminActivityLog';

export function useAdminActivityLog() {
  const firestore = useFirestore();

  const logAdminActivity = async (entry: Omit<AdminActivityLogEntry, 'timestamp'>): Promise<void> => {
    if (!firestore) return;
    try {
      await addDoc(collection(firestore, ACTIVITY_LOG_COLLECTION), {
        ...entry,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const getAdminActivityLogs = async (
    filterType?: ActivityType | ActivityCategory | 'all',
    maxEntries: number = 100
  ): Promise<AdminActivityLogEntry[]> => {
    if (!firestore) return [];

    try {
      const q = query(
        collection(firestore, ACTIVITY_LOG_COLLECTION),
        orderBy('timestamp', 'desc'),
        limit(maxEntries)
      );

      const snap = await getDocs(q);
      let entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminActivityLogEntry));

      if (filterType && filterType !== 'all') {
        const typesToFilter = typeof filterType === 'string' && FILTER_CATEGORIES.find(c => c.value === filterType)
          ? FILTER_CATEGORIES.find(c => c.value === filterType)!.types
          : [filterType];

        entries = entries.filter(log => typesToFilter.includes(log.type));
      }

      return entries;
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return [];
    }
  };

  const subscribeToAdminActivityLogs = (
    callback: (entries: AdminActivityLogEntry[]) => void,
    filterType?: ActivityType | ActivityCategory | 'all',
    maxEntries: number = 100
  ): (() => void) => {
    if (!firestore) return () => {};

    const q = query(
      collection(firestore, ACTIVITY_LOG_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(maxEntries)
    );

    return onSnapshot(q, (snap) => {
      let entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminActivityLogEntry));

      if (filterType && filterType !== 'all') {
        const typesToFilter = typeof filterType === 'string' && FILTER_CATEGORIES.find(c => c.value === filterType)
          ? FILTER_CATEGORIES.find(c => c.value === filterType)!.types
          : [filterType];

        entries = entries.filter(log => typesToFilter.includes(log.type));
      }

      callback(entries);
    });
  };

  return {
    logAdminActivity,
    getAdminActivityLogs,
    subscribeToAdminActivityLogs,
  };
}

export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function groupLogsByDate(logs: AdminActivityLogEntry[]): { title: string; data: AdminActivityLogEntry[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: { title: string; data: AdminActivityLogEntry[] }[] = [];
  const todayLogs: AdminActivityLogEntry[] = [];
  const yesterdayLogs: AdminActivityLogEntry[] = [];
  const thisWeekLogs: AdminActivityLogEntry[] = [];
  const olderLogs: AdminActivityLogEntry[] = [];

  logs.forEach(log => {
    const logDate = new Date(log.timestamp);
    if (logDate >= today) {
      todayLogs.push(log);
    } else if (logDate >= yesterday) {
      yesterdayLogs.push(log);
    } else if (logDate >= weekAgo) {
      thisWeekLogs.push(log);
    } else {
      olderLogs.push(log);
    }
  });

  if (todayLogs.length > 0) groups.push({ title: 'Today', data: todayLogs });
  if (yesterdayLogs.length > 0) groups.push({ title: 'Yesterday', data: yesterdayLogs });
  if (thisWeekLogs.length > 0) groups.push({ title: 'This Week', data: thisWeekLogs });
  if (olderLogs.length > 0) groups.push({ title: 'Older', data: olderLogs });

  return groups;
}
