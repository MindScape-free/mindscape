'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Brain, Sparkles, Wand2, Zap, BookOpen, Lightbulb, Crown, Layers, Timer, Network, SparklesIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateMindMapAction } from '@/app/actions';
import { MindMapData } from '@/types/mind-map';
import { useAIConfig } from '@/contexts/ai-config-context';
import { useUser } from '@/firebase';
import { useActivity } from '@/contexts/activity-context';
import { useNotifications } from '@/contexts/notification-context';

interface CreateMindmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  userMessage?: string;
  onMindmapCreated?: (mapData: MindMapData) => void;
}

const PERSONAS = [
  { id: 'Teacher', label: 'Teacher', icon: BookOpen, color: 'from-blue-500/20 to-blue-600/10', textColor: 'text-blue-400' },
  { id: 'Concise', label: 'Concise', icon: Zap, color: 'from-amber-500/20 to-amber-600/10', textColor: 'text-amber-400' },
  { id: 'Creative', label: 'Creative', icon: Lightbulb, color: 'from-purple-500/20 to-purple-600/10', textColor: 'text-purple-400' },
  { id: 'Sage', label: 'Sage', icon: Crown, color: 'from-emerald-500/20 to-emerald-600/10', textColor: 'text-emerald-400' },
] as const;

const DEPTH_OPTIONS = [
  { id: 'low', label: 'Quick', icon: Timer, sublabel: '1-2 levels' },
  { id: 'medium', label: 'Balanced', icon: Layers, sublabel: '2-3 levels' },
  { id: 'deep', label: 'Deep Dive', icon: Network, sublabel: '3-4 levels' },
] as const;

export function CreateMindmapDialog({
  open,
  onOpenChange,
  content,
  userMessage,
  onMindmapCreated,
}: CreateMindmapDialogProps) {
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState<'low' | 'medium' | 'deep'>('medium');
  const [persona, setPersona] = useState<'Teacher' | 'Concise' | 'Creative' | 'Sage'>('Teacher');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasContext, setHasContext] = useState(false);

  const { config } = useAIConfig();
  const { user } = useUser();
  const { setStatus, setActiveTaskName } = useActivity();
  const { addNotification, updateNotification } = useNotifications();

  useEffect(() => {
    if (open && content) {
      deriveTopic(userMessage || content);
      const contextContent = userMessage 
        ? `User: ${userMessage}\n\nAI Response: ${content}`
        : content;
      setHasContext(contextContent.length > 50);
      setError(null);
      setIsLoading(false);
    }
  }, [open, content, userMessage]);

  const deriveTopic = (text: string) => {
    const clean = text.replace(/[*_`#>\[\]]/g, '').replace(/\s+/g, ' ').trim();
    const withoutPrefix = clean
      .replace(/^(tell me (about|more about)|explain|what (is|are|do you know about)|how (does|do|to)|give me (a|an)?|describe|define|summarize|write (a|an)?|create (a|an)?|generate (a|an)?)/i, '')
      .trim();
    const base = withoutPrefix || clean;
    if (base.length <= 60) {
      setTopic(base.charAt(0).toUpperCase() + base.slice(1).replace(/[?.!,]+$/, ''));
      return;
    }
    const truncated = base.substring(0, 60).replace(/\s+\S*$/, '').replace(/[?.!,]+$/, '');
    setTopic(truncated.charAt(0).toUpperCase() + truncated.slice(1));
  };

  const buildContext = () => {
    if (!userMessage && !content) return undefined;
    return userMessage 
      ? `User Question: ${userMessage}\n\nAI Response: ${content}`
      : content;
  };

  const handleCreate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic for the mind map');
      return;
    }

    setIsLoading(true);
    setError(null);

    setStatus('generating');
    setActiveTaskName(topic);

    const notificationId = addNotification({
      message: `Creating mind map: ${topic}`,
      type: 'loading',
      details: hasContext ? 'Enhanced with AI expansion' : `Depth: ${depth} | Persona: ${persona}`,
    });

    try {
      const context = buildContext();

      const result = await generateMindMapAction({
        topic: topic.trim(),
        depth,
        persona,
        capability: 'fast',
        context,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      const mapData = result.data as MindMapData;
      
      const nodeCount = mapData.nodeCount || mapData.categoriesCount || 
        (mapData.mode === 'single' ? mapData.subTopics?.reduce((acc, st) => 
          acc + 1 + (st.categories?.reduce((cAcc, c) => cAcc + 1 + (c.subCategories?.length || 0), 0) || 0), 0) : 0);
      
      updateNotification(notificationId, {
        message: `Mind map created: ${topic}`,
        type: 'success',
        details: nodeCount ? `${nodeCount} nodes generated` : 'Generation complete',
        link: `/canvas?map=${mapData.id}`,
      });

      if (onMindmapCreated) {
        onMindmapCreated(mapData);
      }
      
      setStatus('idle');
      setActiveTaskName(null);
      onOpenChange(false);
    } catch (err: any) {
      updateNotification(notificationId, {
        message: `Failed to create: ${topic}`,
        type: 'error',
        details: err.message || 'An unexpected error occurred',
      });
      setError(err.message || 'Failed to create mind map');
      setStatus('idle');
      setActiveTaskName(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col glassmorphism border-white/10 rounded-3xl p-0 shadow-2xl">
        <DialogHeader className="px-6 pt-5 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-white text-lg font-bold">Create Mind Map</span>
              <p className="text-xs text-zinc-400 font-normal">Transform this conversation into a visual mind map</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="space-y-5">
            {hasContext && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
                <SparklesIcon className="h-3.5 w-3.5 text-primary animate-pulse" />
                <span className="text-xs text-primary font-medium">Enhanced with AI expansion</span>
              </div>
            )}

            <div className="space-y-2.5">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Topic</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter topic for mind map..."
                className="bg-white/[0.04] border-white/10 focus:border-primary/50 rounded-xl h-12 text-sm placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-zinc-500" />
                <Label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Depth</Label>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {DEPTH_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDepth(option.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 relative overflow-hidden",
                      depth === option.id
                        ? "border-primary bg-primary/15 shadow-[0_0_25px_-5px_rgba(var(--primary),0.25)]"
                        : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                    )}
                  >
                    <option.icon className={cn("h-5 w-5 transition-colors", depth === option.id ? "text-primary" : "text-zinc-500")} />
                    <span className={cn("text-sm font-bold transition-colors", depth === option.id ? "text-white" : "text-zinc-400")}>
                      {option.label}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">{option.sublabel}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
                <Label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Persona</Label>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPersona(p.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 relative overflow-hidden",
                      persona === p.id
                        ? "border-primary bg-primary/15 shadow-[0_0_25px_-5px_rgba(var(--primary),0.25)]"
                        : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                      persona === p.id 
                        ? `bg-gradient-to-br ${p.color} border border-white/10` 
                        : "bg-white/[0.04]"
                    )}>
                      <p.icon className={cn("h-4 w-4", persona === p.id ? p.textColor : "text-zinc-500")} />
                    </div>
                    <span className={cn("text-xs font-bold transition-colors", persona === p.id ? "text-white" : "text-zinc-400")}>
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-5 pt-3 shrink-0 border-t border-white/[0.06] bg-gradient-to-t from-black/30 to-transparent">
          <Button
            onClick={handleCreate}
            disabled={isLoading || !topic.trim()}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-lg shadow-primary/20 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span>Creating Mind Map...</span>
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                <span>Generate Mind Map</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
