'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import mermaid from 'mermaid';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Play, Check, Code, ExternalLink, Image as ImageIcon, Maximize2, Download, X, Quote } from 'lucide-react';
import { RecallChallenge } from './recall-challenge';
import { toPascalCase } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { remarkEntityLink } from './remark-entity-link';
import { QuizCard } from './quiz-card';
import { motion, AnimatePresence } from 'framer-motion';

// Initialize Mermaid once globally
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: '#18181b', // zinc-900
      primaryTextColor: '#f4f4f5', // zinc-100
      primaryBorderColor: '#3f3f46', // zinc-700
      lineColor: '#52525b', // zinc-600
      secondaryColor: '#27272a', // zinc-800
      tertiaryColor: '#09090b', // zinc-950
      mainBkg: '#09090b',
      nodeBorder: '#3f3f46',
      clusterBkg: '#18181b',
      clusterBorder: '#3f3f46',
      defaultLinkColor: '#71717a',
      titleColor: '#ffffff',
      edgeLabelBackground: '#18181b',
      nodeRadius: '6px', // Slight rounding, mostly flat
      fontSize: '14px',
      fontFamily: 'sans-serif', // Use standard sans-serif for perfect width calculation
    },
    securityLevel: 'loose',
    fontFamily: 'sans-serif',
    flowchart: {
      htmlLabels: true, // Enable HTML labels for natural text wrapping
      curve: 'basis',
      padding: 20,
      nodeSpacing: 50,
      rankSpacing: 60,
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
  const [showSource, setShowSource] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const id = React.useMemo(() => `mermaid-${crypto.randomUUID()}`, []);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!ref.current || !code) return;
      setIsRendering(true);

      let cleanCode = code.trim();
      if (cleanCode.startsWith('```mermaid')) cleanCode = cleanCode.replace(/^```mermaid\n?/, '').replace(/\n?```$/, '');
      if (cleanCode.startsWith('```')) cleanCode = cleanCode.replace(/^```\n?/, '').replace(/\n?```$/, '');

      cleanCode = cleanCode.replace(/(\w+)(\[|\(|\{\{|\{|\(\(|\>)([^"'][^\]\)\}]*)([\]\)\}]+\>|\]|\)\)|\)|\}\}|\})/g, (match, id, open, content, close) => {
        const trimmed = content.trim();
        if (!trimmed) return match;
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

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindscape-flowchart-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: 'Flowchart saved successfully.' });
  };

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
          <pre className="p-4 bg-zinc-900 rounded-xl text-[10px] text-zinc-400 overflow-x-auto border border-zinc-800 font-mono">
            {code}
          </pre>
        )}
      </div>
    );
  }

  const containerClasses = isFullscreen
    ? "fixed inset-0 z-[100] bg-zinc-950 flex items-center justify-center overflow-auto"
    : "w-full bg-zinc-950/50 rounded-2xl border border-zinc-800 flex items-center justify-center relative group/container";

  return (
    <div className="my-6 flex flex-col items-center w-full">
      <style jsx global>{`
        /* Clean Flat CSS */
        .mermaid-svg svg {
          max-width: 100% !important;
          height: auto !important;
          display: block;
        }
        .mermaid-svg .nodeLabel {
          line-height: 1.4 !important;
          padding: 8px !important;
        }
      `}</style>
      
      <div className={containerClasses}>
        
        {/* Simple Action Bar */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-30 opacity-0 group-hover/container:opacity-100 transition-opacity duration-200">
           <button onClick={() => setShowSource(!showSource)} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white transition-colors" title="View Source"><Code className="w-4 h-4" /></button>
           <button onClick={downloadSvg} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white transition-colors" title="Download SVG"><Download className="w-4 h-4" /></button>
           <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white transition-colors" title={isFullscreen ? "Close Fullscreen" : "Fullscreen"}>
             {isFullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
           </button>
        </div>

        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-20">
            <span className="text-sm font-medium text-zinc-400">Rendering...</span>
          </div>
        )}

        <div
          ref={ref}
          className={cn(
            "mermaid-svg w-full overflow-x-auto flex justify-center py-8 px-4",
            isFullscreen ? "h-full items-center p-8" : ""
          )}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      <AnimatePresence>
        {showSource && !isFullscreen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full mt-4 overflow-hidden"
          >
            <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 font-mono">
              <pre className="text-xs text-zinc-400 overflow-x-auto leading-relaxed scrollbar-thin">
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
    <div className="block w-full relative my-8 group rounded-3xl overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl not-prose transition-all duration-500 hover:border-white/20">
      <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
            <Code className="w-4 h-4 text-zinc-500 group-hover:text-primary transition-colors" />
          </div>
          <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">{language || 'text'}</span>
        </div>
        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handleCopy}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
            title="Copy code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleRun}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary hover:bg-primary/20 transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            RUN
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '2rem',
          background: 'transparent',
          fontSize: '13px',
          lineHeight: '1.7',
          fontFamily: 'var(--font-mono)',
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
    <div className="group relative my-10 w-fit max-w-full">
      <div className="absolute -top-12 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
        <button
          onClick={handleCopyMarkdown}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-[10px] font-bold text-zinc-400 hover:text-white hover:border-white/20 transition-all shadow-2xl shadow-black"
        >
          <Copy className="w-3.5 h-3.5" />
          COPY MARKDOWN
        </button>
      </div>
      <div ref={tableRef} className="overflow-x-auto rounded-[2rem] border border-white/5 bg-zinc-950 shadow-2xl not-prose p-1">
        <table className="w-full border-collapse text-left text-sm font-medium">
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
            if (language === 'recall') {
              try {
                const recallData = JSON.parse(String(children));
                return (
                  <RecallChallenge 
                    {...recallData} 
                    onAccept={() => {
                      const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
                      if (chatInput) {
                        chatInput.focus();
                        chatInput.placeholder = "Explain the connection...";
                      }
                    }} 
                  />
                );
              } catch (e) {
                console.error('Failed to parse recall challenge:', e);
              }
            }

            if (language === 'quiz' || (language === 'json' && String(children).includes('"type": "quiz"'))) {
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
          td: ({ children }) => <td className="px-6 py-4 text-zinc-300 border-b border-white/[0.02] leading-relaxed align-top min-w-[120px] break-words">{children}</td>,
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
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-10 mb-6 font-orbitron tracking-[0.1em] text-white flex items-center gap-3">
              <span className="w-1 h-6 bg-primary rounded-full" />
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-8 mb-4 font-orbitron tracking-[0.05em] text-zinc-100 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary/40 rounded-full" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold mt-6 mb-3 font-orbitron tracking-tight text-zinc-200">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-5 leading-[1.8] text-zinc-400 font-medium selection:bg-primary/30 last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-none pl-2 mb-6 space-y-3">
              {React.Children.map(children, (child: any) => {
                if (!child) return null;
                // Safely extract children from the li element
                const content = React.isValidElement(child) ? (child.props as any)?.children : child;
                // If it's just whitespace, skip it
                if (typeof content === 'string' && !content.trim()) return null;
                
                return (
                  <li className="flex items-start gap-3 group">
                    <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors shrink-0" />
                    <span className="text-zinc-400 font-medium group-hover:text-zinc-200 transition-colors leading-relaxed">
                      {content}
                    </span>
                  </li>
                );
              })}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-none pl-2 mb-6 space-y-4">
              {React.Children.map(children, (child: any, i) => {
                if (!child) return null;
                // Safely extract children from the li element
                const content = React.isValidElement(child) ? (child.props as any)?.children : child;
                // If it's just whitespace, skip it
                if (typeof content === 'string' && !content.trim()) return null;

                return (
                  <li className="flex items-start gap-4 group">
                    <span className="mt-1 flex items-center justify-center w-5 h-5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-500 group-hover:text-primary group-hover:border-primary/30 transition-all shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-zinc-400 font-medium group-hover:text-zinc-200 transition-colors leading-relaxed">
                      {content}
                    </span>
                  </li>
                );
              })}
            </ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="relative border-l border-primary/30 bg-white/[0.02] px-8 py-6 my-8 rounded-r-2xl italic text-zinc-300 font-medium overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Quote className="absolute top-4 right-6 w-8 h-8 text-white/5" />
              <div className="relative z-10">{children}</div>
            </blockquote>
          ),
          hr: () => <hr className="my-10 border-white/5" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
