import { MindMapData } from "@/types/mind-map";

/**
 * Maps a raw database row from the 'mindmaps' table to the MindMapData interface.
 * Standardizes snake_case to camelCase conversion across the application.
 */
export function mapMindMapRow(m: any): any {
    if (!m) return null;
    
    return {
        ...m,
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
 */
export function mapUserRow(u: any): any {
    if (!u) return null;
    return {
        id: u.id,
        email: u.email || null,
        displayName: u.display_name || u.displayName || u.email?.split('@')[0] || 'Unknown User',
        photoURL: u.photo_url || u.photoURL || null,
        createdAt: u.created_at || u.createdAt,
        lastActive: u.last_active || u.lastActive || u.statistics?.last_active_date || u.statistics?.lastActiveDate,
        isAdmin: u.is_admin || u.isAdmin || false,
        activeBadgeId: u.active_badge_id || u.activeBadgeId,
        statistics: {
            totalMapsCreated: u.statistics?.total_maps_created || u.statistics?.totalMapsCreated || 0,
            totalNestedExpansions: u.statistics?.total_nested_expansions || u.statistics?.totalNestedExpansions || 0,
            totalImagesGenerated: u.statistics?.total_images_generated || u.statistics?.totalImagesGenerated || 0,
            totalStudyTimeMinutes: u.statistics?.total_study_time_minutes || u.statistics?.totalStudyTimeMinutes || 0,
            currentStreak: u.statistics?.current_streak || u.statistics?.currentStreak || 0,
            longestStreak: u.statistics?.longest_streak || u.statistics?.longestStreak || 0,
            lastActiveDate: u.statistics?.last_active_date || u.statistics?.lastActiveDate || '',
            totalNodes: u.statistics?.total_nodes || u.statistics?.totalNodes || 0,
        },
        preferences: {
            preferredLanguage: u.preferences?.preferred_language || u.preferences?.preferredLanguage || 'en',
            defaultAIPersona: u.preferences?.default_ai_persona || u.preferences?.defaultAIPersona || 'concise',
            defaultDepth: u.preferences?.default_depth || u.preferences?.defaultDepth || 'auto',
            defaultExplanationMode: u.preferences?.default_explanation_mode || u.preferences?.defaultExplanationMode,
            autoGenerateImages: u.preferences?.auto_generate_images || u.preferences?.autoGenerateImages,
            deepExpansionMode: u.preferences?.deep_expansion_mode || u.preferences?.deepExpansionMode || false,
            defaultMapView: u.preferences?.default_map_view || u.preferences?.defaultMapView,
            autoSaveFrequency: u.preferences?.auto_save_frequency || u.preferences?.autoSaveFrequency,
        },
        apiSettings: {
            provider: u.api_settings?.provider || u.apiSettings?.provider || 'pollinations',
            imageProvider: u.api_settings?.image_provider || u.apiSettings?.imageProvider || 'pollinations',
            imageModel: u.api_settings?.image_model || u.apiSettings?.imageModel || 'flux',
            textModel: u.api_settings?.text_model || u.apiSettings?.textModel || 'openai',
            pollinationsModel: u.api_settings?.pollinations_model || u.apiSettings?.pollinationsModel || '',
            pollinationsApiKey: u.api_settings?.pollinations_api_key || u.apiSettings?.pollinationsApiKey || '',
        },
        goals: u.goals || [],
        activity: u.activity || {},
        unlockedAchievements: u.unlocked_achievements || u.unlockedAchievements || []
    };
}

/**
 * Maps a list of database rows to MindMapData objects.
 */
export function mapMindMapRows(rows: any[]): any[] {
    if (!rows) return [];
    return rows.map(mapMindMapRow);
}

/**
 * Maps a list of database rows to User objects.
 */
export function mapUserRows(rows: any[]): any[] {
    if (!rows) return [];
    return rows.map(mapUserRow);
}
