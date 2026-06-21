import { AdminStats } from './chat';

export type AdminTab = 'dashboard' | 'users' | 'logs' | 'feedback' | 'ai_telemetry';
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

// Precomputed stats for dashboard
export interface PrecomputedStats {
  totalUsers: number;
  totalMindmaps: number;
  totalChats: number;
  activeUsers: number;
  healthScore: number;
  mapAnalytics: MapAnalytics;
  lastUpdated: string | number;
}

// ─── Unified Event Log & Profile Types ──────────────────────────

export type UserEventType =
  | 'map_created'
  | 'map_deleted'
  | 'map_shared'
  | 'map_exported'
  | 'chat_sent'
  | 'image_generated'
  | 'node_expanded'
  | 'login'
  | 'logout'
  | 'study_time'
  | 'quiz_generated'
  | 'explanation_requested'
  | 'feedback_submitted';

export interface UserEvent {
  id: number;
  user_id: string;
  event_type: UserEventType;
  event_data: Record<string, any>;
  source?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  created_at: string;
}

export interface UserProfile {
  user_id: string;
  email?: string;
  display_name?: string;
  photo_url?: string;
  created_at?: string;

  // Aggregate counters
  total_maps: number;
  total_compare_maps: number;
  total_multi_maps: number;
  total_chats: number;
  total_nodes: number;
  total_images: number;
  total_expansions: number;
  study_time_minutes: number;

  // Streak
  current_streak: number;
  longest_streak: number;
  last_active_date?: string;

  // Breakdowns
  mode_breakdown: Record<string, number>;
  depth_breakdown: Record<string, number>;
  source_breakdown: Record<string, number>;
  persona_breakdown: Record<string, number>;

  // Activity heatmap data: { "2026-06-20": { maps: 3, chats: 5, ... } }
  daily_activity: Record<string, Record<string, number>>;

  unlocked_achievements?: string[];
  updated_at: string;
}

export interface PlatformStats {
  total_users: number;
  total_maps: number;
  total_maps_ever: number;
  total_chats: number;
  total_nodes: number;
  total_images: number;
  total_events: number;

  new_users_24h: number;
  new_maps_24h: number;
  active_users_24h: number;
  active_users_7d: number;
  new_users_7d: number;
  new_maps_7d: number;

  health_score: number;
  engagement_rate: number;

  top_persona: string;
  top_source_type: string;
  avg_maps_per_user: number;
  avg_nodes_per_map: number;

  // 31-day rolling heatmap
  daily_snapshot: {
    date: string;
    new_events: number;
    new_maps: number;
    active_users: number;
  }[];

  updated_at: string;
}

export interface UnifiedAdminResponse {
  platform: PlatformStats;
  user?: {
    profile: UserProfile;
    recent_events: UserEvent[];
  };
  meta: {
    cached: boolean;
    source: string;
  };
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
