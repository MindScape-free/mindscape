
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Rocket, Filter, SortAsc, Users, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { MindMapWithId } from '@/types/mind-map';
import { CommunityCard } from '@/components/community/community-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SortOption = 'recent' | 'views';

export default function CommunityPage() {
    const router = useRouter();
    const firestore = useFirestore();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [sortOption, setSortOption] = useState<SortOption>('recent');

    const publicMapsQuery = useMemoFirebase(() => {
        let q = collection(firestore, 'publicMindmaps');

        // Sorting
        if (sortOption === 'recent') {
            return query(q, orderBy('updatedAt', 'desc'), limit(50));
        } else {
            return query(q, orderBy('views', 'desc'), limit(50));
        }
    }, [firestore, sortOption]);

    const { data: publicMaps, isLoading } = useCollection<MindMapWithId>(publicMapsQuery);

    // Categories extraction
    const categories = useMemo(() => {
        const cats = new Set<string>(['All']);
        publicMaps?.forEach(map => {
            map.publicCategories?.forEach(cat => cats.add(cat));
        });
        return Array.from(cats);
    }, [publicMaps]);

    const filteredMaps = useMemo(() => {
        let maps = publicMaps || [];

        if (selectedCategories.length > 0) {
            maps = maps.filter(map =>
                selectedCategories.some(cat => map.publicCategories?.includes(cat))
            );
        }

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            maps = maps.filter(map =>
                map.topic.toLowerCase().includes(lowerQuery) ||
                map.summary?.toLowerCase().includes(lowerQuery)
            );
        }

        return maps;
    }, [publicMaps, selectedCategories, searchQuery]);

    const handleMapClick = (id: string) => {
        router.push(`/canvas?mapId=${id}`);
    };

    return (
        <div className="min-h-screen text-white">
            {/* Hero Section */}
            <div className="relative overflow-hidden pt-24 pb-16">
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <Badge variant="outline" className="mb-4 border-purple-500/30 bg-purple-500/10 text-purple-400 gap-1.5 py-1 px-3">
                        <Users className="h-3 w-3" />
                        Community Hub
                    </Badge>
                    <h1 className="text-4xl font-bold tracking-tight mb-2">
                        Explore Community MindMaps
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Discover and learn from the collective knowledge of the MindScape community.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-10 items-center justify-between">
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search community mindmaps..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full flex pl-10 h-11 rounded-full bg-black/40 text-zinc-100 outline-none focus:ring-0 placeholder:text-zinc-600 border border-white/5 focus:border-primary/50 focus:bg-black/60 transition-all font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="h-11 rounded-full glassmorphism border-white/5 bg-black/40 hover:bg-black/60 focus:ring-0 whitespace-nowrap px-4 font-normal transition-all text-[12px]"
                                >
                                    <Filter className="h-4 w-4 text-gray-500 mr-2" />
                                    Categories {selectedCategories.length > 0 && <span className="ml-1 text-primary">{`(${selectedCategories.length})`}</span>}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px] glassmorphism bg-black/80 border-white/10 p-2 rounded-2xl shadow-xl max-h-[300px] overflow-y-auto z-50">
                                {categories.filter(c => c !== 'All').map(cat => (
                                    <DropdownMenuCheckboxItem
                                        key={cat}
                                        checked={selectedCategories.includes(cat)}
                                        onCheckedChange={(checked) => {
                                            setSelectedCategories(prev =>
                                                checked ? [...prev, cat] : prev.filter(c => c !== cat)
                                            )
                                        }}
                                        className="cursor-pointer py-2.5 px-3 mb-1 last:mb-0 rounded-xl border border-transparent focus:bg-white/5 data-[state=checked]:bg-primary/10 data-[state=checked]:border-primary/50 data-[state=checked]:text-primary data-[state=checked]:shadow-[0_0_15px_rgba(139,92,246,0.15)] text-[12px] font-medium transition-all"
                                    >
                                        {cat}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                            <SelectTrigger className="w-[140px] h-11 rounded-full glassmorphism border-white/5 bg-black/40 hover:bg-black/60 focus:ring-0 focus:ring-offset-0 transition-all">
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent className="glassmorphism border-white/10 rounded-xl">
                                {[
                                    { value: 'recent', label: 'Latest' },
                                    { value: 'views', label: 'Trending' }
                                ].map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        hideIndicator
                                        className="w-full cursor-pointer py-2.5 px-3 mb-1 last:mb-0 rounded-xl border border-transparent focus:bg-white/5 data-[state=checked]:bg-purple-600/10 data-[state=checked]:border-purple-500/50 data-[state=checked]:shadow-[0_0_15px_rgba(168,85,247,0.15)] text-[11px] font-bold uppercase tracking-wider transition-all"
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <span className={cn("inline-flex w-1.5 h-1.5 rounded-full transition-all", sortOption === option.value ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" : "bg-zinc-600")} />
                                            {option.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="space-y-4">
                                <Skeleton className="h-48 w-full rounded-2xl bg-white/5" />
                                <Skeleton className="h-4 w-3/4 bg-white/5" />
                                <Skeleton className="h-4 w-1/2 bg-white/5" />
                            </div>
                        ))}
                    </div>
                ) : filteredMaps.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredMaps.map(map => (
                            <CommunityCard key={map.id} map={map} onClick={handleMapClick} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                        <Sparkles className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-300">No MindMaps Found</h3>
                        <p className="text-gray-500 mt-2">Try adjusting your filters or search terms.</p>
                        <Button
                            variant="link"
                            className="mt-4 text-purple-400"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategories([]);
                            }}
                        >
                            Reset all filters
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
