'use client';

import { getSupabaseClient } from '@/lib/supabase-db';
import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FeedbackSchema, FeedbackInput } from '@/ai/schemas/feedback-schema';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
    Bug, 
    Sparkles, 
    TrendingUp, 
    Lightbulb, 
    Loader2, 
    Send, 
    CheckCircle2, 
    ChevronRight, 
    ChevronLeft,
    Upload,
    X,
    Image as ImageIcon,
    FileText,
    ArrowRight,
    Hash
} from 'lucide-react';

// Removed Firebase imports - using Supabase directly
// firebase/storage removed
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { submitFeedbackAction } from '@/app/actions/feedback';

type Step = 'CATEGORY' | 'DETAILS' | 'REVIEW';

const CATEGORIES = [
    { id: 'BUG', label: 'Report Bug', icon: Bug, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', activeBorder: 'border-red-500', activeShadow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]', glow: 'bg-red-500', desc: 'Something is broken or not working' },
    { id: 'SUGGESTION', label: 'Suggestion', icon: Lightbulb, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', activeBorder: 'border-blue-500', activeShadow: 'shadow-[0_0_30px_rgba(59,130,246,0.3)]', glow: 'bg-blue-500', desc: 'Idea to improve existing feature' },
    { id: 'FEATURE', label: 'New Feature Request', icon: Sparkles, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', activeBorder: 'border-violet-500', activeShadow: 'shadow-[0_0_30px_rgba(139,92,246,0.3)]', glow: 'bg-violet-500', desc: 'Request a new feature to be added' },
] as const;

export const FeedbackForm: React.FC<{ userId?: string, userName?: string, userEmail?: string }> = ({ userId, userName, userEmail }) => {
    const { toast } = useToast();
    const supabase = getSupabaseClient();
    // storage removed
    const [step, setStep] = useState<Step>('CATEGORY');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedId, setSubmittedId] = useState<string | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        trigger,
        formState: { errors }
    } = useForm<FeedbackInput>({
        resolver: zodResolver(FeedbackSchema),
        defaultValues: {
            type: undefined,
            priority: 'MEDIUM',
            userEmail: userEmail || '',
            userId: userId || '',
            userName: userName || '',
            attachments: [],
        }
    });

    const selectedType = watch('type');
    const title = watch('title') || '';
    const description = watch('description') || '';
    const priority = watch('priority');
    const affectedArea = watch('affectedArea') || '';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles].slice(0, 3)); // Max 3 files
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async (feedbackId: string): Promise<string[]> => {
        if (files.length === 0) return [];
        
        const urls: string[] = [];
        for (const file of files) {
            const storageRef = ref(storage, `feedback/${feedbackId}/${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);
            
            await new Promise<void>((resolve, reject) => {
                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(progress);
                    }, 
                    (error) => reject(error), 
                    () => resolve()
                );
            });
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            urls.push(url);
        }
        return urls;
    };

    const onSubmit = async (data: FeedbackInput) => {
        setIsSubmitting(true);
        try {
            const attachmentUrls = await uploadFiles(data.title);
            const submissionData = {
                ...data,
                attachments: attachmentUrls,
            };

            const result = await submitFeedbackAction(submissionData);

            if (result.success) {
                const trackingId = String(result.trackingId || result.id || 'UNKNOWN');
                setSubmittedId(trackingId);
                toast({ title: "Feedback Sent!", description: `Your tracking ID: ${trackingId}` });
                
                // Log activity for real-time stats
                try {
                    const { logAdminActivityAction } = await import('@/app/actions');
                    await logAdminActivityAction({
                        type: 'FEEDBACK_SUBMITTED',
                        targetId: trackingId,
                        targetType: 'feedback',
                        details: `New feedback: ${data.title}`,
                        performedBy: userId || 'anonymous',
                        performedByEmail: data.userEmail || 'anonymous',
                        metadata: {
                            category: data.type,
                            priority: data.priority
                        }
                    });
                } catch (logErr) {
                    console.error('Failed to log feedback submission:', logErr);
                }

                reset();
                setFiles([]);
            } else {
                throw new Error(result.error || 'Submission failed');
            }
        } catch (error: any) {
            console.error('Feedback submission error:', error);
            toast({ variant: "destructive", title: "Error", description: error.message || "Something went wrong. Please try again." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const nextStep = async () => {
        if (step === 'CATEGORY') setStep('DETAILS');
        else if (step === 'DETAILS') {
            const isValid = await trigger(['title', 'description']);
            if (isValid) setStep('REVIEW');
        }
    };

    if (submittedId) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl mx-auto p-12 border border-white/10 bg-zinc-900/60 backdrop-blur-3xl shadow-2xl ring-1 ring-white/10 rounded-[3rem] text-center space-y-6 relative overflow-hidden"
            >
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white leading-none font-orbitron">Thank You!</h2>
                    <div className="flex items-center justify-center gap-2 pt-2">
                        <Hash className="w-4 h-4 text-primary" />
                        <span className="text-primary font-black font-mono text-sm tracking-wider">{submittedId}</span>
                    </div>
                </div>
                <p className="text-zinc-500 text-xs font-semibold leading-relaxed max-w-xs mx-auto font-sans">
                    We've received your feedback and will look at it soon. Keep this ID for reference.
                </p>
                <Button 
                    variant="outline" 
                    onClick={() => {setSubmittedId(null); setStep('CATEGORY');}}
                    className="mt-6 border-white/10 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl h-14 w-full font-black uppercase tracking-widest text-[10px] font-orbitron"
                >
                    Send More Feedback
                </Button>
            </motion.div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Simple Step Indicator */}
            <div className="flex items-center justify-between px-10">
                {['Category', 'Details', 'Review'].map((s, i) => {
                    const stepName = ['CATEGORY', 'DETAILS', 'REVIEW'][i];
                    const isPassed = ['CATEGORY', 'DETAILS', 'REVIEW'].indexOf(step) >= i;
                    const isActive = step === stepName;
                    return (
                        <div key={s} className="flex flex-col items-center gap-2">
                           <div className={cn("h-1.5 rounded-full transition-all duration-500", 
                                isActive ? 'w-12 bg-primary shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 
                                isPassed ? 'w-6 bg-primary/40' : 'w-6 bg-zinc-800'
                           )} />
                           <span className={cn("text-[10px] font-black uppercase tracking-widest font-sans", isActive ? 'text-primary' : 'text-zinc-600')}>{s}</span>
                        </div>
                    );
                })}
            </div>

            <Card className="relative border border-white/10 bg-zinc-900/60 backdrop-blur-3xl shadow-2xl ring-1 ring-white/10 rounded-[3rem] overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <CardContent className="p-10">
                    <AnimatePresence mode="wait">
                        {step === 'CATEGORY' && (
                            <motion.div 
                                key="cat"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="space-y-8"
                            >
                                <div className="space-y-4 text-center mb-4">
                                    <h2 className="text-2xl font-black uppercase tracking-[0.1em] text-white font-orbitron">Choose a Category</h2>
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] font-sans">What are you sharing with us?</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {CATEGORIES.map((cat) => {
                                        const Icon = cat.icon;
                                        const isActive = selectedType === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => {
                                                    setValue('type', cat.id as any);
                                                    nextStep();
                                                }}
                                                className={cn(
                                                    'relative p-5 rounded-[1.5rem] border text-left transition-all duration-300 group overflow-hidden',
                                                    isActive 
                                                        ? `${cat.bg} ${cat.activeBorder} ${cat.activeShadow} scale-[1.02]` 
                                                        : 'bg-zinc-900/50 border-white/5 group-hover:border-white/10'
                                                )}
                                            >
                                                {/* Hover background reveal */}
                                                <div className={cn(
                                                    'absolute inset-0 transition-all duration-300',
                                                    isActive ? cat.bg : 'group-hover:bg-zinc-900/80'
                                                )} />
                                                
                                                {/* Color reveal on hover */}
                                                <div className={cn(
                                                    'absolute inset-0 opacity-0 transition-opacity duration-300',
                                                    isActive ? 'opacity-100' : 'group-hover:opacity-100'
                                                )}>
                                                    <div className={cn('absolute inset-0', cat.bg)} />
                                                </div>
                                                
                                                {/* Content */}
                                                <div className="relative z-10">
                                                    {/* Icon Badge */}
                                                    <div className={cn(
                                                        'w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 border-2',
                                                        isActive 
                                                            ? `${cat.bg} ${cat.activeBorder} shadow-lg` 
                                                            : 'bg-white/5 border-white/10 group-hover:border-white/20'
                                                    )}>
                                                        <Icon className={cn(
                                                            'w-7 h-7 transition-all duration-300',
                                                            isActive 
                                                                ? `${cat.color} drop-shadow-lg` 
                                                                : `text-zinc-500 group-hover:${cat.color}`
                                                        )} />
                                                    </div>
                                                    
                                                    {/* Text */}
                                                    <div className="space-y-1">
                                                        <h3 className={cn(
                                                            'font-black uppercase tracking-tight text-sm font-orbitron transition-colors duration-300',
                                                            isActive 
                                                                ? 'text-white' 
                                                                : 'text-zinc-400 group-hover:text-white'
                                                        )}>
                                                            {cat.label}
                                                        </h3>
                                                        <p className={cn(
                                                            'text-[10px] font-medium uppercase tracking-widest font-sans leading-tight transition-colors duration-300',
                                                            isActive 
                                                                ? 'text-zinc-300' 
                                                                : 'text-zinc-600 group-hover:text-zinc-400'
                                                        )}>
                                                            {cat.desc}
                                                        </p>
                                                    </div>
                                                    
                                                    {/* Active indicator */}
                                                    {isActive && (
                                                        <div className="absolute top-4 right-4">
                                                            <div className={cn('w-2.5 h-2.5 rounded-full animate-pulse', cat.glow)} />
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {step === 'DETAILS' && (
                            <motion.div 
                                key="details"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <button onClick={() => setStep('CATEGORY')} className="p-3 rounded-2xl bg-white/5 text-zinc-500 hover:text-white transition-all duration-300">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <div className="space-y-0.5">
                                        <h2 className="text-2xl font-black uppercase tracking-tight text-white font-orbitron">Tell Us More</h2>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-sans">{selectedType} Feedback</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest font-sans px-1">Give it a Title</Label>
                                        <Input 
                                            {...register('title')}
                                            placeholder="What is this about?"
                                            className="bg-black/40 border-white/5 h-16 rounded-[1.5rem] text-white px-8 font-sans placeholder:text-zinc-700 focus:border-primary/50 transition-all focus:bg-black/60 outline-none"
                                        />
                                        {errors.title && <p className="text-destructive text-[9px] font-black uppercase tracking-widest px-2">{errors.title.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest font-sans px-1">Affected Page / Area <span className="text-zinc-700 normal-case tracking-normal font-normal">(optional)</span></Label>
                                        <Input 
                                            {...register('affectedArea')}
                                            placeholder="e.g. Canvas page, Sign in card, Navbar"
                                            className="bg-black/40 border-white/5 h-16 rounded-[1.5rem] text-white px-8 font-sans placeholder:text-zinc-700 focus:border-primary/50 transition-all focus:bg-black/60 outline-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest font-sans">
                                                More Details
                                            </Label>
                                        </div>
                                        <Textarea 
                                            {...register('description')}
                                            placeholder="Tell us everything about your idea or the problem you found..."
                                            className="bg-black/40 border-white/5 min-h-[160px] rounded-[1.5rem] text-white p-8 font-sans placeholder:text-zinc-700 focus:border-primary/50 transition-all focus:bg-black/60 outline-none resize-none leading-relaxed"
                                        />
                                        {errors.description && <p className="text-destructive text-[9px] font-black uppercase tracking-widest px-2">{errors.description.message}</p>}
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest font-sans px-1">How important is this?</Label>
                                        <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
                                            {['LOW', 'MEDIUM', 'HIGH'].map((p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setValue('priority', p as any)}
                                                    className={cn(`
                                                        flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500
                                                        ${priority === p 
                                                            ? 'bg-primary/20 text-white border border-primary/40' 
                                                            : 'text-zinc-600 hover:text-zinc-400'}
                                                    `)}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest font-sans px-1">Upload Images (Optional)</Label>
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="border-2 border-dashed border-white/5 rounded-[2rem] p-10 text-center bg-black/20 hover:bg-black/40 hover:border-primary/30 cursor-pointer transition-all duration-500 group"
                                        >
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                onChange={handleFileChange}
                                                multiple 
                                                className="hidden"
                                                accept="image/*,video/*,.pdf" 
                                            />
                                            <Upload className="w-10 h-10 text-zinc-700 mx-auto mb-4 group-hover:text-primary transition-all duration-500" />
                                            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest font-orbitron">Add your files</p>
                                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-2 font-sans">Max 3 files • Images/PDFs</p>
                                        </div>

                                        {files.length > 0 && (
                                            <div className="grid grid-cols-1 gap-2 mt-4">
                                                {files.map((f, i) => (
                                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5">
                                                        <div className="flex items-center gap-4">
                                                            {f.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-blue-400" />}
                                                            <span className="text-[10px] font-bold font-mono text-zinc-400 tracking-wider truncate max-w-[200px]">{f.name}</span>
                                                        </div>
                                                        <button onClick={(e) => {e.stopPropagation(); removeFile(i)}} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors group">
                                                            <X className="w-3.5 h-3.5 text-zinc-600 group-hover:text-destructive" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Button 
                                    onClick={nextStep}
                                    className="w-full h-16 bg-primary text-white hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] font-orbitron gap-3 group shadow-lg transition-all duration-500"
                                >
                                    Check Your Message <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                                </Button>
                            </motion.div>
                        )}

                        {step === 'REVIEW' && (
                            <motion.div 
                                key="review"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <button onClick={() => setStep('DETAILS')} className="p-3 rounded-2xl bg-white/5 text-zinc-500 hover:text-white transition-all duration-300">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <div className="space-y-0.5">
                                        <h2 className="text-2xl font-black uppercase tracking-tight text-white font-orbitron">Last Check</h2>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-sans">Does everything look right?</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="relative p-10 rounded-[2.5rem] bg-black/40 border border-white/5 space-y-8 overflow-hidden group">
                                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                                        
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1.5">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-0.5 font-sans">Category</p>
                                                <p className="text-lg font-black text-primary uppercase italic font-orbitron">{selectedType}</p>
                                            </div>
                                            <div className="text-right space-y-1.5">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-0.5 font-sans">Importance</p>
                                                <p className={cn("text-sm font-black uppercase font-orbitron", 
                                                    priority === 'HIGH' ? 'text-red-400' : priority === 'MEDIUM' ? 'text-amber-400' : 'text-zinc-500'
                                                )}>{priority}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-0.5 font-sans">Your Title</p>
                                            <p className="text-white font-bold text-sm font-sans tracking-wide">{title}</p>
                                        </div>

                                        {affectedArea && (
                                            <div className="space-y-2">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-0.5 font-sans">Affected Area</p>
                                                <p className="text-zinc-300 font-bold text-sm font-sans tracking-wide">{affectedArea}</p>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-0.5 font-sans">Your Message</p>
                                            <p className="text-zinc-400 text-xs leading-relaxed line-clamp-6 font-sans italic opacity-80">"{description}"</p>
                                        </div>

                                        {files.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-0.5 font-sans">Files Added</p>
                                                <div className="flex gap-1.5">
                                                    {files.map((_, i) => (
                                                        <div key={i} className="h-1.5 w-10 rounded-full bg-primary/40" />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {!userId && (
                                        <div className="space-y-3 px-2">
                                            <Label className="text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1 text-center block font-sans">Your Email (Optional)</Label>
                                            <Input 
                                                {...register('userEmail')}
                                                placeholder="Where can we contact you?"
                                                className="bg-black/40 border-white/5 h-16 rounded-[1.5rem] text-white px-8 font-sans placeholder:text-zinc-700 focus:border-primary/50 transition-all focus:bg-black/60 outline-none text-center"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6 pt-4">
                                    <Button 
                                        disabled={isSubmitting}
                                        onClick={handleSubmit(onSubmit)}
                                        className="w-full h-18 bg-primary hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] text-white rounded-[1.8rem] font-black uppercase tracking-widest text-[10px] font-orbitron gap-4 group shadow-xl transition-all duration-500 h-16"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" /> Sending ({Math.round(uploadProgress)}%)
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5 transition-transform duration-500" /> Send Feedback
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest text-center px-4 leading-relaxed font-sans">
                                        Thank you for helping us make MindScape better.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </div>
    );
};
