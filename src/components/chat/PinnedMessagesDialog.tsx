'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChatMessage } from '@/types/chat';
import { Pin, Copy, Check, PinOff, Bot, User, ChevronDown, ChevronUp, ArrowUpRight, Search, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toDate } from '@/types/chat';

interface PinnedMessagesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedMessages: ChatMessage[];
  onUnpin: (messageId: string) => void;
  onCopy: (content: string) => void;
  onJumpToMessage?: (messageId: string) => void;
}

type SortOption = 'newest' | 'oldest' | 'role';

export function PinnedMessagesDialog({
  isOpen,
  onClose,
  pinnedMessages,
  onUnpin,
  onCopy,
  onJumpToMessage,
}: PinnedMessagesDialogProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCopy = (msg: ChatMessage) => {
    onCopy(msg.content);
    setCopiedIds(prev => new Set(prev).add(msg.id));
    setTimeout(() => {
      setCopiedIds(prev => { const n = new Set(prev); n.delete(msg.id); return n; });
    }, 2000);
  };

  const formatTimestamp = (timestamp: any) => {
    try { return formatDistanceToNow(toDate(timestamp), { addSuffix: true }); }
    catch { return 'Unknown time'; }
  };

  const filteredAndSortedMessages = useMemo(() => {
    let filtered = pinnedMessages;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = pinnedMessages.filter(m => m.content.toLowerCase().includes(q));
    }
    return [...filtered].sort((a, b) => {
      if (sortBy === 'oldest') return toDate(a.timestamp).getTime() - toDate(b.timestamp).getTime();
      if (sortBy === 'role') return a.role === b.role ? toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime() : a.role === 'ai' ? -1 : 1;
      return toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime();
    });
  }, [pinnedMessages, searchQuery, sortBy]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const bulkUnpin = () => {
    selectedIds.forEach(id => onUnpin(id));
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const exportAsMarkdown = () => {
    const content = filteredAndSortedMessages
      .map(msg => `### ${msg.role === 'ai' ? '**AI Assistant**' : '**You**'} • ${formatTimestamp(msg.timestamp)}\n\n${msg.content}\n`)
      .join('\n---\n\n');
    const blob = new Blob([`# Pinned Messages\n\nExported on ${new Date().toLocaleDateString()}\n\n---\n\n${content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pinned-messages-${Date.now()}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col glassmorphism border-white/10 rounded-[2rem] p-0 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="flex items-center gap-3">
              {/* Pin icon with glow */}
              <div className="relative w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shadow-[0_0_16px_rgba(245,158,11,0.2)]">
                <Pin className="h-4.5 w-4.5 text-amber-400 fill-amber-400/30" />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-white font-bold text-lg font-orbitron tracking-wide">Pinned Messages</span>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[11px] font-black font-orbitron px-2 py-0.5 rounded-full">
                  {pinnedMessages.length}
                </Badge>
              </div>
            </DialogTitle>

            <div className="flex items-center gap-1.5">
              {pinnedMessages.length > 1 && (
                <>
                  <Button
                    variant="ghost" size="icon"
                    onClick={exportAsMarkdown}
                    className="h-8 w-8 text-zinc-500 hover:text-zinc-200 hover:bg-white/8 rounded-xl"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelectedIds(new Set()); }}
                    className={cn(
                      "h-8 px-3 text-xs font-bold rounded-xl",
                      selectMode ? "text-amber-400 bg-amber-500/10" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/8"
                    )}
                  >
                    {selectMode ? 'Cancel' : 'Select'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Search + Sort */}
          {pinnedMessages.length > 0 && (
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <Input
                  placeholder="Search pinned messages..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-white/5 border-white/8 text-sm rounded-xl focus:border-amber-500/40 focus:ring-0 placeholder:text-zinc-600"
                />
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="h-9 px-3 pr-7 bg-white/5 border border-white/8 rounded-xl text-xs font-semibold text-zinc-400 focus:border-amber-500/40 focus:outline-none appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="role">By Role</option>
              </select>
            </div>
          )}

          {/* Bulk action bar */}
          {selectMode && selectedIds.size > 0 && (
            <div className="flex items-center gap-3 mt-3 px-1">
              <span className="text-xs text-zinc-500">{selectedIds.size} selected</span>
              <div className="flex-1 h-px bg-white/8" />
              <Button
                variant="ghost" size="sm"
                onClick={bulkUnpin}
                className="h-7 px-2.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg"
              >
                <PinOff className="h-3 w-3 mr-1" />
                Unpin ({selectedIds.size})
              </Button>
            </div>
          )}
        </DialogHeader>

        {/* Gradient divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent shrink-0" />

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {pinnedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-4">
                <Pin className="h-7 w-7 text-zinc-600" />
              </div>
              <p className="text-sm font-semibold text-zinc-400 mb-1">No Pinned Messages</p>
              <p className="text-xs text-zinc-600 text-center max-w-xs">Pin important messages from your chat to access them quickly here.</p>
            </div>
          ) : filteredAndSortedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 px-6">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-zinc-600" />
              </div>
              <p className="text-sm font-semibold text-zinc-400 mb-1">No Results</p>
              <p className="text-xs text-zinc-600 text-center">No pinned messages match your search.</p>
            </div>
          ) : (
            <ScrollArea className="h-full px-5 py-4">
              <div className="space-y-3">
                {filteredAndSortedMessages.map(msg => {
                  const isExpanded = expandedMessages.has(msg.id);
                  const isCopied = copiedIds.has(msg.id);
                  const needsTruncation = msg.content.length > 200;
                  const isSelected = selectedIds.has(msg.id);
                  const isAI = msg.role === 'ai';

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "relative rounded-2xl border overflow-hidden transition-all duration-200",
                        isSelected
                          ? "border-amber-500/40 bg-amber-500/5"
                          : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/15"
                      )}
                    >
                      {/* Role accent bar */}
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl",
                        isAI ? "bg-gradient-to-b from-violet-500 to-indigo-500" : "bg-gradient-to-b from-blue-400 to-cyan-500"
                      )} />

                      {/* Card header */}
                      <div className="pl-5 pr-3 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectMode && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(msg.id)}
                              className="h-3.5 w-3.5 border-zinc-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                            />
                          )}
                          <div className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center",
                            isAI ? "bg-violet-500/20" : "bg-blue-500/20"
                          )}>
                            {isAI
                              ? <Bot className="h-3 w-3 text-violet-400" />
                              : <User className="h-3 w-3 text-blue-400" />
                            }
                          </div>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest font-orbitron",
                            isAI ? "text-violet-400" : "text-blue-400"
                          )}>
                            {isAI ? 'AI' : 'You'}
                          </span>
                          <span className="text-[10px] text-zinc-600">·</span>
                          <span className="text-[10px] text-zinc-500">{formatTimestamp(msg.timestamp)}</span>
                        </div>

                        {!selectMode && (
                          <div className="flex items-center gap-0.5">
                            {onJumpToMessage && (
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => onJumpToMessage(msg.id)}
                                className="h-7 w-7 text-zinc-600 hover:text-zinc-200 hover:bg-white/8 rounded-lg"
                                title="Jump to message"
                              >
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => handleCopy(msg)}
                              className="h-7 w-7 text-zinc-600 hover:text-zinc-200 hover:bg-white/8 rounded-lg"
                            >
                              {isCopied
                                ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                                : <Copy className="h-3.5 w-3.5" />
                              }
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => onUnpin(msg.id)}
                              className="h-7 w-7 text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg"
                              title="Unpin"
                            >
                              <PinOff className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Thin inner divider */}
                      <div className="ml-5 h-px bg-white/5" />

                      {/* Content */}
                      <div className="pl-5 pr-4 py-3">
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                          {isExpanded || !needsTruncation
                            ? msg.content
                            : msg.content.substring(0, 200) + '...'}
                        </p>
                        {needsTruncation && !selectMode && (
                          <button
                            onClick={() => toggleExpand(msg.id)}
                            className="mt-2 text-[11px] font-semibold text-violet-400/70 hover:text-violet-400 transition-colors flex items-center gap-1"
                          >
                            {isExpanded
                              ? <><ChevronUp className="h-3 w-3" />Show less</>
                              : <><ChevronDown className="h-3 w-3" />Show response</>
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
