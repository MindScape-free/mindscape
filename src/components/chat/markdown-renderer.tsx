'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import mermaid from 'mermaid';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Play, Check, Code, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { remarkEntityLink } from './remark-entity-link';
import { QuizCard } from './quiz-card';
import { motion } from 'framer-motion';

// Initialize Mermaid once globally
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: '#8b5cf6',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#a78bfa',
      lineColor: '#6366f1',
      secondaryColor: '#1e1b4b',
      tertiaryColor: '#0f172a',
      mainBkg: '#18181b',
      nodeBorder: '#3f3f46',
      clusterBkg: '#09090b',
      clusterBorder: '#27272a',
      defaultLinkColor: '#6366f1',
      titleColor: '#ffffff',
      edgeLabelBackground: '#27272a',
      nodeRadius: '12px',
      fontSize: '14px',
    },
    securityLevel: 'loose',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      padding: 30,
      nodeSpacing: 60,
      rankSpacing: 80,
    },
    suppressErrorRendering: true,
  });
}

/**
 * Mermaid Diagram Block
 */
function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = React.useMemo(() => `mermaid-${crypto.randomUUID()}`, []);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!ref.current || !code) return;
      setIsRendering(true);

      // Basic sanitization
      let cleanCode = code.trim();
      if (cleanCode.startsWith('```mermaid')) cleanCode = cleanCode.replace(/^```mermaid\n?/, '').replace(/\n?```$/, '');
      if (cleanCode.startsWith('```')) cleanCode = cleanCode.replace(/^```\n?/, '').replace(/\n?```$/, '');

      // Smart Quoting: Proactively wrap unquoted labels in quotes
      // This fixes errors like A[Some + Text] by turning them into A["Some + Text"]
      cleanCode = cleanCode.replace(/(\w+)(\[|\(|\{\{|\{|\(\(|\>)([^"'][^\]\)\}]*)([\]\)\}]+\>|\]|\)\)|\)|\}\}|\})/g, (match, id, open, content, close) => {
        const trimmed = content.trim();
        if (!trimmed) return match;

        // Escape internal double quotes and wrap in double quotes
        const escaped = trimmed.replace(/"/g, '#quot;');

        if (/[:+&?|]/.test(escaped) || escaped.includes(' ') || escaped.includes('#quot;')) {
          return `${id}${open}"${escaped}"${close}`;
        }
        return match;
      });

      try {
        const { svg } = await mermaid.render(id, cleanCode);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError('Mermaid Syntax Error: Check diagram code for missing quotes or invalid structure.');
      } finally {
        setIsRendering(false);
      }
    };

    renderDiagram();
  }, [code, id]);

  const [showSource, setShowSource] = useState(false);

  if (error) {
    return (
      <div className="p-5 my-6 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Code className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-xs font-bold text-red-400 uppercase tracking-widest">Syntax Alert</div>
        </div>
        <div className="text-[11px] text-red-300 font-mono leading-relaxed">{error}</div>
        <button
          onClick={() => setShowSource(!showSource)}
          className="text-[10px] text-zinc-500 hover:text-zinc-300 font-bold uppercase tracking-wider underline underline-offset-4"
        >
          {showSource ? 'Hide Blueprint' : 'Examine Blueprint'}
        </button>
        {showSource && (
          <pre className="p-4 bg-black/60 rounded-xl text-[10px] text-zinc-400 overflow-x-auto border border-white/5 font-mono">
            {code}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="my-10 flex flex-col items-center group/mermaid w-full">
      <style jsx global>{`
        .mermaid-svg .edgeLabel {
          background-color: #18181b !important;
          color: #a1a1aa !important;
          font-weight: 700 !important;
          padding: 4px 8px !important;
          border-radius: 6px !important;
          border: 1px solid rgba(255,255,255,0.05) !important;
        }
        .mermaid-svg .edgeLabel rect {
          fill: #18181b !important;
          fill-opacity: 0.95 !important;
          stroke: #3f3f46 !important;
          rx: 6px !important;
        }
        .mermaid-svg .node rect, 
        .mermaid-svg .node circle, 
        .mermaid-svg .node ellipse, 
        .mermaid-svg .node polygon, 
        .mermaid-svg .node path {
          stroke-width: 2px !important;
          filter: drop-shadow(0 6px 12px rgba(0,0,0,0.3)) !important;
          transition: all 0.3s ease !important;
        }
        .mermaid-svg .node:hover rect,
        .mermaid-svg .node:hover circle {
          stroke: #8b5cf6 !important;
          fill: #2e1065 !important;
        }
        .mermaid-svg .label {
          color: #ffffff !important;
          font-weight: 600 !important;
          font-family: 'Inter', sans-serif !important;
        }
        .mermaid-svg .flowchart-link {
          stroke-width: 2px !important;
          stroke: #4338ca !important;
          opacity: 0.6 !important;
          transition: all 0.3s ease !important;
        }
        .mermaid-svg:hover .flowchart-link {
          opacity: 1 !important;
          stroke: #6366f1 !important;
        }
        .mermaid-svg svg {
          max-width: 100% !important;
          height: auto !important;
        }
      `}</style>
      <div className="w-full bg-[#09090b]/80 backdrop-blur-2xl p-6 sm:p-10 rounded-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-h-[200px] flex items-center justify-center relative overflow-hidden">
        {/* Animated background highlights */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-blue-500/5 blur-[120px] pointer-events-none" />

        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xl z-20">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-2 border-primary/20 rounded-full" />
                <div className="absolute inset-0 w-12 h-12 border-t-2 border-primary rounded-full animate-spin" />
              </div>
              <div className="text-[11px] font-black text-primary uppercase tracking-[0.3em] animate-pulse">Architecting Knowledge...</div>
            </div>
          </div>
        )}

        <div
          ref={ref}
          className={cn(
            "mermaid-svg w-full overflow-x-auto flex justify-center transition-all duration-1000 ease-out py-4",
            isRendering ? "opacity-0 scale-95 blur-xl" : "opacity-100 scale-100 blur-0"
          )}
          style={{
            filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.4))',
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      <div className="mt-5 flex items-center gap-4 opacity-0 group-hover/mermaid:opacity-100 transition-all duration-500 transform translate-y-2 group-hover/mermaid:translate-y-0">
        <button
          onClick={() => setShowSource(!showSource)}
          className="flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-[0.2em] px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all shadow-lg"
        >
          <Code className="w-3 h-3" />
          {showSource ? 'Hide Structural Blueprint' : 'View Structural Blueprint'}
        </button>
      </div>

      <AnimatePresence>
        {showSource && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="w-full mt-6 overflow-hidden"
          >
            <div className="p-6 bg-zinc-950/90 backdrop-blur-3xl rounded-[24px] border border-white/10 font-mono shadow-inner">
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="ml-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Source Code</span>
              </div>
              <pre className="text-[12px] text-zinc-400 overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
                {code}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * YouTube Embed Component
 */
function YouTubeEmbed({ url }: { url: string }) {
  const YT_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/;
  const match = url.match(YT_REGEX);
  const id = match ? match[1] : null;

  // Strict domain whitelist
  const isAllowed = url.includes('youtube.com') || url.includes('youtu.be');

  if (!id || !isAllowed) return <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{url}</a>;

  return (
    <div className="my-6 rounded-[20px] overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video">
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

/**
 * Enhanced Code Block with Copy/Run
 */
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleRun = useCallback(() => {
    toast({
      title: "Execution Coming Soon",
      description: `${language || 'Code'} runner is being safely sandboxed!`,
    });
  }, [language]);

  if (language === 'mermaid') {
    return <MermaidBlock code={code} />;
  }

  return (
    <div className="block w-full relative my-6 group rounded-[20px] overflow-hidden border border-white/10 bg-[#121212] shadow-2xl not-prose">
      <div className="flex items-center justify-between px-5 py-3 bg-white/[0.03] border-b border-white/5">
        <div className="flex items-center gap-2">
          <Code className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[11px] font-bold tracking-tight text-zinc-300 capitalize">{language || 'text'}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="p-1.5 text-zinc-500 hover:text-white transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleRun}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition-all active:scale-95"
          >
            <Play className="w-3 h-3 fill-current" />
            Run
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1.5rem',
          background: 'transparent',
          fontSize: '13px',
          lineHeight: '1.6',
        }}
      >
        {code.trim()}
      </SyntaxHighlighter>
    </div>
  );
}

/**
 * Premium Table Component
 */
function TableBlock({ children, node }: any) {
  const tableRef = useRef<HTMLDivElement>(null);

  const handleCopyMarkdown = useCallback(() => {
    // Basic markdown table reconstructor
    // This is a bit simplified, but works for standard tables
    const table = tableRef.current?.querySelector('table');
    if (!table) return;

    let markdown = '';
    const rows = Array.from(table.rows);
    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.cells);
      const cellTexts = cells.map(cell => cell.innerText.trim());
      markdown += `| ${cellTexts.join(' | ')} |\n`;

      if (rowIndex === 0) {
        markdown += `| ${cells.map(() => '---').join(' | ')} |\n`;
      }
    });

    navigator.clipboard.writeText(markdown);
    toast({
      title: "Table Copied!",
      description: "Markdown table copied to clipboard",
    });
  }, []);

  return (
    <div className="group relative my-8 w-fit max-w-full">
      <div className="absolute -top-10 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopyMarkdown}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-white/10 text-[10px] font-bold text-zinc-300 hover:bg-zinc-700 transition-all"
        >
          <Copy className="w-3 h-3" />
          Copy Markdown
        </button>
      </div>
      <div ref={tableRef} className="overflow-x-auto rounded-[20px] border border-white/10 bg-[#121212] shadow-2xl not-prose">
        <table className="w-full border-collapse text-left text-[14px] font-medium">
          {children}
        </table>
      </div>
    </div>
  );
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onEntityClick?: (topic: string) => void;
  onQuizSubmit?: (quiz: any, answers: Record<string, string>) => void;
}

export function MarkdownRenderer({ content, className, onEntityClick, onQuizSubmit }: MarkdownRendererProps) {
  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkEntityLink]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Code Blocks
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            if (inline) {
              return (
                <code className="px-1.5 py-0.5 bg-white/10 rounded text-[13px] font-mono text-emerald-400" {...props}>
                  {children}
                </code>
              );
            }

            if (language === 'quiz' || (language === 'json' && children.toString().includes('"type": "quiz"'))) {
              try {
                const quizData = JSON.parse(String(children));
                if (quizData.type === 'quiz') {
                  return (
                    <div className="my-8 not-prose">
                      <QuizCard
                        quiz={quizData}
                        onSubmit={(answers: Record<string, string>) => onQuizSubmit?.(quizData, answers)}
                      />
                    </div>
                  );
                }
              } catch (e) {
                console.error('Failed to parse inline quiz:', e);
              }
            }

            return <CodeBlock code={String(children)} language={language} />;
          },
          // @ts-ignore - custom node from remarkEntityLink
          entityLink: ({ topic, children }: any) => {
            return (
              <button
                onClick={() => onEntityClick?.(topic)}
                className="text-primary font-bold hover:underline decoration-primary/30 underline-offset-4 transition-all"
              >
                {children}
              </button>
            );
          },
          // Tables
          table: TableBlock,
          thead: ({ children }) => <thead className="bg-white/[0.03] border-b border-white/5">{children}</thead>,
          th: ({ children }) => <th className="px-6 py-4 font-bold uppercase tracking-tight text-zinc-400 text-[11px] whitespace-nowrap">{children}</th>,
          td: ({ children }) => <td className="px-6 py-4 text-zinc-300 border-b border-white/[0.02] leading-relaxed">{children}</td>,
          tr: ({ children }) => <tr className="hover:bg-white/[0.01] transition-colors">{children}</tr>,

          // Links (YouTube Detection + Entity Linking)
          a({ href, children }) {
            if (href?.includes('youtube.com') || href?.includes('youtu.be')) {
              return <YouTubeEmbed url={href} />;
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                {children}
                <ExternalLink className="w-3 h-3 opacity-50" />
              </a>
            );
          },

          // Images
          img({ src, alt }) {
            return (
              <div className="my-6 space-y-2">
                <div className="relative rounded-[20px] overflow-hidden border border-white/10 shadow-xl bg-zinc-900 group">
                  <img
                    src={src}
                    alt={alt}
                    className="w-full max-h-[500px] object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
                      <ImageIcon className="w-4 h-4" />
                      {alt || 'Visual reference'}
                    </div>
                  </div>
                </div>
                {alt && <p className="text-center text-xs text-zinc-500 italic px-4">{alt}</p>}
              </div>
            );
          },

          // Typography
          h1: ({ children }) => <h1 className="text-2xl font-bold mt-8 mb-4 font-orbitron tracking-tight text-white border-b border-white/10 pb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mt-6 mb-3 font-orbitron tracking-tight text-zinc-100">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2 font-orbitron tracking-tight text-zinc-200">{children}</h3>,
          p: ({ children }) => <p className="mb-4 leading-relaxed text-zinc-300 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2 text-zinc-300">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2 text-zinc-300">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 bg-primary/5 px-6 py-4 my-6 rounded-r-xl italic text-zinc-200">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-white/10" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
