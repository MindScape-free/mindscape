import { SupabaseClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { Achievement, getNewlyUnlockedAchievements, UserStatistics } from './achievements';

export async function updateUserStatistics(
  supabase: SupabaseClient,
  userId: string,
  updates: {
    mapsCreated?: number;
    nestedExpansions?: number;
    imagesGenerated?: number;
    studyTimeMinutes?: number;
    nodesCreated?: number;
    mapMetadata?: {
      mode?: string;
      sourceFileType?: string;
      sourceType?: string;
      sourceUrl?: string;
      videoId?: string;
      depth?: string;
      nodeCount?: number;
      aiPersona?: string;
    };
  }
): Promise<Achievement[]> {
  const today = format(new Date(), 'yyyy-MM-dd');

  try {
    const { data: user } = await supabase.from('users').select('statistics, activity, unlocked_achievements').eq('id', userId).single();
    const stats = user?.statistics || {};
    const activity = user?.activity || {};

    // Update streak
    const lastActiveDate = stats.lastActiveDate;
    let currentStreak = stats.currentStreak || 0;
    let longestStreak = stats.longestStreak || 0;

    if (lastActiveDate !== today) {
      const lastDate = lastActiveDate ? new Date(lastActiveDate) : null;
      const todayDate = new Date(today);
      if (lastDate) {
        lastDate.setHours(0, 0, 0, 0);
        todayDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);
        currentStreak = daysDiff === 1 ? currentStreak + 1 : 1;
      } else {
        currentStreak = 1;
      }
      longestStreak = Math.max(currentStreak, longestStreak);
    }

    const newStats = {
      ...stats,
      totalMapsCreated: (stats.totalMapsCreated || 0) + (updates.mapsCreated || 0),
      totalNestedExpansions: (stats.totalNestedExpansions || 0) + (updates.nestedExpansions || 0),
      totalImagesGenerated: (stats.totalImagesGenerated || 0) + (updates.imagesGenerated || 0),
      totalStudyTimeMinutes: (stats.totalStudyTimeMinutes || 0) + (updates.studyTimeMinutes || 0),
      totalNodes: (stats.totalNodes || 0) + (updates.nodesCreated || 0),
      lastActiveDate: today,
      currentStreak,
      longestStreak,
    };

    const todayActivity = activity[today] || {};
    const newActivity = {
      ...activity,
      [today]: {
        ...todayActivity,
        mapsCreated: (todayActivity.mapsCreated || 0) + (updates.mapsCreated || 0),
        nestedExpansions: (todayActivity.nestedExpansions || 0) + (updates.nestedExpansions || 0),
        imagesGenerated: (todayActivity.imagesGenerated || 0) + (updates.imagesGenerated || 0),
        studyTimeMinutes: (todayActivity.studyTimeMinutes || 0) + (updates.studyTimeMinutes || 0),
        nodesCreated: (todayActivity.nodesCreated || 0) + (updates.nodesCreated || 0),
      },
    };

    await supabase.from('users').update({ statistics: newStats, activity: newActivity }).eq('id', userId);

    // Check achievements
    const userStats: UserStatistics = {
      totalMapsCreated: newStats.totalMapsCreated,
      totalNestedExpansions: newStats.totalNestedExpansions,
      totalImagesGenerated: newStats.totalImagesGenerated,
      totalStudyTimeMinutes: newStats.totalStudyTimeMinutes,
      currentStreak: newStats.currentStreak,
      longestStreak: newStats.longestStreak,
    };
    const currentAchievements: string[] = user?.unlocked_achievements || [];
    const newlyUnlocked = getNewlyUnlockedAchievements(userStats, currentAchievements);

    if (newlyUnlocked.length > 0) {
      await supabase.from('users').update({
        unlocked_achievements: [...currentAchievements, ...newlyUnlocked.map(a => a.id)],
      }).eq('id', userId);
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Error updating user statistics:', error);
    return [];
  }
}

export async function trackLogin(supabase: SupabaseClient, userId: string, userMeta?: { displayName?: string | null; email?: string | null; photoURL?: string | null }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  try {
    const { data: user } = await supabase.from('users').select('id, statistics').eq('id', userId).single();
    if (!user) {
      await initializeUserProfile(supabase, userId, userMeta?.displayName || '', userMeta?.email || '', userMeta?.photoURL || undefined);
      return;
    }
    const lastActiveDate = user.statistics?.lastActiveDate;
    if (lastActiveDate !== today) {
      await updateUserStatistics(supabase, userId, {});
    }
  } catch (error) {
    console.error('Error tracking login:', error);
  }
}

export async function trackMapCreated(supabase: SupabaseClient, userId: string, mapMetadata?: any): Promise<Achievement[]> {
  return updateUserStatistics(supabase, userId, { mapsCreated: 1, mapMetadata });
}

export async function trackNestedExpansion(supabase: SupabaseClient, userId: string): Promise<Achievement[]> {
  return updateUserStatistics(supabase, userId, { nestedExpansions: 1 });
}

export async function trackImageGenerated(supabase: SupabaseClient, userId: string): Promise<Achievement[]> {
  return updateUserStatistics(supabase, userId, { imagesGenerated: 1 });
}

export async function trackStudyTime(supabase: SupabaseClient, userId: string, minutes: number): Promise<Achievement[]> {
  return updateUserStatistics(supabase, userId, { studyTimeMinutes: minutes });
}

export async function trackNodesAdded(supabase: SupabaseClient, userId: string, count: number): Promise<Achievement[]> {
  if (count <= 0) return [];
  return updateUserStatistics(supabase, userId, { nodesCreated: count });
}

export async function initializeUserProfile(
  supabase: SupabaseClient,
  userId: string,
  displayName: string,
  email: string,
  photoURL?: string
) {
  const today = format(new Date(), 'yyyy-MM-dd');
  await supabase.from('users').upsert({
    id: userId,
    display_name: displayName,
    email,
    photo_url: photoURL || null,
    created_at: new Date().toISOString(),
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
      currentStreak: 1,
      longestStreak: 1,
      totalNodes: 0,
    },
    activity: {},
    unlocked_achievements: [],
  }, { onConflict: 'id' });
}
