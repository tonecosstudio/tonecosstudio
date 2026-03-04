# Production Management System - Migration Checklist

## Pre-Migration Checklist

### 1. Environment Preparation
- [ ] Verify you have admin access to Supabase project
- [ ] Confirm database connection credentials are correct
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Link to Supabase project: `supabase link --project-ref YOUR_PROJECT_REF`
- [ ] Test database connection: `supabase db diff`

### 2. Backup
- [ ] Create database backup: `supabase db dump -f backup-$(date +%Y%m%d-%H%M%S).sql`
- [ ] Verify backup file was created successfully
- [ ] Store backup in secure location
- [ ] Document backup file name and location

### 3. Migration Files Review
- [ ] Verify all 16 migration files exist in `supabase/migrations/`
- [ ] Review each migration file for syntax errors
- [ ] Check for any environment-specific configurations
- [ ] Confirm migration order is correct

## Migration Application Checklist

### Core Tables (Phase 1)
- [ ] **20260428000000_create_production_queue.sql**
  - Creates `production_queue` table
  - Adds indexes for performance
  - Sets up RLS policies
  - Verify: `SELECT COUNT(*) FROM production_queue;`

- [ ] **20260428000001_create_character_choices.sql**
  - Creates `character_choices` table
  - Adds deadline tracking fields
  - Sets up RLS policies
  - Verify: `SELECT COUNT(*) FROM character_choices;`

- [ ] **20260428000002_create_production_stages.sql**
  - Creates `production_stages` table
  - Adds stage tracking fields
  - Sets up RLS policies
  - Verify: `SELECT COUNT(*) FROM production_stages;`

### Views and Functions (Phase 2)
- [ ] **20260428000003_create_production_views.sql**
  - Creates database views for complex queries
  - Verify: `SELECT * FROM pg_views WHERE viewname LIKE '%production%';`

- [ ] **20260428000004_create_production_functions.sql**
  - Creates helper functions
  - Verify: `SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%production%';`

- [ ] **20260428000005_add_manual_payment_support.sql**
  - Adds manual payment integration
  - Verify: Check if manual_payments are included in production_queue

### Automation (Phase 3)
- [ ] **20260429000000_schedule_character_choice_reminders_cron.sql**
  - Schedules reminder cron job
  - Verify: `SELECT * FROM cron.job WHERE jobname = 'send_character_choice_reminders';`

- [ ] **20260429000001_schedule_character_choice_expiration_cron.sql**
  - Schedules expiration cron job
  - Verify: `SELECT * FROM cron.job WHERE jobname = 'expire_character_choices';`

- [ ] **20260429000002_add_expired_status_to_character_choices.sql**
  - Adds expired status support
  - Verify: Check character_choices table has expired status

### Synchronization (Phase 4)
- [ ] **20260429000003_sync_production_status_to_orders.sql**
  - Creates sync trigger
  - Verify: `SELECT * FROM pg_trigger WHERE tgname LIKE '%sync%';`

- [ ] **20260429000005_create_stage_transition_logs.sql**
  - Creates audit log table
  - Verify: `SELECT COUNT(*) FROM stage_transition_logs;`

- [ ] **20260429000006_create_production_assignment_logs.sql**
  - Creates assignment log table
  - Verify: `SELECT COUNT(*) FROM production_assignment_logs;`

### Photo Management (Phase 5)
- [ ] **20260429000007_add_production_photo_metadata.sql**
  - Creates photo metadata table
  - Verify: `SELECT COUNT(*) FROM production_photo_metadata;`

### Notifications (Phase 6)
- [ ] **20260429000008_add_notification_preferences.sql**
  - Adds notification preferences
  - Verify: Check notification_preferences table exists

### Business Logic (Phase 7)
- [ ] **20260505000000_create_deadline_calculation_function.sql**
  - Creates deadline calculation function
  - Verify: `SELECT calculate_character_choice_deadline('2024-01-01'::date);`

- [ ] **20260506000000_add_denormalized_fields_to_character_choices.sql**
  - Adds performance optimization fields
  - Verify: Check character_choices table has denormalized fields

## Post-Migration Verification

### Database Structure
- [ ] All tables created: `SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%production%' OR table_name LIKE '%character%';`
- [ ] All indexes created: `SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('production_queue', 'character_choices', 'production_stages');`
- [ ] All triggers created: `SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname LIKE '%production%' OR tgname LIKE '%character%';`
- [ ] All functions created: `SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%production%' OR routine_name LIKE '%character%';`

### RLS Policies
- [ ] production_queue has RLS enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'production_queue';`
- [ ] character_choices has RLS enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'character_choices';`
- [ ] production_stages has RLS enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'production_stages';`
- [ ] All policies created: `SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('production_queue', 'character_choices', 'production_stages');`

### Cron Jobs
- [ ] Character choice reminders scheduled: `SELECT * FROM cron.job WHERE jobname = 'send_character_choice_reminders';`
- [ ] Character choice expiration scheduled: `SELECT * FROM cron.job WHERE jobname = 'expire_character_choices';`
- [ ] Both cron jobs are active: `SELECT jobname, active FROM cron.job WHERE jobname LIKE '%character_choice%';`

### Data Integrity
- [ ] Foreign key constraints working: Try inserting invalid data and verify it's rejected
- [ ] Triggers firing correctly: Create a test order and verify production_queue is populated
- [ ] Sync working: Update production status and verify it syncs to orders
- [ ] Deadline calculation working: Test with sample dates

### Performance
- [ ] Query performance acceptable: Run sample queries and check execution time
- [ ] Indexes being used: `EXPLAIN ANALYZE SELECT * FROM production_queue ORDER BY priority_score DESC LIMIT 50;`
- [ ] No table scans on large queries: Check EXPLAIN output for "Seq Scan"

## Rollback Plan

If migration fails or issues are discovered:

### Immediate Rollback
1. [ ] Stop all cron jobs: `SELECT cron.unschedule('send_character_choice_reminders'); SELECT cron.unschedule('expire_character_choices');`
2. [ ] Restore from backup: `pg_restore -h HOST -U postgres -d postgres -c backup-YYYYMMDD-HHMMSS.dump`
3. [ ] Verify rollback: Check that production tables are removed
4. [ ] Document issues encountered

### Partial Rollback (if only specific migrations failed)
1. [ ] Identify failed migration
2. [ ] Drop objects created by that migration
3. [ ] Fix migration file
4. [ ] Re-apply from that point forward

## Sign-Off

### Staging Environment
- [ ] All migrations applied successfully
- [ ] All verification checks passed
- [ ] Performance tests completed
- [ ] Integration tests passed
- [ ] Signed off by: _________________ Date: _________

### Production Environment
- [ ] All migrations applied successfully
- [ ] All verification checks passed
- [ ] Performance tests completed
- [ ] Integration tests passed
- [ ] Rollback plan tested
- [ ] Signed off by: _________________ Date: _________

## Notes

Use this section to document any issues, warnings, or special considerations:

```
Date: ___________
Issue: ___________
Resolution: ___________
```

## Quick Commands Reference

```bash
# Link to Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Create backup
supabase db dump -f backup-$(date +%Y%m%d-%H%M%S).sql

# Apply all migrations
supabase db push

# Apply specific migration
supabase db push --include 20260428000000_create_production_queue.sql

# Check migration status
supabase db diff

# Run verification script
supabase db execute -f .kiro/specs/production-management-system/scripts/review-migrations.sql

# View cron jobs
supabase db execute -c "SELECT * FROM cron.job;"

# Manually trigger cron job (for testing)
supabase db execute -c "SELECT send_character_choice_reminders();"
```
