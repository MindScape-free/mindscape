import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { MindMapData, NestedExpansionItem } from '@/types/mind-map';

export type MindMapStatus = 'idle' | 'generating' | 'syncing' | 'error';

export interface ExpansionAdapter {
    generate: (topic: string, parentTopic?: string, branchDepth?: 'low' | 'medium' | 'deep') => Promise<{ data: MindMapData | null; error: string | null }>;
}

export interface PersistenceAdapter {
    persist: (map: MindMapData, id?: string, isSilent?: boolean) => Promise<string | undefined>;
}

export function useMindMapStack(options: {
    initialData?: MindMapData[];
    expansionAdapter: ExpansionAdapter;
    persistenceAdapter: PersistenceAdapter;
}) {
    const [stack, setStack] = useState<MindMapData[]>(options.initialData || []);
    const [activeIndex, setActiveIndex] = useState(0);
    const [status, setStatus] = useState<MindMapStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [generatingNodeId, setGeneratingNodeId] = useState<string | null>(null);
    const [generatingTopic, setGeneratingTopic] = useState<string | null>(null);
    const [generationScope, setGenerationScope] = useState<'foreground' | 'background' | null>(null);

    const currentMap = useMemo(() => stack[activeIndex], [stack, activeIndex]);
    const currentMapRef = useRef(currentMap);
    useEffect(() => { currentMapRef.current = currentMap; }, [currentMap]);

    const navigate = useCallback((index: number) => {
        if (index >= 0 && index < stack.length) {
            setActiveIndex(index);
        }
    }, [stack.length]);

    const update = useCallback((updatedData: Partial<MindMapData>) => {
        setStack(prev => {
            const newStack = [...prev];
            if (newStack[activeIndex]) {
                newStack[activeIndex] = { ...newStack[activeIndex], ...updatedData } as MindMapData;
                // We probably shouldn't auto-persist here to avoid infinite loops, 
                // leave it to manual sync or debounced persist in the consuming component for now.
            }
            return newStack;
        });
    }, [activeIndex]);

    const replace = useCallback((map: MindMapData) => {
        setStack(prev => {
            const newStack = [...prev];
            newStack[activeIndex] = map;
            return newStack;
        });
    }, [activeIndex]);

    const push = useCallback(async (topic: string, nodeId: string, navOptions: { mode: 'foreground' | 'background', parentDepth?: number, branchDepth?: 'low' | 'medium' | 'deep' } = { mode: 'background' }) => {
        if (status !== 'idle') return;

        let actualParentId = currentMap?.id;
        if (currentMap && !actualParentId) {
            console.warn('Parent map not saved yet, saving first...');
            try {
                actualParentId = await options.persistenceAdapter.persist(currentMap, undefined, true);
                if (actualParentId) {
                    // Update the current map with the new ID
                    setStack(prev => {
                        const newStack = [...prev];
                        if (newStack[activeIndex]) {
                            newStack[activeIndex] = { ...newStack[activeIndex], id: actualParentId };
                        }
                        return newStack;
                    });
                }
            } catch (err) {
                console.error('Failed to save parent map:', err);
                throw new Error('Parent map must be saved before creating sub-maps');
            }
        }

        setStatus('generating');
        setGenerationScope(navOptions.mode);
        setGeneratingNodeId(nodeId);
        setGeneratingTopic(topic);
        setError(null);

        try {
            const parentTopic = currentMap?.topic;
            const result = await options.expansionAdapter.generate(topic, parentTopic, navOptions.branchDepth);

            if (result.error) {
                throw new Error(result.error);
            }

            if (result.data) {
                // Ensure all subcategories have isExpanded defaulted to false for type safety
                // Only applicable for standard (single) mind maps
                let mapWithDefaults: MindMapData = result.data;

                if (result.data.mode === 'single') {
                    mapWithDefaults = {
                        ...result.data,
                        subTopics: result.data.subTopics.map(st => ({
                            ...st,
                            categories: st.categories.map(c => ({
                                ...c,
                                subCategories: c.subCategories.map(sc => ({
                                    ...sc,
                                    isExpanded: sc.isExpanded ?? false
                                }))
                            }))
                        }))
                    };
                }

                const newMap = {
                    ...mapWithDefaults,
                    isSubMap: true,
                    parentMapId: actualParentId || undefined,
                };

                // Persist the new map
                const newId = await options.persistenceAdapter.persist(newMap, undefined, true);
                const mapWithId = { ...newMap, id: newId };

                // Safely determine numeric tree depth
                const parentTreeDepth = typeof (currentMap as any)?.treeDepth === 'number' 
                    ? (currentMap as any).treeDepth 
                    : (typeof (currentMap as any)?.depth === 'number' ? (currentMap as any).depth : 0);

                const extractedSubCategories = (mapWithId as any).subTopics?.map((st: any) => ({
                    name: st.name,
                    description: st.thought || '',
                    icon: st.icon || 'Network'
                })) || [];

                const newExpansion: NestedExpansionItem = {
                    id: newId || `temp-${Date.now()}`,
                    topic: topic,
                    parentName: parentTopic || 'Unknown',
                    icon: mapWithId.icon || 'Network',
                    status: 'completed',
                    createdAt: new Date().toISOString(),
                    depth: parentTreeDepth + 1,
                    subCategories: extractedSubCategories,
                    fullData: { ...mapWithId, treeDepth: parentTreeDepth + 1 } as any
                };

                setStack(prev => {
                    const newStack = [...prev];
                    if (newStack[activeIndex]) {
                        const parent = newStack[activeIndex];
                        const currentExpansions = parent.nestedExpansions || [];
                        if (!currentExpansions.some((e: any) => e.topic === topic)) {
                            newStack[activeIndex] = {
                                ...parent,
                                nestedExpansions: [...currentExpansions, newExpansion]
                            };
                        }
                    }
                    newStack.push(mapWithId);
                    return newStack;
                });

                if (navOptions.mode === 'foreground') {
                    setActiveIndex(prev => prev + 1);
                }

                return { newId, parentId: actualParentId };
            }
        } catch (err: any) {
            setError(err.message || 'Generation failed');
            throw err;
        } finally {
            setStatus('idle');
            setGenerationScope(null);
            setGeneratingNodeId(null);
            setGeneratingTopic(null);
        }
    }, [activeIndex, currentMap, options.expansionAdapter, options.persistenceAdapter, status]);

    const pop = useCallback(() => {
        if (activeIndex > 0) {
            setActiveIndex(activeIndex - 1);
        }
    }, [activeIndex]);

    const sync = useCallback(async (isSilent = false) => {
        const mapToSync = currentMapRef.current;
        if (!mapToSync) return;
        setStatus('syncing');
        try {
            await options.persistenceAdapter.persist(mapToSync, mapToSync.id, isSilent);
        } catch (err: any) {
            setError(err.message || 'Sync failed');
            throw err;
        } finally {
            setStatus('idle');
        }
    }, [options.persistenceAdapter]);

    return {
        stack,
        activeIndex,
        currentMap,
        status,
        error,
        generatingNodeId,
        generatingTopic,
        generationScope,
        push,
        navigate,
        update,
        replace,
        sync,
        setStack, // Escape hatch for initial load from page
        setActiveIndex, // Direct access to setter for complex sync
    };
}
