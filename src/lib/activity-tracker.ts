import { doc, setDoc, getDoc, getDocs, updateDoc, increment, deleteField, FieldPath, collection, serverTimestamp } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { format } from 'date-fns';
import { Achievement, getNewlyUnlockedAchievements, UserStatistics } from './achievements';

/**
 * Update user statistics in Firestore and check for newly unlocked achievements
 */
export async function updateUserStatistics(
    firestore: Firestore,
    userId: string,
    updates: {
        mapsCreated?: number;
        nestedExpansions?: number;
        imagesGenerated?: number;
        studyTimeMinutes?: number;
        nodesCreated?: number;
    }
): Promise<Achievement[]> {
    const userRef = doc(firestore, 'users', userId);
    const today = format(new Date(), 'yyyy-MM-dd');

    try {
        const userDoc = await getDoc(userRef);
        const data = userDoc.data();
        const lastActiveDate = data?.statistics?.lastActiveDate;

        // 1. Update streak FIRST using the existing DB state
        await updateStreak(firestore, userId, today, lastActiveDate);

        // 2. Update all other statistics
        const statisticsUpdates: any = {};
        if (updates.mapsCreated) statisticsUpdates['statistics.totalMapsCreated'] = increment(updates.mapsCreated);
        if (updates.nestedExpansions) statisticsUpdates['statistics.totalNestedExpansions'] = increment(updates.nestedExpansions);
        if (updates.imagesGenerated) statisticsUpdates['statistics.totalImagesGenerated'] = increment(updates.imagesGenerated);
        if (updates.studyTimeMinutes) statisticsUpdates['statistics.totalStudyTimeMinutes'] = increment(updates.studyTimeMinutes);
        if (updates.nodesCreated) statisticsUpdates['statistics.totalNodes'] = increment(updates.nodesCreated);

        statisticsUpdates['statistics.lastActiveDate'] = today;

        if (Object.keys(statisticsUpdates).length > 0) {
            await updateDoc(userRef, statisticsUpdates);
        }

        // 3. Update daily activity
        const activityUpdates: any = {};
        if (updates.mapsCreated) activityUpdates[`activity.${today}.mapsCreated`] = increment(updates.mapsCreated);
        if (updates.nestedExpansions) activityUpdates[`activity.${today}.nestedExpansions`] = increment(updates.nestedExpansions);
        if (updates.imagesGenerated) activityUpdates[`activity.${today}.imagesGenerated`] = increment(updates.imagesGenerated);
        if (updates.studyTimeMinutes) activityUpdates[`activity.${today}.studyTimeMinutes`] = increment(updates.studyTimeMinutes);
        if (updates.nodesCreated) activityUpdates[`activity.${today}.nodesCreated`] = increment(updates.nodesCreated);

        if (Object.keys(activityUpdates).length > 0) {
            await updateDoc(userRef, activityUpdates);
        }

        // 4. Check for newly unlocked achievements
        try {
            const freshDoc = await getDoc(userRef);
            const freshData = freshDoc.data();
            if (freshData?.statistics) {
                const stats: UserStatistics = {
                    totalMapsCreated: freshData.statistics.totalMapsCreated || 0,
                    totalNestedExpansions: freshData.statistics.totalNestedExpansions || 0,
                    totalImagesGenerated: freshData.statistics.totalImagesGenerated || 0,
                    totalStudyTimeMinutes: freshData.statistics.totalStudyTimeMinutes || 0,
                    currentStreak: freshData.statistics.currentStreak || 0,
                    longestStreak: freshData.statistics.longestStreak || 0,
                };
                const currentAchievements: string[] = freshData.unlockedAchievements || [];
                const newlyUnlocked = getNewlyUnlockedAchievements(stats, currentAchievements);

                if (newlyUnlocked.length > 0) {
                    // Persist newly unlocked achievement IDs
                    const updatedAchievements = [...currentAchievements, ...newlyUnlocked.map(a => a.id)];
                    await updateDoc(userRef, {
                        unlockedAchievements: updatedAchievements,
                    });
                    return newlyUnlocked;
                }
            }
        } catch (achError) {
            console.warn('Achievement check failed (non-critical):', achError);
        }

        return [];
    } catch (error) {
        console.error('Error updating user statistics:', error);
        return [];
    }
}

/**
 * Track user login to maintain daily streak
 */
export async function trackLogin(firestore: Firestore, userId: string, firebaseUser?: User | null) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const userRef = doc(firestore, 'users', userId);

    try {
        const userDoc = await getDoc(userRef);

        // If user doesn't exist in Firestore, initialize them
        if (!userDoc.exists()) {
            if (firebaseUser) {
                await initializeUserProfile(
                    firestore,
                    userId,
                    firebaseUser.displayName || 'ADMIN',
                    firebaseUser.email || '',
                    firebaseUser.photoURL || undefined
                );
            }
            return;
        }

        const data = userDoc.data();
        const lastActiveDate = data?.statistics?.lastActiveDate;

        if (lastActiveDate !== today) {
            await updateStreak(firestore, userId, today, lastActiveDate);
            await updateDoc(userRef, {
                'statistics.lastActiveDate': today
            });
        }

        // Automatic one-time sync for historical data
        if (!data.hasSyncedHistorical) {
            await syncHistoricalStatistics(firestore, userId);
        }
    } catch (error) {
        console.error('Error tracking login:', error);
    }
}

/**
 * Update learning streak
 */
async function updateStreak(firestore: Firestore, userId: string, today: string, lastActiveDate?: string) {
    const userRef = doc(firestore, 'users', userId);

    try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) return;

        const data = userDoc.data();
        const currentStreak = data.statistics?.currentStreak || 0;
        const longestStreak = data.statistics?.longestStreak || 0;

        if (!lastActiveDate) {
            // First time ever active
            await updateDoc(userRef, {
                'statistics.currentStreak': 1,
                'statistics.longestStreak': Math.max(1, longestStreak)
            });
            return;
        }

        if (lastActiveDate === today) {
            // Already active today, do nothing to streak
            return;
        }

        // Calculate days difference
        const lastDate = new Date(lastActiveDate);
        const currentDate = new Date(today);

        // Use UTC midnight comparison to avoid timezone issues
        lastDate.setHours(0, 0, 0, 0);
        currentDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        let newStreak = 1;
        if (daysDiff === 1) {
            // Consecutive day
            newStreak = currentStreak + 1;
        } else {
            // Broken streak, reset to 1
            newStreak = 1;
        }

        await updateDoc(userRef, {
            'statistics.currentStreak': newStreak,
            'statistics.longestStreak': Math.max(newStreak, longestStreak)
        });
    } catch (error) {
        console.error('Error updating streak:', error);
    }
}

/**
 * Track mind map creation
 */
export async function trackMapCreated(firestore: Firestore, userId: string): Promise<Achievement[]> {
    return await updateUserStatistics(firestore, userId, { mapsCreated: 1 });
}

/**
 * Track nested expansion
 */
export async function trackNestedExpansion(firestore: Firestore, userId: string): Promise<Achievement[]> {
    return await updateUserStatistics(firestore, userId, { nestedExpansions: 1 });
}

/**
 * Track image generation
 */
export async function trackImageGenerated(firestore: Firestore, userId: string): Promise<Achievement[]> {
    return await updateUserStatistics(firestore, userId, { imagesGenerated: 1 });
}

/**
 * Track study time (call periodically)
 */
export async function trackStudyTime(firestore: Firestore, userId: string, minutes: number): Promise<Achievement[]> {
    return await updateUserStatistics(firestore, userId, { studyTimeMinutes: minutes });
}

/**
 * Track total nodes added
 */
export async function trackNodesAdded(firestore: Firestore, userId: string, count: number): Promise<Achievement[]> {
    if (count <= 0) return [];
    return await updateUserStatistics(firestore, userId, { nodesCreated: count });
}

/**
 * Sync historical statistics from activity log to statistics summary
 */
export async function syncHistoricalStatistics(firestore: Firestore, userId: string) {
    const userRef = doc(firestore, 'users', userId);

    try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) return;

        const data = userDoc.data();
        const activity = { ...(data.activity || {}) };

        // --- PHANTOM ACTIVITY AGGREGATION ---
        // Some older data might be stored as root fields like "activity.2026-01-20.mapsCreated"
        // We scan all keys to find and merge these into our calculation
        const phantomPaths: FieldPath[] = [];
        Object.keys(data).forEach(key => {
            if (key.startsWith('activity.')) {
                phantomPaths.push(new FieldPath(key));
                const parts = key.split('.');
                if (parts.length === 3) {
                    const date = parts[1];
                    const field = parts[2];
                    if (!activity[date]) activity[date] = {};

                    // Add the value if it's a number and doesn't exist in nested structure yet
                    // or if it's a conflict, we prefer the root field as it might be newer
                    activity[date][field] = (activity[date][field] || 0) + (data[key] || 0);
                }
            }
        });

        let totalMaps = 0;
        let totalExpansions = 0;
        let totalImages = 0;
        let totalStudyTime = 0;
        let totalNodes = 0;

        // Iterate through all activity dates to aggregate totals
        Object.values(activity).forEach((day: any) => {
            if (day.mapsCreated) totalMaps += day.mapsCreated;
            if (day.nestedExpansions) totalExpansions += day.nestedExpansions;
            if (day.imagesGenerated) totalImages += day.imagesGenerated;
            if (day.studyTimeMinutes) totalStudyTime += day.studyTimeMinutes;
            if (day.nodesCreated) totalNodes += day.nodesCreated;
        });

        // --- COLLECTION-BASED CATCH-UP ---
        // We scan the actual mindmaps collection to find nodes and expansions 
        // that might have been missed by activity tracking.
        console.log(`🔍 Scanning collections for ${userId}...`);
        const mindMapsCollection = collection(firestore, 'users', userId, 'mindmaps');
        const mindMapsSnap = await getDocs(mindMapsCollection);

        let collectionMapsCount = 0;
        let collectionExpansionsCount = 0;
        let collectionNodesCount = 0;

        for (const mapDoc of mindMapsSnap.docs) {
            collectionMapsCount++;
            const mapData = mapDoc.data();

            // Check if it's an expansion
            if (mapData.isSubMap || mapData.parentMapId) {
                collectionExpansionsCount++;
            }

            // Fetch content to count nodes (accurate but slightly heavier)
            try {
                const contentRef = doc(firestore, 'users', userId, 'mindmaps', mapDoc.id, 'content', 'tree');
                const contentSnap = await getDoc(contentRef);
                if (contentSnap.exists()) {
                    const content = contentSnap.data();
                    let nodesInCurrentMap = 1; // Start with root

                    if (mapData.mode === 'compare' || content.compareData) {
                        const cd = content.compareData;
                        if (cd) {
                            const simCount = cd.similarities?.length || 0;
                            const diffACount = cd.differences?.topicA?.length || 0;
                            const diffBCount = cd.differences?.topicB?.length || 0;
                            nodesInCurrentMap += simCount + diffACount + diffBCount;
                            nodesInCurrentMap += (cd.relevantLinks?.length || 0);
                            nodesInCurrentMap += (cd.topicADeepDive?.length || 0);
                            nodesInCurrentMap += (cd.topicBDeepDive?.length || 0);
                        }
                    } else if (content.subTopics) {
                        const countNodesRecursive = (items: any[]): number => {
                            let count = 0;
                            items.forEach(item => {
                                count++;
                                if (item.categories) count += countNodesRecursive(item.categories);
                                if (item.subCategories) count += countNodesRecursive(item.subCategories);
                            });
                            return count;
                        };
                        nodesInCurrentMap += countNodesRecursive(content.subTopics);
                    } else if (content.nodes) {
                        // Fallback to simple nodes array if present
                        nodesInCurrentMap = content.nodes.length;
                    }
                    collectionNodesCount += nodesInCurrentMap;
                }
            } catch (err) {
                console.warn(`Failed to count nodes for map ${mapDoc.id}:`, err);
            }
        }

        // We take the MAX of activity logs and physical collection counts
        totalMaps = Math.max(totalMaps, collectionMapsCount);
        totalExpansions = Math.max(totalExpansions, collectionExpansionsCount);
        totalNodes = Math.max(totalNodes, collectionNodesCount);

        // --- STREAK RECONSTRUCTION ---
        // We include lastActiveDate as a "virtual" activity date if it exists
        const datesSet = new Set(Object.keys(activity));
        const lastActiveDateStr = data?.statistics?.lastActiveDate;
        if (lastActiveDateStr) datesSet.add(lastActiveDateStr);

        const dates = Array.from(datesSet).sort();
        let currentStreak = 0;
        let longestStreak = data?.statistics?.longestStreak || 0;
        let tempStreak = 0;
        let lastDate: Date | null = null;

        dates.forEach(dateStr => {
            const currentDate = new Date(dateStr);
            currentDate.setHours(0, 0, 0, 0);

            if (!lastDate) {
                tempStreak = 1;
            } else if (lastDate) {
                const diffDays = Math.floor((currentDate.getTime() - (lastDate as Date).getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    tempStreak++;
                } else if (diffDays > 0) {
                    tempStreak = 1;
                }
            }
            lastDate = currentDate;
            if (tempStreak > longestStreak) longestStreak = tempStreak;
        });

        // Check if the streak is still active today
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const todayDate = new Date(todayStr);
        todayDate.setHours(0, 0, 0, 0);

        if (lastDate) {
            const lastDateStr = format(lastDate, 'yyyy-MM-dd');
            const diffFromToday = Math.floor((todayDate.getTime() - (lastDate as Date).getTime()) / (1000 * 60 * 60 * 24));

            // If the last date in our processed sequence is today or yesterday, the streak is alive
            if (diffFromToday === 0 || diffFromToday === 1) {
                currentStreak = tempStreak;
            } else {
                currentStreak = 0;
            }
        }

        // We combine nested updates and phantom deletions
        const updateArgs: any[] = [
            'statistics.totalMapsCreated', totalMaps,
            'statistics.totalNestedExpansions', totalExpansions,
            'statistics.totalImagesGenerated', totalImages,
            'statistics.totalStudyTimeMinutes', totalStudyTime,
            'statistics.totalNodes', totalNodes,
            'statistics.currentStreak', currentStreak,
            'statistics.longestStreak', longestStreak,
            'hasSyncedHistorical', true,
            'activity', activity // Ensure activity map has all aggregated data
        ];

        // Add phantom path deletions for statistics
        [
            'statistics.totalMapsCreated', 'statistics.totalNestedExpansions',
            'statistics.totalImagesGenerated', 'statistics.totalStudyTimeMinutes',
            'statistics.totalNodes', 'statistics.currentStreak',
            'statistics.longestStreak', 'statistics.lastActiveDate'
        ].forEach(path => {
            updateArgs.push(new FieldPath(path), deleteField());
        });

        // Add phantom path deletions for activity
        phantomPaths.forEach(fp => {
            updateArgs.push(fp, deleteField());
        });

        await updateDoc(userRef, updateArgs[0], updateArgs[1], ...updateArgs.slice(2));

        console.log(`✅ Deep Synced statistics for ${userId}:`, { totalMaps, totalStudyTime, currentStreak, longestStreak });
    } catch (error) {
        console.error('Error syncing historical statistics:', error);
    }
}

/**
 * Initialize user profile with default values
 */
export async function initializeUserProfile(
    firestore: Firestore,
    userId: string,
    displayName: string,
    email: string,
    photoURL?: string
) {
    const userRef = doc(firestore, 'users', userId);
    const today = format(new Date(), 'yyyy-MM-dd');

    const defaultProfile = {
        displayName,
        email,
        photoURL: photoURL || null,
        createdAt: serverTimestamp(),
        preferences: {
            defaultExplanationMode: 'Intermediate',
            preferredLanguage: 'en',
            defaultAIPersona: 'Concise',
            autoGenerateImages: false,
            defaultMapView: 'collapsed',
            autoSaveFrequency: 5,
        },
        statistics: {
            totalMapsCreated: 0,
            totalNestedExpansions: 0,
            totalImagesGenerated: 0,
            totalStudyTimeMinutes: 0,
            lastActiveDate: today,
            currentStreak: 1, // Start with 1 day streak as they are active now
            longestStreak: 1,
            totalNodes: 0,
        },
        goals: {
            weeklyMapGoal: 5,
            monthlyMapGoal: 20,
        },
        achievements: [],
        collections: {},
        recentlyViewed: [],
        activity: {},
        hasSyncedHistorical: true, // New users don't need historical sync
    };

    await setDoc(userRef, defaultProfile, { merge: true });
}
