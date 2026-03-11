-- =====================================================
-- Migration: Reload Schema Cache
-- Description: Force PostgREST schema cache reload
-- =====================================================

-- This migration forces PostgREST to reload its schema cache
-- by making a trivial change to the database

-- Add a comment to trigger schema reload
COMMENT ON SCHEMA public IS 'Public schema - Updated 2026-03-09 15:08';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
