'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Clock, Eye, User, MoreVertical, Trash2 } from 'lucide-react';
import { MindMapWithId } from '@/types/mind-map';
import { formatShortDistanceToNow } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DepthBadge } from '@/components/mind-map/depth-badge';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CATEGORY_COLORS: Record<string, string> = {
  'Science': 'from-emerald-500/20 to-teal-500/10 border-emerald-500/20 text-emerald-400',
  'Technology': 'from-blue-500/20 to-cyan-500/10 border-blue-500/20 text-blue-400',
  'History': 'from-amber-500/20 to-orange-500/10 border-amber-500/20 text-amber-400',
  'Philosophy': 'from-violet-500/20 to-purple-500/10 border-violet-500/20 text-violet-400',
  'Business': 'from-rose-500/20 to-pink-500/10 border-rose-500/20 text-rose-400',
  'Art': 'from-fuchsia-500/20 to-pink-500/10 border-fuchsia-500/20 text-fuchsia-400',
  'Health': 'from-green-500/20 to-emerald-500/10 border-green-500/20 text-green-400',
};

function getCategoryColor(cat: string): string {
  for (const [key, val] of Object.entries(CATEGORY_COLORS)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 'from-purple-500/20 to-indigo-500/10 border-purple-500/20 text-purple-400';
}

interface CommunityCardProps {
    map: MindMapWithId;
    onClick: (id: string) => void;
    variant?: 'default' | 'background';
}

export const CommunityCard = ({ map, onClick, variant = 'default' }: CommunityCardProps) => {
    const { supabase, isAdmin: isUserAdmin, user } = useAuth();
    const { toast } = useToast();

    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    const [updatedAt] = useState(() =>
        map.updatedAt ? new Date(map.updatedAt) : new Date()
    );

    // Check if current user can remove this map (original author or admin)
    const canRemove = user && (user.id === map.originalAuthorId || isUserAdmin);

    const handleRemoveFromCommunity = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!user || !supabase) {
            toast({
                variant: 'destructive',
                title: 'Authentication Required',
                description: 'You must be logged in to remove maps.',
            });
            return;
        }

        setIsRemoving(true);

        try {
            // Check if map exists in public_mindmaps
            const { data: publicMap, error: fetchErr } = await supabase
                .from('public_mindmaps')
                .select('original_author_id')
                .eq('id', map.id)
                .single();

            if (fetchErr || !publicMap) {
                toast({
                    variant: 'destructive',
                    title: 'Map Not Found',
                    description: 'This map is no longer in the community.',
                });
                setIsRemoving(false);
                return;
            }

            // Authorization check - original author or admin
            if (publicMap.original_author_id !== user.id && !isUserAdmin) {
                toast({
                    variant: 'destructive',
                    title: 'Unauthorized',
                    description: 'Only the original author or admin can remove this map.',
                });
                setIsRemoving(false);
                return;
            }

            // Delete from public_mindmaps table
            const { error: deleteErr } = await supabase
                .from('public_mindmaps')
                .delete()
                .eq('id', map.id);

            if (deleteErr) throw deleteErr;

            // Log activity
            try {
                const { logAdminActivityAction } = await import('@/app/actions');
                await logAdminActivityAction({
                    type: 'MAP_REMOVED',
                    targetId: map.id!,
                    targetType: 'mindmap',
                    details: `Map "${map.topic || 'Untitled'}" removed from community`,
                    performedBy: user.id,
                    performedByEmail: user.email || 'anonymous',
                    metadata: {
                        topic: map.topic,
                        authorId: map.originalAuthorId
                    }
                });
            } catch (logError) {
                console.warn('Failed to log MAP_REMOVED activity:', logError);
            }

            // Update the original map in mindmaps table to set is_public = false
            try {
                await supabase
                    .from('mindmaps')
                    .update({
                        is_public: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', map.id)
                    .eq('user_id', user.id);
            } catch (error) {
                console.warn('Could not update original map status:', error);
            }

            toast({
                title: 'Removed from Community',
                description: 'The mind map has been removed from the community.',
            });
            setIsRemoveDialogOpen(false);
        } catch (error: any) {
            console.error('Error removing from community:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsRemoving(false);
        }
    };

    const isBgVariant = variant === 'background';

    return (
        <>
            <Card
                onClick={() => onClick(map.id!)}
                className={cn(
                    "group relative cursor-pointer rounded-2xl backdrop-blur-xl flex flex-col h-full overflow-hidden border transition-all duration-500 hover:-translate-y-1",
                    isBgVariant 
                        ? "bg-zinc-950/60 p-6 border-white/5 hover:border-purple-500/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)] min-h-[220px]"
                        : "bg-white/5 p-4 border-white/10 hover:border-purple-600/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]"
                )}
            >
                {/* Dropdown Menu for Removal - Only visible to authorized users */}
                {canRemove && (
                    <div className="absolute top-2 right-2 z-20" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60 hover:border-white/20 transition-all">
                                    <MoreVertical className="h-4 w-4 text-white" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsRemoveDialogOpen(true);
                                    }}
                                    className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove from Community
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}

                {isBgVariant ? (
                    /* Background Image Variant */
                    <>
                        {/* Background Image with Low Opacity */}
                        <div className="absolute inset-0 z-0 transition-transform duration-700 group-hover:scale-105 pointer-events-none">
                            <img
                                src={map.thumbnailUrl || `https://image.pollinations.ai/prompt/${encodeURIComponent(`Documentary photograph representing ${map.topic}, detailed scene with specific visual elements related to the subject, dramatic professional lighting, rich textures and atmosphere, foreground subject in sharp focus with beautiful background, 8k resolution, professional photography quality, no text, no watermarks`)}?width=400&height=225&model=flux&enhance=true`}
                                alt=""
                                className="w-full h-full object-cover opacity-[0.08] filter brightness-50 contrast-125 saturate-50"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/70 to-zinc-950" />
                        </div>

                        {/* Content Container (z-10 to stay above background image) */}
                        <div className="relative z-10 flex flex-col h-full w-full">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <h3 className="font-bold text-lg text-white group-hover:text-purple-400 transition-colors font-orbitron tracking-tight pb-1 leading-snug line-clamp-2">
                                    {map.shortTitle || map.topic}
                                </h3>
                                <div className="shrink-0 mt-1">
                                    <DepthBadge depth={map.depth} className="backdrop-blur-md bg-black/40 border-white/10 text-[9px]" />
                                </div>
                            </div>

                            {map.summary && (
                                <p className="text-xs text-zinc-400 line-clamp-3 mb-6 leading-relaxed">
                                    {map.summary}
                                </p>
                            )}

                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6 border border-white/10">
                                        <AvatarImage src={map.authorAvatar} />
                                        <AvatarFallback className="bg-purple-900/50 text-[10px]"><User className="h-3 w-3" /></AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium text-gray-300 truncate max-w-[80px]">
                                        {map.authorName || 'MindScaper'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    {map.publicCategories && map.publicCategories.length > 0 && (
                                        <span
                                            className={cn(
                                                "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                                getCategoryColor(map.publicCategories[0])
                                            )}
                                        >
                                            {map.publicCategories[0]}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                        <Eye className="h-3.5 w-3.5" />
                                        {map.views || 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Default Variant */
                    <>
                        <div className="w-full aspect-video relative mb-3 overflow-hidden rounded-xl bg-[#0A0A0A] group/image">
                            <img
                                src={map.thumbnailUrl || `https://image.pollinations.ai/prompt/${encodeURIComponent(`Documentary photograph representing ${map.topic}, detailed scene with specific visual elements related to the subject, dramatic professional lighting, rich textures and atmosphere, foreground subject in sharp focus with beautiful background, 8k resolution, professional photography quality, no text, no watermarks`)}?width=400&height=225&model=flux&enhance=true`}
                                alt={`Thumbnail for ${map.topic}`}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                            />
                            <div className="absolute top-2 left-2 z-10 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <DepthBadge depth={map.depth} className="backdrop-blur-md bg-black/40 border-white/10" />
                                </div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/image:opacity-100 group-hover/image:bg-black/40 transition-all duration-300">
                                <div className="rounded-full bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white text-[10px] h-9 px-6 font-black uppercase tracking-widest shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2">
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    Open Full Map
                                </div>
                            </div>
                        </div>

                        <h3 className="font-bold text-lg text-white mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors font-orbitron tracking-tight pb-1 leading-snug">{map.shortTitle || map.topic}</h3>

                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6 border border-white/10">
                                    <AvatarImage src={map.authorAvatar} />
                                    <AvatarFallback className="bg-purple-900/50 text-[10px]"><User className="h-3 w-3" /></AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium text-gray-300 truncate max-w-[80px]">
                                    {map.authorName || 'MindScaper'}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                    <Eye className="h-3.5 w-3.5" />
                                    {map.views || 0}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </Card>

            {/* Confirmation Dialog */}
            <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
                <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Remove from Community?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            This will remove "{map.shortTitle || map.topic}" from the community.
                            The map will remain in your library but will no longer be visible to other users.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            disabled={isRemoving}
                            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveFromCommunity}
                            disabled={isRemoving}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isRemoving ? 'Removing...' : 'Remove'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
