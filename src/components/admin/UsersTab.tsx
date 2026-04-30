'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { 
  Users, 
  Map as MapIcon, 
  Clock, 
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from 'date-fns';
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
const CARD_HEIGHT = 150;
const BUFFER_CARDS = 3;

export const UsersTab: React.FC<UsersTabProps> = memo(({
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  filteredUsers,
  isLoading,
  isDeepLoading,
  loadMoreFromSupabase,
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
            className="grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-y-auto px-1 custom-scrollbar"
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
});

interface UserCardProps {
  user: any;
  onSelect: () => void;
}

const UserCard = memo(({ user: u, onSelect }: UserCardProps) => (
  <motion.button
    whileHover={{ y: -3, scale: 1.01 }}
    whileTap={{ scale: 0.99 }}
    onClick={onSelect}
    className="w-full relative overflow-hidden rounded-[1.25rem] p-4 bg-white/5 border border-white/10 hover:border-violet-500/30 transition-all duration-500 text-left backdrop-blur-3xl shadow-xl group"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="flex items-center gap-4 relative z-10">
      <div className="relative">
        <Avatar className="h-12 w-12 rounded-xl border border-white/10 shrink-0 group-hover:scale-105 transition-transform duration-500">
          <AvatarImage src={u.photoURL} className="object-cover" />
          <AvatarFallback className="bg-zinc-800 text-xs font-black text-violet-400">
            {u.displayName?.substring(0, 2).toUpperCase() || (u.email ? u.email.substring(0,2).toUpperCase() : '??')}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-zinc-950 flex items-center justify-center border border-white/10">
           <div className={`h-2 w-2 rounded-full ${u.statistics?.lastActiveDate ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-black text-white group-hover:text-violet-400 transition-colors truncate tracking-tight">
            {u.displayName || u.email?.split('@')[0] || 'Unknown Explorer'}
          </p>
          <Badge className="bg-white/5 border-white/10 text-zinc-600 text-[7px] font-black uppercase px-1.5 py-0 rounded-full group-hover:border-violet-500/30 group-hover:text-violet-400 transition-all">
            Identity Verified
          </Badge>
        </div>
        <p className="text-[10px] text-zinc-500 truncate mb-3 font-bold border-b border-white/5 pb-1 group-hover:border-violet-500/10 transition-colors">{u.email || '@digital_citizen'}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-violet-500/10 rounded-lg">
                <MapIcon className="h-3 w-3 text-violet-400" />
              </div>
              <span className="text-[11px] font-black text-white tracking-tighter">{u.statistics?.totalMapsCreated || 0}</span>
              <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Maps</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="p-1 bg-white/5 rounded-lg">
                <Clock className="h-3 w-3 text-zinc-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">Last Seen</span>
                <span className="text-[9px] font-black text-zinc-400">
                  {u.statistics?.lastActiveDate 
                    ? (u.statistics.lastActiveDate.includes('T') 
                        ? format(new Date(u.statistics.lastActiveDate), 'dd MMM yyyy')
                        : format(new Date(u.statistics.lastActiveDate + 'T12:00:00'), 'dd MMM yyyy'))
                    : 'System Origin'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:bg-violet-500 shadow-lg group-hover:translate-x-0 translate-x-2">
             <ChevronRight className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  </motion.button>
));
