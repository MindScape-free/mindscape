'use client';

import { useState, useMemo } from 'react';
import { 
  Activity, 
  Brain, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Layers, 
  Cpu,
  Zap,
  TrendingUp,
  AlertTriangle,
  Search,
  ArrowRight,
  User,
  ShieldCheck,
  Globe,
  Database,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface AITelemetryTabProps {
  aiCalls: any[];
  isLoading?: boolean;
}

export function AITelemetryTab({ aiCalls = [], isLoading }: AITelemetryTabProps) {
  const [filterType, setFilterType] = useState<'all' | 'success' | 'failure'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const stats = useMemo(() => {
    const aiOnly = aiCalls;
    const completed = aiOnly.filter(l => l.success).length;
    const started = aiOnly.length;
    const failed = aiOnly.filter(l => !l.success).length;
    
    const avgNodes = completed > 0 
      ? Math.round(aiOnly.reduce((acc, log) => acc + (log.node_count || 0), 0) / completed) 
      : 0;
    
    const avgLatency = aiOnly.length > 0 
      ? Math.round(aiOnly.reduce((a, b) => a + (b.latency_ms || 0), 0) / aiOnly.length) 
      : 0;

    const successRate = started > 0 ? Math.round((completed / started) * 100) : 0;

    const sources: Record<string, number> = {};
    aiOnly.forEach(log => {
      const src = log.prompt_type || 'unspecified';
      sources[src] = (sources[src] || 0) + 1;
    });

    return {
      started,
      completed,
      failed,
      avgNodes,
      avgLatency,
      successRate,
      sources: Object.entries(sources).sort((a, b) => b[1] - a[1])
    };
  }, [aiCalls]);

  const filteredLogs = useMemo(() => {
    return aiCalls.filter(log => {
      const matchesFilter = filterType === 'all' || (filterType === 'success' ? log.success : !log.success);
      const matchesSearch = !searchTerm || 
        log.prompt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.mapTitle?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [aiCalls, filterType, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-t-2 border-violet-500 animate-spin" />
          <Brain className="absolute inset-0 m-auto h-6 w-6 text-violet-400 animate-pulse" />
        </div>
        <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px]">Analyzing Neural Stream...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* --- Engine Health Overview (Compact) --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricBlock 
          label="Success" 
          value={`${stats.successRate}%`} 
          subValue="Health"
          icon={ShieldCheck} 
          color="emerald"
        />
        <MetricBlock 
          label="Latency" 
          value={`${(stats.avgLatency / 1000).toFixed(1)}s`} 
          subValue="Avg"
          icon={Clock} 
          color="blue"
        />
        <MetricBlock 
          label="Density" 
          value={stats.avgNodes} 
          subValue="Nodes"
          icon={Layers} 
          color="violet"
        />
        <MetricBlock 
          label="Errors" 
          value={stats.failed} 
          subValue="Critical"
          icon={AlertTriangle} 
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* --- Source DNA (Compact) --- */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-5 rounded-[1.5rem] bg-white/5 border border-white/10 shadow-xl relative overflow-hidden backdrop-blur-3xl">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
              <Zap className="h-3 w-3 text-amber-400" />
              Source DNA
            </h3>
            <div className="space-y-2">
              {stats.sources.map(([src, count]) => (
                <div key={src} className="group/src">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover/src:text-white transition-colors">{src}</span>
                    <span className="text-[10px] font-black text-white">{count}</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / (stats.started || 1)) * 100}%` }}
                      className="h-full bg-gradient-to-r from-violet-500 to-rose-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-[1.5rem] bg-white/5 border border-white/10 shadow-xl backdrop-blur-3xl">
             <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-3 w-3 text-violet-400" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">System Insight</p>
             </div>
             <p className="text-[10px] leading-relaxed text-zinc-500 font-medium">
                Neural efficiency is currently at <span className="text-white font-bold">{stats.successRate}%</span>. 
                Target latency should remain below <span className="text-blue-400 font-bold">5s</span> for optimal performance.
             </p>
          </div>
        </div>

        {/* --- Neural Feed (Compact) --- */}
        <div className="lg:col-span-9">
          <div className="rounded-[1.5rem] bg-white/5 border border-white/10 shadow-xl flex flex-col overflow-hidden backdrop-blur-3xl">
            <div className="px-6 py-5 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                  <Activity className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Neural stream</h3>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Active AI Audit</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="FILTER BY TOPIC OR USER..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-[9px] font-black uppercase tracking-widest focus:outline-none focus:border-violet-500/50 w-64 transition-all"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                    >
                      <XCircle className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10">
                  <FilterButton 
                    active={filterType === 'all'} 
                    onClick={() => setFilterType('all')} 
                    label="ALL" 
                  />
                  <FilterButton 
                    active={filterType === 'success'} 
                    onClick={() => setFilterType('success')} 
                    label="SUCCESS" 
                    color="emerald"
                  />
                  <FilterButton 
                    active={filterType === 'failure'} 
                    onClick={() => setFilterType('failure')} 
                    label="FAILURE" 
                    color="rose"
                  />
                </div>
              </div>
            </div>

            <ScrollArea className="h-[600px]">
              <div className="p-6">
                <div className="relative">
                  <div className="absolute left-[15px] top-4 bottom-4 w-px bg-white/5" />

                  <div className="space-y-4">
                    <AnimatePresence initial={false}>
                      {filteredLogs.map((log, idx) => (
                        <motion.div 
                          key={log.id || idx}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="relative pl-10 group"
                        >
                          <div className={cn(
                            "absolute left-1.5 top-1.5 w-[20px] h-[20px] rounded-full border-2 bg-[#0d0d0f] z-10 flex items-center justify-center",
                            log.success ? "border-emerald-500/30" : "border-rose-500/30"
                          )}>
                            <div className={cn("w-1 h-1 rounded-full", log.success ? "bg-emerald-400" : "bg-rose-400")} />
                          </div>

                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className={cn(
                                    "text-[7px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-sm border",
                                    log.success ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                                  )}>
                                    {log.prompt_type || 'GEN'}
                                  </span>
                                  <h4 className="text-xs font-black text-white truncate max-w-[200px] md:max-w-md uppercase tracking-tight">
                                    {log.mapTitle || 'Neural Process'}
                                  </h4>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                  <MetaBadge icon={User} label={`ID:${log.user_id?.substring(0, 8) || 'SYSTEM'}`} />
                                  <MetaBadge icon={Clock} label={`${(log.latency_ms / 1000).toFixed(1)}s`} color="blue" />
                                  {log.node_count && <MetaBadge icon={Layers} label={`${log.node_count} Nodes`} color="emerald" />}
                                  {log.metadata?.model && <MetaBadge icon={Cpu} label={log.metadata.model} color="amber" />}
                                </div>
                              </div>

                              <div className="flex items-center gap-4 shrink-0">
                                <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest hidden md:block">
                                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                </span>
                                {log.success && log.mind_map_id && (
                                  <button 
                                    onClick={() => window.open(`/canvas/${log.mind_map_id}`, '_blank')}
                                    className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500 hover:text-white transition-all shadow-lg shadow-violet-500/10"
                                  >
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {!log.success && log.error_message && (
                               <div className="mt-3 p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 flex items-start gap-2">
                                  <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0" />
                                  <p className="text-[9px] text-rose-400/70 font-medium italic leading-relaxed truncate">{log.error_message}</p>
                                </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBlock({ label, value, subValue, icon: Icon, color }: any) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };

  return (
    <motion.div 
      whileHover={{ y: -3 }}
      className="relative overflow-hidden rounded-[1.25rem] bg-white/5 border border-white/10 p-5 backdrop-blur-3xl shadow-xl group transition-all"
    >
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-4">
          <div className={cn("p-1.5 rounded-lg border", colorMap[color])}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-black text-white tracking-tighter">{value}</h2>
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{subValue}</span>
        </div>
      </div>
    </motion.div>
  );
}

function MetaBadge({ icon: Icon, label, color = "zinc" }: any) {
  const colors: Record<string, string> = {
    zinc: "bg-white/5 text-zinc-500 border-white/5",
    blue: "bg-blue-500/5 text-blue-400 border-blue-500/10",
    emerald: "bg-emerald-500/5 text-emerald-400 border-emerald-500/10",
    amber: "bg-amber-500/5 text-amber-400 border-amber-500/10",
  };

  return (
    <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-colors", colors[color])}>
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
}

function FilterButton({ active, onClick, label, color = "violet" }: any) {
  const colorMap: Record<string, string> = {
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/20 shadow-violet-500/10",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/10",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-transparent hover:bg-white/5",
        active ? colorMap[color] + " border shadow-lg" : "text-zinc-600"
      )}
    >
      {label}
    </button>
  );
}

