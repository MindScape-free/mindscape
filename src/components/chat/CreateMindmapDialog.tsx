'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Brain, GitBranch, Sparkles, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateMindMapAction } from '@/app/actions';
import { MindMapData } from '@/types/mind-map';
import { useAIConfig } from '@/contexts/ai-config-context';
import { useUser } from '@/firebase';

interface ExtractedTopic {
  name: string;
  selected: boolean;
}

interface CreateMindmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  userMessage?: string;
  currentMap?: MindMapData | null;
  onMindmapCreated?: (mapData: MindMapData) => void;
}

export function CreateMindmapDialog({
  open,
  onOpenChange,
  content,
  userMessage,
  currentMap,
  onMindmapCreated,
}: CreateMindmapDialogProps) {
  const [topic, setTopic] = useState('');
  const [extractedTopics, setExtractedTopics] = useState<ExtractedTopic[]>([]);
  const [mapType, setMapType] = useState<'new' | 'sub'>('new');
  const [parentNodeId, setParentNodeId] = useState<string>('');
  const [depth, setDepth] = useState<'low' | 'medium' | 'deep'>('low');
  const [persona, setPersona] = useState<'Teacher' | 'Concise' | 'Creative' | 'Sage'>('Teacher');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { config } = useAIConfig();
  const { user } = useUser();

  useEffect(() => {
    if (open && content) {
      deriveTopic(userMessage || content);
      setError(null);
    }
  }, [open, content, userMessage]);

  const deriveTopic = (text: string) => {
    // Strip markdown, trim, collapse whitespace
    const clean = text.replace(/[*_`#>\[\]]/g, '').replace(/\s+/g, ' ').trim();

    // Remove common question prefixes so the topic reads as a noun phrase
    const withoutPrefix = clean
      .replace(/^(tell me (about|more about)|explain|what (is|are|do you know about)|how (does|do|to)|give me (a|an)?|describe|define|summarize|write (a|an)?|create (a|an)?|generate (a|an)?)/i, '')
      .trim();

    const base = withoutPrefix || clean;

    // If short enough already, use as-is
    if (base.length <= 60) {
      setTopic(base.charAt(0).toUpperCase() + base.slice(1).replace(/[?.!,]+$/, ''));
      return;
    }

    // Truncate at last word boundary before 60 chars
    const truncated = base.substring(0, 60).replace(/\s+\S*$/, '').replace(/[?.!,]+$/, '');
    setTopic(truncated.charAt(0).toUpperCase() + truncated.slice(1));
  };

  const handleToggleTopic = (index: number) => {
    setExtractedTopics(prev => prev.map((t, i) => 
      i === index ? { ...t, selected: !t.selected } : t
    ));
  };

  const handleCreate = async () => {
    const selectedTopics = extractedTopics.filter(t => t.selected).map(t => t.name);
    const topicsToCreate = selectedTopics.length > 0 ? selectedTopics : [topic];

    if (!topicsToCreate[0]?.trim()) {
      setError('Please enter a topic for the mind map');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const firstTopic = topicsToCreate[0];
      let result: MindMapData | null = null;

      const apiKey = config.provider === 'pollinations' 
        ? config.pollinationsApiKey 
        : config.apiKey;

      if (mapType === 'sub' && currentMap) {
        result = await createSubMap(firstTopic);
      } else {
        result = await createNewMap(firstTopic, apiKey);
      }

      if (result && onMindmapCreated) {
        onMindmapCreated(result);
      }
      
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create mind map');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewMap = async (topicName: string, apiKey?: string) => {
    const result = await generateMindMapAction({
      topic: topicName,
      depth,
      persona,
      capability: 'fast',
    });

    if (result.error) {
      throw new Error(result.error);
    }

    return result.data as MindMapData;
  };

  const createSubMap = async (topicName: string) => {
    if (!currentMap) return null;
    
    const parentTopic = currentMap.topic;
    
    const result = await generateMindMapAction({
      topic: topicName,
      parentTopic,
      depth,
      persona,
      capability: 'fast',
    });

    if (result.error) {
      throw new Error(result.error);
    }

    return result.data as MindMapData;
  };

  const canCreateSubMap = mapType === 'sub' && !!currentMap;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col glassmorphism border-white/10 rounded-3xl p-0 shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-white/10 shrink-0">
          <DialogTitle className="flex items-center gap-3 text-base font-bold font-orbitron">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <span className="text-white">Create Mind Map</span>
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs sr-only">
            Create a new mind map from the AI response content
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-5">
            {/* Map Type Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMapType('new')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    mapType === 'new'
                      ? "border-primary bg-primary/10"
                      : "border-white/10 hover:border-white/30"
                  )}
                >
                  <Sparkles className={cn("h-5 w-5", mapType === 'new' ? "text-primary" : "text-zinc-500")} />
                  <span className={cn("text-sm font-medium", mapType === 'new' ? "text-white" : "text-zinc-400")}>
                    New Mind Map
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapType('sub')}
                  disabled={!currentMap}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    !currentMap && "opacity-50 cursor-not-allowed",
                    mapType === 'sub' && currentMap
                      ? "border-primary bg-primary/10"
                      : "border-white/10 hover:border-white/30"
                  )}
                >
                  <GitBranch className={cn("h-5 w-5", mapType === 'sub' && currentMap ? "text-primary" : "text-zinc-500")} />
                  <span className={cn("text-sm font-medium", mapType === 'sub' && currentMap ? "text-white" : "text-zinc-400")}>
                    Sub Map
                  </span>
                </button>
              </div>
              {mapType === 'sub' && !currentMap && (
                <p className="text-xs text-amber-400">No active mind map. Create a new one first.</p>
              )}
            </div>

            {/* Topic Input */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Topic</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter topic for mind map..."
                className="bg-white/5 border-white/10 focus:border-primary/50 rounded-xl"
              />
              {extractedTopics.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-xs text-zinc-500">Or select specific topics:</p>
                  <div className="space-y-2">
                    {extractedTopics.map((t, i) => (
                      <div
                        key={i}
                        onClick={() => handleToggleTopic(i)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                          t.selected
                            ? "border-primary bg-primary/10"
                            : "border-white/10 hover:border-white/30"
                        )}
                      >
                        <Checkbox checked={t.selected} />
                        <span className={cn("text-sm", t.selected ? "text-white" : "text-zinc-400")}>
                          {t.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Depth Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Depth</Label>
              <div className="flex gap-2">
                {(['low', 'medium', 'deep'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDepth(d)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all capitalize",
                      depth === d
                        ? "bg-primary text-white"
                        : "bg-white/5 text-zinc-400 hover:bg-white/10"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Persona Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Persona</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['Teacher', 'Concise', 'Creative', 'Sage'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPersona(p)}
                    className={cn(
                      "py-2 px-3 rounded-lg text-sm font-medium transition-all capitalize",
                      persona === p
                        ? "bg-primary text-white"
                        : "bg-white/5 text-zinc-400 hover:bg-white/10"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 pb-5 pt-3 border-t border-white/10 shrink-0 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isLoading || !topic.trim()}
            className="rounded-xl bg-primary text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Create Mind Map
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}