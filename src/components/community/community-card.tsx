'use client';

import { getSupabaseClient } from '@/lib/supabase-db';
import React, { useState } from 'react';
import { Clock, Eye, User, MoreVertical, Trash2 } from 'lucide-react';
import { MindMapWithId } from '@/types/mind-map';
import { formatShortDistanceToNow } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { useUser } from '@/lib/auth-context';
// firebase/firestore removed
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DepthBadge } from '@/components/mind-map/depth-badge';
import { ModeBadge } from '@/components/mind-map/mode-badge';

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

interface CommunityCardProps {
    map: MindMapWithId;
    onClick: (id: string) => void;
}

export const CommunityCard = ({ map, onClick }: CommunityCardProps) => {
    const supabase = getSupabaseClient();
    const { user } = useUser();
    const { toast } = useToast();

    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    const updatedAt = typeof map.updatedAt === 'number'
        ? new Date(map.updatedAt)
        : (map.updatedAt as any)?.toDate?.() || new Date();

    // Check if current user can remove this map (original author or admin)
    const adminId = '765cd0a0-6201-41d2-ac8d-ff99b4941289';
    const isAdmin = user && user.uid === adminId;
    const canRemove = user && (user.uid === map.originalAuthorId || isAdmin);

    const handleRemoveFromCommunity = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!user || !firestore) {
            toast({
                variant: 'destructive',
                title: 'Authentication Required',
                description: 'You must be logged in to remove maps.',
            });
            return;
        }

        setIsRemoving(true);

        try {
            // Get the public map document to verify ownership
            const publicMapRef = doc(firestore, 'publicMindmaps', map.id!);
            const publicMapSnap = await getDoc(publicMapRef);

            if (!publicMapSnap.exists()) {
                toast({
                    variant: 'destructive',
                    title: 'Map Not Found',
                    description: 'This map is no longer in the community.',
                });
                setIsRemoving(false);
                return;
            }

            const mapData = publicMapSnap.data();

            // Authorization check - original author or admin
            if (mapData.originalAuthorId !== user.uid && !isAdmin) {
                toast({
                    variant: 'destructive',
                    title: 'Unauthorized',
                    description: 'Only the original author or admin can remove this map.',
                });
                setIsRemoving(false);
                return;
            }

            // Delete from publicMindmaps collection
            await deleteDoc(publicMapRef);

            // Log activity for removing from community
            try {
                await addDoc(collection(firestore, 'adminActivityLog'), {
                    type: 'MAP_REMOVED',
                    targetId: map.id!,
                    targetType: 'mindmap',
                    details: `Map "${map.topic || 'Untitled'}" removed from community`,
                    performedBy: user.uid,
                    timestamp: new Date().toISOString(),
                    metadata: {
                        topic: map.topic,
                        authorId: map.originalAuthorId
                    }
                });
            } catch (logError) {
                console.warn('Failed to log MAP_REMOVED activity:', logError);
            }

            // Update the original map in user's library to set isPublic = false
            try {
                const userMapRef = doc(firestore, 'users', user.uid, 'mindmaps', map.id!);
                const userMapSnap = await getDoc(userMapRef);

                if (userMapSnap.exists()) {
                    await updateDoc(userMapRef, {
                        isPublic: false,
                        updatedAt: Date.now()
                    });
                }
            } catch (error) {
                console.warn('Could not update original map in user library:', error);
                // Don't fail the entire operation if this update fails
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

    return (
        <>
            <Card
                onClick={() => onClick(map.id!)}
                className="group relative cursor-pointer rounded-2xl bg-white/5 backdrop-blur-xl p-4 flex flex-col h-full overflow-hidden border border-white/10 transition-all duration-500 hover:border-purple-600/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:-translate-y-1"
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

                <div className="w-full aspect-video relative mb-3 overflow-hidden rounded-xl bg-[#0A0A0A] group/image">
                    <img
                        src={map.thumbnailUrl || `https://image.pollinations.ai/prompt/${encodeURIComponent(`Professional product photography of ${map.topic}, exact subject matter, literal representation, NO people, realistic objects only, studio lighting, 8k quality`)}?width=400&height=225&model=flux&enhance=true`}

                        alt={`Thumbnail for ${map.topic}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />
                    <div className="absolute top-2 left-2 z-10 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <DepthBadge depth={map.depth} className="backdrop-blur-md bg-black/40 border-white/10" />
                        </div>
                    </div>
                    {/* Glassmorphism overlay with button on hover */}
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
