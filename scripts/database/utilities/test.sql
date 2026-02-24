


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'moderator',
    'user'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."queue_status" AS ENUM (
    'pending',
    'skipped',
    'review_later',
    'processed',
    'error'
);


ALTER TYPE "public"."queue_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_users"() RETURNS TABLE("id" "uuid", "email" "text", "created_at" timestamp with time zone, "last_sign_in_at" timestamp with time zone, "confirmed_at" timestamp with time zone, "email_confirmed_at" timestamp with time zone, "phone" "text", "full_name" "text", "profile_phone" "text", "whatsapp" "text", "cpf" "text", "profile_completion" integer, "roles" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  calling_user_id uuid;
  is_admin boolean;
BEGIN
  -- Pegar ID do usuário que está chamando
  calling_user_id := auth.uid();
  
  -- Verificar se o usuário está autenticado
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  
  -- Verificar se é admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = calling_user_id AND role = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Acesso negado. Apenas admins podem listar usuários.';
  END IF;
  
  -- Retornar usuários com dados combinados
  RETURN QUERY
  SELECT 
    au.id,
    au.email::text,
    au.created_at,
    au.last_sign_in_at,
    au.confirmed_at,
    au.email_confirmed_at,
    au.phone::text,
    p.full_name,
    p.phone as profile_phone,
    p.whatsapp,
    p.cpf,
    p.profile_completion,
    COALESCE(
      ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL),
      ARRAY[]::text[]
    ) as roles
  FROM auth.users au
  LEFT JOIN profiles p ON p.id = au.id
  LEFT JOIN user_roles ur ON ur.user_id = au.id
  GROUP BY 
    au.id, 
    au.email, 
    au.created_at, 
    au.last_sign_in_at,
    au.confirmed_at,
    au.email_confirmed_at,
    au.phone,
    p.full_name,
    p.phone,
    p.whatsapp,
    p.cpf,
    p.profile_completion
  ORDER BY au.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."admin_list_users"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_list_users"() IS 'Lista todos os usuários do sistema com profiles e roles. Apenas admins podem executar.';



CREATE OR REPLACE FUNCTION "public"."are_sales_open"() RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."are_sales_open"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."are_sales_open"() IS 'Verifica se as vendas do mês atual estão abertas';



CREATE OR REPLACE FUNCTION "public"."auto_update_character_status"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  char_record RECORD;
BEGIN
  -- Atualizar para 'revealed' se passou da data de revelação
  FOR char_record IN 
    SELECT * FROM collection_characters
    WHERE status = 'upcoming'
    AND reveal_date IS NOT NULL
    AND reveal_date <= CURRENT_DATE
    AND auto_reveal = true
  LOOP
    UPDATE collection_characters
    SET 
      status = 'revealed',
      revealed_at = now(),
      updated_at = now()
    WHERE id = char_record.id;
    
    -- Registrar evento
    INSERT INTO collection_events (collection_id, character_id, event_type, old_status, new_status)
    VALUES (char_record.collection_id, char_record.id, 'reveal', 'upcoming', 'revealed');
    
    -- Criar notificações para assinantes (se ainda não enviou)
    IF NOT char_record.reveal_notification_sent THEN
      INSERT INTO collection_notifications (user_id, collection_id, character_id, type, title, message, scheduled_for)
      SELECT 
        s.user_id,
        char_record.collection_id,
        char_record.id,
        'reveal',
        'Novo personagem revelado! 🎉',
        format('O personagem "%s" da sua coleção foi revelado! Confira agora.', char_record.name),
        now()
      FROM subscriptions s
      WHERE s.collection_id = char_record.collection_id
      AND s.status = 'active';
      
      -- Marcar como enviado
      UPDATE collection_characters
      SET reveal_notification_sent = true
      WHERE id = char_record.id;
    END IF;
  END LOOP;
  
  -- Atualizar para 'released' se passou da data de lançamento
  FOR char_record IN 
    SELECT * FROM collection_characters
    WHERE status = 'revealed'
    AND release_date IS NOT NULL
    AND release_date <= CURRENT_DATE
    AND auto_release = true
  LOOP
    UPDATE collection_characters
    SET 
      status = 'released',
      released_at = now(),
      updated_at = now()
    WHERE id = char_record.id;
    
    -- Registrar evento
    INSERT INTO collection_events (collection_id, character_id, event_type, old_status, new_status)
    VALUES (char_record.collection_id, char_record.id, 'release', 'revealed', 'released');
    
    -- Criar notificações para assinantes (se ainda não enviou)
    IF NOT char_record.release_notification_sent THEN
      INSERT INTO collection_notifications (user_id, collection_id, character_id, type, title, message, scheduled_for)
      SELECT 
        s.user_id,
        char_record.collection_id,
        char_record.id,
        'release',
        'Personagem disponível! 🚀',
        format('O personagem "%s" está disponível para entrega! Prepare-se para recebê-lo.', char_record.name),
        now()
      FROM subscriptions s
      WHERE s.collection_id = char_record.collection_id
      AND s.status = 'active';
      
      -- Marcar como enviado
      UPDATE collection_characters
      SET release_notification_sent = true
      WHERE id = char_record.id;
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."auto_update_character_status"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_update_character_status"() IS 'Atualiza automaticamente o status dos personagens baseado nas datas';



CREATE OR REPLACE FUNCTION "public"."calculate_pix_price"("p_price_full" numeric, "p_discount_percentage" numeric DEFAULT 5.00) RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN ROUND(p_price_full * (1 - p_discount_percentage / 100), 2);
END;
$$;


ALTER FUNCTION "public"."calculate_pix_price"("p_price_full" numeric, "p_discount_percentage" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_pix_price"("p_price_full" numeric, "p_discount_percentage" numeric) IS 'Calcula preço PIX com desconto percentual';



CREATE OR REPLACE FUNCTION "public"."calculate_preorder_amounts"("p_total_amount" numeric, "p_deposit_type" "text" DEFAULT 'fixed'::"text", "p_deposit_value" numeric DEFAULT 100.00) RETURNS TABLE("deposit_amount" numeric, "remaining_amount" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF p_deposit_type = 'percentage' THEN
    RETURN QUERY SELECT 
      ROUND(p_total_amount * (p_deposit_value / 100), 2) as deposit_amount,
      ROUND(p_total_amount - (p_total_amount * (p_deposit_value / 100)), 2) as remaining_amount;
  ELSE
    RETURN QUERY SELECT 
      p_deposit_value as deposit_amount,
      ROUND(p_total_amount - p_deposit_value, 2) as remaining_amount;
  END IF;
END;
$$;


ALTER FUNCTION "public"."calculate_preorder_amounts"("p_total_amount" numeric, "p_deposit_type" "text", "p_deposit_value" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_production_cost"("p_collection_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_total_cost NUMERIC;
BEGIN
  SELECT 
    COALESCE(cost_material, 0) +
    COALESCE(cost_labor, 0) +
    COALESCE(cost_packaging, 0) +
    COALESCE(cost_shipping, 0) +
    COALESCE(cost_other, 0)
  INTO v_total_cost
  FROM collections
  WHERE id = p_collection_id;
  
  RETURN COALESCE(v_total_cost, 0);
END;
$$;


ALTER FUNCTION "public"."calculate_production_cost"("p_collection_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_production_cost"("p_collection_id" "uuid") IS 'Calcula custo total de produção de uma peça';



CREATE OR REPLACE FUNCTION "public"."calculate_production_start_date"("delivery_date" timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN delivery_date - INTERVAL '15 days';
END;
$$;


ALTER FUNCTION "public"."calculate_production_start_date"("delivery_date" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_production_start_date"("delivery_date" timestamp with time zone) IS 'Calcula data de início de produção (15 dias antes da entrega)';



CREATE OR REPLACE FUNCTION "public"."calculate_profile_completion"("profile_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  completion INTEGER := 0;
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record FROM profiles WHERE id = profile_id;
  
  IF profile_record IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Cada campo vale pontos
  IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.whatsapp IS NOT NULL AND profile_record.whatsapp != '' THEN
    completion := completion + 5;
  END IF;
  
  IF profile_record.cpf IS NOT NULL AND profile_record.cpf != '' THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.birth_date IS NOT NULL THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.address IS NOT NULL THEN
    completion := completion + 15;
  END IF;
  
  IF profile_record.preferences_text IS NOT NULL AND profile_record.preferences_text != '' THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.preference_tags IS NOT NULL AND array_length(profile_record.preference_tags, 1) > 0 THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.username IS NOT NULL AND profile_record.username != '' THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.bio IS NOT NULL AND profile_record.bio != '' THEN
    completion := completion + 10;
  END IF;
  
  IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN
    completion := completion + 5;
  END IF;
  
  RETURN completion;
END;
$$;


ALTER FUNCTION "public"."calculate_profile_completion"("profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_monthly_sales"("reason" "text" DEFAULT 'manual'::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."close_monthly_sales"("reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."close_monthly_sales"("reason" "text") IS 'Fecha vendas do mês atual manualmente';



CREATE OR REPLACE FUNCTION "public"."ensure_single_default_payment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE payment_methods 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id 
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_default_payment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_collection_financial_analysis"("p_collection_id" "uuid") RETURNS TABLE("price_full" numeric, "price_pix" numeric, "deposit_amount" numeric, "cost_total" numeric, "cost_material" numeric, "cost_labor" numeric, "cost_packaging" numeric, "cost_shipping" numeric, "cost_other" numeric, "profit_full" numeric, "profit_pix" numeric, "profit_margin_full" numeric, "profit_margin_pix" numeric, "tax_pix" numeric, "tax_card_6x" numeric, "tax_card_10x_store" numeric, "tax_card_10x_client" numeric, "net_profit_pix" numeric, "net_profit_card_6x" numeric, "net_profit_card_10x_store" numeric, "net_profit_card_10x_client" numeric, "net_margin_pix" numeric, "net_margin_card_6x" numeric, "net_margin_card_10x_store" numeric, "net_margin_card_10x_client" numeric, "roi_pix" numeric, "roi_card_6x" numeric, "roi_card_10x_store" numeric, "roi_card_10x_client" numeric, "breakeven_units" numeric, "total_sales" integer, "total_revenue" numeric, "total_profit" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_collection RECORD;
  v_pricing RECORD;
  v_cost_total NUMERIC;
  
  -- Taxas Mercado Pago
  v_tax_pix_rate NUMERIC := 0.01; -- 1%
  v_tax_card_sale NUMERIC := 0.0498; -- 4,98%
  v_tax_card_6x NUMERIC := 0.0996; -- 9,96%
  v_tax_card_10x_store NUMERIC := 0.1493; -- 14,93%
  v_tax_card_10x_client NUMERIC := 0.2065; -- 20,65%
  
  v_pix_discount NUMERIC;
BEGIN
  -- Buscar dados da coleção
  SELECT * INTO v_collection FROM collections WHERE id = p_collection_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coleção não encontrada';
  END IF;
  
  -- Buscar preços
  SELECT * INTO v_pricing FROM get_collection_pricing(p_collection_id) LIMIT 1;
  
  -- Calcular custo total
  v_cost_total := calculate_production_cost(p_collection_id);
  
  -- Buscar desconto PIX
  SELECT value::NUMERIC INTO v_pix_discount 
  FROM system_settings 
  WHERE key = 'pix_discount_percentage';
  
  RETURN QUERY
  SELECT
    -- Preços
    v_pricing.price_full,
    v_pricing.price_pix,
    v_pricing.deposit_amount,
    
    -- Custos
    v_cost_total,
    v_collection.cost_material,
    v_collection.cost_labor,
    v_collection.cost_packaging,
    v_collection.cost_shipping,
    v_collection.cost_other,
    
    -- Lucro Bruto
    v_pricing.price_full - v_cost_total as profit_full,
    v_pricing.price_pix - v_cost_total as profit_pix,
    ROUND(((v_pricing.price_full - v_cost_total) / NULLIF(v_pricing.price_full, 0)) * 100, 2) as profit_margin_full,
    ROUND(((v_pricing.price_pix - v_cost_total) / NULLIF(v_pricing.price_pix, 0)) * 100, 2) as profit_margin_pix,
    
    -- Taxas
    v_pricing.price_pix * v_tax_pix_rate as tax_pix,
    v_pricing.price_full * (v_tax_card_sale + v_tax_card_6x) as tax_card_6x,
    v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_store) as tax_card_10x_store,
    v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_client) as tax_card_10x_client,
    
    -- Lucro Líquido
    v_pricing.price_pix - v_cost_total - (v_pricing.price_pix * v_tax_pix_rate) as net_profit_pix,
    v_pricing.price_full - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_6x)) as net_profit_card_6x,
    v_pricing.price_full - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_store)) as net_profit_card_10x_store,
    (v_pricing.price_full * (1 + v_tax_card_10x_client)) - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_client)) as net_profit_card_10x_client,
    
    -- Margens Líquidas
    ROUND(((v_pricing.price_pix - v_cost_total - (v_pricing.price_pix * v_tax_pix_rate)) / NULLIF(v_pricing.price_pix, 0)) * 100, 2) as net_margin_pix,
    ROUND(((v_pricing.price_full - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_6x))) / NULLIF(v_pricing.price_full, 0)) * 100, 2) as net_margin_card_6x,
    ROUND(((v_pricing.price_full - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_store))) / NULLIF(v_pricing.price_full, 0)) * 100, 2) as net_margin_card_10x_store,
    ROUND((((v_pricing.price_full * (1 + v_tax_card_10x_client)) - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_client))) / NULLIF(v_pricing.price_full, 0)) * 100, 2) as net_margin_card_10x_client,
    
    -- ROI
    ROUND(((v_pricing.price_pix - v_cost_total - (v_pricing.price_pix * v_tax_pix_rate)) / NULLIF(v_cost_total, 0)) * 100, 2) as roi_pix,
    ROUND(((v_pricing.price_full - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_6x))) / NULLIF(v_cost_total, 0)) * 100, 2) as roi_card_6x,
    ROUND(((v_pricing.price_full - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_store))) / NULLIF(v_cost_total, 0)) * 100, 2) as roi_card_10x_store,
    ROUND((((v_pricing.price_full * (1 + v_tax_card_10x_client)) - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_client))) / NULLIF(v_cost_total, 0)) * 100, 2) as roi_card_10x_client,
    
    -- Breakeven
    CASE 
      WHEN (v_pricing.price_pix - v_cost_total - (v_pricing.price_pix * v_tax_pix_rate)) > 0 
      THEN CEIL(1000 / (v_pricing.price_pix - v_cost_total - (v_pricing.price_pix * v_tax_pix_rate)))
      ELSE NULL
    END as breakeven_units,
    
    -- Vendas (TODO: implementar quando tiver tabela de vendas)
    0::INTEGER as total_sales,
    0::NUMERIC as total_revenue,
    0::NUMERIC as total_profit;
END;
$$;


ALTER FUNCTION "public"."get_collection_financial_analysis"("p_collection_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_collection_financial_analysis"("p_collection_id" "uuid") IS 'Retorna análise financeira completa de uma coleção';



CREATE OR REPLACE FUNCTION "public"."get_collection_pricing"("p_collection_id" "uuid") RETURNS TABLE("price_full" numeric, "price_pix" numeric, "deposit_amount" numeric, "remaining_full" numeric, "remaining_pix" numeric, "is_custom" boolean)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_collection RECORD;
  v_default_price_full NUMERIC;
  v_default_price_pix NUMERIC;
  v_default_deposit NUMERIC;
BEGIN
  -- Buscar configurações da coleção
  SELECT 
    c.price_full,
    c.price_pix,
    c.deposit_amount,
    c.is_price_custom
  INTO v_collection
  FROM collections c
  WHERE c.id = p_collection_id;
  
  -- Se não encontrou a coleção, retornar valores padrão
  IF NOT FOUND THEN
    SELECT value::NUMERIC INTO v_default_price_full FROM system_settings WHERE key = 'default_price_full';
    SELECT value::NUMERIC INTO v_default_price_pix FROM system_settings WHERE key = 'default_price_pix';
    SELECT value::NUMERIC INTO v_default_deposit FROM system_settings WHERE key = 'default_deposit_amount';
    
    RETURN QUERY SELECT 
      v_default_price_full,
      v_default_price_pix,
      v_default_deposit,
      v_default_price_full - v_default_deposit,
      v_default_price_pix - v_default_deposit,
      false;
    RETURN;
  END IF;
  
  -- Se usa preço customizado, retornar valores da coleção
  IF v_collection.is_price_custom THEN
    RETURN QUERY SELECT 
      v_collection.price_full,
      v_collection.price_pix,
      v_collection.deposit_amount,
      v_collection.price_full - v_collection.deposit_amount,
      v_collection.price_pix - v_collection.deposit_amount,
      true;
  ELSE
    -- Usar valores padrão do sistema
    SELECT value::NUMERIC INTO v_default_price_full FROM system_settings WHERE key = 'default_price_full';
    SELECT value::NUMERIC INTO v_default_price_pix FROM system_settings WHERE key = 'default_price_pix';
    SELECT value::NUMERIC INTO v_default_deposit FROM system_settings WHERE key = 'default_deposit_amount';
    
    RETURN QUERY SELECT 
      v_default_price_full,
      v_default_price_pix,
      v_default_deposit,
      v_default_price_full - v_default_deposit,
      v_default_price_pix - v_default_deposit,
      false;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_collection_pricing"("p_collection_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_collection_pricing"("p_collection_id" "uuid") IS 'Retorna preços de uma coleção (customizado ou padrão)';



CREATE OR REPLACE FUNCTION "public"."get_collection_stats"("p_collection_id" "uuid") RETURNS TABLE("total_characters" integer, "upcoming_count" integer, "revealed_count" integer, "released_count" integer, "with_images" integer, "with_dates" integer, "next_release_date" "date", "next_release_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_characters,
    COUNT(*) FILTER (WHERE status = 'upcoming')::INTEGER as upcoming_count,
    COUNT(*) FILTER (WHERE status = 'revealed')::INTEGER as revealed_count,
    COUNT(*) FILTER (WHERE status = 'released')::INTEGER as released_count,
    COUNT(*) FILTER (WHERE image_url IS NOT NULL)::INTEGER as with_images,
    COUNT(*) FILTER (WHERE release_date IS NOT NULL)::INTEGER as with_dates,
    MIN(release_date) FILTER (WHERE release_date > CURRENT_DATE) as next_release_date,
    (SELECT name FROM collection_characters 
     WHERE collection_id = p_collection_id 
     AND release_date > CURRENT_DATE 
     ORDER BY release_date ASC LIMIT 1) as next_release_name
  FROM collection_characters
  WHERE collection_id = p_collection_id;
END;
$$;


ALTER FUNCTION "public"."get_collection_stats"("p_collection_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_collection_stats"("p_collection_id" "uuid") IS 'Retorna estatísticas de uma coleção';



CREATE OR REPLACE FUNCTION "public"."get_current_production_limit"() RETURNS TABLE("prod_month" integer, "prod_year" integer, "prod_global_limit" integer, "prod_units_sold" integer, "prod_available" integer, "prod_is_closed" boolean, "prod_percentage_sold" numeric)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_current_production_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_release"("p_collection_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("character_id" "uuid", "character_name" "text", "character_image" "text", "collection_id" "uuid", "collection_name" "text", "release_date" "date", "days_until_release" integer, "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.name,
    cc.image_url,
    c.id,
    c.name,
    cc.release_date,
    (cc.release_date - CURRENT_DATE)::INTEGER as days_until_release,
    cc.status
  FROM collection_characters cc
  JOIN collections c ON c.id = cc.collection_id
  WHERE (p_collection_id IS NULL OR cc.collection_id = p_collection_id)
  AND cc.release_date > CURRENT_DATE
  AND c.is_active = true
  ORDER BY cc.release_date ASC
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_next_release"("p_collection_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_next_release"("p_collection_id" "uuid") IS 'Retorna o próximo personagem a ser lançado';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, address, preferences_text, preference_tags)
  VALUES (NEW.id, NULL, NULL, NULL)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_coupon_usage"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE coupons 
  SET current_uses = current_uses + 1
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_coupon_usage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_monthly_sales"("quantity" integer DEFAULT 1) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."increment_monthly_sales"("quantity" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_monthly_sales"("quantity" integer) IS 'Incrementa contador de vendas e fecha automaticamente se atingir limite';



CREATE OR REPLACE FUNCTION "public"."increment_quick_reply_usage"("p_quick_reply_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE support_quick_replies
  SET usage_count = usage_count + 1
  WHERE id = p_quick_reply_id;
END;
$$;


ALTER FUNCTION "public"."increment_quick_reply_usage"("p_quick_reply_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_as_read"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$;


ALTER FUNCTION "public"."mark_all_notifications_as_read"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_first_admin_response"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_conversation_user_id UUID;
BEGIN
  -- Verifica se sender é admin
  SELECT has_role(NEW.sender_id, 'admin'::app_role) INTO v_is_admin;
  
  -- Busca user_id da conversa
  SELECT user_id INTO v_conversation_user_id
  FROM support_conversations
  WHERE id = NEW.conversation_id;
  
  -- Se é admin e não é o dono da conversa
  IF v_is_admin AND NEW.sender_id != v_conversation_user_id THEN
    UPDATE support_conversations
    SET first_response_at = NEW.created_at
    WHERE id = NEW.conversation_id
      AND first_response_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."mark_first_admin_response"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_as_read"("notification_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true, read_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."mark_notification_as_read"("notification_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE collection_notifications
  SET 
    read = true,
    read_at = now()
  WHERE id = p_notification_id
  AND user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") IS 'Marca uma notificação como lida';



CREATE OR REPLACE FUNCTION "public"."notify_payment_link_sent"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
  -- Create notification for user
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    link
  )
  SELECT 
    quotes.user_id,
    'Link de Pagamento Disponível',
    'Seu link de pagamento está pronto! Valor: R$ ' || NEW.amount::TEXT,
    'payment',
    '/orcamento/acompanhar/' || NEW.quote_id
  FROM quotes
  WHERE quotes.id = NEW.quote_id;
  
  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."notify_payment_link_sent"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reopen_monthly_sales"() RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."reopen_monthly_sales"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reopen_monthly_sales"() IS 'Reabre vendas do mês atual';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Atualizar email no profile quando usuário é criado ou atualizado
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = NEW.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_user_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_collection_characters_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_collection_characters_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_collection_pix_price"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_discount_percentage NUMERIC;
BEGIN
  -- Buscar percentual de desconto
  SELECT value::NUMERIC INTO v_discount_percentage 
  FROM system_settings 
  WHERE key = 'pix_discount_percentage';
  
  -- Se price_full mudou e is_price_custom é true, recalcular price_pix
  IF NEW.is_price_custom AND (NEW.price_full IS DISTINCT FROM OLD.price_full) THEN
    NEW.price_pix := calculate_pix_price(NEW.price_full, v_discount_percentage);
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_collection_pix_price"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_collections_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_collections_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE support_conversations
  SET 
    last_message_at = NEW.created_at,
    status = CASE
      WHEN NEW.sender_id IN (SELECT user_id FROM support_conversations WHERE id = NEW.conversation_id)
      THEN 'waiting_admin'
      ELSE 'waiting_customer'
    END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profile_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.profile_completion := calculate_profile_completion(NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_profile_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_quote_payment_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Se pagamento do sinal foi completado
  IF NEW.payment_type = 'deposit' AND NEW.status = 'completed' THEN
    UPDATE quotes 
    SET 
      payment_status = 'deposit_paid',
      deposit_paid_at = NEW.paid_at
    WHERE id = NEW.quote_id;
  END IF;
  
  -- Se pagamento final foi completado
  IF NEW.payment_type = 'final' AND NEW.status = 'completed' THEN
    UPDATE quotes 
    SET 
      payment_status = 'fully_paid',
      full_payment_at = NEW.paid_at
    WHERE id = NEW.quote_id;
  END IF;
  
  -- Se pagamento completo foi feito
  IF NEW.payment_type = 'full' AND NEW.status = 'completed' THEN
    UPDATE quotes 
    SET 
      payment_status = 'fully_paid',
      deposit_paid_at = NEW.paid_at,
      full_payment_at = NEW.paid_at
    WHERE id = NEW.quote_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_quote_payment_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subscription_deliveries_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_subscription_deliveries_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subscription_plans_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_subscription_plans_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subscriptions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_subscriptions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_collection"("p_collection_id" "uuid") RETURNS TABLE("issue_type" "text", "issue_description" "text", "severity" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verificar se tem personagens
  IF NOT EXISTS (SELECT 1 FROM collection_characters WHERE collection_id = p_collection_id) THEN
    RETURN QUERY SELECT 
      'no_characters'::TEXT, 
      'Coleção sem personagens cadastrados'::TEXT, 
      'critical'::TEXT;
  END IF;
  
  -- Verificar personagens sem data de lançamento
  RETURN QUERY
  SELECT 
    'missing_release_date'::TEXT,
    format('Personagem "%s" (#%s) sem data de lançamento', name, release_order)::TEXT,
    'warning'::TEXT
  FROM collection_characters
  WHERE collection_id = p_collection_id
  AND release_date IS NULL;
  
  -- Verificar personagens sem imagem
  RETURN QUERY
  SELECT 
    'missing_image'::TEXT,
    format('Personagem "%s" (#%s) sem imagem', name, release_order)::TEXT,
    'info'::TEXT
  FROM collection_characters
  WHERE collection_id = p_collection_id
  AND image_url IS NULL
  AND status != 'upcoming';
  
  -- Verificar conflitos de datas
  RETURN QUERY
  SELECT 
    'date_conflict'::TEXT,
    format('Personagens "%s" e "%s" têm a mesma data de lançamento (%s)', c1.name, c2.name, c1.release_date::TEXT)::TEXT,
    'warning'::TEXT
  FROM collection_characters c1
  JOIN collection_characters c2 ON c1.collection_id = c2.collection_id 
    AND c1.release_date = c2.release_date 
    AND c1.id < c2.id
  WHERE c1.collection_id = p_collection_id
  AND c1.release_date IS NOT NULL;
  
  -- Verificar datas no passado para personagens upcoming
  RETURN QUERY
  SELECT 
    'past_date'::TEXT,
    format('Personagem "%s" tem data no passado (%s) mas status é "%s"', name, release_date::TEXT, status)::TEXT,
    'warning'::TEXT
  FROM collection_characters
  WHERE collection_id = p_collection_id
  AND release_date < CURRENT_DATE
  AND status = 'upcoming';
END;
$$;


ALTER FUNCTION "public"."validate_collection"("p_collection_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_collection"("p_collection_id" "uuid") IS 'Valida uma coleção e retorna problemas encontrados';



CREATE OR REPLACE FUNCTION "public"."validate_coupon"("coupon_code" "text", "user_id_param" "uuid", "order_value_param" numeric) RETURNS TABLE("valid" boolean, "message" "text", "discount_amount" numeric, "coupon_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  coupon_record RECORD;
  usage_count INTEGER;
  user_usage_count INTEGER;
BEGIN
  -- Buscar cupom
  SELECT * INTO coupon_record
  FROM coupons
  WHERE code = coupon_code
  AND is_active = true
  AND valid_from <= now()
  AND (valid_until IS NULL OR valid_until >= now());
  
  -- Cupom não encontrado ou inválido
  IF coupon_record IS NULL THEN
    RETURN QUERY SELECT false, 'Cupom inválido ou expirado'::TEXT, 0::DECIMAL, NULL::UUID;
    RETURN;
  END IF;
  
  -- Verificar valor mínimo
  IF order_value_param < coupon_record.min_order_value THEN
    RETURN QUERY SELECT 
      false, 
      'Valor mínimo do pedido: R$ ' || coupon_record.min_order_value::TEXT,
      0::DECIMAL,
      NULL::UUID;
    RETURN;
  END IF;
  
  -- Verificar limite total de usos
  IF coupon_record.max_uses IS NOT NULL AND coupon_record.current_uses >= coupon_record.max_uses THEN
    RETURN QUERY SELECT false, 'Cupom esgotado'::TEXT, 0::DECIMAL, NULL::UUID;
    RETURN;
  END IF;
  
  -- Verificar limite por usuário
  SELECT COUNT(*) INTO user_usage_count
  FROM coupon_usage
  WHERE coupon_id = coupon_record.id
  AND user_id = user_id_param;
  
  IF user_usage_count >= coupon_record.max_uses_per_user THEN
    RETURN QUERY SELECT false, 'Você já usou este cupom'::TEXT, 0::DECIMAL, NULL::UUID;
    RETURN;
  END IF;
  
  -- Calcular desconto
  DECLARE
    discount DECIMAL;
  BEGIN
    IF coupon_record.discount_type = 'percentage' THEN
      discount := order_value_param * (coupon_record.discount_value / 100);
    ELSE
      discount := coupon_record.discount_value;
    END IF;
    
    -- Desconto não pode ser maior que o valor do pedido
    IF discount > order_value_param THEN
      discount := order_value_param;
    END IF;
    
    RETURN QUERY SELECT true, 'Cupom válido'::TEXT, discount, coupon_record.id;
  END;
END;
$_$;


ALTER FUNCTION "public"."validate_coupon"("coupon_code" "text", "user_id_param" "uuid", "order_value_param" numeric) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_name_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "franchise" "text",
    "category" "text",
    "subcategory" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "model" "text" DEFAULT 'openai/gpt-5-mini'::"text" NOT NULL
);


ALTER TABLE "public"."ai_name_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_processing_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "model_selected" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "total_images" integer NOT NULL,
    "processed_images" integer DEFAULT 0 NOT NULL,
    "failed_images" integer DEFAULT 0 NOT NULL,
    "total_cost_usd" numeric(10,6) DEFAULT 0,
    "total_tokens" integer DEFAULT 0,
    "avg_processing_time_ms" integer,
    "avg_confidence" double precision,
    "last_error" "text",
    "error_count" integer DEFAULT 0
);


ALTER TABLE "public"."ai_processing_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_processing_jobs" IS 'Tracks batch AI processing jobs for monitoring and statistics';



COMMENT ON COLUMN "public"."ai_processing_jobs"."status" IS 'Job status: pending, processing, completed, or failed';



CREATE TABLE IF NOT EXISTS "public"."ai_vision_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "image_hash" "text" NOT NULL,
    "image_url" "text" NOT NULL,
    "model_used" "text" NOT NULL,
    "confidence" double precision,
    "name" "text",
    "franchise" "text",
    "category" "text",
    "subcategory" "text",
    "tags" "text"[],
    "tokens_used" integer,
    "cost_usd" numeric(10,6),
    "processing_time_ms" integer,
    "accepted" boolean,
    "admin_edited" boolean
);


ALTER TABLE "public"."ai_vision_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_vision_cache" IS 'Caches AI vision classification results to avoid reprocessing identical images';



COMMENT ON COLUMN "public"."ai_vision_cache"."image_hash" IS 'SHA-256 hash of image content for deduplication';



COMMENT ON COLUMN "public"."ai_vision_cache"."confidence" IS 'AI confidence score (0-100) for the classification';



COMMENT ON COLUMN "public"."ai_vision_cache"."accepted" IS 'Whether admin accepted the suggestion without any edits';



CREATE TABLE IF NOT EXISTS "public"."collection_characters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "collection_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "release_order" integer NOT NULL,
    "status" "text" DEFAULT 'upcoming'::"text" NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "release_month" integer,
    "release_date" "date",
    "reveal_date" "date",
    "auto_reveal" boolean DEFAULT true,
    "auto_release" boolean DEFAULT true,
    "teaser_image_url" "text",
    "reveal_notification_sent" boolean DEFAULT false,
    "release_notification_sent" boolean DEFAULT false,
    "revealed_at" timestamp with time zone,
    "released_at" timestamp with time zone,
    "is_revealed" boolean DEFAULT false,
    CONSTRAINT "collection_characters_release_month_check" CHECK ((("release_month" >= 1) AND ("release_month" <= 12))),
    CONSTRAINT "collection_characters_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'revealed'::"text", 'released'::"text"])))
);


ALTER TABLE "public"."collection_characters" OWNER TO "postgres";


COMMENT ON TABLE "public"."collection_characters" IS 'Personagens/itens de cada coleção';



COMMENT ON COLUMN "public"."collection_characters"."release_month" IS 'Mês de lançamento do personagem (1-12)';



COMMENT ON COLUMN "public"."collection_characters"."release_date" IS 'Data exata de lançamento do personagem';



COMMENT ON COLUMN "public"."collection_characters"."reveal_date" IS 'Data de revelação do personagem';



COMMENT ON COLUMN "public"."collection_characters"."auto_reveal" IS 'Revelar automaticamente na data?';



COMMENT ON COLUMN "public"."collection_characters"."auto_release" IS 'Lançar automaticamente na data?';



CREATE TABLE IF NOT EXISTS "public"."collection_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "collection_id" "uuid",
    "character_id" "uuid",
    "event_type" "text" NOT NULL,
    "old_status" "text",
    "new_status" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "collection_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['reveal'::"text", 'release'::"text", 'status_change'::"text", 'notification_sent'::"text"])))
);


ALTER TABLE "public"."collection_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."collection_events" IS 'Histórico de eventos das coleções';



CREATE TABLE IF NOT EXISTS "public"."collection_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "collection_id" "uuid" NOT NULL,
    "model_id" "uuid" NOT NULL,
    "display_order" integer DEFAULT 0,
    "added_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."collection_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collection_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "collection_id" "uuid",
    "character_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "sent" boolean DEFAULT false,
    "sent_at" timestamp with time zone,
    "read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "scheduled_for" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "collection_notifications_type_check" CHECK (("type" = ANY (ARRAY['reveal'::"text", 'release'::"text", 'countdown'::"text", 'reminder'::"text"])))
);


ALTER TABLE "public"."collection_notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."collection_notifications" IS 'Notificações de coleções para usuários';



CREATE TABLE IF NOT EXISTS "public"."collections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "slug" "text" NOT NULL,
    "image_url" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cycle_year" integer DEFAULT 2026,
    "release_order" integer,
    "price_full" numeric(10,2) DEFAULT 500.00,
    "price_pix" numeric(10,2) DEFAULT 475.00,
    "deposit_amount" numeric(10,2) DEFAULT 100.00,
    "is_price_custom" boolean DEFAULT false,
    "cost_material" numeric(10,2) DEFAULT 50.00,
    "cost_labor" numeric(10,2) DEFAULT 80.00,
    "cost_packaging" numeric(10,2) DEFAULT 30.00,
    "cost_shipping" numeric(10,2) DEFAULT 40.00,
    "cost_other" numeric(10,2) DEFAULT 0.00,
    "cost_notes" "text",
    CONSTRAINT "collections_release_order_check" CHECK ((("release_order" >= 1) AND ("release_order" <= 4)))
);


ALTER TABLE "public"."collections" OWNER TO "postgres";


COMMENT ON COLUMN "public"."collections"."price_full" IS 'Preço cheio da peça avulsa (sem desconto)';



COMMENT ON COLUMN "public"."collections"."price_pix" IS 'Preço com desconto PIX (5% OFF padrão)';



COMMENT ON COLUMN "public"."collections"."deposit_amount" IS 'Valor da entrada para compra avulsa';



COMMENT ON COLUMN "public"."collections"."is_price_custom" IS 'Se true, usa preço customizado. Se false, usa preço padrão do sistema';



COMMENT ON COLUMN "public"."collections"."cost_material" IS 'Custo de material/resina por peça';



COMMENT ON COLUMN "public"."collections"."cost_labor" IS 'Custo de mão de obra (pintura, escultura)';



COMMENT ON COLUMN "public"."collections"."cost_packaging" IS 'Custo de embalagem MDF';



COMMENT ON COLUMN "public"."collections"."cost_shipping" IS 'Custo médio de frete';



COMMENT ON COLUMN "public"."collections"."cost_other" IS 'Outros custos (marketing, etc)';



COMMENT ON COLUMN "public"."collections"."cost_notes" IS 'Observações sobre custos';



CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_settings" IS 'Configurações globais do sistema Ordax';



CREATE OR REPLACE VIEW "public"."collection_pricing_view" AS
 SELECT "id",
    "name",
    "slug",
        CASE
            WHEN "is_price_custom" THEN "price_full"
            ELSE ( SELECT ("system_settings"."value")::numeric AS "value"
               FROM "public"."system_settings"
              WHERE ("system_settings"."key" = 'default_price_full'::"text"))
        END AS "price_full",
        CASE
            WHEN "is_price_custom" THEN "price_pix"
            ELSE ( SELECT ("system_settings"."value")::numeric AS "value"
               FROM "public"."system_settings"
              WHERE ("system_settings"."key" = 'default_price_pix'::"text"))
        END AS "price_pix",
        CASE
            WHEN "is_price_custom" THEN "deposit_amount"
            ELSE ( SELECT ("system_settings"."value")::numeric AS "value"
               FROM "public"."system_settings"
              WHERE ("system_settings"."key" = 'default_deposit_amount'::"text"))
        END AS "deposit_amount",
    "is_price_custom",
    "is_active"
   FROM "public"."collections" "c";


ALTER VIEW "public"."collection_pricing_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."collection_pricing_view" IS 'View com preços efetivos de cada coleção';



CREATE OR REPLACE VIEW "public"."collections_financial_summary" AS
 SELECT "id",
    "name",
    "slug",
    "is_active",
        CASE
            WHEN "is_price_custom" THEN "price_full"
            ELSE ( SELECT ("system_settings"."value")::numeric AS "value"
               FROM "public"."system_settings"
              WHERE ("system_settings"."key" = 'default_price_full'::"text"))
        END AS "price_full",
        CASE
            WHEN "is_price_custom" THEN "price_pix"
            ELSE ( SELECT ("system_settings"."value")::numeric AS "value"
               FROM "public"."system_settings"
              WHERE ("system_settings"."key" = 'default_price_pix'::"text"))
        END AS "price_pix",
    ((((COALESCE("cost_material", (0)::numeric) + COALESCE("cost_labor", (0)::numeric)) + COALESCE("cost_packaging", (0)::numeric)) + COALESCE("cost_shipping", (0)::numeric)) + COALESCE("cost_other", (0)::numeric)) AS "cost_total",
    (
        CASE
            WHEN "is_price_custom" THEN "price_pix"
            ELSE ( SELECT ("system_settings"."value")::numeric AS "value"
               FROM "public"."system_settings"
              WHERE ("system_settings"."key" = 'default_price_pix'::"text"))
        END - ((((COALESCE("cost_material", (0)::numeric) + COALESCE("cost_labor", (0)::numeric)) + COALESCE("cost_packaging", (0)::numeric)) + COALESCE("cost_shipping", (0)::numeric)) + COALESCE("cost_other", (0)::numeric))) AS "profit_pix_gross",
    "round"((((
        CASE
            WHEN "is_price_custom" THEN "price_pix"
            ELSE ( SELECT ("system_settings"."value")::numeric AS "value"
               FROM "public"."system_settings"
              WHERE ("system_settings"."key" = 'default_price_pix'::"text"))
        END - ((((COALESCE("cost_material", (0)::numeric) + COALESCE("cost_labor", (0)::numeric)) + COALESCE("cost_packaging", (0)::numeric)) + COALESCE("cost_shipping", (0)::numeric)) + COALESCE("cost_other", (0)::numeric))) / NULLIF(
        CASE
            WHEN "is_price_custom" THEN "price_pix"
            ELSE ( SELECT ("system_settings"."value")::numeric AS "value"
               FROM "public"."system_settings"
              WHERE ("system_settings"."key" = 'default_price_pix'::"text"))
        END, (0)::numeric)) * (100)::numeric), 2) AS "margin_pix_gross"
   FROM "public"."collections" "c";


ALTER VIEW "public"."collections_financial_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."collections_financial_summary" IS 'Resumo financeiro de todas as coleções';



CREATE TABLE IF NOT EXISTS "public"."collector_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "rarity" "text",
    "requirement_type" "text",
    "requirement_value" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "collector_badges_rarity_check" CHECK (("rarity" = ANY (ARRAY['common'::"text", 'rare'::"text", 'epic'::"text", 'legendary'::"text"])))
);


ALTER TABLE "public"."collector_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupon_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quote_id" "uuid",
    "discount_applied" numeric(10,2) NOT NULL,
    "order_value" numeric(10,2) NOT NULL,
    "used_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."coupon_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "discount_type" "text" NOT NULL,
    "discount_value" numeric(10,2) NOT NULL,
    "min_order_value" numeric(10,2) DEFAULT 0,
    "max_uses" integer,
    "max_uses_per_user" integer DEFAULT 1,
    "current_uses" integer DEFAULT 0,
    "applicable_to" "text",
    "applicable_ids" "text"[],
    "valid_from" timestamp with time zone DEFAULT "now"(),
    "valid_until" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "coupons_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed_amount'::"text"]))),
    CONSTRAINT "coupons_discount_value_check" CHECK (("discount_value" > (0)::numeric))
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."franchise_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "priority" integer DEFAULT 100 NOT NULL,
    "pattern" "text" NOT NULL,
    "franchise_canonical" "text" NOT NULL,
    "note" "text"
);


ALTER TABLE "public"."franchise_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."franchise_rules" IS 'Franchise mapping rules';



COMMENT ON COLUMN "public"."franchise_rules"."pattern" IS 'Pattern to match (case-insensitive). Ex: magneto, tobi, x-men';



COMMENT ON COLUMN "public"."franchise_rules"."franchise_canonical" IS 'Canonical franchise name to apply when pattern matches';



CREATE TABLE IF NOT EXISTS "public"."franchises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "canonical" "text" NOT NULL,
    "aliases" "text"[] DEFAULT '{}'::"text"[] NOT NULL
);


ALTER TABLE "public"."franchises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."images_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "original_filename" "text",
    "content_type" "text",
    "storage_bucket" "text" DEFAULT 'product-images'::"text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "status" "public"."queue_status" DEFAULT 'pending'::"public"."queue_status" NOT NULL,
    "last_error" "text",
    "name" "text",
    "franchise" "text",
    "category" "text",
    "subcategory" "text",
    "tags" "text"[],
    "priority_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ai_suggested_name" "text",
    "ai_confidence" numeric(3,2),
    "ai_model_used" "text",
    "image_hash" "text"
);


ALTER TABLE "public"."images_queue" OWNER TO "postgres";


COMMENT ON COLUMN "public"."images_queue"."ai_suggested_name" IS 'AI-suggested model name from vision analysis';



COMMENT ON COLUMN "public"."images_queue"."ai_confidence" IS 'Confidence score from AI (0.0 to 1.0)';



COMMENT ON COLUMN "public"."images_queue"."ai_model_used" IS 'AI model used for classification (e.g., gpt-4o-mini)';



COMMENT ON COLUMN "public"."images_queue"."image_hash" IS 'SHA-256 hash of image content for deduplication';



CREATE TABLE IF NOT EXISTS "public"."model_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "model_id" "uuid" NOT NULL
);


ALTER TABLE "public"."model_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."models" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "franchise" "text",
    "category" "text",
    "subcategory" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "image_bucket" "text" DEFAULT 'product-images'::"text" NOT NULL,
    "image_path" "text" NOT NULL
);


ALTER TABLE "public"."models" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_production" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "month" integer NOT NULL,
    "year" integer NOT NULL,
    "global_limit" integer DEFAULT 20 NOT NULL,
    "units_sold" integer DEFAULT 0 NOT NULL,
    "is_closed" boolean DEFAULT false,
    "closed_reason" "text",
    "closed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "monthly_production_closed_reason_check" CHECK (("closed_reason" = ANY (ARRAY['limit_reached'::"text", 'time_expired'::"text", 'manual'::"text"]))),
    CONSTRAINT "monthly_production_month_check" CHECK ((("month" >= 1) AND ("month" <= 12))),
    CONSTRAINT "monthly_production_year_check" CHECK (("year" >= 2026))
);


ALTER TABLE "public"."monthly_production" OWNER TO "postgres";


COMMENT ON TABLE "public"."monthly_production" IS 'Controle de limite de produção mensal';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "link" "text",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['order_update'::"text", 'quote_response'::"text", 'new_model'::"text", 'wishlist_available'::"text", 'badge_earned'::"text", 'level_up'::"text", 'system'::"text", 'promotion'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "payment_type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "payment_link" "text",
    "pix_key" "text",
    "instructions" "text",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "viewed_at" timestamp with time zone,
    "customer_confirmed_at" timestamp with time zone,
    "admin_confirmed_at" timestamp with time zone,
    "sent_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_links_payment_type_check" CHECK (("payment_type" = ANY (ARRAY['voucher'::"text", 'deposit'::"text", 'final'::"text", 'full'::"text"])))
);


ALTER TABLE "public"."payment_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_links" IS 'Manual payment links sent by admin to customers';



COMMENT ON COLUMN "public"."payment_links"."payment_type" IS 'Type of payment: voucher (R$100), deposit (sinal), final (restante), full (completo)';



COMMENT ON COLUMN "public"."payment_links"."customer_confirmed_at" IS 'When customer clicked "Já Paguei"';



COMMENT ON COLUMN "public"."payment_links"."admin_confirmed_at" IS 'When admin confirmed payment received';



CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "card_brand" "text",
    "card_last4" "text",
    "card_holder_name" "text",
    "card_expiry_month" integer,
    "card_expiry_year" integer,
    "pix_key" "text",
    "pix_key_type" "text",
    "is_default" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_methods_type_check" CHECK (("type" = ANY (ARRAY['credit_card'::"text", 'debit_card'::"text", 'pix'::"text", 'boleto'::"text"])))
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."preorder_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "default_deposit_percentage" numeric(5,2) DEFAULT 25.00,
    "default_deposit_fixed" numeric(10,2) DEFAULT 100.00,
    "deposit_type" "text" DEFAULT 'percentage'::"text",
    "deposit_payment_deadline_days" integer DEFAULT 3,
    "final_payment_deadline_days" integer DEFAULT 7,
    "deposit_notification_message" "text",
    "final_payment_notification_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "preorder_settings_deposit_type_check" CHECK (("deposit_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"])))
);


ALTER TABLE "public"."preorder_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."preorder_settings" IS 'Configurações do sistema de pré-venda';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "address" "text",
    "preferences_text" "text",
    "preference_tags" "text"[],
    "username" "text",
    "display_name" "text",
    "bio" "text",
    "avatar_url" "text",
    "is_public" boolean DEFAULT false,
    "collector_level" integer DEFAULT 1,
    "collector_xp" integer DEFAULT 0,
    "pieces_owned" integer DEFAULT 0,
    "total_spent" numeric(10,2) DEFAULT 0,
    "full_name" "text",
    "phone" "text",
    "whatsapp" "text",
    "cpf" "text",
    "birth_date" "date",
    "email_notifications" boolean DEFAULT true,
    "order_updates" boolean DEFAULT true,
    "marketing_emails" boolean DEFAULT false,
    "profile_completion" integer DEFAULT 0,
    "email" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."email" IS 'Email sincronizado de auth.users';



CREATE TABLE IF NOT EXISTS "public"."public_collection" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "model_id" "uuid" NOT NULL,
    "notes" "text",
    "display_order" integer DEFAULT 0,
    "added_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."public_collection" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "model_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "scale" "text" NOT NULL
);


ALTER TABLE "public"."quote_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "payment_type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "payment_method" "text",
    "transaction_id" "text",
    "payment_proof_url" "text",
    "metadata" "jsonb",
    "notes" "text",
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "quote_payments_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['pix'::"text", 'credit_card'::"text", 'debit_card'::"text", 'bank_transfer'::"text"]))),
    CONSTRAINT "quote_payments_payment_type_check" CHECK (("payment_type" = ANY (ARRAY['deposit'::"text", 'final'::"text", 'full'::"text"]))),
    CONSTRAINT "quote_payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."quote_payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."quote_payments" IS 'Transações de pagamento dos orçamentos';



COMMENT ON COLUMN "public"."quote_payments"."payment_type" IS 'Tipo: deposit (sinal), final (restante), full (completo)';



CREATE TABLE IF NOT EXISTS "public"."quote_production" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "current_stage" "text" DEFAULT 'queued'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quote_production" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_production_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "update_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "caption" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."quote_production_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_production_updates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "stage" "text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."quote_production_updates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "deadline" "text",
    "notes" "text",
    "total_amount" numeric(10,2) DEFAULT 0,
    "deposit_amount" numeric(10,2) DEFAULT 0,
    "remaining_amount" numeric(10,2) DEFAULT 0,
    "payment_status" "text" DEFAULT 'pending'::"text",
    "deposit_paid_at" timestamp with time zone,
    "full_payment_at" timestamp with time zone,
    "payment_method" "text",
    "is_preorder" boolean DEFAULT false,
    "ready_for_final_payment" boolean DEFAULT false,
    "final_payment_notified_at" timestamp with time zone,
    "payment_link" "text",
    "pix_key" "text",
    "payment_instructions" "text",
    "payment_link_sent_at" timestamp with time zone,
    "customer_paid_notification_at" timestamp with time zone,
    CONSTRAINT "quotes_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'deposit_paid'::"text", 'fully_paid'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."quotes"."payment_status" IS 'Status: pending, deposit_paid, fully_paid, cancelled';



COMMENT ON COLUMN "public"."quotes"."is_preorder" IS 'Se true, requer pagamento de sinal';



COMMENT ON COLUMN "public"."quotes"."ready_for_final_payment" IS 'Se true, cliente pode pagar o restante';



CREATE TABLE IF NOT EXISTS "public"."subscription_collection_changes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "old_collection_id" "uuid" NOT NULL,
    "new_collection_id" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscription_collection_changes" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscription_collection_changes" IS 'Histórico de trocas de coleção nas assinaturas';



COMMENT ON COLUMN "public"."subscription_collection_changes"."subscription_id" IS 'ID da assinatura';



COMMENT ON COLUMN "public"."subscription_collection_changes"."old_collection_id" IS 'Coleção anterior';



COMMENT ON COLUMN "public"."subscription_collection_changes"."new_collection_id" IS 'Nova coleção escolhida';



COMMENT ON COLUMN "public"."subscription_collection_changes"."changed_at" IS 'Data/hora da troca';



CREATE TABLE IF NOT EXISTS "public"."subscription_collections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "collection_id" "uuid" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription_collections" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscription_collections" IS 'Stores multiple collections per subscription. Trimestral=2, Semestral=3, Anual=all';



CREATE TABLE IF NOT EXISTS "public"."subscription_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "character_id" "uuid",
    "delivery_number" integer NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "reveal_date" timestamp with time zone,
    "expected_delivery_date" timestamp with time zone,
    "actual_delivery_date" timestamp with time zone,
    "tracking_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscription_deliveries_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'revealed'::"text", 'in_production'::"text", 'shipped'::"text", 'delivered'::"text"])))
);


ALTER TABLE "public"."subscription_deliveries" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscription_deliveries" IS 'Entregas programadas das assinaturas';



CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price_full" numeric(10,2) DEFAULT 0 NOT NULL,
    "price_pix" numeric(10,2) DEFAULT 0 NOT NULL,
    "collections_count" integer DEFAULT 1 NOT NULL,
    "collections_count_description" "text",
    "deliveries_total" integer DEFAULT 3 NOT NULL,
    "can_switch" boolean DEFAULT true NOT NULL,
    "switch_limit" integer,
    "switch_cutoff_days" integer DEFAULT 1 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "max_installments" integer DEFAULT 10 NOT NULL,
    CONSTRAINT "subscription_plans_plan_type_check" CHECK (("plan_type" = ANY (ARRAY['trimestral'::"text", 'semestral'::"text", 'anual'::"text"])))
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscription_plans" IS 'Configurable subscription plans with pricing and rules';



COMMENT ON COLUMN "public"."subscription_plans"."collections_count" IS '-1 means all collections, positive number means specific count';



COMMENT ON COLUMN "public"."subscription_plans"."switch_limit" IS 'NULL means unlimited switches, positive number means limited';



COMMENT ON COLUMN "public"."subscription_plans"."switch_cutoff_days" IS 'Days before production start when switching is blocked';



CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "collection_id" "uuid" NOT NULL,
    "plan_type" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "total_paid" numeric(10,2) DEFAULT 0 NOT NULL,
    "payment_method" "text",
    "payment_id" "text",
    "deliveries_total" integer DEFAULT 3 NOT NULL,
    "deliveries_completed" integer DEFAULT 0 NOT NULL,
    "next_delivery_date" timestamp with time zone,
    "next_production_start" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscriptions_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['pix'::"text", 'credit_card'::"text", 'boleto'::"text"]))),
    CONSTRAINT "subscriptions_plan_type_check" CHECK (("plan_type" = ANY (ARRAY['trimestral'::"text", 'semestral'::"text", 'anual'::"text"]))),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'cancelled'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscriptions" IS 'Assinaturas de coleções dos usuários';



COMMENT ON COLUMN "public"."subscriptions"."next_production_start" IS 'Data de início da produção do próximo personagem (data de corte para trocas)';



CREATE TABLE IF NOT EXISTS "public"."support_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "assigned_to" "uuid",
    "assigned_at" timestamp with time zone,
    "first_response_at" timestamp with time zone,
    "last_message_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "internal_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "support_conversations_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "support_conversations_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'waiting_admin'::"text", 'waiting_customer'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."support_conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."support_conversations" IS 'Conversas de suporte entre clientes e admins';



COMMENT ON COLUMN "public"."support_conversations"."status" IS 'new: nova conversa | waiting_admin: aguardando resposta admin | waiting_customer: aguardando resposta cliente | resolved: resolvida | closed: fechada';



CREATE TABLE IF NOT EXISTS "public"."support_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "is_internal" boolean DEFAULT false NOT NULL,
    "attachments" "text"[] DEFAULT '{}'::"text"[],
    "read_by_customer" boolean DEFAULT false NOT NULL,
    "read_by_admin" boolean DEFAULT false NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."support_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."support_messages" IS 'Mensagens individuais de cada conversa';



COMMENT ON COLUMN "public"."support_messages"."is_internal" IS 'Notas internas visíveis apenas para admins';



CREATE TABLE IF NOT EXISTS "public"."support_quick_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "shortcut" "text",
    "category" "text" DEFAULT 'geral'::"text" NOT NULL,
    "message" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "support_quick_replies_category_check" CHECK (("category" = ANY (ARRAY['geral'::"text", 'pedidos'::"text", 'pagamentos'::"text", 'producao'::"text", 'envio'::"text"])))
);


ALTER TABLE "public"."support_quick_replies" OWNER TO "postgres";


COMMENT ON TABLE "public"."support_quick_replies" IS 'Respostas rápidas pré-configuradas para admins';



COMMENT ON COLUMN "public"."support_quick_replies"."shortcut" IS 'Atalho de teclado (ex: Ctrl+1, Ctrl+2)';



CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "badge_id" "uuid" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wishlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "model_id" "uuid" NOT NULL,
    "notes" "text",
    "priority" integer DEFAULT 0,
    "notify_when_available" boolean DEFAULT false,
    "added_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wishlist" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_name_cache"
    ADD CONSTRAINT "ai_name_cache_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."ai_name_cache"
    ADD CONSTRAINT "ai_name_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_processing_jobs"
    ADD CONSTRAINT "ai_processing_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_vision_cache"
    ADD CONSTRAINT "ai_vision_cache_image_hash_key" UNIQUE ("image_hash");



ALTER TABLE ONLY "public"."ai_vision_cache"
    ADD CONSTRAINT "ai_vision_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collection_characters"
    ADD CONSTRAINT "collection_characters_collection_id_release_order_key" UNIQUE ("collection_id", "release_order");



ALTER TABLE ONLY "public"."collection_characters"
    ADD CONSTRAINT "collection_characters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collection_events"
    ADD CONSTRAINT "collection_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collection_items"
    ADD CONSTRAINT "collection_items_collection_id_model_id_key" UNIQUE ("collection_id", "model_id");



ALTER TABLE ONLY "public"."collection_items"
    ADD CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collection_notifications"
    ADD CONSTRAINT "collection_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."collector_badges"
    ADD CONSTRAINT "collector_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupon_usage"
    ADD CONSTRAINT "coupon_usage_coupon_id_quote_id_key" UNIQUE ("coupon_id", "quote_id");



ALTER TABLE ONLY "public"."coupon_usage"
    ADD CONSTRAINT "coupon_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."franchise_rules"
    ADD CONSTRAINT "franchise_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."franchises"
    ADD CONSTRAINT "franchises_canonical_key" UNIQUE ("canonical");



ALTER TABLE ONLY "public"."franchises"
    ADD CONSTRAINT "franchises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."images_queue"
    ADD CONSTRAINT "images_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."model_likes"
    ADD CONSTRAINT "model_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."model_likes"
    ADD CONSTRAINT "model_likes_user_id_model_id_key" UNIQUE ("user_id", "model_id");



ALTER TABLE ONLY "public"."models"
    ADD CONSTRAINT "models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_production"
    ADD CONSTRAINT "monthly_production_month_year_key" UNIQUE ("month", "year");



ALTER TABLE ONLY "public"."monthly_production"
    ADD CONSTRAINT "monthly_production_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_user_id_card_last4_card_expiry_month_card_e_key" UNIQUE ("user_id", "card_last4", "card_expiry_month", "card_expiry_year");



ALTER TABLE ONLY "public"."preorder_settings"
    ADD CONSTRAINT "preorder_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."public_collection"
    ADD CONSTRAINT "public_collection_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."public_collection"
    ADD CONSTRAINT "public_collection_user_id_model_id_key" UNIQUE ("user_id", "model_id");



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_payments"
    ADD CONSTRAINT "quote_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_production_photos"
    ADD CONSTRAINT "quote_production_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_production"
    ADD CONSTRAINT "quote_production_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_production"
    ADD CONSTRAINT "quote_production_quote_id_key" UNIQUE ("quote_id");



ALTER TABLE ONLY "public"."quote_production_updates"
    ADD CONSTRAINT "quote_production_updates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_collection_changes"
    ADD CONSTRAINT "subscription_collection_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_collections"
    ADD CONSTRAINT "subscription_collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_collections"
    ADD CONSTRAINT "subscription_collections_subscription_id_collection_id_key" UNIQUE ("subscription_id", "collection_id");



ALTER TABLE ONLY "public"."subscription_deliveries"
    ADD CONSTRAINT "subscription_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_deliveries"
    ADD CONSTRAINT "subscription_deliveries_subscription_id_delivery_number_key" UNIQUE ("subscription_id", "delivery_number");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_plan_type_key" UNIQUE ("plan_type");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_conversations"
    ADD CONSTRAINT "support_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_quick_replies"
    ADD CONSTRAINT "support_quick_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_quick_replies"
    ADD CONSTRAINT "support_quick_replies_shortcut_key" UNIQUE ("shortcut");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_badge_id_key" UNIQUE ("user_id", "badge_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "wishlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "wishlist_user_id_model_id_key" UNIQUE ("user_id", "model_id");



CREATE INDEX "franchise_rules_enabled_priority_idx" ON "public"."franchise_rules" USING "btree" ("enabled", "priority");



CREATE INDEX "franchise_rules_franchise_trgm_idx" ON "public"."franchise_rules" USING "gin" ("franchise_canonical" "extensions"."gin_trgm_ops");



CREATE INDEX "franchise_rules_pattern_trgm_idx" ON "public"."franchise_rules" USING "gin" ("pattern" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_ai_jobs_created_at" ON "public"."ai_processing_jobs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_jobs_created_by" ON "public"."ai_processing_jobs" USING "btree" ("created_by");



CREATE INDEX "idx_ai_jobs_status" ON "public"."ai_processing_jobs" USING "btree" ("status");



CREATE INDEX "idx_ai_vision_cache_accepted" ON "public"."ai_vision_cache" USING "btree" ("accepted") WHERE ("accepted" IS NOT NULL);



CREATE INDEX "idx_ai_vision_cache_created" ON "public"."ai_vision_cache" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_vision_cache_hash" ON "public"."ai_vision_cache" USING "btree" ("image_hash");



CREATE INDEX "idx_ai_vision_cache_model" ON "public"."ai_vision_cache" USING "btree" ("model_used");



CREATE INDEX "idx_characters_release_date" ON "public"."collection_characters" USING "btree" ("release_date");



CREATE INDEX "idx_characters_reveal_date" ON "public"."collection_characters" USING "btree" ("reveal_date");



CREATE INDEX "idx_characters_status" ON "public"."collection_characters" USING "btree" ("status");



CREATE INDEX "idx_collection_changes_date" ON "public"."subscription_collection_changes" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_collection_changes_subscription" ON "public"."subscription_collection_changes" USING "btree" ("subscription_id");



CREATE INDEX "idx_collection_characters_collection" ON "public"."collection_characters" USING "btree" ("collection_id");



CREATE INDEX "idx_collection_characters_month" ON "public"."collection_characters" USING "btree" ("release_month");



CREATE INDEX "idx_collection_characters_order" ON "public"."collection_characters" USING "btree" ("release_order");



CREATE INDEX "idx_collection_items_collection_id" ON "public"."collection_items" USING "btree" ("collection_id");



CREATE INDEX "idx_collection_items_model_id" ON "public"."collection_items" USING "btree" ("model_id");



CREATE INDEX "idx_collections_active" ON "public"."collections" USING "btree" ("is_active");



CREATE INDEX "idx_collections_costs" ON "public"."collections" USING "btree" ("cost_material", "cost_labor", "cost_packaging");



CREATE INDEX "idx_collections_pricing" ON "public"."collections" USING "btree" ("is_price_custom", "price_full");



CREATE INDEX "idx_collections_slug" ON "public"."collections" USING "btree" ("slug");



CREATE INDEX "idx_coupon_usage_coupon_id" ON "public"."coupon_usage" USING "btree" ("coupon_id");



CREATE INDEX "idx_coupon_usage_used_at" ON "public"."coupon_usage" USING "btree" ("used_at" DESC);



CREATE INDEX "idx_coupon_usage_user_id" ON "public"."coupon_usage" USING "btree" ("user_id");



CREATE INDEX "idx_coupons_active" ON "public"."coupons" USING "btree" ("is_active", "valid_from", "valid_until");



CREATE INDEX "idx_coupons_code" ON "public"."coupons" USING "btree" ("code") WHERE ("is_active" = true);



CREATE INDEX "idx_events_character" ON "public"."collection_events" USING "btree" ("character_id");



CREATE INDEX "idx_events_collection" ON "public"."collection_events" USING "btree" ("collection_id");



CREATE INDEX "idx_events_created" ON "public"."collection_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_events_type" ON "public"."collection_events" USING "btree" ("event_type");



CREATE INDEX "idx_images_queue_created_at" ON "public"."images_queue" USING "btree" ("created_at");



CREATE INDEX "idx_images_queue_status" ON "public"."images_queue" USING "btree" ("status");



CREATE INDEX "idx_model_likes_model_id" ON "public"."model_likes" USING "btree" ("model_id");



CREATE INDEX "idx_model_likes_user_id" ON "public"."model_likes" USING "btree" ("user_id");



CREATE INDEX "idx_models_category" ON "public"."models" USING "btree" ("category");



CREATE INDEX "idx_models_franchise" ON "public"."models" USING "btree" ("franchise");



CREATE INDEX "idx_models_subcategory" ON "public"."models" USING "btree" ("subcategory");



CREATE INDEX "idx_monthly_production_period" ON "public"."monthly_production" USING "btree" ("year", "month");



CREATE INDEX "idx_monthly_production_status" ON "public"."monthly_production" USING "btree" ("is_closed");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_scheduled" ON "public"."collection_notifications" USING "btree" ("scheduled_for");



CREATE INDEX "idx_notifications_sent" ON "public"."collection_notifications" USING "btree" ("sent");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_notifications_user" ON "public"."collection_notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_payment_links_quote" ON "public"."payment_links" USING "btree" ("quote_id");



CREATE INDEX "idx_payment_links_type" ON "public"."payment_links" USING "btree" ("payment_type");



CREATE INDEX "idx_payment_methods_default" ON "public"."payment_methods" USING "btree" ("user_id", "is_default") WHERE ("is_default" = true);



CREATE INDEX "idx_payment_methods_user_id" ON "public"."payment_methods" USING "btree" ("user_id");



CREATE INDEX "idx_payments_quote" ON "public"."quote_payments" USING "btree" ("quote_id");



CREATE INDEX "idx_payments_status" ON "public"."quote_payments" USING "btree" ("status");



CREATE INDEX "idx_payments_type" ON "public"."quote_payments" USING "btree" ("payment_type");



CREATE INDEX "idx_profiles_cpf" ON "public"."profiles" USING "btree" ("cpf") WHERE ("cpf" IS NOT NULL);



CREATE INDEX "idx_profiles_phone" ON "public"."profiles" USING "btree" ("phone") WHERE ("phone" IS NOT NULL);



CREATE INDEX "idx_profiles_whatsapp" ON "public"."profiles" USING "btree" ("whatsapp") WHERE ("whatsapp" IS NOT NULL);



CREATE INDEX "idx_public_collection_model_id" ON "public"."public_collection" USING "btree" ("model_id");



CREATE INDEX "idx_public_collection_user_id" ON "public"."public_collection" USING "btree" ("user_id");



CREATE INDEX "idx_quote_items_model_id" ON "public"."quote_items" USING "btree" ("model_id");



CREATE INDEX "idx_quote_items_quote_id" ON "public"."quote_items" USING "btree" ("quote_id");



CREATE INDEX "idx_quotes_created_at" ON "public"."quotes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_quotes_is_preorder" ON "public"."quotes" USING "btree" ("is_preorder");



CREATE INDEX "idx_quotes_payment_link_sent" ON "public"."quotes" USING "btree" ("payment_link_sent_at");



CREATE INDEX "idx_quotes_payment_status" ON "public"."quotes" USING "btree" ("payment_status");



CREATE INDEX "idx_quotes_ready_for_final_payment" ON "public"."quotes" USING "btree" ("ready_for_final_payment");



CREATE INDEX "idx_quotes_status" ON "public"."quotes" USING "btree" ("status");



CREATE INDEX "idx_quotes_user_id" ON "public"."quotes" USING "btree" ("user_id");



CREATE INDEX "idx_subscription_collections_collection" ON "public"."subscription_collections" USING "btree" ("collection_id");



CREATE INDEX "idx_subscription_collections_subscription" ON "public"."subscription_collections" USING "btree" ("subscription_id");



CREATE INDEX "idx_subscription_deliveries_status" ON "public"."subscription_deliveries" USING "btree" ("status");



CREATE INDEX "idx_subscription_deliveries_subscription" ON "public"."subscription_deliveries" USING "btree" ("subscription_id");



CREATE INDEX "idx_subscription_plans_display_order" ON "public"."subscription_plans" USING "btree" ("display_order");



CREATE INDEX "idx_subscription_plans_is_active" ON "public"."subscription_plans" USING "btree" ("is_active");



CREATE INDEX "idx_subscription_plans_plan_type" ON "public"."subscription_plans" USING "btree" ("plan_type");



CREATE INDEX "idx_subscriptions_collection" ON "public"."subscriptions" USING "btree" ("collection_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_user" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_support_conversations_assigned" ON "public"."support_conversations" USING "btree" ("assigned_to");



CREATE INDEX "idx_support_conversations_last_message" ON "public"."support_conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_support_conversations_status" ON "public"."support_conversations" USING "btree" ("status");



CREATE INDEX "idx_support_conversations_user" ON "public"."support_conversations" USING "btree" ("user_id");



CREATE INDEX "idx_support_messages_conversation" ON "public"."support_messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "idx_support_messages_sender" ON "public"."support_messages" USING "btree" ("sender_id");



CREATE INDEX "idx_support_messages_unread_admin" ON "public"."support_messages" USING "btree" ("conversation_id") WHERE (("is_internal" = false) AND ("read_by_admin" = false));



CREATE INDEX "idx_support_messages_unread_customer" ON "public"."support_messages" USING "btree" ("conversation_id") WHERE (("is_internal" = false) AND ("read_by_customer" = false));



CREATE INDEX "idx_support_quick_replies_active" ON "public"."support_quick_replies" USING "btree" ("is_active");



CREATE INDEX "idx_support_quick_replies_category" ON "public"."support_quick_replies" USING "btree" ("category");



CREATE INDEX "idx_support_quick_replies_shortcut" ON "public"."support_quick_replies" USING "btree" ("shortcut") WHERE ("shortcut" IS NOT NULL);



CREATE INDEX "idx_user_badges_badge_id" ON "public"."user_badges" USING "btree" ("badge_id");



CREATE INDEX "idx_user_badges_user_id" ON "public"."user_badges" USING "btree" ("user_id");



CREATE INDEX "idx_wishlist_model_id" ON "public"."wishlist" USING "btree" ("model_id");



CREATE INDEX "idx_wishlist_priority" ON "public"."wishlist" USING "btree" ("user_id", "priority" DESC);



CREATE INDEX "idx_wishlist_user_id" ON "public"."wishlist" USING "btree" ("user_id");



CREATE INDEX "images_queue_ai_suggested_name_idx" ON "public"."images_queue" USING "btree" ("ai_suggested_name") WHERE ("ai_suggested_name" IS NULL);



CREATE INDEX "images_queue_image_hash_idx" ON "public"."images_queue" USING "btree" ("image_hash") WHERE ("image_hash" IS NOT NULL);



CREATE INDEX "images_queue_status_priority_at_idx" ON "public"."images_queue" USING "btree" ("status", "priority_at");



CREATE OR REPLACE TRIGGER "collection_characters_updated_at" BEFORE UPDATE ON "public"."collection_characters" FOR EACH ROW EXECUTE FUNCTION "public"."update_collection_characters_updated_at"();



CREATE OR REPLACE TRIGGER "collections_updated_at" BEFORE UPDATE ON "public"."collections" FOR EACH ROW EXECUTE FUNCTION "public"."update_collections_updated_at"();



CREATE OR REPLACE TRIGGER "set_franchise_rules_updated_at" BEFORE UPDATE ON "public"."franchise_rules" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_images_queue_updated_at" BEFORE UPDATE ON "public"."images_queue" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "subscription_deliveries_updated_at" BEFORE UPDATE ON "public"."subscription_deliveries" FOR EACH ROW EXECUTE FUNCTION "public"."update_subscription_deliveries_updated_at"();



CREATE OR REPLACE TRIGGER "subscription_plans_updated_at" BEFORE UPDATE ON "public"."subscription_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_subscription_plans_updated_at"();



CREATE OR REPLACE TRIGGER "subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_subscriptions_updated_at"();



CREATE OR REPLACE TRIGGER "trg_ai_jobs_updated_at" BEFORE UPDATE ON "public"."ai_processing_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_ai_name_cache_updated_at" BEFORE UPDATE ON "public"."ai_name_cache" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_images_queue_updated_at" BEFORE UPDATE ON "public"."images_queue" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_models_updated_at" BEFORE UPDATE ON "public"."models" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_quote_production_updated_at" BEFORE UPDATE ON "public"."quote_production" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_quotes_updated_at" BEFORE UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_coupons_updated_at" BEFORE UPDATE ON "public"."coupons" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_ensure_single_default_payment" BEFORE INSERT OR UPDATE ON "public"."payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_default_payment"();



CREATE OR REPLACE TRIGGER "trigger_increment_coupon_usage" AFTER INSERT ON "public"."coupon_usage" FOR EACH ROW EXECUTE FUNCTION "public"."increment_coupon_usage"();



CREATE OR REPLACE TRIGGER "trigger_mark_first_admin_response" AFTER INSERT ON "public"."support_messages" FOR EACH ROW EXECUTE FUNCTION "public"."mark_first_admin_response"();



CREATE OR REPLACE TRIGGER "trigger_notify_payment_link_sent" AFTER INSERT ON "public"."payment_links" FOR EACH ROW EXECUTE FUNCTION "public"."notify_payment_link_sent"();



CREATE OR REPLACE TRIGGER "trigger_payment_methods_updated_at" BEFORE UPDATE ON "public"."payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_collection_pix_price" BEFORE UPDATE ON "public"."collections" FOR EACH ROW EXECUTE FUNCTION "public"."update_collection_pix_price"();



CREATE OR REPLACE TRIGGER "trigger_update_conversation_last_message" AFTER INSERT ON "public"."support_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message"();



CREATE OR REPLACE TRIGGER "trigger_update_profile_completion" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_profile_completion"();



CREATE OR REPLACE TRIGGER "trigger_update_quote_payment_status" AFTER INSERT OR UPDATE ON "public"."quote_payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_quote_payment_status"();



CREATE OR REPLACE TRIGGER "update_support_conversations_updated_at" BEFORE UPDATE ON "public"."support_conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_support_quick_replies_updated_at" BEFORE UPDATE ON "public"."support_quick_replies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."ai_processing_jobs"
    ADD CONSTRAINT "ai_processing_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_characters"
    ADD CONSTRAINT "collection_characters_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_events"
    ADD CONSTRAINT "collection_events_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."collection_characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_events"
    ADD CONSTRAINT "collection_events_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_items"
    ADD CONSTRAINT "collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_items"
    ADD CONSTRAINT "collection_items_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_notifications"
    ADD CONSTRAINT "collection_notifications_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."collection_characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_notifications"
    ADD CONSTRAINT "collection_notifications_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_notifications"
    ADD CONSTRAINT "collection_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_usage"
    ADD CONSTRAINT "coupon_usage_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_usage"
    ADD CONSTRAINT "coupon_usage_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."coupon_usage"
    ADD CONSTRAINT "coupon_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."model_likes"
    ADD CONSTRAINT "model_likes_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."model_likes"
    ADD CONSTRAINT "model_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."public_collection"
    ADD CONSTRAINT "public_collection_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."public_collection"
    ADD CONSTRAINT "public_collection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_payments"
    ADD CONSTRAINT "quote_payments_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_production_photos"
    ADD CONSTRAINT "quote_production_photos_update_id_fkey" FOREIGN KEY ("update_id") REFERENCES "public"."quote_production_updates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_collection_changes"
    ADD CONSTRAINT "subscription_collection_changes_new_collection_id_fkey" FOREIGN KEY ("new_collection_id") REFERENCES "public"."collections"("id");



ALTER TABLE ONLY "public"."subscription_collection_changes"
    ADD CONSTRAINT "subscription_collection_changes_old_collection_id_fkey" FOREIGN KEY ("old_collection_id") REFERENCES "public"."collections"("id");



ALTER TABLE ONLY "public"."subscription_collection_changes"
    ADD CONSTRAINT "subscription_collection_changes_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_collections"
    ADD CONSTRAINT "subscription_collections_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_collections"
    ADD CONSTRAINT "subscription_collections_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_deliveries"
    ADD CONSTRAINT "subscription_deliveries_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."collection_characters"("id");



ALTER TABLE ONLY "public"."subscription_deliveries"
    ADD CONSTRAINT "subscription_deliveries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_conversations"
    ADD CONSTRAINT "support_conversations_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_conversations"
    ADD CONSTRAINT "support_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."support_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."collector_badges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "wishlist_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "wishlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage all characters" ON "public"."collection_characters" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage all deliveries" ON "public"."subscription_deliveries" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage all notifications" ON "public"."collection_notifications" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage all payment links" ON "public"."payment_links" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage all payments" ON "public"."quote_payments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage all plans" ON "public"."subscription_plans" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage all subscription collections" ON "public"."subscription_collections" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage all subscriptions" ON "public"."subscriptions" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all collection changes" ON "public"."subscription_collection_changes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all events" ON "public"."collection_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all subscriptions" ON "public"."subscriptions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins podem atualizar mensagens" ON "public"."support_messages" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins podem enviar mensagens" ON "public"."support_messages" FOR INSERT WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") AND ("auth"."uid"() = "sender_id")));



CREATE POLICY "Admins podem gerenciar respostas rápidas" ON "public"."support_quick_replies" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins podem ver todas as coleções" ON "public"."collections" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins podem ver todos os itens" ON "public"."collection_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins veem todas as conversas" ON "public"."support_conversations" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins veem todas as mensagens" ON "public"."support_messages" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Anyone can view active plans" ON "public"."subscription_plans" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view characters of active collections" ON "public"."collection_characters" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."collections"
  WHERE (("collections"."id" = "collection_characters"."collection_id") AND ("collections"."is_active" = true)))));



CREATE POLICY "Anyone can view preorder settings" ON "public"."preorder_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Apenas admins podem atualizar configurações" ON "public"."system_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Apenas admins podem gerenciar badges" ON "public"."collector_badges" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Apenas admins podem gerenciar coleções" ON "public"."collections" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Apenas admins podem gerenciar itens" ON "public"."collection_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Apenas admins podem gerenciar produção" ON "public"."monthly_production" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Badges de usuários públicos são visíveis" ON "public"."user_badges" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "user_badges"."user_id") AND ("profiles"."is_public" = true)))));



CREATE POLICY "Badges são públicos para leitura" ON "public"."collector_badges" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Coleções ativas são públicas" ON "public"."collections" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Coleções públicas são visíveis" ON "public"."public_collection" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "public_collection"."user_id") AND ("profiles"."is_public" = true)))));



CREATE POLICY "Itens de coleções ativas são públicos" ON "public"."collection_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."collections"
  WHERE (("collections"."id" = "collection_items"."collection_id") AND ("collections"."is_active" = true)))));



CREATE POLICY "Only admins can manage preorder settings" ON "public"."preorder_settings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Sistema pode inserir badges" ON "public"."user_badges" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Todos podem ler configurações" ON "public"."system_settings" FOR SELECT USING (true);



CREATE POLICY "Todos podem ler produção mensal" ON "public"."monthly_production" FOR SELECT USING (true);



CREATE POLICY "Users can create their own payments" ON "public"."quote_payments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."quotes"
  WHERE (("quotes"."id" = "quote_payments"."quote_id") AND ("quotes"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create their own subscriptions" ON "public"."subscriptions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own collection changes" ON "public"."subscription_collection_changes" FOR INSERT WITH CHECK (("subscription_id" IN ( SELECT "subscriptions"."id"
   FROM "public"."subscriptions"
  WHERE ("subscriptions"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own notifications" ON "public"."collection_notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own payment links" ON "public"."payment_links" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."quotes"
  WHERE (("quotes"."id" = "payment_links"."quote_id") AND ("quotes"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."quotes"
  WHERE (("quotes"."id" = "payment_links"."quote_id") AND ("quotes"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own subscriptions" ON "public"."subscriptions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view events of their subscribed collections" ON "public"."collection_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."subscriptions"
  WHERE (("subscriptions"."user_id" = "auth"."uid"()) AND ("subscriptions"."collection_id" = "collection_events"."collection_id") AND ("subscriptions"."status" = 'active'::"text")))));



CREATE POLICY "Users can view their own collection changes" ON "public"."subscription_collection_changes" FOR SELECT USING (("subscription_id" IN ( SELECT "subscriptions"."id"
   FROM "public"."subscriptions"
  WHERE ("subscriptions"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own deliveries" ON "public"."subscription_deliveries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."subscriptions"
  WHERE (("subscriptions"."id" = "subscription_deliveries"."subscription_id") AND ("subscriptions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own notifications" ON "public"."collection_notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own payment links" ON "public"."payment_links" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."quotes"
  WHERE (("quotes"."id" = "payment_links"."quote_id") AND ("quotes"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own payments" ON "public"."quote_payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."quotes"
  WHERE (("quotes"."id" = "quote_payments"."quote_id") AND ("quotes"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own subscriptions" ON "public"."subscriptions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their subscription collections" ON "public"."subscription_collections" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."subscriptions"
  WHERE (("subscriptions"."id" = "subscription_collections"."subscription_id") AND ("subscriptions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem criar conversas" ON "public"."support_conversations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem enviar mensagens em suas conversas" ON "public"."support_messages" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."support_conversations"
  WHERE (("support_conversations"."id" = "support_messages"."conversation_id") AND ("support_conversations"."user_id" = "auth"."uid"())))) AND ("auth"."uid"() = "sender_id") AND ("is_internal" = false)));



CREATE POLICY "Usuários podem gerenciar sua própria coleção" ON "public"."public_collection" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Usuários podem ver seus próprios badges" ON "public"."user_badges" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Usuários veem mensagens de suas conversas" ON "public"."support_messages" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."support_conversations"
  WHERE (("support_conversations"."id" = "support_messages"."conversation_id") AND ("support_conversations"."user_id" = "auth"."uid"())))) AND ("is_internal" = false)));



CREATE POLICY "Usuários veem suas próprias conversas" ON "public"."support_conversations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "admins_delete_jobs" ON "public"."ai_processing_jobs" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_delete_models" ON "public"."models" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_delete_vision_cache" ON "public"."ai_vision_cache" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_insert_jobs" ON "public"."ai_processing_jobs" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "admins_insert_models" ON "public"."models" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "admins_insert_profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_insert_queue" ON "public"."images_queue" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "admins_insert_vision_cache" ON "public"."ai_vision_cache" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_manage_coupons" ON "public"."coupons" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "admins_manage_franchise_rules" ON "public"."franchise_rules" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_manage_notifications" ON "public"."notifications" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "admins_manage_roles" ON "public"."user_roles" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_select_cache" ON "public"."ai_name_cache" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_select_franchise_rules" ON "public"."franchise_rules" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_select_jobs" ON "public"."ai_processing_jobs" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_select_payment_methods" ON "public"."payment_methods" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "admins_select_profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_select_queue" ON "public"."images_queue" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_select_quote_items" ON "public"."quote_items" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_select_quotes" ON "public"."quotes" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_select_vision_cache" ON "public"."ai_vision_cache" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_update_jobs" ON "public"."ai_processing_jobs" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_update_models" ON "public"."models" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_update_profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_update_queue" ON "public"."images_queue" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_update_quotes" ON "public"."quotes" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_update_vision_cache" ON "public"."ai_vision_cache" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_view_all_coupon_usage" ON "public"."coupon_usage" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "admins_view_all_wishlists" ON "public"."wishlist" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "admins_write_cache" ON "public"."ai_name_cache" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admins_write_franchises" ON "public"."franchises" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



ALTER TABLE "public"."ai_processing_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_vision_cache" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_manage_franchise_rules" ON "public"."franchise_rules" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_select_franchise_rules" ON "public"."franchise_rules" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."collection_characters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collection_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collection_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collection_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collector_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupon_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."model_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monthly_production" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."preorder_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "production_admin_write" ON "public"."quote_production" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "production_photos_admin_write" ON "public"."quote_production_photos" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "production_photos_select_own" ON "public"."quote_production_photos" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_production_photos"."quote_id") AND ("q"."user_id" = "auth"."uid"())))));



CREATE POLICY "production_select_own" ON "public"."quote_production" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_production"."quote_id") AND ("q"."user_id" = "auth"."uid"())))));



CREATE POLICY "production_updates_admin_write" ON "public"."quote_production_updates" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "production_updates_select_own" ON "public"."quote_production_updates" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_production_updates"."quote_id") AND ("q"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."public_collection" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_select_franchises" ON "public"."franchises" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "public_select_models" ON "public"."models" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."quote_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_production" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_production_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_production_updates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_collection_changes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_collections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_quick_replies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_insert_coupon_usage" ON "public"."coupon_usage" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "system_insert_profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_delete_own_likes" ON "public"."model_likes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_delete_own_notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users_delete_own_payment_methods" ON "public"."payment_methods" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users_delete_own_quote_items" ON "public"."quote_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."quotes"
  WHERE (("quotes"."id" = "quote_items"."quote_id") AND ("quotes"."user_id" = "auth"."uid"())))));



CREATE POLICY "users_insert_own_likes" ON "public"."model_likes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_insert_own_payment_methods" ON "public"."payment_methods" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_insert_own_quote_items" ON "public"."quote_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."quotes"
  WHERE (("quotes"."id" = "quote_items"."quote_id") AND ("quotes"."user_id" = "auth"."uid"())))));



CREATE POLICY "users_insert_own_quotes" ON "public"."quotes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_manage_own_wishlist" ON "public"."wishlist" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_select_own_likes" ON "public"."model_likes" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_select_own_payment_methods" ON "public"."payment_methods" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users_select_own_profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "users_select_own_quote_items" ON "public"."quote_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."quotes"
  WHERE (("quotes"."id" = "quote_items"."quote_id") AND ("quotes"."user_id" = "auth"."uid"())))));



CREATE POLICY "users_select_own_quotes" ON "public"."quotes" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_update_own_notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_update_own_payment_methods" ON "public"."payment_methods" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_update_own_profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users_update_own_quotes" ON "public"."quotes" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_view_active_coupons" ON "public"."coupons" FOR SELECT TO "authenticated" USING ((("is_active" = true) AND ("valid_from" <= "now"()) AND (("valid_until" IS NULL) OR ("valid_until" >= "now"()))));



CREATE POLICY "users_view_own_coupon_usage" ON "public"."coupon_usage" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users_view_own_notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."wishlist" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































































































































GRANT ALL ON FUNCTION "public"."admin_list_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_list_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."are_sales_open"() TO "anon";
GRANT ALL ON FUNCTION "public"."are_sales_open"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."are_sales_open"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_update_character_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_update_character_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_update_character_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_pix_price"("p_price_full" numeric, "p_discount_percentage" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_pix_price"("p_price_full" numeric, "p_discount_percentage" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_pix_price"("p_price_full" numeric, "p_discount_percentage" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_preorder_amounts"("p_total_amount" numeric, "p_deposit_type" "text", "p_deposit_value" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_preorder_amounts"("p_total_amount" numeric, "p_deposit_type" "text", "p_deposit_value" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_preorder_amounts"("p_total_amount" numeric, "p_deposit_type" "text", "p_deposit_value" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_production_cost"("p_collection_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_production_cost"("p_collection_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_production_cost"("p_collection_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_production_start_date"("delivery_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_production_start_date"("delivery_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_production_start_date"("delivery_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_profile_completion"("profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_profile_completion"("profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_profile_completion"("profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."close_monthly_sales"("reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."close_monthly_sales"("reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_monthly_sales"("reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_default_payment"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_default_payment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_default_payment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_collection_financial_analysis"("p_collection_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_collection_financial_analysis"("p_collection_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_collection_financial_analysis"("p_collection_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_collection_pricing"("p_collection_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_collection_pricing"("p_collection_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_collection_pricing"("p_collection_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_collection_stats"("p_collection_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_collection_stats"("p_collection_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_collection_stats"("p_collection_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_production_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_production_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_production_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_release"("p_collection_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_release"("p_collection_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_release"("p_collection_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_coupon_usage"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_coupon_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_coupon_usage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_monthly_sales"("quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_monthly_sales"("quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_monthly_sales"("quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_quick_reply_usage"("p_quick_reply_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_quick_reply_usage"("p_quick_reply_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_quick_reply_usage"("p_quick_reply_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_as_read"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_as_read"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_as_read"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_first_admin_response"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_first_admin_response"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_first_admin_response"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_as_read"("notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_as_read"("notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_as_read"("notification_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_payment_link_sent"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_payment_link_sent"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_payment_link_sent"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reopen_monthly_sales"() TO "anon";
GRANT ALL ON FUNCTION "public"."reopen_monthly_sales"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reopen_monthly_sales"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_collection_characters_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_collection_characters_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_collection_characters_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_collection_pix_price"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_collection_pix_price"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_collection_pix_price"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_collections_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_collections_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_collections_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_profile_completion"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_profile_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_profile_completion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_quote_payment_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_quote_payment_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_quote_payment_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subscription_deliveries_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_subscription_deliveries_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subscription_deliveries_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subscription_plans_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_subscription_plans_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subscription_plans_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subscriptions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_subscriptions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subscriptions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_collection"("p_collection_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_collection"("p_collection_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_collection"("p_collection_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_coupon"("coupon_code" "text", "user_id_param" "uuid", "order_value_param" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_coupon"("coupon_code" "text", "user_id_param" "uuid", "order_value_param" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_coupon"("coupon_code" "text", "user_id_param" "uuid", "order_value_param" numeric) TO "service_role";


















GRANT ALL ON TABLE "public"."ai_name_cache" TO "anon";
GRANT ALL ON TABLE "public"."ai_name_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_name_cache" TO "service_role";



GRANT ALL ON TABLE "public"."ai_processing_jobs" TO "anon";
GRANT ALL ON TABLE "public"."ai_processing_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_processing_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."ai_vision_cache" TO "anon";
GRANT ALL ON TABLE "public"."ai_vision_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_vision_cache" TO "service_role";



GRANT ALL ON TABLE "public"."collection_characters" TO "anon";
GRANT ALL ON TABLE "public"."collection_characters" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_characters" TO "service_role";



GRANT ALL ON TABLE "public"."collection_events" TO "anon";
GRANT ALL ON TABLE "public"."collection_events" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_events" TO "service_role";



GRANT ALL ON TABLE "public"."collection_items" TO "anon";
GRANT ALL ON TABLE "public"."collection_items" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_items" TO "service_role";



GRANT ALL ON TABLE "public"."collection_notifications" TO "anon";
GRANT ALL ON TABLE "public"."collection_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."collections" TO "anon";
GRANT ALL ON TABLE "public"."collections" TO "authenticated";
GRANT ALL ON TABLE "public"."collections" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."collection_pricing_view" TO "anon";
GRANT ALL ON TABLE "public"."collection_pricing_view" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_pricing_view" TO "service_role";



GRANT ALL ON TABLE "public"."collections_financial_summary" TO "anon";
GRANT ALL ON TABLE "public"."collections_financial_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."collections_financial_summary" TO "service_role";



GRANT ALL ON TABLE "public"."collector_badges" TO "anon";
GRANT ALL ON TABLE "public"."collector_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."collector_badges" TO "service_role";



GRANT ALL ON TABLE "public"."coupon_usage" TO "anon";
GRANT ALL ON TABLE "public"."coupon_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."coupon_usage" TO "service_role";



GRANT ALL ON TABLE "public"."coupons" TO "anon";
GRANT ALL ON TABLE "public"."coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."coupons" TO "service_role";



GRANT ALL ON TABLE "public"."franchise_rules" TO "anon";
GRANT ALL ON TABLE "public"."franchise_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."franchise_rules" TO "service_role";



GRANT ALL ON TABLE "public"."franchises" TO "anon";
GRANT ALL ON TABLE "public"."franchises" TO "authenticated";
GRANT ALL ON TABLE "public"."franchises" TO "service_role";



GRANT ALL ON TABLE "public"."images_queue" TO "anon";
GRANT ALL ON TABLE "public"."images_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."images_queue" TO "service_role";



GRANT ALL ON TABLE "public"."model_likes" TO "anon";
GRANT ALL ON TABLE "public"."model_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."model_likes" TO "service_role";



GRANT ALL ON TABLE "public"."models" TO "anon";
GRANT ALL ON TABLE "public"."models" TO "authenticated";
GRANT ALL ON TABLE "public"."models" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_production" TO "anon";
GRANT ALL ON TABLE "public"."monthly_production" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_production" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."payment_links" TO "anon";
GRANT ALL ON TABLE "public"."payment_links" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_links" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."preorder_settings" TO "anon";
GRANT ALL ON TABLE "public"."preorder_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."preorder_settings" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."public_collection" TO "anon";
GRANT ALL ON TABLE "public"."public_collection" TO "authenticated";
GRANT ALL ON TABLE "public"."public_collection" TO "service_role";



GRANT ALL ON TABLE "public"."quote_items" TO "anon";
GRANT ALL ON TABLE "public"."quote_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_items" TO "service_role";



GRANT ALL ON TABLE "public"."quote_payments" TO "anon";
GRANT ALL ON TABLE "public"."quote_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_payments" TO "service_role";



GRANT ALL ON TABLE "public"."quote_production" TO "anon";
GRANT ALL ON TABLE "public"."quote_production" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_production" TO "service_role";



GRANT ALL ON TABLE "public"."quote_production_photos" TO "anon";
GRANT ALL ON TABLE "public"."quote_production_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_production_photos" TO "service_role";



GRANT ALL ON TABLE "public"."quote_production_updates" TO "anon";
GRANT ALL ON TABLE "public"."quote_production_updates" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_production_updates" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "anon";
GRANT ALL ON TABLE "public"."quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotes" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_collection_changes" TO "anon";
GRANT ALL ON TABLE "public"."subscription_collection_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_collection_changes" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_collections" TO "anon";
GRANT ALL ON TABLE "public"."subscription_collections" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_collections" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."subscription_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."support_conversations" TO "anon";
GRANT ALL ON TABLE "public"."support_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."support_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."support_messages" TO "anon";
GRANT ALL ON TABLE "public"."support_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."support_messages" TO "service_role";



GRANT ALL ON TABLE "public"."support_quick_replies" TO "anon";
GRANT ALL ON TABLE "public"."support_quick_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."support_quick_replies" TO "service_role";



GRANT ALL ON TABLE "public"."user_badges" TO "anon";
GRANT ALL ON TABLE "public"."user_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_badges" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."wishlist" TO "anon";
GRANT ALL ON TABLE "public"."wishlist" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlist" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































