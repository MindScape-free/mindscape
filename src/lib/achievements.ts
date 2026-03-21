// Achievement definitions and unlock logic for MindScape

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'Creation' | 'Consistency' | 'Exploration' | 'Visualization' | 'Knowledge' | 'Dedication';
    condition: (stats: UserStatistics) => boolean;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    progress: (stats: UserStatistics) => { current: number; target: number; label: string };
}

export interface UserStatistics {
    totalMapsCreated: number;
    totalNestedExpansions: number;
    totalImagesGenerated: number;
    totalStudyTimeMinutes: number;
    currentStreak: number;
    longestStreak: number;
}

export const ACHIEVEMENTS: Achievement[] = [
    // Getting Started
    {
        id: 'first_map',
        name: 'First Steps',
        description: 'Create your first mind map',
        icon: 'map',
        category: 'Creation',
        tier: 'bronze',
        condition: (stats) => stats.totalMapsCreated >= 1,
        progress: (stats) => ({ current: stats.totalMapsCreated, target: 1, label: 'map' }),
    },
    {
        id: 'explorer',
        name: 'Explorer',
        description: 'Create 10 mind maps',
        icon: 'compass',
        category: 'Creation',
        tier: 'silver',
        condition: (stats) => stats.totalMapsCreated >= 10,
        progress: (stats) => ({ current: stats.totalMapsCreated, target: 10, label: 'maps' }),
    },
    {
        id: 'cartographer',
        name: 'Cartographer',
        description: 'Create 50 mind maps',
        icon: 'map-pin',
        category: 'Creation',
        tier: 'gold',
        condition: (stats) => stats.totalMapsCreated >= 50,
        progress: (stats) => ({ current: stats.totalMapsCreated, target: 50, label: 'maps' }),
    },
    {
        id: 'master_mapper',
        name: 'Master Mapper',
        description: 'Create 100 mind maps',
        icon: 'globe',
        category: 'Creation',
        tier: 'platinum',
        condition: (stats) => stats.totalMapsCreated >= 100,
        progress: (stats) => ({ current: stats.totalMapsCreated, target: 100, label: 'maps' }),
    },

    // Streaks
    {
        id: 'consistent_learner',
        name: 'Consistent Learner',
        description: 'Maintain a 7-day learning streak',
        icon: 'flame',
        category: 'Consistency',
        tier: 'bronze',
        condition: (stats) => stats.currentStreak >= 7,
        progress: (stats) => ({ current: stats.currentStreak, target: 7, label: 'days' }),
    },
    {
        id: 'dedicated_student',
        name: 'Dedicated Student',
        description: 'Maintain a 30-day learning streak',
        icon: 'zap',
        category: 'Consistency',
        tier: 'silver',
        condition: (stats) => stats.currentStreak >= 30,
        progress: (stats) => ({ current: stats.currentStreak, target: 30, label: 'days' }),
    },
    {
        id: 'unstoppable',
        name: 'Unstoppable',
        description: 'Maintain a 100-day learning streak',
        icon: 'award',
        category: 'Consistency',
        tier: 'gold',
        condition: (stats) => stats.currentStreak >= 100,
        progress: (stats) => ({ current: stats.currentStreak, target: 100, label: 'days' }),
    },

    // Deep Learning
    {
        id: 'deep_thinker',
        name: 'Deep Thinker',
        description: 'Create 10 nested expansions',
        icon: 'network',
        category: 'Exploration',
        tier: 'bronze',
        condition: (stats) => stats.totalNestedExpansions >= 10,
        progress: (stats) => ({ current: stats.totalNestedExpansions, target: 10, label: 'expansions' }),
    },
    {
        id: 'mind_architect',
        name: 'Mind Architect',
        description: 'Create 50 nested expansions',
        icon: 'git-branch',
        category: 'Exploration',
        tier: 'silver',
        condition: (stats) => stats.totalNestedExpansions >= 50,
        progress: (stats) => ({ current: stats.totalNestedExpansions, target: 50, label: 'expansions' }),
    },
    {
        id: 'knowledge_weaver',
        name: 'Knowledge Weaver',
        description: 'Create 200 nested expansions',
        icon: 'share-2',
        category: 'Exploration',
        tier: 'gold',
        condition: (stats) => stats.totalNestedExpansions >= 200,
        progress: (stats) => ({ current: stats.totalNestedExpansions, target: 200, label: 'expansions' }),
    },

    // Visual Learning
    {
        id: 'visual_learner',
        name: 'Visual Learner',
        description: 'Generate 10 AI images',
        icon: 'image',
        category: 'Visualization',
        tier: 'bronze',
        condition: (stats) => stats.totalImagesGenerated >= 10,
        progress: (stats) => ({ current: stats.totalImagesGenerated, target: 10, label: 'images' }),
    },
    {
        id: 'art_enthusiast',
        name: 'Art Enthusiast',
        description: 'Generate 50 AI images',
        icon: 'palette',
        category: 'Visualization',
        tier: 'silver',
        condition: (stats) => stats.totalImagesGenerated >= 50,
        progress: (stats) => ({ current: stats.totalImagesGenerated, target: 50, label: 'images' }),
    },
    {
        id: 'visual_master',
        name: 'Visual Master',
        description: 'Generate 200 AI images',
        icon: 'sparkles',
        category: 'Visualization',
        tier: 'gold',
        condition: (stats) => stats.totalImagesGenerated >= 200,
        progress: (stats) => ({ current: stats.totalImagesGenerated, target: 200, label: 'images' }),
    },


    // Study Time
    {
        id: 'focused_learner',
        name: 'Focused Learner',
        description: 'Spend 10 hours studying',
        icon: 'clock',
        category: 'Dedication',
        tier: 'bronze',
        condition: (stats) => stats.totalStudyTimeMinutes >= 600,
        progress: (stats) => ({ current: stats.totalStudyTimeMinutes, target: 600, label: 'minutes' }),
    },
    {
        id: 'dedicated_scholar',
        name: 'Dedicated Scholar',
        description: 'Spend 50 hours studying',
        icon: 'book-open',
        category: 'Dedication',
        tier: 'silver',
        condition: (stats) => stats.totalStudyTimeMinutes >= 3000,
        progress: (stats) => ({ current: stats.totalStudyTimeMinutes, target: 3000, label: 'minutes' }),
    },
    {
        id: 'knowledge_seeker',
        name: 'Knowledge Seeker',
        description: 'Spend 100 hours studying',
        icon: 'graduation-cap',
        category: 'Dedication',
        tier: 'gold',
        condition: (stats) => stats.totalStudyTimeMinutes >= 6000,
        progress: (stats) => ({ current: stats.totalStudyTimeMinutes, target: 6000, label: 'minutes' }),
    },
];

/**
 * Check which achievements a user has unlocked based on their statistics
 */
export function checkUnlockedAchievements(
    stats: UserStatistics,
    currentAchievements: string[]
): string[] {
    const unlockedIds = ACHIEVEMENTS.filter((achievement) =>
        achievement.condition(stats)
    ).map((a) => a.id);

    return unlockedIds;
}

/**
 * Get newly unlocked achievements (not in current list)
 */
export function getNewlyUnlockedAchievements(
    stats: UserStatistics,
    currentAchievements: string[]
): Achievement[] {
    const allUnlocked = checkUnlockedAchievements(stats, currentAchievements);
    const newIds = allUnlocked.filter((id) => !currentAchievements.includes(id));
    return ACHIEVEMENTS.filter((a) => newIds.includes(a.id));
}

/**
 * Get achievement progress percentage
 */
export function getAchievementProgress(stats: UserStatistics): number {
    const unlocked = checkUnlockedAchievements(stats, []);
    return Math.round((unlocked.length / ACHIEVEMENTS.length) * 100);
}
