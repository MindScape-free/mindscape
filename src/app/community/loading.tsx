
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Users, Filter, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Loading skeleton for the Community page.
 */
export default function CommunityLoading() {
    return (
        <div className="min-h-screen text-white bg-[#0D0D0D]">
            {/* Hero Section Skeleton */}
            <div className="relative overflow-hidden pt-24 pb-16">
                <div className="container mx-auto px-4 relative z-10 text-center flex flex-col items-center">
                    <Skeleton className="h-6 w-32 mb-4 bg-white/5 border border-white/5 rounded-full" />
                    <Skeleton className="h-12 w-3/4 max-w-lg mb-4 bg-white/5" />
                    <Skeleton className="h-4 w-1/2 max-w-md bg-white/5" />
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Search & Filters Skeleton */}
                <div className="flex flex-col md:flex-row gap-4 mb-10 items-center justify-between">
                    <Skeleton className="h-11 w-full md:max-w-md bg-white/5 rounded-xl" />
                    <Skeleton className="h-11 w-32 bg-white/5 rounded-xl" />
                </div>

                {/* Categories Skeleton */}
                <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-4 scrollbar-hide">
                    <Skeleton className="h-4 w-4 bg-white/5 mr-2" />
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-9 w-24 rounded-xl bg-white/5 shrink-0" />
                    ))}
                </div>

                {/* Grid Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="space-y-4">
                            <Skeleton className="h-48 w-full rounded-2xl bg-white/5" />
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-3/4 bg-white/5" />
                                <Skeleton className="h-4 w-1/2 bg-white/5" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
