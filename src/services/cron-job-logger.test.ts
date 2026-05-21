/**
 * Unit tests for cron job logging infrastructure
 * Task 12.1: Set up pg_cron extension
 * Requirements: 10.1, 34.1
 */

import { describe, it, expect, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Cron Job Logging Infrastructure', () => {
  describe('Database Setup', () => {
    it('should have pg_cron extension enabled', async () => {
      const { data, error } = await supabase
        .rpc('pg_extension_exists', { extension_name: 'pg_cron' })
        .single();

      // If the function doesn't exist, check directly
      if (error) {
        const { data: extensions } = await supabase
          .from('pg_extension')
          .select('extname')
          .eq('extname', 'pg_cron')
          .single();

        expect(extensions).toBeTruthy();
      } else {
        expect(data).toBe(true);
      }
    });

    it('should have cron_job_logs table', async () => {
      const { data, error } = await supabase
        .from('cron_job_logs')
        .select('id')
        .limit(0);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have required columns in cron_job_logs', async () => {
      const { data, error } = await supabase
        .from('cron_job_logs')
        .select('id, job_name, started_at, completed_at, status, error_message, execution_details, created_at')
        .limit(0);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Logging Functions', () => {
    let testLogId: string;

    afterAll(async () => {
      // Clean up test logs
      await supabase
        .from('cron_job_logs')
        .delete()
        .like('job_name', 'test-%');
    });

    it('should start a cron job log', async () => {
      const { data, error } = await supabase
        .rpc('start_cron_job_log', {
          p_job_name: 'test-job-start',
          p_execution_details: { test: true }
        });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(typeof data).toBe('string');

      testLogId = data as string;

      // Verify the log was created
      const { data: log } = await supabase
        .from('cron_job_logs')
        .select('*')
        .eq('id', testLogId)
        .single();

      expect(log).toBeTruthy();
      expect(log?.job_name).toBe('test-job-start');
      expect(log?.status).toBe('running');
      expect(log?.execution_details).toEqual({ test: true });
    });

    it('should complete a cron job log', async () => {
      // Start a new log
      const { data: logId } = await supabase
        .rpc('start_cron_job_log', {
          p_job_name: 'test-job-complete',
          p_execution_details: { test: true }
        });

      expect(logId).toBeTruthy();

      // Complete the log
      const { error } = await supabase
        .rpc('complete_cron_job_log', {
          p_log_id: logId,
          p_execution_details: { result: 'success' }
        });

      expect(error).toBeNull();

      // Verify the log was completed
      const { data: log } = await supabase
        .from('cron_job_logs')
        .select('*')
        .eq('id', logId)
        .single();

      expect(log).toBeTruthy();
      expect(log?.status).toBe('success');
      expect(log?.completed_at).toBeTruthy();
      expect(log?.execution_details).toEqual({ result: 'success' });
    });

    it('should fail a cron job log', async () => {
      // Start a new log
      const { data: logId } = await supabase
        .rpc('start_cron_job_log', {
          p_job_name: 'test-job-fail',
          p_execution_details: { test: true }
        });

      expect(logId).toBeTruthy();

      // Fail the log
      const { error } = await supabase
        .rpc('fail_cron_job_log', {
          p_log_id: logId,
          p_error_message: 'Test error message',
          p_execution_details: { error: 'test' }
        });

      expect(error).toBeNull();

      // Verify the log was failed
      const { data: log } = await supabase
        .from('cron_job_logs')
        .select('*')
        .eq('id', logId)
        .single();

      expect(log).toBeTruthy();
      expect(log?.status).toBe('failed');
      expect(log?.completed_at).toBeTruthy();
      expect(log?.error_message).toBe('Test error message');
      expect(log?.execution_details).toEqual({ error: 'test' });
    });
  });

  describe('Cleanup Function', () => {
    it('should have cleanup_old_cron_logs function', async () => {
      const { data, error } = await supabase
        .rpc('cleanup_old_cron_logs');

      // Function should exist and return a number (count of deleted rows)
      expect(error).toBeNull();
      expect(typeof data).toBe('number');
    });
  });

  describe('Indexes', () => {
    it('should have index on job_name', async () => {
      const { data, error } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('tablename', 'cron_job_logs')
        .eq('indexname', 'idx_cron_job_logs_job_name')
        .single();

      // If pg_indexes is not accessible, skip this test
      if (error?.code === '42501') {
        console.log('Skipping index test - insufficient permissions');
        return;
      }

      expect(data).toBeTruthy();
    });
  });

  describe('Permissions', () => {
    it('should allow authenticated users to read logs', async () => {
      const { data, error } = await supabase
        .from('cron_job_logs')
        .select('*')
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Status Constraint', () => {
    it('should only allow valid status values', async () => {
      // Try to insert a log with invalid status directly
      const { error } = await supabase
        .from('cron_job_logs')
        .insert({
          job_name: 'test-invalid-status',
          status: 'invalid_status' as any,
          started_at: new Date().toISOString()
        });

      // Should fail due to CHECK constraint
      expect(error).toBeTruthy();
      expect(error?.message).toContain('violates check constraint');
    });
  });
});
