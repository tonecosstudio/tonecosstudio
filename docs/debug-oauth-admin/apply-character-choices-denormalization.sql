-- =====================================================
-- MIGRAÇÃO SIMPLIFICADA: Desnormalização do character_choices
-- Execute este arquivo no SQL Editor do Supabase
-- =====================================================

-- 1. Adicionar colunas desnormalizadas
ALTER TABLE character_choices
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS collection_name TEXT;

-- 2. Popular registros existentes com dados de clientes
UPDATE character_choices cc
SET 
  customer_name = COALESCE(p.full_name, p.email, 'Unknown Customer'),
  customer_email = p.email
FROM profiles p
WHERE cc.user_id = p.id
  AND (cc.customer_name IS NULL OR cc.customer_email IS NULL);

-- 3. Popular registros existentes com dados de coleções
UPDATE character_choices cc
SET collection_name = c.name
FROM collections c
WHERE cc.collection_id = c.id
  AND cc.collection_name IS NULL;

-- 4. Atualizar função de trigger para popular automaticamente
CREATE OR REPLACE FUNCTION auto_populate_production_queue()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_collection_id UUID;
  v_collection_name TEXT;
  v_choice_deadline TIMESTAMPTZ;
  v_requires_choice BOOLEAN;
  v_order_type TEXT;
  v_approval_date TIMESTAMPTZ;
BEGIN
  -- Determinar tipo de pedido
  IF TG_TABLE_NAME = 'subscription_deliveries' THEN
    v_order_type := 'subscription_delivery';
  ELSIF TG_TABLE_NAME = 'standalone_purchases' THEN
    v_order_type := 'standalone_purchase';
  ELSIF TG_TABLE_NAME = 'manual_payments' THEN
    v_order_type := 'manual_payment';
  ELSE
    RAISE EXCEPTION 'auto_populate_production_queue triggered on unsupported table: %', TG_TABLE_NAME;
  END IF;
  
  -- Verificar mudança de status
  IF TG_OP = 'UPDATE' THEN
    IF v_order_type = 'subscription_delivery' THEN
      IF NEW.status != 'confirmed' OR OLD.status = 'confirmed' THEN
        RETURN NEW;
      END IF;
      v_approval_date := NEW.updated_at;
    ELSIF v_order_type = 'standalone_purchase' THEN
      IF NEW.status != 'balance_paid' OR OLD.status = 'balance_paid' THEN
        RETURN NEW;
      END IF;
      v_approval_date := NEW.updated_at;
    ELSIF v_order_type = 'manual_payment' THEN
      IF NEW.status != 'approved' OR OLD.status = 'approved' THEN
        RETURN NEW;
      END IF;
      v_approval_date := NEW.updated_at;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF v_order_type = 'subscription_delivery' AND NEW.status != 'confirmed' THEN
      RETURN NEW;
    ELSIF v_order_type = 'standalone_purchase' AND NEW.status != 'balance_paid' THEN
      RETURN NEW;
    ELSIF v_order_type = 'manual_payment' AND NEW.status != 'approved' THEN
      RETURN NEW;
    END IF;
    v_approval_date := NEW.created_at;
  END IF;
  
  -- Verificar se já existe
  IF EXISTS (
    SELECT 1 FROM production_queue 
    WHERE order_id = NEW.id AND order_type = v_order_type
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Obter informações do cliente
  SELECT 
    COALESCE(p.full_name, p.email, 'Unknown Customer'),
    p.email
  FROM profiles p
  WHERE p.id = NEW.user_id
  INTO v_customer_name, v_customer_email;
  
  -- Obter informações da coleção
  SELECT 
    c.id,
    c.name
  FROM collections c
  WHERE c.id = NEW.collection_id
  INTO v_collection_id, v_collection_name;
  
  -- Verificar se requer escolha de personagem
  SELECT COUNT(*) > 1
  FROM collection_characters
  WHERE collection_id = v_collection_id
  INTO v_requires_choice;
  
  -- Calcular deadline se necessário
  IF v_requires_choice THEN
    v_choice_deadline := calculate_character_choice_deadline(v_approval_date);
  ELSE
    v_choice_deadline := NULL;
  END IF;
  
  -- Inserir na fila de produção
  INSERT INTO production_queue (
    order_id,
    order_type,
    customer_id,
    customer_name,
    customer_email,
    collection_id,
    collection_name,
    character_id,
    character_name,
    production_status,
    current_stage,
    choice_status,
    choice_deadline,
    scheduled_production_date
  ) VALUES (
    NEW.id,
    v_order_type,
    NEW.user_id,
    v_customer_name,
    v_customer_email,
    v_collection_id,
    v_collection_name,
    NULL,
    NULL,
    CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'ready_for_production' END,
    CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'design' END,
    CASE WHEN v_requires_choice THEN 'pending' ELSE 'approved' END,
    v_choice_deadline,
    CASE WHEN v_requires_choice THEN NULL ELSE v_approval_date + INTERVAL '1 day' END
  );
  
  -- Criar registro de escolha se necessário (COM DADOS DESNORMALIZADOS)
  IF v_requires_choice THEN
    INSERT INTO character_choices (
      order_id,
      order_type,
      user_id,
      collection_id,
      status,
      deadline,
      customer_name,
      customer_email,
      collection_name
    ) VALUES (
      NEW.id,
      v_order_type,
      NEW.user_id,
      v_collection_id,
      'pending',
      v_choice_deadline,
      v_customer_name,
      v_customer_email,
      v_collection_name
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Verificar se funcionou
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'character_choices' AND column_name = 'customer_name'
  ) THEN
    RAISE EXCEPTION 'Coluna customer_name não foi adicionada';
  END IF;
  
  RAISE NOTICE '✅ Migração aplicada com sucesso!';
END $$;

-- 6. Registrar no histórico de migrações
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260506000000',
  'add_denormalized_fields_to_character_choices',
  ARRAY['ALTER TABLE character_choices ADD COLUMN customer_name TEXT, ADD COLUMN customer_email TEXT, ADD COLUMN collection_name TEXT']
)
ON CONFLICT (version) DO NOTHING;
