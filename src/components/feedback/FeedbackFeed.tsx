'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/lib/auth-context';
import { getSupabaseClient } from '@/lib/supabase-db';
import { Feedback, FeedbackType, FeedbackPriority } from '@/types/feedback';
import { FeedbackBadge } from './FeedbackBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  MessageSquare, 
  Activity, 
  ShieldCheck, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check, 
  Hash, 
  ArrowRight,
  X,
  Loader2,
  Calendar,
  User,
  Mail,
  Fingerprint,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Flag,
  Bug,
  Lightbulb,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
// firebase/firestore removed
import { AdminActivityLogEntry } from '@/ai/schemas/feedback-schema';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<string, { icon: React.FC<{ className?: string }>; initial: string; color: string; bg: string }> = {
  BUG: { icon: Bug, initial: 'B', color: 'text-red-400', bg: 'bg-red-500/10' },
  SUGGESTION: { icon: Lightbulb, initial: 'S', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  FEATURE: { icon: Sparkles, initial: 'F', color: 'text-violet-400', bg: 'bg-violet-500/10' },
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  OPEN: { color: 'bg-blue-500', label: 'Open' },
  IN_REVIEW: { color: 'bg-amber-500', label: 'Review' },
  RESOLVED: { color: 'bg-emerald-500', label: 'Resolved' },
  REJECTED: { color: 'bg-red-500', label: 'Rejected' },
};

const PRIORITY_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  HIGH: { dot: 'bg-violet-400', bg: 'bg-violet-500/20 text-violet-400', text: 'text-violet-400' },
  MEDIUM: { dot: 'bg-violet-500', bg: 'bg-violet-500/10 text-violet-500', text: 'text-violet-500' },
  LOW: { dot: 'bg-violet-600', bg: 'bg-violet-500/5 text-violet-600', text: 'text-violet-600' },
};

const TYPE_FILTERS: { value: 'all' | FeedbackType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'BUG', label: 'Bug' },
  { value: 'SUGGESTION', label: 'Suggestion' },
  { value: 'FEATURE', label: 'Feature' },
];

const PRIORITY_FILTERS: { value: 'all' | FeedbackPriority; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const safeFormat = (date: any, fmt: string) => {
  if (!date) return 'Unknown';
  const d = typeof date?.toDate === 'function' ? date.toDate() : new Date(date);
  if (isNaN(d.getTime())) return 'Unknown';
  return format(d, fmt);
};

const getLogActionIcon = (action: string) => {
  switch (action) {
    case 'STATUS_CHANGE': return CheckCircle2;
    case 'PRIORITY_CHANGE': return Flag;
    case 'NOTE_UPDATE': return MessageSquare;
    default: return Clock;
  }
};

const getLogActionColor = (action: string) => {
  switch (action) {
    case 'STATUS_CHANGE': return 'bg-blue-500/20 text-blue-400';
    case 'PRIORITY_CHANGE': return 'bg-amber-500/20 text-amber-400';
    case 'NOTE_UPDATE': return 'bg-violet-500/20 text-violet-400';
    default: return 'bg-zinc-500/20 text-zinc-400';
  }
};

const getLogPreview = (log: AdminActivityLogEntry) => {
  switch (log.action) {
    case 'STATUS_CHANGE':
      return `Status changed from ${log.oldValue} to ${log.newValue}`;
    case 'PRIORITY_CHANGE':
      return `Priority changed from ${log.oldValue} to ${log.newValue}`;
    case 'NOTE_UPDATE':
      return 'Admin notes added';
    default:
      return `Action: ${log.action}`;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'HIGH': return 'bg-red-500/20 text-red-400';
    case 'MEDIUM': return 'bg-amber-500/20 text-amber-400';
    case 'LOW': return 'bg-zinc-500/20 text-zinc-400';
    default: return 'bg-zinc-500/20 text-zinc-400';
  }
};

export const FeedbackFeed: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | FeedbackType>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | FeedbackPriority>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);

  const { isAdmin, user } = useFirestore();
  const supabase = getSupabaseClient();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchFeedback() {
      const { data } = await supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(50);
      setFeedbacks(data as Feedback[] || []);
      setIsLoading(false);
    }
    fetchFeedback();
  }, [supabase]);

  const filteredFeedbacks = feedbacks.filter(f => {
    const matchesType = typeFilter === 'all' || f.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || f.priority === priorityFilter;
    return matchesType && matchesPriority;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const openAdminDialog = (e: React.MouseEvent, feedback: Feedback) => {
    e.stopPropagation();
    setSelectedFeedback(feedback);
    setAdminNotes(feedback.adminNotes || '');
    setIsDetailsOpen(true);
  };

  const addActivityLog = async (feedbackId: string, log: Omit<AdminActivityLogEntry, 'id' | 'timestamp'>) => {
    const newLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
    };
    
    const feedbackRef = doc(firestore, 'feedback', feedbackId);
    await updateDoc(feedbackRef, {
      adminActivityLogs: arrayUnion(newLog),
      updatedAt: serverTimestamp(),
    });
    return newLog;
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedFeedback) return;
    setIsUpdating(true);
    try {
      const feedbackRef = doc(firestore, 'feedback', selectedFeedback.id);
      const oldStatus = selectedFeedback.status;
      
      await updateDoc(feedbackRef, { 
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      const newLog = await addActivityLog(selectedFeedback.id, {
        adminId: user?.uid || '',
        action: "STATUS_CHANGE",
        oldValue: oldStatus,
        newValue: newStatus,
      });

      toast({ title: "Status Updated", description: `Feedback marked as ${newStatus.toLowerCase().replace('_', ' ')}.` });
      
      setSelectedFeedback(prev => prev ? { 
        ...prev, 
        status: newStatus as any,
        adminActivityLogs: [...(prev.adminActivityLogs || []), newLog]
      } : null);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Failed to update status." });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePriority = async (newPriority: string) => {
    if (!selectedFeedback) return;
    setIsUpdating(true);
    try {
      const feedbackRef = doc(firestore, 'feedback', selectedFeedback.id);
      const oldPriority = selectedFeedback.priority;
      
      await updateDoc(feedbackRef, { 
        priority: newPriority,
        updatedAt: serverTimestamp(),
      });

      const newLog = await addActivityLog(selectedFeedback.id, {
        adminId: user?.uid || '',
        action: "PRIORITY_CHANGE",
        oldValue: oldPriority,
        newValue: newPriority,
      });

      toast({ title: "Priority Updated", description: `Priority changed from ${oldPriority} to ${newPriority}.` });
      
      setSelectedFeedback(prev => prev ? { 
        ...prev, 
        priority: newPriority as any,
        adminActivityLogs: [...(prev.adminActivityLogs || []), newLog]
      } : null);
    } catch (error: any) {
      console.error('Error updating priority:', error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Failed to update priority." });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedFeedback) return;
    setIsUpdating(true);
    try {
      const feedbackRef = doc(firestore, 'feedback', selectedFeedback.id);
      await updateDoc(feedbackRef, { 
        adminNotes,
        updatedAt: serverTimestamp(),
      });

      const newLog = await addActivityLog(selectedFeedback.id, {
        adminId: user?.uid || '',
        action: "NOTE_UPDATE" as any,
        newValue: 'Notes updated',
      });

      toast({ title: "Notes Saved", description: "Admin notes have been updated." });
      setSelectedFeedback(prev => prev ? { 
        ...prev, 
        adminNotes,
        adminActivityLogs: [...(prev.adminActivityLogs || []), newLog]
      } : null);
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast({ variant: "destructive", title: "Save Failed", description: error.message || "Failed to save notes." });
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleLog = (logId: string) => {
    setExpandedLogs(prev => ({ ...prev, [logId]: !prev[logId] }));
  };

  const copyUserId = async (userId: string) => {
    await navigator.clipboard.writeText(userId);
    setCopiedUserId(true);
    setTimeout(() => setCopiedUserId(false), 2000);
  };

  const isExpanded = (id: string) => expandedId === id;

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto py-12">
        <div className="h-14 rounded-2xl bg-white/5 animate-pulse mb-6" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h2 className="text-xl font-black uppercase tracking-tighter text-white font-orbitron flex items-center gap-2.5">
            Recent Feedback
            {isAdmin && <ShieldCheck className="w-4 h-4 text-primary animate-pulse" />}
            <span className="text-sm font-normal text-zinc-500 ml-2">({filteredFeedbacks.length})</span>
          </h2>
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-emerald-500" />
            Latest from the community
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/8">
          <span className={cn('w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse')} />
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Live</span>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-20 py-4 bg-zinc-950/90 backdrop-blur-xl -mx-4 px-4 mb-6 border-b border-white/5">
        <div className="flex flex-wrap items-center gap-4">
          {/* Type Filters */}
          <div className="flex items-center gap-2 p-1 bg-zinc-900/60 rounded-xl border border-white/5">
            {TYPE_FILTERS.map(filter => (
              <button
                key={filter.value}
                onClick={() => setTypeFilter(filter.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200',
                  typeFilter === filter.value
                    ? filter.value === 'BUG' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : filter.value === 'SUGGESTION' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : filter.value === 'FEATURE' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : 'bg-white/10 text-white border border-white/10'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Priority Filters */}
          <div className="flex items-center gap-2 p-1 bg-zinc-900/60 rounded-xl border border-white/5">
            {PRIORITY_FILTERS.map(filter => (
              <button
                key={filter.value}
                onClick={() => setPriorityFilter(filter.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200',
                  priorityFilter === filter.value
                    ? filter.value === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : filter.value === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : filter.value === 'LOW' ? 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                    : 'bg-white/10 text-white border border-white/10'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Clear Filters */}
          {(typeFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              onClick={() => { setTypeFilter('all'); setPriorityFilter('all'); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Accordion List */}
      <div className="pb-20">
        {filteredFeedbacks.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
            <MessageSquare className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
            <p className="text-zinc-600 font-black uppercase tracking-widest text-[10px]">No feedback found</p>
            {(typeFilter !== 'all' || priorityFilter !== 'all') && (
              <button
                onClick={() => { setTypeFilter('all'); setPriorityFilter('all'); }}
                className="mt-4 text-primary text-xs font-black uppercase tracking-widest"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {filteredFeedbacks.map((item, index) => {
                const isOpen = isExpanded(item.id);
                const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.SUGGESTION;
                const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.OPEN;
                const priorityConfig = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.LOW;
                const authorName = item.userName || `Pioneer-${item.userId?.substring(0, 4) || 'Anon'}`;
                const displayDate = item.createdAt
                  ? format(new Date(item.createdAt.toDate?.() || item.createdAt), 'MMM d, yyyy')
                  : 'Just now';

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15, delay: index * 0.02 }}
                    className="rounded-xl border border-white/5 bg-zinc-900/30 hover:bg-zinc-900/50 overflow-hidden transition-all duration-200"
                  >
                    {/* Accordion Header */}
                    <div
                      onClick={() => toggleExpand(item.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && toggleExpand(item.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left group cursor-pointer"
                    >
                      {/* Type Indicator: Icon + Initial */}
                      <div className={cn('flex items-center gap-1 px-2 py-1.5 rounded-lg shrink-0', typeConfig.bg)}>
                        {item.type === 'BUG' && <Bug className={cn('w-4 h-4', typeConfig.color)} />}
                        {item.type === 'SUGGESTION' && <Lightbulb className={cn('w-4 h-4', typeConfig.color)} />}
                        {item.type === 'FEATURE' && <Sparkles className={cn('w-4 h-4', typeConfig.color)} />}
                        <span className={cn('text-xs font-black', typeConfig.color)}>{typeConfig.initial}</span>
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0 flex items-center gap-4">
                        {/* Title + FeedID */}
                        <div className="flex-1 min-w-0">
                          <h3 className={cn(
                            'text-sm font-bold truncate transition-colors duration-200',
                            isOpen ? 'text-white' : 'text-zinc-300 group-hover:text-white'
                          )}>
                            {item.title}
                          </h3>
                          {/* FeedID below title - always show if available */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={cn(
                              'text-[9px] font-black font-mono px-1.5 py-0.5 rounded',
                              item.trackingId 
                                ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' 
                                : 'bg-zinc-800 text-zinc-500'
                            )}>
                              {item.trackingId || `#${item.id.slice(0, 8).toUpperCase()}`}
                            </span>
                          </div>
                        </div>

                        {/* Priority - Desktop */}
                        <div className={cn('hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0', priorityConfig.bg)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', priorityConfig.dot)} />
                          <span className={cn('text-[10px] font-black uppercase', priorityConfig.text)}>{item.priority}</span>
                        </div>

                        {/* Status - Desktop */}
                        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800/50 shrink-0">
                          <span className={cn('w-1.5 h-1.5 rounded-full', statusConfig.color, item.status !== 'RESOLVED' && item.status !== 'REJECTED' ? 'animate-pulse' : '')} />
                          <span className="text-[10px] font-black uppercase text-zinc-400">{statusConfig.label}</span>
                        </div>

                        {/* Date - Desktop */}
                        <span className="hidden lg:block text-[10px] text-zinc-600 font-mono shrink-0">{displayDate}</span>

                        {/* Mobile Meta */}
                        <div className="flex sm:hidden items-center gap-2 shrink-0">
                          <span className={cn('w-1.5 h-1.5 rounded-full', priorityConfig.dot)} />
                          <span className={cn('w-1.5 h-1.5 rounded-full', statusConfig.color)} />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isAdmin && (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              openAdminDialog(e, item);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                openAdminDialog(e as any, item);
                              }
                            }}
                            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/30 transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer"
                          >
                            Manage
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        )}
                        <ChevronDown className={cn(
                          'w-5 h-5 text-zinc-600 transition-transform duration-200',
                          isOpen ? 'rotate-180 text-zinc-400' : 'group-hover:text-zinc-400'
                        )} />
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-white/5"
                        >
                          <div className="p-5 space-y-4">
                            {/* Mobile Meta */}
                            <div className="flex lg:hidden flex-wrap items-center gap-3">
                              <div className={cn('flex items-center gap-1 px-2 py-1 rounded-lg', typeConfig.bg)}>
                                {item.type === 'BUG' && <Bug className={cn('w-4 h-4', typeConfig.color)} />}
                                {item.type === 'SUGGESTION' && <Lightbulb className={cn('w-4 h-4', typeConfig.color)} />}
                                {item.type === 'FEATURE' && <Sparkles className={cn('w-4 h-4', typeConfig.color)} />}
                                <span className={cn('text-xs font-black', typeConfig.color)}>{typeConfig.initial}</span>
                              </div>
                              <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg', priorityConfig.bg)}>
                                <span className={cn('w-1.5 h-1.5 rounded-full', priorityConfig.dot)} />
                                <span className={cn('text-[10px] font-black uppercase', priorityConfig.text)}>{item.priority}</span>
                              </div>
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800/50">
                                <span className={cn('w-1.5 h-1.5 rounded-full', statusConfig.color)} />
                                <span className="text-[10px] font-black uppercase text-zinc-400">{statusConfig.label}</span>
                              </div>
                              {/* FeedID - Mobile */}
                              <span className={cn(
                                'text-[9px] font-black font-mono px-1.5 py-0.5 rounded',
                                item.trackingId 
                                  ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' 
                                  : 'bg-zinc-800 text-zinc-500'
                              )}>
                                {item.trackingId || `#${item.id.slice(0, 8).toUpperCase()}`}
                              </span>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Description</p>
                              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                {item.description}
                              </p>
                            </div>

                            {/* Affected Area */}
                            {(item as any).affectedArea && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Area:</span>
                                <span className="text-xs text-zinc-400 font-mono bg-zinc-800/50 px-2 py-1 rounded">{((item as any).affectedArea)}</span>
                              </div>
                            )}

                            {/* User Info & Admin Action */}
                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-zinc-400">
                                  {authorName.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-white leading-tight">{authorName}</p>
                                  <p className="text-[10px] text-zinc-600 font-mono">{safeFormat(item.createdAt, 'MMM d, yyyy HH:mm')}</p>
                                </div>
                              </div>

                              {isAdmin && (
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => openAdminDialog(e, item)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      openAdminDialog(e as any, item);
                                    }
                                  }}
                                  className="sm:hidden flex items-center gap-1 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-black uppercase tracking-widest cursor-pointer"
                                >
                                  Manage
                                  <ArrowRight className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Admin Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl bg-zinc-950 border-zinc-900 text-white max-h-[90vh] overflow-y-auto">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <FeedbackBadge type="type" value={selectedFeedback.type} />
                  <FeedbackBadge type="priority" value={selectedFeedback.priority} />
                  <FeedbackBadge type="status" value={selectedFeedback.status} />
                  <span className={cn(
                    'px-2 py-1 rounded-lg text-[10px] font-black font-mono',
                    selectedFeedback.trackingId 
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' 
                      : 'bg-zinc-800 text-zinc-400'
                  )}>
                    {selectedFeedback.trackingId || `#${selectedFeedback.id.slice(0, 8).toUpperCase()}`}
                  </span>
                </div>
                <DialogTitle className="text-2xl font-black tracking-tighter">{selectedFeedback.title}</DialogTitle>
                <DialogDescription className="text-zinc-500 flex items-center gap-4 pt-2 flex-wrap">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {safeFormat(selectedFeedback.createdAt, 'MMMM do, yyyy HH:mm')}</span>
                  {selectedFeedback.userName && <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> {selectedFeedback.userName}</span>}
                  {selectedFeedback.userEmail && <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {selectedFeedback.userEmail}</span>}
                  {selectedFeedback.userId && (
                    <button
                      onClick={() => copyUserId(selectedFeedback.userId!)}
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-violet-400 transition-colors"
                    >
                      <Fingerprint className="w-3 h-3" />
                      <span className="font-mono text-[10px]">{selectedFeedback.userId.substring(0, 12)}...</span>
                      {copiedUserId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Description</Label>
                    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm leading-relaxed whitespace-pre-wrap min-h-[150px]">
                      {selectedFeedback.description}
                    </div>
                  </div>

                  {selectedFeedback.attachments && selectedFeedback.attachments.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Attachments</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedFeedback.attachments.map((url, i) => (
                          <div key={i} className="aspect-square rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden group relative">
                            <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedFeedback.adminActivityLogs && selectedFeedback.adminActivityLogs.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Activity Logs ({selectedFeedback.adminActivityLogs.length})
                      </Label>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {[...selectedFeedback.adminActivityLogs].reverse().map((log: AdminActivityLogEntry, idx: number) => {
                          const logId = log.id || `log-${idx}`;
                          const isExpanded = expandedLogs[logId];
                          const ActionIcon = getLogActionIcon(log.action);
                          const colorClass = getLogActionColor(log.action);
                          const logTimestamp = log.timestamp
                            ? (typeof (log.timestamp as any).toDate === 'function'
                                ? (log.timestamp as any).toDate()
                                : new Date(log.timestamp as any))
                            : new Date();
                          const isValidDate = !isNaN(logTimestamp.getTime());
                          
                          return (
                            <div key={logId} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                              <button
                                onClick={() => toggleLog(logId)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors text-left"
                              >
                                <div className={`p-1.5 rounded-lg ${colorClass}`}>
                                  <ActionIcon className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-zinc-300 truncate">{getLogPreview(log)}</p>
                                  <p className="text-[10px] text-zinc-500">{isValidDate ? format(logTimestamp, 'MMM d, HH:mm') : 'Unknown'}</p>
                                </div>
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
                              </button>
                              {isExpanded && (
                                <div className="px-3 pb-3 pt-1 border-t border-zinc-800/50 space-y-2">
                                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                    <Fingerprint className="w-3 h-3" />
                                    <span className="font-mono">{log.adminId?.substring(0, 12)}...</span>
                                    <span>•</span>
                                    <span>{isValidDate ? format(logTimestamp, 'HH:mm:ss') : ''}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> Update Status
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'].map(status => (
                        <button
                          key={status}
                          onClick={() => handleUpdateStatus(status)}
                          disabled={isUpdating || selectedFeedback.status === status}
                          className={cn(
                            'px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                            selectedFeedback.status === status
                              ? status === 'OPEN' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : status === 'IN_REVIEW' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                          )}
                        >
                          {isUpdating && selectedFeedback.status !== status ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : status.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Flag className="w-3 h-3" /> Update Priority
                    </Label>
                    <div className="flex gap-2">
                      {['LOW', 'MEDIUM', 'HIGH'].map(priority => (
                        <button
                          key={priority}
                          onClick={() => handleUpdatePriority(priority)}
                          disabled={isUpdating || selectedFeedback.priority === priority}
                          className={cn(
                            'flex-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                            selectedFeedback.priority === priority
                              ? getPriorityColor(priority) + ' border'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                          )}
                        >
                          {isUpdating && selectedFeedback.priority !== priority ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : priority}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Admin Notes</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes..."
                      className="min-h-[120px] bg-zinc-900 border-zinc-800 text-sm resize-none"
                    />
                    <Button
                      onClick={handleSaveNotes}
                      disabled={isUpdating}
                      className="w-full bg-violet-500 hover:bg-violet-600 text-white"
                    >
                      {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Notes'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
