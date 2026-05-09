'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Brain, 
  CheckCircle, 
  XCircle, 
  Clock, 
  BarChart3, 
  Layers, 
  Cpu,
  Zap,
  TrendingUp,
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
  User,
  Map as MapIcon,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdminActivityLogEntry } from '@/lib/admin-utils';
import { formatDistanceToNow, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AITelemetryTabProps {
  logs: AdminActivityLogEntry[];
  isLoading?: boolean;
}

export function AITelemetryTab({ logs, isLoading }: AITelemetryTabProps) {
  const [filterType, setFilterType] = useState<'all' | 'STARTED' | 'COMPLETED' | 'FAILED'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Extract AI logs
  const aiLogs = useMemo(() => {
    return logs.filter(log => 
      log.type.startsWith('AI_GENERATION_') || 
      log.type.startsWith('IMAGE_GENERATION_')
    );
  }, [logs]);

  // Stats calculation
  const stats = useMemo(() => {
    const aiOnly = aiLogs;
    const completed = aiOnly.filter(l => l.type.includes('_COMPLETED')).length;
    const started = aiOnly.filter(l => l.type.includes('_STARTED')).length;
    const failed = aiOnly.filter(l => l.type.includes('_FAILED')).length;
    
    const totalTokens = aiOnly.reduce((acc, log) => acc + (log.metadata?.tokensUsed || 0), 0);
    const avgNodes = completed > 0 
      ? Math.round(aiOnly.reduce((acc, log) => acc + (log.metadata?.nodeCount || 0), 0) / completed) 
      : 0;
    
    const durations = aiOnly.filter(l => l.duration).map(l => l.duration!);
    const avgLatency = durations.length > 0 
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) 
      : 0;

    const successRate = started > 0 ? Math.round((completed / started) * 100) : 0;

    // Source breakdown
    const sources: Record<string, number> = {};
    aiOnly.forEach(log => {
      const src = log.metadata?.sourceType || 'text';
      sources[src] = (sources[src] || 0) + 1;
    });

    return {
      started,
      completed,
      failed,
      totalTokens,
      avgNodes,
      avgLatency,
      successRate,
      sources: Object.entries(sources).sort((a, b) => b[1] - a[1])
    };
  }, [aiLogs]);

  // Filtered list
  const filteredLogs = useMemo(() => {
    return aiLogs.filter(log => {
      const matchesFilter = filterType === 'all' || log.type.includes(filterType);
      const matchesSearch = !searchTerm || 
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.performedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.metadata?.sourceType?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [aiLogs, filterType, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
        <p className="text-zinc-500 font-medium">Analyzing AI performance data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Success Rate" 
          value={`${stats.successRate}%`} 
          icon={TrendingUp} 
          description={`${stats.completed} successful generations`}
          color="text-emerald-400"
          trend={stats.successRate > 90 ? 'positive' : 'neutral'}
        />
        <StatCard 
          title="Avg Latency" 
          value={`${(stats.avgLatency / 1000).toFixed(2)}s`} 
          icon={Clock} 
          description="Average response time"
          color="text-blue-400"
        />
        <StatCard 
          title="Avg Node Density" 
          value={stats.avgNodes} 
          icon={Layers} 
          description="Nodes per mind map"
          color="text-purple-400"
        />
        <StatCard 
          title="Total Failures" 
          value={stats.failed} 
          icon={AlertTriangle} 
          description={`${Math.round((stats.failed / (stats.started || 1)) * 100)}% failure rate`}
          color={stats.failed > 0 ? "text-red-400" : "text-zinc-500"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source Distribution */}
        <Card className="bg-zinc-950/40 border-white/5 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              Source Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.sources.map(([src, count]) => (
              <div key={src} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="capitalize text-zinc-400">{src}</span>
                  <span className="text-white">{count}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / (stats.started || 1)) * 100}%` }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
            ))}
            {stats.sources.length === 0 && (
              <p className="text-center py-10 text-xs text-zinc-500 italic">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Live Feed */}
        <Card className="lg:col-span-2 bg-zinc-950/40 border-white/5 flex flex-col max-h-[600px]">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Generation Telemetry
                </CardTitle>
                <CardDescription className="text-[10px]">Real-time audit of AI pipeline activity</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Search logs..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-primary/50 w-full sm:w-40"
                  />
                </div>
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value="all">All Events</option>
                  <option value="STARTED">Started</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-0">
            <ScrollArea className="h-[450px]">
              <div className="divide-y divide-white/5">
                <AnimatePresence initial={false}>
                  {filteredLogs.map((log, idx) => (
                    <motion.div 
                      key={log.id || idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                          log.type.includes('COMPLETED') ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                          log.type.includes('FAILED') ? "bg-red-500/10 border-red-500/20 text-red-400" :
                          "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        )}>
                          {log.type.includes('COMPLETED') ? <CheckCircle className="h-4 w-4" /> :
                           log.type.includes('FAILED') ? <XCircle className="h-4 w-4" /> :
                           <RefreshCw className="h-4 w-4 animate-spin-slow" />}
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-tight text-zinc-300">
                              {log.type.replace('AI_GENERATION_', '').replace('IMAGE_GENERATION_', '')}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-medium">
                              {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-1 mb-2">{log.details}</p>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
                              <User className="h-2.5 w-2.5" />
                              {log.performedBy || 'Anonymous'}
                            </div>
                            {log.metadata?.sourceType && (
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full capitalize">
                                <Search className="h-2.5 w-2.5" />
                                {log.metadata.sourceType}
                              </div>
                            )}
                            {log.duration && (
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
                                <Clock className="h-2.5 w-2.5" />
                                {(log.duration / 1000).toFixed(1)}s
                              </div>
                            )}
                            {log.metadata?.nodeCount && (
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
                                <Layers className="h-2.5 w-2.5" />
                                {log.metadata.nodeCount} nodes
                              </div>
                            )}
                          </div>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all">
                          <ArrowRight className="h-3 w-3 text-zinc-500" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredLogs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Activity className="h-8 w-8 text-zinc-700" />
                    <p className="text-sm text-zinc-500 font-medium">No matching logs found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, description, color, trend }: any) {
  return (
    <Card className="bg-zinc-950/40 border-white/5 shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="h-12 w-12" />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
          <Icon className={cn("h-3 w-3", color)} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white">{value}</span>
          {trend && (
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5",
              trend === 'positive' ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"
            )}>
              {trend === 'positive' ? '↑' : '→'}
            </span>
          )}
        </div>
        <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase tracking-tight">{description}</p>
      </CardContent>
    </Card>
  );
}
