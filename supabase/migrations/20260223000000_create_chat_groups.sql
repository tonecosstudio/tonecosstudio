-- Migration: Create chat_groups table
-- Feature: chat-groups-system
-- Requirements: 1.1, 1.2, 15.1, 15.2

-- Create chat_groups table
CREATE TABLE IF NOT EXISTS chat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  
  -- Membership criteria (JSONB for flexibility)
  membership_criteria JSONB,
  -- Examples:
  -- Manual: null
  -- Assinantes: {"subscription_status": "active", "collection_id": "uuid", "plan": "premium"}
  -- Coleção: {"collection_id": "uuid"}
  -- Lançamentos: {"criteria": "all_users" | "previous_buyers"}
  -- Pedidos: {"status": ["pending", "processing"], "date_from": "2024-01-01", "date_to": "2024-12-31"}
  
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Soft delete columns
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  
  -- CHECK constraints
  CONSTRAINT chat_groups_name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 100),
  CONSTRAINT chat_groups_type_enum CHECK (type IN ('manual', 'assinantes', 'colecao', 'lancamentos', 'pedidos')),
  
  -- Unique constraint on name (only for non-deleted groups)
  CONSTRAINT chat_groups_name_unique UNIQUE (name)
);

-- Create partial unique index for non-deleted groups
CREATE UNIQUE INDEX idx_chat_groups_name_active 
ON chat_groups(name) 
WHERE deleted_at IS NULL;

-- Create indexes for performance
CREATE INDEX idx_chat_groups_type ON chat_groups(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_groups_deleted_at ON chat_groups(deleted_at);
CREATE INDEX idx_chat_groups_created_by ON chat_groups(created_by);

-- Add comment to table
COMMENT ON TABLE chat_groups IS 'Stores broadcast group definitions and membership criteria for the chat groups system';
COMMENT ON COLUMN chat_groups.membership_criteria IS 'JSONB field storing type-specific membership criteria for automatic groups';
COMMENT ON COLUMN chat_groups.deleted_at IS 'Soft delete timestamp - preserves historical data for audit while hiding from users';
COMMENT ON COLUMN chat_groups.deleted_by IS 'User ID who performed the soft delete operation';
