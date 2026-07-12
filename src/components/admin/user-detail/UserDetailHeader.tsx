'use client';

import { motion } from 'framer-motion';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Trash2,
  X,
  Copy,
  Check,
} from 'lucide-react';

interface UserDetailHeaderProps {
  user: any;
  rank?: number;
  healthScore: number;
  copiedId: boolean;
  showDeleteConfirm: boolean;
  isDeleting: boolean;
  onCopyId: () => void;
  onDeleteUser: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onClose: () => void;
}

export default function UserDetailHeader({
  user,
  rank,
  healthScore,
  copiedId,
  showDeleteConfirm,
  isDeleting,
  onCopyId,
  onDeleteUser,
  onRequestDelete,
  onCancelDelete,
  onClose,
}: UserDetailHeaderProps) {
  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between p-8 border-b border-white/5 gap-6 shrink-0 z-10">
      <div className="flex items-center gap-6">
        <div className="relative group/avatar">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-1.5 bg-gradient-to-br from-violet-500/30 via-transparent to-indigo-500/30 rounded-2xl opacity-50 blur-md"
          />
          <Avatar className="h-16 w-16 rounded-xl border-2 border-white/10 relative z-10 shadow-2xl transition-transform duration-500 group-hover/avatar:scale-105">
            <AvatarImage src={user.photoURL} className="object-cover" />
            <AvatarFallback className="bg-zinc-900 text-lg font-black text-violet-400">
              {(user.displayName || user.email?.split('@')[0] || '??').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-zinc-950 flex items-center justify-center border-2 border-white/10 z-20">
            <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h2 className="text-2xl font-black text-white tracking-tighter">{user.displayName || user.email?.split('@')[0] || 'Explorer'}</h2>
            <div className="flex items-center gap-2">
              {rank && (
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                  Top #{rank}
                </Badge>
              )}
              <Badge className="bg-white/5 border-white/10 text-zinc-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-[0.2em]">
                Verified
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-xs font-bold text-zinc-500 tracking-tight">{user.email}</p>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <div className="flex items-center gap-2 group/id">
              <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-tighter bg-white/[0.03] px-1.5 py-0.5 rounded-md border border-white/5 group-hover/id:border-white/20 transition-colors">{user.id}</span>
              <button onClick={onCopyId} className="p-1 hover:bg-white/10 rounded-lg transition-all text-zinc-600 hover:text-white">
                {copiedId ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end mr-2">
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Integrity Score</span>
          <div className="relative h-12 w-12">
            <svg className="h-12 w-12 -rotate-90">
              <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
              <motion.circle
                initial={{ strokeDashoffset: 132 }}
                animate={{ strokeDashoffset: 132 * (1 - healthScore / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="132" strokeLinecap="round"
                className={`${healthScore > 80 ? 'text-emerald-500' : healthScore > 50 ? 'text-amber-500' : 'text-red-500'}`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-black tracking-tighter">{healthScore}</span>
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-white/5 mx-1" />

        {!showDeleteConfirm ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRequestDelete}
            className="p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 transition-all shadow-xl shadow-red-500/5 group"
            title="Deactivate Subject"
          >
            <Trash2 className="h-6 w-6 group-hover:rotate-6 transition-transform" />
          </motion.button>
        ) : (
          <div className="flex items-center gap-3 bg-red-500/10 p-2 rounded-2xl border border-red-500/20 animate-in fade-in zoom-in-95">
            <button
              onClick={onDeleteUser}
              disabled={isDeleting}
              className="px-6 py-2.5 text-[10px] font-black bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-xl shadow-red-500/20 uppercase tracking-widest"
            >
              {isDeleting ? 'Erasing...' : 'Confirm Wipe'}
            </button>
            <button
              onClick={onCancelDelete}
              className="px-4 py-2.5 text-[10px] font-black bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all uppercase tracking-widest"
            >
              Abort
            </button>
          </div>
        )}

        <motion.button
          whileHover={{ rotate: 90, scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-all shadow-2xl"
        >
          <X className="h-5 w-5" />
        </motion.button>
      </div>
    </div>
  );
}
