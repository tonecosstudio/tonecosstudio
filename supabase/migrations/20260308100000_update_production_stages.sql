-- Migration: Update Production Stages
-- Date: 2026-03-08
-- Purpose: Atualizar estágios de produção para fluxo mais detalhado (12 etapas)
--
-- Novo fluxo:
-- 1. awaiting_payment → 2. payment_confirmed → 3. awaiting_choice (assinaturas)
-- 4. model_preparation → 5. printing → 6. post_processing → 7. painting
-- 8. quality_check → 9. packaging → 10. ready_to_ship → 11. shipped → 12. delivered

-- ============================================================================
-- PASSO 1: Remover constraint antiga
-- ============================================================================

ALTER TABLE production_queue 
DROP CONSTRAINT IF EXISTS production_queue_current_stage_check;

-- ============================================================================
-- PASSO 2: Adicionar nova constraint com todos os estágios
-- ============================================================================

ALTER TABLE production_queue 
ADD CONSTRAINT production_queue_current_stage_check 
CHECK (current_stage IN (
  'awaiting_payment',
  'payment_confirmed',
  'awaiting_choice',
  'model_preparation',
  'printing',
  'post_processing',
  'painting',
  'quality_check',
  'packaging',
  'ready_to_ship',
  'shipped',
  'delivered'
));

-- ============================================================================
-- PASSO 3: Migrar dados existentes
-- ============================================================================

-- Mapear estágios antigos para novos
UPDATE production_queue 
SET current_stage = CASE current_stage
  -- Mapeamento direto
  WHEN 'awaiting_choice' THEN 'awaiting_choice'
  WHEN 'quality_check' THEN 'quality_check'
  WHEN 'packaging' THEN 'packaging'
  WHEN 'shipped' THEN 'shipped'
  
  -- Mapeamento com mudança
  WHEN 'design' THEN 'model_preparation'
  WHEN 'production' THEN 'printing'
  
  -- Manter valor se já for um dos novos
  ELSE current_stage
END
WHERE current_stage IN ('design', 'production', 'awaiting_choice', 'quality_check', 'packaging', 'shipped');

-- ============================================================================
-- PASSO 4: Atualizar production_stages table (se existir)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'production_stages'
  ) THEN
    -- Remover constraint antiga
    ALTER TABLE production_stages 
    DROP CONSTRAINT IF EXISTS production_stages_stage_name_check;
    
    -- Adicionar nova constraint
    ALTER TABLE production_stages 
    ADD CONSTRAINT production_stages_stage_name_check 
    CHECK (stage_name IN (
      'awaiting_payment',
      'payment_confirmed',
      'awaiting_choice',
      'model_preparation',
      'printing',
      'post_processing',
      'painting',
      'quality_check',
      'packaging',
      'ready_to_ship',
      'shipped',
      'delivered'
    ));
    
    -- Migrar dados
    UPDATE production_stages 
    SET stage_name = CASE stage_name
      WHEN 'design' THEN 'model_preparation'
      WHEN 'production' THEN 'printing'
      ELSE stage_name
    END
    WHERE stage_name IN ('design', 'production');
  END IF;
END $$;

-- ============================================================================
-- PASSO 5: Adicionar comentários para documentação
-- ============================================================================

COMMENT ON COLUMN production_queue.current_stage IS 
'Estágio atual da produção. Fluxo: awaiting_payment → payment_confirmed → awaiting_choice (assinaturas) → model_preparation → printing → post_processing → painting → quality_check → packaging → ready_to_ship → shipped → delivered';

-- ============================================================================
-- PASSO 6: Verificação e relatório
-- ============================================================================

DO $$
DECLARE
  stage_counts RECORD;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Migration: Update Production Stages - CONCLUÍDA';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Distribuição de estágios após migração:';
  RAISE NOTICE '';
  
  FOR stage_counts IN 
    SELECT 
      current_stage,
      COUNT(*) as count
    FROM production_queue
    GROUP BY current_stage
    ORDER BY COUNT(*) DESC
  LOOP
    RAISE NOTICE '  % : % item(s)', 
      RPAD(stage_counts.current_stage, 25), 
      stage_counts.count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✓ Constraint atualizado';
  RAISE NOTICE '✓ Dados migrados';
  RAISE NOTICE '✓ Documentação adicionada';
END $$;
