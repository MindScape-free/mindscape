'use client';

import React, { useState } from 'react';
import { Feedback } from '@/types/feedback';
import { FeedbackBadge } from './FeedbackBadge';
import { Button } from '@/components/ui/button';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
    MoreHorizontal, 
    Eye, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    MessageSquare,
    Calendar,
    User,
    Mail,
    ArrowUpDown,
    Filter,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';

const safeFormat = (date: any, fmt: string) => {
  if (!date) return 'Unknown';
  const d = typeof date?.toDate === 'function' ? date.toDate() : new Date(date);
  if (isNaN(d.getTime())) return 'Unknown';
  return format(d, fmt);
};
import { updateFeedbackAction } from '@/app/actions/feedback';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';

interface FeedbackTableProps {
    data: Feedback[];
    onRefresh: () => void;
    adminUserId: string;
}

export const FeedbackTable: React.FC<FeedbackTableProps> = ({ data, onRefresh, adminUserId }) => {
    const { toast } = useToast();
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');

    const { firestore } = useFirebase();

    const handleUpdateStatus = async (id: string, status: string) => {
        setIsUpdating(true);
        try {
            // Refactored to Client-Side SDK to avoid Server Action credential issues
            const feedbackRef = doc(firestore, 'feedback', id);
            await updateDoc(feedbackRef, { 
                status,
                updatedAt: serverTimestamp() 
            });

            toast({ title: "Status Updated", description: `Feedback marked as ${status.toLowerCase().replace('_', ' ')}.` });
            onRefresh();
            if (selectedFeedback?.id === id) {
                setSelectedFeedback(prev => prev ? { ...prev, status: status as any } : null);
            }
        } catch (error: any) {
            console.error('Error updating status:', error);
            toast({ variant: "destructive", title: "Update Failed", description: error.message || "Failed to update status." });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSaveNotes = async () => {
        if (!selectedFeedback) return;
        setIsUpdating(true);
        try {
            // Refactored to Client-Side SDK to avoid Server Action credential issues
            const feedbackRef = doc(firestore, 'feedback', selectedFeedback.id);
            await updateDoc(feedbackRef, { 
                adminNotes,
                updatedAt: serverTimestamp() 
            });

            toast({ title: "Notes Saved", description: "Internal notes updated successfully." });
            onRefresh();
        } catch (error: any) {
            console.error('Error saving notes:', error);
            toast({ variant: "destructive", title: "Failed to save", description: error.message || "An error occurred." });
        } finally {
            setIsUpdating(false);
        }
    };

    const openDetails = (feedback: Feedback) => {
        setSelectedFeedback(feedback);
        setAdminNotes(feedback.adminNotes || '');
        setIsDetailsOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-900/50">
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                            <TableHead className="text-zinc-400 font-black uppercase text-[10px] tracking-widest">Feedback</TableHead>
                            <TableHead className="text-zinc-400 font-black uppercase text-[10px] tracking-widest">Type</TableHead>
                            <TableHead className="text-zinc-400 font-black uppercase text-[10px] tracking-widest">Priority</TableHead>
                            <TableHead className="text-zinc-400 font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                            <TableHead className="text-zinc-400 font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                            <TableHead className="text-right text-zinc-400 font-black uppercase text-[10px] tracking-widest">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-zinc-500 font-black uppercase tracking-tighter">
                                    No feedback found
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((item) => (
                                <TableRow key={item.id} className="border-zinc-800 hover:bg-white/5 transition-colors group">
                                    <TableCell className="max-w-[300px]">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm text-white font-black truncate tracking-tight">{item.title}</span>
                                            <span className="text-[10px] text-primary truncate font-mono font-bold">
                                                {item.trackingId || `ID: ${item.id.slice(0, 8)}`}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <FeedbackBadge type="type" value={item.type} />
                                    </TableCell>
                                    <TableCell>
                                        <FeedbackBadge type="priority" value={item.priority} />
                                    </TableCell>
                                    <TableCell>
                                        <FeedbackBadge type="status" value={item.status} />
                                    </TableCell>
                                    <TableCell className="text-zinc-500 text-[10px] font-mono">
                                        {safeFormat(item.createdAt, 'MMM d, HH:mm')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-500 hover:text-white">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white w-48">
                                                <DropdownMenuLabel className="text-xs text-zinc-500 font-black uppercase tracking-widest">Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => openDetails(item)} className="gap-2 cursor-pointer">
                                                    <Eye className="w-4 h-4" /> View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-zinc-800" />
                                                <DropdownMenuLabel className="text-xs text-zinc-500 font-black uppercase tracking-widest">Update status</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'IN_REVIEW')} className="gap-2 cursor-pointer">
                                                    <AlertCircle className="w-4 h-4 text-blue-400" /> Review Further
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'RESOLVED')} className="gap-2 cursor-pointer">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Mark Resolved
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'REJECTED')} className="gap-2 cursor-pointer text-red-400 focus:text-red-400">
                                                    <XCircle className="w-4 h-4" /> Reject
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-900 text-white">
                    {selectedFeedback && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <FeedbackBadge type="type" value={selectedFeedback.type} />
                                    <FeedbackBadge type="priority" value={selectedFeedback.priority} />
                                    <FeedbackBadge type="status" value={selectedFeedback.status} />
                                    {selectedFeedback.trackingId && (
                                        <span className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-black font-mono text-primary">
                                            {selectedFeedback.trackingId}
                                        </span>
                                    )}
                                </div>
                                <DialogTitle className="text-2xl font-black tracking-tighter">{selectedFeedback.title}</DialogTitle>
                                <DialogDescription className="text-zinc-500 flex items-center gap-4 pt-2 flex-wrap">
                                    <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {safeFormat(selectedFeedback.createdAt, 'MMMM do, yyyy HH:mm')}</span>
                                    {selectedFeedback.userName && <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> {selectedFeedback.userName}</span>}
                                    {selectedFeedback.userEmail && <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {selectedFeedback.userEmail}</span>}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Description</Label>
                                        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm leading-relaxed whitespace-pre-wrap min-h-[150px]">
                                            {selectedFeedback.description}
                                        </div>
                                    </div>
                                    {selectedFeedback.attachments && selectedFeedback.attachments.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Attachments</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {selectedFeedback.attachments.map((url, i) => (
                                                    <div key={i} className="aspect-square rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden group relative">
                                                        <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                                                        <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Eye className="w-6 h-6 text-white" />
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                            <MessageSquare className="w-3 h-3" /> Internal Admin Notes
                                        </Label>
                                        <Textarea 
                                            value={adminNotes} 
                                            onChange={(e) => setAdminNotes(e.target.value)}
                                            placeholder="Add notes for the team..."
                                            className="min-h-[150px] bg-zinc-950 border-zinc-800 text-sm resize-none"
                                        />
                                    </div>
                                    <Button 
                                        onClick={handleSaveNotes} 
                                        disabled={isUpdating}
                                        className="w-full bg-zinc-100 hover:bg-white text-black font-black uppercase tracking-widest text-xs"
                                    >
                                        {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                                        Save Internal Notes
                                    </Button>

                                    <div className="pt-4 space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Change Status</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleUpdateStatus(selectedFeedback.id, 'IN_REVIEW')}
                                                disabled={isUpdating || selectedFeedback.status === 'IN_REVIEW'}
                                                className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10 text-[10px] font-black uppercase tracking-widest gap-2"
                                            >
                                                In Review
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleUpdateStatus(selectedFeedback.id, 'RESOLVED')}
                                                disabled={isUpdating || selectedFeedback.status === 'RESOLVED'}
                                                className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-black uppercase tracking-widest gap-2"
                                            >
                                                Resolved
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleUpdateStatus(selectedFeedback.id, 'REJECTED')}
                                                disabled={isUpdating || selectedFeedback.status === 'REJECTED'}
                                                className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest gap-2"
                                            >
                                                Reject
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleUpdateStatus(selectedFeedback.id, 'OPEN')}
                                                disabled={isUpdating || selectedFeedback.status === 'OPEN'}
                                                className="border-zinc-500/20 text-zinc-400 hover:bg-zinc-500/10 text-[10px] font-black uppercase tracking-widest gap-2"
                                            >
                                                Re-open
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="bg-zinc-900/50 p-4 -mx-6 -mb-6 border-t border-zinc-900 mt-4">
                                <Button variant="ghost" onClick={() => setIsDetailsOpen(false)} className="text-zinc-500 hover:text-white uppercase font-black text-xs">
                                    Close Panel
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
