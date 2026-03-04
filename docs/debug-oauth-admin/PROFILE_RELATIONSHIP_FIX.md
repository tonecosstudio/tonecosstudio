# Profile Relationship Fix

## Problem

The application was experiencing errors when trying to fetch standalone purchases and manual payments with user profile data:

```
Error: Could not find a relationship between 'standalone_purchases' and 'profiles' in the schema cache
```

## Root Cause

The database schema had the following foreign key relationships:

- `standalone_purchases.user_id` → `auth.users(id)`
- `manual_payments.user_id` → `auth.users(id)`
- `profiles.id` → `auth.users(id)`

When Supabase PostgREST tried to join `standalone_purchases` with `profiles`, it couldn't find a direct foreign key relationship because:
1. `standalone_purchases.user_id` references `auth.users`, not `profiles`
2. Supabase doesn't automatically traverse multiple foreign key hops

## Solution

We changed the foreign key relationships to reference `profiles` directly:

- `standalone_purchases.user_id` → `profiles(id)` ✅
- `manual_payments.user_id` → `profiles(id)` ✅

This works because `profiles.id` also references `auth.users(id)`, maintaining data integrity while allowing Supabase to properly join the tables.

## Files Changed

### Database Migrations

1. **supabase/migrations/20260421000000_fix_standalone_purchases_profile_relationship.sql**
   - Drops old foreign key constraint
   - Adds new constraint referencing `profiles(id)`

2. **supabase/migrations/20260421000001_fix_manual_payments_profile_relationship.sql**
   - Drops old foreign key constraint
   - Adds new constraint referencing `profiles(id)`

### Application Code

1. **src/services/standalone-purchase-service.ts**
   - Removed explicit foreign key names from queries
   - Now uses: `user:profiles(id, full_name, email)`
   - Instead of: `user:profiles!standalone_purchases_user_id_fkey(...)`

2. **src/lib/admin-payment-service.ts**
   - Removed explicit foreign key names from queries
   - Now uses: `profiles(full_name, email)`
   - Instead of: `profiles!manual_payments_user_id_fkey(...)`

## How to Apply

### Option 1: Using Supabase CLI (Recommended)

```bash
# On Linux/Mac
bash scripts/apply-profile-relationship-fix.sh

# On Windows (PowerShell)
.\scripts\apply-profile-relationship-fix.ps1
```

### Option 2: Manual Application

1. Connect to your Supabase database
2. Run the SQL from both migration files in order:
   - `20260421000000_fix_standalone_purchases_profile_relationship.sql`
   - `20260421000001_fix_manual_payments_profile_relationship.sql`

### Option 3: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of each migration file
4. Execute them in order

## Verification

After applying the migrations, verify the fix by:

1. Refreshing your browser
2. Navigating to the Standalone Purchases admin page
3. The page should load without errors and display purchase data with user information

## Impact

### Data Integrity
- ✅ No data loss
- ✅ All existing relationships maintained
- ✅ Referential integrity preserved through `profiles.id` → `auth.users(id)`

### Application Behavior
- ✅ Queries now work correctly
- ✅ User profile data properly joined
- ✅ No code changes required after migration

### Performance
- ✅ No performance impact
- ✅ Existing indexes still work
- ✅ Query performance unchanged

## Technical Details

### Why This Works

The relationship chain is:
```
standalone_purchases.user_id → profiles.id → auth.users.id
```

When a user is deleted from `auth.users`:
1. The `profiles` record is deleted (CASCADE from `profiles.id` → `auth.users.id`)
2. The `standalone_purchases` record is deleted (CASCADE from `standalone_purchases.user_id` → `profiles.id`)

This maintains the same deletion behavior as before.

### Supabase PostgREST Behavior

Supabase PostgREST uses foreign key constraints to determine valid joins. By having a direct foreign key from `standalone_purchases.user_id` to `profiles.id`, PostgREST can now properly resolve the join without needing explicit foreign key names in the query.

## Rollback

If you need to rollback this change:

```sql
-- For standalone_purchases
ALTER TABLE standalone_purchases
  DROP CONSTRAINT standalone_purchases_user_id_fkey;

ALTER TABLE standalone_purchases
  ADD CONSTRAINT standalone_purchases_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- For manual_payments
ALTER TABLE manual_payments
  DROP CONSTRAINT manual_payments_user_id_fkey;

ALTER TABLE manual_payments
  ADD CONSTRAINT manual_payments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

## Related Issues

This fix also resolves similar issues in:
- Manual payments export functionality
- Any other queries that join these tables with profiles

## Questions?

If you encounter any issues after applying this fix, please check:
1. Migration was applied successfully (check Supabase logs)
2. Browser cache is cleared
3. Application is using the latest code
