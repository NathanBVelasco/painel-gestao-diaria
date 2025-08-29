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
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          message: string
          response: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          response: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          response?: string
          user_id?: string
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
          sales_amount?: number | null
          sketchup_renewed?: number | null
          sketchup_to_renew?: number | null
          started_at?: string | null
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_gestor: {
        Args: { user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      product_type: "trimble" | "chaos"
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
      product_type: ["trimble", "chaos"],
      user_role: ["vendedor", "gestor"],
    },
  },
} as const
