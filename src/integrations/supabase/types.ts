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
  public: {
    Tables: {
      admin_action_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          delivery_id: string | null
          id: string
          new_status: string | null
          notes: string | null
          previous_status: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          delivery_id?: string | null
          id?: string
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          delivery_id?: string | null
          id?: string
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
        }
        Relationships: []
      }
      admin_notification_settings: {
        Row: {
          browser_enabled: boolean
          created_at: string
          email_enabled: boolean
          email_frequency: string
          id: string
          low_stock_enabled: boolean
          message_received_enabled: boolean
          new_quote_enabled: boolean
          new_user_enabled: boolean
          payment_received_enabled: boolean
          preorder_completed_enabled: boolean
          production_ready_enabled: boolean
          push_enabled: boolean
          sound_enabled: boolean
          sound_volume: number
          subscription_canceled_enabled: boolean
          support_ticket_enabled: boolean
          system_error_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          browser_enabled?: boolean
          created_at?: string
          email_enabled?: boolean
          email_frequency?: string
          id?: string
          low_stock_enabled?: boolean
          message_received_enabled?: boolean
          new_quote_enabled?: boolean
          new_user_enabled?: boolean
          payment_received_enabled?: boolean
          preorder_completed_enabled?: boolean
          production_ready_enabled?: boolean
          push_enabled?: boolean
          sound_enabled?: boolean
          sound_volume?: number
          subscription_canceled_enabled?: boolean
          support_ticket_enabled?: boolean
          system_error_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          browser_enabled?: boolean
          created_at?: string
          email_enabled?: boolean
          email_frequency?: string
          id?: string
          low_stock_enabled?: boolean
          message_received_enabled?: boolean
          new_quote_enabled?: boolean
          new_user_enabled?: boolean
          payment_received_enabled?: boolean
          preorder_completed_enabled?: boolean
          production_ready_enabled?: boolean
          push_enabled?: boolean
          sound_enabled?: boolean
          sound_volume?: number
          subscription_canceled_enabled?: boolean
          support_ticket_enabled?: boolean
          system_error_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          action_url: string | null
          created_at: string
          icon: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          priority: string
          read_at: string | null
          recipient_user_id: string | null
          related_id: string | null
          related_type: string | null
          title: string
          type: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          recipient_user_id?: string | null
          related_id?: string | null
          related_type?: string | null
          title: string
          type?: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          recipient_user_id?: string | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      admin_payment_methods: {
        Row: {
          account_details: Json | null
          created_at: string
          display_order: number
          id: string
          instructions: string
          is_active: boolean
          is_default: boolean
          name: string
          payment_link: string | null
          pix_key: string | null
          type: string
          updated_at: string
        }
        Insert: {
          account_details?: Json | null
          created_at?: string
          display_order?: number
          id?: string
          instructions?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          payment_link?: string | null
          pix_key?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          account_details?: Json | null
          created_at?: string
          display_order?: number
          id?: string
          instructions?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          payment_link?: string | null
          pix_key?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      bulk_operations: {
        Row: {
          admin_id: string
          created_at: string
          error_details: Json | null
          failure_count: number | null
          id: string
          message: string | null
          operation_type: string
          payment_ids: string[]
          result: Json | null
          status: string
          success_count: number | null
          total_count: number | null
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          error_details?: Json | null
          failure_count?: number | null
          id?: string
          message?: string | null
          operation_type: string
          payment_ids?: string[]
          result?: Json | null
          status?: string
          success_count?: number | null
          total_count?: number | null
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          error_details?: Json | null
          failure_count?: number | null
          id?: string
          message?: string | null
          operation_type?: string
          payment_ids?: string[]
          result?: Json | null
          status?: string
          success_count?: number | null
          total_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      character_choices: {
        Row: {
          alternative_character_id: string | null
          approved_at: string | null
          character_id: string | null
          character_name: string | null
          chosen_at: string | null
          collection_id: string | null
          created_at: string
          deadline: string | null
          id: string
          order_id: string
          order_type: string | null
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alternative_character_id?: string | null
          approved_at?: string | null
          character_id?: string | null
          character_name?: string | null
          chosen_at?: string | null
          collection_id?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          order_id: string
          order_type?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alternative_character_id?: string | null
          approved_at?: string | null
          character_id?: string | null
          character_name?: string | null
          chosen_at?: string | null
          collection_id?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          order_id?: string
          order_type?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_choices_alternative_character_id_fkey"
            columns: ["alternative_character_id"]
            isOneToOne: false
            referencedRelation: "collection_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_choices_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "collection_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_choices_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_group_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          message_id: string
          thumbnail_path: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          file_type?: string
          id?: string
          message_id: string
          thumbnail_path?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          message_id?: string
          thumbnail_path?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_group_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          last_viewed_at: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          last_viewed_at?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          last_viewed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_chat_group_members_group"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_group_messages: {
        Row: {
          created_at: string
          group_id: string
          id: string
          message: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          message: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          message?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_groups: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          membership_criteria: Json | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          membership_criteria?: Json | null
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          membership_criteria?: Json | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      coin_packages: {
        Row: {
          amount: number
          bonus: number
          created_at: string
          id: string
          is_active: boolean
          is_best_value: boolean
          is_popular: boolean
          name: string
          price_brl: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount: number
          bonus?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_best_value?: boolean
          is_popular?: boolean
          name: string
          price_brl: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          bonus?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_best_value?: boolean
          is_popular?: boolean
          name?: string
          price_brl?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      collection_base_pricing: {
        Row: {
          base_price_coins: number
          collection_type_id: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          base_price_coins?: number
          collection_type_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          base_price_coins?: number
          collection_type_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_base_pricing_collection_type_id_fkey"
            columns: ["collection_type_id"]
            isOneToOne: true
            referencedRelation: "collection_types"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_characters: {
        Row: {
          collection_id: string
          created_at: string
          description: string | null
          display_order: number | null
          franchise: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          is_catalog: boolean
          name: string
          price_category_id: string | null
          product_line: string | null
          release_date: string | null
          release_month: number | null
          release_order: number | null
          source_model_id: string | null
          status: string
          stock_quantity: number
          theme_category: string | null
          unlock_override: boolean
          updated_at: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          franchise?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_catalog?: boolean
          name: string
          price_category_id?: string | null
          product_line?: string | null
          release_date?: string | null
          release_month?: number | null
          release_order?: number | null
          source_model_id?: string | null
          status?: string
          stock_quantity?: number
          theme_category?: string | null
          unlock_override?: boolean
          updated_at?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          franchise?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_catalog?: boolean
          name?: string
          price_category_id?: string | null
          product_line?: string | null
          release_date?: string | null
          release_month?: number | null
          release_order?: number | null
          source_model_id?: string | null
          status?: string
          stock_quantity?: number
          theme_category?: string | null
          unlock_override?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_characters_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_characters_price_category_id_fkey"
            columns: ["price_category_id"]
            isOneToOne: false
            referencedRelation: "price_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_tier_assignments: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          tier_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          tier_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_tier_assignments_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_tier_assignments_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tier_stats"
            referencedColumns: ["tier_id"]
          },
          {
            foreignKeyName: "collection_tier_assignments_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_tier_assignments_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers_with_plans"
            referencedColumns: ["tier_id"]
          },
        ]
      }
      collection_types: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_price_custom: boolean
          name: string
          rotation_type: string
          slug: string
          total_characters: number
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_price_custom?: boolean
          name: string
          rotation_type?: string
          slug: string
          total_characters?: number
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_price_custom?: boolean
          name?: string
          rotation_type?: string
          slug?: string
          total_characters?: number
          updated_at?: string
        }
        Relationships: []
      }
      collector_badges: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          rarity: string
          requirement_type: string | null
          requirement_value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          rarity?: string
          requirement_type?: string | null
          requirement_value?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rarity?: string
          requirement_type?: string | null
          requirement_value?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_amount: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_amount?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_amount?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      cron_logs: {
        Row: {
          completed_at: string | null
          details: Json | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          id: string
          job_name: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          job_name: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          job_name?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      cycles: {
        Row: {
          capacity: number | null
          created_at: string
          cutoff_date: string | null
          id: string
          month: number
          name: string
          reveal_date: string | null
          shipping_start_date: string | null
          status: string
          updated_at: string
          used_capacity: number | null
          year: number
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          cutoff_date?: string | null
          id?: string
          month: number
          name: string
          reveal_date?: string | null
          shipping_start_date?: string | null
          status?: string
          updated_at?: string
          used_capacity?: number | null
          year: number
        }
        Update: {
          capacity?: number | null
          created_at?: string
          cutoff_date?: string | null
          id?: string
          month?: number
          name?: string
          reveal_date?: string | null
          shipping_start_date?: string | null
          status?: string
          updated_at?: string
          used_capacity?: number | null
          year?: number
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          conversation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          recipient_user_id: string | null
          retry_count: number | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          recipient_user_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          recipient_user_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      franchise_rules: {
        Row: {
          created_at: string
          created_by: string
          enabled: boolean
          franchise_canonical: string
          id: string
          note: string | null
          pattern: string
          priority: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          enabled?: boolean
          franchise_canonical: string
          id?: string
          note?: string | null
          pattern: string
          priority?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          enabled?: boolean
          franchise_canonical?: string
          id?: string
          note?: string | null
          pattern?: string
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          date: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      images_queue: {
        Row: {
          ai_confidence: number | null
          ai_model_used: string | null
          ai_suggested_name: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          image_hash: string | null
          processed_at: string | null
          status: string
          storage_bucket: string | null
          storage_path: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_model_used?: string | null
          ai_suggested_name?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          image_hash?: string | null
          processed_at?: string | null
          status?: string
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_model_used?: string | null
          ai_suggested_name?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          image_hash?: string | null
          processed_at?: string | null
          status?: string
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      manual_payments: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          payment_method_id: string | null
          payment_type: string
          quote_id: string | null
          reference_id: string
          reference_number: string | null
          reference_type: string
          rejection_reason: string | null
          status: string | null
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          payment_type?: string
          quote_id?: string | null
          reference_id: string
          reference_number?: string | null
          reference_type: string
          rejection_reason?: string | null
          status?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          payment_type?: string
          quote_id?: string | null
          reference_id?: string
          reference_number?: string | null
          reference_type?: string
          rejection_reason?: string | null
          status?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "admin_payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      model_likes: {
        Row: {
          created_at: string
          id: string
          model_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_likes_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          analysis_notes: string | null
          canonical_identity_key: string | null
          category: string | null
          catalog_visibility: string
          character_name: string | null
          collection_id: string | null
          created_at: string
          created_by: string | null
          curation_notes: string | null
          curation_status: string
          detected_labels: Json
          description: string | null
          duplicate_distance: number | null
          duplicate_of_model_id: string | null
          duplicate_status: string
          file_url: string | null
          franchise: string | null
          id: string
          image_bucket: string | null
          image_format: string | null
          image_height: number | null
          image_path: string | null
          image_width: number | null
          is_active: boolean
          name: string
          name_review_status: string
          optimized_sha256: string | null
          original_sha256: string | null
          perceptual_hash: string | null
          perceptual_hash_algorithm: string
          price_category_id: string | null
          price_coins_override: number | null
          price_mode: string
          price_standalone_override: number | null
          source_drive_file_id: string | null
          source_drive_folder_id: string | null
          source_drive_path: string | null
          source_title: string | null
          source_type: string
          subcategory: string | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          variant_name: string | null
          variant_type: string
          visual_review_status: string
        }
        Insert: {
          analysis_notes?: string | null
          canonical_identity_key?: string | null
          category?: string | null
          catalog_visibility?: string
          character_name?: string | null
          collection_id?: string | null
          created_at?: string
          created_by?: string | null
          curation_notes?: string | null
          curation_status?: string
          detected_labels?: Json
          description?: string | null
          duplicate_distance?: number | null
          duplicate_of_model_id?: string | null
          duplicate_status?: string
          file_url?: string | null
          franchise?: string | null
          id?: string
          image_bucket?: string | null
          image_format?: string | null
          image_height?: number | null
          image_path?: string | null
          image_width?: number | null
          is_active?: boolean
          name: string
          name_review_status?: string
          optimized_sha256?: string | null
          original_sha256?: string | null
          perceptual_hash?: string | null
          perceptual_hash_algorithm?: string
          price_category_id?: string | null
          price_coins_override?: number | null
          price_mode?: string
          price_standalone_override?: number | null
          source_drive_file_id?: string | null
          source_drive_folder_id?: string | null
          source_drive_path?: string | null
          source_title?: string | null
          source_type?: string
          subcategory?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          variant_name?: string | null
          variant_type?: string
          visual_review_status?: string
        }
        Update: {
          analysis_notes?: string | null
          canonical_identity_key?: string | null
          category?: string | null
          catalog_visibility?: string
          character_name?: string | null
          collection_id?: string | null
          created_at?: string
          created_by?: string | null
          curation_notes?: string | null
          curation_status?: string
          detected_labels?: Json
          description?: string | null
          duplicate_distance?: number | null
          duplicate_of_model_id?: string | null
          duplicate_status?: string
          file_url?: string | null
          franchise?: string | null
          id?: string
          image_bucket?: string | null
          image_format?: string | null
          image_height?: number | null
          image_path?: string | null
          image_width?: number | null
          is_active?: boolean
          name?: string
          name_review_status?: string
          optimized_sha256?: string | null
          original_sha256?: string | null
          perceptual_hash?: string | null
          perceptual_hash_algorithm?: string
          price_category_id?: string | null
          price_coins_override?: number | null
          price_mode?: string
          price_standalone_override?: number | null
          source_drive_file_id?: string | null
          source_drive_folder_id?: string | null
          source_drive_path?: string | null
          source_title?: string | null
          source_type?: string
          subcategory?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          variant_name?: string | null
          variant_type?: string
          visual_review_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "models_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "models_duplicate_of_model_id_fkey"
            columns: ["duplicate_of_model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "models_price_category_id_fkey"
            columns: ["price_category_id"]
            isOneToOne: false
            referencedRelation: "price_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
          order_id: string
          order_type: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
          order_id: string
          order_type: string
        }
        Update: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
          order_id?: string
          order_type?: string
        }
        Relationships: []
      }
      payment_audit_log: {
        Row: {
          action_type: string
          admin_id: string | null
          created_at: string
          id: string
          new_status: string | null
          notes: string | null
          old_status: string | null
          payment_id: string
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          payment_id: string
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_audit_log_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "manual_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          payment_id: string
          thumbnail_path: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          payment_id: string
          thumbnail_path?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          payment_id?: string
          thumbnail_path?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_files_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "manual_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          amount: number
          created_at: string
          id: string
          instructions: string | null
          payment_link: string | null
          payment_type: string
          pix_key: string | null
          quote_id: string | null
          sent_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          instructions?: string | null
          payment_link?: string | null
          payment_type?: string
          pix_key?: string | null
          quote_id?: string | null
          sent_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          instructions?: string | null
          payment_link?: string | null
          payment_type?: string
          pix_key?: string | null
          quote_id?: string | null
          sent_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      price_categories: {
        Row: {
          coin_value_in_cents: number
          created_at: string
          display_name: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          price_coins: number
          price_standalone: number
          updated_at: string
        }
        Insert: {
          coin_value_in_cents?: number
          created_at?: string
          display_name: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          price_coins?: number
          price_standalone?: number
          updated_at?: string
        }
        Update: {
          coin_value_in_cents?: number
          created_at?: string
          display_name?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          price_coins?: number
          price_standalone?: number
          updated_at?: string
        }
        Relationships: []
      }
      pricing_context_multipliers: {
        Row: {
          chosen_collection_discount_percentage: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          multiplier: number
          updated_at: string
          user_context: string
        }
        Insert: {
          chosen_collection_discount_percentage?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          multiplier?: number
          updated_at?: string
          user_context: string
        }
        Update: {
          chosen_collection_discount_percentage?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          multiplier?: number
          updated_at?: string
          user_context?: string
        }
        Relationships: []
      }
      pricing_history: {
        Row: {
          change_type: string
          changed_at: string | null
          changed_by: string | null
          collection_type_id: string | null
          created_at: string
          entity_id: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          user_context: string | null
        }
        Insert: {
          change_type: string
          changed_at?: string | null
          changed_by?: string | null
          collection_type_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_context?: string | null
        }
        Update: {
          change_type?: string
          changed_at?: string | null
          changed_by?: string | null
          collection_type_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_history_collection_type_id_fkey"
            columns: ["collection_type_id"]
            isOneToOne: false
            referencedRelation: "collection_types"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          base_price: number
          created_at: string
          deposit_amount: number
          description: string | null
          display_order: number
          features: Json | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          price_full: number
          price_pix: number
          updated_at: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          deposit_amount?: number
          description?: string | null
          display_order?: number
          features?: Json | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          price_full?: number
          price_pix?: number
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          deposit_amount?: number
          description?: string | null
          display_order?: number
          features?: Json | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          price_full?: number
          price_pix?: number
          updated_at?: string
        }
        Relationships: []
      }
      production_queue: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          character_id: string | null
          character_name: string | null
          choice_deadline: string | null
          choice_made_at: string | null
          choice_status: string | null
          collection_id: string | null
          collection_name: string | null
          created_at: string
          current_stage: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_notes: string | null
          estimated_completion_date: string | null
          id: string
          internal_flags: Json | null
          notes: string | null
          order_id: string
          order_type: string
          priority: number | null
          priority_score: number | null
          production_completed_at: string | null
          production_notes: string | null
          production_started_at: string | null
          production_status: string | null
          scheduled_production_date: string | null
          status: string
          tracking_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          character_id?: string | null
          character_name?: string | null
          choice_deadline?: string | null
          choice_made_at?: string | null
          choice_status?: string | null
          collection_id?: string | null
          collection_name?: string | null
          created_at?: string
          current_stage?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          estimated_completion_date?: string | null
          id?: string
          internal_flags?: Json | null
          notes?: string | null
          order_id: string
          order_type: string
          priority?: number | null
          priority_score?: number | null
          production_completed_at?: string | null
          production_notes?: string | null
          production_started_at?: string | null
          production_status?: string | null
          scheduled_production_date?: string | null
          status?: string
          tracking_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          character_id?: string | null
          character_name?: string | null
          choice_deadline?: string | null
          choice_made_at?: string | null
          choice_status?: string | null
          collection_id?: string | null
          collection_name?: string | null
          created_at?: string
          current_stage?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          estimated_completion_date?: string | null
          id?: string
          internal_flags?: Json | null
          notes?: string | null
          order_id?: string
          order_type?: string
          priority?: number | null
          priority_score?: number | null
          production_completed_at?: string | null
          production_notes?: string | null
          production_started_at?: string | null
          production_status?: string | null
          scheduled_production_date?: string | null
          status?: string
          tracking_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_queue_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "collection_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_queue_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      production_stages: {
        Row: {
          assigned_to: string | null
          block_reason: string | null
          blocked_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          is_blocked: boolean
          notes: string | null
          production_queue_id: string
          stage_name: string
          started_at: string | null
          status: string
          unblocked_at: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          block_reason?: string | null
          blocked_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          is_blocked?: boolean
          notes?: string | null
          production_queue_id: string
          stage_name: string
          started_at?: string | null
          status?: string
          unblocked_at?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          block_reason?: string | null
          blocked_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          is_blocked?: boolean
          notes?: string | null
          production_queue_id?: string
          stage_name?: string
          started_at?: string | null
          status?: string
          unblocked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_stages_production_queue_id_fkey"
            columns: ["production_queue_id"]
            isOneToOne: false
            referencedRelation: "production_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          collector_level: number
          collector_xp: number
          cpf: string | null
          created_at: string
          delivery_address: Json | null
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          is_public: boolean
          phone: string | null
          pieces_owned: number
          preference_tags: string[] | null
          preferences_text: string | null
          profile_completion: number | null
          total_spent: number
          updated_at: string
          username: string | null
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          collector_level?: number
          collector_xp?: number
          cpf?: string | null
          created_at?: string
          delivery_address?: Json | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_public?: boolean
          phone?: string | null
          pieces_owned?: number
          preference_tags?: string[] | null
          preferences_text?: string | null
          profile_completion?: number | null
          total_spent?: number
          updated_at?: string
          username?: string | null
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          collector_level?: number
          collector_xp?: number
          cpf?: string | null
          created_at?: string
          delivery_address?: Json | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_public?: boolean
          phone?: string | null
          pieces_owned?: number
          preference_tags?: string[] | null
          preferences_text?: string | null
          profile_completion?: number | null
          total_spent?: number
          updated_at?: string
          username?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      public_collection: {
        Row: {
          created_at: string
          display_order: number
          id: string
          model_id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          model_id: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          model_id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_collection_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          category: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          message: string
          shortcut: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          message: string
          shortcut?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          message?: string
          shortcut?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          character_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          quantity: number
          quote_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          character_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          quantity?: number
          quote_id: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          character_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          quantity?: number
          quote_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "collection_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_paid_notification_at: string | null
          deposit_amount: number | null
          id: string
          is_preorder: boolean | null
          notes: string | null
          payment_instructions: string | null
          payment_link: string | null
          payment_link_sent_at: string | null
          payment_status: string | null
          pix_key: string | null
          remaining_amount: number | null
          status: string
          total_amount: number | null
          tracking_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_paid_notification_at?: string | null
          deposit_amount?: number | null
          id?: string
          is_preorder?: boolean | null
          notes?: string | null
          payment_instructions?: string | null
          payment_link?: string | null
          payment_link_sent_at?: string | null
          payment_status?: string | null
          pix_key?: string | null
          remaining_amount?: number | null
          status?: string
          total_amount?: number | null
          tracking_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_paid_notification_at?: string | null
          deposit_amount?: number | null
          id?: string
          is_preorder?: boolean | null
          notes?: string | null
          payment_instructions?: string | null
          payment_link?: string | null
          payment_link_sent_at?: string | null
          payment_status?: string | null
          pix_key?: string | null
          remaining_amount?: number | null
          status?: string
          total_amount?: number | null
          tracking_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          key: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          key: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          key?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      scheduled_messages: {
        Row: {
          created_at: string
          created_by: string
          group_id: string
          id: string
          message: string
          scheduled_at: string
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          group_id: string
          id?: string
          message: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
          message?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          endpoint: string | null
          event_type: string
          id: string
          ip_address: string | null
          severity: string
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          endpoint?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          severity?: string
          source: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          endpoint?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          severity?: string
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      standalone_purchases: {
        Row: {
          amount: number
          balance_amount: number | null
          character_id: string | null
          collection_id: string | null
          created_at: string
          id: string
          notes: string | null
          paid_amount: number | null
          payment_link: string | null
          payment_method: string | null
          shipping_carrier: string | null
          status: string
          tracking_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          balance_amount?: number | null
          character_id?: string | null
          collection_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_link?: string | null
          payment_method?: string | null
          shipping_carrier?: string | null
          status?: string
          tracking_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_amount?: number | null
          character_id?: string | null
          collection_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_link?: string | null
          payment_method?: string | null
          shipping_carrier?: string | null
          status?: string
          tracking_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standalone_purchases_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "collection_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standalone_purchases_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_collections: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          subscription_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          subscription_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_collections_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_deliveries: {
        Row: {
          actual_delivery_date: string | null
          character_id: string | null
          created_at: string
          cycle_id: string | null
          delivered_date: string | null
          delivery_number: number | null
          delivery_order: number
          id: string
          production_start_date: string | null
          progress_photos: Json | null
          reveal_date: string | null
          shipping_carrier: string | null
          shipping_date: string | null
          status: string
          subscription_id: string
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          character_id?: string | null
          created_at?: string
          cycle_id?: string | null
          delivered_date?: string | null
          delivery_number?: number | null
          delivery_order?: number
          id?: string
          production_start_date?: string | null
          progress_photos?: Json | null
          reveal_date?: string | null
          shipping_carrier?: string | null
          shipping_date?: string | null
          status?: string
          subscription_id: string
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          character_id?: string | null
          created_at?: string
          cycle_id?: string | null
          delivered_date?: string | null
          delivery_number?: number | null
          delivery_order?: number
          id?: string
          production_start_date?: string | null
          progress_photos?: Json | null
          reveal_date?: string | null
          shipping_carrier?: string | null
          shipping_date?: string | null
          status?: string
          subscription_id?: string
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_deliveries_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "collection_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_deliveries_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_interval: string
          coins_included: number
          created_at: string
          deliveries_per_cycle: number
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          name: string
          price: number
          slug: string | null
          tier_id: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          coins_included?: number
          created_at?: string
          deliveries_per_cycle?: number
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          slug?: string | null
          tier_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          coins_included?: number
          created_at?: string
          deliveries_per_cycle?: number
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          slug?: string | null
          tier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tier_stats"
            referencedColumns: ["tier_id"]
          },
          {
            foreignKeyName: "subscription_plans_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plans_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers_with_plans"
            referencedColumns: ["tier_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          collection_id: string | null
          completed_at: string | null
          created_at: string
          deliveries_completed: number
          deliveries_total: number | null
          id: string
          next_delivery_at: string | null
          notes: string | null
          payment_method: string | null
          plan_id: string | null
          plan_type: string | null
          started_at: string | null
          status: string
          total_paid: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          collection_id?: string | null
          completed_at?: string | null
          created_at?: string
          deliveries_completed?: number
          deliveries_total?: number | null
          id?: string
          next_delivery_at?: string | null
          notes?: string | null
          payment_method?: string | null
          plan_id?: string | null
          plan_type?: string | null
          started_at?: string | null
          status?: string
          total_paid?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          collection_id?: string | null
          completed_at?: string | null
          created_at?: string
          deliveries_completed?: number
          deliveries_total?: number | null
          id?: string
          next_delivery_at?: string | null
          notes?: string | null
          payment_method?: string | null
          plan_id?: string | null
          plan_type?: string | null
          started_at?: string | null
          status?: string
          total_paid?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers_with_plans"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          message_id: string
          public_url: string | null
          thumbnail_path: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id: string
          public_url?: string | null
          thumbnail_path?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id?: string
          public_url?: string | null
          thumbnail_path?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "support_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          assigned_to: string | null
          created_at: string
          first_response_at: string | null
          id: string
          last_message_at: string | null
          payment_id: string | null
          priority: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          first_response_at?: string | null
          id?: string
          last_message_at?: string | null
          payment_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          first_response_at?: string | null
          id?: string
          last_message_at?: string | null
          payment_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_admin: boolean
          is_internal: boolean
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_admin?: boolean
          is_internal?: boolean
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          is_internal?: boolean
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_quick_replies: {
        Row: {
          category: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          message: string
          shortcut: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          message: string
          shortcut?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          message?: string
          shortcut?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "collector_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_characters: {
        Row: {
          acquired_at: string
          acquisition_type: string
          character_id: string
          created_at: string
          id: string
          price_paid: number | null
          user_id: string
        }
        Insert: {
          acquired_at?: string
          acquisition_type?: string
          character_id: string
          created_at?: string
          id?: string
          price_paid?: number | null
          user_id: string
        }
        Update: {
          acquired_at?: string
          acquisition_type?: string
          character_id?: string
          created_at?: string
          id?: string
          price_paid?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_characters_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "collection_characters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coins: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_collections: {
        Row: {
          acquired_at: string
          acquisition_type: string
          collection_id: string
          created_at: string
          id: string
          price_paid: number | null
          user_id: string
        }
        Insert: {
          acquired_at?: string
          acquisition_type?: string
          collection_id: string
          created_at?: string
          id?: string
          price_paid?: number | null
          user_id: string
        }
        Update: {
          acquired_at?: string
          acquisition_type?: string
          collection_id?: string
          created_at?: string
          id?: string
          price_paid?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_settings: {
        Row: {
          created_at: string
          email_notifications: boolean | null
          id: string
          marketing_emails: boolean | null
          push_notifications: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          push_notifications?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          push_notifications?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          icon: string | null
          id: string
          is_read: boolean
          message: string | null
          metadata: Json
          priority: string
          read_at: string | null
          related_id: string | null
          related_type: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          metadata?: Json
          priority?: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          metadata?: Json
          priority?: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string | null
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
      wishlist: {
        Row: {
          created_at: string
          id: string
          model_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pricing_tier_stats: {
        Row: {
          base_price: number | null
          display_order: number | null
          features: Json | null
          is_active: boolean | null
          is_default: boolean | null
          plan_count: number | null
          subscriber_count: number | null
          tier_description: string | null
          tier_id: string | null
          tier_name: string | null
        }
        Relationships: []
      }
      pricing_tiers_with_plans: {
        Row: {
          billing_interval: string | null
          deliveries_per_cycle: number | null
          plan_description: string | null
          plan_features: Json | null
          plan_id: string | null
          plan_is_active: boolean | null
          plan_name: string | null
          plan_price: number | null
          plan_slug: string | null
          tier_base_price: number | null
          tier_description: string | null
          tier_display_order: number | null
          tier_features: Json | null
          tier_id: string | null
          tier_is_active: boolean | null
          tier_is_default: boolean | null
          tier_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_add_coins_to_user: {
        Args: {
          p_amount: number
          p_description?: string | null
          p_reference_id?: string | null
          p_reference_type?: string | null
          p_user_id: string
        }
        Returns: Json
      }
      admin_process_subscription_payment: {
        Args: {
          p_amount: number
          p_external_reference?: string | null
          p_payment_method: string
          p_subscription_id: string
        }
        Returns: Json
      }
      admin_list_users: {
        Args: never
        Returns: {
          confirmed_at: string
          cpf: string
          created_at: string
          email: string
          email_confirmed_at: string
          full_name: string
          id: string
          last_sign_in_at: string
          phone: string
          profile_completion: number
          profile_phone: string
          roles: string[]
          whatsapp: string
        }[]
      }
      are_sales_open: { Args: never; Returns: boolean }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_key: string
          p_max_requests: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_old_security_events: { Args: never; Returns: number }
      close_monthly_sales: { Args: { reason?: string }; Returns: undefined }
      create_pricing_tier: {
        Args: {
          p_created_by?: string
          p_deposit_amount?: number
          p_description?: string
          p_is_default?: boolean
          p_name: string
          p_pix_discount_percentage?: number
          p_price_full?: number
        }
        Returns: string
      }
      delete_user_notification: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      generate_payment_reference: { Args: never; Returns: string }
      get_collection_financial_analysis: {
        Args: { p_collection_id: string }
        Returns: Json
      }
      get_collection_price: {
        Args: { p_collection_id: string; p_user_id?: string }
        Returns: Json
      }
      get_collection_pricing: {
        Args: { p_collection_id: string }
        Returns: {
          deposit_amount: number
          is_custom: boolean
          price_full: number
          price_pix: number
          pricing_source: string
          remaining_full: number
          remaining_pix: number
          tier_id: string
          tier_name: string
        }[]
      }
      get_current_production_limit: {
        Args: never
        Returns: {
          prod_available: number
          prod_global_limit: number
          prod_is_closed: boolean
          prod_month: number
          prod_percentage_sold: number
          prod_units_sold: number
          prod_year: number
        }[]
      }
      get_public_profile: { Args: { p_user_id: string }; Returns: Json }
      get_system_settings: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_monthly_sales: {
        Args: { quantity?: number }
        Returns: undefined
      }
      mark_all_notifications_as_read: { Args: never; Returns: undefined }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_all_user_notifications_read: { Args: never; Returns: number }
      mark_notification_as_read: {
        Args: { notification_id: string }
        Returns: undefined
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      mark_user_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      initialize_current_user_coin_balance: {
        Args: { p_description: string | null; p_initial_amount: number }
        Returns: {
          balance: number
          success: boolean
          transaction_id: string | null
        }
      }
      purchase_character_with_coins: {
        Args: { p_character_id: string; p_user_id: string }
        Returns: {
          message: string
          new_balance: number
          success: boolean
          transaction_id: string
        }[]
      }
      purchase_collection_with_coins: {
        Args: { p_collection_id: string; p_user_id: string }
        Returns: {
          message: string
          new_balance: number
          success: boolean
          transaction_id: string
        }[]
      }
      refund_coin_purchase_for_current_user: {
        Args: { p_item_id: string; p_item_type: string; p_reason: string }
        Returns: {
          item_id: string
          message: string
          new_balance: number
          success: boolean
          transaction_id: string
        }
      }
      reopen_monthly_sales: { Args: never; Returns: undefined }
      search_unified_orders: {
        Args: { order_type_filter?: string; search_query: string }
        Returns: {
          order_id: string
          order_type: string
          rank: number
        }[]
      }
      update_chosen_discount_with_history: {
        Args: {
          p_changed_by: string
          p_new_discount_percentage: number
          p_reason?: string
        }
        Returns: {
          message: string
          new_discount: number
          old_discount: number
          success: boolean
        }[]
      }
      update_multiplier_with_history: {
        Args: {
          p_changed_by: string
          p_new_multiplier: number
          p_reason?: string
          p_user_context: string
        }
        Returns: {
          message: string
          new_multiplier: number
          old_multiplier: number
          success: boolean
        }[]
      }
      update_pricing_tier: {
        Args: {
          p_deposit_amount?: number
          p_description?: string
          p_display_order?: number
          p_is_active?: boolean
          p_is_default?: boolean
          p_name?: string
          p_pix_discount_percentage?: number
          p_price_full?: number
          p_tier_id: string
          p_updated_by?: string
        }
        Returns: undefined
      }
      update_tier_and_recalculate_plans: {
        Args: {
          p_deposit_amount?: number
          p_pix_discount_percentage?: number
          p_price_full?: number
          p_tier_id: string
          p_updated_by?: string
        }
        Returns: Json
      }
      validate_collection_limit: {
        Args: { p_new_collection_id?: string; p_user_id: string }
        Returns: {
          can_add: boolean
          current_count: number
          is_unlimited: boolean
          max_count: number
          message: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
