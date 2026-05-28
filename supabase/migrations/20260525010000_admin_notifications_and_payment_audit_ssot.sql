-- Align admin notification settings with the admin UI and add a durable
-- payment verification audit table for Edge Function admin actions.

ALTER TABLE public.admin_notification_settings
  ADD COLUMN IF NOT EXISTS new_quote_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_received_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS support_ticket_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS subscription_canceled_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS low_stock_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS system_error_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS new_user_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorder_completed_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS production_ready_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS message_received_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_frequency TEXT NOT NULL DEFAULT 'instant',
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_notification_settings_email_frequency_check'
      AND conrelid = 'public.admin_notification_settings'::regclass
  ) THEN
    ALTER TABLE public.admin_notification_settings
      ADD CONSTRAINT admin_notification_settings_email_frequency_check
      CHECK (email_frequency IN ('instant', 'hourly', 'daily'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.payment_verification_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('subscription', 'standalone_purchase')),
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL CHECK (action_type IN ('approve_payment_voucher', 'reject_payment_voucher')),
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_verification_audit_logs_order
  ON public.payment_verification_audit_logs(order_type, order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_verification_audit_logs_admin
  ON public.payment_verification_audit_logs(admin_user_id, created_at DESC);

ALTER TABLE public.payment_verification_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_verification_audit_logs_select_admin" ON public.payment_verification_audit_logs;
CREATE POLICY "payment_verification_audit_logs_select_admin"
  ON public.payment_verification_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "payment_verification_audit_logs_insert_service" ON public.payment_verification_audit_logs;
CREATE POLICY "payment_verification_audit_logs_insert_service"
  ON public.payment_verification_audit_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON public.payment_verification_audit_logs FROM PUBLIC, anon;
GRANT SELECT ON public.payment_verification_audit_logs TO authenticated;
GRANT ALL ON public.payment_verification_audit_logs TO service_role;

COMMENT ON TABLE public.payment_verification_audit_logs IS
  'Durable audit trail for admin payment voucher approval and rejection actions.';

NOTIFY pgrst, 'reload schema';
