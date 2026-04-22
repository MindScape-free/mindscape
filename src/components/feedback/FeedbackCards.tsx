'use client';

import React, { useState } from 'react';
import { Feedback } from '@/types/feedback';
import { AdminActivityLogEntry } from '@/ai/schemas/feedback-schema';
import { FeedbackBadge } from './FeedbackBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Calendar,
  User,
  Mail,
  MessageSquare,
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Fingerprint,
  Flag,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';

const safeFormat = (date: any, fmt: string) => {
  if (!date) return 'Unknown';
  // Handle ISO strings or Timestamps
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Unknown';
  return format(d, fmt);
};

interface FeedbackCardsProps {
  data: Feedback[];
  onRefresh: () => void;
  adminUserId: string;
  isLoading: boolean;
}

export const FeedbackCards: React.FC<FeedbackCardsProps> = ({ data, onRefresh, adminUserId, isLoading }) => {
  const { toast } = useToast();
  const { supabase } = useAuth();
  
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const addActivityLog = async (feedbackId: string, log: Omit<AdminActivityLogEntry, 'id' | 'timestamp'>) => {
    if (!supabase) return;

    const newLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    
    // Fetch current feedback to get existing logs
    const { data: feedback, error: fetchError } = await supabase
      .from('feedback')
      .select('admin_activity_logs')
      .eq('id', feedbackId)
      .single();

    if (fetchError) throw fetchError;

    const currentLogs = feedback.admin_activity_logs || [];
    
    const { error: updateError } = await supabase
      .from('feedback')
      .update({
        admin_activity_logs: [...currentLogs, newLog],
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId);

    if (updateError) throw updateError;
    return newLog;
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!selectedFeedback || !supabase) return;
    setIsUpdating(true);
    try {
      const oldStatus = selectedFeedback.status;
      
      const { error: updateError } = await supabase
        .from('feedback')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      const newLog = await addActivityLog(id, {
        adminId: adminUserId,
        action: "STATUS_CHANGE",
        oldValue: oldStatus,
        newValue: newStatus,
      });

      toast({ title: "Status Updated", description: `Feedback marked as ${newStatus.toLowerCase().replace('_', ' ')}.` });
      onRefresh();
      
      if (selectedFeedback?.id === id) {
        setSelectedFeedback(prev => {
          if (!prev) return null;
          const updated = { ...prev, status: newStatus as any };
          if (newLog) {
            updated.adminActivityLogs = [...(prev.adminActivityLogs || []), newLog as any];
          }
          return updated;
        });
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Failed to update status." });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePriority = async (id: string, newPriority: string) => {
    if (!selectedFeedback || !supabase) return;
    setIsUpdating(true);
    try {
      const oldPriority = selectedFeedback.priority;
      
      const { error: updateError } = await supabase
        .from('feedback')
        .update({ 
          priority: newPriority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      const newLog = await addActivityLog(id, {
        adminId: adminUserId,
        action: "PRIORITY_CHANGE",
        oldValue: oldPriority,
        newValue: newPriority,
      });

      toast({ title: "Priority Updated", description: `Priority changed from ${oldPriority} to ${newPriority}.` });
      onRefresh();
      
      if (selectedFeedback?.id === id) {
        setSelectedFeedback(prev => {
          if (!prev) return null;
          const updated = { ...prev, priority: newPriority as any };
          if (newLog) {
            updated.adminActivityLogs = [...(prev.adminActivityLogs || []), newLog as any];
          }
          return updated;
        });
      }
    } catch (error: any) {
      console.error('Error updating priority:', error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Failed to update priority." });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedFeedback || !supabase) return;
    setIsUpdating(true);
    try {
      const oldNotes = selectedFeedback.adminNotes || '';
      
      const { error: updateError } = await supabase
        .from('feedback')
        .update({ 
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedFeedback.id);

      if (updateError) throw updateError;

      let newLog: any | undefined;
      if (adminNotes !== oldNotes) {
        newLog = await addActivityLog(selectedFeedback.id, {
          adminId: adminUserId,
          action: "NOTE_UPDATE",
          note: adminNotes,
        });
      }

      toast({ title: "Notes Saved", description: "Internal notes updated successfully." });
      
      // Update local state for immediate feedback
      setSelectedFeedback(prev => {
        if (!prev) return null;
        const updated = { ...prev, adminNotes };
        if (newLog) {
          updated.adminActivityLogs = [...(prev.adminActivityLogs || []), newLog];
        }
        return updated;
      });
      
      onRefresh();
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast({ variant: "destructive", title: "Failed to save", description: error.message || "An error occurred." });
    } finally {
      setIsUpdating(false);
    }
  };

  const openDetails = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setAdminNotes(feedback.adminNotes || '');
    setExpandedLogs({});
    setIsDetailsOpen(true);
  };

  const copyUserId = async (userId: string) => {
    await navigator.clipboard.writeText(userId);
    setCopiedUserId(true);
    setTimeout(() => setCopiedUserId(false), 2000);
  };

  const toggleLog = (logId: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'from-blue-500/10 to-indigo-500/10 border-blue-500/20';
      case 'IN_REVIEW': return 'from-amber-500/10 to-orange-500/10 border-amber-500/20';
      case 'RESOLVED': return 'from-emerald-500/10 to-green-500/10 border-emerald-500/20';
      case 'REJECTED': return 'from-red-500/10 to-rose-500/10 border-red-500/20';
      default: return 'from-zinc-500/10 to-zinc-500/5 border-zinc-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BUG': return '🐛';
      case 'SUGGESTION': return '💡';
      case 'IMPROVEMENT': return '📈';
      case 'FEATURE': return '✨';
      default: return '📝';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'MEDIUM': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'LOW': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getLogActionIcon = (action: string) => {
    switch (action) {
      case 'STATUS_CHANGE': return AlertCircle;
      case 'PRIORITY_CHANGE': return Flag;
      case 'NOTE_UPDATE': return MessageSquare;
      default: return Clock;
    }
  };

  const getLogActionColor = (action: string) => {
    switch (action) {
      case 'STATUS_CHANGE': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'PRIORITY_CHANGE': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'NOTE_UPDATE': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const getLogPreview = (log: AdminActivityLogEntry) => {
    switch (log.action) {
      case 'STATUS_CHANGE':
        return `Status: ${log.oldValue || '?'} → ${log.newValue || '?'}`;
      case 'PRIORITY_CHANGE':
        return `Priority: ${log.oldValue || '?'} → ${log.newValue || '?'}`;
      case 'NOTE_UPDATE':
        return `Note: "${(log.note || '').substring(0, 50)}${(log.note || '').length > 50 ? '...' : ''}"`;
      default:
        return 'Action performed';
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-2xl p-5 bg-zinc-900/40 border border-white/5 animate-pulse">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-zinc-800 rounded w-full" />
              <div className="h-3 bg-zinc-800 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 rounded-2xl bg-zinc-900/20 border border-white/5">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center">
            <MessageSquare className="h-10 w-10 text-zinc-700" />
          </div>
        </div>
        <p className="text-lg font-bold text-zinc-400 mb-2">No Feedback Yet</p>
        <p className="text-sm text-zinc-600 text-center max-w-md">
          User feedback will appear here once submitted. Check back regularly to stay on top of community insights.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((item) => (
          <div 
            key={item.id}
            className={`group relative rounded-2xl p-5 bg-gradient-to-br ${getStatusColor(item.status)} border backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 cursor-pointer`}
            onClick={() => openDetails(item)}
          >
            <div className="absolute top-4 right-4">
              {item.status === 'OPEN' && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />}
              {item.status === 'IN_REVIEW' && <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
              {item.status === 'RESOLVED' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              {item.status === 'REJECTED' && <XCircle className="h-4 w-4 text-red-400" />}
            </div>

            <div className="flex items-start gap-3 mb-4 pr-6">
              <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 text-lg">
                {getTypeIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-black text-white group-hover:text-violet-400 transition-colors truncate flex-1">
                    {item.title}
                  </p>
                  {item.trackingId && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-[9px] font-black font-mono text-violet-400">
                      {item.trackingId}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <FeedbackBadge type="type" value={item.type} />
                  <FeedbackBadge type="priority" value={item.priority} />
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
              {item.description}
            </p>

            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                {item.userName && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {item.userName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {safeFormat(item.createdAt, 'MMM d, HH:mm')}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl bg-zinc-950 border-zinc-900 text-white max-h-[90vh] overflow-y-auto">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <FeedbackBadge type="type" value={selectedFeedback.type} />
                  <FeedbackBadge type="priority" value={selectedFeedback.priority} />
                  <FeedbackBadge type="status" value={selectedFeedback.status} />
                  {selectedFeedback.trackingId && (
                    <span className="px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[10px] font-black font-mono text-violet-400">
                      {selectedFeedback.trackingId}
                    </span>
                  )}
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
                    <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">User Description</Label>
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

                  {/* Admin Activity Logs - Foldable Cards */}
                  {selectedFeedback.adminActivityLogs && (
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Admin Activity Logs ({selectedFeedback.adminActivityLogs.length})
                      </Label>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {[...selectedFeedback.adminActivityLogs].reverse().map((log: AdminActivityLogEntry, idx: number) => {
                          const logId = log.id || `log-${idx}`;
                          const isExpanded = expandedLogs[logId];
                          const ActionIcon = getLogActionIcon(log.action);
                          const colorClass = getLogActionColor(log.action);
                          const logTimestamp = new Date(log.timestamp as any);
                          const isValidDate = !isNaN(logTimestamp.getTime());
                          
                          return (
                            <div
                              key={logId}
                              className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
                            >
                              <button
                                onClick={() => toggleLog(logId)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors text-left"
                              >
                                <div className={`p-1.5 rounded-lg ${colorClass}`}>
                                  <ActionIcon className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-zinc-300 truncate">
                                    {getLogPreview(log)}
                                  </p>
                                  <p className="text-[10px] text-zinc-500">
                                    {isValidDate ? format(logTimestamp, 'MMM d, yyyy HH:mm') : 'Unknown date'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {log.action === 'STATUS_CHANGE' && (
                                    <div className="flex items-center gap-1">
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-zinc-700 text-zinc-400">
                                        {log.oldValue}
                                      </span>
                                      <ChevronRight className="w-3 h-3 text-zinc-500" />
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                        log.newValue === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' :
                                        log.newValue === 'IN_REVIEW' ? 'bg-amber-500/20 text-amber-400' :
                                        log.newValue === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                                        'bg-blue-500/20 text-blue-400'
                                      }`}>
                                        {log.newValue}
                                      </span>
                                    </div>
                                  )}
                                  {log.action === 'PRIORITY_CHANGE' && (
                                    <div className="flex items-center gap-1">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${getPriorityColor(log.oldValue || '')}`}>
                                        {log.oldValue}
                                      </span>
                                      <ChevronRight className="w-3 h-3 text-zinc-500" />
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${getPriorityColor(log.newValue || '')}`}>
                                        {log.newValue}
                                      </span>
                                    </div>
                                  )}
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                                  )}
                                </div>
                              </button>
                              
                              {isExpanded && (
                                <div className="px-3 pb-3 pt-1 border-t border-zinc-800/50 space-y-2">
                                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                    <Fingerprint className="w-3 h-3" />
                                    <span className="font-mono">{log.adminId?.substring(0, 12)}...</span>
                                    <span>•</span>
                                    <span>{isValidDate ? format(logTimestamp, 'MMMM do, yyyy HH:mm:ss') : 'Unknown'}</span>
                                  </div>
                                  {log.note && (
                                    <div className="p-2 rounded-lg bg-zinc-800/50 text-xs text-zinc-400 whitespace-pre-wrap">
                                      {log.note}
                                    </div>
                                  )}
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
                      <MessageSquare className="w-3 h-3" /> Internal Admin Notes
                    </Label>
                    <Textarea 
                      value={adminNotes} 
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes for the team..."
                      className="min-h-[120px] bg-zinc-950 border-zinc-800 text-sm resize-none"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveNotes} 
                    disabled={isUpdating}
                    className="w-full bg-zinc-100 hover:bg-white text-black font-black uppercase tracking-widest text-xs"
                  >
                    {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                    Save Internal Notes
                  </Button>

                  <div className="pt-4 space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Change Status</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUpdateStatus(selectedFeedback.id, 'IN_REVIEW')}
                        disabled={isUpdating || selectedFeedback.status === 'IN_REVIEW'}
                        className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10 text-[10px] font-black uppercase tracking-widest gap-2"
                      >
                        <AlertCircle className="w-3 h-3" />
                        In Review
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUpdateStatus(selectedFeedback.id, 'RESOLVED')}
                        disabled={isUpdating || selectedFeedback.status === 'RESOLVED'}
                        className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-black uppercase tracking-widest gap-2"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Resolved
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUpdateStatus(selectedFeedback.id, 'REJECTED')}
                        disabled={isUpdating || selectedFeedback.status === 'REJECTED'}
                        className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest gap-2"
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUpdateStatus(selectedFeedback.id, 'OPEN')}
                        disabled={isUpdating || selectedFeedback.status === 'OPEN'}
                        className="border-zinc-500/20 text-zinc-400 hover:bg-zinc-500/10 text-[10px] font-black uppercase tracking-widest gap-2"
                      >
                        <Sparkles className="w-3 h-3" />
                        Re-open
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Adjust Priority</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['LOW', 'MEDIUM', 'HIGH'] as const).map((priority) => (
                        <Button
                          key={priority}
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdatePriority(selectedFeedback.id, priority)}
                          disabled={isUpdating || selectedFeedback.priority === priority}
                          className={`text-[10px] font-black uppercase tracking-widest ${
                            priority === 'LOW' ? 'border-green-500/20 text-green-400 hover:bg-green-500/10' :
                            priority === 'MEDIUM' ? 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10' :
                            'border-red-500/20 text-red-400 hover:bg-red-500/10'
                          }`}
                        >
                          <Flag className="w-3 h-3 mr-1" />
                          {priority}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
