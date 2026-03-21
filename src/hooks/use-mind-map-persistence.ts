
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, updateDoc, setDoc, collection, addDoc, serverTimestamp, onSnapshot, query, where, limit } from 'firebase/firestore';
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { MindMapData } from '@/types/mind-map';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { trackMapCreated, trackStudyTime, trackNodesAdded, trackNestedExpansion } from '@/lib/activity-tracker';
import { Achievement } from '@/lib/achievements';

interface PersistenceOptions {
    onRemoteUpdate?: (data: MindMapData) => void;
    userApiKey?: string;
    preferredModel?: string;
}

/**
 * Custom hook to handle Firestore persistence for mind maps.
 * Manages saving, loading user preferences (persona), and real-time syncing.
 */
export function useMindMapPersistence(options: PersistenceOptions = {}) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const isSavingRef = useRef(false);

    const [aiPersona, setAiPersona] = useState<string>('Standard');

    // Achievement toast helper
    const showAchievementToasts = useCallback((achievements: Achievement[]) => {
        const tierEmoji: Record<string, string> = {
            bronze: '🥉',
            silver: '🥈',
            gold: '🥇',
            platinum: '💎',
        };
        for (const a of achievements) {
            toast({
                title: `${tierEmoji[a.tier] || '🏆'} Achievement Unlocked!`,
                description: `${a.name} — ${a.description}`,
                duration: 6000,
            });
        }
    }, [toast]);

    // 1. Load User Preferences
    useEffect(() => {
        if (user && firestore) {
            const userRef = doc(firestore, 'users', user.uid);
            getDoc(userRef).then(snap => {
                if (snap.exists()) {
                    const pref = snap.data().preferences?.defaultAIPersona;
                    setAiPersona(pref || 'Concise');
                }
            });
        }
    }, [user, firestore]);

    // 2. Persona Change Handler
    const updatePersona = useCallback(async (newPersona: string) => {
        setAiPersona(newPersona);
        if (user && firestore) {
            try {
                await updateDoc(doc(firestore, 'users', user.uid), {
                    'preferences.defaultAIPersona': newPersona
                });
            } catch (e) {
                console.error("Failed to save persona preference:", e);
            }
        }
    }, [user, firestore]);

    // 3. Real-time Sync Listener
    const onRemoteUpdateRef = useRef(options.onRemoteUpdate);
    useEffect(() => {
        onRemoteUpdateRef.current = options.onRemoteUpdate;
    }, [options.onRemoteUpdate]);

    const subscribeToMap = useCallback((mapId: string, currentMap: MindMapData | undefined, isIdle: boolean) => {
        if (!user || !firestore || !mapId || !isIdle) return () => { };

        const metadataRef = doc(firestore, 'users', user.uid, 'mindmaps', mapId);
        const contentRef = doc(firestore, 'users', user.uid, 'mindmaps', mapId, 'content', 'tree');

        const unsubMetadata = onSnapshot(metadataRef, (snapshot) => {
            if (snapshot.metadata.hasPendingWrites) return;
            if (snapshot.exists()) {
                const remoteData = snapshot.data();

                // Track update times for synchronization
                const getMillis = (ts: any) => {
                    if (!ts) return 0;
                    if (typeof ts === 'number') return ts;
                    if (ts instanceof Date) return ts.getTime();
                    if (typeof ts.toMillis === 'function') return ts.toMillis();
                    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
                    return 0;
                };

                const remoteUpdatedAt = getMillis((remoteData as any).updatedAt);
                const localUpdatedAt = getMillis((currentMap as any)?.updatedAt);

                if (remoteUpdatedAt > localUpdatedAt && onRemoteUpdateRef.current) {
                    if (!remoteData.hasSplitContent) {
                        // Legacy Sync (full doc in metadata)
                        onRemoteUpdateRef.current({ ...remoteData, id: snapshot.id } as MindMapData);
                    } else if (currentMap) {
                        // Split Schema Sync: Merge metadata (isPublic, stats, etc) into existing map
                        onRemoteUpdateRef.current({ ...currentMap, ...remoteData, id: snapshot.id } as MindMapData);
                    }
                }
            }
        });

        const unsubContent = onSnapshot(contentRef, (snapshot) => {
            if (snapshot.metadata.hasPendingWrites) return;
            if (snapshot.exists()) {
                const contentData = snapshot.data();
                const getMillis = (ts: any) => {
                    if (!ts) return 0;
                    if (typeof ts === 'number') return ts;
                    if (ts instanceof Date) return ts.getTime();
                    if (typeof ts.toMillis === 'function') return ts.toMillis();
                    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
                    return 0;
                };

                const remoteUpdatedAt = getMillis((contentData as any).updatedAt);
                const localUpdatedAt = getMillis((currentMap as any)?.updatedAt);

                if (remoteUpdatedAt > localUpdatedAt && onRemoteUpdateRef.current && currentMap) {
                    onRemoteUpdateRef.current({ ...currentMap, ...contentData, id: mapId });
                }
            }
        });

        return () => {
            unsubMetadata();
            unsubContent();
        };
    }, [user, firestore, options]);

    // 4. Save Logic
    const saveMap = useCallback(async (mapToSave: MindMapData, existingId?: string, isSilent: boolean = false) => {
        if (!mapToSave || !user || !firestore || isSavingRef.current) return;

        if (mapToSave.mode === 'compare') {
            if (!mapToSave.compareData) {
                console.warn('Refused to save empty comparison map');
                return;
            }
        } else {
            if (!mapToSave.subTopics || mapToSave.subTopics.length === 0) {
                console.warn('Refused to save empty mind map');
                return;
            }
        }

        const isCompare = mapToSave.mode === 'compare';

        const targetId = existingId || mapToSave.id;
        isSavingRef.current = true;

        try {
            const safeTopic = mapToSave.topic || (mapToSave as any).compareData?.root?.title || 'mind map topic';
            const summary = mapToSave.summary || `A detailed mind map exploration of ${safeTopic}.`;
            // Detect person to avoid contradictory "NO portraits" for people
            const personKeywords = ['person', 'scientist', 'mathematician', 'leader', 'artist', 'founder', 'philosopher', 'explorer'];
            const lowerTopic = safeTopic.toLowerCase();
            const isProbablyPerson = personKeywords.some(kw => lowerTopic.includes(kw)) || /\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(safeTopic);

            // Create highly specific, literal thumbnail prompt - Unified for all modes
            const thumbnailPrompt = isProbablyPerson
                ? `Professional studio portrait of ${safeTopic}, photorealistic, high detail, authentic representation, dramatic lighting, sharp focus, 8k quality`
                : `Professional product photography of ${safeTopic}, exact subject matter, literal representation, authentic branding, studio lighting, sharp focus, 8k resolution, NO generic people or portraits, realistic objects only`;

            // SPLIT SCHEMA: Metadata vs Content
            const {
                subTopics,
                compareData,
                nodes,
                edges,
                id,
                explanations,
                sourceFileContent,
                originalPdfFileContent,
                ...metadata
            } = mapToSave as any;

            // Generate thumbnail IN BACKGROUND (non-blocking)
            let thumbnailUrl = mapToSave.thumbnailUrl || '';
            const generateThumbnailInBackground = async (mapId: string) => {
                if (thumbnailUrl) return;

                try {
                    console.log('🖼️ Generating background thumbnail...');

                    // Use the user's API key from AI config context (passed via options)
                    // Only fall back to Firestore settings if config key is not available
                    let effectiveApiKey = options.userApiKey;
                    let effectiveModel = options.preferredModel || 'flux';

                    if (!effectiveApiKey) {
                        try {
                            const { getUserImageSettings } = await import('@/lib/firestore-helpers');
                            const userSettings = await getUserImageSettings(firestore, user.uid);
                            if (userSettings?.pollinationsApiKey) effectiveApiKey = userSettings.pollinationsApiKey;
                            if (userSettings?.preferredModel) effectiveModel = userSettings.preferredModel;
                        } catch (firestoreError: any) {
                            console.warn('⚠️ Could not load user settings from Firestore:', firestoreError.message);
                        }
                    }

                    console.log(`🖼️ Thumbnail using: ${effectiveApiKey ? 'User Key' : 'Server Key'}, Model: ${effectiveModel}`);

                    // Call Pollinations API
                    const response = await fetch('/api/generate-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: thumbnailPrompt,
                            model: effectiveModel,
                            width: 512,
                            height: 288,
                            userId: user.uid,
                            userApiKey: effectiveApiKey
                        })
                    });

                    let finalThumbnailUrl = '';
                    if (response.ok) {
                        const data = await response.json();
                        finalThumbnailUrl = data.imageUrl;
                        console.log('✅ Background thumbnail generated:', data.model);
                    } else {
                        // Fallback to direct URL if API fails
                        finalThumbnailUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(thumbnailPrompt)}?model=flux&width=512&height=288&enhance=true`;
                        console.log('⚠️ Using fallback thumbnail URL');
                    }

                    // Try to update Firestore with the thumbnail (gracefully handle permission errors)
                    if (finalThumbnailUrl) {
                        try {
                            const metadataRef = doc(firestore, 'users', user.uid, 'mindmaps', mapId);
                            await updateDoc(metadataRef, { thumbnailUrl: finalThumbnailUrl });
                            console.log('✅ Thumbnail saved to Firestore');
                        } catch (firestoreError: any) {
                            console.warn('⚠️ Could not save thumbnail to Firestore:', firestoreError.message);
                            // Thumbnail was generated successfully, just couldn't save to Firestore
                        }
                    }
                } catch (err) {
                    console.warn('⚠️ Background thumbnail generation failed:', err);
                }
            };

            // Calculate Stats for Metadata
            let calculatedNodeCount = 0;
            let calculatedCategoriesCount = 0;
            let calculatedSourcesCount = 0;
            
            if (isCompare && compareData) {
                calculatedNodeCount = 1 + (compareData.unityNexus?.length || 0) + (compareData.dimensions?.length || 0);
                calculatedCategoriesCount = compareData.dimensions?.length || 0;
            } else if (subTopics) {
                calculatedNodeCount = 1; // Root node
                subTopics.forEach((st: any) => {
                    calculatedNodeCount++; // SubTopic node
                    if (st.categories) {
                        calculatedCategoriesCount += st.categories.length;
                        st.categories.forEach((cat: any) => {
                            calculatedNodeCount++; // Category node
                            if (cat.subCategories) {
                                calculatedNodeCount += cat.subCategories.length; // SubCategory node
                            }
                        });
                    }
                });
            }

            if (metadata.searchSources) {
                calculatedSourcesCount = metadata.searchSources.length;
            } else if (metadata.sourceUrl || sourceFileContent) {
                calculatedSourcesCount = 1;
            }

            const metadataToSave: any = {
                ...metadata,
                summary,
                updatedAt: serverTimestamp(),
                thumbnailUrl: thumbnailUrl || '', // Save empty initially if not exists
                thumbnailPrompt,
                userId: user.uid,
                isSubMap: mapToSave.mode === 'single' ? (mapToSave.isSubMap || false) : false,
                hasSplitContent: true, // Flag for migration/loading logic
                sourceFileType: mapToSave.sourceFileType || null,
                nodeCount: calculatedNodeCount,
                categoriesCount: calculatedCategoriesCount,
                sourcesCount: calculatedSourcesCount,
                aiPersona: aiPersona || 'Standard',
            };

            // Only include parentMapId if it exists (Firestore doesn't allow undefined)
            if (mapToSave.mode === 'single' && mapToSave.parentMapId) {
                metadataToSave.parentMapId = mapToSave.parentMapId;
            }

            const contentToSave = {
                subTopics: subTopics || [],
                compareData: compareData || null,
                nodes: nodes || [],
                edges: edges || [],
                explanations: explanations || {},
                sourceFileContent: sourceFileContent || null,
                originalPdfFileContent: originalPdfFileContent || null,
                updatedAt: serverTimestamp(),
            };

            // HELPER: Firestore doesn't allow 'undefined' fields anywhere in the document structure.
            // We recursively strip them while keeping Firestore FieldValues intact and handling cycles.
            const clean = (obj: any, seen = new WeakSet()): any => {
                if (obj === null || typeof obj !== 'object') return obj;

                // Prevent circular references/infinite recursion
                if (seen.has(obj)) {
                    return undefined; // Or return a placeholder if strictly needed, but undefined removes the key
                }

                // Don't recurse into Firestore FieldValues or Timestamps
                if (obj.constructor?.name === 'FieldValue' || obj.constructor?.name === 'Timestamp' || obj._methodName === 'serverTimestamp') {
                    return obj;
                }

                seen.add(obj);

                if (Array.isArray(obj)) {
                    return obj.map(item => clean(item, seen));
                }

                const newObj: any = {};
                Object.keys(obj).forEach(key => {
                    if (obj[key] !== undefined) {
                        const cleaned = clean(obj[key], seen);
                        if (cleaned !== undefined) {
                            newObj[key] = cleaned;
                        }
                    }
                });
                return newObj;
            };

            const metadataFinal = clean(metadataToSave);
            const contentFinal = clean(contentToSave);

            let finalId = targetId;
            if (targetId) {
                const metadataRef = doc(firestore, 'users', user.uid, 'mindmaps', targetId);
                const contentRef = doc(firestore, 'users', user.uid, 'mindmaps', targetId, 'content', 'tree');

                await setDoc(metadataRef, metadataFinal, { merge: true });
                await setDoc(contentRef, contentFinal);

                // Start background task if image missing
                generateThumbnailInBackground(targetId);
            } else {
                const mindMapsCollection = collection(firestore, 'users', user.uid, 'mindmaps');
                const docRef = await addDoc(mindMapsCollection, { ...metadataFinal, createdAt: serverTimestamp() });
                finalId = docRef.id;

                const contentRef = doc(firestore, 'users', user.uid, 'mindmaps', finalId, 'content', 'tree');
                await setDoc(contentRef, contentFinal);

                // Start background task
                generateThumbnailInBackground(finalId);

                // Track creation
                const mapAchievements = await trackMapCreated(firestore, user.uid);
                showAchievementToasts(mapAchievements);

                // Track initial nodes
                if (nodes && nodes.length > 0) {
                    const nodeAchievements = await trackNodesAdded(firestore, user.uid, nodes.length);
                    showAchievementToasts(nodeAchievements);
                }

                // Track nested expansion if applicable
                if (metadataFinal.isSubMap || metadataFinal.parentMapId) {
                    const expansionAchievements = await trackNestedExpansion(firestore, user.uid);
                    showAchievementToasts(expansionAchievements);
                }
            }

            if (!isSilent) {
                toast({
                    title: targetId ? 'Map Updated!' : 'Map Auto-Saved!',
                    description: `Mind map "${mapToSave.topic}" has been ${targetId ? 'updated' : 'saved'}.`,
                });
            }

            return finalId;
        } catch (err: any) {
            console.error('Firestore save failed:', err);
            // ... error handling ...
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: err.message || 'An unknown error occurred.',
            });
        } finally {
            isSavingRef.current = false;
        }
    }, [user, firestore, toast]);

    // 5. Track study time every 5 minutes
    useEffect(() => {
        if (!user || !firestore) return;

        const TRACK_INTERVAL = 5 * 60 * 1000;
        const MINUTES_PER_INTERVAL = 5;

        const intervalId = setInterval(async () => {
            try {
                await trackStudyTime(firestore, user.uid, MINUTES_PER_INTERVAL);
            } catch (error) {
                console.error('Error tracking study time:', error);
            }
        }, TRACK_INTERVAL);

        return () => clearInterval(intervalId);
    }, [user, firestore]);

    // 6. Debounced Auto-Save
    const setupAutoSave = useCallback((mindMap: MindMapData | undefined, hasUnsavedChanges: boolean, isSelfReference: boolean, persistFn: (silent: boolean) => void) => {
        if (!user || !mindMap || isSelfReference || !hasUnsavedChanges) return () => { };

        const timer = setTimeout(() => {
            persistFn(true);
        }, 3000); // 3 seconds auto-save threshold

        return () => clearTimeout(timer);
    }, [user]);

    return {
        aiPersona,
        updatePersona,
        subscribeToMap,
        saveMap,
        setupAutoSave
    };
}
