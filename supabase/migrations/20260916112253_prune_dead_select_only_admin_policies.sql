-- These tables intentionally expose SELECT only to authenticated users.
-- Administrative mutations are routed through server-authoritative RPCs / service_role.
-- Remove FOR ALL policies that only duplicate SELECT and could become dangerous if DML grants regress.
DROP POLICY IF EXISTS bonus_pieces_mutate_admin_service ON public.bonus_pieces;
DROP POLICY IF EXISTS characters_modify_admin ON public.characters;
DROP POLICY IF EXISTS "Admins can manage collection types" ON public.collection_types;
DROP POLICY IF EXISTS collections_modify_admin ON public.collections;
DROP POLICY IF EXISTS cycles_modify_admin ON public.cycles;
DROP POLICY IF EXISTS holidays_mutate_admin_service ON public.holidays;
DROP POLICY IF EXISTS manual_payments_modify_admin ON public.manual_payments;
DROP POLICY IF EXISTS production_photo_metadata_admin_manage ON public.production_photo_metadata;
DROP POLICY IF EXISTS quote_payments_admin_manage ON public.quote_payments;
DROP POLICY IF EXISTS quotes_modify_admin ON public.quotes;
DROP POLICY IF EXISTS standalone_purchases_modify_admin ON public.standalone_purchases;
DROP POLICY IF EXISTS subscriptions_modify_admin ON public.subscriptions;
DROP POLICY IF EXISTS "System can manage coins" ON public.user_coins;

-- Quote creation is server-authoritative; authenticated no longer has direct INSERT.
-- Removing this policy prevents accidental authority restoration if grants drift later.
DROP POLICY IF EXISTS quotes_insert_own ON public.quotes;
