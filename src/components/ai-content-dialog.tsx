
'use client';

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MindMapData } from '@/types/mind-map';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import { FileText, Copy as CopyIcon, CheckCircle2, Download, Loader2, X, FileMinus, GitBranch, Sparkles } from 'lucide-react';


/**
 * Props for the AiContentDialog component.
 * @interface AiContentDialogProps
 * @property {boolean} isOpen - Whether the dialog is open.
 * @property {() => void} onClose - Function to call when the dialog should be closed.
 * @property {MindMapData} mindMap - The mind map data to display.
 */
interface AiContentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mindMap: MindMapData;
  isGlobalBusy?: boolean;
}

/**
 * A dialog component that displays the raw AI-generated content of a mind map
 * in a structured, readable format. It also provides an option to download the content as a PDF.
 * @param {AiContentDialogProps} props - The props for the component.
 * @returns {JSX.Element | null} The dialog component or null if no mind map data is provided.
 */
export function AiContentDialog({
  isOpen,
  onClose,
  mindMap,
  isGlobalBusy = false,
}: AiContentDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopyingMarkdown, setIsCopyingMarkdown] = useState(false);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);

    try {
      const doc = new jsPDF();
      let y = 20;

      // Title
      doc.setFontSize(22);
      doc.setTextColor(124, 58, 237); // Purple
      doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(mindMap.topic, 170);
      doc.text(titleLines, 20, y);
      y += (titleLines.length * 10);

      // Header info
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.setFont("helvetica", "normal");
      doc.text(`MindScape Knowledge Package • Generated on ${new Date().toLocaleDateString()}`, 20, y);
      y += 15;

      // Executive Summary
      doc.setFontSize(14);
      doc.setTextColor(124, 58, 237);
      doc.text("Executive Summary", 20, y);
      y += 8;
      doc.setFontSize(11);
      doc.setTextColor(60);
      const summaryText = mindMap.summary || (mindMap.mode === 'compare' ? (mindMap.compareData.root.description || "Comparison analysis of topics.") : "Comprehensive knowledge structure and detailed exploration.");
      const summaryLines = doc.splitTextToSize(summaryText, 170);
      doc.text(summaryLines, 20, y);
      y += (summaryLines.length * 6) + 15;

      // Detailed Content
      doc.setFontSize(18);
      doc.setTextColor(0);
      doc.text("Detailed Knowledge Structure", 20, y);
      y += 10;

      if (mindMap.mode === 'compare') {
        const cd = mindMap.compareData;

        // Unity Nexus
        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129); // Emerald
        doc.text("Unity Nexus: Shared Core Principles", 20, y);
        y += 8;
        (cd.unityNexus || []).forEach((node: any) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFontSize(11);
          doc.setTextColor(0);
          doc.setFont("helvetica", "bold");
          doc.text(`• ${node.title}`, 20, y);
          y += 5;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80);
          const desc = doc.splitTextToSize(node.description || "", 160);
          doc.text(desc, 25, y);
          y += (desc.length * 5) + 8;
        });

        // Dimensions
        if (y > 250) { doc.addPage(); y = 20; }
        y += 10;
        doc.setFontSize(14);
        doc.setTextColor(124, 58, 237);
        doc.text("Comparison Dimensions", 20, y);
        y += 8;

        (cd.dimensions || []).forEach((dim: any) => {
          if (y > 250) { doc.addPage(); y = 20; }
          doc.setFontSize(12);
          doc.setTextColor(50);
          doc.setFont("helvetica", "bold");
          doc.text(dim.name, 20, y);
          y += 7;

          // Topic A Insight
          doc.setFontSize(10);
          doc.setTextColor(220, 38, 38); // Red
          doc.text("Topic A Insight:", 25, y);
          y += 5;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80);
          const insightA = doc.splitTextToSize(dim.topicAInsight || "", 150);
          doc.text(insightA, 30, y);
          y += (insightA.length * 5) + 3;

          // Topic B Insight
          doc.setFont("helvetica", "bold");
          doc.setTextColor(37, 99, 235); // Blue
          doc.text("Topic B Insight:", 25, y);
          y += 5;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80);
          const insightB = doc.splitTextToSize(dim.topicBInsight || "", 150);
          doc.text(insightB, 30, y);
          y += (insightB.length * 5) + 3;

          // Synthesis
          doc.setFont("helvetica", "italic");
          doc.setTextColor(124, 58, 237);
          const synthesis = doc.splitTextToSize(`Synthesis: ${dim.neutralSynthesis || ""}`, 150);
          doc.text(synthesis, 30, y);
          y += (synthesis.length * 5) + 8;
        });

        // Synthesis Horizon
        if (y > 240) { doc.addPage(); y = 20; }
        y += 5;
        doc.setFontSize(14);
        doc.setTextColor(245, 158, 11); // Amber
        doc.setFont("helvetica", "bold");
        doc.text("Synthesis Horizon", 20, y);
        y += 10;

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text("Expert Verdict:", 20, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        const verdict = doc.splitTextToSize(cd.synthesisHorizon?.expertVerdict || "", 170);
        doc.text(verdict, 20, y);
        y += (verdict.length * 5) + 8;

        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text("Future Evolution:", 20, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        const evolution = doc.splitTextToSize(cd.synthesisHorizon?.futureEvolution || "", 170);
        doc.text(evolution, 20, y);
        y += (evolution.length * 5) + 15;
      } else if (mindMap.subTopics) {
        mindMap.subTopics.forEach((st: any, i: number) => {
          if (y > 250) { doc.addPage(); y = 20; }
          doc.setFontSize(16);
          doc.setTextColor(124, 58, 237);
          doc.setFont("helvetica", "bold");
          doc.text(`${i + 1}. ${st.name}`, 20, y);
          y += 10;

          (st.categories || []).forEach((cat: any) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFontSize(13);
            doc.setTextColor(50);
            doc.setFont("helvetica", "bold");
            doc.text(cat.name, 25, y);
            y += 7;

            (cat.subCategories || []).forEach((sc: any) => {
              if (y > 270) { doc.addPage(); y = 20; }
              doc.setFontSize(11);
              doc.setTextColor(0);
              doc.setFont("helvetica", "bold");
              doc.text(`• ${sc.name}`, 30, y);
              y += 5;
              doc.setFont("helvetica", "normal");
              doc.setTextColor(80);
              const desc = doc.splitTextToSize(sc.description || "", 150);
              doc.text(desc, 35, y);
              y += (desc.length * 5) + 6;
            });
            y += 4;
          });
          y += 10;
        });
      }

      doc.setProperties({
        title: `MindScape - ${mindMap.topic}`,
        subject: 'AI Generated Mind Map Knowledge Package',
        author: 'MindScape AI',
        creator: 'MindScape'
      });

      doc.save(`${mindMap.topic.replace(/\s+/g, '_')}_Knowledge_Pack.pdf`);

      toast({
        title: 'Export Successful',
        description: 'Your knowledge package has been saved as a structured PDF.',
      });
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'An error occurred while generating the PDF.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const copyToMarkdown = () => {
    setIsCopyingMarkdown(true);
    let md = `# ${mindMap.topic}\n\n`;

    if (mindMap.mode === 'compare') {
      const { compareData } = mindMap;
      md += `> ${compareData.root.description || 'Comparison Analysis'}\n\n`;

      md += `## Unity Nexus: Shared Core Principles\n\n`;
      (compareData.unityNexus || []).forEach(node => {
        md += `### ${node.title}\n${node.description || ''}\n\n`;
      });

      md += `## Comparison Dimensions\n\n`;
      (compareData.dimensions || []).forEach(dim => {
        md += `### ${dim.name}\n`;
        md += `- **Topic A Insight**: ${dim.topicAInsight}\n`;
        md += `- **Topic B Insight**: ${dim.topicBInsight}\n`;
        md += `- **Synthesis**: ${dim.neutralSynthesis}\n\n`;
      });

      md += `## Synthesis Horizon\n\n`;
      md += `### Expert Verdict\n${compareData.synthesisHorizon?.expertVerdict || ''}\n\n`;
      md += `### Future Evolution\n${compareData.synthesisHorizon?.futureEvolution || ''}\n\n`;

    } else if (mindMap.subTopics) {
      mindMap.subTopics.forEach(st => {
        md += `## ${st.name}\n\n`;
        (st.categories || []).forEach(cat => {
          md += `### ${cat.name}\n\n`;
          (cat.subCategories || []).forEach(sc => {
            md += `- **${sc.name}**: ${sc.description}\n`;
          });
          md += `\n`;
        });
      });
    }

    navigator.clipboard.writeText(md);
    toast({
      title: 'Copied to Clipboard',
      description: 'Knowledge package copied as Markdown.',
    });
    setTimeout(() => setIsCopyingMarkdown(false), 2000);
  };

  if (!mindMap) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl h-[90vh] flex flex-col glassmorphism" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <DialogTitle className="text-2xl">Knowledge Package</DialogTitle>
            <DialogDescription>
              High-fidelity {mindMap.mode === 'compare' ? 'comparison analysis' : 'knowledge structure'} for "{mindMap.topic}".
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={copyToMarkdown} disabled={isCopyingMarkdown || isGlobalBusy} variant="outline" size="sm" className="hidden md:flex gap-2 rounded-xl">
              {isCopyingMarkdown ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <CopyIcon className="h-4 w-4" />}
              {isCopyingMarkdown ? 'Copied' : 'Copy MD'}
            </Button>
            <Button onClick={handleDownloadPDF} disabled={isDownloading || isGlobalBusy} variant="outline" size="sm" className="hidden md:flex gap-2 rounded-xl">
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isDownloading ? 'Processing...' : 'Export PDF'}
            </Button>
            <Button onClick={handleDownloadPDF} disabled={isDownloading || isGlobalBusy} variant="outline" size="icon" className="md:hidden">
              <Download className="h-4 w-4" />
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-grow -mx-6 px-6 bg-zinc-950/20">
          <div ref={contentRef} className="space-y-6 py-8">
            <div className="mb-10 text-center">
              <h1 className="text-4xl font-black mb-2 text-white">{mindMap.topic}</h1>
              <p className="text-zinc-500 font-medium">
                {mindMap.mode === 'compare' ? 'Side-by-Side Comparison' : 'Comprehensive Knowledge Pack'} • Generated by MindScape AI
              </p>
            </div>

            {mindMap.mode === 'compare' ? (
              <div className="space-y-12">
                {/* Unity Nexus */}
                <div>
                  <h2 className="text-2xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6" /> Unity Nexus: Shared Core Principles
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(mindMap.compareData.unityNexus || []).map((node, i) => (
                      <Card key={i} className="bg-zinc-900/50 border-white/5 h-full">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base text-white">{node.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-zinc-400 leading-relaxed">
                          {node.description}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Dimensions */}
                <div>
                  <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
                    <GitBranch className="h-6 w-6" /> Comparison Dimensions
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {(mindMap.compareData.dimensions || []).map((dim, i) => (
                      <Card key={i} className="bg-zinc-900/50 border-white/5 overflow-hidden">
                        <CardHeader className="bg-white/5 border-b border-white/5 py-4">
                          <CardTitle className="text-lg text-white uppercase tracking-tighter">{dim.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <span className="text-[10px] font-black text-red-500/80 uppercase tracking-widest block">Topic A Insight</span>
                              <p className="text-sm text-zinc-300 leading-relaxed">{dim.topicAInsight}</p>
                            </div>
                            <div className="space-y-2">
                              <span className="text-[10px] font-black text-blue-500/80 uppercase tracking-widest block">Topic B Insight</span>
                              <p className="text-sm text-zinc-300 leading-relaxed">{dim.topicBInsight}</p>
                            </div>
                          </div>
                          <div className="pt-4 border-t border-white/5">
                            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                              <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">Architect's Synthesis</span>
                              <p className="text-[11px] italic text-zinc-400">{dim.neutralSynthesis}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Synthesis Horizon */}
                <Card className="bg-zinc-900/50 border-white/10 overflow-hidden rounded-[2rem]">
                  <CardHeader className="bg-amber-500/5 border-b border-amber-500/10">
                    <CardTitle className="text-xl text-amber-500 font-bold flex items-center gap-2">
                      <Sparkles className="h-5 w-5" /> Synthesis Horizon
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Expert Verdict</h4>
                      <p className="text-zinc-200 text-lg font-medium italic leading-relaxed">
                        "{mindMap.compareData.synthesisHorizon?.expertVerdict}"
                      </p>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Future Evolution</h4>
                      <p className="text-zinc-400 text-base leading-relaxed">
                        {mindMap.compareData.synthesisHorizon?.futureEvolution}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : mindMap.subTopics ? (
              mindMap.subTopics.map((subTopic, subIndex) => (
                <Card key={`sub-${subIndex}`} className="bg-zinc-900/50 border-white/5 shadow-2xl overflow-hidden rounded-[2rem] break-inside-avoid">
                  <CardHeader>
                    <CardTitle className="text-xl">{subTopic.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pl-10">
                    {subTopic.categories?.map((category, catIndex) => (
                      <div key={`cat-${catIndex}`} className="break-inside-avoid">
                        <h4 className="font-semibold text-lg text-primary">
                          {category.name}
                        </h4>
                        <ul className="list-disc pl-6 mt-2 space-y-2 text-muted-foreground">
                          {category.subCategories?.map(
                            (subCategory, subCatIndex) => (
                              <li key={`subcat-${subCatIndex}`}>
                                <strong className="text-foreground">
                                  {subCategory.name}:
                                </strong>{' '}
                                {subCategory.description}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
