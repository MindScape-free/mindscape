'use client';

import { useState } from 'react';
import { X, Globe, Youtube, FileText, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BlobPdfViewer } from './BlobPdfViewer';
import { parseSourceContent } from './SourceParser';
import { extractYoutubeId } from '@/lib/utils';
import { formatText } from '@/lib/utils';
import { MindMapData } from '@/types/mind-map';

interface SourceFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceFileContent: string | null;
  sourceFileType: string | null;
  originalPdfFileContent: string | null;
  mindMap?: MindMapData | null;
}

export function SourceFileModal({
  isOpen,
  onClose,
  sourceFileContent,
  sourceFileType,
  originalPdfFileContent,
  mindMap,
}: SourceFileModalProps) {
  if (!sourceFileContent && !sourceFileType) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="glassmorphism border-white/10 w-[95vw] sm:max-w-7xl h-[92vh] flex flex-col gap-0 rounded-[2rem] p-0 overflow-hidden outline-none shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <DialogHeader className="px-6 py-2 border-b border-white/10 shrink-0 bg-black/60 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2 font-orbitron tracking-wide whitespace-nowrap">
            {sourceFileType === 'website' && mindMap?.sourceUrl ? (
              <>
                <Globe className="h-5 w-5 text-blue-400" />
                <div className="flex items-center gap-2">
                  <span>Website Content</span>
                  <a
                    href={mindMap.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/20 text-blue-400 text-[10px] hover:bg-blue-500/30 transition-all font-bold"
                  >
                    Open Original <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </>
            ) : sourceFileType === 'image' ? (
              <><ImageIcon className="h-5 w-5 text-purple-400" /> Source Image</>
            ) : sourceFileType === 'youtube' ? (
              <><Youtube className="h-5 w-5 text-red-500" /> YouTube Video</>
            ) : sourceFileType === 'website' ? (
              <><Globe className="h-5 w-5 text-blue-400" /> Website Content</>
            ) : (
              <><FileText className="h-5 w-5 text-blue-400" /> Source Document</>
            )}
          </DialogTitle>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-all active:scale-95"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-2 pt-0 bg-black/5 custom-scrollbar flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col pt-0">
            {sourceFileType === 'image' && sourceFileContent ? (
              <div className="flex items-center justify-center flex-1 bg-black/20 rounded-xl overflow-hidden border border-white/5">
                <img
                  src={sourceFileContent}
                  alt="Source"
                  className="max-w-full max-h-full object-contain shadow-2xl"
                />
              </div>
            ) : sourceFileType === 'pdf' && originalPdfFileContent ? (
              <div className="flex-1 w-full rounded-xl overflow-hidden border border-white/10 shadow-inner bg-white/5">
                <BlobPdfViewer
                  dataUri={originalPdfFileContent}
                  className="border-none w-full h-full block bg-white"
                />
              </div>
            ) : sourceFileType === 'youtube' && sourceFileContent ? (
              <div className="flex-1 w-full rounded-xl overflow-hidden border border-white/10 shadow-inner bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYoutubeId(sourceFileContent)}`}
                  width="100%"
                  height="100%"
                  className="border-none w-full h-full block"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="YouTube Video Player"
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-6 pb-6">
                {parseSourceContent(sourceFileContent || '').map((source, idx) => (
                  <div 
                    key={idx} 
                    className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-sm hover:border-white/20 transition-all"
                  >
                    <div className="px-5 py-3 bg-white/10 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {source.type.toLowerCase().includes('youtube') ? (
                          <Youtube className="h-4 w-4 text-red-500" />
                        ) : source.type.toLowerCase().includes('website') ? (
                          <Globe className="h-4 w-4 text-blue-400" />
                        ) : (
                          <FileText className="h-4 w-4 text-purple-400" />
                        )}
                        <span className="text-xs font-bold font-orbitron tracking-wider text-zinc-300 uppercase">
                          {source.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-medium">Source #{idx + 1}</span>
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-white mb-4 leading-tight">{source.title}</h3>
                      <div
                        className="text-zinc-300 font-sans text-base leading-relaxed break-words prose prose-invert prose-sm max-w-none prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline"
                        dangerouslySetInnerHTML={{ __html: formatText(source.content || 'No content found.') }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
