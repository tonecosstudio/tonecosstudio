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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
        Relationships: [
          {
            foreignKeyName: "admin_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          action_url: string | null
          created_at: string
          icon: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          priority: string
          read_at: string | null
          recipient_user_id: string | null
          related_id: string | null
          related_type: string | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          recipient_user_id?: string | null
          related_id?: string | null
          related_type?: string | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          recipient_user_id?: string | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_payment_methods: {
        Row: {
          account_details: Json | null
          created_at: string
          display_order: number | null
          id: string
          instructions: string | null
          is_active: boolean | null
          is_default: boolean | null
          name: string
          payment_link: string | null
          pix_key: string | null
          type: string
          updated_at: string
        }
        Insert: {
          account_details?: Json | null
          created_at?: string
          display_order?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          payment_link?: string | null
          pix_key?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          account_details?: Json | null
          created_at?: string
          display_order?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          payment_link?: string | null
          pix_key?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_name_cache: {
        Row: {
          category: string | null
          created_at: string
          franchise: string | null
          id: string
          model: string | null
          name: string
          subcategory: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          franchise?: string | null
          id?: string
          model?: string | null
          name: string
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          franchise?: string | null
          id?: string
          model?: string | null
          name?: string
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_processing_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          failed_images: number
          id: string
          model_used: string | null
          processed_images: number
          status: string
          total_cost_usd: number
          total_images: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          failed_images?: number
          id?: string
          model_used?: string | null
          processed_images?: number
          status?: string
          total_cost_usd?: number
          total_images?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          failed_images?: number
          id?: string
          model_used?: string | null
          processed_images?: number
          status?: string
          total_cost_usd?: number
          total_images?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_vision_cache: {
        Row: {
          category: string | null
          confidence: number | null
          cost_usd: number | null
          created_at: string
          franchise: string | null
          id: string
          image_hash: string
          model: string | null
          name: string
          subcategory: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          confidence?: number | null
          cost_usd?: number | null
          created_at?: string
          franchise?: string | null
          id?: string
          image_hash: string
          model?: string | null
          name: string
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          confidence?: number | null
          cost_usd?: number | null
          created_at?: string
          franchise?: string | null
          id?: string
          image_hash?: string
          model?: string | null
          name?: string
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      bonus_pieces: {
        Row: {
          created_at: string
          delivery_id: string | null
          description: string | null
          id: string
          image_url: string | null
          prepared_at: string | null
          shipped_at: string | null
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          prepared_at?: string | null
          shipped_at?: string | null
          status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          prepared_at?: string | null
          shipped_at?: string | null
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_pieces_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "subscription_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_pieces_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: true
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_import_batches: {
        Row: {
          created_at: string
          dry_run: boolean
          error_message: string | null
          failed_count: number
          finished_at: string | null
          id: string
          import_slug: string
          imported_count: number
          manifest_path: string | null
          manifest_total: number
          rejected_count: number
          report_path: string | null
          skipped_count: number
          source_drive_path: string | null
          source_folder_id: string | null
          source_folder_name: string | null
          source_title: string | null
          source_type: string
          started_at: string
          status: string
          updated_at: string
          updated_count: number
          valid_count: number
          validate_only: boolean
        }
        Insert: {
          created_at?: string
          dry_run?: boolean
          error_message?: string | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          import_slug: string
          imported_count?: number
          manifest_path?: string | null
          manifest_total?: number
          rejected_count?: number
          report_path?: string | null
          skipped_count?: number
          source_drive_path?: string | null
          source_folder_id?: string | null
          source_folder_name?: string | null
          source_title?: string | null
          source_type?: string
          started_at?: string
          status?: string
          updated_at?: string
          updated_count?: number
          valid_count?: number
          validate_only?: boolean
        }
        Update: {
          created_at?: string
          dry_run?: boolean
          error_message?: string | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          import_slug?: string
          imported_count?: number
          manifest_path?: string | null
          manifest_total?: number
          rejected_count?: number
          report_path?: string | null
          skipped_count?: number
          source_drive_path?: string | null
          source_folder_id?: string | null
          source_folder_name?: string | null
          source_title?: string | null
          source_type?: string
          started_at?: string
          status?: string
          updated_at?: string
          updated_count?: number
          valid_count?: number
          validate_only?: boolean
        }
        Relationships: []
      }
      catalog_import_items: {
        Row: {
          analysis_notes: string | null
          canonical_identity_key: string | null
          catalog_visibility: string
          category: string | null
          character_name: string | null
          collection_id: string | null
          confidence: number | null
          created_at: string
          detected_labels: Json
          duplicate_distance: number | null
          duplicate_of_import_item_id: string | null
          duplicate_of_model_id: string | null
          duplicate_status: string
          file_name: string
          id: string
          image_format: string | null
          image_hash: string | null
          image_height: number | null
          image_width: number | null
          import_batch_id: string | null
          media_type: string
          mime_type: string | null
          name_review_status: string
          notes: string | null
          optimized_sha256: string | null
          original_sha256: string | null
          original_size_bytes: number | null
          perceptual_hash: string | null
          perceptual_hash_algorithm: string
          proposed_name: string | null
          published_at: string | null
          published_model_id: string | null
          reviewed_at: string | null
          source_drive_path: string | null
          source_file_id: string | null
          source_file_url: string | null
          source_folder_id: string | null
          source_folder_name: string | null
          source_title: string | null
          source_type: string
          status: string
          storage_bucket: string | null
          storage_path: string | null
          subcategory: string | null
          tags: string[]
          thumbnail_url: string | null
          updated_at: string
          variant_name: string | null
          variant_type: string
          visual_review_status: string
        }
        Insert: {
          analysis_notes?: string | null
          canonical_identity_key?: string | null
          catalog_visibility?: string
          category?: string | null
          character_name?: string | null
          collection_id?: string | null
          confidence?: number | null
          created_at?: string
          detected_labels?: Json
          duplicate_distance?: number | null
          duplicate_of_import_item_id?: string | null
          duplicate_of_model_id?: string | null
          duplicate_status?: string
          file_name: string
          id?: string
          image_format?: string | null
          image_hash?: string | null
          image_height?: number | null
          image_width?: number | null
          import_batch_id?: string | null
          media_type?: string
          mime_type?: string | null
          name_review_status?: string
          notes?: string | null
          optimized_sha256?: string | null
          original_sha256?: string | null
          original_size_bytes?: number | null
          perceptual_hash?: string | null
          perceptual_hash_algorithm?: string
          proposed_name?: string | null
          published_at?: string | null
          published_model_id?: string | null
          reviewed_at?: string | null
          source_drive_path?: string | null
          source_file_id?: string | null
          source_file_url?: string | null
          source_folder_id?: string | null
          source_folder_name?: string | null
          source_title?: string | null
          source_type?: string
          status?: string
          storage_bucket?: string | null
          storage_path?: string | null
          subcategory?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          updated_at?: string
          variant_name?: string | null
          variant_type?: string
          visual_review_status?: string
        }
        Update: {
          analysis_notes?: string | null
          canonical_identity_key?: string | null
          catalog_visibility?: string
          category?: string | null
          character_name?: string | null
          collection_id?: string | null
          confidence?: number | null
          created_at?: string
          detected_labels?: Json
          duplicate_distance?: number | null
          duplicate_of_import_item_id?: string | null
          duplicate_of_model_id?: string | null
          duplicate_status?: string
          file_name?: string
          id?: string
          image_format?: string | null
          image_hash?: string | null
          image_height?: number | null
          image_width?: number | null
          import_batch_id?: string | null
          media_type?: string
          mime_type?: string | null
          name_review_status?: string
          notes?: string | null
          optimized_sha256?: string | null
          original_sha256?: string | null
          original_size_bytes?: number | null
          perceptual_hash?: string | null
          perceptual_hash_algorithm?: string
          proposed_name?: string | null
          published_at?: string | null
          published_model_id?: string | null
          reviewed_at?: string | null
          source_drive_path?: string | null
          source_file_id?: string | null
          source_file_url?: string | null
          source_folder_id?: string | null
          source_folder_name?: string | null
          source_title?: string | null
          source_type?: string
          status?: string
          storage_bucket?: string | null
          storage_path?: string | null
          subcategory?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          updated_at?: string
          variant_name?: string | null
          variant_type?: string
          visual_review_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_import_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_financial_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_items_duplicate_of_import_item_id_fkey"
            columns: ["duplicate_of_import_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_import_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_items_duplicate_of_model_id_fkey"
            columns: ["duplicate_of_model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_items_duplicate_of_model_id_fkey"
            columns: ["duplicate_of_model_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_items_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "catalog_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_items_published_model_id_fkey"
            columns: ["published_model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_items_published_model_id_fkey"
            columns: ["published_model_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_models"
            referencedColumns: ["id"]
          },
        ]
      }
      character_choices: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          change_count: number
          change_reason: string | null
          character_id: string | null
          character_image_url: string | null
          character_name: string
          collection_id: string | null
          collection_name: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          cycle_id: string | null
          deadline: string
          id: string
          last_reminder_at: string | null
          order_id: string | null
          order_type: string | null
          previous_choice_id: string | null
          rejected_at: string | null
          rejection_reason: string | null
          reminders_sent: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["choice_status"]
          submitted_at: string
          subscription_id: string | null
          updated_at: string
          user_id: string
          user_notes: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          change_count?: number
          change_reason?: string | null
          character_id?: string | null
          character_image_url?: string | null
          character_name: string
          collection_id?: string | null
          collection_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          cycle_id?: string | null
          deadline: string
          id?: string
          last_reminder_at?: string | null
          order_id?: string | null
          order_type?: string | null
          previous_choice_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          reminders_sent?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["choice_status"]
          submitted_at?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
          user_notes?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          change_count?: number
          change_reason?: string | null
          character_id?: string | null
          character_image_url?: string | null
          character_name?: string
          collection_id?: string | null
          collection_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          cycle_id?: string | null
          deadline?: string
          id?: string
          last_reminder_at?: string | null
          order_id?: string | null
          order_type?: string | null
          previous_choice_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          reminders_sent?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["choice_status"]
          submitted_at?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_choices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_choices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "character_choices_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_choices_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_choices_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_financial_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_choices_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_choices_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "public_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_choices_previous_choice_id_fkey"
            columns: ["previous_choice_id"]
            isOneToOne: false
            referencedRelation: "character_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_choices_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_choices_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "character_choices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_choices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_choices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      characters: {
        Row: {
          collection_id: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_revealed: boolean
          name: string
          price_multiplier: number | null
          reveal_date: string | null
          updated_at: string
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_revealed?: boolean
          name: string
          price_multiplier?: number | null
          reveal_date?: string | null
          updated_at?: string
        }
        Update: {
          collection_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_revealed?: boolean
          name?: string
          price_multiplier?: number | null
          reveal_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_financial_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_group_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          message_id: string
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
          {
            foreignKeyName: "chat_group_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_group_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
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
            foreignKeyName: "chat_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_group_messages: {
        Row: {
          action_button_text: string | null
          action_button_url: string | null
          created_at: string
          group_id: string
          id: string
          link_text: string | null
          link_url: string | null
          message: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          action_button_text?: string | null
          action_button_url?: string | null
          created_at?: string
          group_id: string
          id?: string
          link_text?: string | null
          link_url?: string | null
          message: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          action_button_text?: string | null
          action_button_url?: string | null
          created_at?: string
          group_id?: string
          id?: string
          link_text?: string | null
          link_url?: string | null
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
          {
            foreignKeyName: "chat_group_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_group_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_groups: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          membership_criteria: Json | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          membership_criteria?: Json | null
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          membership_criteria?: Json | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      coin_exchange_rate: {
        Row: {
          coins_per_real: number
          created_at: string
          effective_date: string
          id: string
          is_active: boolean | null
          real_per_coin: number
          updated_at: string
        }
        Insert: {
          coins_per_real: number
          created_at?: string
          effective_date?: string
          id?: string
          is_active?: boolean | null
          real_per_coin: number
          updated_at?: string
        }
        Update: {
          coins_per_real?: number
          created_at?: string
          effective_date?: string
          id?: string
          is_active?: boolean | null
          real_per_coin?: number
          updated_at?: string
        }
        Relationships: []
      }
      coin_packages: {
        Row: {
          bonus_coins: number | null
          coins_amount: number
          created_at: string
          display_name: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          price_brl: number
          updated_at: string
        }
        Insert: {
          bonus_coins?: number | null
          coins_amount: number
          created_at?: string
          display_name: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price_brl: number
          updated_at?: string
        }
        Update: {
          bonus_coins?: number | null
          coins_amount?: number
          created_at?: string
          display_name?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_brl?: number
          updated_at?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          metadata: Json
          reference_id: string | null
          reference_type: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      collection_base_pricing: {
        Row: {
          base_price_brl: number
          base_price_coins: number
          collection_type_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          base_price_brl: number
          base_price_coins: number
          collection_type_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          base_price_brl?: number
          base_price_coins?: number
          collection_type_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
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
          character_id: string | null
          collection_id: string | null
          created_at: string
          description: string | null
          display_order: number | null
          franchise: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          is_catalog: boolean | null
          name: string | null
          price_category_id: string | null
          price_multiplier: number | null
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
          character_id?: string | null
          collection_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          franchise?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_catalog?: boolean | null
          name?: string | null
          price_category_id?: string | null
          price_multiplier?: number | null
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
          character_id?: string | null
          collection_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          franchise?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_catalog?: boolean | null
          name?: string | null
          price_category_id?: string | null
          price_multiplier?: number | null
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
            foreignKeyName: "collection_characters_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_characters_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_characters_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_financial_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_characters_price_category_id_fkey"
            columns: ["price_category_id"]
            isOneToOne: false
            referencedRelation: "price_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_characters_source_model_id_fkey"
            columns: ["source_model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_characters_source_model_id_fkey"
            columns: ["source_model_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_models"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_choice_history: {
        Row: {
          admin_user_id: string | null
          change_reason: string
          changed_by_admin: boolean
          created_at: string
          delivery_id: string
          id: string
          ip_address: string | null
          new_collection_id: string
          previous_collection_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          admin_user_id?: string | null
          change_reason: string
          changed_by_admin?: boolean
          created_at?: string
          delivery_id: string
          id?: string
          ip_address?: string | null
          new_collection_id: string
          previous_collection_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          admin_user_id?: string | null
          change_reason?: string
          changed_by_admin?: boolean
          created_at?: string
          delivery_id?: string
          id?: string
          ip_address?: string | null
          new_collection_id?: string
          previous_collection_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_choice_history_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_choice_history_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "collection_choice_history_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "subscription_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_choice_history_new_collection_id_fkey"
            columns: ["new_collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_choice_history_new_collection_id_fkey"
            columns: ["new_collection_id"]
            isOneToOne: false
            referencedRelation: "collections_financial_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_choice_history_previous_collection_id_fkey"
            columns: ["previous_collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_choice_history_previous_collection_id_fkey"
            columns: ["previous_collection_id"]
            isOneToOne: false
            referencedRelation: "collections_financial_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_choice_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_choice_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
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
            isOneToOne: true
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_tier_assignments_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: true
            referencedRelation: "collections_financial_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_tier_assignments_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_types: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
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
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean
          is_price_custom: boolean
          name: string
          release_cadence: string
          rotation_type: string
          slug: string | null
          status: Database["public"]["Enums"]["collection_status"]
          total_characters: number | null
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_price_custom?: boolean
          name: string
          release_cadence?: string
          rotation_type?: string
          slug?: string | null
          status?: Database["public"]["Enums"]["collection_status"]
          total_characters?: number | null
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_price_custom?: boolean
          name?: string
          release_cadence?: string
          rotation_type?: string
          slug?: string | null
          status?: Database["public"]["Enums"]["collection_status"]
          total_characters?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      conversation_reminders: {
        Row: {
          conversation_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reminders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_reminders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_reminders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cron_job_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          execution_details: Json | null
          id: string
          job_name: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_details?: Json | null
          id?: string
          job_name: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_details?: Json | null
          id?: string
          job_name?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      cycles: {
        Row: {
          alert_email: string | null
          alert_sms: string | null
          alert_threshold: number | null
          alert_triggered: boolean | null
          alert_triggered_at: string | null
          capacity: number | null
          capacity_current: number | null
          capacity_limit: number | null
          capacity_max: number | null
          created_at: string
          cutoff_date: string | null
          cycle_number: number
          id: string
          month: number
          name: string | null
          open_end: string | null
          open_start: string | null
          production_end: string | null
          production_end_date: string
          production_start: string | null
          production_start_date: string
          reserved_capacity: number | null
          reveal_date: string | null
          sales_end_date: string
          sales_start_date: string
          shipping_date: string | null
          shipping_end_date: string
          shipping_start_date: string
          status: Database["public"]["Enums"]["cycle_status"]
          status_changed_at: string | null
          updated_at: string
          used_capacity: number | null
          year: number
        }
        Insert: {
          alert_email?: string | null
          alert_sms?: string | null
          alert_threshold?: number | null
          alert_triggered?: boolean | null
          alert_triggered_at?: string | null
          capacity?: number | null
          capacity_current?: number | null
          capacity_limit?: number | null
          capacity_max?: number | null
          created_at?: string
          cutoff_date?: string | null
          cycle_number?: number
          id?: string
          month: number
          name?: string | null
          open_end?: string | null
          open_start?: string | null
          production_end?: string | null
          production_end_date: string
          production_start?: string | null
          production_start_date: string
          reserved_capacity?: number | null
          reveal_date?: string | null
          sales_end_date: string
          sales_start_date: string
          shipping_date?: string | null
          shipping_end_date: string
          shipping_start_date: string
          status?: Database["public"]["Enums"]["cycle_status"]
          status_changed_at?: string | null
          updated_at?: string
          used_capacity?: number | null
          year: number
        }
        Update: {
          alert_email?: string | null
          alert_sms?: string | null
          alert_threshold?: number | null
          alert_triggered?: boolean | null
          alert_triggered_at?: string | null
          capacity?: number | null
          capacity_current?: number | null
          capacity_limit?: number | null
          capacity_max?: number | null
          created_at?: string
          cutoff_date?: string | null
          cycle_number?: number
          id?: string
          month?: number
          name?: string | null
          open_end?: string | null
          open_start?: string | null
          production_end?: string | null
          production_end_date?: string
          production_start?: string | null
          production_start_date?: string
          reserved_capacity?: number | null
          reveal_date?: string | null
          sales_end_date?: string
          sales_start_date?: string
          shipping_date?: string | null
          shipping_end_date?: string
          shipping_start_date?: string
          status?: Database["public"]["Enums"]["cycle_status"]
          status_changed_at?: string | null
          updated_at?: string
          used_capacity?: number | null
          year?: number
        }
        Relationships: []
      }
      email_delivery_logs: {
        Row: {
          bounced_at: string | null
          clicked_at: string | null
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          metadata: Json
          opened_at: string | null
          provider: string
          provider_message_id: string | null
          recipient_email: string
          retry_count: number
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bounced_at?: string | null
          clicked_at?: string | null
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          opened_at?: string | null
          provider?: string
          provider_message_id?: string | null
          recipient_email: string
          retry_count?: number
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bounced_at?: string | null
          clicked_at?: string | null
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          opened_at?: string | null
          provider?: string
          provider_message_id?: string | null
          recipient_email?: string
          retry_count?: number
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
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
          retry_count: number
          sent_at: string | null
          status: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          recipient_user_id?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          recipient_user_id?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      franchises: {
        Row: {
          aliases: string[]
          canonical: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          canonical: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          canonical?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          description: string | null
          holiday_date: string
          id: string
          is_recurring: boolean
          name: string
          state_code: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          holiday_date: string
          id?: string
          is_recurring?: boolean
          name: string
          state_code?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          holiday_date?: string
          id?: string
          is_recurring?: boolean
          name?: string
          state_code?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      images_queue: {
        Row: {
          ai_confidence: number | null
          ai_model_used: string | null
          ai_suggested_name: string | null
          category: string | null
          created_at: string
          error_message: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          franchise: string | null
          id: string
          image_hash: string | null
          last_error: string | null
          name: string | null
          original_filename: string | null
          processed_at: string | null
          processed_url: string | null
          source_url: string | null
          status: string
          storage_bucket: string | null
          storage_path: string | null
          subcategory: string | null
          tags: string[] | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_model_used?: string | null
          ai_suggested_name?: string | null
          category?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          franchise?: string | null
          id?: string
          image_hash?: string | null
          last_error?: string | null
          name?: string | null
          original_filename?: string | null
          processed_at?: string | null
          processed_url?: string | null
          source_url?: string | null
          status?: string
          storage_bucket?: string | null
          storage_path?: string | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_model_used?: string | null
          ai_suggested_name?: string | null
          category?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          franchise?: string | null
          id?: string
          image_hash?: string | null
          last_error?: string | null
          name?: string | null
          original_filename?: string | null
          processed_at?: string | null
          processed_url?: string | null
          source_url?: string | null
          status?: string
          storage_bucket?: string | null
          storage_path?: string | null
          subcategory?: string | null
          tags?: string[] | null
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
          created_at: string
          currency: string
          id: string
          notes: string | null
          payment_method: string | null
          payment_method_id: string | null
          payment_type: string
          quote_id: string | null
          reference_id: string | null
          reference_number: string
          reference_type: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          payment_type: string
          quote_id?: string | null
          reference_id?: string | null
          reference_number: string
          reference_type?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          payment_type?: string
          quote_id?: string | null
          reference_id?: string | null
          reference_number?: string
          reference_type?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_payments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "manual_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "admin_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
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
        Relationships: [
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      model_like_counts: {
        Row: {
          likes_count: number
          model_id: string
          updated_at: string
        }
        Insert: {
          likes_count?: number
          model_id: string
          updated_at?: string
        }
        Update: {
          likes_count?: number
          model_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_like_counts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: true
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_like_counts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: true
            referencedRelation: "public_catalog_models"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "model_likes_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      models: {
        Row: {
          analysis_notes: string | null
          canonical_identity_key: string | null
          catalog_visibility: string
          category: string | null
          character_name: string | null
          collection_id: string | null
          created_at: string
          created_by: string | null
          curation_notes: string | null
          curation_status: string
          description: string | null
          detected_labels: Json
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
          catalog_visibility?: string
          category?: string | null
          character_name?: string | null
          collection_id?: string | null
          created_at?: string
          created_by?: string | null
          curation_notes?: string | null
          curation_status?: string
          description?: string | null
          detected_labels?: Json
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
          catalog_visibility?: string
          category?: string | null
          character_name?: string | null
          collection_id?: string | null
          created_at?: string
          created_by?: string | null
          curation_notes?: string | null
          curation_status?: string
          description?: string | null
          detected_labels?: Json
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
            foreignKeyName: "models_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_financial_summary"
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
            foreignKeyName: "models_duplicate_of_model_id_fkey"
            columns: ["duplicate_of_model_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_models"
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
      monthly_production: {
        Row: {
          closed_at: string | null
          closed_reason: string | null
          created_at: string
          global_limit: number
          id: string
          is_closed: boolean
          month: number
          units_sold: number
          updated_at: string
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string
          global_limit: number
          id?: string
          is_closed?: boolean
          month: number
          units_sold?: number
          updated_at?: string
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string
          global_limit?: number
          id?: string
          is_closed?: boolean
          month?: number
          units_sold?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          payment_emails: boolean
          reminder_emails: boolean
          revelation_emails: boolean
          shipping_emails: boolean
          updated_at: string
          user_id: string
          welcome_emails: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          payment_emails?: boolean
          reminder_emails?: boolean
          revelation_emails?: boolean
          shipping_emails?: boolean
          updated_at?: string
          user_id: string
          welcome_emails?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          payment_emails?: boolean
          reminder_emails?: boolean
          revelation_emails?: boolean
          shipping_emails?: boolean
          updated_at?: string
          user_id?: string
          welcome_emails?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      order_migrations: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          old_order_number: string | null
          order_description: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          old_order_number?: string | null
          order_description: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          old_order_number?: string | null
          order_description?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_migrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_migrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payment_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          payment_id: string
          thumbnail_path: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          payment_id: string
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
          {
            foreignKeyName: "payment_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payment_info_requests: {
        Row: {
          created_at: string
          id: string
          message: string
          payment_id: string
          requested_by_admin_id: string | null
          requested_by_admin_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          payment_id: string
          requested_by_admin_id?: string | null
          requested_by_admin_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          payment_id?: string
          requested_by_admin_id?: string | null
          requested_by_admin_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_info_requests_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "manual_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_info_requests_requested_by_admin_id_fkey"
            columns: ["requested_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_info_requests_requested_by_admin_id_fkey"
            columns: ["requested_by_admin_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
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
          amount: number
          created_at?: string
          id?: string
          instructions?: string | null
          payment_link?: string | null
          payment_type: string
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
          {
            foreignKeyName: "payment_links_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          account_type: string | null
          bank_code: string | null
          bank_name: string | null
          card_brand: string | null
          card_expiry_month: number | null
          card_expiry_year: number | null
          card_holder_name: string | null
          card_last_four: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          nickname: string | null
          pix_key: string | null
          pix_key_type: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          bank_code?: string | null
          bank_name?: string | null
          card_brand?: string | null
          card_expiry_month?: number | null
          card_expiry_year?: number | null
          card_holder_name?: string | null
          card_last_four?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          nickname?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          bank_code?: string | null
          bank_name?: string | null
          card_brand?: string | null
          card_expiry_month?: number | null
          card_expiry_year?: number | null
          card_holder_name?: string | null
          card_last_four?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          nickname?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payment_verification_audit_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          id: string
          new_status: string
          notes: string | null
          order_id: string
          order_type: string
          previous_status: string
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          order_id: string
          order_type: string
          previous_status: string
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          order_id?: string
          order_type?: string
          previous_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_verification_audit_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_verification_audit_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      price_categories: {
        Row: {
          coin_value_in_cents: number | null
          created_at: string
          display_name: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          price_coins: number
          price_standalone: number
          updated_at: string
        }
        Insert: {
          coin_value_in_cents?: number | null
          created_at?: string
          display_name: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price_coins: number
          price_standalone: number
          updated_at?: string
        }
        Update: {
          coin_value_in_cents?: number | null
          created_at?: string
          display_name?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_coins?: number
          price_standalone?: number
          updated_at?: string
        }
        Relationships: []
      }
      pricing_context_multipliers: {
        Row: {
          context_type: string
          created_at: string
          description: string | null
          display_name: string
          display_order: number | null
          id: string
          is_active: boolean | null
          multiplier: number
          name: string
          updated_at: string
        }
        Insert: {
          context_type: string
          created_at?: string
          description?: string | null
          display_name: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          multiplier: number
          name: string
          updated_at?: string
        }
        Update: {
          context_type?: string
          created_at?: string
          description?: string | null
          display_name?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          multiplier?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_tiers: {
        Row: {
          created_at: string
          deposit_amount: number | null
          description: string | null
          display_name: string
          display_order: number | null
          id: string
          is_active: boolean | null
          is_default: boolean
          name: string
          price_brl: number
          price_coins: number
          price_full: number | null
          price_pix: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit_amount?: number | null
          description?: string | null
          display_name: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean
          name: string
          price_brl: number
          price_coins: number
          price_full?: number | null
          price_pix?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit_amount?: number | null
          description?: string | null
          display_name?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean
          name?: string
          price_brl?: number
          price_coins?: number
          price_full?: number | null
          price_pix?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      production_assignment_logs: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          id: string
          is_reassignment: boolean
          previous_assignee: string | null
          previous_assignee_name: string | null
          production_queue_id: string
          reason: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          id?: string
          is_reassignment?: boolean
          previous_assignee?: string | null
          previous_assignee_name?: string | null
          production_queue_id: string
          reason?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          id?: string
          is_reassignment?: boolean
          previous_assignee?: string | null
          previous_assignee_name?: string | null
          production_queue_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_assignment_logs_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_assignment_logs_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "production_assignment_logs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_assignment_logs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "production_assignment_logs_previous_assignee_fkey"
            columns: ["previous_assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_assignment_logs_previous_assignee_fkey"
            columns: ["previous_assignee"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "production_assignment_logs_production_queue_id_fkey"
            columns: ["production_queue_id"]
            isOneToOne: false
            referencedRelation: "production_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      production_photo_metadata: {
        Row: {
          caption: string | null
          customer_visible: boolean
          id: string
          photo_url: string
          production_stage_id: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
          uploaded_by_name: string | null
        }
        Insert: {
          caption?: string | null
          customer_visible?: boolean
          id?: string
          photo_url: string
          production_stage_id: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Update: {
          caption?: string | null
          customer_visible?: boolean
          id?: string
          photo_url?: string
          production_stage_id?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_photo_metadata_production_stage_id_fkey"
            columns: ["production_stage_id"]
            isOneToOne: false
            referencedRelation: "production_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_photo_metadata_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_photo_metadata_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      production_queue: {
        Row: {
          actual_completion_date: string | null
          actual_start_date: string | null
          admin_notes: string | null
          character_id: string | null
          character_name: string | null
          choice_deadline: string | null
          choice_last_reminder_at: string | null
          choice_made_at: string | null
          choice_reminders_sent: number
          choice_status: string | null
          collection_id: string | null
          collection_name: string | null
          created_at: string
          cycle_id: string | null
          estimated_completion_date: string | null
          estimated_start_date: string | null
          id: string
          notes: string | null
          order_id: string | null
          order_type: string | null
          priority_score: number | null
          quantity: number | null
          quote_id: string | null
          status: Database["public"]["Enums"]["production_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          actual_start_date?: string | null
          admin_notes?: string | null
          character_id?: string | null
          character_name?: string | null
          choice_deadline?: string | null
          choice_last_reminder_at?: string | null
          choice_made_at?: string | null
          choice_reminders_sent?: number
          choice_status?: string | null
          collection_id?: string | null
          collection_name?: string | null
          created_at?: string
          cycle_id?: string | null
          estimated_completion_date?: string | null
          estimated_start_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          order_type?: string | null
          priority_score?: number | null
          quantity?: number | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["production_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          actual_start_date?: string | null
          admin_notes?: string | null
          character_id?: string | null
          character_name?: string | null
          choice_deadline?: string | null
          choice_last_reminder_at?: string | null
          choice_made_at?: string | null
          choice_reminders_sent?: number
          choice_status?: string | null
          collection_id?: string | null
          collection_name?: string | null
          created_at?: string
          cycle_id?: string | null
          estimated_completion_date?: string | null
          estimated_start_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          order_type?: string | null
          priority_score?: number | null
          quantity?: number | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["production_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_queue_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_queue_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_queue_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_financial_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_queue_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_queue_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "public_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_queue_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      production_stages: {
        Row: {
          actual_duration: number | null
          assigned_at: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          block_reason: string | null
          blocked_at: string | null
          completed_at: string | null
          created_at: string
          estimated_duration: number
          id: string
          is_blocked: boolean
          notes: string | null
          photos: string[]
          production_queue_id: string
          stage_name: string
          stage_order: number | null
          started_at: string | null
          status: string
          unblocked_at: string | null
          updated_at: string
        }
        Insert: {
          actual_duration?: number | null
          assigned_at?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          block_reason?: string | null
          blocked_at?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_duration?: number
          id?: string
          is_blocked?: boolean
          notes?: string | null
          photos?: string[]
          production_queue_id: string
          stage_name: string
          stage_order?: number | null
          started_at?: string | null
          status?: string
          unblocked_at?: string | null
          updated_at?: string
        }
        Update: {
          actual_duration?: number | null
          assigned_at?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          block_reason?: string | null
          blocked_at?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_duration?: number
          id?: string
          is_blocked?: boolean
          notes?: string | null
          photos?: string[]
          production_queue_id?: string
          stage_name?: string
          stage_order?: number | null
          started_at?: string | null
          status?: string
          unblocked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_stages_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_stages_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
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
          collector_level: number | null
          collector_xp: number
          cpf: string | null
          created_at: string
          delivery_address: Json | null
          display_name: string | null
          email: string
          email_notifications: boolean | null
          full_name: string | null
          id: string
          is_public: boolean
          marketing_emails: boolean | null
          notification_preferences: Json
          order_updates: boolean | null
          phone: string | null
          pieces_owned: number | null
          preference_tags: string[] | null
          preferences_text: string | null
          profile_completion: number | null
          role: Database["public"]["Enums"]["user_role"]
          total_spent: number | null
          updated_at: string
          username: string | null
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          collector_level?: number | null
          collector_xp?: number
          cpf?: string | null
          created_at?: string
          delivery_address?: Json | null
          display_name?: string | null
          email: string
          email_notifications?: boolean | null
          full_name?: string | null
          id: string
          is_public?: boolean
          marketing_emails?: boolean | null
          notification_preferences?: Json
          order_updates?: boolean | null
          phone?: string | null
          pieces_owned?: number | null
          preference_tags?: string[] | null
          preferences_text?: string | null
          profile_completion?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          total_spent?: number | null
          updated_at?: string
          username?: string | null
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          collector_level?: number | null
          collector_xp?: number
          cpf?: string | null
          created_at?: string
          delivery_address?: Json | null
          display_name?: string | null
          email?: string
          email_notifications?: boolean | null
          full_name?: string | null
          id?: string
          is_public?: boolean
          marketing_emails?: boolean | null
          notification_preferences?: Json
          order_updates?: boolean | null
          phone?: string | null
          pieces_owned?: number | null
          preference_tags?: string[] | null
          preferences_text?: string | null
          profile_completion?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          total_spent?: number | null
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
          {
            foreignKeyName: "public_collection_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_collection_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_collection_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      purchase_mode_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          field_name: string
          id: string
          metadata: Json | null
          mode_key: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field_name: string
          id?: string
          metadata?: Json | null
          mode_key: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field_name?: string
          id?: string
          metadata?: Json | null
          mode_key?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      purchase_modes: {
        Row: {
          collections_count: number
          created_at: string
          deliveries_total: number
          description: string | null
          display_order: number
          id: string
          includes_bonus: boolean
          is_active: boolean
          mode_key: string
          name: string
          price_multiplier: number
          updated_at: string
        }
        Insert: {
          collections_count?: number
          created_at?: string
          deliveries_total?: number
          description?: string | null
          display_order?: number
          id?: string
          includes_bonus?: boolean
          is_active?: boolean
          mode_key: string
          name: string
          price_multiplier?: number
          updated_at?: string
        }
        Update: {
          collections_count?: number
          created_at?: string
          deliveries_total?: number
          description?: string | null
          display_order?: number
          id?: string
          includes_bonus?: boolean
          is_active?: boolean
          mode_key?: string
          name?: string
          price_multiplier?: number
          updated_at?: string
        }
        Relationships: []
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
      quote_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          paid_at: string | null
          payment_method: string
          payment_type: string
          quote_id: string
          recorded_by: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string
          payment_type: string
          quote_id: string
          recorded_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string
          payment_type?: string
          quote_id?: string
          recorded_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "quote_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      quote_production: {
        Row: {
          created_by: string | null
          current_stage: string
          id: string
          quote_id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          created_by?: string | null
          current_stage?: string
          id?: string
          quote_id: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          created_by?: string | null
          current_stage?: string
          id?: string
          quote_id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_production_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_production_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      quote_production_photos: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          id: string
          quote_id: string
          update_id: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          quote_id: string
          update_id: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          quote_id?: string
          update_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_production_photos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_production_photos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      quote_production_updates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          quote_id: string
          stage: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          quote_id: string
          stage: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          quote_id?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_production_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_production_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          deadline: string | null
          deposit_amount: number | null
          final_payment_notified_at: string | null
          id: string
          is_preorder: boolean | null
          notes: string | null
          payment_instructions: string | null
          payment_link: string | null
          payment_link_sent_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pix_key: string | null
          ready_for_final_payment: boolean
          remaining_amount: number | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          deposit_amount?: number | null
          final_payment_notified_at?: string | null
          id?: string
          is_preorder?: boolean | null
          notes?: string | null
          payment_instructions?: string | null
          payment_link?: string | null
          payment_link_sent_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pix_key?: string | null
          ready_for_final_payment?: boolean
          remaining_amount?: number | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          deposit_amount?: number | null
          final_payment_notified_at?: string | null
          id?: string
          is_preorder?: boolean | null
          notes?: string | null
          payment_instructions?: string | null
          payment_link?: string | null
          payment_link_sent_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pix_key?: string | null
          ready_for_final_payment?: boolean
          remaining_amount?: number | null
          status?: string
          total_amount?: number
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
          {
            foreignKeyName: "quotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "scheduled_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
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
      security_incidents: {
        Row: {
          created_at: string
          details: Json | null
          file_name: string
          id: string
          incident_type: string
          payment_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          file_name: string
          id?: string
          incident_type: string
          payment_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          file_name?: string
          id?: string
          incident_type?: string
          payment_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_incidents_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "manual_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_transition_logs: {
        Row: {
          from_stage: string | null
          id: string
          is_override: boolean
          justification: string | null
          production_queue_id: string
          timestamp: string
          to_stage: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          from_stage?: string | null
          id?: string
          is_override?: boolean
          justification?: string | null
          production_queue_id: string
          timestamp?: string
          to_stage: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          from_stage?: string | null
          id?: string
          is_override?: boolean
          justification?: string | null
          production_queue_id?: string
          timestamp?: string
          to_stage?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_transition_logs_production_queue_id_fkey"
            columns: ["production_queue_id"]
            isOneToOne: false
            referencedRelation: "production_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_transition_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_transition_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      standalone_purchase_admin_action_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          id: string
          metadata: Json
          new_status: string | null
          notes: string | null
          previous_status: string | null
          purchase_id: string
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          metadata?: Json
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
          purchase_id: string
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standalone_purchase_admin_action_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standalone_purchase_admin_action_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "standalone_purchase_admin_action_logs_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "standalone_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      standalone_purchases: {
        Row: {
          actual_delivery_date: string | null
          amount: number
          balance_amount: number | null
          balance_due_date: string | null
          balance_paid_at: string | null
          balance_voucher_url: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          character_id: string
          collection_character_id: string | null
          collection_id: string | null
          created_at: string
          cycle_id: string
          deposit_amount: number | null
          deposit_paid_at: string | null
          deposit_voucher_url: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          paid_amount: number | null
          payment_link: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_voucher_balance_url: string | null
          payment_voucher_deposit_url: string | null
          price_balance: number | null
          price_deposit: number | null
          price_full: number | null
          production_complete_at: string | null
          shipped_at: string | null
          shipping_carrier: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          total_amount: number | null
          tracking_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_delivery_date?: string | null
          amount: number
          balance_amount?: number | null
          balance_due_date?: string | null
          balance_paid_at?: string | null
          balance_voucher_url?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          character_id: string
          collection_character_id?: string | null
          collection_id?: string | null
          created_at?: string
          cycle_id: string
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          deposit_voucher_url?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_link?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_voucher_balance_url?: string | null
          payment_voucher_deposit_url?: string | null
          price_balance?: number | null
          price_deposit?: number | null
          price_full?: number | null
          production_complete_at?: string | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          total_amount?: number | null
          tracking_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_delivery_date?: string | null
          amount?: number
          balance_amount?: number | null
          balance_due_date?: string | null
          balance_paid_at?: string | null
          balance_voucher_url?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          character_id?: string
          collection_character_id?: string | null
          collection_id?: string | null
          created_at?: string
          cycle_id?: string
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          deposit_voucher_url?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_link?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_voucher_balance_url?: string | null
          payment_voucher_deposit_url?: string | null
          price_balance?: number | null
          price_deposit?: number | null
          price_full?: number | null
          production_complete_at?: string | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          total_amount?: number | null
          tracking_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standalone_purchases_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standalone_purchases_collection_character_id_fkey"
            columns: ["collection_character_id"]
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
          {
            foreignKeyName: "standalone_purchases_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_financial_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standalone_purchases_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standalone_purchases_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "public_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standalone_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standalone_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stripe_customers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          metadata: Json | null
          stripe_customer_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          metadata?: Json | null
          stripe_customer_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          stripe_customer_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stripe_payment_intents: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          customer_id: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          status: string
          stripe_payment_intent_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status: string
          stripe_payment_intent_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          stripe_payment_intent_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_refunds: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          payment_intent_id: string
          reason: string | null
          status: string
          stripe_refund_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          payment_intent_id: string
          reason?: string | null
          status: string
          stripe_refund_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          payment_intent_id?: string
          reason?: string | null
          status?: string
          stripe_refund_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer_id: string
          id: string
          metadata: Json | null
          status: string
          stripe_subscription_id: string
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id: string
          id?: string
          metadata?: Json | null
          status: string
          stripe_subscription_id: string
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string
          id?: string
          metadata?: Json | null
          status?: string
          stripe_subscription_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          created_at: string | null
          event_data: Json
          event_type: string
          id: string
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string | null
          event_data: Json
          event_type: string
          id?: string
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
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
            foreignKeyName: "subscription_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_financial_summary"
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
      subscription_credit_characters: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_exclusive_semestral: boolean
          is_standard_collection: boolean
          name: string
          price_cash: number
          price_credits: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_exclusive_semestral?: boolean
          is_standard_collection?: boolean
          name: string
          price_cash?: number
          price_credits?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_exclusive_semestral?: boolean
          is_standard_collection?: boolean
          name?: string
          price_cash?: number
          price_credits?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscription_credit_order_items: {
        Row: {
          character_id: string
          created_at: string
          credits_cost: number
          id: string
          order_id: string
        }
        Insert: {
          character_id: string
          created_at?: string
          credits_cost?: number
          id?: string
          order_id: string
        }
        Update: {
          character_id?: string
          created_at?: string
          credits_cost?: number
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_credit_order_items_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "subscription_credit_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_credit_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "subscription_credit_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_credit_orders: {
        Row: {
          created_at: string
          credits_debited: boolean
          id: string
          is_locked: boolean
          is_priority: boolean
          locked_at: string | null
          order_type: string
          production_cycle_id: string
          status: string
          subscription_id: string
          total_credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_debited?: boolean
          id?: string
          is_locked?: boolean
          is_priority?: boolean
          locked_at?: string | null
          order_type: string
          production_cycle_id: string
          status?: string
          subscription_id: string
          total_credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_debited?: boolean
          id?: string
          is_locked?: boolean
          is_priority?: boolean
          locked_at?: string | null
          order_type?: string
          production_cycle_id?: string
          status?: string
          subscription_id?: string
          total_credits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_credit_orders_production_cycle_id_fkey"
            columns: ["production_cycle_id"]
            isOneToOne: false
            referencedRelation: "subscription_credit_production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_credit_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_credit_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_credit_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_credit_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_credit_plans: {
        Row: {
          base_credits: number
          bonus_credits: number
          created_at: string
          duration_months: number
          id: string
          is_active: boolean
          name: string
          plan_type: string
          price: number
          updated_at: string
        }
        Insert: {
          base_credits?: number
          bonus_credits?: number
          created_at?: string
          duration_months?: number
          id?: string
          is_active?: boolean
          name: string
          plan_type: string
          price?: number
          updated_at?: string
        }
        Update: {
          base_credits?: number
          bonus_credits?: number
          created_at?: string
          duration_months?: number
          id?: string
          is_active?: boolean
          name?: string
          plan_type?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscription_credit_production_cycles: {
        Row: {
          capacity_limit: number
          close_date: string
          closed_at: string | null
          created_at: string
          current_count: number
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          capacity_limit?: number
          close_date: string
          closed_at?: string | null
          created_at?: string
          current_count?: number
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          capacity_limit?: number
          close_date?: string
          closed_at?: string | null
          created_at?: string
          current_count?: number
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_credit_subscriptions: {
        Row: {
          auto_renew: boolean
          cancellation_type: string | null
          cancelled_at: string | null
          created_at: string
          end_date: string
          id: string
          next_billing_date: string | null
          pending_plan_change: string | null
          plan_id: string | null
          plan_type: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          cancellation_type?: string | null
          cancelled_at?: string | null
          created_at?: string
          end_date: string
          id?: string
          next_billing_date?: string | null
          pending_plan_change?: string | null
          plan_id?: string | null
          plan_type: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          cancellation_type?: string | null
          cancelled_at?: string | null
          created_at?: string
          end_date?: string
          id?: string
          next_billing_date?: string | null
          pending_plan_change?: string | null
          plan_id?: string | null
          plan_type?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_credit_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_credit_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_credit_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_credit_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_credit_transactions: {
        Row: {
          character_id: string | null
          created_at: string
          credits_amount: number
          description: string | null
          id: string
          order_id: string | null
          production_cycle_id: string | null
          subscription_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          character_id?: string | null
          created_at?: string
          credits_amount: number
          description?: string | null
          id?: string
          order_id?: string | null
          production_cycle_id?: string | null
          subscription_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          character_id?: string | null
          created_at?: string
          credits_amount?: number
          description?: string | null
          id?: string
          order_id?: string | null
          production_cycle_id?: string | null
          subscription_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_credit_transactions_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "subscription_credit_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_credit_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "subscription_credit_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_credit_transactions_production_cycle_id_fkey"
            columns: ["production_cycle_id"]
            isOneToOne: false
            referencedRelation: "subscription_credit_production_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_credit_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_credit_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_credit_user_credits: {
        Row: {
          available_credits: number
          created_at: string
          expired_credits: number
          id: string
          subscription_id: string | null
          total_credits: number
          updated_at: string
          used_credits: number
          user_id: string
        }
        Insert: {
          available_credits?: number
          created_at?: string
          expired_credits?: number
          id?: string
          subscription_id?: string | null
          total_credits?: number
          updated_at?: string
          used_credits?: number
          user_id: string
        }
        Update: {
          available_credits?: number
          created_at?: string
          expired_credits?: number
          id?: string
          subscription_id?: string | null
          total_credits?: number
          updated_at?: string
          used_credits?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_credit_user_credits_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_credit_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_credit_user_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_credit_user_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_deliveries: {
        Row: {
          actual_delivery_date: string | null
          auto_maintained: boolean
          bonus_piece_id: string | null
          character_id: string | null
          collection_character_id: string | null
          collection_id: string | null
          created_at: string
          cycle_id: string
          delivered_date: string | null
          delivery_date: string | null
          delivery_number: number | null
          delivery_order: number | null
          expected_delivery_date: string | null
          id: string
          reveal_date: string | null
          shipping_date: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          subscription_id: string
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          auto_maintained?: boolean
          bonus_piece_id?: string | null
          character_id?: string | null
          collection_character_id?: string | null
          collection_id?: string | null
          created_at?: string
          cycle_id: string
          delivered_date?: string | null
          delivery_date?: string | null
          delivery_number?: number | null
          delivery_order?: number | null
          expected_delivery_date?: string | null
          id?: string
          reveal_date?: string | null
          shipping_date?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          subscription_id: string
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          auto_maintained?: boolean
          bonus_piece_id?: string | null
          character_id?: string | null
          collection_character_id?: string | null
          collection_id?: string | null
          created_at?: string
          cycle_id?: string
          delivered_date?: string | null
          delivery_date?: string | null
          delivery_number?: number | null
          delivery_order?: number | null
          expected_delivery_date?: string | null
          id?: string
          reveal_date?: string | null
          shipping_date?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          subscription_id?: string
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_deliveries_bonus_piece_id_fkey"
            columns: ["bonus_piece_id"]
            isOneToOne: false
            referencedRelation: "bonus_pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_deliveries_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_deliveries_collection_character_id_fkey"
            columns: ["collection_character_id"]
            isOneToOne: false
            referencedRelation: "collection_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_deliveries_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_deliveries_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_financial_summary"
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
            foreignKeyName: "subscription_deliveries_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "public_cycles"
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
      subscription_payments: {
        Row: {
          amount: number
          coins_credited: number
          created_at: string
          external_reference: string | null
          id: string
          paid_at: string | null
          payment_method: string
          status: string
          subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          coins_credited?: number
          created_at?: string
          external_reference?: string | null
          id?: string
          paid_at?: string | null
          payment_method: string
          status?: string
          subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          coins_credited?: number
          created_at?: string
          external_reference?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string
          status?: string
          subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_interval: string | null
          characters_per_cycle: number
          coins_included: number | null
          collections_count: number
          created_at: string
          deliveries_per_cycle: number | null
          deliveries_total: number | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          plan_type: string | null
          price: number
          price_full: number | null
          price_pix: number | null
          pricing_tier_id: string | null
          slug: string | null
          total_credits: number | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string | null
          characters_per_cycle?: number
          coins_included?: number | null
          collections_count?: number
          created_at?: string
          deliveries_per_cycle?: number | null
          deliveries_total?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          plan_type?: string | null
          price: number
          price_full?: number | null
          price_pix?: number | null
          pricing_tier_id?: string | null
          slug?: string | null
          total_credits?: number | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string | null
          characters_per_cycle?: number
          coins_included?: number | null
          collections_count?: number
          created_at?: string
          deliveries_per_cycle?: number | null
          deliveries_total?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          plan_type?: string | null
          price?: number
          price_full?: number | null
          price_pix?: number | null
          pricing_tier_id?: string | null
          slug?: string | null
          total_credits?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          coins_per_month: number
          collection_id: string | null
          completed_at: string | null
          created_at: string
          deliveries_completed: number | null
          deliveries_total: number | null
          end_date: string | null
          id: string
          next_billing_date: string | null
          next_delivery_at: string | null
          notes: string | null
          pause_count: number
          payment_id: string | null
          payment_method: string | null
          payment_rejection_reason: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_voucher_path: string | null
          payment_voucher_url: string | null
          plan_id: string
          plan_type: string | null
          start_date: string
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          total_coins_received: number
          total_paid: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          coins_per_month?: number
          collection_id?: string | null
          completed_at?: string | null
          created_at?: string
          deliveries_completed?: number | null
          deliveries_total?: number | null
          end_date?: string | null
          id?: string
          next_billing_date?: string | null
          next_delivery_at?: string | null
          notes?: string | null
          pause_count?: number
          payment_id?: string | null
          payment_method?: string | null
          payment_rejection_reason?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_voucher_path?: string | null
          payment_voucher_url?: string | null
          plan_id: string
          plan_type?: string | null
          start_date?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          total_coins_received?: number
          total_paid?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          coins_per_month?: number
          collection_id?: string | null
          completed_at?: string | null
          created_at?: string
          deliveries_completed?: number | null
          deliveries_total?: number | null
          end_date?: string | null
          id?: string
          next_billing_date?: string | null
          next_delivery_at?: string | null
          notes?: string | null
          pause_count?: number
          payment_id?: string | null
          payment_method?: string | null
          payment_rejection_reason?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_voucher_path?: string | null
          payment_voucher_url?: string | null
          plan_id?: string
          plan_type?: string | null
          start_date?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          total_coins_received?: number
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
            foreignKeyName: "subscriptions_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_financial_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "support_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
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
          order_id: string | null
          payment_id: string | null
          priority: string | null
          promised_date: string | null
          quote_id: string | null
          resolved_at: string | null
          risk_flags: string[] | null
          status: string
          subject: string | null
          subscription_id: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          first_response_at?: string | null
          id?: string
          last_message_at?: string | null
          order_id?: string | null
          payment_id?: string | null
          priority?: string | null
          promised_date?: string | null
          quote_id?: string | null
          resolved_at?: string | null
          risk_flags?: string[] | null
          status?: string
          subject?: string | null
          subscription_id?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          first_response_at?: string | null
          id?: string
          last_message_at?: string | null
          order_id?: string | null
          payment_id?: string | null
          priority?: string | null
          promised_date?: string | null
          quote_id?: string | null
          resolved_at?: string | null
          risk_flags?: string[] | null
          status?: string
          subject?: string | null
          subscription_id?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      support_messages: {
        Row: {
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_internal: boolean
          message: string
          read_at: string | null
          read_by_admin: boolean
          read_by_customer: boolean
          sender_id: string
          sender_type: string
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_internal?: boolean
          message: string
          read_at?: string | null
          read_by_admin?: boolean
          read_by_customer?: boolean
          sender_id: string
          sender_type?: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_internal?: boolean
          message?: string
          read_at?: string | null
          read_by_admin?: boolean
          read_by_customer?: boolean
          sender_id?: string
          sender_type?: string
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
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
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
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_characters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_characters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
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
        Relationships: [
          {
            foreignKeyName: "user_coins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_coins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
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
          {
            foreignKeyName: "user_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_financial_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      wishlist: {
        Row: {
          added_at: string
          id: string
          model_id: string
          notes: string | null
          notify_when_available: boolean | null
          priority: number | null
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          model_id: string
          notes?: string | null
          notify_when_available?: boolean | null
          priority?: number | null
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          model_id?: string
          notes?: string | null
          notify_when_available?: boolean | null
          priority?: number | null
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
          {
            foreignKeyName: "wishlist_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      collections_financial_summary: {
        Row: {
          active_subscriptions: number | null
          approved_quotes: number | null
          catalog_characters: number | null
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          manual_payments_revenue: number | null
          name: string | null
          quotes_revenue: number | null
          slug: string | null
          standalone_revenue: number | null
          subscription_revenue: number | null
          total_characters: number | null
          total_manual_payments: number | null
          total_quotes: number | null
          total_revenue: number | null
          total_standalone_purchases: number | null
          total_subscriptions: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      public_catalog_models: {
        Row: {
          canonical_identity_key: string | null
          catalog_visibility: string | null
          category: string | null
          character_name: string | null
          created_at: string | null
          description: string | null
          duplicate_of_model_id: string | null
          duplicate_status: string | null
          franchise: string | null
          id: string | null
          image_bucket: string | null
          image_path: string | null
          is_active: boolean | null
          name: string | null
          price_coins_override: number | null
          price_mode: string | null
          price_standalone_override: number | null
          source_title: string | null
          source_type: string | null
          subcategory: string | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
          variant_name: string | null
          variant_type: string | null
        }
        Insert: {
          canonical_identity_key?: string | null
          catalog_visibility?: string | null
          category?: string | null
          character_name?: string | null
          created_at?: string | null
          description?: string | null
          duplicate_of_model_id?: string | null
          duplicate_status?: string | null
          franchise?: string | null
          id?: string | null
          image_bucket?: string | null
          image_path?: string | null
          is_active?: boolean | null
          name?: string | null
          price_coins_override?: number | null
          price_mode?: string | null
          price_standalone_override?: number | null
          source_title?: string | null
          source_type?: string | null
          subcategory?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          variant_name?: string | null
          variant_type?: string | null
        }
        Update: {
          canonical_identity_key?: string | null
          catalog_visibility?: string | null
          category?: string | null
          character_name?: string | null
          created_at?: string | null
          description?: string | null
          duplicate_of_model_id?: string | null
          duplicate_status?: string | null
          franchise?: string | null
          id?: string | null
          image_bucket?: string | null
          image_path?: string | null
          is_active?: boolean | null
          name?: string | null
          price_coins_override?: number | null
          price_mode?: string | null
          price_standalone_override?: number | null
          source_title?: string | null
          source_type?: string | null
          subcategory?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          variant_name?: string | null
          variant_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "models_duplicate_of_model_id_fkey"
            columns: ["duplicate_of_model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "models_duplicate_of_model_id_fkey"
            columns: ["duplicate_of_model_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_models"
            referencedColumns: ["id"]
          },
        ]
      }
      public_cycles: {
        Row: {
          capacity: number | null
          capacity_current: number | null
          capacity_max: number | null
          cutoff_date: string | null
          cycle_number: number | null
          id: string | null
          month: number | null
          open_end: string | null
          open_start: string | null
          reveal_date: string | null
          sales_end_date: string | null
          sales_start_date: string | null
          shipping_date: string | null
          status: Database["public"]["Enums"]["cycle_status"] | null
          used_capacity: number | null
          year: number | null
        }
        Insert: {
          capacity?: number | null
          capacity_current?: number | null
          capacity_max?: number | null
          cutoff_date?: string | null
          cycle_number?: number | null
          id?: string | null
          month?: number | null
          open_end?: string | null
          open_start?: string | null
          reveal_date?: string | null
          sales_end_date?: string | null
          sales_start_date?: string | null
          shipping_date?: string | null
          status?: Database["public"]["Enums"]["cycle_status"] | null
          used_capacity?: number | null
          year?: number | null
        }
        Update: {
          capacity?: number | null
          capacity_current?: number | null
          capacity_max?: number | null
          cutoff_date?: string | null
          cycle_number?: number | null
          id?: string | null
          month?: number | null
          open_end?: string | null
          open_start?: string | null
          reveal_date?: string | null
          sales_end_date?: string | null
          sales_start_date?: string | null
          shipping_date?: string | null
          status?: Database["public"]["Enums"]["cycle_status"] | null
          used_capacity?: number | null
          year?: number | null
        }
        Relationships: []
      }
      system_settings_grouped: {
        Row: {
          settings: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["user_role"] | null
          user_id: string | null
        }
        Insert: {
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id?: string | null
        }
        Update: {
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_delivery_with_auto_maintenance: {
        Args: { p_delivery_id: string }
        Returns: Json
      }
      activate_subscription_credit_for_current_user: {
        Args: { p_payment_method_id?: string; p_plan_type: string }
        Returns: Json
      }
      add_current_user_public_collection_item: {
        Args: { p_model_id: string; p_notes?: string }
        Returns: Json
      }
      add_quote_production_photo: {
        Args: {
          p_caption?: string
          p_quote_id: string
          p_update_id: string
          p_url: string
        }
        Returns: Json
      }
      admin_add_chat_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: Json
      }
      admin_add_chat_group_members: {
        Args: { p_added_by?: string; p_group_id: string; p_user_ids: string[] }
        Returns: Json
      }
      admin_add_coins_to_user: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference_id?: string
          p_reference_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_add_holiday: {
        Args: {
          p_description?: string
          p_holiday_date: string
          p_is_recurring?: boolean
          p_name: string
          p_state_code?: string
          p_type?: string
        }
        Returns: Json
      }
      admin_adjust_subscription_credit_credits: {
        Args: { p_amount: number; p_reason: string; p_subscription_id: string }
        Returns: Json
      }
      admin_approve_character_choice: {
        Args: { p_choice_id: string }
        Returns: string
      }
      admin_approve_manual_payment_with_notification: {
        Args: { p_payment_id: string }
        Returns: undefined
      }
      admin_approve_standalone_payment_voucher: {
        Args: { p_purchase_id: string; p_voucher_type: string }
        Returns: Json
      }
      admin_assign_collection_to_tier: {
        Args: { p_collection_id: string; p_tier_id: string }
        Returns: string
      }
      admin_assign_collections_to_tier: {
        Args: { p_collection_ids: Json; p_tier_id: string }
        Returns: Json
      }
      admin_assign_delivery_to_cycle: {
        Args: { p_cycle_id: string; p_delivery_id: string }
        Returns: Json
      }
      admin_assign_production: {
        Args: { p_queue_id: string; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      admin_block_production: {
        Args: { p_queue_id: string; p_reason: string }
        Returns: Json
      }
      admin_bulk_assign_collections_to_tier: {
        Args: { p_collection_ids: Json; p_tier_id: string }
        Returns: Json
      }
      admin_bulk_create_photo_metadata: {
        Args: {
          p_photos: Json
          p_production_stage_id: string
          p_uploaded_by_name?: string
        }
        Returns: Json
      }
      admin_bulk_update_character_price_multipliers: {
        Args: { p_character_ids: Json; p_new_multiplier: number }
        Returns: Json
      }
      admin_cancel_conversation_reminder: {
        Args: { p_reminder_id: string }
        Returns: string
      }
      admin_cancel_standalone_purchase: {
        Args: { p_purchase_id: string; p_reason?: string }
        Returns: Json
      }
      admin_character_multiplier_table: { Args: never; Returns: unknown }
      admin_close_subscription_credit_production_cycle: {
        Args: { p_cycle_id: string }
        Returns: Json
      }
      admin_collection_row_json: {
        Args: {
          p_collection: Database["public"]["Tables"]["collections"]["Row"]
        }
        Returns: Json
      }
      admin_complete_production_stage: {
        Args: {
          p_is_override?: boolean
          p_justification?: string
          p_notes?: string
          p_photos?: string[]
          p_stage_id: string
        }
        Returns: Json
      }
      admin_create_bonus_piece: {
        Args: { p_description?: string; p_subscription_id: string }
        Returns: Json
      }
      admin_create_chat_group: {
        Args: {
          p_created_by?: string
          p_membership_criteria?: Json
          p_name: string
          p_type: string
        }
        Returns: Json
      }
      admin_create_collection: { Args: { p_payload: Json }; Returns: Json }
      admin_create_conversation_reminder: {
        Args: {
          p_conversation_id: string
          p_reminder_type: string
          p_scheduled_for: string
        }
        Returns: {
          conversation_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "conversation_reminders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_create_payment_method: { Args: { p_data: Json }; Returns: Json }
      admin_create_photo_metadata: {
        Args: {
          p_caption?: string
          p_customer_visible: boolean
          p_photo_url: string
          p_production_stage_id: string
          p_uploaded_by_name?: string
        }
        Returns: Json
      }
      admin_create_subscription_credit_character: {
        Args: {
          p_description?: string
          p_image_url?: string
          p_is_exclusive_semestral?: boolean
          p_is_standard_collection?: boolean
          p_name: string
          p_price_cash?: number
          p_price_credits?: number
        }
        Returns: Json
      }
      admin_create_subscription_credit_production_cycle: {
        Args: { p_capacity_limit: number; p_close_date: string; p_name: string }
        Returns: Json
      }
      admin_deactivate_collection: {
        Args: { p_collection_id: string }
        Returns: Json
      }
      admin_deactivate_subscription_credit_character: {
        Args: { p_character_id: string }
        Returns: Json
      }
      admin_delete_catalog_character: {
        Args: { p_character_id: string }
        Returns: undefined
      }
      admin_delete_chat_group_message: {
        Args: { p_message_id: string }
        Returns: string
      }
      admin_delete_collection: {
        Args: { p_collection_id: string }
        Returns: string
      }
      admin_delete_collection_character: {
        Args: { p_character_id: string }
        Returns: string
      }
      admin_delete_collection_type: {
        Args: { p_type_id: string }
        Returns: string
      }
      admin_delete_group_message_template: {
        Args: { p_template_id: string }
        Returns: string
      }
      admin_delete_holiday: { Args: { p_holiday_id: string }; Returns: Json }
      admin_delete_images_queue_item: {
        Args: {
          p_queue_id: string
          p_storage_bucket: string
          p_storage_path: string
        }
        Returns: Json
      }
      admin_delete_internal_support_note: {
        Args: { p_message_id: string }
        Returns: string
      }
      admin_delete_notification: {
        Args: { p_notification_id: string }
        Returns: string
      }
      admin_delete_payment_file_record: {
        Args: {
          p_file_id: string
          p_file_path: string
          p_thumbnail_path?: string
        }
        Returns: Json
      }
      admin_delete_payment_method: {
        Args: { p_method_id: string }
        Returns: boolean
      }
      admin_delete_photo_metadata: {
        Args: { p_photo_url: string }
        Returns: undefined
      }
      admin_delete_price_category: {
        Args: { p_category_id: string }
        Returns: undefined
      }
      admin_delete_pricing_tier: {
        Args: { p_tier_id: string }
        Returns: string
      }
      admin_delete_quick_reply: { Args: { p_id: string }; Returns: string }
      admin_delete_support_attachment_record: {
        Args: {
          p_attachment_id: string
          p_file_path: string
          p_thumbnail_path?: string
        }
        Returns: string
      }
      admin_delete_support_message: {
        Args: { p_message_id: string }
        Returns: string
      }
      admin_edit_chat_group_message: {
        Args: { p_message: string; p_message_id: string }
        Returns: {
          action_button_text: string | null
          action_button_url: string | null
          created_at: string
          group_id: string
          id: string
          link_text: string | null
          link_url: string | null
          message: string
          sender_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "chat_group_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_edit_internal_support_note: {
        Args: { p_message: string; p_message_id: string }
        Returns: {
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_internal: boolean
          message: string
          read_at: string | null
          read_by_admin: boolean
          read_by_customer: boolean
          sender_id: string
          sender_type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "support_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_extend_character_choice_deadline: {
        Args: { p_choice_id: string; p_new_deadline: string }
        Returns: string
      }
      admin_get_collections_for_bulk_assign: { Args: never; Returns: Json }
      admin_get_or_create_delivery_cycle: {
        Args: {
          p_capacity?: number
          p_cycle_number: number
          p_month: number
          p_year: number
        }
        Returns: Json
      }
      admin_get_or_create_notification_settings: { Args: never; Returns: Json }
      admin_get_pricing_tiers_snapshot: {
        Args: { p_tier_id?: string }
        Returns: Json
      }
      admin_insert_collection_character: {
        Args: { p_payload: Json }
        Returns: string
      }
      admin_insert_collection_characters: {
        Args: { p_characters: Json }
        Returns: Json
      }
      admin_insert_stage_transition_log: {
        Args: {
          p_from_stage: string
          p_is_override?: boolean
          p_justification?: string
          p_production_queue_id: string
          p_to_stage: string
        }
        Returns: string
      }
      admin_insert_user_notification: {
        Args: {
          p_message: string
          p_priority?: string
          p_related_id?: string
          p_related_type?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      admin_is_valid_subscription_delivery_transition: {
        Args: {
          p_allow_reverse?: boolean
          p_allow_same_status?: boolean
          p_current_status: string
          p_new_status: string
        }
        Returns: boolean
      }
      admin_link_bonus_piece_to_delivery: {
        Args: { p_bonus_id: string; p_delivery_id: string }
        Returns: Json
      }
      admin_log_stage_transition: {
        Args: {
          p_from_stage: string
          p_is_override?: boolean
          p_justification?: string
          p_production_queue_id: string
          p_to_stage: string
        }
        Returns: string
      }
      admin_mark_standalone_production_complete: {
        Args: { p_purchase_id: string }
        Returns: Json
      }
      admin_mark_subscription_delivery_delivered_from_tracking: {
        Args: { p_delivered_at?: string; p_delivery_id: string }
        Returns: Json
      }
      admin_photo_metadata_json: {
        Args: {
          p_row: Database["public"]["Tables"]["production_photo_metadata"]["Row"]
        }
        Returns: Json
      }
      admin_process_subscription_payment: {
        Args: {
          p_amount: number
          p_external_reference?: string
          p_payment_method: string
          p_subscription_id: string
        }
        Returns: Json
      }
      admin_production_status_for_stage: {
        Args: { p_stage: string }
        Returns: string
      }
      admin_publish_catalog_import_item: {
        Args: { p_payload?: Json; p_queue_id: string }
        Returns: string
      }
      admin_record_order_status_history: {
        Args: {
          p_new_status: string
          p_notes?: string
          p_old_status: string
          p_order_id: string
          p_order_type: string
        }
        Returns: string
      }
      admin_register_chat_group_attachment: {
        Args: {
          p_file_name: string
          p_file_path: string
          p_file_size: number
          p_file_type: string
          p_message_id: string
          p_thumbnail_path?: string
          p_uploaded_by: string
        }
        Returns: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          message_id: string
          thumbnail_path: string | null
          uploaded_by: string
        }
        SetofOptions: {
          from: "*"
          to: "chat_group_attachments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_register_preorder_manual_payment: {
        Args: { p_amount: number; p_payment_type: string; p_quote_id: string }
        Returns: string
      }
      admin_reject_character_choice: {
        Args: { p_choice_id: string; p_reason: string }
        Returns: string
      }
      admin_reject_manual_payment_with_notification: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: undefined
      }
      admin_reject_standalone_payment_voucher: {
        Args: {
          p_purchase_id: string
          p_reason: string
          p_voucher_type: string
        }
        Returns: Json
      }
      admin_release_preorder_final_payment: {
        Args: { p_quote_id: string }
        Returns: string
      }
      admin_remove_chat_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      admin_reorder_quick_replies: { Args: { p_updates: Json }; Returns: Json }
      admin_request_manual_payment_info: {
        Args: { p_message: string; p_payment_id: string }
        Returns: undefined
      }
      admin_save_collection_type: {
        Args: { p_data: Json; p_type_id: string }
        Returns: {
          created_at: string
          description: string | null
          display_name: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "collection_types"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_save_group_message_template: {
        Args: { p_content: string; p_name: string; p_template_id: string }
        Returns: {
          content: string
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "message_templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_save_pricing_tier_plan: {
        Args: { p_data: Json; p_tier_id: string }
        Returns: string
      }
      admin_save_quick_reply: {
        Args: {
          p_category: string
          p_display_order?: number
          p_id: string
          p_message: string
          p_title: string
        }
        Returns: string
      }
      admin_save_subscription_plan_configuration: {
        Args: { p_data: Json; p_plan_id: string }
        Returns: string
      }
      admin_schedule_group_message: {
        Args: { p_group_id: string; p_message: string; p_scheduled_at: string }
        Returns: {
          created_at: string
          created_by: string
          group_id: string
          id: string
          message: string
          scheduled_at: string
          sent_at: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "scheduled_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_schedule_subscription_deliveries: {
        Args: {
          p_entry_cycle_id: string
          p_plan_type: string
          p_subscription_id: string
        }
        Returns: Json
      }
      admin_send_chat_group_message: {
        Args: {
          p_action_button_text?: string
          p_action_button_url?: string
          p_group_id: string
          p_link_text?: string
          p_link_url?: string
          p_message: string
        }
        Returns: {
          action_button_text: string | null
          action_button_url: string | null
          created_at: string
          group_id: string
          id: string
          link_text: string | null
          link_url: string | null
          message: string
          sender_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "chat_group_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_send_payment_link: {
        Args: {
          p_amount: number
          p_instructions?: string
          p_payment_link?: string
          p_payment_type: string
          p_pix_key?: string
          p_quote_id: string
        }
        Returns: string
      }
      admin_set_default_payment_method: {
        Args: { p_method_id: string }
        Returns: boolean
      }
      admin_set_profile_role: {
        Args: {
          p_actor_user_id: string
          p_role: string
          p_target_user_id: string
        }
        Returns: Json
      }
      admin_set_quick_reply_active: {
        Args: { p_id: string; p_is_active: boolean }
        Returns: string
      }
      admin_soft_delete_chat_group: {
        Args: { p_deleted_by?: string; p_group_id: string }
        Returns: string
      }
      admin_stage_json: {
        Args: {
          p_row: Database["public"]["Tables"]["production_stages"]["Row"]
        }
        Returns: Json
      }
      admin_sync_production_queue_choice: {
        Args: { p_choice_id: string }
        Returns: undefined
      }
      admin_toggle_payment_method_active: {
        Args: { p_is_active: boolean; p_method_id: string }
        Returns: boolean
      }
      admin_transition_delivery_cycle_status: {
        Args: { p_cycle_id: string; p_status: string }
        Returns: Json
      }
      admin_unassign_collection_from_tier: {
        Args: { p_collection_id: string }
        Returns: string
      }
      admin_unblock_production: { Args: { p_queue_id: string }; Returns: Json }
      admin_update_bonus_piece_status: {
        Args: { p_bonus_id: string; p_status: string }
        Returns: Json
      }
      admin_update_character_price_multiplier: {
        Args: { p_character_id: string; p_new_multiplier: number }
        Returns: Json
      }
      admin_update_collection: {
        Args: { p_collection_id: string; p_payload: Json }
        Returns: string
      }
      admin_update_collection_base_prices: {
        Args: {
          p_premium_price: number
          p_standard_price: number
          p_subscription_price: number
        }
        Returns: Json
      }
      admin_update_collection_character: {
        Args: { p_character_id: string; p_payload: Json }
        Returns: string
      }
      admin_update_delivery_status_legacy: {
        Args: { p_delivery_id: string; p_status: string }
        Returns: Json
      }
      admin_update_holiday: {
        Args: {
          p_description?: string
          p_holiday_date?: string
          p_holiday_id: string
          p_is_recurring?: boolean
          p_name?: string
          p_state_code?: string
          p_type?: string
        }
        Returns: Json
      }
      admin_update_manual_payment_status: {
        Args: {
          p_payment_id: string
          p_rejection_reason?: string
          p_status: string
        }
        Returns: string
      }
      admin_update_notification_settings: {
        Args: { p_updates: Json }
        Returns: Json
      }
      admin_update_payment_method: {
        Args: { p_data: Json; p_method_id: string }
        Returns: Json
      }
      admin_update_payment_setting: {
        Args: { p_key: string; p_value: string }
        Returns: string
      }
      admin_update_photo_metadata: {
        Args: { p_photo_url: string; p_updates: Json }
        Returns: Json
      }
      admin_update_pricing_context_multipliers: {
        Args: {
          p_chosen_multiplier: number
          p_no_subscription_multiplier: number
          p_not_chosen_multiplier: number
        }
        Returns: Json
      }
      admin_update_production_estimated_completion: {
        Args: { p_estimated_completion: string; p_queue_id: string }
        Returns: string
      }
      admin_update_production_notes: {
        Args: { p_notes: string; p_queue_id: string }
        Returns: Json
      }
      admin_update_production_schedule: {
        Args: { p_queue_id: string; p_scheduled_date: string }
        Returns: Json
      }
      admin_update_production_setting: {
        Args: { p_key: string; p_value: string }
        Returns: string
      }
      admin_update_production_stage: {
        Args: { p_queue_id: string; p_stage: string }
        Returns: Json
      }
      admin_update_production_stage_notes: {
        Args: { p_notes: string; p_queue_id: string; p_stage: string }
        Returns: string
      }
      admin_update_purchase_mode: {
        Args: { p_mode_key: string; p_updates: Json }
        Returns: Json
      }
      admin_update_quote_status: {
        Args: { p_quote_id: string; p_status: string }
        Returns: string
      }
      admin_update_quote_tracking_code: {
        Args: { p_quote_id: string; p_tracking_code: string }
        Returns: string
      }
      admin_update_standalone_fulfillment_status: {
        Args: { p_new_status: string; p_notes?: string; p_purchase_id: string }
        Returns: Json
      }
      admin_update_standalone_pricing: {
        Args: { p_pix_discount: number; p_updates: Json }
        Returns: Json
      }
      admin_update_standalone_tracking_code: {
        Args: {
          p_mark_shipped?: boolean
          p_purchase_id: string
          p_tracking_code: string
        }
        Returns: Json
      }
      admin_update_subscription_credit_character: {
        Args: { p_character_id: string; p_patch: Json }
        Returns: Json
      }
      admin_update_subscription_delivery_dates: {
        Args: { p_actual_delivery_date?: string; p_delivery_id: string }
        Returns: string
      }
      admin_update_subscription_delivery_status: {
        Args: {
          p_action_type?: string
          p_admin_user_id?: string
          p_allow_same_status?: boolean
          p_delivery_id: string
          p_notes?: string
          p_status: string
          p_tracking_code?: string
        }
        Returns: Json
      }
      admin_update_subscription_plan_collection_limit: {
        Args: { p_collections_count: number; p_plan_id: string }
        Returns: {
          collections_count: number
          id: string
        }[]
      }
      admin_update_support_conversation: {
        Args: { p_conversation_id: string; p_updates: Json }
        Returns: {
          assigned_to: string | null
          created_at: string
          first_response_at: string | null
          id: string
          last_message_at: string | null
          order_id: string | null
          payment_id: string | null
          priority: string | null
          promised_date: string | null
          quote_id: string | null
          resolved_at: string | null
          risk_flags: string[] | null
          status: string
          subject: string | null
          subscription_id: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "support_conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_upsert_catalog_character: {
        Args: {
          p_character_id?: string
          p_description?: string
          p_image_url?: string
          p_is_catalog?: boolean
          p_name?: string
          p_price_category_id?: string
          p_product_line?: string
          p_status?: string
          p_theme_category?: string
        }
        Returns: string
      }
      admin_upsert_price_category: {
        Args: {
          p_category_id?: string
          p_coin_value_in_cents?: number
          p_description?: string
          p_display_name?: string
          p_display_order?: number
          p_is_active?: boolean
          p_name?: string
          p_price_coins?: number
          p_price_standalone?: number
        }
        Returns: string
      }
      admin_upsert_system_settings: { Args: { p_updates: Json }; Returns: Json }
      admin_validate_choice_note: {
        Args: {
          p_label: string
          p_max_length: number
          p_required?: boolean
          p_value: string
        }
        Returns: string
      }
      admin_validate_collection_character: {
        Args: { p_payload: Json }
        Returns: Json
      }
      admin_validate_collection_status: {
        Args: {
          p_default?: Database["public"]["Enums"]["collection_status"]
          p_value: string
        }
        Returns: Database["public"]["Enums"]["collection_status"]
      }
      admin_validate_collection_text: {
        Args: {
          p_label: string
          p_max_length: number
          p_required?: boolean
          p_value: string
        }
        Returns: string
      }
      admin_validate_holiday_payload: {
        Args: {
          p_description: string
          p_holiday_date: string
          p_is_recurring: boolean
          p_name: string
          p_state_code: string
          p_type: string
        }
        Returns: {
          description: string
          holiday_date: string
          is_recurring: boolean
          name: string
          state_code: string
          type: string
        }[]
      }
      admin_validate_order_text: {
        Args: {
          p_label: string
          p_max_length: number
          p_required?: boolean
          p_value: string
        }
        Returns: string
      }
      admin_validate_payment_method_type: {
        Args: { p_type: string }
        Returns: string
      }
      admin_validate_payment_text: {
        Args: {
          p_allow_newlines?: boolean
          p_label: string
          p_max_length: number
          p_required?: boolean
          p_value: string
        }
        Returns: string
      }
      admin_validate_payment_url: { Args: { p_url: string }; Returns: string }
      admin_validate_photo_caption: {
        Args: { p_caption: string; p_required?: boolean }
        Returns: string
      }
      admin_validate_photo_url: { Args: { p_url: string }; Returns: string }
      admin_validate_plain_text: {
        Args: {
          p_label: string
          p_max_length: number
          p_required?: boolean
          p_value: string
        }
        Returns: string
      }
      admin_validate_production_note: {
        Args: { p_note: string; p_required?: boolean }
        Returns: string
      }
      admin_validate_production_stage: {
        Args: { p_stage: string }
        Returns: string
      }
      admin_validate_public_image_url: {
        Args: { p_required?: boolean; p_value: string }
        Returns: string
      }
      admin_validate_public_image_url_array: {
        Args: { p_value: Json }
        Returns: string[]
      }
      admin_validate_setting_key: { Args: { p_key: string }; Returns: string }
      admin_validate_setting_value: {
        Args: { p_max_length?: number; p_value: string }
        Returns: string
      }
      admin_validate_stage_photo_urls: {
        Args: { p_photos: string[] }
        Returns: string[]
      }
      admin_verify_subscription_payment_voucher: {
        Args: {
          p_admin_user_id?: string
          p_approved: boolean
          p_notes?: string
          p_rejection_reason?: string
          p_subscription_id: string
        }
        Returns: Json
      }
      ai_catalog_validate_tags: {
        Args: { p_tags: string[] }
        Returns: string[]
      }
      apply_automatic_delivery_maintenance: {
        Args: { p_delivery_id: string; p_subscription_id: string }
        Returns: Json
      }
      are_sales_open: { Args: never; Returns: boolean }
      assert_admin_access: { Args: never; Returns: undefined }
      assert_admin_catalog_access: { Args: never; Returns: undefined }
      assert_ai_catalog_mutation_access: { Args: never; Returns: undefined }
      assert_stripe_service_role: { Args: never; Returns: undefined }
      automatic_group_expected_user_ids: {
        Args: { p_criteria: Json; p_group_type: string }
        Returns: string[]
      }
      bootstrap_first_admin: { Args: { p_user_id: string }; Returns: Json }
      cancel_standalone_purchase_for_non_payment: {
        Args: { p_now?: string; p_purchase_id: string }
        Returns: Json
      }
      cancel_subscription_atomic: {
        Args: {
          p_reason?: string
          p_subscription_id: string
          p_user_id: string
        }
        Returns: Json
      }
      cancel_subscription_credit_with_refund: {
        Args: { p_subscription_id: string }
        Returns: Json
      }
      change_delivery_character_for_current_user: {
        Args: { p_character_id: string; p_delivery_id: string }
        Returns: Json
      }
      change_delivery_collection_choice_for_current_user: {
        Args: {
          p_delivery_id: string
          p_ip_address?: string
          p_new_collection_id: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: Json
      }
      check_capacity_available: {
        Args: { p_cycle_id: string; p_quantity: number }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_key: string
          p_max_requests: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_old_cron_logs: {
        Args: { p_retention_days?: number }
        Returns: number
      }
      close_monthly_sales: { Args: { reason?: string }; Returns: boolean }
      coin_require_user: { Args: never; Returns: string }
      coin_validate_text: {
        Args: {
          p_field_name: string
          p_max_length: number
          p_required?: boolean
          p_value: string
        }
        Returns: string
      }
      complete_ai_processing_job: {
        Args: { p_job_id: string; p_status: string }
        Returns: string
      }
      complete_cron_job_log: {
        Args: { p_execution_details?: Json; p_log_id: string }
        Returns: undefined
      }
      confirm_image_queue_model: {
        Args: {
          p_category: string
          p_created_by: string
          p_franchise: string
          p_franchise_override?: string
          p_image_bucket: string
          p_image_path: string
          p_name: string
          p_queue_id: string
          p_subcategory: string
          p_tags: string[]
        }
        Returns: Json
      }
      create_admin_notification: {
        Args: {
          p_action_url?: string
          p_icon?: string
          p_message?: string
          p_metadata?: Json
          p_priority?: string
          p_recipient_user_id?: string
          p_related_id?: string
          p_related_type?: string
          p_title?: string
          p_type?: string
        }
        Returns: string
      }
      create_ai_processing_job: {
        Args: { p_model: string; p_total_images: number }
        Returns: Json
      }
      create_email_delivery_log: {
        Args: {
          p_email_type: string
          p_metadata?: Json
          p_provider: string
          p_recipient_email: string
          p_status: string
          p_subject: string
          p_user_id: string
        }
        Returns: string
      }
      create_manual_payment_for_current_user: {
        Args: {
          p_amount?: number
          p_currency?: string
          p_payment_method_id: string
          p_payment_type?: string
          p_quote_id?: string
          p_subscription_id?: string
        }
        Returns: Json
      }
      create_pending_subscription_for_current_user: {
        Args: { p_payment_method: string; p_plan_type: string }
        Returns: Json
      }
      create_standalone_purchase_atomic: {
        Args: {
          p_character_id: string
          p_collection_id: string
          p_cycle_id: string
          p_deposit_voucher_url?: string
          p_user_id: string
        }
        Returns: Json
      }
      create_subscription_atomic: {
        Args: {
          p_collection_ids: string[]
          p_payment_id?: string
          p_payment_method: string
          p_plan_type: string
          p_user_id: string
        }
        Returns: Json
      }
      create_subscription_checkout_for_current_user: {
        Args: {
          p_collection_id: string
          p_payment_method: string
          p_payment_voucher_url?: string
          p_plan_id: string
        }
        Returns: Json
      }
      create_subscription_credit_individual_order: {
        Args: { p_character_id: string }
        Returns: Json
      }
      create_support_conversation: {
        Args: {
          p_first_message?: string
          p_order_id?: string
          p_payment_id?: string
          p_priority?: string
          p_quote_id?: string
          p_status?: string
          p_subject: string
          p_subscription_id?: string
          p_tags?: string[]
          p_user_id: string
        }
        Returns: {
          assigned_to: string | null
          created_at: string
          first_response_at: string | null
          id: string
          last_message_at: string | null
          order_id: string | null
          payment_id: string | null
          priority: string | null
          promised_date: string | null
          quote_id: string | null
          resolved_at: string | null
          risk_flags: string[] | null
          status: string
          subject: string | null
          subscription_id: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "support_conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_user_notification: {
        Args: {
          p_action_url?: string
          p_message: string
          p_metadata?: Json
          p_priority?: string
          p_related_id?: string
          p_related_type?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      customer_change_character_choice: {
        Args: { p_character_id: string; p_choice_id: string; p_reason: string }
        Returns: Json
      }
      customer_mutation_jsonb_text_array: {
        Args: { p_value: Json }
        Returns: string[]
      }
      customer_mutation_validate_email: {
        Args: { p_field: string; p_required?: boolean; p_value: string }
        Returns: string
      }
      customer_mutation_validate_text: {
        Args: {
          p_field: string
          p_max_length: number
          p_required?: boolean
          p_value: string
        }
        Returns: string
      }
      customer_submit_character_choice: {
        Args: { p_character_id: string; p_order_id: string }
        Returns: Json
      }
      decrement_cycle_capacity: {
        Args: { cycle_id: string }
        Returns: undefined
      }
      delete_profile_payment_method: {
        Args: { p_payment_method_id: string }
        Returns: string
      }
      delete_user_notification: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      delete_wishlist_item: { Args: { p_item_id: string }; Returns: string }
      delivery_cycle_validate_text: {
        Args: {
          p_label: string
          p_max_length?: number
          p_required?: boolean
          p_value: string
        }
        Returns: string
      }
      edit_support_message: {
        Args: { p_message: string; p_message_id: string }
        Returns: {
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_internal: boolean
          message: string
          read_at: string | null
          read_by_admin: boolean
          read_by_customer: boolean
          sender_id: string
          sender_type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "support_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      email_log_validate_text: {
        Args: {
          p_field: string
          p_max_length: number
          p_required?: boolean
          p_value: string
        }
        Returns: string
      }
      email_log_validate_timestamp: {
        Args: { p_field: string; p_value: string }
        Returns: string
      }
      ensure_profile_row_from_auth_user: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          collector_level: number | null
          collector_xp: number
          cpf: string | null
          created_at: string
          delivery_address: Json | null
          display_name: string | null
          email: string
          email_notifications: boolean | null
          full_name: string | null
          id: string
          is_public: boolean
          marketing_emails: boolean | null
          notification_preferences: Json
          order_updates: boolean | null
          phone: string | null
          pieces_owned: number | null
          preference_tags: string[] | null
          preferences_text: string | null
          profile_completion: number | null
          role: Database["public"]["Enums"]["user_role"]
          total_spent: number | null
          updated_at: string
          username: string | null
          whatsapp: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_quote_production: { Args: { p_quote_id: string }; Returns: Json }
      fail_cron_job_log: {
        Args: {
          p_error_message: string
          p_execution_details?: Json
          p_log_id: string
        }
        Returns: undefined
      }
      generate_payment_reference: { Args: never; Returns: string }
      generate_standalone_tracking_code: { Args: never; Returns: string }
      get_active_exchange_rate: {
        Args: never
        Returns: {
          coins_per_real: number
          real_per_coin: number
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
      get_model_likes_count: { Args: { model_uuid: string }; Returns: number }
      get_most_wished_models: {
        Args: { limit_count?: number }
        Returns: {
          model_id: string
          model_name: string
          wish_count: number
        }[]
      }
      get_or_create_current_cycle: {
        Args: { p_now?: string }
        Returns: {
          capacity: number
          capacity_current: number
          capacity_max: number
          cycle_number: number
          id: string
          month: number
          shipping_date: string
          status: string
          used_capacity: number
          year: number
        }[]
      }
      get_stage_photos_with_metadata: {
        Args: { p_stage_id: string }
        Returns: {
          caption: string
          customer_visible: boolean
          photo_url: string
          uploaded_at: string
          uploaded_by_name: string
        }[]
      }
      get_system_settings: { Args: never; Returns: Json }
      get_wishlist_count: { Args: { user_uuid: string }; Returns: number }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      holiday_validate_text: {
        Args: {
          p_label: string
          p_max_length?: number
          p_required?: boolean
          p_value: string
        }
        Returns: string
      }
      increment_cycle_capacity: {
        Args: { cycle_id: string }
        Returns: undefined
      }
      increment_monthly_sales: { Args: { quantity?: number }; Returns: boolean }
      initialize_current_user_coin_balance: {
        Args: { p_description?: string; p_initial_amount?: number }
        Returns: Json
      }
      is_before_cutoff: { Args: { p_now?: string }; Returns: boolean }
      is_in_wishlist: {
        Args: { model_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_safe_in_app_path: { Args: { p_path: string }; Returns: boolean }
      like_catalog_model: { Args: { p_model_id: string }; Returns: string }
      log_security_incident_for_current_user: {
        Args: {
          p_file_name: string
          p_incident_type: string
          p_payment_id: string
          p_scanner?: string
          p_threats?: string[]
        }
        Returns: Json
      }
      log_standalone_admin_action: {
        Args: {
          p_action_type?: string
          p_admin_user_id?: string
          p_metadata?: Json
          p_new_status?: string
          p_notes?: string
          p_previous_status?: string
          p_purchase_id: string
        }
        Returns: string
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_all_user_notifications_read: { Args: never; Returns: number }
      mark_customer_support_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: number
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      mark_support_messages_read: {
        Args: { p_message_ids: string[]; p_reader_type: string }
        Returns: number
      }
      mark_user_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      notify_quote_payment_for_current_user: {
        Args: { p_amount: number; p_quote_id: string }
        Returns: undefined
      }
      ordax_add_business_days: {
        Args: { p_days: number; p_start: string }
        Returns: string
      }
      ordax_is_business_day: { Args: { p_date: string }; Returns: boolean }
      ordax_is_holiday: { Args: { p_date: string }; Returns: boolean }
      pause_subscription_atomic: {
        Args: { p_now?: string; p_subscription_id: string; p_user_id: string }
        Returns: Json
      }
      process_due_conversation_reminder: {
        Args: { p_reminder_id: string }
        Returns: string
      }
      public_collection_row_to_json: {
        Args: {
          p_row: Database["public"]["Tables"]["public_collection"]["Row"]
        }
        Returns: Json
      }
      quote_production_photo_row_to_json: {
        Args: {
          p_row: Database["public"]["Tables"]["quote_production_photos"]["Row"]
        }
        Returns: Json
      }
      quote_production_row_to_json: {
        Args: { p_row: Database["public"]["Tables"]["quote_production"]["Row"] }
        Returns: Json
      }
      reactivate_subscription_credit_renewal: {
        Args: { p_subscription_id: string }
        Returns: Json
      }
      record_email_notification_event: {
        Args: {
          p_conversation_id: string
          p_error_message?: string
          p_message_id: string
          p_recipient_user_id: string
          p_retry_count?: number
          p_sent_at?: string
          p_status: string
        }
        Returns: string
      }
      record_payment_file_upload: {
        Args: {
          p_file_name: string
          p_file_path: string
          p_file_size: number
          p_file_type: string
          p_payment_id: string
          p_thumbnail_path?: string
        }
        Returns: Json
      }
      record_security_event: {
        Args: {
          p_details?: Json
          p_endpoint?: string
          p_event_type: string
          p_ip_address?: string
          p_severity: string
          p_source: string
          p_user_id?: string
        }
        Returns: string
      }
      record_stripe_payment_intent: {
        Args: {
          p_amount: number
          p_currency: string
          p_customer_id: string
          p_metadata?: Json
          p_status: string
          p_stripe_payment_intent_id: string
        }
        Returns: string
      }
      record_stripe_webhook_event: {
        Args: {
          p_event_data: Json
          p_event_type: string
          p_processed_at?: string
          p_stripe_event_id: string
        }
        Returns: boolean
      }
      record_support_attachment_upload: {
        Args: {
          p_file_name: string
          p_file_path: string
          p_file_size: number
          p_file_type: string
          p_message_id: string
          p_public_url?: string
          p_thumbnail_path?: string
          p_uploaded_by: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "support_attachments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      refund_coin_purchase_for_current_user: {
        Args: { p_item_id: string; p_item_type: string; p_reason: string }
        Returns: Json
      }
      release_capacity: {
        Args: { p_cycle_id: string; p_quantity: number }
        Returns: undefined
      }
      remove_current_user_public_collection_item: {
        Args: { p_collection_id: string }
        Returns: string
      }
      reopen_monthly_sales: { Args: never; Returns: boolean }
      reserve_capacity: {
        Args: { p_cycle_id: string; p_quantity: number }
        Returns: undefined
      }
      schedule_subscription_credit_plan_change: {
        Args: { p_new_plan_type: string; p_subscription_id: string }
        Returns: Json
      }
      send_support_message: {
        Args: {
          p_conversation_id: string
          p_is_internal?: boolean
          p_message: string
          p_sender_type: string
        }
        Returns: {
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_internal: boolean
          message: string
          read_at: string | null
          read_by_admin: boolean
          read_by_customer: boolean
          sender_id: string
          sender_type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "support_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_default_profile_payment_method: {
        Args: { p_payment_method_id: string }
        Returns: string
      }
      set_quote_production_stage: {
        Args: { p_note?: string; p_quote_id: string; p_stage: string }
        Returns: Json
      }
      set_subscription_credit_no_renewal: {
        Args: { p_subscription_id: string }
        Returns: Json
      }
      should_send_notification: {
        Args: { notification_type: string; user_id: string }
        Returns: boolean
      }
      start_cron_job_log: {
        Args: { p_execution_details?: Json; p_job_name: string }
        Returns: string
      }
      stripe_validate_text: {
        Args: {
          p_field: string
          p_max_length: number
          p_required?: boolean
          p_value: string
        }
        Returns: string
      }
      submit_order_migration_request: {
        Args: {
          p_email: string
          p_full_name: string
          p_old_order_number: string
          p_order_description: string
          p_phone: string
        }
        Returns: string
      }
      submit_standalone_balance_voucher: {
        Args: { p_balance_voucher_url: string; p_purchase_id: string }
        Returns: Json
      }
      subscription_credit_require_user: { Args: never; Returns: string }
      subscription_credit_validate_plan_type: {
        Args: { p_plan_type: string }
        Returns: string
      }
      subscription_credit_validate_text: {
        Args: {
          p_allow_multiline?: boolean
          p_field_name: string
          p_max_length: number
          p_required?: boolean
          p_value: string
        }
        Returns: string
      }
      subscription_credit_validate_url: {
        Args: { p_field_name: string; p_value: string }
        Returns: string
      }
      support_jsonb_text_array: {
        Args: { p_field_name: string; p_value: Json }
        Returns: string[]
      }
      support_validate_priority: {
        Args: { p_priority: string }
        Returns: string
      }
      support_validate_risk_flags: {
        Args: { p_risk_flags: string[] }
        Returns: string[]
      }
      support_validate_status: { Args: { p_status: string }; Returns: string }
      support_validate_tags: { Args: { p_tags: string[] }; Returns: string[] }
      support_validate_text: {
        Args: {
          p_allow_multiline?: boolean
          p_field_name: string
          p_max_length: number
          p_required?: boolean
          p_value: string
        }
        Returns: string
      }
      sync_all_automatic_groups: { Args: never; Returns: Json }
      sync_automatic_group_members: {
        Args: { p_group_id: string }
        Returns: Json
      }
      touch_stripe_subscription_record: {
        Args: { p_stripe_subscription_id: string }
        Returns: string
      }
      unlike_catalog_model: { Args: { p_model_id: string }; Returns: string }
      update_ai_processing_job_progress: {
        Args: {
          p_failed_images: number
          p_job_id: string
          p_processed_images: number
          p_total_cost_usd: number
        }
        Returns: string
      }
      update_current_user_collector_profile: {
        Args: { p_updates: Json }
        Returns: Json
      }
      update_current_user_public_collection_notes: {
        Args: { p_collection_id: string; p_notes: string }
        Returns: Json
      }
      update_current_user_public_collection_order: {
        Args: { p_items: Json }
        Returns: Json
      }
      update_customer_notification_preferences: {
        Args: { p_preferences: Json }
        Returns: Json
      }
      update_email_delivery_log: {
        Args: { p_log_id: string; p_updates: Json }
        Returns: string
      }
      update_image_queue_ai_result: {
        Args: {
          p_confidence: number
          p_model: string
          p_name: string
          p_queue_id: string
        }
        Returns: string
      }
      update_profile_stats: {
        Args: {
          new_pieces_owned?: number
          new_total_spent?: number
          profile_id: string
        }
        Returns: undefined
      }
      update_stripe_payment_intent_status: {
        Args: {
          p_error_message?: string
          p_status: string
          p_stripe_payment_intent_id: string
        }
        Returns: string
      }
      update_subscription_credit_automatic_order: {
        Args: { p_character_ids: string[]; p_order_id: string }
        Returns: Json
      }
      update_wishlist_item: {
        Args: {
          p_item_id: string
          p_notes: string
          p_notify_when_available: boolean
          p_priority: number
        }
        Returns: string
      }
      upsert_ai_name_cache: {
        Args: {
          p_category: string
          p_franchise: string
          p_model: string
          p_name: string
          p_subcategory: string
          p_tags: string[]
        }
        Returns: Json
      }
      upsert_ai_vision_cache: {
        Args: {
          p_category: string
          p_confidence: number
          p_cost_usd?: number
          p_franchise: string
          p_image_hash: string
          p_model: string
          p_name: string
          p_subcategory: string
          p_tags: string[]
        }
        Returns: Json
      }
      upsert_current_user_profile: { Args: { p_profile: Json }; Returns: Json }
      upsert_email_notification_preferences: {
        Args: { p_preferences?: Json; p_user_id: string }
        Returns: {
          created_at: string
          id: string
          payment_emails: boolean
          reminder_emails: boolean
          revelation_emails: boolean
          shipping_emails: boolean
          updated_at: string
          user_id: string
          welcome_emails: boolean
        }
        SetofOptions: {
          from: "*"
          to: "notification_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_stripe_customer_record: {
        Args: {
          p_email: string
          p_metadata?: Json
          p_stripe_customer_id: string
          p_user_id: string
        }
        Returns: string
      }
      upsert_stripe_refund_record: {
        Args: {
          p_amount: number
          p_currency: string
          p_payment_intent_id: string
          p_reason?: string
          p_status: string
          p_stripe_refund_id: string
        }
        Returns: string
      }
      upsert_stripe_subscription_record: {
        Args: {
          p_cancel_at_period_end: boolean
          p_canceled_at: string
          p_current_period_end: string
          p_current_period_start: string
          p_customer_id: string
          p_metadata?: Json
          p_status: string
          p_stripe_subscription_id: string
        }
        Returns: string
      }
      user_liked_model: {
        Args: { model_uuid: string; user_uuid: string }
        Returns: boolean
      }
      validate_customer_notification_preferences: {
        Args: { p_preferences: Json }
        Returns: Json
      }
      validate_email_notification_preferences: {
        Args: { p_preferences: Json }
        Returns: Json
      }
      validate_group_attachment_path: {
        Args: {
          p_field_name: string
          p_group_id: string
          p_path: string
          p_required?: boolean
        }
        Returns: string
      }
      validate_group_message_url: {
        Args: { p_field_name: string; p_url: string }
        Returns: string
      }
      validate_payment_file_path: {
        Args: {
          p_field: string
          p_path: string
          p_payment_id: string
          p_required?: boolean
        }
        Returns: string
      }
      validate_production_stage: { Args: { p_stage: string }; Returns: string }
      validate_support_attachment_path: {
        Args: {
          p_conversation_id: string
          p_field_name: string
          p_path: string
          p_required?: boolean
        }
        Returns: string
      }
    }
    Enums: {
      choice_status:
        | "pending"
        | "approved"
        | "rejected"
        | "expired"
        | "submitted"
        | "locked"
      collection_status: "draft" | "active" | "inactive" | "archived"
      cycle_status:
        | "sales"
        | "production"
        | "shipping"
        | "completed"
        | "cancelled"
        | "active"
        | "open"
      payment_status:
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "under_review"
        | "requires_info"
        | "approved"
        | "rejected"
        | "deposit_paid"
        | "fully_paid"
      production_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "on_hold"
      purchase_status:
        | "pending"
        | "confirmed"
        | "in_production"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "deposit_paid"
        | "awaiting_balance"
        | "balance_paid"
        | "awaiting_deposit"
        | "completed"
        | "scheduled"
        | "pending_choice"
        | "revealed"
        | "pending_production"
        | "processing"
        | "in_transit"
      subscription_status:
        | "active"
        | "cancelled"
        | "suspended"
        | "expired"
        | "pending_payment"
      transaction_type: "purchase" | "spend" | "refund" | "bonus" | "adjustment"
      user_role: "customer" | "admin" | "super_admin"
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
    Enums: {
      choice_status: [
        "pending",
        "approved",
        "rejected",
        "expired",
        "submitted",
        "locked",
      ],
      collection_status: ["draft", "active", "inactive", "archived"],
      cycle_status: [
        "sales",
        "production",
        "shipping",
        "completed",
        "cancelled",
        "active",
        "open",
      ],
      payment_status: [
        "pending",
        "paid",
        "failed",
        "refunded",
        "under_review",
        "requires_info",
        "approved",
        "rejected",
        "deposit_paid",
        "fully_paid",
      ],
      production_status: [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
        "on_hold",
      ],
      purchase_status: [
        "pending",
        "confirmed",
        "in_production",
        "shipped",
        "delivered",
        "cancelled",
        "deposit_paid",
        "awaiting_balance",
        "balance_paid",
        "awaiting_deposit",
        "completed",
        "scheduled",
        "pending_choice",
        "revealed",
        "pending_production",
        "processing",
        "in_transit",
      ],
      subscription_status: [
        "active",
        "cancelled",
        "suspended",
        "expired",
        "pending_payment",
      ],
      transaction_type: ["purchase", "spend", "refund", "bonus", "adjustment"],
      user_role: ["customer", "admin", "super_admin"],
    },
  },
} as const
