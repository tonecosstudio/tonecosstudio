-- Ensure the existing Tonecos commercial status contracts are available before
-- the additive TONART schema migration uses them. Keep enum changes isolated in
-- this migration so newly added labels are committed before any later DDL or
-- functions reference them.
DO $types$
BEGIN
  IF to_regtype('public.collection_status') IS NULL THEN
    CREATE TYPE public.collection_status AS ENUM ('draft', 'active', 'inactive', 'archived');
  END IF;
  IF to_regtype('public.cycle_status') IS NULL THEN
    CREATE TYPE public.cycle_status AS ENUM (
      'sales', 'production', 'shipping', 'completed', 'cancelled', 'active', 'open'
    );
  END IF;
  IF to_regtype('public.payment_status') IS NULL THEN
    CREATE TYPE public.payment_status AS ENUM (
      'pending', 'paid', 'failed', 'refunded', 'under_review', 'requires_info',
      'approved', 'rejected', 'deposit_paid', 'fully_paid'
    );
  END IF;
  IF to_regtype('public.purchase_status') IS NULL THEN
    CREATE TYPE public.purchase_status AS ENUM (
      'pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled',
      'deposit_paid', 'awaiting_balance', 'balance_paid', 'awaiting_deposit',
      'completed', 'scheduled', 'pending_choice', 'revealed', 'pending_production',
      'processing', 'in_transit'
    );
  END IF;
  IF to_regtype('public.subscription_status') IS NULL THEN
    CREATE TYPE public.subscription_status AS ENUM (
      'active', 'cancelled', 'suspended', 'expired', 'pending_payment'
    );
  END IF;
END;
$types$;

-- Some connected TONART schemas have the types but lack later Tonecos labels.
-- These values are not used until the next migration, after this file commits.
ALTER TYPE public.collection_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE public.collection_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE public.collection_status ADD VALUE IF NOT EXISTS 'inactive';
ALTER TYPE public.collection_status ADD VALUE IF NOT EXISTS 'archived';
ALTER TYPE public.cycle_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE public.cycle_status ADD VALUE IF NOT EXISTS 'open';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'requires_info';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'deposit_paid';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'fully_paid';
ALTER TYPE public.purchase_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE public.purchase_status ADD VALUE IF NOT EXISTS 'pending_choice';
ALTER TYPE public.purchase_status ADD VALUE IF NOT EXISTS 'revealed';
ALTER TYPE public.purchase_status ADD VALUE IF NOT EXISTS 'pending_production';
ALTER TYPE public.purchase_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE public.purchase_status ADD VALUE IF NOT EXISTS 'in_transit';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'pending_payment';
