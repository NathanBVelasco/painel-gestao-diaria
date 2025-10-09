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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_chat_preferences: {
        Row: {
          active_software_focus: string | null
          chat_tone: string
          created_at: string
          custom_instructions: string | null
          expertise_template: string | null
          id: string
          selected_expertise: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_software_focus?: string | null
          chat_tone?: string
          created_at?: string
          custom_instructions?: string | null
          expertise_template?: string | null
          id?: string
          selected_expertise?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_software_focus?: string | null
          chat_tone?: string
          created_at?: string
          custom_instructions?: string | null
          expertise_template?: string | null
          id?: string
          selected_expertise?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          attachment_urls: string[] | null
          attachments: Json | null
          created_at: string
          id: string
          message: string
          response: string
          user_id: string
        }
        Insert: {
          attachment_urls?: string[] | null
          attachments?: Json | null
          created_at?: string
          id?: string
          message: string
          response: string
          user_id: string
        }
        Update: {
          attachment_urls?: string[] | null
          attachments?: Json | null
          created_at?: string
          id?: string
          message?: string
          response?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_expertise_categories: {
        Row: {
          category: Database["public"]["Enums"]["software_category"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["software_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["software_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_software_knowledge: {
        Row: {
          category: Database["public"]["Enums"]["software_category"]
          common_objections: string | null
          competitors: string | null
          created_at: string
          description: string | null
          differentials: string | null
          id: string
          integration_benefits: string | null
          is_active: boolean
          pricing_strategy: string | null
          roi_points: string | null
          sales_scripts: string | null
          software_name: string
          target_audience: string | null
          updated_at: string
          use_cases: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["software_category"]
          common_objections?: string | null
          competitors?: string | null
          created_at?: string
          description?: string | null
          differentials?: string | null
          id?: string
          integration_benefits?: string | null
          is_active?: boolean
          pricing_strategy?: string | null
          roi_points?: string | null
          sales_scripts?: string | null
          software_name: string
          target_audience?: string | null
          updated_at?: string
          use_cases?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["software_category"]
          common_objections?: string | null
          competitors?: string | null
          created_at?: string
          description?: string | null
          differentials?: string | null
          id?: string
          integration_benefits?: string | null
          is_active?: boolean
          pricing_strategy?: string | null
          roi_points?: string | null
          sales_scripts?: string | null
          software_name?: string
          target_audience?: string | null
          updated_at?: string
          use_cases?: string | null
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          chaos_renewed: number | null
          chaos_to_renew: number | null
          created_at: string
          cross_selling: number | null
          daily_strategy: string | null
          date: string
          difficulties: string | null
          ended_at: string | null
          forecast_amount: number | null
          id: string
          mood: string | null
          onboarding: number | null
          onboarding_details: string | null
          packs_vendidos: number | null
          sales_amount: number | null
          sketchup_renewed: number | null
          sketchup_to_renew: number | null
          started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chaos_renewed?: number | null
          chaos_to_renew?: number | null
          created_at?: string
          cross_selling?: number | null
          daily_strategy?: string | null
          date?: string
          difficulties?: string | null
          ended_at?: string | null
          forecast_amount?: number | null
          id?: string
          mood?: string | null
          onboarding?: number | null
          onboarding_details?: string | null
          packs_vendidos?: number | null
          sales_amount?: number | null
          sketchup_renewed?: number | null
          sketchup_to_renew?: number | null
          started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chaos_renewed?: number | null
          chaos_to_renew?: number | null
          created_at?: string
          cross_selling?: number | null
          daily_strategy?: string | null
          date?: string
          difficulties?: string | null
          ended_at?: string | null
          forecast_amount?: number | null
          id?: string
          mood?: string | null
          onboarding?: number | null
          onboarding_details?: string | null
          packs_vendidos?: number | null
          sales_amount?: number | null
          sketchup_renewed?: number | null
          sketchup_to_renew?: number | null
          started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_targets: {
        Row: {
          created_at: string
          created_by: string
          id: string
          month: number
          target_amount: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          month: number
          target_amount?: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          month?: number
          target_amount?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      prize_achievements: {
        Row: {
          achieved_at: string
          id: string
          prize_id: string
          progress: number | null
          user_id: string
        }
        Insert: {
          achieved_at?: string
          id?: string
          prize_id: string
          progress?: number | null
          user_id: string
        }
        Update: {
          achieved_at?: string
          id?: string
          prize_id?: string
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_prize_achievements_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prize_achievements_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "prizes"
            referencedColumns: ["id"]
          },
        ]
      }
      prizes: {
        Row: {
          created_at: string
          created_by: string
          criteria_period: string | null
          criteria_target: number | null
          criteria_type: string | null
          deadline: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_for_all: boolean | null
          target_users: string[] | null
          title: string
          updated_at: string
          value_or_bonus: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          criteria_period?: string | null
          criteria_target?: number | null
          criteria_type?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_for_all?: boolean | null
          target_users?: string[] | null
          title: string
          updated_at?: string
          value_or_bonus?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          criteria_period?: string | null
          criteria_target?: number | null
          criteria_type?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_for_all?: boolean | null
          target_users?: string[] | null
          title?: string
          updated_at?: string
          value_or_bonus?: string | null
        }
        Relationships: []
      }
      profile_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          accessed_by: string
          accessed_profile: string
          id: string
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          accessed_by: string
          accessed_profile: string
          id?: string
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          accessed_by?: string
          accessed_profile?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          daylin_reminder_time: string | null
          id: string
          notifications_enabled: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daylin_reminder_time?: string | null
          id?: string
          notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daylin_reminder_time?: string | null
          id?: string
          notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_sensitive_business_data: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_own_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_secure_team_basic_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }[]
      }
      get_user_ranking_positions: {
        Args: Record<PropertyKey, never>
        Returns: {
          cross_selling_position: number
          onboarding_position: number
          packs_position: number
          renewals_position: number
          sales_position: number
        }[]
      }
      get_user_software_access_level: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_gestor: {
        Args: { user_id: string }
        Returns: boolean
      }
      log_profile_access: {
        Args: { access_type: string; profile_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "gestor" | "vendedor"
      product_type: "trimble" | "chaos"
      software_category:
        | "modelagem_3d"
        | "renderizacao"
        | "colaboracao"
        | "animacao"
        | "documentacao"
      user_role: "vendedor" | "gestor"
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
  public: {
    Enums: {
      app_role: ["gestor", "vendedor"],
      product_type: ["trimble", "chaos"],
      software_category: [
        "modelagem_3d",
        "renderizacao",
        "colaboracao",
        "animacao",
        "documentacao",
      ],
      user_role: ["vendedor", "gestor"],
    },
  },
} as const
