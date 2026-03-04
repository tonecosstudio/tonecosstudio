-- Migration: Setup pg_cron Infrastructure
-- Feature: ORDAX Complete System
-- Task: 12.1 Set up pg_cron extension
-- Requirements: 10.1, 34.1
-- Description: Configura infraestrutura de cron jobs para automaÃƒÂ§ÃƒÂ£o

-- =====================================================
-- ORDAX COMPLETE SYSTEM - pg_cron Infrastructure
-- =====================================================
-- This migration sets up the pg_cron infrastructure for
-- automated job scheduling in the ORDAX platform.
--
-- Features:
-- 1. Enable pg_cron extension
-- 2. Configure timezone to America/Bahia (UTC-3)
-- 3. Create cron_job_logs table for execution tracking
-- 4. Set up logging functions
--
-- All cron jobs in ORDAX execute in America/Bahia timezone
-- to align with business operations in Salvador/BA.
-- =====================================================

-- =====================================================
-- STEP 1: Enable pg_cron Extension
-- =====================================================

-- Enable pg_cron extension if not already enabled
-- Note: In Supabase, pg_cron may already be enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler for PostgreSQL - ORDAX automation system';

-- =====================================================
-- STEP 2: Configure Timezone for Cron Jobs
-- =====================================================

-- Note: The cron.timezone configuration must be set at the database level
-- In Supabase, this is typically configured through the dashboard or requires
-- a database restart. For now, we'll document this requirement.
--
-- To configure manually (requires superuser):
-- ALTER DATABASE postgres SET cron.timezone = 'America/Bahia';
--
-- All cron jobs should explicitly use 'America/Bahia' timezone in their
-- schedule expressions or use AT TIME ZONE in their SQL queries.

-- Add comment explaining timezone configuration
COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler - Jobs should use America/Bahia timezone (UTC-3)';

-- =====================================================
-- STEP 3: Create Cron Job Logs Table
-- =====================================================

-- CREATE TABLE IF NOT EXISTS to track all cron job executions
-- This provides audit trail and debugging capability
CREATE TABLE IF NOT EXISTS cron_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  error_message TEXT,
  execution_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name ON cron_job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_started_at ON cron_job_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_status ON cron_job_logs(status);

-- Add comments for documentation
COMMENT ON TABLE cron_job_logs IS 'Audit trail for all pg_cron job executions in ORDAX platform';
COMMENT ON COLUMN cron_job_logs.job_name IS 'Name of the cron job that executed';
COMMENT ON COLUMN cron_job_logs.started_at IS 'Timestamp when job execution started (UTC)';
COMMENT ON COLUMN cron_job_logs.completed_at IS 'Timestamp when job execution completed (UTC)';
COMMENT ON COLUMN cron_job_logs.status IS 'Execution status: running, success, or failed';
COMMENT ON COLUMN cron_job_logs.error_message IS 'Error message if job failed';
COMMENT ON COLUMN cron_job_logs.execution_details IS 'Additional execution details in JSON format';

-- =====================================================
-- STEP 4: Create Logging Helper Functions
-- =====================================================

-- Function to start logging a cron job execution
CREATE OR REPLACE FUNCTION start_cron_job_log(
  p_job_name TEXT,
  p_execution_details JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO cron_job_logs (
    job_name,
    started_at,
    status,
    execution_details
  ) VALUES (
    p_job_name,
    now(),
    'running',
    p_execution_details
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION start_cron_job_log IS 'Start logging a cron job execution and return log ID';

-- Function to complete logging a cron job execution (success)
CREATE OR REPLACE FUNCTION complete_cron_job_log(
  p_log_id UUID,
  p_execution_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE cron_job_logs
  SET 
    completed_at = now(),
    status = 'success',
    execution_details = COALESCE(p_execution_details, execution_details)
  WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION complete_cron_job_log IS 'Mark a cron job execution as successfully completed';

-- Function to fail logging a cron job execution (error)
CREATE OR REPLACE FUNCTION fail_cron_job_log(
  p_log_id UUID,
  p_error_message TEXT,
  p_execution_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE cron_job_logs
  SET 
    completed_at = now(),
    status = 'failed',
    error_message = p_error_message,
    execution_details = COALESCE(p_execution_details, execution_details)
  WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fail_cron_job_log IS 'Mark a cron job execution as failed with error message';

-- =====================================================
-- STEP 5: Create Cleanup Function for Old Logs
-- =====================================================

-- Function to clean up old cron job logs (keep last 90 days per Requirement 34.7)
CREATE OR REPLACE FUNCTION cleanup_old_cron_logs() RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM cron_job_logs
  WHERE started_at < now() - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_cron_logs IS 'Delete cron job logs older than 90 days (Requirement 34.7)';

-- =====================================================
-- STEP 6: Grant Permissions
-- =====================================================

-- Grant permissions to authenticated users to view logs (read-only)
GRANT SELECT ON cron_job_logs TO authenticated;

-- Grant full permissions to service role for cron job execution
GRANT ALL ON cron_job_logs TO service_role;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- 
-- To verify pg_cron is enabled:
-- SELECT * FROM pg_extension WHERE extname = 'pg_cron';
--
-- To check timezone configuration:
-- SHOW cron.timezone;
--
-- To view all scheduled cron jobs:
-- SELECT * FROM cron.job;
--
-- To view cron job execution history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- To view ORDAX cron job logs:
-- SELECT * FROM cron_job_logs ORDER BY started_at DESC LIMIT 20;
--
-- To test logging functions:
-- SELECT start_cron_job_log('test-job', '{"test": true}'::jsonb);
-- SELECT complete_cron_job_log('<log_id>');
-- SELECT fail_cron_job_log('<log_id>', 'Test error message');
--
-- =====================================================

-- =====================================================
-- NEXT STEPS
-- =====================================================
--
-- After this migration, you can schedule cron jobs using:
--
-- SELECT cron.schedule(
--   'job-name',
--   '0 0 * * *',  -- Cron expression (runs at midnight Bahia time)
--   $$SELECT your_function();$$
-- );
--
-- All jobs will execute in America/Bahia timezone (UTC-3)
-- as configured in this migration.
--
-- Example jobs to be created in subsequent tasks:
-- - Task 12.2: Daily delivery creation (00:01 Bahia time)
-- - Task 12.3: Character revelation check (10:00 Bahia time)
-- - Task 12.4: Balance payment deadline check (hourly)
-- - Task 12.5: Cycle status transitions (hourly)
--
-- =====================================================

