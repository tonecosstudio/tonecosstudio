-- Migration: Add missing indexes on foreign keys for performance
-- Description: Creates indexes on frequently joined foreign key columns
-- Priority: MEDIUM - Performance Optimization
-- Created: 2026-02-28 00:00:01 UTC

-- Subscription deliveries indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_deliveries') THEN
    CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_subscription_id ON subscription_deliveries(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_cycle_id ON subscription_deliveries(cycle_id);
    CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_collection_id ON subscription_deliveries(collection_id);
    CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_status ON subscription_deliveries(status);
    CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_expected_date ON subscription_deliveries(expected_delivery_date);
    CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_sub_status ON subscription_deliveries(subscription_id, status);
    CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_sub_delivery_num ON subscription_deliveries(subscription_id, delivery_number);
  END IF;
END $$;

-- Subscriptions indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON subscriptions(plan_type);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
  END IF;
END $$;

-- Standalone purchases indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'standalone_purchases') THEN
    CREATE INDEX IF NOT EXISTS idx_standalone_purchases_user_id ON standalone_purchases(user_id);
    CREATE INDEX IF NOT EXISTS idx_standalone_purchases_collection_id ON standalone_purchases(collection_id);
    CREATE INDEX IF NOT EXISTS idx_standalone_purchases_status ON standalone_purchases(status);
    CREATE INDEX IF NOT EXISTS idx_standalone_purchases_user_status ON standalone_purchases(user_id, status);
  END IF;
END $$;

-- Manual payments indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manual_payments') THEN
    CREATE INDEX IF NOT EXISTS idx_manual_payments_user_id ON manual_payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_manual_payments_subscription_id ON manual_payments(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_manual_payments_status ON manual_payments(status);
  END IF;
END $$;

-- Bonus pieces indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bonus_pieces') THEN
    CREATE INDEX IF NOT EXISTS idx_bonus_pieces_subscription_id ON bonus_pieces(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_bonus_pieces_delivery_id ON bonus_pieces(delivery_id);
    CREATE INDEX IF NOT EXISTS idx_bonus_pieces_status ON bonus_pieces(status);
  END IF;
END $$;

-- Collection choice history indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_choice_history') THEN
    CREATE INDEX IF NOT EXISTS idx_collection_choice_history_user_id ON collection_choice_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_collection_choice_history_subscription_id ON collection_choice_history(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_collection_choice_history_delivery_id ON collection_choice_history(delivery_id);
    CREATE INDEX IF NOT EXISTS idx_collection_choice_history_changed_at ON collection_choice_history(changed_at);
  END IF;
END $$;

-- Support conversations indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_conversations') THEN
    CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id ON support_conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);
    CREATE INDEX IF NOT EXISTS idx_support_conversations_priority ON support_conversations(priority);
  END IF;
END $$;

-- Support messages indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_messages') THEN
    CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_id ON support_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id ON support_messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);
  END IF;
END $$;

-- Cycles indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cycles') THEN
    CREATE INDEX IF NOT EXISTS idx_cycles_collection_id ON cycles(collection_id);
    CREATE INDEX IF NOT EXISTS idx_cycles_status ON cycles(status);
    CREATE INDEX IF NOT EXISTS idx_cycles_production_month ON cycles(production_month);
  END IF;
END $$;

-- User roles indexes (for has_role function performance)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON user_roles(user_id, role);
  END IF;
END $$;
