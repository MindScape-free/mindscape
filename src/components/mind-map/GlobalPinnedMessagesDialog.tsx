'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { PinnedMessage, toDate } from '@/types/chat';
import { MindMapData } from '@/types/mind-map';
import { Pin, Copy, Check, Search, ChevronDown, ChevronUp, Bot, User, Trash2, MessageCircle, Loader2, Map, X, MessageSquare, PinOff } from 'lucide-react';
import { PinnedMessageChatDialog } from '@/components/chat/PinnedMessageChatDialog';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/auth-context';

type PinTab = 'map' | 'all';

interface GlobalPinnedMessagesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedMessages: PinnedMessage[];
  onUnpin: (pinId: string) => void;
  onCopy: (content: string) => void;
  currentMap?: MindMapData | null;
  onMindMapGenerated?: (mapData: MindMapData) => void;
  onOpenChat?: (initialView?: 'chat' | 'history' | 'pins' | 'canvas-pins') => void;
  initialChatView?: 'chat' | 'history' | 'pins' | 'canvas-pins';
}

type SortOption = 'newest' | 'oldest';

export function GlobalPinnedMessagesDialog({
  isOpen,
  onClose,
  pinnedMessages,
  onUnpin,
  onCopy,
  currentMap,
  onMindMapGenerated,
  onOpenChat,
  initialChatView = 'pins',
}: GlobalPinnedMessagesDialogProps) {
  const [activeTab, setActiveTab] = useState<PinTab>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [expandedPins, setExpandedPins] = useState<Set<string>>(new Set());
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [selectedPin, setSelectedPin] = useState<PinnedMessage | null>(null);
  const [chatPin, setChatPin] = useState<PinnedMessage | null>(null);
  const [allPinnedMessages, setAllPinnedMessages] = useState<PinnedMessage[]>([]);
  const [isLoadingAllPins, setIsLoadingAllPins] = useState(false);

  const { user, supabase } = useAuth();

  useEffect(() => {
    if (activeTab === 'all' && !allPinnedMessages.length) {
      fetchAllPinnedMessages();
    }
  }, [activeTab]);

  const fetchAllPinnedMessages = async () => {
    if (!user || !supabase) return;
    setIsLoadingAllPins(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('global_pinned_messages')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setAllPinnedMessages(data.global_pinned_messages || []);
    } catch (error) {
      console.error('Failed to fetch all pinned messages:', error);
    } finally {
      setIsLoadingAllPins(false);
    }
  };

  const currentPins = activeTab === 'map' ? pinnedMessages : allPinnedMessages;

  const toggleExpand = (pinId: string) => {
    setExpandedPins(prev => {
      const next = new Set(prev);
      next.has(pinId) ? next.delete(pinId) : next.add(pinId);
      return next;
    });
  };

  const handleCopy = (pin: PinnedMessage, content: string) => {
    onCopy(content);
    setCopiedIds(prev => new Set(prev).add(pin.id));
    setTimeout(() => {
      setCopiedIds(prev => { const n = new Set(prev); n.delete(pin.id); return n; });
    }, 2000);
  };

  const getHeading = (pin: PinnedMessage): string => {
    if (pin.question) return pin.question.content.substring(0, 200) + (pin.question.content.length > 200 ? '...' : '');
    if (pin.soloMessage) return pin.soloMessage.content.substring(0, 197) + (pin.soloMessage.content.length > 197 ? '...' : '');
    return 'Unknown';
  };

  const formatTimestamp = (timestamp: any) => {
    try { return formatDistanceToNow(toDate(timestamp), { addSuffix: true }); }
    catch { return 'Unknown time'; }
  };

  const filteredAndSortedMessages = useMemo(() => {
    let filtered = currentPins;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = currentPins.filter(pin =>
        pin.question?.content.toLowerCase().includes(q) ||
        pin.response?.content.toLowerCase().includes(q) ||
        pin.soloMessage?.content.toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) =>
      sortBy === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
    );
  }, [currentPins, searchQuery, sortBy, allPinnedMessages]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col glassmorphism border-white/10 rounded-[2rem] p-0 shadow-2xl overflow-hidden">

          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Tabs */}
                <div className="flex items-center bg-white/[0.06] rounded-xl p-0.5 border border-white/8">
                  <button
                    onClick={() => setActiveTab('map')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      activeTab === 'map' 
                        ? "bg-amber-500/20 text-amber-300" 
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <Map className="h-3.5 w-3.5" />
                    Map Pins
                    <Badge className={cn(
                      "ml-1 px-1.5 py-0 rounded-full text-[10px] font-black",
                      activeTab === 'map' 
                        ? "bg-amber-500/30 text-amber-200" 
                        : "bg-white/10 text-zinc-500"
                    )}>
                      {pinnedMessages.length}
                    </Badge>
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      activeTab === 'all' 
                        ? "bg-amber-500/20 text-amber-300" 
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <Pin className="h-3.5 w-3.5" />
                    All Pins
                    <Badge className={cn(
                      "ml-1 px-1.5 py-0 rounded-full text-[10px] font-black",
                      activeTab === 'all' 
                        ? "bg-amber-500/30 text-amber-200" 
                        : "bg-white/10 text-zinc-500"
                    )}>
                      {isLoadingAllPins ? '...' : allPinnedMessages.length}
                    </Badge>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {onOpenChat && (
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => { onClose(); onOpenChat?.(initialChatView); }}
                    className="h-8 px-3 text-xs font-bold text-zinc-400 hover:text-zinc-200 hover:bg-white/8 rounded-xl gap-1.5"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Chat
                  </Button>
                )}
                <Button
                  variant="ghost" size="icon"
                  onClick={onClose}
                  className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Search + Sort */}
            {currentPins.length > 0 && (
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
                </select>
              </div>
            )}
          </DialogHeader>

          {/* Gradient divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent shrink-0" />

          {/* Body */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'all' && isLoadingAllPins ? (
              <div className="flex flex-col items-center justify-center h-full py-16 px-6">
                <Loader2 className="h-7 w-7 text-amber-400 animate-spin mb-4" />
                <p className="text-sm font-semibold text-zinc-400">Loading all pins...</p>
              </div>
            ) : currentPins.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 px-6">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-4">
                  <Pin className="h-7 w-7 text-zinc-600" />
                </div>
                <p className="text-sm font-semibold text-zinc-400 mb-1">
                  {activeTab === 'map' ? 'No Map Pins' : 'No All Pins'}
                </p>
                <p className="text-xs text-zinc-600 text-center max-w-xs">
                  {activeTab === 'map' 
                    ? 'Pin important conversations from your chat to this map.'
                    : 'Pin important conversations from your chat to access them quickly here.'}
                </p>
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
                <div className="space-y-2.5">
                  {filteredAndSortedMessages.map(pin => {
                    const isExpanded = expandedPins.has(pin.id);
                    const isCopied = copiedIds.has(pin.id);
                    const isSoloAI = pin.soloMessage && !pin.question;

                    return (
                      <div
                        key={pin.id}
                        className="relative rounded-2xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/15 overflow-hidden transition-all duration-200"
                      >
                        {/* Role accent bar */}
                        <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl",
                          isSoloAI
                            ? "bg-gradient-to-b from-violet-500 to-indigo-500"
                            : "bg-gradient-to-b from-blue-400 to-cyan-500"
                        )} />

                        {/* Card header */}
                        <div className="pl-5 pr-3 py-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                              isSoloAI ? "bg-violet-500/20" : "bg-blue-500/20"
                            )}>
                              {isSoloAI
                                ? <Bot className="h-3 w-3 text-violet-400" />
                                : <User className="h-3 w-3 text-blue-400" />
                              }
                            </div>
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest font-orbitron shrink-0",
                              isSoloAI ? "text-violet-400" : "text-blue-400"
                            )}>
                              {isSoloAI ? 'AI' : 'You'}
                            </span>
                            <span className="text-[10px] text-zinc-600 shrink-0">·</span>
                            <span className="text-[10px] text-zinc-500 shrink-0">
                              {formatTimestamp(pin.question?.timestamp || pin.soloMessage?.timestamp || pin.createdAt)}
                            </span>
                            <span className="text-sm text-zinc-400 truncate ml-1">{getHeading(pin)}</span>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => setSelectedPin(pin)}
                              className="h-7 px-2.5 text-[11px] font-bold text-zinc-500 hover:text-zinc-200 hover:bg-white/8 rounded-lg"
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => setChatPin(pin)}
                              className="h-7 w-7 text-zinc-600 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => handleCopy(pin, pin.question?.content || pin.soloMessage?.content || '')}
                              className="h-7 w-7 text-zinc-600 hover:text-zinc-200 hover:bg-white/8 rounded-lg"
                            >
                              {isCopied
                                ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                                : <Copy className="h-3.5 w-3.5" />
                              }
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => onUnpin(pin.id)}
                              className="h-7 w-7 text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Inner divider */}
                        <div className="ml-5 h-px bg-white/5" />

                        {/* Content */}
                        <div className="pl-5 pr-4 py-3">
                          {isSoloAI ? (
                            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                              {pin.soloMessage?.content}
                            </p>
                          ) : (
                            <>
                              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                                {pin.question?.content}
                              </p>
                              {pin.response && (
                                <div className="mt-2.5">
                                  <button
                                    onClick={() => toggleExpand(pin.id)}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-violet-400/70 hover:text-violet-400 transition-colors"
                                  >
                                    {isExpanded
                                      ? <><ChevronUp className="h-3 w-3" />Hide Response</>
                                      : <><ChevronDown className="h-3 w-3" />Show Response</>
                                    }
                                  </button>
                                  {isExpanded && (
                                    <div className="mt-2 p-3 bg-violet-500/5 rounded-xl border border-violet-500/10">
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <Bot className="h-3 w-3 text-violet-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-violet-400 font-orbitron">AI</span>
                                      </div>
                                      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                                        {pin.response.content}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
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

      <PinnedMessageChatDialog
        pin={chatPin}
        onClose={() => setChatPin(null)}
        currentMap={currentMap}
        onMindMapGenerated={onMindMapGenerated}
      />

      {/* Detail view dialog */}
      {selectedPin && (
        <Dialog open={!!selectedPin} onOpenChange={() => setSelectedPin(null)}>
          <DialogContent className="sm:max-w-2xl glassmorphism border-white/10 rounded-[2rem] p-0 shadow-2xl overflow-hidden">
            <DialogHeader className="px-6 pt-5 pb-4 shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                    <Pin className="h-3.5 w-3.5 text-amber-400 fill-amber-400/30" />
                  </div>
                  <span className="text-base font-bold font-orbitron text-white">Pinned Message</span>
                </DialogTitle>
                <Button
                  variant="ghost" size="icon"
                  onClick={() => setSelectedPin(null)}
                  className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </DialogHeader>

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {selectedPin.question && (
                <div className="relative rounded-2xl border border-blue-500/15 bg-blue-500/5 overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-blue-400 to-cyan-500 rounded-l-2xl" />
                  <div className="pl-5 pr-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-3 w-3 text-blue-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 font-orbitron">You</span>
                      <span className="text-[10px] text-zinc-600">· {formatTimestamp(selectedPin.question.timestamp)}</span>
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                      {selectedPin.question.content}
                    </p>
                  </div>
                </div>
              )}

              {selectedPin.response && (
                <div className="relative rounded-2xl border border-violet-500/15 bg-violet-500/5 overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-violet-500 to-indigo-500 rounded-l-2xl" />
                  <div className="pl-5 pr-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-3 w-3 text-violet-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-violet-400 font-orbitron">AI</span>
                      <span className="text-[10px] text-zinc-600">· {formatTimestamp(selectedPin.response.timestamp)}</span>
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                      {selectedPin.response.content}
                    </p>
                  </div>
                </div>
              )}

              {selectedPin.soloMessage && !selectedPin.question && (
                <div className="relative rounded-2xl border border-violet-500/15 bg-violet-500/5 overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-violet-500 to-indigo-500 rounded-l-2xl" />
                  <div className="pl-5 pr-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-3 w-3 text-violet-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-violet-400 font-orbitron">AI</span>
                      <span className="text-[10px] text-zinc-600">· {formatTimestamp(selectedPin.soloMessage.timestamp)}</span>
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                      {selectedPin.soloMessage.content}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="px-5 py-3.5 flex justify-end gap-2">
              <Button
                variant="ghost" size="sm"
                onClick={() => handleCopy(selectedPin, selectedPin.question?.content || selectedPin.soloMessage?.content || '')}
                className="h-8 px-3 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/8 rounded-xl gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
              <Button
                variant="ghost" size="sm"
                onClick={() => { onUnpin(selectedPin.id); setSelectedPin(null); }}
                className="h-8 px-3 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl gap-1.5"
              >
                <PinOff className="h-3.5 w-3.5" />
                Unpin
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
