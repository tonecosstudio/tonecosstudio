ALTER TABLE public.manual_payments
  ALTER COLUMN reference_number SET NOT NULL,
  ALTER COLUMN currency SET NOT NULL,
  ALTER COLUMN payment_type SET NOT NULL;

ALTER TABLE public.manual_payments
  ADD CONSTRAINT manual_payments_currency_format_check
    CHECK (currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT manual_payments_payment_type_check
    CHECK (payment_type IN ('one_time', 'recurring'));

ALTER TABLE public.payment_files
  ALTER COLUMN file_size SET NOT NULL,
  ALTER COLUMN file_type SET NOT NULL;

ALTER TABLE public.payment_files
  ADD CONSTRAINT payment_files_file_size_check
    CHECK (file_size > 0 AND file_size <= 5242880),
  ADD CONSTRAINT payment_files_file_type_check
    CHECK (file_type IN ('image/jpeg', 'image/png', 'application/pdf'));

NOTIFY pgrst, 'reload schema';
