# Apply Production Status Sync Migration

This document explains how to apply the production status sync migration to your Supabase database.

## Migration File

`20260429000003_sync_production_status_to_orders.sql`

## What This Migration Does

This migration creates a trigger that automatically syncs production status updates from the `production_queue` table to the original order tables (`subscription_deliveries` and `standalone_purchases`).

### Sync Behavior

1. **When `current_stage` changes to 'shipped':**
   - Updates order `status` to 'shipped'
   - Syncs `tracking_code` from `production_notes`
   - For standalone_purchases: Sets `shipped_at` timestamp

2. **When `production_status` becomes 'completed':**
   - Updates order `status` to 'delivered'
   - For subscription_deliveries: Sets `actual_delivery_date`
   - For standalone_purchases: Sets `delivered_at` timestamp

3. **When `estimated_completion_date` changes:**
   - Updates `expected_delivery_date` in subscription_deliveries

4. **When `production_notes` changes (tracking code):**
   - Syncs `tracking_code` to the order

## How to Apply

### Option 1: Using Supabase CLI (Recommended)

If you have Docker running and Supabase CLI configured:

```bash
npx supabase db push
```

### Option 2: Using Supabase Dashboard (Manual)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `supabase/migrations/20260429000003_sync_production_status_to_orders.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run**

### Option 3: Using psql (Direct Connection)

If you have direct database access:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f supabase/migrations/20260429000003_sync_production_status_to_orders.sql
```

## Testing

After applying the migration, you can run the test file to verify it works:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f supabase/migrations/20260429000003_sync_production_status_to_orders.test.sql
```

Or copy the test SQL into the Supabase SQL Editor and run it.

## Verification

To verify the migration was applied successfully, run this query in the SQL Editor:

```sql
-- Check if function exists
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'sync_production_status_to_orders';

-- Check if trigger exists
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger 
WHERE tgname = 'trigger_sync_production_status_to_orders';
```

Expected results:
- Function `sync_production_status_to_orders` should exist
- Trigger `trigger_sync_production_status_to_orders` should exist on `production_queue` table
- Trigger should be enabled

## Rollback

If you need to rollback this migration:

```sql
-- Drop the trigger
DROP TRIGGER IF EXISTS trigger_sync_production_status_to_orders ON production_queue;

-- Drop the function
DROP FUNCTION IF EXISTS sync_production_status_to_orders();
```

## Impact

- **Performance**: Minimal - trigger only fires on UPDATE of specific columns
- **Breaking Changes**: None - this is additive functionality
- **Dependencies**: Requires `production_queue`, `subscription_deliveries`, and `standalone_purchases` tables to exist

## Support

If you encounter any issues:
1. Check the Supabase logs for error messages
2. Verify all required tables exist
3. Ensure you have proper permissions (service_role or admin)
4. Review the test file for examples of expected behavior
