import { useState, useCallback, useMemo } from 'react';
import { MindMapData, NestedExpansionItem } from '@/types/mind-map';

export type MindMapStatus = 'idle' | 'generating' | 'syncing' | 'error';

export interface ExpansionAdapter {
    generate: (topic: string, parentTopic?: string) => Promise<{ data: MindMapData | null; error: string | null }>;
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

    const push = useCallback(async (topic: string, nodeId: string, navOptions: { mode: 'foreground' | 'background', parentDepth?: number } = { mode: 'background' }) => {
        if (status !== 'idle') return;

        // CRITICAL: Ensure parent map is saved before creating sub-map
        if (currentMap && !currentMap.id) {
            console.warn('Parent map not saved yet, saving first...');
            try {
                const parentId = await options.persistenceAdapter.persist(currentMap, undefined, true);
                if (parentId) {
                    // Update the current map with the new ID
                    setStack(prev => {
                        const newStack = [...prev];
                        if (newStack[activeIndex]) {
                            newStack[activeIndex] = { ...newStack[activeIndex], id: parentId };
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
            const result = await options.expansionAdapter.generate(topic, parentTopic);

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
                    parentMapId: currentMap?.id || undefined,
                };

                // Persist the new map
                const newId = await options.persistenceAdapter.persist(newMap, undefined, true);
                const mapWithId = { ...newMap, id: newId };

                // Create expansion record for parent
                const newExpansion: NestedExpansionItem = {
                    id: newId || `temp-${Date.now()}`,
                    topic: mapWithId.topic,
                    parentName: currentMap?.topic || 'Main',
                    icon: mapWithId.icon || 'Network',
                    status: 'completed',
                    timestamp: Date.now(),
                    fullData: mapWithId,
                    createdAt: Date.now(),
                    depth: (navOptions.parentDepth !== undefined ? navOptions.parentDepth : ((currentMap as any)?.depth || 0)) + 1,
                    subCategories: [] // Not strictly needed for list view but good for type safety
                } as any;

                setStack(prev => {
                    const newStack = [...prev];

                    // 1. Update Parent to include nested expansion
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

                    // 2. Add New Map to stack
                    newStack.push(mapWithId);
                    return newStack;
                });

                if (navOptions.mode === 'foreground') {
                    setActiveIndex(prev => prev + 1);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to expand node');
            throw err;
        } finally {
            setStatus('idle');
            setGeneratingNodeId(null);
            setGeneratingTopic(null);
            setGenerationScope(null);
        }
    }, [status, currentMap, options.expansionAdapter, options.persistenceAdapter, activeIndex]);

    const sync = useCallback(async (isSilent = false) => {
        if (!currentMap) return;
        setStatus('syncing');
        try {
            await options.persistenceAdapter.persist(currentMap, currentMap.id, isSilent);
        } catch (err: any) {
            setError(err.message || 'Sync failed');
            throw err;
        } finally {
            setStatus('idle');
        }
    }, [currentMap, options.persistenceAdapter]);

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
