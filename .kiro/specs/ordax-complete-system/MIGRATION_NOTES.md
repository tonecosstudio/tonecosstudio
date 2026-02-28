# Migration Notes for Task 25.6

## Database Migration Required

The following migration needs to be applied to the database:

**File:** `supabase/migrations/20260420000000_add_rejection_reason_fields.sql`

**Purpose:** Adds rejection_reason fields to standalone_purchases and subscriptions tables to store admin rejection reasons for payment vouchers.

**Changes:**
- Adds `deposit_rejection_reason` column to `standalone_purchases` table
- Adds `balance_rejection_reason` column to `standalone_purchases` table  
- Adds `payment_rejection_reason` column to `subscriptions` table

## Manual Migration Steps

If automatic migration fails, run the following SQL directly in Supabase SQL Editor:

```sql
-- Add rejection_reason fields to standalone_purchases
ALTER TABLE standalone_purchases
  ADD COLUMN IF NOT EXISTS deposit_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS balance_rejection_reason TEXT;

-- Add rejection_reason field to subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT;

-- Add comments
COMMENT ON COLUMN standalone_purchases.deposit_rejection_reason IS 
  'Reason provided by admin when deposit payment voucher is rejected. Cleared when new voucher is uploaded.';

COMMENT ON COLUMN standalone_purchases.balance_rejection_reason IS 
  'Reason provided by admin when balance payment voucher is rejected. Cleared when new voucher is uploaded.';

COMMENT ON COLUMN subscriptions.payment_rejection_reason IS 
  'Reason provided by admin when payment voucher is rejected. Cleared when new voucher is uploaded.';
```

## Verification

After applying the migration, verify the columns exist:

```sql
-- Check standalone_purchases columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'standalone_purchases' 
AND column_name LIKE '%rejection%';

-- Check subscriptions columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
AND column_name LIKE '%rejection%';
```

## Code Changes Completed

1. ✅ Created migration file: `supabase/migrations/20260420000000_add_rejection_reason_fields.sql`
2. ✅ Updated `supabase/functions/admin-verify-payment/index.ts` to store rejection reasons
3. ✅ Updated `src/types/database.ts` to include new fields in TypeScript types
4. ✅ Created `src/components/VoucherRejectionAlert.tsx` component
5. ✅ Updated `src/pages/PayStandaloneBalance.tsx` to show rejection alerts
6. ✅ Created `src/pages/ReuploadSubscriptionVoucher.tsx` for subscription voucher re-uploads

## Testing Checklist

- [ ] Apply database migration
- [ ] Test standalone purchase deposit voucher rejection and re-upload
- [ ] Test standalone purchase balance voucher rejection and re-upload
- [ ] Test subscription payment voucher rejection and re-upload
- [ ] Verify rejection reasons are displayed correctly
- [ ] Verify rejection reasons are cleared when new voucher is uploaded
- [ ] Verify admin notifications are sent
- [ ] Verify payment status updates correctly
