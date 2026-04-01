'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, setDoc, collection, query, getDocs, onSnapshot, orderBy, getCountFromServer } from 'firebase/firestore';
import { updateProfile, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Loader2, Flame, Map, Brain, LogOut, Settings, Globe, Wand2,
    Pencil, Edit2, Check, X, Trophy, Target, Lock, ChevronRight, Sparkles, Copy, Key, RefreshCw, ShieldCheck, Activity,
    FastForward, Scale, BookOpen, BarChart3, Zap, Layers, Youtube, Image as ImageIcon, ChevronLeft, ExternalLink, Heart, Library, Clock, FileText
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from "@/components/ui/sheet";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import { languages } from '@/lib/languages';
import { format } from 'date-fns';
import { syncHistoricalStatistics } from '@/lib/activity-tracker';
import { ModelSelector } from '@/components/model-selector';
import { Eye, EyeOff, Menu } from 'lucide-react';
import { getUserImageSettings, saveUserApiKey } from '@/lib/firestore-helpers';
import { checkPollenBalanceAction } from '@/app/actions';
import { useAIConfig } from '@/contexts/ai-config-context';

// Types
// Types
interface UserProfile {
    uid?: string;
    displayName: string;
    email: string;
    photoURL?: string;
    activeBadgeId?: string;
    preferences: {
        preferredLanguage: string;
        defaultAIPersona: string;
        defaultDepth?: string;
        defaultExplanationMode?: string;
        autoGenerateImages?: boolean;
        deepExpansionMode?: boolean;
        defaultMapView?: string;
        autoSaveFrequency?: number;
    };
    statistics: {
        totalMapsCreated: number;
        totalNestedExpansions: number;
        totalImagesGenerated: number;
        totalStudyTimeMinutes: number;
        currentStreak: number;
        longestStreak: number;
        lastActiveDate: string;
        totalNodes?: number;
    };
    goals?: {
        weeklyMapGoal: number;
        monthlyMapGoal: number;
    };
    activity?: Record<string, {
        mapsCreated?: number;
        nestedExpansions?: number;
        imagesGenerated?: number;
        studyTimeMinutes?: number;
        nodesCreated?: number;
    }>;
    apiSettings?: {
        provider?: 'pollinations';
        imageProvider?: 'pollinations';
        pollinationsModel?: string;
        pollinationsApiKey?: string;
    };
}
export default function ProfilePage() {
    const router = useRouter();
    const { user, firestore, auth } = useFirebase();
    const { pollenBalance, refreshBalance } = useAIConfig();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [activeMapsCount, setActiveMapsCount] = useState(0);
    const [userMaps, setUserMaps] = useState<any[]>([]);
    const [isLoadingMaps, setIsLoadingMaps] = useState(false);
    const [chatCount, setChatCount] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'overview' | 'lab' | 'preferences' | 'security'>(
        (searchParams.get('tab') as 'overview' | 'lab' | 'preferences' | 'security') || 'overview'
    );
    const isSetupMode = searchParams.get('setup') === 'true';
    const [isSyncing, setIsSyncing] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [preferredModel, setPreferredModel] = useState('flux');
    const [isSavingKey, setIsSavingKey] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);
    const [balanceError, setBalanceError] = useState<string | null>(null);
    const [lastBalanceCheck, setLastBalanceCheck] = useState<Date | null>(null);
    const [editingGoal, setEditingGoal] = useState(false);
    const [goalInput, setGoalInput] = useState('');
    const [editingMonthly, setEditingMonthly] = useState(false);
    const [monthlyInput, setMonthlyInput] = useState('');
    const [userHeatmapMonth, setUserHeatmapMonth] = useState<Date>(new Date());
    const [selectedSourceMap, setSelectedSourceMap] = useState<any | null>(null);


    // Load profile data
    useEffect(() => {
        if (!user || !firestore) {
            setLoading(false);
            return;
        }

        let unsubscribeProfile: (() => void) | null = null;
        let unsubscribeMaps: (() => void) | null = null;

        const setupListeners = async () => {
            try {
                // Set up real-time listener for profile
                const userRef = doc(firestore, 'users', user.uid);
                unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const profileData: UserProfile = {
                            displayName: data.displayName || user.displayName || 'ADMIN',
                            email: data.email || user.email || '',
                            photoURL: data.photoURL || user.photoURL,
                            activeBadgeId: data.activeBadgeId,
                            preferences: {
                                preferredLanguage: data.preferences?.preferredLanguage || 'en',
                                defaultAIPersona: data.preferences?.defaultAIPersona?.toLowerCase() || 'concise',
                                defaultDepth: data.preferences?.defaultDepth || 'auto',
                                defaultExplanationMode: data.preferences?.defaultExplanationMode,
                                autoGenerateImages: data.preferences?.autoGenerateImages,
                                deepExpansionMode: data.preferences?.deepExpansionMode || false,
                                defaultMapView: data.preferences?.defaultMapView,
                                autoSaveFrequency: data.preferences?.autoSaveFrequency,
                            },
                            statistics: {
                                totalMapsCreated: data.statistics?.totalMapsCreated || 0,
                                totalNestedExpansions: data.statistics?.totalNestedExpansions || 0,
                                totalImagesGenerated: data.statistics?.totalImagesGenerated || 0,
                                totalStudyTimeMinutes: data.statistics?.totalStudyTimeMinutes || 0,
                                currentStreak: data.statistics?.currentStreak || 0,
                                longestStreak: data.statistics?.longestStreak || 0,
                                lastActiveDate: data.statistics?.lastActiveDate || '',
                                totalNodes: data.statistics?.totalNodes || 0,
                            },
                            apiSettings: {
                                provider: data.apiSettings?.provider || 'pollinations',
                                imageProvider: data.apiSettings?.imageProvider || 'pollinations',
                                pollinationsModel: data.apiSettings?.pollinationsModel || '',
                                pollinationsApiKey: data.apiSettings?.pollinationsApiKey || '',
                            },
                            goals: data.goals,
                            activity: data.activity || {},
                        };
                        setProfile(profileData);
                        setEditName(profileData.displayName);
                        setApiKeyInput(profileData.apiSettings?.pollinationsApiKey || '');

                        // Sync active maps count in real-time indirectly? 
                        // Actually, it's better to just fetch it here or use a separate listener.
                        // For now, let's keep the one-time fetch but make it more robust.
                    } else {
                        const defaultData: UserProfile = {
                            displayName: user.displayName || 'ADMIN',
                            email: user.email || '',
                            photoURL: user.photoURL || undefined,
                            preferences: {
                                preferredLanguage: 'en',
                                defaultAIPersona: 'concise',
                                defaultDepth: 'auto',
                                autoGenerateImages: false,
                                deepExpansionMode: false,
                            },
                            apiSettings: {
                                provider: 'pollinations',
                                imageProvider: 'pollinations',
                                pollinationsModel: '',
                                pollinationsApiKey: '',
                            },
                            statistics: {
                                totalMapsCreated: 0,
                                totalNestedExpansions: 0,
                                totalImagesGenerated: 0,
                                totalStudyTimeMinutes: 0,
                                currentStreak: 0,
                                longestStreak: 0,
                                lastActiveDate: '',
                                totalNodes: 0,
                            },
                        };
                        setProfile(defaultData);
                        setEditName(defaultData.displayName);
                    }
                    setLoading(false);
                }, (error) => {
                    // Ignore permission errors that happen during logout
                    if (error.code !== 'permission-denied') {
                        console.error("Profile snapshot error:", error);
                    }
                });

                // Get active maps and sync analytics (real-time listener)
                const mapsRef = collection(firestore, 'users', user.uid, 'mindmaps');
                const mapsQuery = query(mapsRef, orderBy('updatedAt', 'desc'));
                unsubscribeMaps = onSnapshot(mapsQuery, (snapshot) => {
                    setActiveMapsCount(snapshot.size);
                    const mapsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setUserMaps(mapsData);
                });

                // Fetch chat count
                getCountFromServer(collection(firestore, 'users', user.uid, 'chatSessions')).then(snap => {
                    setChatCount(snap.data().count);
                });

            } catch {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load profile' });
                setLoading(false);
            }
        };

        setupListeners();

        // Load additional image settings
        getUserImageSettings(firestore, user.uid).then(settings => {
            if (settings?.preferredModel) {
                let prefModel = settings.preferredModel;
                if (prefModel === 'flux-pro' || prefModel === 'klein-large') prefModel = 'flux';
                setPreferredModel(prefModel);
            }
        });

        return () => {
            if (unsubscribeProfile) unsubscribeProfile();
            if (unsubscribeMaps) unsubscribeMaps();
        };
    }, [user, firestore, toast]);

    const savePreference = async (key: string, value: string) => {
        if (!user || !firestore) return;
        try {
            await setDoc(doc(firestore, 'users', user.uid), { preferences: { [key]: value } }, { merge: true });
            toast({ title: 'Saved', description: 'Preference updated.' });
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update preferences.' });
        }
    };

    // Calculate Analytics Metrics
    const { 
        userHealthScore, 
        engagementRate, 
        avgNodesPerMap, 
        mapsThisWeek, 
        nodesThisWeek 
    } = React.useMemo(() => {
        if (!userMaps.length) return { userHealthScore: 0, engagementRate: 0, avgNodesPerMap: 0, mapsThisWeek: 0, nodesThisWeek: 0 };
        
        const totalMaps = userMaps.length;
        const totalNodes = userMaps.reduce((acc, m) => acc + (m.nodeCount || 0), 0);
        const avgNodes = Math.round(totalNodes / totalMaps);
        
        // Calculate weekly stats
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const mapsThisWeekList = userMaps.filter(m => {
            const d = m.createdAt?.toMillis ? m.createdAt.toMillis() : (m.createdAt instanceof Date ? m.createdAt.getTime() : new Date(m.createdAt).getTime());
            return d > oneWeekAgo.getTime();
        });
        const mapsWeek = mapsThisWeekList.length;
        const nodesWeek = mapsThisWeekList.reduce((acc, m) => acc + (m.nodeCount || 0), 0);

        // Engagement: maps per active day in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeDays = new Set();
        userMaps.forEach(m => {
            const d = m.createdAt?.toMillis ? m.createdAt.toMillis() : (m.createdAt instanceof Date ? m.createdAt.getTime() : new Date(m.createdAt).getTime());
            if (d > thirtyDaysAgo.getTime()) {
                activeDays.add(new Date(d).toDateString());
            }
        });
        const engagement = activeDays.size > 0 ? Number(((userMaps.filter(m => {
            const d = m.createdAt?.toMillis ? m.createdAt.toMillis() : (m.createdAt instanceof Date ? m.createdAt.getTime() : new Date(m.createdAt).getTime());
            return d > thirtyDaysAgo.getTime();
        }).length / activeDays.size) * 10).toFixed(1)) : 0;

        // Health Score (0-100) - based on streak, engagement, and node density
        const healthBase = Math.min(100, ( (profile?.statistics?.currentStreak || 0) * 5) + (engagement * 2) + (avgNodes / 2));
        const health = Math.round(healthBase);

        return {
            userHealthScore: health,
            engagementRate: engagement,
            avgNodesPerMap: avgNodes,
            mapsThisWeek: mapsWeek,
            nodesThisWeek: nodesWeek
        };
    }, [userMaps, profile?.statistics?.currentStreak]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !firestore) return;

        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                await setDoc(doc(firestore, 'users', user.uid), { photoURL: base64String }, { merge: true });
                toast({ title: 'Success', description: 'Profile picture updated.' });
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error uploading image:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to upload image' });
        }
    };

    const saveDisplayName = async () => {
        if (!user || !firestore || !editName.trim()) return;
        setIsSaving(true);
        try {
            await setDoc(doc(firestore, 'users', user.uid), { displayName: editName.trim() }, { merge: true });

            // Sync with Firebase Auth
            await updateProfile(user, { displayName: editName.trim() });

            setIsEditing(false);
            toast({ title: 'Saved', description: 'Your name has been updated.' });
        } catch (error) {
            console.error('Error saving name:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save name' });
        } finally {
            setIsSaving(false);
        }
    };


    const fetchPollenBalance = async (keyOverride?: string) => {
        if (!user) return;
        setIsLoadingBalance(true);
        setBalanceError(null);
        try {
            await refreshBalance();
            setLastBalanceCheck(new Date());
        } catch {
            setBalanceError('Network error. Try again.');
        } finally {
            setIsLoadingBalance(false);
        }
    };

    // Auto-fetch balance when profile loads with an existing key
    useEffect(() => {
        if (profile?.apiSettings?.pollinationsApiKey && user) {
            fetchPollenBalance(profile.apiSettings.pollinationsApiKey);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.apiSettings?.pollinationsApiKey, user?.uid]);

    const handleSaveApiKey = async () => {
        if (!user || !firestore || !apiKeyInput.trim()) {
            toast({ variant: 'destructive', title: 'Input Required', description: 'Please enter an API key first.' });
            return;
        }

        setIsSavingKey(true);
        try {
            // 1. Verify the key first by checking balance
            const result = await checkPollenBalanceAction({
                apiKey: apiKeyInput.trim(),
                userId: user.uid,
            });

            if (result.error || result.balance === null) {
                toast({ 
                    variant: 'destructive', 
                    title: 'Verification Failed', 
                    description: result.error || 'Invalid API key or network error.' 
                });
                return;
            }

            // 2. If valid, save the key
            await saveUserApiKey(firestore, user.uid, apiKeyInput.trim(), preferredModel);
            
            // 3. Update global balance state immediately
            await refreshBalance();
            setLastBalanceCheck(new Date());
            
            toast({ 
                title: 'Success', 
                description: `API Key verified and saved. Balance: ${result.balance.toLocaleString()} Pollen` 
            });

        } catch (error: any) {
            console.error('Error verifying/saving API key:', error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to process request.' });
        } finally {
            setIsSavingKey(false);
        }
    };

    const handleSaveModelPreference = async (modelId: string) => {
        if (!user || !firestore) return;
        setIsSavingKey(true);
        try {
            setPreferredModel(modelId);
            await saveUserApiKey(firestore, user.uid, apiKeyInput, modelId);
            toast({ title: 'Preference Saved', description: `Default model set to ${modelId}` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSavingKey(false);
        }
    };

    const handleLogout = async () => {
        try {
            if (auth) {
                await signOut(auth);
                router.push('/');
            }
        } catch (error) {
            console.error("Logout error:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to sign out' });
        }
    };

    const handleSyncStatus = async () => {
        if (!user || !firestore) return;
        setIsSyncing(true);
        try {
            await syncHistoricalStatistics(firestore, user.uid);
            toast({
                title: 'Statistics Synced!',
                description: 'Your historical activity data has been aggregated into your profile.',
            });
        } catch (error) {
            console.error('Sync error:', error);
            toast({
                variant: 'destructive',
                title: 'Sync Failed',
                description: 'Could not process historical data sync.',
            });
        } finally {
            setIsSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        );
    }

    if (!user || !profile) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <Card className="bg-zinc-900/90 border-zinc-800 max-w-sm w-full text-center p-8">
                    <LogOut className="h-12 w-12 text-violet-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">Not Signed In</h2>
                    <p className="text-zinc-400 text-sm mb-6">Sign in to view your profile</p>
                    <Button onClick={() => router.push('/')} className="bg-violet-600 hover:bg-violet-700">
                        Go Home
                    </Button>
                </Card>
            </div>
        );
    }

    const memberSince = user.metadata?.creationTime
        ? format(new Date(user.metadata.creationTime), 'MMM yyyy')
        : 'New';

    const stats = {
        currentMaps: activeMapsCount,
        totalMapsCreated: profile.statistics.totalMapsCreated || 0,
        streak: profile.statistics.currentStreak,
        longestStreak: profile.statistics.longestStreak || 0,
        nodes: profile.statistics.totalNodes || 0,
        depth: profile.statistics.totalNestedExpansions || 0,
        images: profile.statistics.totalImagesGenerated || 0,
        studyMinutes: profile.statistics.totalStudyTimeMinutes || 0,
        lastActiveDate: profile.statistics.lastActiveDate || '',
        weeklyGoal: profile.goals?.weeklyMapGoal || 5,
    };

    
    // Last active label
    const lastActiveLabel = (() => {
        if (!stats.lastActiveDate) return 'Never';
        const today = format(new Date(), 'yyyy-MM-dd');
        const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
        if (stats.lastActiveDate === today) return 'Today';
        if (stats.lastActiveDate === yesterday) return 'Yesterday';
        const diff = Math.floor((Date.now() - new Date(stats.lastActiveDate).getTime()) / 86400000);
        return `${diff}d ago`;
    })();

    // Build 84-day heatmap grid (12 weeks) from activity log
    const heatmapDays = (() => {
        const activity = profile.activity || {};
        const days: { date: string; count: number; maps: number; images: number; expansions: number; studyMinutes: number }[] = [];
        for (let i = 83; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = format(d, 'yyyy-MM-dd');
            const day = activity[key];
            const maps = day?.mapsCreated || 0;
            const expansions = day?.nestedExpansions || 0;
            const images = day?.imagesGenerated || 0;
            const studyMinutes = day?.studyTimeMinutes || 0;
            days.push({ date: key, count: maps + expansions + images, maps, images, expansions, studyMinutes });
        }
        return days;
    })();

    // Helper for duration formatting
    const formatDuration = (minutes: number | undefined | null) => {
        if (!minutes || isNaN(minutes)) return '0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins}m`;
        return `${hours}h ${mins}m`;
    };

    // Helper for navigation items
    const navItems = [
        { id: 'overview', label: 'Dashboard', icon: Brain, desc: 'Your learning metrics and activity history' },
        { id: 'lab', label: 'AI Lab', icon: Sparkles, desc: 'Experimental AI features and tools' },
        { id: 'preferences', label: 'Preferences', icon: Settings, desc: 'Customize your MindScape experience' },
        { id: 'security', label: 'Security', icon: Lock, desc: 'Manage your personal access keys' },
    ] as const;

    return (
        <div className="h-[calc(100vh-80px)] bg-zinc-950 text-zinc-100 flex overflow-hidden selection:bg-violet-500/30 font-sans">
            {/* Welcome Setup Dialog for New Users */}
            {isSetupMode && !profile?.displayName && !isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-zinc-900 p-8 shadow-2xl">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Welcome to MindScape!</h2>
                            <p className="text-muted-foreground">Let's set up your profile. What should we call you?</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-white mb-2 block">Your Name</label>
                                <Input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="h-12 bg-zinc-800 border-white/10 text-white placeholder:text-zinc-500"
                                    autoFocus
                                />
                            </div>
                            
                            <Button
                                onClick={async () => {
                                    if (!editName.trim()) {
                                        toast({ variant: 'destructive', title: 'Name required', description: 'Please enter your name.' });
                                        return;
                                    }
                                    setIsSaving(true);
                                    try {
                                        await setDoc(doc(firestore!, 'users', user!.uid), { displayName: editName.trim() }, { merge: true });
                                        await updateProfile(user!, { displayName: editName.trim() });
                                        toast({ title: 'Profile saved!', description: 'Welcome to MindScape!' });
                                        setProfile((prev: any) => prev ? { ...prev, displayName: editName.trim() } : prev);
                                        router.replace('/profile');
                                    } catch (error) {
                                        console.error('Error saving name:', error);
                                        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save name' });
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                                disabled={isSaving || !editName.trim()}
                                className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-700 hover:to-purple-500 text-white font-semibold"
                            >
                                {isSaving ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <>Continue to MindScape</>
                                )}
                            </Button>
                            
                            <p className="text-xs text-center text-zinc-500">
                                You can always change this later in your profile settings.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Professional Background Layer */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full animate-pulse duration-[10s]" />
                <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse duration-[15s]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)] opacity-50" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
            </div>

            {/* Sidebar Navigation */}
            <aside className="hidden lg:flex w-85 border-r border-white/5 bg-zinc-950/40 backdrop-blur-3xl flex-col z-20 relative h-full">
                <div className="p-8 flex flex-col h-full overflow-hidden">
                    {/* Glassmorphic Identity Card */}
                    <div className="mb-10 shrink-0">
                        <div className="relative group p-6 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden active:scale-[0.98] transition-all duration-300">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 blur-2xl rounded-full -translate-y-8 translate-x-8" />
                            
                            <div className="flex items-center gap-5 mb-6 relative z-10">
                                <div className="relative group/avatar cursor-pointer">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-2xl blur-md opacity-40 group-hover/avatar:opacity-80 transition-opacity" />
                                    <Avatar className="h-16 w-16 rounded-2xl border-2 border-white/10 p-0.5 relative z-10">
                                        <AvatarImage src={profile.photoURL} className="rounded-[14px] object-cover" />
                                        <AvatarFallback className="bg-zinc-950 text-xl font-black text-violet-400 rounded-[14px]">
                                            {profile.displayName?.charAt(0)?.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute -bottom-2 -right-2 p-1.5 bg-zinc-900 border border-white/10 rounded-xl text-violet-400 hover:text-white hover:bg-violet-600 transition-all shadow-xl z-20"
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </button>
                                </div>
                                <div className="flex-1 min-w-0">
                                    {isEditing ? (
                                        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="h-7 text-xs font-bold bg-transparent border-none focus-visible:ring-0 text-white p-0 px-1"
                                                autoFocus
                                            />
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={saveDisplayName} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors">
                                                    <Check className="h-3 w-3" />
                                                </button>
                                                <button onClick={() => setIsEditing(false)} className="p-1 text-zinc-500 hover:bg-white/5 rounded-lg transition-colors">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="group/name flex items-center gap-2 cursor-pointer"
                                            onClick={() => setIsEditing(true)}
                                        >
                                            <p className="text-xl font-black text-white truncate tracking-tight">{profile.displayName}</p>
                                            <Edit2 className="h-3 w-3 text-violet-400 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
                                        </div>
                                    )}
                                    <p className="text-[10px] text-zinc-500 truncate font-bold uppercase tracking-wider mt-0.5">{profile.email}</p>
                                </div>
                            </div>

                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center px-1">
                                    <p className="text-[9px] font-black text-violet-400/60 uppercase tracking-[0.2em]">{memberSince}</p>
                                </div>
                                <div className="p-3 bg-black/30 rounded-2xl border border-white/5 flex items-center justify-between group/id">
                                    <div className="min-w-0">
                                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">Explorer Hash</p>
                                        <p className="text-[9px] font-mono text-zinc-400 truncate w-32">{user.uid}</p>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 rounded-xl hover:bg-white/10 text-zinc-500 hover:text-white transition-all shrink-0"
                                        onClick={() => {
                                            navigator.clipboard.writeText(user.uid);
                                            toast({ title: "Copied", description: "Explorer ID copied." });
                                        }}
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Items */}
                    <nav className="space-y-2.5 flex-1 pr-2 custom-scrollbar">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`
                                        w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 relative group
                                        ${isActive
                                            ? 'bg-white/5 text-white border border-white/10 shadow-xl'
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}
                                    `}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 w-1.5 h-6 bg-violet-500 rounded-r-full shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
                                    )}
                                    <div className={`
                                        p-2.5 rounded-xl transition-all duration-500
                                        ${isActive ? 'bg-violet-500/20 text-violet-400 shadow-inner' : 'bg-transparent'}
                                    `}>
                                        <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : 'group-hover:text-zinc-300'}`} />
                                    </div>
                                    <div className="text-left">
                                        <p className={`text-sm font-black tracking-tight ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                                            {item.label}
                                        </p>
                                    </div>
                                    {isActive && <ChevronRight className="h-4 w-4 ml-auto text-violet-500/50" />}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Footer Actions */}
                    <div className="pt-8 border-t border-white/5">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                        >
                            <div className="p-2.5 rounded-xl transition-all bg-red-500/10 text-red-500/60 group-hover:text-red-500 shadow-sm">
                                <LogOut className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-black tracking-tight uppercase">Sign Out</p>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
                <div className="max-w-6xl mx-auto px-6 py-8 lg:px-10">
                    {/* Header Stage */}
                    <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-20">
                        <div className="flex items-center justify-between md:block w-full md:w-auto">
                            <div className="md:hidden">
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-zinc-400">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </div>
                            <div className="hidden md:block">
                                <div className="flex items-center gap-2 text-violet-400 font-black text-[9px] uppercase tracking-[0.3em] mb-3">
                                    <span className="opacity-50">Profile Core</span>
                                    <ChevronRight className="h-2.5 w-2.5 opacity-30" />
                                    <span className="px-2 py-0.5 bg-violet-500/10 rounded-full border border-violet-500/20 text-violet-300">
                                        {activeTab === 'overview' ? 'DASHBOARD' : navItems.find(i => i.id === activeTab)?.label?.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-2 leading-none">
                                {navItems.find(i => i.id === activeTab)?.label}
                            </h1>
                            <p className="hidden md:block text-zinc-500 font-bold text-xs max-w-md leading-relaxed">
                                {navItems.find(i => i.id === activeTab)?.desc}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                className="group h-11 px-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all shadow-xl font-black text-[9px] uppercase tracking-[0.15em]"
                                onClick={handleSyncStatus}
                                disabled={isSyncing}
                            >
                                {isSyncing ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                                ) : (
                                    <RefreshCw className="h-3.5 w-3.5 group-hover:rotate-180 transition-transform duration-700" />
                                )}
                                <span className="ml-2">Sync Neural Core</span>
                            </Button>
                        </div>
                    </header>

                    {/* Active Section Hub */}
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                {/* Dashboard Stats Grid - 6 Cards in one row */}
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                                    {[
                                        { label: 'Current Mindmap', value: stats.currentMaps, icon: Map, color: 'violet' },
                                        { label: 'Total Mindmap', value: stats.totalMapsCreated, icon: Library, color: 'purple' },
                                        { label: 'Nodes', value: stats.nodes || 0, icon: Layers, color: 'blue' },
                                        { label: 'Images', value: stats.images || 0, icon: ImageIcon, color: 'pink' },
                                        { label: 'Streak', value: `${stats.streak || 0}d`, icon: Zap, color: 'yellow' },
                                        { label: 'Study Time', value: formatDuration(stats.studyMinutes), icon: Clock, color: 'emerald' },
                                    ].map((stat, idx) => (
                                        <div 
                                            key={stat.label} 
                                            className="relative overflow-hidden p-4 rounded-2xl bg-zinc-900/40 border border-white/5 transition-all duration-300 hover:border-white/10 group flex flex-col gap-3"
                                        >
                                            <div className={`absolute top-0 right-0 w-16 h-16 bg-${stat.color}-500/5 rounded-full blur-2xl group-hover:bg-${stat.color}-500/10 transition-colors`} />
                                            {/* Top row: icon + label */}
                                            <div className="relative flex items-center gap-2">
                                                <div className={`p-2 rounded-xl bg-${stat.color}-500/10 border border-${stat.color}-500/20 transition-transform group-hover:scale-110 duration-500`}>
                                                    <stat.icon className={`h-3.5 w-3.5 text-${stat.color}-400`} />
                                                </div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 leading-tight">{stat.label}</p>
                                            </div>
                                            {/* Bottom: large value */}
                                            <p className="relative text-2xl font-black text-white tracking-tighter leading-none">
                                                {stat.value}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-10 pb-20">
                                    {/* Activity Timeline / Heatmap */}
                                    <div className="rounded-2xl bg-zinc-900/60 border border-white/5 p-8 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 blur-[100px] -translate-y-32 translate-x-32" />
                                        <div className="flex items-center justify-between mb-8 relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                                                    <Activity className="h-5 w-5 text-violet-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-white tracking-tight">Neural Activity Heatmap</h3>
                                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Historical Learning patterns</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-zinc-950/50 p-1.5 rounded-xl border border-white/5">
                                                <Button
                                                    variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/5"
                                                    onClick={() => setUserHeatmapMonth(new Date(userHeatmapMonth.getFullYear(), userHeatmapMonth.getMonth() - 1, 1))}
                                                >
                                                    <ChevronLeft className="h-4 w-4 text-zinc-400" />
                                                </Button>
                                                <span className="text-[10px] font-black text-white min-w-[120px] text-center uppercase tracking-widest">
                                                    {format(userHeatmapMonth, 'MMMM yyyy')}
                                                </span>
                                                <Button
                                                    variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/5"
                                                    onClick={() => setUserHeatmapMonth(new Date(userHeatmapMonth.getFullYear(), userHeatmapMonth.getMonth() + 1, 1))}
                                                    disabled={new Date(userHeatmapMonth.getFullYear(), userHeatmapMonth.getMonth() + 1, 1) > new Date()}
                                                >
                                                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mb-6 relative z-10">
                                            <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Less</span>
                                            {['bg-zinc-800', 'bg-violet-900/60', 'bg-violet-700/70', 'bg-violet-500', 'bg-violet-400'].map((c, i) => (
                                                <div key={i} className={`h-3 w-3 rounded-sm ${c} shadow-sm`} />
                                            ))}
                                            <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">More</span>
                                        </div>
                                        <TooltipProvider delayDuration={0}>
                                            <div className="grid grid-cols-[repeat(auto-fill,minmax(28px,1fr))] gap-1 relative z-10">
                                                <ActivityHeatmap 
                                                    userActivity={profile.activity || {}} 
                                                    userHeatmapMonth={userHeatmapMonth} 
                                                />
                                            </div>
                                        </TooltipProvider>
                                    </div>

                                    {/* Map Analytics Insights */}
                                    {userMaps.length > 0 && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 border-l-4 border-violet-500 pl-4 py-1">
                                                <div>
                                                    <h3 className="text-xl font-black text-white tracking-tight uppercase">Mindmap Analytics</h3>
                                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Deep metrics on your map ecosystem</p>
                                                </div>
                                            </div>
                                            <UserMapAnalytics userMaps={userMaps} />
                                        </div>
                                    )}

                                    {/* Achievements Grid */}
                                    {((profile as any).unlockedAchievements || []).length > 0 && (
                                        <div className="rounded-2xl bg-zinc-900/60 border border-white/5 p-8 relative overflow-hidden group">
                                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 blur-[100px] translate-y-32 -translate-x-32" />
                                            <div className="flex items-center gap-4 mb-8">
                                                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                                    <Trophy className="h-5 w-5 text-amber-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-white tracking-tight">Achievements ({(profile as any).unlockedAchievements.length})</h3>
                                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Unlocked through your learning journey</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2.5">
                                                {(profile as any).unlockedAchievements.map((a: string) => (
                                                    <div key={a} className="group/ach hover:scale-105 transition-all cursor-default">
                                                        <Badge className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border-amber-500/20 text-amber-400 font-black text-[9px] px-3 py-1.5 rounded-xl uppercase tracking-tighter shadow-lg shadow-amber-500/5">
                                                            {a.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Mindmaps Governance Table */}
                                    <div className="rounded-2xl bg-zinc-900/60 border border-white/5 p-8 relative overflow-hidden group">
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                                        <div className="flex items-center justify-between mb-8 relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                                    <Library className="h-5 w-5 text-blue-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-white tracking-tight">Mindmap Index ({userMaps.length})</h3>
                                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Manage and access your map library</p>
                                                </div>
                                            </div>
                                        </div>

                                        {isLoadingMaps ? (
                                            <div className="py-20 flex flex-col items-center gap-4">
                                                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Syncing with Cloud Registry...</p>
                                            </div>
                                        ) : userMaps.length > 0 ? (
                                            <div className="overflow-x-auto -mx-8 px-8 custom-scrollbar">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="border-b border-white/5">
                                                            <th className="text-left text-[10px] font-black uppercase text-zinc-500 pb-4 pl-2 tracking-widest">Concept Title</th>
                                                            <th className="text-center text-[10px] font-black uppercase text-zinc-500 pb-4 tracking-widest">Created</th>
                                                            <th className="text-center text-[10px] font-black uppercase text-zinc-500 pb-4 tracking-widest">Nodes</th>
                                                            <th className="text-center text-[10px] font-black uppercase text-zinc-500 pb-4 tracking-widest">Views</th>
                                                            <th className="text-center text-[10px] font-black uppercase text-zinc-500 pb-4 tracking-widest">Source</th>
                                                            <th className="text-center text-[10px] font-black uppercase text-zinc-500 pb-4 tracking-widest">Mode</th>
                                                            <th className="text-center text-[10px] font-black uppercase text-zinc-500 pb-4 tracking-widest">Depth</th>
                                                            <th className="text-center text-[10px] font-black uppercase text-zinc-500 pb-4 tracking-widest">Persona</th>
                                                            <th className="text-right text-[10px] font-black uppercase text-zinc-500 pb-4 pr-2 tracking-widest">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {userMaps.map(m => (
                                                            <tr key={m.id} className="group/row hover:bg-white/[0.02] transition-colors relative">
                                                                <td className="py-4 pl-2">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 group-hover/row:scale-110 transition-transform">
                                                                            <Map className="h-4 w-4 text-violet-400" />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <span className="text-xs font-black text-white truncate max-w-[220px] block group-hover/row:text-violet-400 transition-colors">
                                                                                {m.shortTitle || m.topic || m.title || 'Untitled Map'}
                                                                            </span>
                                                                            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block mt-0.5">ID: {m.id?.substring(0, 8)}...</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 text-center">
                                                                    <span className="text-[10px] font-bold text-zinc-400 family-mono">
                                                                        {m.createdAt ? format(m.createdAt.toMillis ? m.createdAt.toMillis() : (m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt)), 'dd/MM/yy HH:mm') : '-'}
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 text-center">
                                                                    <span className="px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400">{m.nodeCount || 0}</span>
                                                                </td>
                                                                <td className="py-4 text-center">
                                                                    <span className="text-[10px] font-bold text-emerald-500 flex items-center justify-center gap-1.5" title="Community Views">
                                                                        <Eye className="h-3.5 w-3.5 text-emerald-600" />{m.publicViews || 0}
                                                                    </span>
                                                                </td>
                                                                {/* Source Column */}
                                                                <td className="py-4 text-center">
                                                                    {(() => {
                                                                        const st = m.sourceFileType || m.sourceType;
                                                                        const isMulti = st === 'multi';
                                                                        const icon = st === 'youtube' || m.videoId ? '🎥' : st === 'pdf' ? '📄' : st === 'image' ? '🖼️' : st === 'website' || m.sourceUrl ? '🌐' : isMulti ? '📦' : '📝';
                                                                        const color = st === 'youtube' || m.videoId ? 'text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20' : st === 'pdf' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20' : st === 'image' ? 'text-pink-400 bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20' : st === 'website' || m.sourceUrl ? 'text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20' : isMulti ? 'text-violet-400 bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20' : 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20 hover:bg-zinc-500/20';
                                                                        const label = st === 'youtube' || m.videoId ? 'Video' : st === 'pdf' ? 'PDF' : st === 'image' ? 'Image' : st === 'website' || m.sourceUrl ? 'Web' : isMulti ? 'Multi' : 'Text';
                                                                        return (
                                                                            <button
                                                                                onClick={() => setSelectedSourceMap(m)}
                                                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-tighter transition-all ${color}`}
                                                                                title="View source"
                                                                            >
                                                                                <span>{icon}</span>
                                                                                <span>{label}</span>
                                                                            </button>
                                                                        );
                                                                    })()}
                                                                </td>
                                                                <td className="py-4 text-center">
                                                                    <span className="text-[9px] font-black text-violet-400/80 uppercase tracking-tighter">{m.mode || 'single'}</span>
                                                                </td>
                                                                <td className="py-4 text-center">
                                                                    <span className={`text-[9px] font-black uppercase tracking-tighter ${
                                                                        m.depth === 'deep' ? 'text-blue-400' : m.depth === 'medium' ? 'text-indigo-400' : 'text-violet-400'
                                                                    }`}>{m.depth === 'deep' ? 'DETAILED' : m.depth === 'medium' ? 'BALANCED' : 'QUICK'}</span>
                                                                </td>
                                                                <td className="py-4 text-center">
                                                                    <Badge variant="outline" className="bg-transparent border-zinc-800 text-[8px] font-black uppercase tracking-tighter text-cyan-400">
                                                                        {m.aiPersona || 'Teacher'}
                                                                    </Badge>
                                                                </td>
                                                                <td className="py-4 text-right pr-2">
                                                                    <Button 
                                                                        variant="ghost" size="icon"
                                                                        className="h-8 w-8 rounded-lg hover:bg-violet-500/10 text-zinc-500 hover:text-violet-400 transition-all"
                                                                        onClick={() => window.open(`/canvas?mapId=${m.id}&ownerId=${user.uid}`, '_blank')}
                                                                    >
                                                                        <ExternalLink className="h-4 w-4" />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="py-16 text-center">
                                                <Map className="h-10 w-10 text-zinc-800 mx-auto mb-4" />
                                                <p className="text-sm font-black text-zinc-500 uppercase tracking-widest">No neural index found</p>
                                                <p className="text-[9px] text-zinc-600 font-bold mt-1">Start generating mindmaps to see them here.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Source Viewer Dialog ── */}
                        {selectedSourceMap && (
                            <SourceViewerDialog 
                                map={selectedSourceMap} 
                                onClose={() => setSelectedSourceMap(null)} 
                            />
                        )}

                        {activeTab === 'lab' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Neural Link Module */}
                                <div className="space-y-6">
                                    <div className="group relative rounded-[2rem] p-8 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 shadow-2xl overflow-hidden">
                                        <div className="flex items-center gap-4 mb-8 relative z-10">
                                            <div className="p-4 bg-violet-500/10 rounded-2xl border border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                                                <Key className="h-5 w-5 text-violet-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-white tracking-tight">Access Link</h3>
                                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Universal Engine Connectivity</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6 relative z-10">
                                            <button
                                                onClick={() => {
                                                    const params = new URLSearchParams({ redirect_url: window.location.href });
                                                    window.location.href = `https://enter.pollinations.ai/authorize?${params}`;
                                                }}
                                                className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl bg-gradient-to-r from-violet-600/10 to-pink-600/10 border border-violet-500/20 hover:border-violet-400/50 hover:bg-white/5 transition-all group shadow-xl"
                                            >
                                                <Sparkles className="h-4 w-4 text-violet-300 group-hover:scale-110 transition-transform" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-100">Connect to Pollinations</span>
                                            </button>

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between px-1">
                                                    <Label className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">Encrypted Token</Label>
                                                </div>
                                                <div className="relative group">
                                                    <Input
                                                        type={showApiKey ? "text" : "password"}
                                                        value={apiKeyInput}
                                                        onChange={(e) => setApiKeyInput(e.target.value)}
                                                        className="h-12 bg-black/40 border-white/5 rounded-xl px-5 pr-24 font-mono text-xs tracking-widest"
                                                        placeholder="sk_..."
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowApiKey(v => !v)}
                                                            className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
                                                        >
                                                            {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                        </button>
                                                        <Button 
                                                            onClick={handleSaveApiKey} 
                                                            disabled={isSavingKey}
                                                            className="h-8 px-4 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 text-[8px] uppercase font-black"
                                                        >
                                                            {isSavingKey ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-4 shadow-inner">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${profile.apiSettings?.pollinationsApiKey ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-800'}`} />
                                                    <div className="space-y-0.5">
                                                        <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-black">Link State</p>
                                                        <p className="text-xs font-black text-white">{profile.apiSettings?.pollinationsApiKey ? "BOUND" : "SHARED"}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-0.5 text-right">
                                                    <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-black">Pollen</p>
                                                    <p className="text-lg font-black text-white tracking-tighter">{(pollenBalance || 0).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="group relative rounded-[2rem] p-8 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 shadow-2xl h-full overflow-hidden">
                                    <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 mb-8">System Capabilities</h3>
                                    <div className="space-y-6 relative z-10">
                                        {[
                                            { title: "Priority Link", desc: "Skip global queues instantly.", icon: Target, color: 'text-blue-400' },
                                            { title: "Ultra Fidelity", desc: "Native 4K visual synthesis.", icon: Sparkles, color: 'text-pink-400' },
                                            { title: "Neural Deep", desc: "Higher cognitive depth maps.", icon: Brain, color: 'text-violet-400' },
                                            { title: "Isolated", desc: "Encrypted point-to-point requests.", icon: Lock, color: 'text-emerald-400' }
                                        ].map((item, i) => (
                                            <div key={i} className="flex gap-4 items-start group/item">
                                                <div className="p-3 rounded-xl bg-white/5 border border-white/5 shadow-inner">
                                                    <item.icon className={`h-4 w-4 ${item.color} opacity-60 group-hover/item:opacity-100 transition-opacity`} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-sm text-white mb-0.5 tracking-tight">{item.title}</h4>
                                                    <p className="text-[10px] text-zinc-500 leading-tight font-bold tracking-tight">{item.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'preferences' && (
                            <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {/* Settings Grid: Localization, AI Soul, Vision Engine */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Connectivity & Localization */}
                                    <div className="group relative rounded-[1.5rem] p-6 bg-zinc-900/40 backdrop-blur-xl border border-white/5 transition-all duration-300">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                                <Globe className="h-4 w-4 text-blue-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-black text-white truncate">Localization</h3>
                                                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Interface Culture</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4 relative z-10">
                                            <Label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 px-1">System Language</Label>
                                            <Select value={profile.preferences.preferredLanguage} onValueChange={(v) => savePreference('preferredLanguage', v)}>
                                                <SelectTrigger className="w-full h-11 bg-black/40 border-white/5 rounded-xl px-4 text-xs font-bold transition-colors">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-800 rounded-xl">
                                                    {languages.map(l => (
                                                        <SelectItem key={l.code} value={l.code} className="py-2.5 text-xs font-bold">{l.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Cognitive Persona */}
                                    <div className="group relative rounded-[1.5rem] p-6 bg-zinc-900/40 backdrop-blur-xl border border-white/5 transition-all duration-300">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
                                                <Brain className="h-4 w-4 text-violet-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-black text-white truncate">AI Personality</h3>
                                                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Cognitive Flow</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6 relative z-10">
                                            <div className="space-y-3">
                                                <Label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 px-1">Active Persona</Label>
                                                <Select value={profile.preferences.defaultAIPersona?.toLowerCase() || 'concise'} onValueChange={(v) => savePreference('defaultAIPersona', v)}>
                                                    <SelectTrigger className="w-full h-11 bg-black/40 border-white/5 rounded-xl px-4 text-xs font-bold transition-colors">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-zinc-800 rounded-xl">
                                                        {[
                                                            { id: 'teacher', label: 'Teacher' },
                                                            { id: 'concise', label: 'Concise' },
                                                            { id: 'creative', label: 'Creative' },
                                                            { id: 'sage', label: 'Cognitive Sage' },
                                                        ].map(({ id, label }) => (
                                                            <SelectItem key={id} value={id} className="py-2.5 text-xs font-bold">{label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Vision Engine */}
                                    <div className="group relative rounded-[1.5rem] p-6 bg-zinc-900/40 backdrop-blur-xl border border-white/5 transition-all duration-300">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-pink-500/10 rounded-xl border border-pink-500/20">
                                                <Wand2 className="h-4 w-4 text-pink-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-black text-white truncate">Vision Engine</h3>
                                                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Creative Hub</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4 relative z-10">
                                            <Label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 px-1">Synthesis Model</Label>
                                            <ModelSelector
                                                value={preferredModel}
                                                onChange={handleSaveModelPreference}
                                                className="w-full h-11 bg-black/40 border-white/5 rounded-xl px-4 text-xs font-bold truncate"
                                            />
                                        </div>
                                    </div>
                                </div>


                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="max-w-3xl mx-auto space-y-6 pb-20">

                                {/* Password & Access */}
                                <div className="rounded-2xl bg-zinc-900/60 border border-white/5 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-white/5">
                                        <p className="text-sm font-black text-white">Password & Access</p>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Manage how you sign in</p>
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        <div className="flex items-center justify-between p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/15">
                                                    <Key className="h-4 w-4 text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white">Change Password</p>
                                                    <p className="text-[10px] text-zinc-500 font-bold">Send a reset link to {profile.email}</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                className="h-9 px-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-[9px] font-black uppercase tracking-widest transition-all"
                                                onClick={async () => {
                                                    try {
                                                        await sendPasswordResetEmail(auth, profile.email);
                                                        toast({ title: 'Reset Email Sent', description: 'Check your inbox for the password reset link.' });
                                                    } catch (err: any) {
                                                        toast({ variant: 'destructive', description: err.message });
                                                    }
                                                }}
                                            >
                                                Send Link
                                            </Button>
                                        </div>
                                        <div className="flex items-center justify-between p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/15">
                                                    <LogOut className="h-4 w-4 text-orange-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white">Sign Out</p>
                                                    <p className="text-[10px] text-zinc-500 font-bold">End your current session</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                className="h-9 px-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 text-[9px] font-black uppercase tracking-widest transition-all"
                                                onClick={handleLogout}
                                            >
                                                Sign Out
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="rounded-2xl bg-red-950/20 border border-red-500/15 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-red-500/10">
                                        <p className="text-sm font-black text-red-400">Danger Zone</p>
                                        <p className="text-[9px] text-red-400/50 font-bold uppercase tracking-widest mt-0.5">Irreversible actions</p>
                                    </div>
                                    <div className="p-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-black text-white">Delete Account</p>
                                            <p className="text-[10px] text-zinc-500 font-bold mt-0.5">Permanently remove your account and all data. This cannot be undone.</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            className="shrink-0 h-9 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-[9px] font-black uppercase tracking-widest transition-all"
                                            onClick={() => toast({ variant: 'destructive', title: 'Contact Support', description: 'To delete your account, please contact support.' })}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

// Internal Components adapted from Admin Dashboard for Profile Use

function ActivityHeatmap({ userActivity, userHeatmapMonth }: { userActivity: any; userHeatmapMonth: Date }) {
    const year = userHeatmapMonth.getFullYear();
    const month = userHeatmapMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const days: { date: string; data: any; dateObj: Date }[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        const dateStr = format(d, 'yyyy-MM-dd');
        days.push({ date: dateStr, data: userActivity?.[dateStr], dateObj: d });
    }

    return (
        <>
            {days.map(({ date, data, dateObj }) => {
                const totalActivity = (data?.mapsCreated || 0) + (data?.imagesGenerated || 0) + (data?.studyTimeMinutes || 0);
                const intensity = totalActivity === 0 ? 'bg-zinc-800' : totalActivity <= 2 ? 'bg-violet-900/60' : totalActivity <= 5 ? 'bg-violet-700/70' : totalActivity <= 10 ? 'bg-violet-500' : 'bg-violet-400';
                const isToday = format(today, 'yyyy-MM-dd') === date;
                const isFuture = dateObj > today;

                return (
                    <Tooltip key={date}>
                        <TooltipTrigger asChild>
                            <div className={`aspect-square flex items-center justify-center rounded-sm ${intensity} hover:ring-2 hover:ring-violet-400/50 transition-all cursor-default ${isToday ? 'ring-2 ring-white/30' : ''} ${isFuture ? 'opacity-30' : ''}`}>
                                <span className="text-[7px] text-white/70 font-bold">{format(new Date(date), 'd')}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-zinc-900 border-zinc-700 text-[10px] font-bold p-3 min-w-[150px]">
                            <p className="text-zinc-300 font-black mb-2 border-b border-zinc-700 pb-1">{format(new Date(date), 'EEEE, MMM d')}</p>
                            <div className="space-y-1">
                                <p className="text-blue-400 flex items-center gap-2"><Map className="h-3 w-3" /> {data?.mapsCreated || 0} maps</p>
                                <p className="text-pink-400 flex items-center gap-2"><ImageIcon className="h-3 w-3" /> {data?.imagesGenerated || 0} images</p>
                                <p className="text-emerald-400 flex items-center gap-2"><Clock className="h-3 w-3" /> {data?.studyTimeMinutes || 0} min</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </>
    );
}

function UserMapAnalytics({ userMaps }: { userMaps: any[] }) {
    const total = userMaps.length || 1;

    const modeCounts = { single: 0, compare: 0, multi: 0 };
    const depthCounts = { low: 0, medium: 0, deep: 0, unspecified: 0 };
    const sourceCounts: Record<string, number> = {
        'text': 0,
        'website': 0,
        'image': 0,
        'youtube': 0,
        'pdf': 0,
        'multi': 0
    };
    const personaCounts: Record<string, number> = {
        Teacher: 0,
        Concise: 0,
        Creative: 0,
        Sage: 0,
    };
    let totalSubMaps = 0;
    const parentMapIds = new Set<string>();
    const publicPrivate = { public: 0, private: 0 };

    userMaps.forEach(m => {
        // Mode
        const isMulti = m.mode === 'multi' || m.sourceFileType === 'multi' || m.sourceType === 'multi' || m.sourceFileContent?.includes('--- SOURCE:');

        if (isMulti) modeCounts.multi++;
        else if (m.mode === 'compare') modeCounts.compare++;
        else modeCounts.single++;

        // Depth
        let resolvedDepth = m.depth;
        if (!resolvedDepth || resolvedDepth === 'auto' || resolvedDepth === 'unspecified') {
            resolvedDepth = (m.nodeCount || 0) > 75 ? 'deep' : (m.nodeCount || 0) > 35 ? 'medium' : 'low';
        }

        if (resolvedDepth === 'low') depthCounts.low++;
        else if (resolvedDepth === 'medium') depthCounts.medium++;
        else if (resolvedDepth === 'deep') depthCounts.deep++;
        else depthCounts.low++; // Fallback to Quick

        // Source Type detection
        let sourceType = m.sourceFileType || m.sourceType;
        const hasMultiMarkers = m.sourceFileContent?.includes('--- SOURCE:');
        if (sourceType === 'multi' || hasMultiMarkers) {
            sourceType = 'multi';
        } else {
            sourceType = sourceType || (m.sourceUrl ? 'website' : m.videoId ? 'youtube' : 'text');
        }
        sourceCounts[sourceType] = (sourceCounts[sourceType] || 0) + 1;

        // Persona normalization
        const rawPersona = m.aiPersona;
        let persona = 'Teacher';
        const normalizedRaw = (rawPersona || '').toLowerCase().trim();
        if (normalizedRaw === 'teacher' || normalizedRaw === 'standard' || normalizedRaw === '' || !rawPersona) {
            persona = 'Teacher';
        } else if (normalizedRaw === 'concise') {
            persona = 'Concise';
        } else if (normalizedRaw === 'creative') {
            persona = 'Creative';
        } else if (normalizedRaw.includes('sage')) {
            persona = 'Sage';
        }
        personaCounts[persona] = (personaCounts[persona] || 0) + 1;

        // Sub-map stats
        if (m.isSubMap) {
            totalSubMaps++;
            if (m.parentMapId) parentMapIds.add(m.parentMapId);
        }

        // Public/Private
        if (m.isPublic) publicPrivate.public++;
        else publicPrivate.private++;
    });

    return (
        <div className="space-y-6">
            {/* Row 1: Mode & Depth */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Maps by Mode */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
                                <Map className="h-4 w-4 text-violet-400" />
                            </div>
                            <p className="text-sm font-bold text-white">Maps by Mode</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {([
                                { key: 'single', label: 'Single', value: modeCounts.single, color: 'violet' as const, icon: FileText },
                                { key: 'compare', label: 'Compare', value: modeCounts.compare, color: 'indigo' as const, icon: Copy },
                                { key: 'multi', label: 'Multi', value: modeCounts.multi, color: 'blue' as const, icon: Layers },
                            ] as const).map(({ key, label, value, color, icon: Icon }) => {
                                const percentage = Math.round((value / total) * 100);
                                return (
                                    <div key={key} className={`relative p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20 group hover:scale-105 transition-transform`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`p-1.5 rounded-lg bg-${color}-500/10 border border-${color}-500/20`}>
                                                <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                                            </div>
                                            <span className="text-xs font-medium text-zinc-300">{label}</span>
                                        </div>
                                        <div className="flex items-end justify-between">
                                            <p className="text-xl font-black text-white">{value}</p>
                                            <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[10px] font-bold text-${color}-400`}>{percentage}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Maps by Depth */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                <Layers className="h-4 w-4 text-indigo-400" />
                            </div>
                            <p className="text-sm font-bold text-white">Maps by Depth</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {([
                                { key: 'low', label: 'Quick', value: depthCounts.low, color: 'violet' as const, icon: Zap },
                                { key: 'medium', label: 'Balanced', value: depthCounts.medium, color: 'indigo' as const, icon: Layers },
                                { key: 'deep', label: 'Detailed', value: depthCounts.deep, color: 'blue' as const, icon: Layers },
                            ] as const).map(({ key, label, value, color, icon: Icon }) => {
                                const percentage = Math.round((value / total) * 100);
                                return (
                                    <div key={key} className={`relative p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20 group hover:scale-105 transition-transform`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`p-1.5 rounded-lg bg-${color}-500/10 border border-${color}-500/20`}>
                                                <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                                            </div>
                                            <span className="text-[9px] font-medium text-zinc-300 truncate">{label}</span>
                                        </div>
                                        <div className="flex items-end justify-between">
                                            <p className="text-lg font-black text-white">{value}</p>
                                            <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[8px] font-bold text-${color}-400`}>{percentage}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Source Types */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
                <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
                <div className="relative">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <Globe className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Maps by Source Type</p>
                            <p className="text-[9px] text-zinc-500 font-medium font-bold uppercase tracking-widest">Content source breakdown</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                            { type: 'text', icon: FileText, color: 'blue' as const, label: 'Text' },
                            { type: 'pdf', icon: FileText, color: 'red' as const, label: 'PDF' },
                            { type: 'website', icon: Globe, color: 'emerald' as const, label: 'Website' },
                            { type: 'image', icon: ImageIcon, color: 'pink' as const, label: 'Image' },
                            { type: 'youtube', icon: Youtube, color: 'violet' as const, label: 'YouTube' },
                            { type: 'multi', icon: Library, color: 'orange' as const, label: 'Multi' }
                        ].map(({ type, icon: Icon, color, label }) => {
                            const count = sourceCounts[type] || 0;
                            const percentage = Math.round((count / total) * 100);
                            return (
                                <div key={type} className={`relative p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20 group hover:scale-105 transition-transform ${count === 0 ? 'opacity-40' : ''}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                                        <span className="text-[10px] font-medium text-zinc-300">{label}</span>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <p className="text-xl font-black text-white">{count}</p>
                                        <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[9px] font-bold text-${color}-400`}>{percentage}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Row 3: Sub-Maps & Public vs Private */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sub-Maps Stats */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                                <Layers className="h-4 w-4 text-green-400" />
                            </div>
                            <p className="text-sm font-bold text-white">Sub-Maps Statistics</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Sub-Maps', value: totalSubMaps, color: 'violet' as const, icon: Layers },
                                { label: 'Parents', value: parentMapIds.size, color: 'indigo' as const, icon: Map },
                                { label: 'Avg/Parent', value: parentMapIds.size > 0 ? (totalSubMaps / parentMapIds.size).toFixed(1) : '0', color: 'blue' as const, icon: Activity },
                            ].map(({ label, value, color, icon: Icon }) => (
                                <div key={label} className={`relative p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20 transition-transform`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                                        <span className="text-[10px] font-medium text-zinc-300">{label}</span>
                                    </div>
                                    <p className="text-xl font-black text-white">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Public vs Private */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                                <Globe className="h-4 w-4 text-yellow-400" />
                            </div>
                            <p className="text-sm font-bold text-white">Public vs Private</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Public', value: publicPrivate.public, color: 'emerald' as const, icon: Globe },
                                { label: 'Private', value: publicPrivate.private, color: 'yellow' as const, icon: Lock },
                                { label: 'Public Rate', value: total > 0 ? Math.round((publicPrivate.public / total) * 100) : 0, color: 'orange' as const, icon: Activity, isPercent: true },
                            ].map(({ label, value, color, icon: Icon, isPercent }) => (
                                <div key={label} className={`relative p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20 transition-transform`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                                        <span className="text-[10px] font-medium text-zinc-300">{label}</span>
                                    </div>
                                    <p className="text-xl font-black text-white">{isPercent ? `${value}%` : value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 4: Persona */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 border border-white/5 p-6">
                <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/5 rounded-full blur-3xl" />
                <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
                            <Brain className="h-4 w-4 text-violet-400" />
                        </div>
                        <p className="text-sm font-bold text-white">Maps by Persona</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {([
                            { key: 'Teacher', label: 'Teacher', color: 'violet' as const, icon: BookOpen },
                            { key: 'Concise', label: 'Concise', color: 'indigo' as const, icon: Zap },
                            { key: 'Creative', label: 'Creative', color: 'blue' as const, icon: Wand2 },
                            { key: 'Sage', label: 'Cognitive Sage', color: 'emerald' as const, icon: Brain },
                        ] as const).map(({ key, label, color, icon: Icon }) => {
                            const count = personaCounts[key] || 0;
                            const percentage = Math.round((count / total) * 100);
                            return (
                                <div key={key} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/15 p-4 transition-all hover:bg-${color}-500/10`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`p-1.5 bg-${color}-500/10 rounded-lg`}>
                                            <Icon className={`h-3.5 w-3.5 text-${color}-400`} />
                                        </div>
                                        <span className="text-[8px] font-bold uppercase tracking-wider text-${color}-400/70">{label}</span>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <p className="text-2xl font-black text-white tracking-tight">{count}</p>
                                        <span className={`px-1.5 py-0.5 rounded-lg bg-${color}-500/10 text-[9px] font-bold text-${color}-400`}>{percentage}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Source Viewer Dialog Component ──
function SourceViewerDialog({ map: m, onClose }: { map: any; onClose: () => void }) {
    const st = m.sourceFileType || m.sourceType;
    const isYoutube = st === 'youtube' || !!m.videoId;
    const isPdf = st === 'pdf';
    const isImage = st === 'image';
    const isWebsite = st === 'website' || (!!m.sourceUrl && !isYoutube);
    const isMulti = st === 'multi';
    const youtubeId = m.videoId || (m.sourceUrl ? m.sourceUrl.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1] : null);

    const baseSources = React.useMemo(() => {
        let sources: Array<{ type: string; url?: string; label: string; extract?: string }> = [];
        
        if (isMulti && m.sourceFileContent && m.sourceFileContent.includes('--- SOURCE: ')) {
            const parts = m.sourceFileContent.split('--- SOURCE: ').filter(Boolean);
            sources = parts.map((part: string) => {
                const newLineIdx = part.indexOf('\n');
                let label = 'Document';
                let extract = part.trim();
                
                if (newLineIdx !== -1) {
                    label = part.substring(0, newLineIdx).replace(' ---', '').trim();
                    extract = part.substring(newLineIdx + 1).trim();
                } else {
                    label = part.replace(' ---', '').trim();
                }
                
                let type = 'text';
                const lower = label.toLowerCase();
                if (lower.endsWith('.pdf')) type = 'pdf';
                else if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) type = 'image';
                else if (lower.includes('youtube') || lower.includes('youtu.be')) type = 'youtube';
                else if (lower.startsWith('http')) type = 'website';
                
                return { type, label, extract };
            });
        } else {
            sources = isYoutube ? [{ type: 'youtube', url: m.sourceUrl, label: 'YouTube Video', extract: youtubeId }]
                : isPdf ? [{ type: 'pdf', url: m.sourceUrl, label: m.topic || 'PDF Document' }]
                : isImage ? [{ type: 'image', url: m.sourceUrl, label: m.topic || 'Source Image' }]
                : isWebsite ? [{ type: 'website', url: m.sourceUrl, label: m.sourceUrl || 'Website' }]
                : isMulti ? [{ type: 'text', label: 'Multi-Source Extract', extract: m.sourceFileContent }]
                : m.sourceFileContent ? [{ type: 'text', label: 'Source Text', extract: m.sourceFileContent }]
                : [];
        }
        return sources;
    }, [isMulti, m.sourceFileContent, m.topic, isYoutube, m.sourceUrl, youtubeId, isPdf, isImage, isWebsite]);

    const searchSources = React.useMemo(() => 
        m.searchSources?.map((s: any) => ({ type: 'website', url: s.url, label: s.title || s.url })) || []
    , [m.searchSources]);

    const sources = React.useMemo(() => [...baseSources, ...searchSources], [baseSources, searchSources]);
    const [activeSource, setActiveSource] = React.useState(sources[0] || null);

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
                            <FileText className="h-5 w-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight">Source Document</h2>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{m.shortTitle || m.topic || 'Original Input Material'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {sources.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8">
                        <FileText className="h-12 w-12 text-zinc-700" />
                        <p className="text-zinc-500 font-black uppercase tracking-widest text-sm">No source data available</p>
                        <p className="text-zinc-600 text-xs">This map may have been generated from text input without a stored source URL.</p>
                    </div>
                ) : sources.length === 1 ? (
                    /* Single source – full preview */
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {sources[0].type === 'youtube' && sources[0].extract ? (
                            <iframe
                                src={`https://www.youtube.com/embed/${sources[0].extract}`}
                                className="flex-1 w-full border-none"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="YouTube Source"
                            />
                        ) : sources[0].type === 'image' && sources[0].url ? (
                            <div className="flex-1 flex items-center justify-center bg-black/20 p-8">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={sources[0].url} alt="Source" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
                            </div>
                        ) : sources[0].type === 'website' && sources[0].url ? (
                            <div className="flex-1 flex flex-col">
                                <div className="px-8 py-3 bg-white/3 border-b border-white/5 flex items-center gap-3">
                                    <Globe className="h-4 w-4 text-blue-400 shrink-0" />
                                    <span className="text-xs text-zinc-400 font-mono truncate">{sources[0].url}</span>
                                    <a href={sources[0].url} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-400 hover:bg-blue-500/20 transition-all">
                                        Open Original <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                                <iframe src={sources[0].url} className="flex-1 w-full border-none bg-white" title="Website Source" sandbox="allow-scripts allow-same-origin" />
                            </div>
                        ) : sources[0].type === 'text' && sources[0].extract ? (
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="prose prose-invert max-w-none">
                                    <p className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mb-4 border-b border-white/5 pb-3">Extracted Text</p>
                                    <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">{sources[0].extract}</pre>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <p className="text-zinc-500 text-sm">Preview not available</p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Multi-source – cards + preview panel */
                    <div className="flex-1 flex overflow-hidden">
                        {/* Source card list */}
                        <div className="w-72 shrink-0 border-r border-white/5 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 px-2 mb-3">{sources.length} Sources</p>
                            {sources.map((src, i) => {
                                const isActive = activeSource === src;
                                const srcIcon = src.type === 'youtube' ? '🎥' : src.type === 'pdf' ? '📄' : src.type === 'image' ? '🖼️' : src.type === 'website' ? '🌐' : '📝';
                                const srcColor = src.type === 'youtube' ? 'border-red-500/30 bg-red-500/5' : src.type === 'pdf' ? 'border-orange-500/30 bg-orange-500/5' : src.type === 'image' ? 'border-pink-500/30 bg-pink-500/5' : src.type === 'website' ? 'border-blue-500/30 bg-blue-500/5' : 'border-zinc-700 bg-zinc-800/30';
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setActiveSource(src)}
                                        className={`w-full text-left p-3 rounded-2xl border transition-all ${isActive ? 'bg-violet-500/10 border-violet-500/30' : srcColor + ' hover:bg-white/5'}`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <span className="text-base mt-0.5">{srcIcon}</span>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-white truncate">{src.label}</p>
                                                {src.url && <p className="text-[9px] text-zinc-500 truncate font-mono mt-0.5">{src.url}</p>}
                                                <span className={`inline-block mt-1.5 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                                                    src.type === 'youtube' ? 'bg-red-500/10 text-red-400' : src.type === 'pdf' ? 'bg-orange-500/10 text-orange-400' : src.type === 'image' ? 'bg-pink-500/10 text-pink-400' : src.type === 'website' ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-500/10 text-zinc-400'
                                                }`}>{src.type}</span>
                                            </div>
                                            {src.url && <a href={src.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="ml-auto shrink-0 p-1 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-all mt-0.5">
                                                <ExternalLink className="h-3 w-3" />
                                            </a>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {/* Preview panel */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {activeSource?.type === 'website' && activeSource.url ? (
                                <>
                                    <div className="px-6 py-3 bg-white/3 border-b border-white/5 flex items-center gap-3 shrink-0">
                                        <Globe className="h-4 w-4 text-blue-400 shrink-0" />
                                        <span className="text-xs text-zinc-400 font-mono truncate">{activeSource.url}</span>
                                        <a href={activeSource.url} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-400 hover:bg-blue-500/20 transition-all">
                                            Open <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                    <iframe src={activeSource.url} className="flex-1 w-full border-none bg-white" title="Source Website" sandbox="allow-scripts allow-same-origin" />
                                </>
                            ) : activeSource?.type === 'youtube' && activeSource?.extract ? (
                                <iframe src={`https://www.youtube.com/embed/${activeSource.extract}`} className="flex-1 w-full border-none" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="YouTube" />
                            ) : activeSource?.type === 'image' && activeSource?.url ? (
                                <div className="flex-1 flex items-center justify-center bg-black/20 p-8">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={activeSource.url} alt="Source" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
                                </div>
                            ) : activeSource?.extract ? (
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                    <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">{activeSource.extract}</pre>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                                    <Globe className="h-10 w-10 text-zinc-700" />
                                    <p className="text-zinc-500 text-sm font-black uppercase tracking-widest">Select a source to preview</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

