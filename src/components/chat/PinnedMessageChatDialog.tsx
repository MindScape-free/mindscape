'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Pin, Bot, User, Send, Loader2, X, Brain } from 'lucide-react';
import { cn, formatText } from '@/lib/utils';
import { PinnedMessage } from '@/types/chat';
import { chatAction } from '@/app/actions';
import { MindMapData } from '@/types/mind-map';
import { CreateMindmapDialog } from './CreateMindmapDialog';
import { useAIConfig } from '@/contexts/ai-config-context';
import { useUser } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';

interface EphemeralMessage {
  role: 'user' | 'ai';
  content: string;
}

interface PinnedMessageChatDialogProps {
  pin: PinnedMessage | null;
  onClose: () => void;
  currentMap?: MindMapData | null;
  onMindMapGenerated?: (mapData: MindMapData) => void;
}

export function PinnedMessageChatDialog({ pin, onClose, currentMap, onMindMapGenerated }: PinnedMessageChatDialogProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<EphemeralMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createMindmapOpen, setCreateMindmapOpen] = useState(false);
  const [createMindmapContent, setCreateMindmapContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { config } = useAIConfig();
  const { user } = useUser();

  // Reset messages when a new pin is opened
  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [pin?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (messageToSend?: string) => {
    const content = (messageToSend || input).trim();
    if (!content || isLoading || !pin) return;

    setInput('');
    const userMsg: EphemeralMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Build history from ephemeral messages + pinned context
    const history: { role: 'user' | 'assistant'; content: string }[] = [];

    // Inject pinned context as the first exchange
    if (pin.question) {
      history.push({ role: 'user', content: pin.question.content });
    }
    if (pin.response) {
      history.push({ role: 'assistant', content: pin.response.content });
    } else if (pin.soloMessage) {
      history.push({ role: 'assistant', content: pin.soloMessage.content });
    }

    // Add ephemeral conversation so far
    messages.forEach(m => {
      history.push({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content });
    });

    const providerOptions = {
      provider: config.provider,
      apiKey: config.provider === 'pollinations' ? config.pollinationsApiKey : config.apiKey,
      model: config.pollinationsModel,
      userId: user?.uid,
    };

    const { response, error } = await chatAction(
      {
        question: content,
        topic: pin.question?.content?.substring(0, 100) || 'Pinned Message',
        history,
        persona: 'Teacher',
      },
      providerOptions
    );

    setIsLoading(false);

    const aiContent = error
      ? `Sorry, I encountered an error: ${error}`
      : response?.answer || 'No response received.';

    setMessages(prev => [...prev, { role: 'ai', content: aiContent }]);
  };

  if (!pin) return null;

  const pinnedQuestion = pin.question?.content;
  const pinnedResponse = pin.response?.content || pin.soloMessage?.content;

  return (
    <Dialog open={!!pin} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col glassmorphism border-white/10 rounded-3xl p-0 shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-white/10 shrink-0">
          <DialogTitle className="flex items-center gap-3 text-base font-bold font-orbitron">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Pin className="h-4 w-4 text-amber-400 fill-amber-400" />
            </div>
            <span className="text-white truncate">
              {pinnedQuestion?.substring(0, 60)}{(pinnedQuestion?.length || 0) > 60 ? '...' : ''}
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="flex flex-col gap-4">
            {/* Pinned context bubble */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Pin className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Pinned Context</span>
              </div>
              {pinnedQuestion && (
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3 w-3 text-blue-400" />
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{pinnedQuestion}</p>
                </div>
              )}
              {pinnedResponse && (
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{pinnedResponse}</p>
                </div>
              )}
              <button
                onClick={() => {
                  const content = pinnedResponse || pinnedQuestion || '';
                  setCreateMindmapContent(content);
                  setCreateMindmapOpen(true);
                }}
                className="flex items-center gap-2 w-full mt-3 p-2 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary">Create Mind Map</span>
              </button>
            </div>

            {/* Ephemeral messages */}
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn('flex items-start gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {msg.role === 'ai' && (
                    <Avatar className="h-7 w-7 border shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-secondary/40 border border-white/5 rounded-bl-none'
                    )}
                  >
                    {msg.role === 'ai' ? (
                      <span dangerouslySetInnerHTML={{ __html: formatText(msg.content) }} />
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <Avatar className="h-7 w-7 border shrink-0">
                      <AvatarFallback className="bg-secondary">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <div className="flex items-start gap-3">
                <Avatar className="h-7 w-7 border shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-secondary/40 border border-white/5 rounded-2xl rounded-bl-none px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="px-6 pb-5 pt-3 border-t border-white/10 shrink-0">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <Input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a follow-up question..."
              disabled={isLoading}
              className="bg-white/5 border-white/10 focus:border-primary/50 rounded-2xl focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-10 w-10 rounded-2xl bg-primary text-white flex-shrink-0"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </DialogContent>

      <CreateMindmapDialog
        open={createMindmapOpen}
        onOpenChange={setCreateMindmapOpen}
        content={createMindmapContent}
        currentMap={currentMap}
        onMindmapCreated={(mapData) => {
          if (onMindMapGenerated) {
            onMindMapGenerated(mapData);
          }
        }}
      />
    </Dialog>
  );
}
