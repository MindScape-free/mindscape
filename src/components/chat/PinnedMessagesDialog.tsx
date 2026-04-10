'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChatMessage } from '@/types/chat';
import { Pin, Copy, Check, PinOff, X, Bot, User, ChevronDown, ChevronUp } from 'lucide-react';
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

  const toggleExpand = (messageId: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleCopy = (msg: ChatMessage) => {
    onCopy(msg.content);
    setCopiedIds(prev => new Set(prev).add(msg.id));
    setTimeout(() => {
      setCopiedIds(prev => {
        const next = new Set(prev);
        next.delete(msg.id);
        return next;
      });
    }, 2000);
  };

  const getPreview = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const formatTimestamp = (timestamp: number | Date) => {
    try {
      const date = toDate(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col glassmorphism border-white/10 rounded-3xl p-0 shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-white/10 shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold font-orbitron tracking-wide">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Pin className="h-5 w-5 text-amber-400" />
            </div>
            <span className="text-white">Pinned Messages</span>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-black font-orbitron">
              {pinnedMessages.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {pinnedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 px-6">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <Pin className="h-10 w-10 text-zinc-600" />
              </div>
              <h3 className="text-lg font-bold text-zinc-400 mb-2">No Pinned Messages</h3>
              <p className="text-sm text-zinc-600 text-center max-w-xs">
                Pin important messages from your chat to access them quickly here.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full px-6 py-4">
              <div className="space-y-4">
                {pinnedMessages
                  .sort((a, b) => {
                    const dateA = toDate(a.timestamp).getTime();
                    const dateB = toDate(b.timestamp).getTime();
                    return dateB - dateA;
                  })
                  .map((msg, index) => {
                    const isExpanded = expandedMessages.has(msg.id);
                    const isCopied = copiedIds.has(msg.id);
                    const needsTruncation = msg.content.length > 200;

                    return (
                      <div
                        key={msg.id}
                        className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group"
                      >
                        <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-6 h-6 rounded-md flex items-center justify-center",
                              msg.role === 'ai' ? "bg-primary/20" : "bg-blue-500/20"
                            )}>
                              {msg.role === 'ai' ? (
                                <Bot className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <User className="h-3.5 w-3.5 text-blue-400" />
                              )}
                            </div>
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              msg.role === 'ai' ? "text-primary" : "text-blue-400"
                            )}>
                              {msg.role === 'ai' ? 'AI Assistant' : 'You'}
                            </span>
                            <span className="text-[10px] text-zinc-600">
                              {formatTimestamp(msg.timestamp)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(msg)}
                              className="h-7 px-2 text-zinc-500 hover:text-white hover:bg-white/10"
                            >
                              {isCopied ? (
                                <Check className="h-3.5 w-3.5 text-green-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onUnpin(msg.id)}
                              className="h-7 px-2 text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10"
                            >
                              <PinOff className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                            {isExpanded || !needsTruncation 
                              ? msg.content 
                              : getPreview(msg.content)}
                          </div>
                          
                          {needsTruncation && (
                            <button
                              onClick={() => toggleExpand(msg.id)}
                              className="mt-2 text-xs text-primary/70 hover:text-primary transition-colors flex items-center gap-1"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  Show more
                                </>
                              )}
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
