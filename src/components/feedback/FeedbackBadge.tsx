import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bug, Lightbulb, TrendingUp, Sparkles, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface FeedbackBadgeProps {
  type: 'type' | 'priority' | 'status';
  value: string;
  className?: string;
}

export const FeedbackBadge: React.FC<FeedbackBadgeProps> = ({ type, value, className }) => {
  if (type === 'type') {
    switch (value) {
      case 'BUG':
        return <Badge variant="destructive" className={`gap-1 ${className}`}><Bug className="w-3 h-3" /> Bug</Badge>;
      case 'SUGGESTION':
        return <Badge variant="secondary" className={`gap-1 bg-blue-500/10 text-blue-400 border-blue-500/20 ${className}`}><Lightbulb className="w-3 h-3 text-blue-400" /> Suggestion</Badge>;
      case 'IMPROVEMENT':
        return <Badge variant="secondary" className={`gap-1 bg-amber-500/10 text-amber-400 border-amber-500/20 ${className}`}><TrendingUp className="w-3 h-3 text-amber-400" /> Improvement</Badge>;
      case 'FEATURE':
        return <Badge variant="secondary" className={`gap-1 bg-purple-500/10 text-purple-400 border-purple-500/20 ${className}`}><Sparkles className="w-3 h-3 text-purple-400" /> Feature Request</Badge>;
      default:
        return <Badge className={className}>{value}</Badge>;
    }
  }

  if (type === 'priority') {
    switch (value) {
      case 'HIGH':
        return <Badge variant="destructive" className={`bg-red-500/10 text-red-400 border-red-500/20 ${className}`}>High Priority</Badge>;
      case 'MEDIUM':
        return <Badge variant="secondary" className={`bg-amber-500/10 text-amber-400 border-amber-500/20 ${className}`}>Medium Priority</Badge>;
      case 'LOW':
        return <Badge variant="outline" className={`text-zinc-400 border-zinc-500/20 ${className}`}>Low Priority</Badge>;
      default:
        return <Badge className={className}>{value}</Badge>;
    }
  }

  if (type === 'status') {
    switch (value) {
      case 'OPEN':
        return <Badge variant="outline" className={`gap-1 text-zinc-400 border-zinc-500/20 ${className}`}><Clock className="w-3 h-3" /> Open</Badge>;
      case 'IN_REVIEW':
        return <Badge variant="secondary" className={`gap-1 bg-blue-500/10 text-blue-400 border-blue-500/20 ${className}`}><AlertCircle className="w-3 h-3" /> Review Further</Badge>;
      case 'RESOLVED':
        return <Badge variant="secondary" className={`gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 ${className}`}><CheckCircle2 className="w-3 h-3" /> Resolved</Badge>;
      case 'REJECTED':
        return <Badge variant="secondary" className={`gap-1 bg-red-500/10 text-red-400 border-red-500/20 ${className}`}><XCircle className="w-3 h-3" /> Rejected</Badge>;
      default:
        return <Badge className={className}>{value}</Badge>;
    }
  }

  return <Badge className={className}>{value}</Badge>;
};
