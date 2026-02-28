-- Migration: Fix RLS policies for bonus_piece_catalog
-- Description: Replace incorrect auth.users.role checks with proper has_role function
-- Priority: CRITICAL - Security Issue
-- Created: 2026-04-22 00:00:01 UTC

-- Drop incorrect policies
DROP POLICY IF EXISTS "Admins view all catalog items" ON bonus_piece_catalog;
DROP POLICY IF EXISTS "Admins insert catalog items" ON bonus_piece_catalog;
DROP POLICY IF EXISTS "Admins update catalog items" ON bonus_piece_catalog;
DROP POLICY IF EXISTS "Admins delete catalog items" ON bonus_piece_catalog;

-- Create correct policies using has_role function
-- RLS Policy: Admins can view all catalog items
CREATE POLICY "Admins view all catalog items"
  ON bonus_piece_catalog FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policy: Admins can insert catalog items
CREATE POLICY "Admins insert catalog items"
  ON bonus_piece_catalog FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policy: Admins can update catalog items
CREATE POLICY "Admins update catalog items"
  ON bonus_piece_catalog FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policy: Admins can delete catalog items
CREATE POLICY "Admins delete catalog items"
  ON bonus_piece_catalog FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Add comment documenting the fix
COMMENT ON TABLE bonus_piece_catalog IS 'Catalog of available bonus piece types with inventory tracking. RLS policies fixed to use public.has_role() function instead of non-existent auth.users.role column.';
