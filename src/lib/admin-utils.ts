'use client';

import { doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, getDocs, onSnapshot, where, DocumentData } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { UserPlus, UserMinus, UserCheck, Shield, Ban, Unlock, Trash2, Edit, Eye, Star, Flag, Settings, Database, RefreshCw, Download, LogIn, LogOut, Key, AlertTriangle, CheckCircle, XCircle, Activity as ActivityIcon, Brain, Share2, Copy, FileDown, Image, Zap, MessageSquare, Clock, Search, Bookmark, EyeOff, Loader2, Send, Sparkles, Wand2 } from 'lucide-react';

export type ActivityType =
  // User events
  | 'USER_CREATED'
  | 'USER_DELETED'
  | 'USER_UPDATED'
  | 'USER_ROLE_CHANGED'
  | 'USER_BANNED'
  | 'USER_UNBANNED'
  | 'USER_WARNED'
  | 'USER_LOGGED_IN'
  | 'USER_LOGGED_OUT'
  | 'USER_PROFILE_UPDATED'
  // Map events
  | 'MAP_CREATED'
  | 'MAP_DELETED'
  | 'MAP_UPDATED'
  | 'MAP_PUBLISHED'
  | 'MAP_UNPUBLISHED'
  | 'MAP_FEATURED'
  | 'MAP_FLAGGED'
  | 'MAP_UNFLAGGED'
  | 'MAP_SHARED'
  | 'MAP_CLONED'
  | 'MAP_EXPORTED'
  | 'MAP_VIEWED'
  | 'NODE_EXPANDED'
  | 'SUBMAP_CREATED'
  | 'NESTED_MAP_CREATED'
  // AI Generation events
  | 'AI_GENERATION_STARTED'
  | 'AI_GENERATION_COMPLETED'
  | 'AI_GENERATION_FAILED'
  | 'IMAGE_GENERATION_STARTED'
  | 'IMAGE_GENERATION_COMPLETED'
  | 'IMAGE_GENERATION_FAILED'
  | 'EXPLANATION_REQUESTED'
  | 'EXPLANATION_VIEWED'
  | 'QUIZ_GENERATED'
  // Chat events
  | 'CHAT_CREATED'
  | 'CHAT_ENDED'
  | 'CHAT_MESSAGE_SENT'
  | 'CHAT_MESSAGE_RECEIVED'
  // Feedback events
  | 'FEEDBACK_SUBMITTED'
  | 'FEEDBACK_VIEWED'
  | 'FEEDBACK_REPLIED'
  // Engagement events
  | 'SEARCH_PERFORMED'
  | 'BOOKMARK_ADDED'
  | 'BOOKMARK_REMOVED'
  | 'PAGE_VIEWED'
  // System events
  | 'DATA_MODIFIED'
  | 'BACKEND_SYNC'
  | 'FULL_REFRESH'
  | 'SETTINGS_CHANGED'
  | 'CACHE_CLEARED'
  | 'EXPORT_DATA'
  | 'SYSTEM_ERROR'
  | 'SYSTEM_WARNING'
  | 'PERFORMANCE_LOG'
  | 'CLIENT_ERROR'
  // Auth events
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_RESET'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_VERIFIED'
  | 'LOGIN_FAILED'
  | 'ACCOUNT_LOCKED'
  // Moderation events
  | 'CONTENT_APPROVED'
  | 'CONTENT_REJECTED'
  | 'REPORT_RESOLVED'
  | 'REPORT_CREATED';

export type ActivityCategory = 'users' | 'maps' | 'ai' | 'chat' | 'feedback' | 'engagement' | 'system' | 'auth' | 'moderation';

export interface AdminActivityLogEntry {
  id?: string;
  timestamp: string;
  type: ActivityType;
  targetId?: string;
  targetType?: 'user' | 'mindmap' | 'chat' | 'feedback' | 'settings' | 'system' | 'node' | 'submap';
  details: string;
  performedBy?: string;
  performedByEmail?: string;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  duration?: number;
  errorType?: string;
  stackTrace?: string;
}

export interface ActivityConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: 'emerald' | 'red' | 'blue' | 'orange' | 'violet' | 'amber' | 'cyan' | 'pink' | 'zinc' | 'green' | 'sky' | 'teal' | 'indigo';
  bgColor: string;
  borderColor: string;
  textColor: string;
  label: string;
  category: ActivityCategory;
  severity?: 'info' | 'warning' | 'error' | 'success';
}

export const ACTIVITY_CONFIG: Record<ActivityType, ActivityConfig> = {
  // User events
  USER_CREATED: { icon: UserPlus, color: 'emerald', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', textColor: 'text-emerald-400', label: 'User Created', category: 'users', severity: 'success' },
  USER_DELETED: { icon: UserMinus, color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', label: 'User Deleted', category: 'users', severity: 'warning' },
  USER_UPDATED: { icon: Edit, color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', textColor: 'text-blue-400', label: 'User Updated', category: 'users' },
  USER_PROFILE_UPDATED: { icon: UserCheck, color: 'cyan', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', textColor: 'text-cyan-400', label: 'Profile Updated', category: 'users' },
  USER_ROLE_CHANGED: { icon: Shield, color: 'violet', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', textColor: 'text-violet-400', label: 'Role Changed', category: 'users' },
  USER_BANNED: { icon: Ban, color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', label: 'User Banned', category: 'users', severity: 'error' },
  USER_UNBANNED: { icon: Unlock, color: 'green', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', textColor: 'text-green-400', label: 'User Unbanned', category: 'users', severity: 'success' },
  USER_WARNED: { icon: AlertTriangle, color: 'orange', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', textColor: 'text-orange-400', label: 'User Warned', category: 'moderation', severity: 'warning' },
  USER_LOGGED_IN: { icon: LogIn, color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', textColor: 'text-blue-400', label: 'User Logged In', category: 'auth' },
  USER_LOGGED_OUT: { icon: LogOut, color: 'zinc', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20', textColor: 'text-zinc-400', label: 'User Logged Out', category: 'auth' },
  
  // Map events
  MAP_CREATED: { icon: ActivityIcon, color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', textColor: 'text-blue-400', label: 'Map Created', category: 'maps', severity: 'success' },
  MAP_DELETED: { icon: Trash2, color: 'orange', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', textColor: 'text-orange-400', label: 'Map Deleted', category: 'maps', severity: 'warning' },
  MAP_UPDATED: { icon: Edit, color: 'cyan', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', textColor: 'text-cyan-400', label: 'Map Updated', category: 'maps' },
  MAP_PUBLISHED: { icon: Eye, color: 'emerald', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', textColor: 'text-emerald-400', label: 'Map Published', category: 'maps', severity: 'success' },
  MAP_UNPUBLISHED: { icon: EyeOff, color: 'zinc', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20', textColor: 'text-zinc-400', label: 'Map Unpublished', category: 'maps' },
  MAP_FEATURED: { icon: Star, color: 'amber', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', textColor: 'text-amber-400', label: 'Map Featured', category: 'moderation', severity: 'success' },
  MAP_FLAGGED: { icon: Flag, color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', label: 'Map Flagged', category: 'moderation', severity: 'warning' },
  MAP_UNFLAGGED: { icon: CheckCircle, color: 'green', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', textColor: 'text-green-400', label: 'Map Unflagged', category: 'moderation', severity: 'success' },
  MAP_SHARED: { icon: Share2, color: 'sky', bgColor: 'bg-sky-500/10', borderColor: 'border-sky-500/20', textColor: 'text-sky-400', label: 'Map Shared', category: 'maps' },
  MAP_CLONED: { icon: Copy, color: 'violet', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', textColor: 'text-violet-400', label: 'Map Cloned', category: 'maps', severity: 'success' },
  MAP_EXPORTED: { icon: FileDown, color: 'teal', bgColor: 'bg-teal-500/10', borderColor: 'border-teal-500/20', textColor: 'text-teal-400', label: 'Map Exported', category: 'maps' },
  MAP_VIEWED: { icon: Eye, color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', textColor: 'text-blue-400', label: 'Map Viewed', category: 'engagement' },
  NODE_EXPANDED: { icon: Zap, color: 'amber', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', textColor: 'text-amber-400', label: 'Node Expanded', category: 'maps' },
  SUBMAP_CREATED: { icon: Copy, color: 'indigo', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/20', textColor: 'text-indigo-400', label: 'Sub-Map Created', category: 'maps', severity: 'success' },
  NESTED_MAP_CREATED: { icon: Copy, color: 'indigo', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/20', textColor: 'text-indigo-400', label: 'Nested Map Created', category: 'maps', severity: 'success' },
  
  // AI Generation events
  AI_GENERATION_STARTED: { icon: Sparkles, color: 'violet', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', textColor: 'text-violet-400', label: 'AI Generation Started', category: 'ai' },
  AI_GENERATION_COMPLETED: { icon: Sparkles, color: 'emerald', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', textColor: 'text-emerald-400', label: 'AI Generation Completed', category: 'ai', severity: 'success' },
  AI_GENERATION_FAILED: { icon: AlertTriangle, color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', label: 'AI Generation Failed', category: 'ai', severity: 'error' },
  IMAGE_GENERATION_STARTED: { icon: Image, color: 'pink', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/20', textColor: 'text-pink-400', label: 'Image Gen Started', category: 'ai' },
  IMAGE_GENERATION_COMPLETED: { icon: Image, color: 'emerald', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', textColor: 'text-emerald-400', label: 'Image Gen Completed', category: 'ai', severity: 'success' },
  IMAGE_GENERATION_FAILED: { icon: Image, color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', label: 'Image Gen Failed', category: 'ai', severity: 'error' },
  EXPLANATION_REQUESTED: { icon: Brain, color: 'violet', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', textColor: 'text-violet-400', label: 'Explanation Requested', category: 'ai' },
  EXPLANATION_VIEWED: { icon: Eye, color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', textColor: 'text-blue-400', label: 'Explanation Viewed', category: 'ai' },
  QUIZ_GENERATED: { icon: Brain, color: 'emerald', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', textColor: 'text-emerald-400', label: 'Quiz Generated', category: 'ai', severity: 'success' },
  
  // Chat events
  CHAT_CREATED: { icon: MessageSquare, color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', textColor: 'text-blue-400', label: 'Chat Created', category: 'chat', severity: 'success' },
  CHAT_ENDED: { icon: MessageSquare, color: 'zinc', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20', textColor: 'text-zinc-400', label: 'Chat Ended', category: 'chat' },
  CHAT_MESSAGE_SENT: { icon: Send, color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', textColor: 'text-blue-400', label: 'Message Sent', category: 'chat' },
  CHAT_MESSAGE_RECEIVED: { icon: MessageSquare, color: 'cyan', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', textColor: 'text-cyan-400', label: 'Message Received', category: 'chat' },
  
  // Feedback events
  FEEDBACK_SUBMITTED: { icon: MessageSquare, color: 'violet', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', textColor: 'text-violet-400', label: 'Feedback Submitted', category: 'feedback', severity: 'success' },
  FEEDBACK_VIEWED: { icon: Eye, color: 'zinc', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20', textColor: 'text-zinc-400', label: 'Feedback Viewed', category: 'feedback' },
  FEEDBACK_REPLIED: { icon: MessageSquare, color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', textColor: 'text-blue-400', label: 'Feedback Replied', category: 'feedback' },
  
  // Engagement events
  SEARCH_PERFORMED: { icon: Search, color: 'cyan', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', textColor: 'text-cyan-400', label: 'Search Performed', category: 'engagement' },
  BOOKMARK_ADDED: { icon: Bookmark, color: 'amber', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', textColor: 'text-amber-400', label: 'Bookmark Added', category: 'engagement' },
  BOOKMARK_REMOVED: { icon: Bookmark, color: 'zinc', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20', textColor: 'text-zinc-400', label: 'Bookmark Removed', category: 'engagement' },
  PAGE_VIEWED: { icon: Eye, color: 'zinc', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20', textColor: 'text-zinc-400', label: 'Page Viewed', category: 'engagement' },
  
  // System events
  DATA_MODIFIED: { icon: Database, color: 'violet', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', textColor: 'text-violet-400', label: 'Data Modified', category: 'system' },
  BACKEND_SYNC: { icon: RefreshCw, color: 'cyan', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', textColor: 'text-cyan-400', label: 'Backend Sync', category: 'system' },
  FULL_REFRESH: { icon: RefreshCw, color: 'amber', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', textColor: 'text-amber-400', label: 'Full Refresh', category: 'system' },
  SETTINGS_CHANGED: { icon: Settings, color: 'zinc', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20', textColor: 'text-zinc-400', label: 'Settings Changed', category: 'system' },
  CACHE_CLEARED: { icon: Database, color: 'violet', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', textColor: 'text-violet-400', label: 'Cache Cleared', category: 'system' },
  EXPORT_DATA: { icon: Download, color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', textColor: 'text-blue-400', label: 'Data Exported', category: 'system' },
  SYSTEM_ERROR: { icon: AlertTriangle, color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', label: 'System Error', category: 'system', severity: 'error' },
  SYSTEM_WARNING: { icon: AlertTriangle, color: 'orange', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', textColor: 'text-orange-400', label: 'System Warning', category: 'system', severity: 'warning' },
  PERFORMANCE_LOG: { icon: Clock, color: 'zinc', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20', textColor: 'text-zinc-400', label: 'Performance Log', category: 'system' },
  CLIENT_ERROR: { icon: AlertTriangle, color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', label: 'Client Error', category: 'system', severity: 'error' },
  
  // Auth events
  LOGIN: { icon: LogIn, color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', textColor: 'text-blue-400', label: 'Admin Login', category: 'auth', severity: 'success' },
  LOGOUT: { icon: LogOut, color: 'zinc', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20', textColor: 'text-zinc-400', label: 'Admin Logout', category: 'auth' },
  PASSWORD_RESET: { icon: Key, color: 'amber', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', textColor: 'text-amber-400', label: 'Password Reset', category: 'auth' },
  PASSWORD_CHANGED: { icon: Key, color: 'green', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', textColor: 'text-green-400', label: 'Password Changed', category: 'auth', severity: 'success' },
  EMAIL_VERIFIED: { icon: CheckCircle, color: 'green', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', textColor: 'text-green-400', label: 'Email Verified', category: 'auth', severity: 'success' },
  LOGIN_FAILED: { icon: AlertTriangle, color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', label: 'Login Failed', category: 'auth', severity: 'error' },
  ACCOUNT_LOCKED: { icon: Ban, color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', label: 'Account Locked', category: 'auth', severity: 'error' },
  
  // Moderation events
  CONTENT_APPROVED: { icon: CheckCircle, color: 'green', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', textColor: 'text-green-400', label: 'Content Approved', category: 'moderation', severity: 'success' },
  CONTENT_REJECTED: { icon: XCircle, color: 'red', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', textColor: 'text-red-400', label: 'Content Rejected', category: 'moderation', severity: 'warning' },
  REPORT_RESOLVED: { icon: CheckCircle, color: 'emerald', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', textColor: 'text-emerald-400', label: 'Report Resolved', category: 'moderation', severity: 'success' },
  REPORT_CREATED: { icon: Flag, color: 'orange', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', textColor: 'text-orange-400', label: 'Report Created', category: 'moderation' },
};

export const FILTER_CATEGORIES: { label: string; value: ActivityCategory | 'all'; types: ActivityType[] }[] = [
  { label: 'All', value: 'all', types: Object.keys(ACTIVITY_CONFIG) as ActivityType[] },
  { label: 'Users', value: 'users', types: Object.entries(ACTIVITY_CONFIG).filter(([, config]) => config.category === 'users').map(([type]) => type as ActivityType) },
  { label: 'Maps', value: 'maps', types: Object.entries(ACTIVITY_CONFIG).filter(([, config]) => config.category === 'maps').map(([type]) => type as ActivityType) },
  { label: 'AI', value: 'ai', types: Object.entries(ACTIVITY_CONFIG).filter(([, config]) => config.category === 'ai').map(([type]) => type as ActivityType) },
  { label: 'Chat', value: 'chat', types: Object.entries(ACTIVITY_CONFIG).filter(([, config]) => config.category === 'chat').map(([type]) => type as ActivityType) },
  { label: 'Feedback', value: 'feedback', types: Object.entries(ACTIVITY_CONFIG).filter(([, config]) => config.category === 'feedback').map(([type]) => type as ActivityType) },
  { label: 'Engagement', value: 'engagement', types: Object.entries(ACTIVITY_CONFIG).filter(([, config]) => config.category === 'engagement').map(([type]) => type as ActivityType) },
  { label: 'System', value: 'system', types: Object.entries(ACTIVITY_CONFIG).filter(([, config]) => config.category === 'system').map(([type]) => type as ActivityType) },
  { label: 'Auth', value: 'auth', types: Object.entries(ACTIVITY_CONFIG).filter(([, config]) => config.category === 'auth').map(([type]) => type as ActivityType) },
  { label: 'Moderation', value: 'moderation', types: Object.entries(ACTIVITY_CONFIG).filter(([, config]) => config.category === 'moderation').map(([type]) => type as ActivityType) },
];

const ACTIVITY_LOG_COLLECTION = 'adminActivityLog';

export function useAdminActivityLog() {
  const firestore = useFirestore();

  const logAdminActivity = async (entry: Omit<AdminActivityLogEntry, 'timestamp'>): Promise<void> => {
    try {
      const { logAdminActivityAction } = await import('@/app/actions');
      await logAdminActivityAction(entry);
    } catch (error) {
      console.error('Error logging activity via server action:', error);
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

export function getSeverityColor(severity?: 'info' | 'warning' | 'error' | 'success'): string {
  switch (severity) {
    case 'error': return 'text-red-400';
    case 'warning': return 'text-amber-400';
    case 'success': return 'text-emerald-400';
    default: return 'text-zinc-400';
  }
}
