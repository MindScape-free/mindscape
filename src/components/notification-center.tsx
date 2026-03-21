'use client';

import React from 'react';
import {
    Bell,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Info,
    ChevronRight,
    Trash2,
    BellOff,
    Activity
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useNotifications, Notification } from '@/contexts/notification-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useActivity } from '@/contexts/activity-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CHANGELOG_DATA } from '@/lib/changelog-data';
import { Badge } from '@/components/ui/badge';

export function NotificationCenter() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
    const router = useRouter();
    const { status, aiHealth, activeTaskName } = useActivity();

    const isBusy = status !== 'idle' || aiHealth.some(h => h.status !== 'healthy');

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
            case 'loading': return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const handleNotificationClick = (n: Notification) => {
        markAsRead(n.id);
        if (n.link) {
            router.push(n.link);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-xl hover:bg-white/5 transition-colors"
                >
                    <Bell className={cn("h-5 w-5", unreadCount > 0 && !isBusy ? "text-primary" : "text-zinc-400")} />
                    {(unreadCount > 0 || isBusy) && (
                        <span className="absolute top-2 right-2 flex h-2 w-2">
                            <span className={cn(
                                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                isBusy ? "bg-amber-400 duration-1000" : "bg-primary"
                            )}></span>
                            <span className={cn(
                                "relative inline-flex rounded-full h-2 w-2",
                                isBusy ? "bg-amber-500" : "bg-primary"
                            )}></span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[320px] sm:w-[420px] glassmorphism p-0 overflow-hidden border-white/10 shadow-2xl" align="end" forceMount>
                <Tabs defaultValue="activities" className="w-full">
                    <div className="px-4 pt-4 border-b border-white/5">
                        <TabsList className="grid w-full grid-cols-2 bg-white/5 p-1 rounded-xl h-9">
                            <TabsTrigger
                                value="activities"
                                className="text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                            >
                                Activities
                            </TabsTrigger>
                            <TabsTrigger
                                value="changelog"
                                className="text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-1.5"
                            >
                                What's New
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="activities" className="m-0 focus:outline-none">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.01]">
                            <DropdownMenuLabel className="p-0 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500/70">Activity Log</DropdownMenuLabel>
                            <div className="flex gap-1.5">
                                {notifications.length > 0 && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2.5 text-[9px] font-black uppercase tracking-wider text-zinc-500 hover:text-primary transition-colors hover:bg-white/5 rounded-lg"
                                            onClick={markAllAsRead}
                                        >
                                            Mark All Read
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors"
                                            onClick={clearNotifications}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {isBusy && (
                            <div className="p-4 border-b border-white/5 bg-amber-500/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                                    <span className="text-[10px] font-black text-amber-500 tracking-widest uppercase italic">Quantum Materializing</span>
                                </div>
                                <div className="space-y-2">
                                    {aiHealth.length > 0 ? (
                                        aiHealth.map(h => (
                                            <div key={h.name} className="flex justify-between items-center text-[9px] uppercase font-mono gap-4 pl-4 border-l-2 border-white/10">
                                                <span className="text-zinc-500">{h.name}</span>
                                                <span className={h.status === 'healthy' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}>{h.status}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex justify-between items-center text-[9px] uppercase font-mono gap-4 pl-4 border-l-2 border-white/10">
                                            <span className="text-zinc-500 truncate max-w-[150px]" title={activeTaskName ? `Generating Submap: ${activeTaskName}` : "Mind Map Generation"}>
                                                {activeTaskName ? `Map: ${activeTaskName}` : "AI Core Activity"}
                                            </span>
                                            <span className="text-amber-400 animate-pulse">Running</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <ScrollArea className="h-[350px]">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                                    <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                        <BellOff className="h-6 w-6 text-zinc-700" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">No recent activity</p>
                                </div>
                            ) : (
                                <div className="flex flex-col p-2 space-y-1">
                                    {notifications.map((n) => (
                                        <button
                                            key={n.id}
                                            onClick={() => handleNotificationClick(n)}
                                            className={cn(
                                                "flex flex-col items-start gap-1 px-4 py-3.5 text-left transition-all rounded-xl relative group",
                                                !n.read
                                                    ? "bg-primary/[0.03] border border-primary/10 shadow-[0_0_15px_-5px_rgba(var(--primary),0.1)]"
                                                    : "hover:bg-white/[0.03] border border-transparent hover:border-white/5"
                                            )}
                                        >
                                            <div className="flex items-start justify-between w-full gap-3">
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div className={cn(
                                                        "mt-0.5 p-1.5 rounded-lg flex-shrink-0",
                                                        !n.read ? "bg-primary/10" : "bg-white/5"
                                                    )}>
                                                        {getIcon(n.type)}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 min-w-0">
                                                        <span className={cn(
                                                            "text-[12px] leading-tight transition-colors truncate",
                                                            !n.read ? "text-white font-bold" : "text-zinc-400 font-medium group-hover:text-zinc-300"
                                                        )}>
                                                            {n.message}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-600 font-medium">
                                                            {formatDistanceToNow(n.timestamp, { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                </div>
                                                {!n.read && (
                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0 shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                                                )}
                                            </div>
                                            {n.details && (
                                                <p className="text-[11px] text-zinc-500/80 mt-1 pl-[38px] line-clamp-2 leading-relaxed font-medium">
                                                    {n.details}
                                                </p>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="changelog" className="m-0 focus:outline-none">
                        <ScrollArea className="h-[400px]">
                            <div className="p-2 space-y-1">
                                {CHANGELOG_DATA.map((version, vIdx) => (
                                    <div
                                        key={vIdx}
                                        className="group relative flex flex-col gap-2 p-4 rounded-xl transition-all border border-transparent hover:bg-white/[0.02] hover:border-white/5"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary/80 bg-primary/5 rounded-md">
                                                    v{version.version}
                                                </Badge>
                                                <span className="text-[12px] font-bold text-zinc-200 group-hover:text-primary transition-colors">{version.title}</span>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">{version.date}</span>
                                                <ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-primary transition-colors" />
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2 pl-0.5 font-medium">{version.summary}</p>
                                        <button
                                            onClick={() => router.push(`/changelog/${version.slug}`)}
                                            className="w-fit text-[10px] font-black uppercase tracking-[0.1em] text-primary/50 hover:text-primary transition-all flex items-center gap-1.5 hover:gap-2.5"
                                        >
                                            Full Article
                                            <div className="h-px w-3 bg-primary/30 group-hover:w-5 group-hover:bg-primary transition-all" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="p-3 border-t border-white/5 bg-white/[0.02]">
                            <button
                                onClick={() => router.push('/changelog')}
                                className="w-full text-center text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors py-1.5"
                            >
                                View All Updates →
                            </button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
