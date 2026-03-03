-- Script para aplicar manualmente as migrations de produção
-- Execute este script no SQL Editor do Supabase

-- Verificar se as tabelas já existem
DO $$
BEGIN
  RAISE NOTICE '=== Verificando objetos existentes ===';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_queue') THEN
    RAISE NOTICE '✓ production_queue já existe';
  ELSE
    RAISE NOTICE '✗ production_queue NÃO existe';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'character_choices') THEN
    RAISE NOTICE '✓ character_choices já existe';
  ELSE
    RAISE NOTICE '✗ character_choices NÃO existe';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_stages') THEN
    RAISE NOTICE '✓ production_stages já existe';
  ELSE
    RAISE NOTICE '✗ production_stages NÃO existe';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'production_queue_with_details') THEN
    RAISE NOTICE '✓ production_queue_with_details view já existe';
  ELSE
    RAISE NOTICE '✗ production_queue_with_details view NÃO existe';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_production_metrics') THEN
    RAISE NOTICE '✓ get_production_metrics() já existe';
  ELSE
    RAISE NOTICE '✗ get_production_metrics() NÃO existe';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_populate_production_queue') THEN
    RAISE NOTICE '✓ auto_populate_production_queue() já existe';
  ELSE
    RAISE NOTICE '✗ auto_populate_production_queue() NÃO existe';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_populate_production_queue_subscription') THEN
    RAISE NOTICE '✓ trigger_auto_populate_production_queue_subscription já existe';
  ELSE
    RAISE NOTICE '✗ trigger_auto_populate_production_queue_subscription NÃO existe';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_populate_production_queue_standalone') THEN
    RAISE NOTICE '✓ trigger_auto_populate_production_queue_standalone já existe';
  ELSE
    RAISE NOTICE '✗ trigger_auto_populate_production_queue_standalone NÃO existe';
  END IF;
END $$;

-- Se os objetos não existirem, você precisa aplicar as migrations na ordem:
-- 1. supabase/migrations/20260428000000_create_production_queue.sql
-- 2. supabase/migrations/20260428000001_create_character_choices.sql
-- 3. supabase/migrations/20260428000002_create_production_stages.sql
-- 4. supabase/migrations/20260428000003_create_production_views.sql
-- 5. supabase/migrations/20260428000004_create_production_functions.sql

-- Verificar dados existentes
DO $$
DECLARE
  queue_count INTEGER;
  delivery_count INTEGER;
  purchase_count INTEGER;
  delivery_confirmed_count INTEGER;
  purchase_paid_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Verificando dados existentes ===';
  
  -- Check production_queue
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_queue') THEN
    SELECT COUNT(*) INTO queue_count FROM production_queue;
    RAISE NOTICE 'production_queue tem % registros', queue_count;
  ELSE
    RAISE NOTICE 'production_queue não existe - não é possível verificar dados';
  END IF;
  
  -- Check subscription_deliveries
  SELECT COUNT(*) INTO delivery_count FROM subscription_deliveries;
  RAISE NOTICE 'subscription_deliveries tem % registros', delivery_count;
  
  SELECT COUNT(*) INTO delivery_confirmed_count FROM subscription_deliveries WHERE status = 'confirmed';
  RAISE NOTICE 'subscription_deliveries com status=confirmed: %', delivery_confirmed_count;
  
  -- Check standalone_purchases
  SELECT COUNT(*) INTO purchase_count FROM standalone_purchases;
  RAISE NOTICE 'standalone_purchases tem % registros', purchase_count;
  
  SELECT COUNT(*) INTO purchase_paid_count FROM standalone_purchases WHERE status = 'balance_paid';
  RAISE NOTICE 'standalone_purchases com status=balance_paid: %', purchase_paid_count;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== Resumo ===';
  IF delivery_confirmed_count > 0 OR purchase_paid_count > 0 THEN
    RAISE NOTICE 'Há % pedidos aprovados que deveriam estar na fila de produção', delivery_confirmed_count + purchase_paid_count;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_queue') THEN
      IF queue_count = 0 THEN
        RAISE NOTICE 'PROBLEMA: production_queue está vazia mas há pedidos aprovados!';
        RAISE NOTICE 'Solução: Execute o script populate_production_queue_manually.sql';
      ELSIF queue_count < (delivery_confirmed_count + purchase_paid_count) THEN
        RAISE NOTICE 'AVISO: production_queue tem menos registros que pedidos aprovados';
        RAISE NOTICE 'Esperado: %, Atual: %', delivery_confirmed_count + purchase_paid_count, queue_count;
      ELSE
        RAISE NOTICE 'OK: production_queue parece estar populada corretamente';
      END IF;
    END IF;
  ELSE
    RAISE NOTICE 'Não há pedidos aprovados ainda';
  END IF;
END $$;
