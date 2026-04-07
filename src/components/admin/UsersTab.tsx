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
import { UsersTabSkeleton } from './AdminSkeletons';

interface UsersTabProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  filteredUsers: any[];
  isLoading: boolean;
  isDeepLoading?: boolean;
  loadMoreFromFirebase?: () => Promise<void>;
  setSelectedUser: (user: any) => void;
  setIsUserDetailOpen: (open: boolean) => void;
}

const VIRTUALIZATION_THRESHOLD = 50;
const CARD_HEIGHT = 120;
const BUFFER_CARDS = 5;

export const UsersTab: React.FC<UsersTabProps> = memo(({
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  filteredUsers,
  isLoading,
  isDeepLoading,
  loadMoreFromFirebase,
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
  const canDeepFetch = !hasMoreLocal && loadMoreFromFirebase && !searchTerm;

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
    <div className="space-y-8 pb-20">
      <div className="relative">
        <Users className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input 
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
            setVisibleRange({ start: 0, end: VIRTUALIZATION_THRESHOLD });
          }}
          placeholder="Search users by name, email, or ID..."
          className="w-full h-14 bg-zinc-900/60 border border-white/5 rounded-2xl pl-14 pr-6 text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/30 transition-all"
        />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <p className="text-sm font-black text-zinc-500">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
          {filteredUsers.length > VIRTUALIZATION_THRESHOLD && (
            <span className="ml-2 text-violet-400/60">(virtualized)</span>
          )}
        </p>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-lg">
            {([
              { key: 'latest', label: 'Latest' },
              { key: 'oldest', label: 'Oldest' },
              { key: 'a-z', label: 'A-Z' },
              { key: 'z-a', label: 'Z-A' },
            ] as const).map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  setSortBy(s.key);
                  setPage(1);
                  setVisibleRange({ start: 0, end: VIRTUALIZATION_THRESHOLD });
                }}
                className={`px-3 py-1.5 text-[9px] font-black rounded-md transition-all ${
                  sortBy === s.key
                    ? 'bg-violet-500 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <UsersTabSkeleton />
      ) : filteredUsers.length > 0 ? (
        <div className="space-y-4">
          <div 
            ref={containerRef}
            className="grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-y-auto"
            style={{ 
              maxHeight: 'calc(100vh - 350px)',
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
                <UserCard
                  key={u.id}
                  user={u}
                  onSelect={() => {
                    setSelectedUser(u);
                    setIsUserDetailOpen(true);
                  }}
                />
              ))
            )}
          </div>
          
          <div className="flex justify-center pt-4 gap-4">
            {hasMoreLocal && (
              <Button 
                onClick={() => setPage(p => p + 1)}
                variant="outline"
                className="bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
              >
                Load More ({paginatedUsers.length}/{filteredUsers.length})
              </Button>
            )}
            {canDeepFetch && (
              <Button 
                onClick={loadMoreFromFirebase}
                disabled={isDeepLoading}
                variant="outline"
                className="bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20 shadow-lg shadow-violet-500/5"
              >
                {isDeepLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Fetch More from Firebase
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-24 space-y-4 rounded-2xl bg-zinc-900/20 border border-white/5">
          <Users className="h-12 w-12 text-zinc-700" />
          <div className="text-center space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">No users found</p>
            <p className="text-[9px] text-zinc-700 max-w-xs">
              {searchTerm 
                ? `No users match "${searchTerm}"` 
                : 'The database may have been reset. Users will appear here once they sign up.'}
            </p>
          </div>
          {loadMoreFromFirebase && !searchTerm && (
            <Button 
              onClick={loadMoreFromFirebase}
              disabled={isDeepLoading}
              variant="outline"
              className="bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20"
            >
              {isDeepLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Refresh from Database
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

interface UserCardProps {
  user: any;
  onSelect: () => void;
}

const UserCard = memo(({ user: u, onSelect }: UserCardProps) => (
  <button
    onClick={onSelect}
    className="group relative rounded-2xl p-5 bg-zinc-900/40 border border-white/5 hover:border-violet-500/25 transition-all duration-500 text-left h-full"
  >
    <div className="flex items-start gap-4">
      <Avatar className="h-12 w-12 rounded-xl border border-white/10 shrink-0">
        <AvatarImage src={u.photoURL} />
        <AvatarFallback className="bg-zinc-800 text-sm font-bold text-violet-400">
          {u.displayName?.substring(0, 2).toUpperCase() || (u.email ? u.email.substring(0,2).toUpperCase() : '??')}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="font-black text-white group-hover:text-violet-400 transition-colors truncate">
            {u.displayName || u.email?.split('@')[0] || 'MindScape Explorer'}
          </p>
        </div>
        <p className="text-[12px] text-zinc-500 truncate mb-2">{u.email || 'No email'}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <MapIcon className="h-3 w-3 text-violet-400" />
              <span className="text-[12px] font-bold text-zinc-400">{u.statistics?.totalMapsCreated || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-zinc-600" />
              <span className="text-[12px] font-bold text-zinc-500">
                {u.statistics?.lastActiveDate 
                  ? (u.statistics.lastActiveDate.includes('T') 
                      ? format(new Date(u.statistics.lastActiveDate), 'dd/MM/yyyy hh:mm a')
                      : format(new Date(u.statistics.lastActiveDate + 'T12:00:00'), 'dd/MM/yyyy'))
                  : 'Never'}
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
        </div>
      </div>
    </div>
  </button>
));
