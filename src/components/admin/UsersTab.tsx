'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { 
  Users, 
  Map as MapIcon, 
  Clock, 
  ChevronRight,
  Shield,
  Layers,
  Image as ImageIcon,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { UsersTabSkeleton } from './AdminSkeletons';

interface UsersTabProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  filteredUsers: any[];
  isLoading: boolean;
  isDeepLoading?: boolean;
  loadMoreFromSupabase?: () => Promise<void>;
  setSelectedUser: (user: any) => void;
  setIsUserDetailOpen: (open: boolean) => void;
}

const VIRTUALIZATION_THRESHOLD = 50;
const CARD_HEIGHT = 175;
const BUFFER_CARDS = 3;

const UsersTabInner: React.FC<UsersTabProps> = ({
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  filteredUsers,
  isLoading,
  setSelectedUser,
  setIsUserDetailOpen,
}) => {
  const [page, setPage] = useState(1);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: VIRTUALIZATION_THRESHOLD });
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 20;

  useEffect(() => {
    setPage(1);
    setVisibleRange({ start: 0, end: VIRTUALIZATION_THRESHOLD });
  }, [sortBy]);

  const paginatedUsers = filteredUsers.slice(0, page * itemsPerPage);
  const hasMoreLocal = paginatedUsers.length < filteredUsers.length;

  const visibleUsers = useCallback(() => {
    if (filteredUsers.length <= VIRTUALIZATION_THRESHOLD) {
      return paginatedUsers;
    }
    return paginatedUsers.slice(visibleRange.start, visibleRange.end);
  }, [paginatedUsers, filteredUsers.length, visibleRange]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || filteredUsers.length <= VIRTUALIZATION_THRESHOLD) return;
    
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    
    const startIndex = Math.max(0, Math.floor(scrollTop / CARD_HEIGHT) - BUFFER_CARDS);
    const endIndex = Math.min(
      filteredUsers.length,
      Math.ceil((scrollTop + viewportHeight) / CARD_HEIGHT) + BUFFER_CARDS
    );
    
    setVisibleRange({ start: startIndex, end: endIndex });
  }, [filteredUsers.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || filteredUsers.length <= VIRTUALIZATION_THRESHOLD) return;
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll, filteredUsers.length]);

  const totalHeight = filteredUsers.length <= VIRTUALIZATION_THRESHOLD 
    ? paginatedUsers.length * CARD_HEIGHT 
    : filteredUsers.length * CARD_HEIGHT;

  return (
    <div className="space-y-8 pb-32">
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Users className="h-4 w-4 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
        </div>
        <input 
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
            setVisibleRange({ start: 0, end: VIRTUALIZATION_THRESHOLD });
          }}
          placeholder="Lookup system entities..."
          className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-6 text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/30 transition-all backdrop-blur-2xl shadow-xl"
        />
        <div className="absolute inset-y-0 right-6 flex items-center">
          <Badge className="bg-white/5 border-white/10 text-zinc-600 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
            Search
          </Badge>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
            Found <span className="text-white">{filteredUsers.length}</span> explorer{filteredUsers.length !== 1 ? 's' : ''} in directory
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 p-1 rounded-2xl border border-white/5">
          {([
            { key: 'latest', label: 'Latest' },
            { key: 'oldest', label: 'Oldest' },
            { key: 'a-z', label: 'A-Z' },
          ] as const).map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setSortBy(s.key);
                setPage(1);
                setVisibleRange({ start: 0, end: VIRTUALIZATION_THRESHOLD });
              }}
              className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${
                sortBy === s.key
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <UsersTabSkeleton />
      ) : filteredUsers.length > 0 ? (
        <div className="space-y-4">
          <div 
            ref={containerRef}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto px-1 custom-scrollbar"
            style={{ 
              maxHeight: 'calc(100vh - 400px)',
              contain: 'content',
            }}
          >
            {filteredUsers.length > VIRTUALIZATION_THRESHOLD ? (
              <div style={{ height: totalHeight, position: 'relative' }}>
                {visibleUsers().map((u) => (
                  <div
                    key={u.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: CARD_HEIGHT,
                      transform: `translateY(${(filteredUsers.indexOf(u)) * CARD_HEIGHT}px)`,
                    }}
                    className="pb-4"
                  >
                    <UserCard 
                      user={u} 
                      onSelect={() => {
                        setSelectedUser(u);
                        setIsUserDetailOpen(true);
                      }} 
                    />
                  </div>
                ))}
              </div>
            ) : (
              paginatedUsers.map((u) => (
                <div key={u.id} className="pb-4">
                  <UserCard
                    user={u}
                    onSelect={() => {
                      setSelectedUser(u);
                      setIsUserDetailOpen(true);
                    }}
                  />
                </div>
              ))
            )}
          </div>
          
          <div className="flex justify-center pt-8">
            {hasMoreLocal && (
              <Button 
                onClick={() => setPage(p => p + 1)}
                variant="outline"
                className="h-14 px-10 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] transition-all"
              >
                Reveal More Entrants
              </Button>
            )}
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center p-32 space-y-6 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-3xl"
        >
          <div className="p-6 bg-zinc-900 shadow-2xl rounded-[2rem] border border-white/5">
            <Users className="h-10 w-10 text-zinc-700" />
          </div>
          <div className="text-center space-y-3">
            <p className="text-xl font-black text-white">Ghost Town</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] max-w-xs leading-relaxed">
              {searchTerm 
                ? `The digital search for "${searchTerm}" returned zero signatures.` 
                : 'The system directory is currently dormant. New signatures will appear here.'}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export const UsersTab = memo(UsersTabInner);

interface UserCardProps {
  user: any;
  onSelect: () => void;
}

const UserCardInner = ({ user: u, onSelect }: UserCardProps) => {
  const isAdmin = Boolean(
    u.isAdmin === true || 
    u.is_admin === true || 
    u.role === 'admin' || 
    (u.email && u.email.toLowerCase().trim() === 'mindscape.free@gmail.com')
  );

  const maps = u.statistics?.totalMapsCreated || 0;
  const nodes = u.statistics?.totalNodes || 0;
  const images = u.statistics?.totalImagesGenerated || 0;
  const streak = u.statistics?.currentStreak || 0;
  const studyMins = u.statistics?.totalStudyTimeMinutes || 0;
  const lastActiveStr = u.statistics?.lastActiveDate || u.lastActive;
  
  const lastActiveDate = lastActiveStr ? new Date(lastActiveStr) : null;
  const isLastActiveValid = lastActiveDate && !isNaN(lastActiveDate.getTime());
  const isActiveRecent = isLastActiveValid && (Date.now() - lastActiveDate.getTime() < 7 * 24 * 60 * 60 * 1000);

  const createdDate = u.createdAt ? new Date(u.createdAt) : null;
  const isCreatedValid = createdDate && !isNaN(createdDate.getTime());

  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className="w-full relative overflow-hidden rounded-2xl p-4 bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-violet-500/30 hover:shadow-[0_0_25px_rgba(139,92,246,0.12)] transition-all duration-300 text-left backdrop-blur-2xl shadow-xl group/card"
    >
      {/* Dynamic Left Accent Bar */}
      <div 
        className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-colors duration-300 ${
          isAdmin 
            ? 'bg-gradient-to-b from-amber-400 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.5)]' 
            : isActiveRecent 
            ? 'bg-gradient-to-b from-emerald-400 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
            : 'bg-gradient-to-b from-violet-500/40 to-purple-600/20'
        }`} 
      />

      {/* Top Hover Ambient Lighting */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/30 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />

      {/* Header Row: Avatar + Name/Email + Role/Joined Badge */}
      <div className="flex items-center gap-3 mb-3.5 pl-1">
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10 rounded-xl border border-white/15 shadow-md group-hover/card:scale-105 group-hover/card:border-violet-400/40 transition-all duration-300">
            <AvatarImage src={u.photoURL} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-zinc-800 to-zinc-900 text-xs font-black text-violet-300">
              {u.displayName?.substring(0, 2).toUpperCase() || (u.email ? u.email.substring(0, 2).toUpperCase() : '??')}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-zinc-950 flex items-center justify-center border border-white/20">
            <div className={`h-1.5 w-1.5 rounded-full ${isActiveRecent ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-zinc-600'}`} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-white group-hover/card:text-violet-300 transition-colors truncate tracking-tight">
              {u.displayName || u.email?.split('@')[0] || 'Unknown Explorer'}
            </p>
          </div>
          <p className="text-[11px] font-mono text-zinc-400 lowercase truncate mt-0.5">
            {u.email || 'no_email@explorer'}
          </p>
        </div>

        {/* Right Badge: Admin Badge or Joined Relative Tag */}
        <div className="shrink-0 text-right">
          {isAdmin ? (
            <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
              <Shield className="w-2.5 h-2.5" /> Admin
            </Badge>
          ) : isCreatedValid ? (
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">
              {formatDistanceToNow(createdDate, { addSuffix: true }).replace('about ', '')}
            </span>
          ) : (
            <Badge className="bg-white/5 border-white/10 text-zinc-400 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg">
              Explorer
            </Badge>
          )}
        </div>
      </div>

      {/* Middle Grid: 4 Clean Metric Cards */}
      <div className="grid grid-cols-4 gap-2 mb-3.5 pl-1">
        {[
          { icon: MapIcon, value: maps, label: 'Maps', color: 'text-violet-400' },
          { icon: Layers, value: nodes > 999 ? `${(nodes / 1000).toFixed(1)}k` : nodes, label: 'Nodes', color: 'text-sky-400' },
          { icon: ImageIcon, value: images, label: 'Images', color: 'text-purple-400' },
          { icon: Flame, value: streak > 0 ? `${streak}d` : '—', label: 'Streak', color: 'text-amber-400' },
        ].map(({ icon: Icon, value, label, color }) => (
          <div key={label} className="rounded-xl bg-white/[0.03] border border-white/5 p-2 text-center group-hover/card:bg-white/[0.05] transition-colors">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Icon className={`h-3 w-3 ${color}`} />
              <span className="text-xs font-black text-white">{value}</span>
            </div>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
          </div>
        ))}
      </div>

      {/* Bottom Footer: Study Time & Last Active Status */}
      <div className="flex items-center justify-between pt-2.5 border-t border-white/5 pl-1">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-emerald-400/70" />
          <span className="text-[10px] font-bold text-zinc-400">
            {studyMins >= 60 ? `${(studyMins / 60).toFixed(1)}h studied` : `${studyMins}m studied`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-zinc-500">
            {isLastActiveValid 
              ? `Active ${formatDistanceToNow(lastActiveDate, { addSuffix: true }).replace('about ', '')}`
              : 'System Origin'}
          </span>

          <div className="h-6 w-6 rounded-lg bg-white/5 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-300 group-hover/card:bg-violet-600 group-hover/card:text-white text-zinc-400 shrink-0">
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </motion.button>
  );
};

const UserCard = memo(UserCardInner);
