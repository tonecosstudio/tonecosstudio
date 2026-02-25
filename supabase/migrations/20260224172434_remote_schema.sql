drop extension if exists "pg_net";

drop policy "Admins can insert attachments" on "public"."chat_group_attachments";

revoke delete on table "public"."system_settings_backup" from "anon";

revoke insert on table "public"."system_settings_backup" from "anon";

revoke references on table "public"."system_settings_backup" from "anon";

revoke select on table "public"."system_settings_backup" from "anon";

revoke trigger on table "public"."system_settings_backup" from "anon";

revoke truncate on table "public"."system_settings_backup" from "anon";

revoke update on table "public"."system_settings_backup" from "anon";

revoke delete on table "public"."system_settings_backup" from "authenticated";

revoke insert on table "public"."system_settings_backup" from "authenticated";

revoke references on table "public"."system_settings_backup" from "authenticated";

revoke select on table "public"."system_settings_backup" from "authenticated";

revoke trigger on table "public"."system_settings_backup" from "authenticated";

revoke truncate on table "public"."system_settings_backup" from "authenticated";

revoke update on table "public"."system_settings_backup" from "authenticated";

revoke delete on table "public"."system_settings_backup" from "service_role";

revoke insert on table "public"."system_settings_backup" from "service_role";

revoke references on table "public"."system_settings_backup" from "service_role";

revoke select on table "public"."system_settings_backup" from "service_role";

revoke trigger on table "public"."system_settings_backup" from "service_role";

revoke truncate on table "public"."system_settings_backup" from "service_role";

revoke update on table "public"."system_settings_backup" from "service_role";

drop view if exists "public"."current_cycle_info";

drop function if exists "public"."get_current_cycle"();

alter table "public"."system_settings_backup" drop constraint "system_settings_backup_pkey";

drop index if exists "public"."system_settings_backup_pkey";

drop table "public"."system_settings_backup";

alter table "public"."ai_name_cache" disable row level security;

alter table "public"."franchise_rules" disable row level security;

alter table "public"."franchises" disable row level security;

alter table "public"."images_queue" disable row level security;

alter table "public"."models" disable row level security;

alter table "public"."user_roles" disable row level security;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.are_sales_open()
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  is_closed_flag BOOLEAN;
BEGIN
  -- Buscar status do mês atual
  SELECT is_closed INTO is_closed_flag
  FROM monthly_production
  WHERE month = current_month AND year = current_year;
  
  -- Se não existe registro, vendas estão abertas
  IF is_closed_flag IS NULL THEN
    RETURN TRUE;
  END IF;
  
  RETURN NOT is_closed_flag;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.close_monthly_sales(reason text DEFAULT 'manual'::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  UPDATE monthly_production
  SET 
    is_closed = TRUE,
    closed_reason = reason,
    closed_at = NOW(),
    updated_at = NOW()
  WHERE month = current_month AND year = current_year;
  
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_default_groups()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Pegar o primeiro admin do sistema
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE raw_user_meta_data->>'role' = 'admin'
  LIMIT 1;

  -- Se não houver admin, usar o primeiro usuário
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Grupo: Novos Membros (todos os usuários cadastrados)
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    '🎉 Novos Membros',
    'manual',
    NULL,
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  -- Grupo: Assinantes Geral (todos com assinatura ativa)
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    '⭐ Assinantes',
    'assinantes',
    '{"type": "assinantes", "subscriptionStatus": "active"}'::jsonb,
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  -- Grupo: Avisos Importantes (manual, admin escolhe quando usar)
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    '📢 Avisos Importantes',
    'manual',
    '{"type": "avisos", "description": "Comunicados críticos do sistema"}'::jsonb,
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  -- Grupo: Assinaturas Expirando (assinaturas que vencem em até 7 dias)
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    '⏰ Assinaturas Expirando',
    'expirando',
    '{"type": "expirando", "daysUntilExpiration": 7}'::jsonb,
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  -- Grupo: Ex-Assinantes (usuários que já tiveram assinatura mas não têm mais)
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    '🔄 Ex-Assinantes',
    'ex_assinantes',
    '{"type": "ex_assinantes", "hadSubscription": true, "currentStatus": "inactive"}'::jsonb,
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  -- Grupo: Usuários Free (nunca tiveram assinatura)
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    '🆓 Usuários Free',
    'free',
    '{"type": "free", "neverHadSubscription": true}'::jsonb,
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Grupos padrão criados com sucesso';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_group_for_new_collection()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  admin_user_id UUID;
  group_name TEXT;
BEGIN
  -- Pegar o criador da coleção ou primeiro admin
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE raw_user_meta_data->>'role' = 'admin'
  LIMIT 1;

  -- Nome do grupo baseado no nome da coleção
  group_name := '📦 ' || NEW.name;

  -- Criar grupo para a coleção
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    group_name,
    'colecao',
    jsonb_build_object(
      'type', 'colecao',
      'collectionId', NEW.id::text
    ),
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Grupo criado para coleção: %', NEW.name;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_production_limit()
 RETURNS TABLE(prod_month integer, prod_year integer, prod_global_limit integer, prod_units_sold integer, prod_available integer, prod_is_closed boolean, prod_percentage_sold numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_limit_value INTEGER;
BEGIN
  SELECT value::INTEGER INTO v_limit_value
  FROM system_settings
  WHERE key = 'monthly_production_limit';
  
  INSERT INTO monthly_production (month, year, global_limit)
  VALUES (v_current_month, v_current_year, v_limit_value)
  ON CONFLICT (month, year) DO NOTHING;
  
  RETURN QUERY
  SELECT 
    mp.month,
    mp.year,
    mp.global_limit,
    mp.units_sold,
    GREATEST(0, mp.global_limit - mp.units_sold) as available,
    mp.is_closed,
    ROUND((mp.units_sold::NUMERIC / NULLIF(mp.global_limit, 0)) * 100, 2) as percentage_sold
  FROM monthly_production mp
  WHERE mp.month = v_current_month AND mp.year = v_current_year;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_monthly_sales(quantity integer DEFAULT 1)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  current_limit INTEGER;
  current_sold INTEGER;
  new_sold INTEGER;
BEGIN
  -- Buscar dados atuais
  SELECT global_limit, units_sold INTO current_limit, current_sold
  FROM monthly_production
  WHERE month = current_month AND year = current_year;
  
  -- Calcular novo total
  new_sold := current_sold + quantity;
  
  -- Verificar se excede limite
  IF new_sold > current_limit THEN
    RAISE EXCEPTION 'Limite de produção mensal atingido (% / %)', current_sold, current_limit;
  END IF;
  
  -- Atualizar vendas
  UPDATE monthly_production
  SET 
    units_sold = new_sold,
    updated_at = NOW(),
    -- Fechar automaticamente se atingir limite
    is_closed = CASE WHEN new_sold >= current_limit THEN TRUE ELSE is_closed END,
    closed_reason = CASE WHEN new_sold >= current_limit THEN 'limit_reached' ELSE closed_reason END,
    closed_at = CASE WHEN new_sold >= current_limit THEN NOW() ELSE closed_at END
  WHERE month = current_month AND year = current_year;
  
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reopen_monthly_sales()
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  UPDATE monthly_production
  SET 
    is_closed = FALSE,
    closed_reason = NULL,
    closed_at = NULL,
    updated_at = NOW()
  WHERE month = current_month AND year = current_year;
  
  RETURN TRUE;
END;
$function$
;


  create policy "chat_group_members_delete"
  on "public"."chat_group_members"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "chat_group_members_insert"
  on "public"."chat_group_members"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "chat_group_members_select"
  on "public"."chat_group_members"
  as permissive
  for select
  to authenticated
using (true);



  create policy "chat_group_members_update"
  on "public"."chat_group_members"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "authenticated_manage_franchise_rules"
  on "public"."franchise_rules"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "authenticated_select_franchise_rules"
  on "public"."franchise_rules"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Admins can delete files in models bucket"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'models'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role))))));



  create policy "Admins can update files in models bucket"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'models'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role))))));



  create policy "Admins can upload to models bucket"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'models'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role))))));



  create policy "Public can view files in models bucket"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'models'::text));



