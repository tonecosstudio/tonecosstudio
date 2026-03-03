-- =====================================================
-- CONSOLIDATED PRODUCTION MIGRATIONS
-- This file applies all 5 production migrations in order
-- =====================================================

-- Migration 1: Create production_queue table
\i supabase/migrations/20260428000000_create_production_queue.sql

-- Migration 2: Create character_choices table
\i supabase/migrations/20260428000001_create_character_choices.sql

-- Migration 3: Create production_stages table
\i supabase/migrations/20260428000002_create_production_stages.sql

-- Migration 4: Create production views
\i supabase/migrations/20260428000003_create_production_views.sql

-- Migration 5: Create production functions
\i supabase/migrations/20260428000004_create_production_functions.sql
