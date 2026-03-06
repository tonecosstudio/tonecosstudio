-- Migration: Integrate Subscription Credit System with Coins
-- Purpose: Add credit-based subscription system that integrates with existing coins system
-- Date: 2026-03-06

-- ============================================================================
-- 1. ADD CREDIT FIELDS TO SUBSCRIPTION PLANS
-- ============================================================================

-- Add credit fields to subscription_plans table
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS total_credits INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_credits INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_credits INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_expiry_days INTEGER,
ADD COLUMN IF NOT EXISTS is_credit_based BOOLEAN NOT NULL DEFAULT false;

-- Comments for new columns
COMMENT ON COLUMN subscription_plans.total_credits IS 'Total credits for the entire plan duration';
COMMENT ON COLUMN subscription_plans.monthly_credits IS 'Credits received per month (for monthly distribution)';
COMMENT ON COLUMN subscription_plans.bonus_credits IS 'Bonus credits for semestral/annual plans';
COMMENT ON COLUMN subscription_plans.credit_expiry_days IS 'Days after which unused credits expire (NULL = never expire)';
COMMENT ON COLUMN subscription_plans.is_credit_based IS 'Whether this plan uses credit system (true) or old delivery system (false)';

-- Update existing plans with credit values
UPDATE subscription_plans 
SET 
  total_credits = CASE 
    WHEN plan_type = 'trimestral' THEN 600
    WHEN plan_type = 'semestral' THEN 1200
    WHEN plan_type = 'anual' THEN 2400
    ELSE 0
  END,
  monthly_credits = CASE 
    WHEN plan_type = 'trimestral' THEN 200  -- 600 / 3 months
    WHEN plan_type = 'semestral' THEN 200   -- 1200 / 6 months
    WHEN plan_type = 'anual' THEN 200       -- 2400 / 12 months
    ELSE 0
  END,
  bonus_credits = CASE 
    WHEN plan_type = 'semestral' THEN 200
    WHEN plan_type = 'anual' THEN 400
    ELSE 0
  END,
  credit_expiry_days = 30, -- Credits expire 30 days after subscription ends
  is_credit_based = true
WHERE is_active = true;

-- ============================================================================
-- 2. ADD SUBSCRIPTION CREDIT FIELDS TO SUBSCRIPTIONS TABLE
-- ============================================================================

-- Add credit fields to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS credits_total INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_available INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_expiry_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_credit_distribution_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_credit_distribution_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_credit_based BOOLEAN NOT NULL DEFAULT false;

-- Comments for new columns
COMMENT ON COLUMN subscriptions.credits_total IS 'Total credits allocated for this subscription';
COMMENT ON COLUMN subscriptions.credits_used IS 'Credits already used/spent';
COMMENT ON COLUMN subscriptions.credits_available IS 'Available credits (total - used)';
COMMENT ON COLUMN subscriptions.credits_expiry_date IS 'Date when unused credits expire';
COMMENT ON COLUMN subscriptions.last_credit_distribution_date IS 'Last date credits were distributed';
COMMENT ON COLUMN subscriptions.next_credit_distribution_date IS 'Next date credits will be distributed';
COMMENT ON COLUMN subscriptions.is_credit_based IS 'Whether this subscription uses credit system';

-- Add constraint to ensure credits_available = credits_total - credits_used
ALTER TABLE subscriptions 
ADD CONSTRAINT check_credits_available 
CHECK (credits_available = credits_total - credits_used);

-- ============================================================================
-- 3. CREATE FUNCTION TO ADD CREDITS FROM SUBSCRIPTION PAYMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION add_subscription_credits_to_user(
  p_subscription_id UUID,
  p_payment_amount DECIMAL(10,2),
  p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_plan_type TEXT;
  v_total_credits INTEGER;
  v_bonus_credits INTEGER;
  v_credits_to_add INTEGER;
  v_result JSONB;
BEGIN
  -- Get subscription details
  SELECT s.user_id, sp.plan_type, sp.total_credits, sp.bonus_credits
  INTO v_user_id, v_plan_type, v_total_credits, v_bonus_credits
  FROM subscriptions s
  JOIN subscription_plans sp ON s.plan_type = sp.plan_type
  WHERE s.id = p_subscription_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Subscription not found'
    );
  END IF;
  
  -- Calculate total credits to add
  v_credits_to_add := v_total_credits + v_bonus_credits;
  
  -- Add credits to user's coin balance
  PERFORM add_coins_to_user(
    v_user_id,
    v_credits_to_add,
    'subscription_credit',
    p_subscription_id,
    'subscription',
    jsonb_build_object(
      'plan_type', v_plan_type,
      'payment_amount', p_payment_amount,
      'payment_method', p_payment_method,
      'total_credits', v_total_credits,
      'bonus_credits', v_bonus_credits
    )
  );
  
  -- Update subscription with credit information
  UPDATE subscriptions
  SET 
    credits_total = v_total_credits,
    credits_available = v_total_credits,
    credits_expiry_date = CASE 
      WHEN (SELECT credit_expiry_days FROM subscription_plans WHERE plan_type = v_plan_type) IS NOT NULL 
      THEN now() + (SELECT credit_expiry_days FROM subscription_plans WHERE plan_type = v_plan_type) * INTERVAL '1 day'
      ELSE NULL
    END,
    last_credit_distribution_date = now(),
    next_credit_distribution_date = CASE 
      WHEN v_plan_type = 'trimestral' THEN now() + INTERVAL '3 months'
      WHEN v_plan_type = 'semestral' THEN now() + INTERVAL '6 months'
      WHEN v_plan_type = 'anual' THEN now() + INTERVAL '12 months'
      ELSE NULL
    END,
    is_credit_based = true,
    updated_at = now()
  WHERE id = p_subscription_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Credits added successfully',
    'user_id', v_user_id,
    'credits_added', v_credits_to_add,
    'total_credits', v_total_credits,
    'bonus_credits', v_bonus_credits,
    'expiry_date', (SELECT credits_expiry_date FROM subscriptions WHERE id = p_subscription_id)
  );
END;
$$;

-- Comment for function
COMMENT ON FUNCTION add_subscription_credits_to_user IS 'Adds subscription credits to user coin balance when payment is received';

-- ============================================================================
-- 4. CREATE FUNCTION TO VALIDATE SUBSCRIPTION CREDIT BALANCE
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_subscription_credit_balance(
  p_user_id UUID,
  p_required_credits INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available_credits INTEGER;
  v_total_credits INTEGER;
  v_used_credits INTEGER;
  v_subscription_status TEXT;
  v_credits_expiry_date TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Get subscription credit information
  SELECT 
    s.credits_available,
    s.credits_total,
    s.credits_used,
    s.status,
    s.credits_expiry_date
  INTO 
    v_available_credits,
    v_total_credits,
    v_used_credits,
    v_subscription_status,
    v_credits_expiry_date
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND s.is_credit_based = true
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_purchase', false,
      'reason', 'No active credit-based subscription found',
      'required', p_required_credits,
      'available', 0,
      'missing', p_required_credits
    );
  END IF;
  
  -- Check if credits have expired
  IF v_credits_expiry_date IS NOT NULL AND v_credits_expiry_date < now() THEN
    RETURN jsonb_build_object(
      'can_purchase', false,
      'reason', 'Subscription credits have expired',
      'required', p_required_credits,
      'available', 0,
      'missing', p_required_credits,
      'expiry_date', v_credits_expiry_date
    );
  END IF;
  
  -- Check if enough credits available
  IF v_available_credits < p_required_credits THEN
    RETURN jsonb_build_object(
      'can_purchase', false,
      'reason', 'Insufficient subscription credits',
      'required', p_required_credits,
      'available', v_available_credits,
      'missing', p_required_credits - v_available_credits,
      'total_credits', v_total_credits,
      'used_credits', v_used_credits
    );
  END IF;
  
  -- Success
  RETURN jsonb_build_object(
    'can_purchase', true,
    'available', v_available_credits,
    'required', p_required_credits,
    'remaining', v_available_credits - p_required_credits,
    'total_credits', v_total_credits,
    'used_credits', v_used_credits,
    'expiry_date', v_credits_expiry_date
  );
END;
$$;

-- Comment for function
COMMENT ON FUNCTION validate_subscription_credit_balance IS 'Validates if user has enough subscription credits for a purchase';

-- ============================================================================
-- 5. CREATE FUNCTION TO USE SUBSCRIPTION CREDITS FOR PURCHASE
-- ============================================================================

CREATE OR REPLACE FUNCTION use_subscription_credits_for_purchase(
  p_user_id UUID,
  p_character_id UUID,
  p_required_credits INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription_id UUID;
  v_current_credits INTEGER;
  v_new_credits_available INTEGER;
  v_result JSONB;
BEGIN
  -- Get active subscription
  SELECT id, credits_available
  INTO v_subscription_id, v_current_credits
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND is_credit_based = true
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE; -- Lock the row for update
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No active credit-based subscription found'
    );
  END IF;
  
  -- Validate enough credits
  IF v_current_credits < p_required_credits THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient subscription credits',
      'required', p_required_credits,
      'available', v_current_credits
    );
  END IF;
  
  -- Calculate new available credits
  v_new_credits_available := v_current_credits - p_required_credits;
  
  -- Update subscription credits
  UPDATE subscriptions
  SET 
    credits_used = credits_used + p_required_credits,
    credits_available = v_new_credits_available,
    updated_at = now()
  WHERE id = v_subscription_id;
  
  -- Also spend coins from user's coin balance
  PERFORM debit_coins_from_user(
    p_user_id,
    p_required_credits,
    'spend',
    p_character_id,
    'character',
    jsonb_build_object(
      'subscription_id', v_subscription_id,
      'character_id', p_character_id,
      'credits_used', p_required_credits,
      'credits_remaining', v_new_credits_available
    )
  );
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Credits used successfully',
    'subscription_id', v_subscription_id,
    'credits_used', p_required_credits,
    'credits_remaining', v_new_credits_available,
    'character_id', p_character_id
  );
END;
$$;

-- Comment for function
COMMENT ON FUNCTION use_subscription_credits_for_purchase IS 'Uses subscription credits for character purchase and updates coin balance';

-- ============================================================================
-- 6. CREATE FUNCTION TO GET USER SUBSCRIPTION CREDIT SUMMARY
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_subscription_credit_summary(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription_record RECORD;
  v_result JSONB;
BEGIN
  -- Get subscription details
  SELECT 
    s.id,
    s.plan_type,
    s.status,
    s.credits_total,
    s.credits_used,
    s.credits_available,
    s.credits_expiry_date,
    s.last_credit_distribution_date,
    s.next_credit_distribution_date,
    s.created_at,
    s.updated_at,
    sp.name as plan_name,
    sp.description as plan_description,
    sp.total_credits as plan_total_credits,
    sp.bonus_credits as plan_bonus_credits,
    sp.credit_expiry_days
  INTO v_subscription_record
  FROM subscriptions s
  JOIN subscription_plans sp ON s.plan_type = sp.plan_type
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND s.is_credit_based = true
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_active_subscription', false,
      'message', 'No active credit-based subscription found'
    );
  END IF;
  
  -- Build result
  v_result := jsonb_build_object(
    'has_active_subscription', true,
    'subscription_id', v_subscription_record.id,
    'plan_type', v_subscription_record.plan_type,
    'plan_name', v_subscription_record.plan_name,
    'plan_description', v_subscription_record.plan_description,
    'status', v_subscription_record.status,
    'credits_total', v_subscription_record.credits_total,
    'credits_used', v_subscription_record.credits_used,
    'credits_available', v_subscription_record.credits_available,
    'credits_expiry_date', v_subscription_record.credits_expiry_date,
    'last_credit_distribution', v_subscription_record.last_credit_distribution_date,
    'next_credit_distribution', v_subscription_record.next_credit_distribution_date,
    'plan_total_credits', v_subscription_record.plan_total_credits,
    'plan_bonus_credits', v_subscription_record.plan_bonus_credits,
    'credit_expiry_days', v_subscription_record.credit_expiry_days,
    'created_at', v_subscription_record.created_at,
    'updated_at', v_subscription_record.updated_at,
    'percentage_used', CASE 
      WHEN v_subscription_record.credits_total > 0 
      THEN ROUND((v_subscription_record.credits_used::DECIMAL / v_subscription_record.credits_total) * 100, 2)
      ELSE 0
    END,
    'days_until_expiry', CASE 
      WHEN v_subscription_record.credits_expiry_date IS NOT NULL 
      THEN EXTRACT(DAY FROM (v_subscription_record.credits_expiry_date - now()))
      ELSE NULL
    END
  );
  
  RETURN v_result;
END;
$$;

-- Comment for function
COMMENT ON FUNCTION get_user_subscription_credit_summary IS 'Returns detailed summary of user subscription credits';

-- ============================================================================
-- 7. CREATE FUNCTION TO PROCESS SUBSCRIPTION RENEWAL CREDITS
-- ============================================================================

CREATE OR REPLACE FUNCTION process_subscription_renewal_credits()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_renewal RECORD;
  v_processed_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Find subscriptions that need renewal credit distribution
  FOR v_renewal IN (
    SELECT 
      s.id as subscription_id,
      s.user_id,
      s.plan_type,
      s.next_credit_distribution_date,
      sp.monthly_credits,
      sp.total_credits,
      sp.bonus_credits
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_type = sp.plan_type
    WHERE s.status = 'active'
      AND s.is_credit_based = true
      AND s.next_credit_distribution_date IS NOT NULL
      AND s.next_credit_distribution_date <= now()
      AND sp.monthly_credits > 0
  ) LOOP
    BEGIN
      -- Add monthly credits
      PERFORM add_coins_to_user(
        v_renewal.user_id,
        v_renewal.monthly_credits,
        'subscription_credit',
        v_renewal.subscription_id,
        'subscription',
        jsonb_build_object(
          'renewal', true,
          'plan_type', v_renewal.plan_type,
          'monthly_credits', v_renewal.monthly_credits
        )
      );
      
      -- Update subscription with next distribution date
      UPDATE subscriptions
      SET 
        credits_total = credits_total + v_renewal.monthly_credits,
        credits_available = credits_available + v_renewal.monthly_credits,
        last_credit_distribution_date = now(),
        next_credit_distribution_date = now() + INTERVAL '1 month',
        updated_at = now()
      WHERE id = v_renewal.subscription_id;
      
      v_processed_count := v_processed_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_errors := array_append(v_errors, 
        format('Subscription %s: %s', v_renewal.subscription_id, SQLERRM)
      );
    END;
  END LOOP;
  
  -- Return processing summary
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Subscription renewal credits processed',
    'processed_count', v_processed_count,
    'error_count', v_error_count,
    'errors', v_errors,
    'timestamp', now()
  );
END;
$$;

-- Comment for function
COMMENT ON FUNCTION process_subscription_renewal_credits IS 'Processes monthly credit distribution for active subscriptions (run as cron job)';

-- ============================================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for subscription credit queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_credit_based 
ON subscriptions(is_credit_based, status) 
WHERE is_credit_based = true;

CREATE INDEX IF NOT EXISTS idx_subscriptions_credits_available 
ON subscriptions(credits_available) 
WHERE is_credit_based = true AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_next_distribution 
ON subscriptions(next_credit_distribution_date) 
WHERE is_credit_based = true AND status = 'active' AND next_credit_distribution_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_credits_expiry 
ON subscriptions(credits_expiry_date) 
WHERE is_credit_based = true AND status = 'active' AND credits_expiry_date IS NOT NULL;

-- Index for subscription plans credit queries
CREATE INDEX IF NOT EXISTS idx_subscription_plans_credit_based 
ON subscription_plans(is_credit_based, is_active) 
WHERE is_credit_based = true AND is_active = true;

-- ============================================================================
-- 9. ADD RLS POLICIES FOR NEW FIELDS
-- ============================================================================

-- Ensure users can view their own subscription credit information
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Ensure users can update their own subscription credit information
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;
CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================
-- 10. CREATE VIEW FOR ADMIN DASHBOARD
-- ============================================================================

CREATE OR REPLACE VIEW admin_subscription_credits_dashboard AS
SELECT 
  s.id as subscription_id,
  u.email as user_email,
  s.plan_type,
  sp.name as plan_name,
  s.status,
  s.is_credit_based,
  s.credits_total,
  s.credits_used,
  s.credits_available,
  s.credits_expiry_date,
  s.last_credit_distribution_date,
  s.next_credit_distribution_date,
  s.created_at as subscription_created,
  s.updated_at as subscription_updated,
  uc.balance as user_coin_balance,
  uc.total_earned as user_total_coins_earned,
  uc.total_spent as user_total_coins_spent,
  -- Calculate metrics
  ROUND((s.credits_used::DECIMAL / NULLIF(s.credits_total, 0)) * 100, 2) as credit_usage_percentage,
  CASE 
    WHEN s.credits_expiry_date IS NOT NULL 
    THEN EXTRACT(DAY FROM (s.credits_expiry_date - now()))
    ELSE NULL
  END as days_until_credit_expiry,
  CASE 
    WHEN s.next_credit_distribution_date IS NOT NULL 
    THEN EXTRACT(DAY FROM (s.next_credit_distribution_date - now()))
    ELSE NULL
  END as days_until_next_distribution
FROM subscriptions s
JOIN auth.users u ON s.user_id = u.id
JOIN subscription_plans sp ON s.plan_type = sp.plan_type
LEFT JOIN user_coins uc ON s.user_id = uc.user_id
WHERE s.is_credit_based = true
ORDER BY s.created_at DESC;

-- Comment for view
COMMENT ON VIEW admin_subscription_credits_dashboard IS 'Admin dashboard view for monitoring subscription credit usage';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Migration: 20260306000000_integrate_subscription_credits
-- Description: Integrates subscription credit system with existing coins system. 
-- Adds credit fields to plans and subscriptions, creates functions for credit management, 
-- and provides admin dashboard view.