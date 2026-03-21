
'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Download, Expand, X, Loader2, AlertTriangle, RefreshCw, Info, Sparkles, MessageCircle, Settings, ImageIcon } from 'lucide-react';
import { GeneratedImage } from '@/types/mind-map';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface ImageGalleryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  images: GeneratedImage[];
  onDownload: (url: string, name: string) => void;
  onRegenerate: (subCategory: { name: string; description: string }) => void;
  onDelete: (id: string) => void;
}

export function ImageGalleryDialog({
  isOpen,
  onClose,
  images,
  onDownload,
  onRegenerate,
  onDelete,
}: ImageGalleryDialogProps) {
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState<string | null>(null);
  const [numColumns, setNumColumns] = useState(2);

  // Responsive column calculation
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1024) setNumColumns(4);
      else if (width >= 768) setNumColumns(3);
      else setNumColumns(2);
    };

    handleResize(); // Initial call
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Smart Masonry Distribution
  const masonryColumns = useMemo(() => {
    // Create columns array
    const columns: GeneratedImage[][] = Array.from({ length: numColumns }, () => []);
    const columnHeights = new Array(numColumns).fill(0);

    images.forEach((image) => {
      // Determine height weight based on aspect ratio
      const ratio = image.settings?.aspectRatio || '1:1';
      let heightWeight = 1;
      // 1:1 = 1
      if (ratio === '9:16') heightWeight = 1.77; // Taller
      if (ratio === '16:9') heightWeight = 0.56; // Shorter

      // Find the shortest column
      let shortestColumnIndex = 0;
      let minHeight = columnHeights[0];

      for (let i = 1; i < numColumns; i++) {
        if (columnHeights[i] < minHeight) {
          minHeight = columnHeights[i];
          shortestColumnIndex = i;
        }
      }

      // Add image to shortest column and update height
      columns[shortestColumnIndex].push(image);
      columnHeights[shortestColumnIndex] += heightWeight;
    });

    return columns;
  }, [images, numColumns]);

  const handleDownloadClick = (
    e: React.MouseEvent,
    image: GeneratedImage
  ) => {
    e.stopPropagation();
    if (image.status === 'completed') {
      onDownload(image.url, image.name);
    }
  };

  const handleRegenerateClick = (
    e: React.MouseEvent,
    image: GeneratedImage
  ) => {
    e.stopPropagation();
    onRegenerate({ name: image.name, description: image.description });
  };

  const handleDeleteClick = (
    e: React.MouseEvent,
    image: GeneratedImage
  ) => {
    e.stopPropagation();
    onDelete(image.id);
  };

  const GalleryItem = ({ image }: { image: GeneratedImage }) => {
    const aspectRatio = image.settings?.aspectRatio || '1:1';
    const aspectRatioClass =
      aspectRatio === '16:9' ? 'aspect-video' :
        aspectRatio === '9:16' ? 'aspect-[9/16]' :
          'aspect-square';

    return (
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-300 hover:ring-2 hover:ring-violet-500/50 mb-4 break-inside-avoid",
          aspectRatioClass,
          image.status === 'completed' && "cursor-pointer"
        )}
        onClick={() => image.status === 'completed' && setPreviewImage(image)}
      >
        <Image
          src={image.url}
          alt={image.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={cn(
            "object-cover transition-transform duration-500",
            image.status === 'completed' && "group-hover:scale-110",
            image.status !== 'completed' && "blur-sm opacity-60"
          )}
        />
        {image.status === 'generating' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        )}
        {image.status === 'failed' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-60 group-hover:opacity-100 transition-opacity" />

        <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-between items-end backdrop-blur-[2px]">
          <p className="text-white text-xs font-bold truncate pr-2 tracking-tight">
            {image.name}
          </p>
          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-1.5 rounded-full bg-zinc-950/80 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all border border-zinc-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInfoPanel(showInfoPanel === image.id ? null : image.id);
                    }}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-zinc-950/95 border-zinc-800 text-xs w-80 p-0 shadow-2xl backdrop-blur-md overflow-hidden rounded-xl">
                  <div className="flex flex-col">
                    {/* Header */}
                    <div className="bg-violet-500/10 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
                      <p className="font-bold text-violet-400 uppercase tracking-widest text-[10px]">Generation Intel</p>
                      <Sparkles className="h-3 w-3 text-violet-500" />
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Enhanced Prompt (Primary) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[9px] font-medium text-zinc-500 uppercase tracking-tight">
                          <Sparkles className="h-2.5 w-2.5 text-violet-400" />
                          <span>Enhanced Prompt</span>
                        </div>
                        <p className="text-zinc-200 leading-relaxed italic line-clamp-4 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                          {/* @ts-ignore - backward compatibility */}
                          "{image.settings?.enhancedPrompt || image.settings?.prompt || image.description}"
                        </p>
                      </div>

                      {/* Initial Prompt (Secondary) - Only if different */}
                      {(image.settings as any)?.initialPrompt && (image.settings as any)?.initialPrompt !== (image.settings as any)?.enhancedPrompt && (
                        <div className="space-y-1.5 opacity-80">
                          <div className="flex items-center gap-1.5 text-[9px] font-medium text-zinc-500 uppercase tracking-tight">
                            <MessageCircle className="h-2.5 w-2.5" />
                            <span>Initial Concept</span>
                          </div>
                          <p className="text-zinc-400 leading-relaxed line-clamp-2 text-[11px] px-1">
                            "{(image.settings as any).initialPrompt}"
                          </p>
                        </div>
                      )}

                      {/* Technical Specs / Tags */}
                      <div className="space-y-2 pt-1 border-t border-zinc-900">
                        <div className="flex items-center gap-1.5 text-[9px] font-medium text-zinc-500 uppercase tracking-tight">
                          <Settings className="h-2.5 w-2.5" />
                          <span>Parameters</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-[9px] bg-zinc-900/50 border-zinc-800 text-zinc-400 h-5 px-1.5 hover:bg-zinc-800 transition-colors">
                            {image.settings?.model || 'flux'}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] bg-zinc-900/50 border-zinc-800 text-zinc-400 h-5 px-1.5">
                            {image.settings?.style || 'cinematic'}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] bg-zinc-900/50 border-zinc-800 text-zinc-400 h-5 px-1.5 uppercase font-mono">
                            {image.settings?.aspectRatio || '1:1'}
                          </Badge>
                          {image.settings?.mood && image.settings.mood !== 'none' && (
                            <Badge variant="outline" className="text-[9px] bg-zinc-900/50 border-zinc-800 text-zinc-400 h-5 px-1.5">
                              {image.settings.mood}
                            </Badge>
                          )}
                          {image.settings?.composition && image.settings.composition !== 'none' && (
                            <Badge variant="outline" className="text-[9px] bg-zinc-900/50 border-zinc-800 text-zinc-400 h-5 px-1.5">
                              {image.settings.composition}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {(image.status === 'completed' || image.status === 'failed') && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-2 group-hover:translate-y-0 flex gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-zinc-950/80 border border-zinc-800 hover:bg-purple-500 hover:text-white transition-all rounded-full"
              onClick={(e) => handleRegenerateClick(e, image)}
              title="Regenerate"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            {image.status === 'completed' && (
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-zinc-950/80 border border-zinc-800 hover:bg-emerald-500 hover:text-white transition-all rounded-full"
                onClick={(e) => handleDownloadClick(e, image)}
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-zinc-950/80 border border-zinc-800 hover:bg-red-500 hover:text-white transition-all rounded-full"
              onClick={(e) => handleDeleteClick(e, image)}
              title="Delete"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </Card>
    );
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-4xl h-[80vh] flex flex-col glassmorphism"
          showCloseButton={false}
        >
          <DialogHeader className="flex-row justify-between items-center">
            <div className="space-y-1">
              <DialogTitle>Image Gallery</DialogTitle>
              <DialogDescription>
                Images generated for the current mind map.
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogHeader>
          <ScrollArea className="flex-grow">
            {images.length > 0 ? (
              <div className="flex gap-4 p-1">
                {masonryColumns.map((col, colIndex) => (
                  <div key={colIndex} className="flex-1 flex flex-col gap-4">
                    {col.map((image) => (
                      <GalleryItem key={image.id} image={image} />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full" />
                  <div className="relative w-28 h-28 rounded-[2rem] bg-gradient-to-br from-zinc-900/90 to-black flex items-center justify-center shadow-2xl border border-white/5 ring-1 ring-white/10 group-hover:ring-purple-500/50 transition-all duration-500">
                    <Sparkles className="h-10 w-10 text-zinc-600 absolute top-4 right-4 opacity-50" />
                    <ImageIcon className="h-12 w-12 text-zinc-400/80 drop-shadow-2xl" />
                  </div>
                </div>
                <div className="space-y-3 max-w-sm relative z-10 px-4">
                  <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500 tracking-tight font-orbitron uppercase">
                    Void Canvas
                  </h3>
                  <p className="text-[13px] text-zinc-400 leading-relaxed font-medium">
                    No visual artifacts discovered. Use the <strong className="text-purple-400 font-bold">Visual Insight Lab</strong> on any knowledge node to materialize your concepts into stunning AI-generated imagery.
                  </p>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
      >
        <DialogContent className="max-w-5xl w-[90vw] h-[90vh] p-0 border-0 glassmorphism">
          {previewImage && (
            <>
              <DialogTitle className="sr-only">{`Image Preview: ${previewImage.name}`}</DialogTitle>
              <DialogDescription className="sr-only">
                A larger view of the generated image for {previewImage.name}.
              </DialogDescription>
              <Image
                src={previewImage.url}
                alt={previewImage.name}
                fill
                sizes="90vw"
                className="object-contain"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
