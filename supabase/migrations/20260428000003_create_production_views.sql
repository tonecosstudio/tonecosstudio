-- =====================================================
-- MIGRATION: Create production views for optimized queries
-- Date: 2026-04-28
-- Description: Creates database views for optimized production dashboard queries
-- Requirements: 2.1, 2.2, 2.3
-- =====================================================

-- =====================================================
-- 1. CREATE PRODUCTION_QUEUE_WITH_DETAILS VIEW
-- =====================================================
-- This view joins production_queue with customer, collection, and character data
-- for optimized dashboard queries without multiple joins

CREATE OR REPLACE VIEW production_queue_with_details AS
SELECT 
  -- Production queue fields
  pq.id,
  pq.order_id,
  pq.order_type,
  pq.customer_id,
  pq.customer_name,
  pq.customer_email,
  pq.collection_id,
  pq.collection_name,
  pq.character_id,
  pq.character_name,
  pq.production_status,
  pq.current_stage,
  pq.choice_status,
  pq.choice_deadline,
  pq.choice_made_at,
  pq.priority,
  pq.priority_score,
  pq.scheduled_production_date,
  pq.estimated_completion_date,
  pq.assigned_to,
  pq.assigned_to_name,
  pq.assigned_at,
  pq.production_started_at,
  pq.production_completed_at,
  pq.production_notes,
  pq.customer_notes,
  pq.internal_flags,
  pq.created_at,
  pq.updated_at,
  
  -- Customer profile data
  p.full_name AS customer_full_name,
  p.phone AS customer_phone,
  
  -- Collection data
  c.name AS collection_display_name,
  c.description AS collection_description,
  c.image_url AS collection_image_url,
  c.is_active AS collection_is_active,
  
  -- Character data (if chosen)
  cc.name AS character_display_name,
  cc.description AS character_description,
  cc.image_url AS character_image_url,
  
  -- Calculated fields
  CASE 
    WHEN pq.choice_deadline IS NOT NULL AND pq.choice_status = 'pending' THEN
      EXTRACT(EPOCH FROM (pq.choice_deadline - now())) / 3600
    ELSE NULL
  END AS hours_until_deadline,
  
  CASE 
    WHEN pq.production_started_at IS NOT NULL AND pq.production_completed_at IS NULL THEN
      EXTRACT(EPOCH FROM (now() - pq.production_started_at)) / 3600
    ELSE NULL
  END AS hours_in_production,
  
  CASE 
    WHEN pq.production_started_at IS NOT NULL AND pq.production_completed_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (pq.production_completed_at - pq.production_started_at)) / 3600
    ELSE NULL
  END AS total_production_hours

FROM production_queue pq
LEFT JOIN profiles p ON pq.customer_id = p.id
LEFT JOIN collections c ON pq.collection_id = c.id
LEFT JOIN collection_characters cc ON pq.character_id = cc.id;

COMMENT ON VIEW production_queue_with_details IS 
  'Optimized view joining production_queue with customer, collection, and character data for dashboard queries';

-- =====================================================
-- 2. CREATE PENDING_CHOICES_WITH_COUNTDOWN VIEW
-- =====================================================
-- This view shows all pending character choices with calculated time remaining
-- and urgency indicators for the choice management interface

CREATE OR REPLACE VIEW pending_choices_with_countdown AS
SELECT 
  -- Character choice fields
  ch.id,
  ch.order_id,
  ch.order_type,
  ch.user_id,
  ch.collection_id,
  ch.character_id,
  ch.character_name,
  ch.character_image_url,
  ch.status,
  ch.submitted_at,
  ch.approved_at,
  ch.approved_by,
  ch.approved_by_name,
  ch.rejected_at,
  ch.rejection_reason,
  ch.deadline,
  ch.reminders_sent,
  ch.last_reminder_at,
  ch.previous_choice_id,
  ch.change_reason,
  ch.change_count,
  ch.created_at,
  ch.updated_at,
  
  -- Production queue data
  pq.customer_name,
  pq.customer_email,
  pq.collection_name,
  pq.priority,
  pq.priority_score,
  
  -- Customer profile data
  p.full_name AS customer_full_name,
  p.phone AS customer_phone,
  
  -- Collection data
  c.name AS collection_display_name,
  c.image_url AS collection_image_url,
  
  -- Calculated countdown fields
  EXTRACT(EPOCH FROM (ch.deadline - now())) / 3600 AS hours_until_deadline,
  EXTRACT(EPOCH FROM (ch.deadline - now())) / 86400 AS days_until_deadline,
  
  -- Urgency indicator
  CASE 
    WHEN ch.deadline < now() THEN 'expired'
    WHEN EXTRACT(EPOCH FROM (ch.deadline - now())) / 3600 < 24 THEN 'critical'
    WHEN EXTRACT(EPOCH FROM (ch.deadline - now())) / 3600 < 48 THEN 'urgent'
    WHEN EXTRACT(EPOCH FROM (ch.deadline - now())) / 3600 < 120 THEN 'warning'
    ELSE 'normal'
  END AS urgency_level,
  
  -- Reminder status
  CASE 
    WHEN ch.reminders_sent = 0 THEN 'no_reminders'
    WHEN ch.reminders_sent = 1 THEN 'first_reminder_sent'
    WHEN ch.reminders_sent = 2 THEN 'second_reminder_sent'
    WHEN ch.reminders_sent >= 3 THEN 'final_reminder_sent'
    ELSE 'unknown'
  END AS reminder_status,
  
  -- Next reminder due
  CASE 
    WHEN ch.reminders_sent = 0 AND EXTRACT(EPOCH FROM (ch.deadline - now())) / 3600 <= 120 THEN true
    WHEN ch.reminders_sent = 1 AND EXTRACT(EPOCH FROM (ch.deadline - now())) / 3600 <= 48 THEN true
    WHEN ch.reminders_sent = 2 AND EXTRACT(EPOCH FROM (ch.deadline - now())) / 3600 <= 24 THEN true
    ELSE false
  END AS reminder_due

FROM character_choices ch
LEFT JOIN production_queue pq ON ch.order_id = pq.order_id AND ch.order_type = pq.order_type
LEFT JOIN profiles p ON ch.user_id = p.id
LEFT JOIN collections c ON ch.collection_id = c.id
WHERE ch.status IN ('pending', 'submitted');

COMMENT ON VIEW pending_choices_with_countdown IS 
  'Shows pending character choices with calculated countdown, urgency levels, and reminder status';

-- =====================================================
-- 3. CREATE PRODUCTION_METRICS VIEW
-- =====================================================
-- This view aggregates production stage durations and provides metrics
-- for dashboard analytics and performance monitoring

CREATE OR REPLACE VIEW production_metrics AS
SELECT 
  -- Stage metrics
  ps.stage_name,
  ps.stage_order,
  
  -- Count metrics
  COUNT(*) AS total_stages,
  COUNT(*) FILTER (WHERE ps.status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE ps.status = 'in_progress') AS in_progress_count,
  COUNT(*) FILTER (WHERE ps.status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE ps.status = 'blocked') AS blocked_count,
  
  -- Duration metrics (in hours)
  AVG(ps.actual_duration) FILTER (WHERE ps.status = 'completed') AS avg_duration_hours,
  MIN(ps.actual_duration) FILTER (WHERE ps.status = 'completed') AS min_duration_hours,
  MAX(ps.actual_duration) FILTER (WHERE ps.status = 'completed') AS max_duration_hours,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ps.actual_duration) FILTER (WHERE ps.status = 'completed') AS median_duration_hours,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY ps.actual_duration) FILTER (WHERE ps.status = 'completed') AS p90_duration_hours,
  
  -- Estimated vs actual
  AVG(ps.estimated_duration) AS avg_estimated_hours,
  AVG(ps.actual_duration - ps.estimated_duration) FILTER (WHERE ps.status = 'completed') AS avg_variance_hours,
  
  -- Performance indicators
  COUNT(*) FILTER (
    WHERE ps.status = 'completed' 
    AND ps.actual_duration > ps.estimated_duration * 1.5
  ) AS exceeded_estimate_count,
  
  COUNT(*) FILTER (
    WHERE ps.status = 'in_progress' 
    AND ps.started_at IS NOT NULL
    AND EXTRACT(EPOCH FROM (now() - ps.started_at)) / 3600 > ps.estimated_duration * 1.5
  ) AS overdue_in_progress_count,
  
  -- Blocking metrics
  COUNT(*) FILTER (WHERE ps.is_blocked = true) AS currently_blocked_count,
  AVG(EXTRACT(EPOCH FROM (COALESCE(ps.unblocked_at, now()) - ps.blocked_at)) / 3600) 
    FILTER (WHERE ps.blocked_at IS NOT NULL) AS avg_blocked_duration_hours,
  
  -- Assignment metrics
  COUNT(DISTINCT ps.assigned_to) FILTER (WHERE ps.assigned_to IS NOT NULL) AS unique_assignees,
  AVG(EXTRACT(EPOCH FROM (COALESCE(ps.started_at, now()) - ps.assigned_at)) / 3600)
    FILTER (WHERE ps.assigned_at IS NOT NULL) AS avg_time_to_start_hours,
  
  -- Timestamps
  MIN(ps.created_at) AS first_stage_created,
  MAX(ps.updated_at) AS last_stage_updated

FROM production_stages ps
GROUP BY ps.stage_name, ps.stage_order
ORDER BY ps.stage_order;

COMMENT ON VIEW production_metrics IS 
  'Aggregates production stage durations and performance metrics for dashboard analytics';

-- =====================================================
-- 4. CREATE ADDITIONAL HELPER VIEW: URGENT_ITEMS
-- =====================================================
-- This view identifies items requiring immediate attention

CREATE OR REPLACE VIEW urgent_production_items AS
SELECT 
  pq.id,
  pq.order_id,
  pq.order_type,
  pq.customer_name,
  pq.customer_email,
  pq.collection_name,
  pq.character_name,
  pq.current_stage,
  pq.production_status,
  pq.priority,
  pq.priority_score,
  pq.choice_deadline,
  pq.choice_status,
  
  -- Urgency reasons (array of reasons why this item is urgent)
  ARRAY_REMOVE(ARRAY[
    CASE WHEN pq.choice_deadline IS NOT NULL 
         AND pq.choice_status = 'pending' 
         AND EXTRACT(EPOCH FROM (pq.choice_deadline - now())) / 3600 < 24 
    THEN 'choice_deadline_critical' END,
    
    CASE WHEN pq.choice_deadline IS NOT NULL 
         AND pq.choice_status = 'pending' 
         AND EXTRACT(EPOCH FROM (pq.choice_deadline - now())) / 3600 < 48 
    THEN 'choice_deadline_urgent' END,
    
    CASE WHEN pq.production_status = 'on_hold' 
    THEN 'production_blocked' END,
    
    CASE WHEN pq.production_started_at IS NOT NULL 
         AND pq.production_completed_at IS NULL
         AND EXTRACT(EPOCH FROM (now() - pq.production_started_at)) / 3600 > 240 
    THEN 'production_overdue' END,
    
    CASE WHEN pq.priority = 'critical' 
    THEN 'critical_priority' END,
    
    CASE WHEN EXISTS (
      SELECT 1 FROM production_stages ps 
      WHERE ps.production_queue_id = pq.id 
      AND ps.is_blocked = true
    ) THEN 'stage_blocked' END
  ], NULL) AS urgency_reasons,
  
  -- Urgency score (higher = more urgent)
  (
    CASE WHEN pq.choice_deadline IS NOT NULL 
         AND pq.choice_status = 'pending' 
         AND EXTRACT(EPOCH FROM (pq.choice_deadline - now())) / 3600 < 24 
    THEN 50 ELSE 0 END +
    
    CASE WHEN pq.choice_deadline IS NOT NULL 
         AND pq.choice_status = 'pending' 
         AND EXTRACT(EPOCH FROM (pq.choice_deadline - now())) / 3600 < 48 
    THEN 30 ELSE 0 END +
    
    CASE WHEN pq.production_status = 'on_hold' 
    THEN 40 ELSE 0 END +
    
    CASE WHEN pq.production_started_at IS NOT NULL 
         AND pq.production_completed_at IS NULL
         AND EXTRACT(EPOCH FROM (now() - pq.production_started_at)) / 3600 > 240 
    THEN 35 ELSE 0 END +
    
    CASE WHEN pq.priority = 'critical' 
    THEN 25 ELSE 0 END +
    
    CASE WHEN EXISTS (
      SELECT 1 FROM production_stages ps 
      WHERE ps.production_queue_id = pq.id 
      AND ps.is_blocked = true
    ) THEN 30 ELSE 0 END
  ) AS urgency_score,
  
  pq.created_at,
  pq.updated_at

FROM production_queue pq
WHERE 
  -- Choice deadline critical (< 24h)
  (pq.choice_deadline IS NOT NULL 
   AND pq.choice_status = 'pending' 
   AND EXTRACT(EPOCH FROM (pq.choice_deadline - now())) / 3600 < 24)
  OR
  -- Choice deadline urgent (< 48h)
  (pq.choice_deadline IS NOT NULL 
   AND pq.choice_status = 'pending' 
   AND EXTRACT(EPOCH FROM (pq.choice_deadline - now())) / 3600 < 48)
  OR
  -- Production blocked
  pq.production_status = 'on_hold'
  OR
  -- Production overdue (> 10 days in production)
  (pq.production_started_at IS NOT NULL 
   AND pq.production_completed_at IS NULL
   AND EXTRACT(EPOCH FROM (now() - pq.production_started_at)) / 3600 > 240)
  OR
  -- Critical priority
  pq.priority = 'critical'
  OR
  -- Has blocked stages
  EXISTS (
    SELECT 1 FROM production_stages ps 
    WHERE ps.production_queue_id = pq.id 
    AND ps.is_blocked = true
  )
ORDER BY urgency_score DESC, pq.priority_score DESC;

COMMENT ON VIEW urgent_production_items IS 
  'Identifies production items requiring immediate attention with urgency scoring';

-- =====================================================
-- 5. CREATE INDEXES ON VIEWS FOR PERFORMANCE
-- =====================================================
-- Note: PostgreSQL doesn't support indexes directly on views,
-- but we can create indexes on the underlying tables that will
-- benefit the view queries. These were already created in previous
-- migrations, but we document them here for reference.

-- The following indexes on base tables optimize view performance:
-- - idx_production_queue_status (for production_queue_with_details)
-- - idx_production_queue_priority (for production_queue_with_details)
-- - idx_character_choices_deadline (for pending_choices_with_countdown)
-- - idx_character_choices_status (for pending_choices_with_countdown)
-- - idx_production_stages_status (for production_metrics)
-- - idx_production_stages_queue (for production_metrics)

-- =====================================================
-- 6. CREATE MATERIALIZED VIEW FOR DASHBOARD SUMMARY
-- =====================================================
-- This materialized view provides fast access to dashboard summary statistics
-- It should be refreshed periodically (e.g., every 5 minutes)

CREATE MATERIALIZED VIEW production_dashboard_summary AS
SELECT 
  -- Overall counts
  COUNT(*) AS total_items,
  COUNT(*) FILTER (WHERE production_status = 'awaiting_choice') AS awaiting_choice_count,
  COUNT(*) FILTER (WHERE production_status = 'ready_for_production') AS ready_count,
  COUNT(*) FILTER (WHERE production_status = 'in_production') AS in_production_count,
  COUNT(*) FILTER (WHERE production_status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE production_status = 'on_hold') AS on_hold_count,
  
  -- Priority counts
  COUNT(*) FILTER (WHERE priority = 'critical') AS critical_count,
  COUNT(*) FILTER (WHERE priority = 'high') AS high_count,
  COUNT(*) FILTER (WHERE priority = 'normal') AS normal_count,
  COUNT(*) FILTER (WHERE priority = 'low') AS low_count,
  
  -- Stage counts
  COUNT(*) FILTER (WHERE current_stage = 'awaiting_choice') AS stage_awaiting_choice,
  COUNT(*) FILTER (WHERE current_stage = 'design') AS stage_design,
  COUNT(*) FILTER (WHERE current_stage = 'production') AS stage_production,
  COUNT(*) FILTER (WHERE current_stage = 'quality_check') AS stage_quality_check,
  COUNT(*) FILTER (WHERE current_stage = 'packaging') AS stage_packaging,
  COUNT(*) FILTER (WHERE current_stage = 'shipped') AS stage_shipped,
  
  -- Choice status counts
  COUNT(*) FILTER (WHERE choice_status = 'pending') AS choice_pending_count,
  COUNT(*) FILTER (WHERE choice_status = 'submitted') AS choice_submitted_count,
  COUNT(*) FILTER (WHERE choice_status = 'approved') AS choice_approved_count,
  
  -- Urgent items
  COUNT(*) FILTER (
    WHERE choice_deadline IS NOT NULL 
    AND choice_status = 'pending' 
    AND EXTRACT(EPOCH FROM (choice_deadline - now())) / 3600 < 24
  ) AS urgent_choices_count,
  
  COUNT(*) FILTER (WHERE production_status = 'on_hold') AS blocked_items_count,
  
  -- Scheduled items
  COUNT(*) FILTER (
    WHERE scheduled_production_date IS NOT NULL 
    AND scheduled_production_date::date = CURRENT_DATE
  ) AS scheduled_today_count,
  
  COUNT(*) FILTER (
    WHERE scheduled_production_date IS NOT NULL 
    AND scheduled_production_date >= CURRENT_DATE 
    AND scheduled_production_date < CURRENT_DATE + INTERVAL '7 days'
  ) AS scheduled_this_week_count,
  
  -- Performance metrics
  AVG(EXTRACT(EPOCH FROM (production_completed_at - production_started_at)) / 3600) 
    FILTER (WHERE production_completed_at IS NOT NULL AND production_started_at IS NOT NULL) 
    AS avg_production_time_hours,
  
  -- Last updated
  now() AS last_refreshed

FROM production_queue;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX ON production_dashboard_summary ((1));

COMMENT ON MATERIALIZED VIEW production_dashboard_summary IS 
  'Materialized view with dashboard summary statistics, refreshed periodically for performance';

-- =====================================================
-- 7. CREATE FUNCTION TO REFRESH MATERIALIZED VIEW
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_production_dashboard_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY production_dashboard_summary;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_production_dashboard_summary IS 
  'Refreshes the production_dashboard_summary materialized view concurrently';

-- =====================================================
-- 8. GRANT PERMISSIONS ON VIEWS
-- =====================================================

-- Grant SELECT on views to authenticated users (via RLS on underlying tables)
GRANT SELECT ON production_queue_with_details TO authenticated;
GRANT SELECT ON pending_choices_with_countdown TO authenticated;
GRANT SELECT ON production_metrics TO authenticated;
GRANT SELECT ON urgent_production_items TO authenticated;
GRANT SELECT ON production_dashboard_summary TO authenticated;

-- Grant all to service role
GRANT ALL ON production_queue_with_details TO service_role;
GRANT ALL ON pending_choices_with_countdown TO service_role;
GRANT ALL ON production_metrics TO service_role;
GRANT ALL ON urgent_production_items TO service_role;
GRANT ALL ON production_dashboard_summary TO service_role;

-- =====================================================
-- 9. VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if views were created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'production_queue_with_details'
  ) THEN
    RAISE EXCEPTION 'View production_queue_with_details was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'pending_choices_with_countdown'
  ) THEN
    RAISE EXCEPTION 'View pending_choices_with_countdown was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'production_metrics'
  ) THEN
    RAISE EXCEPTION 'View production_metrics was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'urgent_production_items'
  ) THEN
    RAISE EXCEPTION 'View urgent_production_items was not created';
  END IF;
  
  -- Check if materialized view was created
  IF NOT EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' 
    AND matviewname = 'production_dashboard_summary'
  ) THEN
    RAISE EXCEPTION 'Materialized view production_dashboard_summary was not created';
  END IF;
  
  RAISE NOTICE 'Migration 20260428000003_create_production_views.sql completed successfully';
END $$;

-- =====================================================
-- 10. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260428000003_create_production_views.sql' AS migration_file,
  'Create optimized database views for production dashboard queries' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE 'production%' OR table_name LIKE '%choices%') AS views_created,
  (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public' AND matviewname LIKE 'production%') AS materialized_views_created;
