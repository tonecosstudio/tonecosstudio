/**
 * Database Types for ORDAX Complete System
 * 
 * TypeScript type definitions for new database tables.
 * These types match the database schema exactly from the migrations.
 * 
 * Requirements: 30.3
 */

/**
 * Standalone Purchase Type
 * 
 * Represents a single piece purchase without subscription, using deposit model.
 * Matches standalone_purchases table (created in migration 1.1)
 * 
 * @see supabase/migrations/20260315000000_create_standalone_purchases.sql
 */
export type StandalonePurchaseStatus =
  | 'pending'
  | 'confirmed'
  | 'awaiting_deposit'
  | 'deposit_paid'
  | 'awaiting_balance'
  | 'balance_paid'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export interface StandalonePurchase {
  /** Primary key */
  id: string;
  
  /** User reference */
  user_id: string;
  
  /** Collection reference */
  collection_id: string;
  
  /** Cycle reference */
  cycle_id: string;
  
  /** Character reference (optional) */
  character_id: string | null;
  
  /** Purchase status */
  status: StandalonePurchaseStatus;
  
  /** Fixed R$100 deposit (non-refundable arras confirmatórias) */
  deposit_amount: number;
  
  /** Remaining amount after deposit (collection price - 100) */
  balance_amount: number;
  
  /** Total collection price */
  total_amount: number;

  /** Legacy synchronized alias for deposit_amount */
  price_deposit?: number | null;

  /** Legacy synchronized alias for balance_amount */
  price_balance?: number | null;

  /** Legacy synchronized alias for total_amount */
  price_full?: number | null;
  
  /** Timestamp when deposit was paid */
  deposit_paid_at: Date | null;
  
  /** Deadline for balance payment (5 business days after production completion) */
  balance_due_date: Date | null;
  
  /** Timestamp when balance was paid */
  balance_paid_at: Date | null;
  
  /** Timestamp when production was completed */
  production_complete_at: Date | null;
  
  /** Timestamp when order was shipped */
  shipped_at: Date | null;
  
  /** Timestamp when order was delivered */
  delivered_at: Date | null;
  
  /** Timestamp when order was cancelled */
  cancelled_at: Date | null;
  
  /** Reason for cancellation (typically "Balance payment not received within deadline (Arras Confirmatórias)") */
  cancellation_reason: string | null;
  
  /** Shipping tracking code */
  tracking_code: string | null;
  
  /** URL to deposit payment voucher */
  deposit_voucher_url: string | null;
  
  /** Rejection reason for deposit payment voucher (cleared when new voucher uploaded) */
  deposit_rejection_reason: string | null;
  
  /** URL to balance payment voucher */
  balance_voucher_url: string | null;
  
  /** Rejection reason for balance payment voucher (cleared when new voucher uploaded) */
  balance_rejection_reason: string | null;
  
  /** Expected delivery date */
  expected_delivery_date: Date | null;
  
  /** Actual delivery date */
  actual_delivery_date: Date | null;
  
  /** Record creation timestamp */
  created_at: Date;
  
  /** Record last update timestamp */
  updated_at: Date;
}

/**
 * Collection Choice History Type
 * 
 * Tracks all collection choice changes for audit trail and dispute resolution.
 * Matches collection_choice_history table (created in migration 1.2)
 * 
 * @see supabase/migrations/20260316000000_create_collection_choice_history.sql
 */
export interface CollectionChoiceHistory {
  /** Primary key */
  id: string;
  
  /** The delivery for which the collection choice was changed */
  delivery_id: string;
  
  /** The subscriber who made or received the change */
  user_id: string;
  
  /** Previous collection choice (NULL for first choice) */
  previous_collection_id: string | null;
  
  /** New collection choice after the change */
  new_collection_id: string;
  
  /** Reason for change: manual (subscriber), automatic_maintenance (system), admin_override (admin) */
  change_reason: 'manual' | 'automatic_maintenance' | 'admin_override';
  
  /** Whether the change was made by an administrator */
  changed_by_admin: boolean;
  
  /** Admin user ID if changed_by_admin is true */
  admin_user_id: string | null;
  
  /** IP address of the user who made the change (for dispute resolution) */
  ip_address: string | null;
  
  /** User agent/browser information of the user who made the change */
  user_agent: string | null;
  
  /** Timestamp when the change was recorded (UTC) */
  created_at: Date;
}

/**
 * Holiday Type
 * 
 * Represents Brazilian national and Bahia state holidays for business day calculations.
 * Matches holidays table (created in migration 1.6)
 * 
 * NOTE: This type is also exported from src/services/holiday-service.ts
 * This is the central database type definition.
 * 
 * @see supabase/migrations/20260226214804_create_holidays_table.sql
 * @see src/services/holiday-service.ts
 */
export interface Holiday {
  /** Primary key */
  id: string;
  
  /** Date of the holiday */
  holiday_date: Date;
  
  /** Name of the holiday */
  name: string;
  
  /** Optional description of the holiday */
  description: string | null;
  
  /** Type of holiday: national or state */
  type: 'national' | 'state';
  
  /** State code (BA for Bahia) for state holidays, null for national holidays */
  state_code: string | null;
  
  /** Whether this holiday recurs annually */
  is_recurring: boolean;
  
  /** Record creation timestamp */
  created_at: Date;
  
  /** Record last update timestamp */
  updated_at: Date;
}

/**
 * Admin Action Log Type
 * 
 * Audit trail of all administrative actions on deliveries for security compliance.
 * Matches admin_action_logs table (created in migration 20260228054018)
 * 
 * @see supabase/migrations/20260228054018_create_admin_action_logs.sql
 */
export interface AdminActionLog {
  /** Primary key */
  id: string;
  
  /** The delivery that was modified */
  delivery_id: string;
  
  /** The admin user who performed the action */
  admin_user_id: string;
  
  /** Type of action performed */
  action_type: 'status_update' | 'tracking_update' | 'collection_change' | 'reschedule' | 'other';
  
  /** Previous status before the action (for status updates) */
  previous_status: string | null;
  
  /** New status after the action (for status updates) */
  new_status: string | null;
  
  /** Optional notes or reason for the action */
  notes: string | null;
  
  /** Timestamp when the action was performed (UTC) */
  created_at: Date;
}

/**
 * Bonus Piece Type
 * 
 * Represents exclusive collectible pieces included with 6th delivery of Semestral plan.
 * This table will be created in a future migration, but the type is defined now.
 * 
 * @see Design Document - Bonus Piece Model
 */
export interface BonusPiece {
  /** Primary key */
  id: string;
  
  /** Subscription reference */
  subscription_id: string;
  
  /** Delivery reference (nullable until assigned) */
  delivery_id: string | null;
  
  /** Description of the bonus piece */
  description: string;
  
  /** Image URL for the bonus piece */
  image_url: string | null;
  
  /** Status of the bonus piece */
  status: 'pending' | 'prepared' | 'shipped';
  
  /** Timestamp when bonus piece was prepared */
  prepared_at: Date | null;
  
  /** Timestamp when bonus piece was shipped */
  shipped_at: Date | null;
  
  /** Record creation timestamp */
  created_at: Date;
  
  /** Record last update timestamp */
  updated_at: Date;
}

/**
 * Database row types (with string dates for database responses)
 * 
 * These types represent the raw data returned from the database
 * before conversion to proper Date objects.
 */

export interface StandalonePurchaseRow {
  id: string;
  user_id: string;
  collection_id: string;
  cycle_id: string;
  character_id: string | null;
  status: StandalonePurchaseStatus;
  deposit_amount: number;
  balance_amount: number;
  total_amount: number;
  price_deposit?: number | null;
  price_balance?: number | null;
  price_full?: number | null;
  deposit_paid_at: string | null;
  balance_due_date: string | null;
  balance_paid_at: string | null;
  production_complete_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  tracking_code: string | null;
  payment_voucher_deposit_url: string | null;
  deposit_rejection_reason: string | null;
  payment_voucher_balance_url: string | null;
  balance_rejection_reason: string | null;

  /** Legacy synchronized alias for payment_voucher_deposit_url */
  deposit_voucher_url?: string | null;

  /** Legacy synchronized alias for payment_voucher_balance_url */
  balance_voucher_url?: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionChoiceHistoryRow {
  id: string;
  delivery_id: string;
  user_id: string;
  previous_collection_id: string | null;
  new_collection_id: string;
  change_reason: 'manual' | 'automatic_maintenance' | 'admin_override';
  changed_by_admin: boolean;
  admin_user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AdminActionLogRow {
  id: string;
  delivery_id: string;
  admin_user_id: string;
  action_type: 'status_update' | 'tracking_update' | 'collection_change' | 'reschedule' | 'other';
  previous_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
}

export interface HolidayRow {
  id: string;
  holiday_date: string;
  name: string;
  description: string | null;
  type: 'national' | 'state';
  state_code: string | null;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface BonusPieceRow {
  id: string;
  subscription_id: string;
  delivery_id: string | null;
  description: string;
  image_url: string | null;
  status: 'pending' | 'prepared' | 'shipped';
  prepared_at: string | null;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Helper function to convert database row to typed object with Date fields
 */
export function convertStandalonePurchaseRow(row: StandalonePurchaseRow): StandalonePurchase {
  return {
    ...row,
    deposit_paid_at: row.deposit_paid_at ? new Date(row.deposit_paid_at) : null,
    balance_due_date: row.balance_due_date ? new Date(row.balance_due_date) : null,
    balance_paid_at: row.balance_paid_at ? new Date(row.balance_paid_at) : null,
    production_complete_at: row.production_complete_at ? new Date(row.production_complete_at) : null,
    shipped_at: row.shipped_at ? new Date(row.shipped_at) : null,
    delivered_at: row.delivered_at ? new Date(row.delivered_at) : null,
    cancelled_at: row.cancelled_at ? new Date(row.cancelled_at) : null,
    expected_delivery_date: row.expected_delivery_date ? new Date(row.expected_delivery_date) : null,
    actual_delivery_date: row.actual_delivery_date ? new Date(row.actual_delivery_date) : null,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    deposit_voucher_url: row.deposit_voucher_url ?? row.payment_voucher_deposit_url ?? null,
    balance_voucher_url: row.balance_voucher_url ?? row.payment_voucher_balance_url ?? null,
  };
}

export function convertCollectionChoiceHistoryRow(row: CollectionChoiceHistoryRow): CollectionChoiceHistory {
  return {
    ...row,
    created_at: new Date(row.created_at),
  };
}

export function convertAdminActionLogRow(row: AdminActionLogRow): AdminActionLog {
  return {
    ...row,
    created_at: new Date(row.created_at),
  };
}

export function convertHolidayRow(row: HolidayRow): Holiday {
  return {
    ...row,
    holiday_date: new Date(row.holiday_date),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

export function convertBonusPieceRow(row: BonusPieceRow): BonusPiece {
  return {
    ...row,
    prepared_at: row.prepared_at ? new Date(row.prepared_at) : null,
    shipped_at: row.shipped_at ? new Date(row.shipped_at) : null,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}
