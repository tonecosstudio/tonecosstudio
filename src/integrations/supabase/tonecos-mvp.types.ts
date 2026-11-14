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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          birth_date: string | null
          created_at: string
          cpf: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          whatsapp: string | null
          delivery_address: Json | null
          preferred_contact_channel: string | null
          quote_updates: boolean
          production_updates: boolean
          marketing_emails: boolean
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          cpf?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          whatsapp?: string | null
          delivery_address?: Json | null
          preferred_contact_channel?: string | null
          quote_updates?: boolean
          production_updates?: boolean
          marketing_emails?: boolean
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          cpf?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          whatsapp?: string | null
          delivery_address?: Json | null
          preferred_contact_channel?: string | null
          quote_updates?: boolean
          production_updates?: boolean
          marketing_emails?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      quote_events: {
        Row: {
          actor_user_id: string | null
          amount: number | null
          created_at: string
          event_type: string
          from_status: string | null
          id: number
          quote_id: string
          response_text: string | null
          to_status: string
        }
        Insert: {
          actor_user_id?: string | null
          amount?: number | null
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: never
          quote_id: string
          response_text?: string | null
          to_status: string
        }
        Update: {
          actor_user_id?: string | null
          amount?: number | null
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: never
          quote_id?: string
          response_text?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          admin_response: string | null
          catalog_requested_at: string
          created_at: string
          customer_whatsapp: string | null
          deposit_amount: number | null
          deadline: string | null
          desired_scale: string
          finishing: string
          final_payment_notified_at: string | null
          id: string
          is_preorder: boolean | null
          notes: string | null
          postal_code: string | null
          payment_instructions: string | null
          payment_link: string | null
          payment_link_sent_at: string | null
          payment_status: string | null
          payment_voucher_path: string | null
          payment_voucher_rejection_reason: string | null
          payment_voucher_type: string | null
          pix_key: string | null
          ready_for_final_payment: boolean
          remaining_amount: number | null
          requested_catalog_models: Json
          status: string
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          catalog_requested_at?: string
          created_at?: string
          customer_whatsapp?: string | null
          deposit_amount?: number | null
          deadline?: string | null
          desired_scale?: string
          finishing?: string
          final_payment_notified_at?: string | null
          id?: string
          is_preorder?: boolean | null
          notes?: string | null
          postal_code?: string | null
          payment_instructions?: string | null
          payment_link?: string | null
          payment_link_sent_at?: string | null
          payment_status?: string | null
          payment_voucher_path?: string | null
          payment_voucher_rejection_reason?: string | null
          payment_voucher_type?: string | null
          pix_key?: string | null
          ready_for_final_payment?: boolean
          remaining_amount?: number | null
          requested_catalog_models: Json
          status?: string
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          catalog_requested_at?: string
          created_at?: string
          customer_whatsapp?: string | null
          deposit_amount?: number | null
          deadline?: string | null
          desired_scale?: string
          finishing?: string
          final_payment_notified_at?: string | null
          id?: string
          is_preorder?: boolean | null
          notes?: string | null
          postal_code?: string | null
          payment_instructions?: string | null
          payment_link?: string | null
          payment_link_sent_at?: string | null
          payment_status?: string | null
          payment_voucher_path?: string | null
          payment_voucher_rejection_reason?: string | null
          payment_voucher_type?: string | null
          pix_key?: string | null
          ready_for_final_payment?: boolean
          remaining_amount?: number | null
          requested_catalog_models?: Json
          status?: string
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tonecos_coin_entries: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          entry_type: string
          id: string
          reason: string
          reference_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta: number
          entry_type: string
          id?: string
          reason: string
          reference_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          entry_type?: string
          id?: string
          reason?: string
          reference_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tonecos_coin_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_credit_tonecos_coins: {
        Args: {
          p_amount: number
          p_reason: string
          p_reference_key: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_update_quote_status: {
        Args: { p_quote_id: string; p_status: string }
        Returns: string
      }
      admin_set_tonecos_admin_access: {
        Args: { p_is_admin: boolean; p_target_user_id: string }
        Returns: Json
      }
      answer_catalog_quote_request: {
        Args: { p_amount: number; p_message?: string; p_quote_id: string }
        Returns: string
      }
      admin_reject_preorder_payment_voucher: {
        Args: { p_quote_id: string; p_rejection_reason: string }
        Returns: string
      }
      find_tonecos_coin_recipient: { Args: { p_email: string }; Returns: Json }
      get_my_tonecos_coin_balance: { Args: never; Returns: Json }
      is_tonecos_admin: { Args: never; Returns: boolean }
      submit_catalog_quote_request: {
        Args: {
          p_finishing?: string
          p_models: Json
          p_notes?: string
          p_postal_code?: string
          p_scale?: string
          p_whatsapp?: string
        }
        Returns: string
      }
      submit_catalog_preorder_request: {
        Args: {
          p_finishing?: string
          p_models: Json
          p_notes?: string
          p_postal_code?: string
          p_scale?: string
          p_whatsapp?: string
        }
        Returns: string
      }
      submit_catalog_preorder_voucher_for_current_user: {
        Args: { p_payment_type: string; p_payment_voucher_path: string; p_quote_id: string }
        Returns: Json
      }
      tonart_admin_profiles_directory: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: Json
      }
      tonart_admin_customer_coins_balance: {
        Args: { p_user_id: string }
        Returns: Json
      }
      tonart_admin_profile_detail: {
        Args: { p_user_id: string }
        Returns: Json
      }
      tonart_admin_quotes_directory: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_quote_id?: string
          p_status?: string
        }
        Returns: Json
      }
      tonart_admin_workspace_overview: { Args: never; Returns: Json }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
