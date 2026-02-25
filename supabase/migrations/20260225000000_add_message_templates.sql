-- Migration: Add message_templates table
-- Created: 2026-02-25
-- Description: Tabela para armazenar templates de mensagens reutilizáveis

-- Create message_templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_message_templates_created_by ON message_templates(created_by);
CREATE INDEX idx_message_templates_created_at ON message_templates(created_at DESC);

-- Enable RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own templates"
  ON message_templates
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own templates"
  ON message_templates
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates"
  ON message_templates
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates"
  ON message_templates
  FOR DELETE
  USING (auth.uid() = created_by);

-- Add trigger for updated_at
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE message_templates IS 'Templates de mensagens reutilizáveis para grupos de broadcast';
