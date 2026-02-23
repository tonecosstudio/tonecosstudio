// Override Supabase types module to accept any table name
// This is needed because the database tables haven't been created yet
// Remove this file once database tables are created and types are regenerated

declare module '*/integrations/supabase/types' {
  export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

  export type Database = {
    public: {
      Tables: Record<string, {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
        Relationships: any[]
      }>
      Views: Record<string, {
        Row: Record<string, any>
        Relationships: any[]
      }>
      Functions: Record<string, {
        Args: Record<string, any>
        Returns: any
      }>
      Enums: Record<string, string>
      CompositeTypes: Record<string, any>
    }
  }

  export type Tables<T extends string = string> = Record<string, any>
  export type TablesInsert<T extends string = string> = Record<string, any>
  export type TablesUpdate<T extends string = string> = Record<string, any>
  export type Enums<T extends string = string> = string
  export type CompositeTypes<T extends string = string> = Record<string, any>
  export const Constants: { public: { Enums: Record<string, any> } }
}
