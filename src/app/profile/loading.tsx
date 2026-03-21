
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Loading skeleton for the Profile page.
 */
export default function ProfileLoading() {
    return (
        <div className="container mx-auto max-w-7xl px-4 py-32 space-y-8">
            {/* Header / Avatar Skeleton */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
                <Skeleton className="h-32 w-32 rounded-full bg-white/5 ring-4 ring-primary/20" />
                <div className="flex-1 space-y-4 text-center md:text-left">
                    <Skeleton className="h-10 w-64 bg-white/5 mx-auto md:mx-0" />
                    <Skeleton className="h-4 w-48 bg-white/5 mx-auto md:mx-0" />
                    <div className="flex gap-2 justify-center md:justify-start">
                        <Skeleton className="h-6 w-24 rounded-full bg-white/5" />
                        <Skeleton className="h-6 w-24 rounded-full bg-white/5" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sidebar Skeletons */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-zinc-900 border-white/5">
                        <CardHeader>
                            <Skeleton className="h-6 w-32 bg-white/5" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <Skeleton className="h-4 w-24 bg-white/5" />
                                    <Skeleton className="h-4 w-12 bg-white/5" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-white/5">
                        <CardHeader>
                            <Skeleton className="h-6 w-32 bg-white/5" />
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-4 gap-2">
                                {[...Array(8)].map((_, i) => (
                                    <Skeleton key={i} className="aspect-square rounded-lg bg-white/5" />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Skeletons */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="flex gap-4">
                        <Skeleton className="h-10 w-24 rounded-lg bg-white/5" />
                        <Skeleton className="h-10 w-24 rounded-lg bg-white/5" />
                        <Skeleton className="h-10 w-24 rounded-lg bg-white/5" />
                    </div>

                    <Card className="bg-zinc-900 border-white/5">
                        <CardHeader>
                            <Skeleton className="h-8 w-48 bg-white/5" />
                            <Skeleton className="h-4 w-64 bg-white/5" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="space-y-3">
                                    <Skeleton className="h-5 w-32 bg-white/5" />
                                    <Skeleton className="h-10 w-full bg-white/5 rounded-xl" />
                                </div>
                            ))}
                            <Skeleton className="h-12 w-32 bg-primary/20 rounded-xl" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
