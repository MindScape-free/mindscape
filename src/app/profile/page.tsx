'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, setDoc, collection, query, getDocs, onSnapshot } from 'firebase/firestore';
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
    Pencil, Edit2, Check, X, Trophy, Target, Lock, ChevronRight, Sparkles, Copy, Key, HelpCircle, RefreshCw, ShieldCheck, Activity,
    FastForward, Scale, BookOpen
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { languages } from '@/lib/languages';
import { format } from 'date-fns';
import { syncHistoricalStatistics } from '@/lib/activity-tracker';
import { ModelSelector } from '@/components/model-selector';
import { Eye, EyeOff, Menu } from 'lucide-react';
import { getUserImageSettings, saveUserApiKey } from '@/lib/firestore-helpers';
import { checkPollenBalanceAction } from '@/app/actions';

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
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [activeMapsCount, setActiveMapsCount] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'lab' | 'preferences' | 'security'>('overview');
    const [isSyncing, setIsSyncing] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [preferredModel, setPreferredModel] = useState('flux');
    const [isSavingKey, setIsSavingKey] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [pollenBalance, setPollenBalance] = useState<number | null>(null);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);
    const [balanceError, setBalanceError] = useState<string | null>(null);
    const [lastBalanceCheck, setLastBalanceCheck] = useState<Date | null>(null);



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
                            displayName: data.displayName || user.displayName || 'User',
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
                            goals: data.goals
                        };
                        setProfile(profileData);
                        setEditName(profileData.displayName);
                        setApiKeyInput(profileData.apiSettings?.pollinationsApiKey || '');

                        // Sync active maps count in real-time indirectly? 
                        // Actually, it's better to just fetch it here or use a separate listener.
                        // For now, let's keep the one-time fetch but make it more robust.
                    } else {
                        const defaultData: UserProfile = {
                            displayName: user.displayName || 'User',
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

                // Get active maps count (real-time listener)
                const mapsQuery = query(collection(firestore, 'users', user.uid, 'mindmaps'));
                unsubscribeMaps = onSnapshot(mapsQuery, (snapshot) => {
                    setActiveMapsCount(snapshot.size);
                });

            } catch (error) {
                console.error('Error loading profile:', error);
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

    // Derived state for provider mode
    const getActiveMode = (): 'default' | 'pollinations' => {
        if (profile?.apiSettings?.provider === 'pollinations') return 'pollinations';
        return 'default';
    };
    const activeMode = getActiveMode();

    const getActiveImageMode = (): 'pollinations' => {
        return 'pollinations';
    };
    const activeImageMode = getActiveImageMode();

    const setAIConfig = async (mode: 'pollinations') => {
        if (!user || !firestore) return;
        try {
            await setDoc(doc(firestore, 'users', user.uid), {
                apiSettings: { provider: 'pollinations' }
            }, { merge: true });

            toast({
                title: 'Updated',
                description: 'AI Provider set to Pollinations'
            });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings' });
        }
    };

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

    const savePreference = async (key: string, value: string) => {
        if (!user || !firestore) return;
        try {
            await setDoc(doc(firestore, 'users', user.uid), { preferences: { [key]: value } }, { merge: true });
            toast({ title: 'Saved', description: 'Preference updated.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save' });
        }
    };



    const equipBadge = async (badgeId: string) => {
        if (!user || !firestore) return;
        try {
            await setDoc(doc(firestore, 'users', user.uid), { activeBadgeId: badgeId }, { merge: true });
            toast({ title: 'Badge Equipped', description: 'Your profile badge has been updated.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to equip badge' });
        }
    };

    const fetchPollenBalance = async (keyOverride?: string) => {
        if (!user) return;
        setIsLoadingBalance(true);
        setBalanceError(null);
        try {
            const result = await checkPollenBalanceAction({
                apiKey: keyOverride || apiKeyInput || undefined,
                userId: user.uid,
            });
            if (result.error) {
                setBalanceError(result.error);
                setPollenBalance(null);
            } else {
                setPollenBalance(result.balance);
            }
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
        if (!user || !firestore) return;
        setIsSavingKey(true);
        try {
            await saveUserApiKey(firestore, user.uid, apiKeyInput, preferredModel);
            toast({ title: 'API Key Saved', description: 'Your personal access key has been updated.' });
            // Auto-refresh balance after saving a new key
            if (apiKeyInput) {
                fetchPollenBalance(apiKeyInput);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
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
        maps: profile.statistics.totalMapsCreated || activeMapsCount,
        streak: profile.statistics.currentStreak,
        nodes: profile.statistics.totalNodes || 0,
        depth: profile.statistics.totalNestedExpansions || 0,
        images: profile.statistics.totalImagesGenerated || 0,
    };

    const getActiveBadgeLabel = () => {
        return "Explorer";
    };

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
            {/* Professional Background Layer */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-violet-600/5 blur-[160px] rounded-full" />
                <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-blue-600/5 blur-[160px] rounded-full" />
            </div>

            {/* Sidebar Navigation */}
            <aside className="hidden lg:flex w-80 border-r border-white/5 bg-zinc-950/50 backdrop-blur-xl flex-col z-20 relative h-full">
                <div className="p-6 flex flex-col h-full overflow-hidden">
                    {/* Detailed User Identity at Top */}
                    <div className="mb-6 shrink-0">
                        <div className="nm-flat rounded-[2rem] p-5 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="relative group">
                                    <Avatar className="h-16 w-16 rounded-2xl nm-flat p-1">
                                        <AvatarImage src={profile.photoURL} className="rounded-[12px]" />
                                        <AvatarFallback className="bg-zinc-900 text-lg font-bold text-violet-400 rounded-[12px]">
                                            {profile.displayName?.charAt(0)?.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute -bottom-1 -right-1 p-1.5 nm-flat hover:nm-pressed rounded-lg text-violet-400 bg-zinc-900 border-none transition-all shadow-lg"
                                    >
                                        <Edit2 className="h-3 w-3" />
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                                <div className="flex-1 min-w-0 space-y-0.5">
                                    {isEditing ? (
                                        <div className="flex items-center gap-1.5 nm-pressed p-1 rounded-xl">
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
                                            <p className="text-base font-black text-white truncate">{profile.displayName}</p>
                                            <Pencil className="h-3 w-3 text-violet-400 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
                                        </div>
                                    )}
                                    <p className="text-[10px] text-zinc-500 truncate font-medium">{profile.email}</p>
                                    <p className="text-[10px] text-violet-400/50 font-bold uppercase tracking-widest">{memberSince}</p>
                                </div>
                            </div>

                            <div className="nm-pressed px-4 py-2 rounded-xl">
                                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Explorer ID</p>
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[9px] font-mono text-white/30 truncate">{user.uid}</p>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-6 w-6 rounded-lg nm-flat hover:nm-pressed bg-transparent border-none text-zinc-500 hover:text-white transition-all shrink-0"
                                        onClick={() => {
                                            navigator.clipboard.writeText(user.uid);
                                            toast({ title: "Copied", description: "Explorer ID copied." });
                                        }}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Nav Links - Scrollable if needed */}
                    <nav className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`
                                        w-full flex items-center gap-4 p-3 rounded-2xl transition-all group
                                        ${isActive
                                            ? 'nm-flat text-white'
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}
                                    `}
                                >
                                    <div className={`
                                        p-2 rounded-xl transition-all
                                        ${isActive ? 'bg-violet-500/10 nm-inset-glow' : 'bg-transparent'}
                                    `}>
                                        <Icon className={`h-5 w-5 ${isActive ? 'text-violet-400' : 'group-hover:text-zinc-300'}`} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium tracking-tight">{item.label}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Bottom Actions - Fixed at bottom */}
                    <div className="pt-6 mt-auto border-t border-white/5 space-y-4 shrink-0">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-4 p-3 rounded-2xl transition-all group text-red-400 nm-flat bg-red-500/5 hover:nm-pressed"
                        >
                            <div className="p-2 rounded-xl transition-all bg-red-500/10">
                                <LogOut className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold tracking-tight">Sign Out</p>
                            </div>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
                <div className="max-w-5xl mx-auto px-6 py-12 lg:px-12">
                    {/* Header Stage */}
                    <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-center justify-between md:block">
                            <div className="md:hidden">
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" size="icon" className="nm-flat rounded-xl text-zinc-400">
                                            <Menu className="h-6 w-6" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="bg-zinc-950 border-white/5 p-0 w-80">
                                        <div className="p-6 flex flex-col h-full bg-zinc-950/50 backdrop-blur-xl">
                                            {/* Detailed User Identity at Top */}
                                            <div className="mb-6 shrink-0">
                                                <div className="nm-flat rounded-[2rem] p-5 space-y-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative group">
                                                            <Avatar className="h-16 w-16 rounded-2xl nm-flat p-1">
                                                                <AvatarImage src={profile.photoURL} className="rounded-[12px]" />
                                                                <AvatarFallback className="bg-zinc-900 text-lg font-bold text-violet-400 rounded-[12px]">
                                                                    {profile.displayName?.charAt(0)?.toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <button
                                                                onClick={() => fileInputRef.current?.click()}
                                                                className="absolute -bottom-1 -right-1 p-1.5 nm-flat hover:nm-pressed rounded-lg text-violet-400 bg-zinc-900 border-none transition-all shadow-lg"
                                                            >
                                                                <Edit2 className="h-3 w-3" />
                                                            </button>
                                                            <input
                                                                type="file"
                                                                ref={fileInputRef}
                                                                onChange={handleImageUpload}
                                                                accept="image/*"
                                                                className="hidden"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0 space-y-0.5">
                                                            {isEditing ? (
                                                                <div className="flex items-center gap-1.5 nm-pressed p-1 rounded-xl">
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
                                                                    <p className="text-base font-black text-white truncate">{profile.displayName}</p>
                                                                    <Pencil className="h-3 w-3 text-violet-400 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
                                                                </div>
                                                            )}
                                                            <p className="text-[10px] text-zinc-500 truncate font-medium">{profile.email}</p>
                                                            <p className="text-[10px] text-violet-400/50 font-bold uppercase tracking-widest">{memberSince}</p>
                                                        </div>
                                                    </div>

                                                    <div className="nm-pressed px-4 py-2 rounded-xl">
                                                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Explorer ID</p>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-[9px] font-mono text-white/30 truncate">{user.uid}</p>
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                className="h-6 w-6 rounded-lg nm-flat hover:nm-pressed bg-transparent border-none text-zinc-600 hover:text-white transition-all shrink-0"
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

                                            {/* Nav Links */}
                                            <nav className="space-y-2 flex-1">
                                                {navItems.map((item) => {
                                                    const Icon = item.icon;
                                                    const isActive = activeTab === item.id;
                                                    return (
                                                        <SheetClose asChild key={item.id}>
                                                            <button
                                                                onClick={() => setActiveTab(item.id)}
                                                                className={`
                                                                    w-full flex items-center gap-4 p-3 rounded-2xl transition-all group
                                                                    ${isActive
                                                                        ? 'nm-flat text-white'
                                                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}
                                                                `}
                                                            >
                                                                <div className={`
                                                                    p-2 rounded-xl transition-all
                                                                    ${isActive ? 'bg-violet-500/10 nm-inset-glow' : 'bg-transparent'}
                                                                `}>
                                                                    <Icon className={`h-5 w-5 ${isActive ? 'text-violet-400' : 'group-hover:text-zinc-300'}`} />
                                                                </div>
                                                                <div className="text-left">
                                                                    <p className="text-sm font-medium tracking-tight">{item.label}</p>
                                                                </div>
                                                            </button>
                                                        </SheetClose>
                                                    );
                                                })}
                                            </nav>

                                            {/* Bottom Actions */}
                                            <div className="pt-6 mt-6 border-t border-white/5 space-y-4">
                                                <SheetClose asChild>
                                                    <button
                                                        onClick={handleLogout}
                                                        className="w-full flex items-center gap-4 p-3 rounded-2xl transition-all group text-red-400 nm-flat bg-red-500/5 hover:nm-pressed"
                                                    >
                                                        <div className="p-2 rounded-xl transition-all bg-red-500/10">
                                                            <LogOut className="h-5 w-5" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-sm font-bold tracking-tight">Sign Out</p>
                                                        </div>
                                                    </button>
                                                </SheetClose>
                                            </div>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>
                            <div className="hidden md:block">
                                <div className="flex items-center gap-2 text-violet-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-2 opacity-70">
                                    {activeTab === 'overview' ? 'Dashboard' : navItems.find(i => i.id === activeTab)?.label} • {profile.displayName}
                                </div>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
                                {navItems.find(i => i.id === activeTab)?.label}
                            </h1>
                            <p className="hidden md:block text-zinc-500 font-medium">
                                {navItems.find(i => i.id === activeTab)?.desc}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                className="nm-flat hover:nm-pressed text-zinc-400 hover:text-white transition-all gap-2 h-11 px-6 rounded-2xl border-none text-xs font-bold uppercase tracking-widest bg-transparent"
                                onClick={handleSyncStatus}
                                disabled={isSyncing}
                            >
                                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Sync Hub
                            </Button>
                        </div>
                    </header>

                    {/* Active Section Content */}
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {activeTab === 'overview' && (
                            <div className="space-y-12">
                                {/* Statistics Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="nm-flat rounded-[2.5rem] p-8 group transition-all duration-500 hover:scale-[1.02] relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />
                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className="p-4 bg-blue-500/10 rounded-2xl nm-inset-glow">
                                                <Map className="h-6 w-6 text-blue-400" />
                                            </div>
                                            <Badge className="bg-blue-500/10 text-blue-400 border-none rounded-full px-3 py-1 text-[10px] font-bold">ARCHITECT</Badge>
                                        </div>
                                        <p className="text-4xl font-black text-white mb-1 relative z-10">{stats.maps}</p>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest relative z-10">Maps Visualized</p>
                                    </div>

                                    <div className="nm-flat rounded-[2.5rem] p-8 group transition-all duration-500 hover:scale-[1.02] relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />
                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className="p-4 bg-orange-500/10 rounded-2xl nm-inset-glow">
                                                <Flame className="h-6 w-6 text-orange-400" />
                                            </div>
                                            <Badge className="bg-orange-500/10 text-orange-400 border-none rounded-full px-3 py-1 text-[10px] font-bold">STREAK</Badge>
                                        </div>
                                        <p className="text-4xl font-black text-white mb-1 relative z-10">{stats.streak}</p>
                                        <div className="flex items-center gap-2 relative z-10">
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Current Days</p>
                                            <span className="text-[10px] text-zinc-600">•</span>
                                            <span className="text-[10px] text-zinc-500 font-bold">MAX {profile.statistics.longestStreak || 0}</span>
                                        </div>
                                    </div>

                                    <div className="nm-flat rounded-[2.5rem] p-8 group transition-all duration-500 hover:scale-[1.02] relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />
                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className="p-4 bg-violet-500/10 rounded-2xl nm-inset-glow">
                                                <Brain className="h-6 w-6 text-violet-400" />
                                            </div>
                                            <Badge className="bg-violet-500/10 text-violet-400 border-none rounded-full px-3 py-1 text-[10px] font-bold">SCHOLAR</Badge>
                                        </div>
                                        <p className="text-4xl font-black text-white mb-1 relative z-10">{stats.nodes}</p>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest relative z-10">Concepts Explored</p>
                                    </div>
                                </div>

                                {/* Detailed Activity */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Deep Expansions', value: stats.depth, icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                                        { label: 'AI Visuals', value: stats.images, icon: Wand2, color: 'text-pink-400', bg: 'bg-pink-500/10' },
                                        { label: 'Focus Time', value: formatDuration(profile.statistics.totalStudyTimeMinutes), icon: Loader2, color: 'text-sky-400', bg: 'bg-sky-500/10' },
                                        { label: 'System Active', value: 'Live', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                                    ].map((metric, i) => (
                                        <div key={i} className="nm-flat rounded-3xl p-6 flex flex-col items-center text-center gap-3 hover:scale-105 transition-all duration-300 group">
                                            <div className={`p-3 rounded-xl ${metric.bg} nm-inset-glow group-hover:nm-flat transition-all`}>
                                                <metric.icon className={`h-4 w-4 ${metric.color}`} />
                                            </div>
                                            <div>
                                                <p className="text-xl font-black text-white mb-0.5">{metric.value}</p>
                                                <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{metric.label}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>




                            </div>
                        )}

                        {activeTab === 'lab' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Connection Management */}
                                <div className="space-y-8">
                                    <div className="nm-flat rounded-[3rem] p-10 space-y-8">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 nm-pressed rounded-xl">
                                                <Key className="h-6 w-6 text-violet-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Engine Access</h3>
                                                <p className="text-sm text-zinc-500">Universal API Integration</p>
                                            </div>
                                        </div>

                                        {/* BYOP OAuth Button */}
                                        <button
                                            onClick={() => {
                                                const params = new URLSearchParams({
                                                    redirect_url: window.location.href,
                                                });
                                                window.location.href = `https://enter.pollinations.ai/authorize?${params}`;
                                            }}
                                            className="w-full flex items-center justify-center gap-3 h-16 rounded-2xl bg-gradient-to-r from-violet-600/20 to-pink-600/20 border border-violet-500/30 hover:border-violet-400/60 hover:from-violet-600/30 hover:to-pink-600/30 transition-all group"
                                        >
                                            <Sparkles className="h-5 w-5 text-violet-400 group-hover:scale-110 transition-transform" />
                                            <span className="text-sm font-black uppercase tracking-widest text-violet-300">Connect with Pollinations</span>
                                        </button>

                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-px bg-white/5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">or paste key manually</span>
                                            <div className="flex-1 h-px bg-white/5" />
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Personal Access Key</Label>
                                                <button onClick={() => setShowApiKey(!showApiKey)} className="text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors uppercase">
                                                    {showApiKey ? "Mask Key" : "Reveal Key"}
                                                </button>
                                            </div>
                                            <div className="relative group">
                                                <Input
                                                    type={showApiKey ? "text" : "password"}
                                                    value={apiKeyInput}
                                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                                    className="h-16 nm-pressed bg-zinc-950/20 border-none rounded-2xl px-6 pr-32 font-mono text-sm"
                                                    placeholder="sk_..."
                                                />
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                    <Button onClick={handleSaveApiKey} disabled={isSavingKey} className="h-12 px-6 rounded-xl nm-flat hover:nm-pressed text-violet-400 bg-transparent transition-all text-xs font-black uppercase">
                                                        {isSavingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="nm-pressed rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-3 h-3 rounded-full ${profile.apiSettings?.pollinationsApiKey ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
                                                <div>
                                                    <p className="text-sm font-bold text-white">{profile.apiSettings?.pollinationsApiKey ? "Authenticated Access" : "Shared Access Mode"}</p>
                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Connection Status</p>
                                                </div>
                                            </div>
                                            <div className="h-12 w-1 border-r border-white/5 hidden md:block" />
                                            <div className="text-center md:text-right">
                                                <p className="text-2xl font-black text-white">{(pollenBalance || 0).toLocaleString()}</p>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Available Pollen</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="nm-flat rounded-[3rem] p-10">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 nm-pressed rounded-xl">
                                                <Wand2 className="h-6 w-6 text-pink-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Creative Hub</h3>
                                                <p className="text-sm text-zinc-500">Default Vision Engine</p>
                                            </div>
                                        </div>
                                        <ModelSelector
                                            value={preferredModel}
                                            onChange={handleSaveModelPreference}
                                            className="w-full h-16 nm-pressed border-none rounded-2xl px-6"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {/* AI Features Checklist */}
                                    <div className="nm-flat rounded-[3rem] p-10 h-full">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-8">System Capabilities</h3>
                                        <div className="space-y-6">
                                            {[
                                                { title: "Priority Queueing", desc: "Skip global processing waits.", icon: Target },
                                                { title: "Ultra High-Res", desc: "Access to 4K upscaled generations.", icon: Sparkles },
                                                { title: "Vision Analytics", desc: "Enhanced multi-modal map expansion.", icon: Brain },
                                                { title: "Secure Tunneling", desc: "Private API requests per instance.", icon: Lock }
                                            ].map((item, i) => (
                                                <div key={i} className="flex gap-6 items-start group">
                                                    <div className="p-4 nm-pressed rounded-2xl group-hover:nm-flat transition-all">
                                                        <item.icon className="h-5 w-5 text-violet-400/50" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white mb-1">{item.title}</h4>
                                                        <p className="text-xs text-zinc-500 leading-relaxed font-medium">{item.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'preferences' && (
                            <div className="max-w-4xl mx-auto space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="nm-flat rounded-[2.5rem] p-10 space-y-8 group hover:scale-[1.02] transition-all duration-500">
                                        <div className="flex items-center gap-4">
                                            <div className="p-4 bg-blue-500/10 rounded-2xl nm-inset-glow group-hover:nm-flat transition-all">
                                                <Globe className="h-6 w-6 text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Localization</h3>
                                                <p className="text-sm text-zinc-500">System Language</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2">Preferred Language</Label>
                                            <Select value={profile.preferences.preferredLanguage} onValueChange={(v) => savePreference('preferredLanguage', v)}>
                                                <SelectTrigger className="w-full h-16 nm-pressed border-none rounded-2xl px-6 text-sm font-bold bg-zinc-950/20">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-800 rounded-2xl">
                                                    {languages.map(l => (
                                                        <SelectItem key={l.code} value={l.code} className="py-3 font-bold">{l.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="nm-flat rounded-[2.5rem] p-10 space-y-8 group hover:scale-[1.02] transition-all duration-500">
                                        <div className="flex items-center gap-4">
                                            <div className="p-4 bg-violet-500/10 rounded-2xl nm-inset-glow group-hover:nm-flat transition-all">
                                                <Brain className="h-6 w-6 text-violet-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Cognitive Tone</h3>
                                                <p className="text-sm text-zinc-500">AI Personality Hub</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2">Interactive Persona</Label>
                                            <Select value={profile.preferences.defaultAIPersona?.toLowerCase() || 'concise'} onValueChange={(v) => savePreference('defaultAIPersona', v)}>
                                                <SelectTrigger className="w-full h-16 nm-pressed border-none rounded-2xl px-6 text-sm font-bold bg-zinc-950/20">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-800 rounded-2xl">
                                                    {[
                                                        { id: 'teacher', label: 'Teacher' },
                                                        { id: 'concise', label: 'Concise' },
                                                        { id: 'creative', label: 'Creative' },
                                                        { id: 'sage', label: 'Cognitive Sage' },
                                                    ].map(({ id, label }) => (
                                                        <SelectItem key={id} value={id} className="py-3 font-bold">{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-4">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2">Default Depth</Label>
                                            <Select value={profile.preferences.defaultDepth || 'auto'} onValueChange={(v) => savePreference('defaultDepth', v)}>
                                                <SelectTrigger className="w-full h-16 nm-pressed border-none rounded-2xl px-6 text-sm font-bold bg-zinc-950/20">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-800 rounded-2xl">
                                                    {[
                                                        { id: 'auto', label: 'Auto', Icon: Sparkles },
                                                        { id: 'low', label: 'Quick', Icon: FastForward },
                                                        { id: 'medium', label: 'Balanced', Icon: Scale },
                                                        { id: 'deep', label: 'Detailed', Icon: BookOpen },
                                                    ].map(({ id, label, Icon }) => (
                                                        <SelectItem key={id} value={id} className="py-3 font-bold">
                                                            <div className="flex items-center gap-2"><Icon className="w-4 h-4" />{label}</div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Extra Preferences */}
                                <div className="nm-flat rounded-[2.5rem] p-10">
                                    <div className="flex items-center gap-2 mb-8">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">System Accessibility</h4>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <HelpCircle className="h-3 w-3 text-zinc-700 hover:text-zinc-500 transition-colors" />
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-zinc-900 border-zinc-800 text-xs text-zinc-400 p-4 max-w-xs rounded-2xl">
                                                    Configure how MindScape interacts with your workflow, including automation settings and system-level behaviors.
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        <div className="flex items-center justify-between gap-6 p-6 nm-pressed rounded-3xl">
                                            <div className="space-y-1">
                                                <p className="font-bold text-white text-sm">Auto-Generate Visuals</p>
                                                <p className="text-xs text-zinc-500">Create icons for every new node.</p>
                                            </div>
                                            <Switch
                                                checked={profile.preferences.autoGenerateImages}
                                                onCheckedChange={(v) => savePreference('autoGenerateImages', v ? 'true' : 'false')}
                                                className="data-[state=checked]:bg-violet-500"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between gap-6 p-6 nm-pressed rounded-3xl">
                                            <div className="space-y-1">
                                                <p className="font-bold text-white text-sm">Deep Expansion Mode</p>
                                                <p className="text-xs text-zinc-500">Go 3 levels deep by default.</p>
                                            </div>
                                            <Switch
                                                checked={profile.preferences.deepExpansionMode}
                                                onCheckedChange={(v) => savePreference('deepExpansionMode', v ? 'true' : 'false')}
                                                className="data-[state=checked]:bg-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="max-w-4xl mx-auto space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="nm-flat rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/5 blur-3xl rounded-full" />
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="p-4 bg-red-500/10 rounded-2xl nm-inset-glow">
                                                <ShieldCheck className="h-6 w-6 text-red-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Security Shield</h3>
                                                <p className="text-sm text-zinc-500">Authentication Health</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4 relative z-10">
                                            <div className="flex items-center justify-between p-4 nm-pressed rounded-2xl">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Account Type</span>
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-none font-bold">VERIFIED</Badge>
                                            </div>
                                            <Button
                                                variant="outline"
                                                className="w-full h-16 nm-flat hover:nm-pressed border-none rounded-2xl text-sm font-black uppercase tracking-[0.2em] text-white bg-zinc-950/20"
                                                onClick={async () => {
                                                    try {
                                                        await sendPasswordResetEmail(auth, profile.email);
                                                        toast({ title: 'Success', description: 'Check email for reset link.' });
                                                    } catch (e: any) {
                                                        toast({ variant: 'destructive', description: e.message });
                                                    }
                                                }}
                                            >
                                                Update Credentials
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="nm-flat rounded-[2.5rem] p-10 space-y-8 group hover:scale-[1.02] transition-all duration-500">
                                        <div className="flex items-center gap-4">
                                            <div className="p-4 bg-zinc-500/10 rounded-2xl nm-inset-glow">
                                                <Lock className="h-6 w-6 text-zinc-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Advanced Protection</h3>
                                                <p className="text-sm text-zinc-500">Encryption & Privacy</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="p-6 nm-pressed rounded-[2.5rem] bg-zinc-950/30">
                                                <p className="text-xs text-zinc-500 leading-relaxed italic">
                                                    MindScape uses industry-standard encryption for all your mind maps and API settings.
                                                    Your personal data is never shared with third-party vendors outside of the required LLM processing.
                                                </p>
                                            </div>

                                        </div>
                                    </div>
                                </div>

                                {/* Security Log */}
                                <div className="nm-flat rounded-[2.5rem] p-10 flex items-center justify-between gap-8">
                                    <div className="flex items-center gap-6">
                                        <div className="p-4 bg-orange-500/10 rounded-2xl nm-inset-glow">
                                            <Activity className="h-6 w-6 text-orange-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">Instance Status</h4>
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Secure & Synced</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active System</span>
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
