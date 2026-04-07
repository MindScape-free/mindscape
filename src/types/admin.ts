import { AdminStats } from './chat';

export type AdminTab = 'dashboard' | 'users' | 'logs' | 'feedback';
export type StatsRange = 'all';

// Default safe schemas - always return these to avoid undefined errors
export const DEFAULT_MAP_ANALYTICS = {
  totalAnalyzed: 0,
  modeCounts: { single: 0, compare: 0, multi: 0 },
  depthCounts: { low: 0, medium: 0, deep: 0, unspecified: 0 },
  sourceCounts: {} as Record<string, number>,
  personaCounts: {} as Record<string, number>,
  subMapStats: { total: 0, parents: 0, avgPerParent: 0 },
  publicPrivate: { public: 0, private: 0 },
  avgNodesPerMap: 0,
  featuredCount: 0,
  topPersona: 'N/A',
  userStats: [],
};

export interface UserContributionStats {
  userId: string;
  displayName: string;
  photoURL?: string;
  totalMaps: number;
  singleMaps: number;
  compareMaps: number;
  multiMaps: number;
  lowDepthMaps: number;
  mediumDepthMaps: number;
  deepDepthMaps: number;
  textSourceMaps: number;
  pdfSourceMaps: number;
  websiteSourceMaps: number;
  youtubeSourceMaps: number;
  imageSourceMaps: number;
  publicMaps: number;
}

export interface MapAnalytics {
  totalAnalyzed: number;
  modeCounts: { single: number; compare: number; multi: number };
  depthCounts: { low: number; medium: number; deep: number; unspecified: number };
  sourceCounts: Record<string, number>;
  personaCounts: Record<string, number>;
  subMapStats: { total: number; parents: number; avgPerParent: number | string };
  publicPrivate: { public: number; private: number };
  avgNodesPerMap: number | string;
  featuredCount: number;
  topPersona: string;
  userStats: UserContributionStats[];
}

// Precomputed stats stored in Firestore
export interface PrecomputedStats {
  totalUsers: number;
  totalMindmaps: number;
  totalChats: number;
  activeUsers: number;
  healthScore: number;
  mapAnalytics: typeof DEFAULT_MAP_ANALYTICS;
  timestamp: string;
  lastUpdated: number;
}

export interface DashboardMetrics {
  newUsersToday: number;
  newUsersYesterday: number;
  newMapsToday: number;
  newMapsYesterday: number;
  activeUsers24h: number;
  activeUsers48h: number;
  engagementRate: number;
  totalMindmapsEver?: number;

  usersThisWeek: number;
  usersLastWeek: number;
  mapsThisWeek: number;
  mapsLastWeek: number;
  avgMapsPerUser: number;
  avgChatsPerUser: number;

  latestUsers: any[];
  latestMaps: any[];

  usersLast7Days: { date: string; count: number }[];
  mapsLast7Days: { date: string; count: number }[];

  topUsers: any[];
  topMaps: any[];

  heatmapDays: {
    date: string;
    newUsers: number;
    newMaps: number;
    newSubMaps: number;
    activeUsers: number;
    publicMaps: number;
    privateMaps: number;
    totalActions?: number;
  }[];
  mapAnalytics: typeof DEFAULT_MAP_ANALYTICS;
}
