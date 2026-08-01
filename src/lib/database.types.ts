export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          details: string | null
          id: string
          metadata: Json | null
          performed_by: string | null
          performed_by_email: string | null
          target_id: string | null
          target_type: string | null
          timestamp: string | null
          type: string
        }
        Insert: {
          details?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          performed_by_email?: string | null
          target_id?: string | null
          target_type?: string | null
          timestamp?: string | null
          type: string
        }
        Update: {
          details?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          performed_by_email?: string | null
          target_id?: string | null
          target_type?: string | null
          timestamp?: string | null
          type?: string
        }
        Relationships: []
      }
      ai_calls: {
        Row: {
          capability: string | null
          created_at: string | null
          duration_ms: number | null
          error_class: string | null
          error_message: string | null
          id: string
          input_tokens: number | null
          is_shadow: boolean | null
          latency_ms: number
          metadata: Json | null
          model: string
          output_tokens: number | null
          prompt: string | null
          provider: string
          repair_applied: boolean | null
          salvaged: boolean | null
          success: boolean
          task_type: string
          user_id: string | null
          was_error: boolean | null
        }
        Insert: {
          capability?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_class?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          is_shadow?: boolean | null
          latency_ms: number
          metadata?: Json | null
          model: string
          output_tokens?: number | null
          prompt?: string | null
          provider: string
          repair_applied?: boolean | null
          salvaged?: boolean | null
          success?: boolean
          task_type: string
          user_id?: string | null
          was_error?: boolean | null
        }
        Update: {
          capability?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_class?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          is_shadow?: boolean | null
          latency_ms?: number
          metadata?: Json | null
          model?: string
          output_tokens?: number | null
          prompt?: string | null
          provider?: string
          repair_applied?: boolean | null
          salvaged?: boolean | null
          success?: boolean
          task_type?: string
          user_id?: string | null
          was_error?: boolean | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          category: string
          date: string | null
          duration: number | null
          event_name: string
          id: string
          metadata: Json | null
          month: string | null
          properties: Json | null
          received_at: string | null
          session_id: string | null
          timestamp: number | null
          user_id: string | null
        }
        Insert: {
          category: string
          date?: string | null
          duration?: number | null
          event_name: string
          id?: string
          metadata?: Json | null
          month?: string | null
          properties?: Json | null
          received_at?: string | null
          session_id?: string | null
          timestamp?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string
          date?: string | null
          duration?: number | null
          event_name?: string
          id?: string
          metadata?: Json | null
          month?: string | null
          properties?: Json | null
          received_at?: string | null
          session_id?: string | null
          timestamp?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          map_id: string | null
          map_title: string | null
          messages: Json | null
          quiz_history: Json | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          weak_tags: string[] | null
        }
        Insert: {
          created_at?: string | null
          id: string
          map_id?: string | null
          map_title?: string | null
          messages?: Json | null
          quiz_history?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          weak_tags?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          map_id?: string | null
          map_title?: string | null
          messages?: Json | null
          quiz_history?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          weak_tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          message: string | null
          priority: string | null
          status: string | null
          tracking_id: string | null
          type: string | null
          updated_at: string | null
          upvotes: number | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          priority?: string | null
          status?: string | null
          tracking_id?: string | null
          type?: string | null
          updated_at?: string | null
          upvotes?: number | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          priority?: string | null
          status?: string | null
          tracking_id?: string | null
          type?: string | null
          updated_at?: string | null
          upvotes?: number | null
        }
        Relationships: []
      }
      feedback_counters: {
        Row: {
          id: string
          last_number: number | null
          last_updated: string | null
        }
        Insert: {
          id: string
          last_number?: number | null
          last_updated?: string | null
        }
        Update: {
          id?: string
          last_number?: number | null
          last_updated?: string | null
        }
        Relationships: []
      }
      map_cache: {
        Row: {
          content: Json
          created_at: string
          id: string
          query_key: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          query_key: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          query_key?: string
        }
        Relationships: []
      }
      mindmaps: {
        Row: {
          ai_persona: string | null
          content: Json | null
          created_at: string | null
          depth: string | null
          fork_count: number | null
          forked_from: string | null
          id: string
          is_public: boolean | null
          is_sub_map: boolean | null
          mode: string | null
          node_count: number | null
          parent_map_id: string | null
          pinned_messages: Json | null
          search_sources: Json | null
          search_timestamp: string | null
          source_file_type: string | null
          source_url: string | null
          summary: string | null
          thumbnail_prompt: string | null
          thumbnail_url: string | null
          topic: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_persona?: string | null
          content?: Json | null
          created_at?: string | null
          depth?: string | null
          fork_count?: number | null
          forked_from?: string | null
          id?: string
          is_public?: boolean | null
          is_sub_map?: boolean | null
          mode?: string | null
          node_count?: number | null
          parent_map_id?: string | null
          pinned_messages?: Json | null
          search_sources?: Json | null
          search_timestamp?: string | null
          source_file_type?: string | null
          source_url?: string | null
          summary?: string | null
          thumbnail_prompt?: string | null
          thumbnail_url?: string | null
          topic?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_persona?: string | null
          content?: Json | null
          created_at?: string | null
          depth?: string | null
          fork_count?: number | null
          forked_from?: string | null
          id?: string
          is_public?: boolean | null
          is_sub_map?: boolean | null
          mode?: string | null
          node_count?: number | null
          parent_map_id?: string | null
          pinned_messages?: Json | null
          search_sources?: Json | null
          search_timestamp?: string | null
          source_file_type?: string | null
          source_url?: string | null
          summary?: string | null
          thumbnail_prompt?: string | null
          thumbnail_url?: string | null
          topic?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mindmaps_forked_from_fkey"
            columns: ["forked_from"]
            isOneToOne: false
            referencedRelation: "mindmaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mindmaps_parent_map_id_fkey"
            columns: ["parent_map_id"]
            isOneToOne: false
            referencedRelation: "mindmaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mindmaps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_stats: {
        Row: {
          active_users_24h: number
          active_users_7d: number
          avg_maps_per_user: number
          avg_nodes_per_map: number
          daily_snapshot: Json
          engagement_rate: number
          health_score: number
          id: string
          new_maps_24h: number
          new_maps_7d: number
          new_users_24h: number
          new_users_7d: number
          top_persona: string | null
          top_source_type: string | null
          total_chats: number
          total_events: number
          total_images: number
          total_maps: number
          total_maps_ever: number
          total_nodes: number
          total_users: number
          updated_at: string
        }
        Insert: {
          active_users_24h?: number
          active_users_7d?: number
          avg_maps_per_user?: number
          avg_nodes_per_map?: number
          daily_snapshot?: Json
          engagement_rate?: number
          health_score?: number
          id?: string
          new_maps_24h?: number
          new_maps_7d?: number
          new_users_24h?: number
          new_users_7d?: number
          top_persona?: string | null
          top_source_type?: string | null
          total_chats?: number
          total_events?: number
          total_images?: number
          total_maps?: number
          total_maps_ever?: number
          total_nodes?: number
          total_users?: number
          updated_at?: string
        }
        Update: {
          active_users_24h?: number
          active_users_7d?: number
          avg_maps_per_user?: number
          avg_nodes_per_map?: number
          daily_snapshot?: Json
          engagement_rate?: number
          health_score?: number
          id?: string
          new_maps_24h?: number
          new_maps_7d?: number
          new_users_24h?: number
          new_users_7d?: number
          top_persona?: string | null
          top_source_type?: string | null
          total_chats?: number
          total_events?: number
          total_images?: number
          total_maps?: number
          total_maps_ever?: number
          total_nodes?: number
          total_users?: number
          updated_at?: string
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          base_points: number | null
          bonus_points: number | null
          id: string
          metadata: Json | null
          multiplier: number | null
          timestamp: number | null
          total_points: number | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          base_points?: number | null
          bonus_points?: number | null
          id: string
          metadata?: Json | null
          multiplier?: number | null
          timestamp?: number | null
          total_points?: number | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          base_points?: number | null
          bonus_points?: number | null
          id?: string
          metadata?: Json | null
          multiplier?: number | null
          timestamp?: number | null
          total_points?: number | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      public_mindmaps: {
        Row: {
          author_name: string | null
          content: Json | null
          id: string
          is_public: boolean | null
          original_author_id: string | null
          public_categories: string[] | null
          public_views: number | null
          published_at: string | null
          summary: string | null
          topic: string | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          author_name?: string | null
          content?: Json | null
          id: string
          is_public?: boolean | null
          original_author_id?: string | null
          public_categories?: string[] | null
          public_views?: number | null
          published_at?: string | null
          summary?: string | null
          topic?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          author_name?: string | null
          content?: Json | null
          id?: string
          is_public?: boolean | null
          original_author_id?: string | null
          public_categories?: string[] | null
          public_views?: number | null
          published_at?: string | null
          summary?: string | null
          topic?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_mindmaps_original_author_id_fkey"
            columns: ["original_author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_mindmaps: {
        Row: {
          content: Json | null
          id: string
          is_shared: boolean | null
          original_author_id: string | null
          original_map_id: string | null
          shared_at: string | null
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          id: string
          is_shared?: boolean | null
          original_author_id?: string | null
          original_map_id?: string | null
          shared_at?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          id?: string
          is_shared?: boolean | null
          original_author_id?: string | null
          original_map_id?: string | null
          shared_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_mindmaps_original_author_id_fkey"
            columns: ["original_author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_challenges: {
        Row: {
          completed_at: string | null
          date_string: string
          id: string
          map_id: string | null
          user_id: string
          xp_awarded: number | null
        }
        Insert: {
          completed_at?: string | null
          date_string: string
          id?: string
          map_id?: string | null
          user_id: string
          xp_awarded?: number | null
        }
        Update: {
          completed_at?: string | null
          date_string?: string
          id?: string
          map_id?: string | null
          user_id?: string
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_challenges_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "mindmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_events: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          id: number
          ip_address: string | null
          session_id: string | null
          source: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_type: string
          id?: never
          ip_address?: string | null
          session_id?: string | null
          source?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: never
          ip_address?: string | null
          session_id?: string | null
          source?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          daily_caps: Json | null
          history_days: Json | null
          ledger: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          daily_caps?: Json | null
          history_days?: Json | null
          ledger?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          daily_caps?: Json | null
          history_days?: Json | null
          ledger?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          api_settings: Json
          created_at: string | null
          current_streak: number
          daily_activity: Json
          depth_breakdown: Json
          display_name: string | null
          email: string | null
          last_active_date: string | null
          longest_streak: number
          mode_breakdown: Json
          persona_breakdown: Json
          photo_url: string | null
          preferences: Json
          source_breakdown: Json
          study_time_minutes: number
          total_chats: number
          total_compare_maps: number
          total_expansions: number
          total_images: number
          total_maps: number
          total_multi_maps: number
          total_nodes: number
          unlocked_achievements: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_settings?: Json
          created_at?: string | null
          current_streak?: number
          daily_activity?: Json
          depth_breakdown?: Json
          display_name?: string | null
          email?: string | null
          last_active_date?: string | null
          longest_streak?: number
          mode_breakdown?: Json
          persona_breakdown?: Json
          photo_url?: string | null
          preferences?: Json
          source_breakdown?: Json
          study_time_minutes?: number
          total_chats?: number
          total_compare_maps?: number
          total_expansions?: number
          total_images?: number
          total_maps?: number
          total_multi_maps?: number
          total_nodes?: number
          unlocked_achievements?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_settings?: Json
          created_at?: string | null
          current_streak?: number
          daily_activity?: Json
          depth_breakdown?: Json
          display_name?: string | null
          email?: string | null
          last_active_date?: string | null
          longest_streak?: number
          mode_breakdown?: Json
          persona_breakdown?: Json
          photo_url?: string | null
          preferences?: Json
          source_breakdown?: Json
          study_time_minutes?: number
          total_chats?: number
          total_compare_maps?: number
          total_expansions?: number
          total_images?: number
          total_maps?: number
          total_multi_maps?: number
          total_nodes?: number
          unlocked_achievements?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          api_key_created_at: number | null
          api_key_last_used: number | null
          image_model: string | null
          nvidia_api_key: string | null
          openrouter_api_key: string | null
          pollinations_api_key: string | null
          provider: string | null
          text_model: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key_created_at?: number | null
          api_key_last_used?: number | null
          image_model?: string | null
          nvidia_api_key?: string | null
          openrouter_api_key?: string | null
          pollinations_api_key?: string | null
          provider?: string | null
          text_model?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key_created_at?: number | null
          api_key_last_used?: number | null
          image_model?: string | null
          nvidia_api_key?: string | null
          openrouter_api_key?: string | null
          pollinations_api_key?: string | null
          provider?: string | null
          text_model?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          activity: Json | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_admin: boolean | null
          last_active: string | null
          photo_url: string | null
          preferences: Json | null
          statistics: Json | null
          unlocked_achievements: string[] | null
          updated_at: string | null
        }
        Insert: {
          activity?: Json | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          is_admin?: boolean | null
          last_active?: string | null
          photo_url?: string | null
          preferences?: Json | null
          statistics?: Json | null
          unlocked_achievements?: string[] | null
          updated_at?: string | null
        }
        Update: {
          activity?: Json | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          last_active?: string | null
          photo_url?: string | null
          preferences?: Json | null
          statistics?: Json | null
          unlocked_achievements?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      ai_intelligence_view: {
        Row: {
          capability: string | null
          created_at: string | null
          error_class: string | null
          id: string | null
          input_tokens: number | null
          is_shadow: boolean | null
          latency_ms: number | null
          model: string | null
          output_tokens: number | null
          provider: string | null
          repair_applied: boolean | null
          salvaged: boolean | null
          success: boolean | null
          task_type: string | null
        }
        Insert: {
          capability?: string | null
          created_at?: string | null
          error_class?: string | null
          id?: string | null
          input_tokens?: number | null
          is_shadow?: boolean | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          provider?: string | null
          repair_applied?: boolean | null
          salvaged?: boolean | null
          success?: boolean | null
          task_type?: string | null
        }
        Update: {
          capability?: string | null
          created_at?: string | null
          error_class?: string | null
          id?: string | null
          input_tokens?: number | null
          is_shadow?: boolean | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          provider?: string | null
          repair_applied?: boolean | null
          salvaged?: boolean | null
          success?: boolean | null
          task_type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_user_points_atomic: {
        Args: {
          p_base_points: number
          p_cap: number
          p_event_type: string
          p_user_id: string
        }
        Returns: Json
      }
      check_if_admin: { Args: { user_id: string }; Returns: boolean }
      increment_fork_count: { Args: { map_id: string }; Returns: undefined }
      increment_public_map_views: {
        Args: { p_map_id: string }
        Returns: undefined
      }
      increment_stat: {
        Args: { increment_by?: number; stat_field: string }
        Returns: undefined
      }
      increment_user_profile:
        | {
            Args: { p_amount?: number; p_field: string; p_user_id: string }
            Returns: undefined
          }
        | {
            Args: {
              p_chats?: number
              p_compare_maps?: number
              p_expansions?: number
              p_images?: number
              p_is_map_deleted?: boolean
              p_map_depth?: string
              p_map_mode?: string
              p_map_persona?: string
              p_map_source?: string
              p_maps?: number
              p_multi_maps?: number
              p_nodes?: number
              p_study_minutes?: number
              p_user_id: string
            }
            Returns: Json
          }
      is_admin: { Args: never; Returns: boolean }
      recompute_active_user_profiles: { Args: never; Returns: string }
      recompute_all_user_profiles: { Args: never; Returns: string }
      recompute_platform_stats: { Args: never; Returns: Json }
      recompute_user_profile: { Args: { p_user_id: string }; Returns: Json }
      recompute_user_profile_impl: {
        Args: { p_user_id: string }
        Returns: Json
      }
      refresh_platform_analytics: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
