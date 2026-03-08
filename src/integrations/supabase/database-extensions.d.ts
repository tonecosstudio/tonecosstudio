/**
 * Database type extensions for tables that exist in the database
 * but are not yet reflected in the auto-generated types.ts.
 * 
 * This file will be removed once all migrations are applied
 * and types.ts is regenerated.
 */

// Generic row type for tables not yet in the schema
type GenericRow = Record<string, any>;
type GenericInsert = Record<string, any>;
type GenericUpdate = Record<string, any>;

type GenericTable = {
  Row: GenericRow;
  Insert: GenericInsert;
  Update: GenericUpdate;
  Relationships: [];
};

// Extend the Database type to include missing tables
declare module './types' {
  interface Database {
    public: {
      Tables: {
        // Existing tables (keep in sync with types.ts)
        chat_group_attachments: import('./types').Database['public']['Tables']['chat_group_attachments'];
        chat_group_members: import('./types').Database['public']['Tables']['chat_group_members'];
        chat_group_messages: import('./types').Database['public']['Tables']['chat_group_messages'];
        chat_groups: import('./types').Database['public']['Tables']['chat_groups'];
        profiles: import('./types').Database['public']['Tables']['profiles'];
        user_roles: import('./types').Database['public']['Tables']['user_roles'];

        // Missing tables - will be properly typed after migrations
        collections: GenericTable;
        collection_characters: GenericTable;
        collection_types: GenericTable;
        collection_base_pricing: GenericTable;
        collection_pricing: GenericTable;
        subscriptions: GenericTable;
        standalone_purchases: GenericTable;
        character_choices: GenericTable;
        production_queue: GenericTable;
        production_stages: GenericTable;
        cycles: GenericTable;
        quotes: GenericTable;
        quote_items: GenericTable;
        notifications: GenericTable;
        admin_notifications: GenericTable;
        support_conversations: GenericTable;
        support_messages: GenericTable;
        delivery_addresses: GenericTable;
        system_settings: GenericTable;
        payment_methods: GenericTable;
        payment_logs: GenericTable;
        pricing_tiers: GenericTable;
        pricing_context_multipliers: GenericTable;
        price_categories: GenericTable;
        character_standalone_pricing: GenericTable;
        catalog_models: GenericTable;
        catalog_categories: GenericTable;
        email_templates: GenericTable;
        tracking_events: GenericTable;
        alerts: GenericTable;
        alert_rules: GenericTable;
        pre_orders: GenericTable;
        wishlists: GenericTable;
        audit_log: GenericTable;
        content_sections: GenericTable;
        faq_items: GenericTable;
        site_settings: GenericTable;
        [key: string]: GenericTable;
      };
      Views: {
        [key: string]: {
          Row: GenericRow;
          Relationships: [];
        };
      };
      Functions: {
        has_role: import('./types').Database['public']['Functions']['has_role'];
        [key: string]: {
          Args: Record<string, any>;
          Returns: any;
        };
      };
      Enums: {
        app_role: import('./types').Database['public']['Enums']['app_role'];
        [key: string]: string;
      };
      CompositeTypes: {
        [key: string]: never;
      };
    };
  }
}
