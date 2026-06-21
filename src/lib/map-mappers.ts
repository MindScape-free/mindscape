/**
 * Maps a raw database row from the 'mindmaps' table to a plain object.
 * Standardizes snake_case to camelCase conversion across the application.
 *
 * NOTE: Returns a plain object (not MindMapData) because DB rows may contain
 * additional fields not in the interface. Consumers should cast to MindMapData
 * after ensuring the shape matches.
 */
interface MindMapDBRow {
  id?: string | null;
  topic?: string | null;
  thought?: string | null;
  short_title?: string | null;
  title?: string | null;
  icon?: string | null;
  user_id?: string | null;
  parent_map_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  summary?: string | null;
  summary_audio_url?: string | null;
  thumbnail_url?: string | null;
  thumbnail_prompt?: string | null;
  is_public?: boolean | null;
  public_views?: number | null;
  depth?: string | null;
  mode?: string | null;
  ai_persona?: string | null;
  node_count?: number | null;
  categories_count?: number | null;
  sources_count?: number | null;
  is_sub_map?: boolean | null;
  content?: Record<string, unknown> | null;
  pinned_messages?: unknown[] | null;
  search_sources?: unknown[] | null;
  search_timestamp?: string | null;
  source_url?: string | null;
  source_file_type?: string | null;
  video_id?: string | null;
  [key: string]: unknown;
}

export function mapMindMapRow(m: MindMapDBRow | null | undefined): Record<string, unknown> | null {
    if (!m) return null;
    
    return {
        id: m.id,
        topic: m.topic,
        thought: m.thought,
        shortTitle: m.short_title || m.topic || m.title || 'Untitled Map',
        icon: m.icon,
        userId: m.user_id,
        uid: m.user_id, // Legacy support
        parentMapId: m.parent_map_id,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        summary: m.summary,
        summaryAudioUrl: m.summary_audio_url,
        thumbnailUrl: m.thumbnail_url,
        thumbnailPrompt: m.thumbnail_prompt,
        isPublic: m.is_public,
        publicViews: m.public_views || 0,
        depth: m.depth || 'medium',
        mode: m.mode || 'single',
        aiPersona: m.ai_persona || 'Teacher',
        nodeCount: m.node_count || 0,
        categoriesCount: m.categories_count || 0,
        sourcesCount: m.sources_count || 0,
        isSubMap: m.is_sub_map || false,
        content: m.content || {},
        pinnedMessages: m.pinned_messages || [],
        searchSources: m.search_sources || [],
        searchTimestamp: m.search_timestamp,
        sourceUrl: m.source_url,
        sourceFileType: m.source_file_type,
        // Composite fields
        videoId: m.video_id, // Fallback if exists in JSON or column
    };
}

/**
 * Maps a raw database row from the 'users' table to a standard user object.
 * Accepts both camelCase and snake_case field names from different query paths.
 */
interface UserDBRow {
  id?: string | null;
  email?: string | null;
  display_name?: string | null;
  displayName?: string | null;
  photo_url?: string | null;
  photoURL?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  last_active?: string | null;
  lastActive?: string | null;
  is_admin?: boolean | null;
  isAdmin?: boolean | null;
  active_badge_id?: string | null;
  activeBadgeId?: string | null;
  statistics?: Record<string, unknown> | null;
  preferences?: Record<string, unknown> | null;
  api_settings?: Record<string, unknown> | null;
  apiSettings?: Record<string, unknown> | null;
  goals?: unknown[] | null;
  activity?: Record<string, unknown> | null;
  unlocked_achievements?: string[] | null;
  unlockedAchievements?: string[] | null;
  [key: string]: unknown;
}

export function mapUserRow(u: UserDBRow | null | undefined): Record<string, unknown> | null {
    if (!u) return null;
    return {
        id: u.id,
        email: u.email || null,
        displayName: u.display_name || (u.displayName as string) || u.email?.split('@')[0] || 'Unknown User',
        photoURL: u.photo_url || (u.photoURL as string) || null,
        createdAt: u.created_at || (u.createdAt as string),
        lastActive: u.last_active || (u.lastActive as string) || (u.statistics as Record<string, string>)?.last_active_date || (u.statistics as Record<string, string>)?.lastActiveDate,
        isAdmin: u.is_admin || (u.isAdmin as boolean) || false,
        activeBadgeId: u.active_badge_id || (u.activeBadgeId as string),
        statistics: {
            totalMapsCreated: (u.statistics as Record<string, number>)?.total_maps_created || (u.statistics as Record<string, number>)?.totalMapsCreated || 0,
            totalNestedExpansions: (u.statistics as Record<string, number>)?.total_nested_expansions || (u.statistics as Record<string, number>)?.totalNestedExpansions || 0,
            totalImagesGenerated: (u.statistics as Record<string, number>)?.total_images_generated || (u.statistics as Record<string, number>)?.totalImagesGenerated || 0,
            totalStudyTimeMinutes: (u.statistics as Record<string, number>)?.total_study_time_minutes || (u.statistics as Record<string, number>)?.totalStudyTimeMinutes || 0,
            currentStreak: (u.statistics as Record<string, number>)?.current_streak || (u.statistics as Record<string, number>)?.currentStreak || 0,
            longestStreak: (u.statistics as Record<string, number>)?.longest_streak || (u.statistics as Record<string, number>)?.longestStreak || 0,
            lastActiveDate: (u.statistics as Record<string, string>)?.last_active_date || (u.statistics as Record<string, string>)?.lastActiveDate || '',
            totalNodes: (u.statistics as Record<string, number>)?.total_nodes || (u.statistics as Record<string, number>)?.totalNodes || 0,
        },
        preferences: {
            preferredLanguage: (u.preferences as Record<string, string>)?.preferred_language || (u.preferences as Record<string, string>)?.preferredLanguage || 'en',
            defaultAIPersona: (u.preferences as Record<string, string>)?.default_ai_persona || (u.preferences as Record<string, string>)?.defaultAIPersona || 'concise',
            defaultDepth: (u.preferences as Record<string, string>)?.default_depth || (u.preferences as Record<string, string>)?.defaultDepth || 'auto',
            defaultExplanationMode: (u.preferences as Record<string, string>)?.default_explanation_mode || (u.preferences as Record<string, string>)?.defaultExplanationMode,
            autoGenerateImages: (u.preferences as Record<string, boolean>)?.auto_generate_images || (u.preferences as Record<string, boolean>)?.autoGenerateImages,
            deepExpansionMode: (u.preferences as Record<string, boolean>)?.deep_expansion_mode || (u.preferences as Record<string, boolean>)?.deepExpansionMode || false,
            defaultMapView: (u.preferences as Record<string, string>)?.default_map_view || (u.preferences as Record<string, string>)?.defaultMapView,
            autoSaveFrequency: (u.preferences as Record<string, number>)?.auto_save_frequency || (u.preferences as Record<string, number>)?.autoSaveFrequency,
        },
        apiSettings: {
            provider: (u.api_settings as Record<string, string>)?.provider || (u.apiSettings as Record<string, string>)?.provider || 'pollinations',
            imageProvider: (u.api_settings as Record<string, string>)?.image_provider || (u.apiSettings as Record<string, string>)?.imageProvider || 'pollinations',
            imageModel: (u.api_settings as Record<string, string>)?.image_model || (u.apiSettings as Record<string, string>)?.imageModel || 'flux',
            textModel: (u.api_settings as Record<string, string>)?.text_model || (u.apiSettings as Record<string, string>)?.textModel || 'openai',
            pollinationsModel: (u.api_settings as Record<string, string>)?.pollinations_model || (u.apiSettings as Record<string, string>)?.pollinationsModel || '',
            pollinationsApiKey: (u.api_settings as Record<string, string>)?.pollinations_api_key || (u.apiSettings as Record<string, string>)?.pollinationsApiKey || '',
        },
        goals: u.goals || [],
        activity: (u.activity as Record<string, unknown>) || {},
        unlockedAchievements: u.unlocked_achievements || (u.unlockedAchievements as string[]) || []
    };
}

/**
 * Maps a list of database rows to plain objects.
 */
export function mapMindMapRows(rows: unknown[] | null | undefined): Record<string, unknown>[] {
    if (!rows) return [];
    return rows.map(r => mapMindMapRow(r as MindMapDBRow | null)).filter(Boolean) as Record<string, unknown>[];
}

/**
 * Maps a list of database rows to User objects.
 */
export function mapUserRows(rows: unknown[] | null | undefined): Record<string, unknown>[] {
    if (!rows) return [];
    return rows.map(r => mapUserRow(r as UserDBRow | null)).filter(Boolean) as Record<string, unknown>[];
}
