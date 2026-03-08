-- ========================================
-- TESTE 3: CHARACTER CHOICE FLOW
-- Testa o fluxo de escolha de personagem
-- ========================================

-- PASSO 1: Verificar se há character_choices criados
SELECT 
  'CHARACTER_CHOICES_EXISTENTES' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes,
  COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submetidos,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as aprovados
FROM character_choices;

-- PASSO 2: Listar character_choices com detalhes
SELECT 
  'LISTA_CHOICES' as tipo,
  id,
  order_id,
  order_type,
  user_id,
  collection_id,
  character_id,
  character_name,
  status,
  deadline,
  created_at
FROM character_choices
ORDER BY created_at DESC;

-- PASSO 3: Verificar character_choice do manual_payment
SELECT 
  'CHOICE_MANUAL_PAYMENT' as tipo,
  cc.id as choice_id,
  cc.order_id,
  cc.order_type,
  cc.status as choice_status,
  cc.deadline,
  cc.collection_id,
  c.name as collection_name,
  (SELECT COUNT(*) FROM collection_characters WHERE collection_id = cc.collection_id) as total_characters
FROM character_choices cc
LEFT JOIN collections c ON c.id = cc.collection_id
WHERE cc.order_type = 'manual_payment'
ORDER BY cc.created_at DESC;

-- PASSO 4: Verificar personagens disponíveis na coleção
SELECT 
  'PERSONAGENS_DISPONIVEIS' as tipo,
  cc.id,
  cc.name as character_name,
  cc.image_url,
  cc.is_premium,
  c.name as collection_name
FROM collection_characters cc
JOIN collections c ON c.id = cc.collection_id
WHERE cc.collection_id IN (
  SELECT collection_id FROM character_choices WHERE order_type = 'manual_payment' LIMIT 1
)
ORDER BY cc.display_order;

-- PASSO 5: Simular escolha de personagem
DO $$
DECLARE
  v_choice_id UUID;
  v_character_id UUID;
  v_user_id UUID;
BEGIN
  -- Pegar o character_choice pendente do manual_payment
  SELECT id, user_id INTO v_choice_id, v_user_id
  FROM character_choices
  WHERE order_type = 'manual_payment'
  AND status = 'pending'
  LIMIT 1;
  
  IF v_choice_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum character_choice pendente encontrado';
    RETURN;
  END IF;
  
  -- Pegar o primeiro personagem da coleção
  SELECT cc.id INTO v_character_id
  FROM character_choices ch
  JOIN collection_characters cc ON cc.collection_id = ch.collection_id
  WHERE ch.id = v_choice_id
  ORDER BY cc.display_order
  LIMIT 1;
  
  IF v_character_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum personagem encontrado na coleção';
    RETURN;
  END IF;
  
  RAISE NOTICE '📝 Simulando escolha de personagem...';
  RAISE NOTICE '   Choice ID: %', v_choice_id;
  RAISE NOTICE '   Character ID: %', v_character_id;
  
  -- Atualizar character_choice com a escolha
  UPDATE character_choices
  SET 
    character_id = v_character_id,
    character_name = (SELECT name FROM collection_characters WHERE id = v_character_id),
    status = 'submitted',
    submitted_at = NOW()
  WHERE id = v_choice_id;
  
  RAISE NOTICE '✅ Escolha submetida com sucesso!';
  
  -- Verificar se production_queue foi atualizada
  IF EXISTS (
    SELECT 1 FROM production_queue 
    WHERE order_id = (SELECT order_id FROM character_choices WHERE id = v_choice_id)
    AND character_id = v_character_id
  ) THEN
    RAISE NOTICE '✅ Production queue atualizada com o personagem escolhido!';
  ELSE
    RAISE NOTICE '⚠️ Production queue NÃO foi atualizada automaticamente';
  END IF;
  
END $$;

-- PASSO 6: Verificar resultado da escolha
SELECT 
  'RESULTADO_ESCOLHA' as tipo,
  cc.id as choice_id,
  cc.order_id,
  cc.status as choice_status,
  cc.character_name as personagem_escolhido,
  cc.submitted_at,
  pq.character_name as personagem_na_fila,
  pq.production_status as status_producao
FROM character_choices cc
LEFT JOIN production_queue pq ON pq.order_id = cc.order_id AND pq.order_type = cc.order_type
WHERE cc.order_type = 'manual_payment'
ORDER BY cc.created_at DESC
LIMIT 1;

-- PASSO 7: Simular aprovação pelo admin
DO $$
DECLARE
  v_choice_id UUID;
  v_admin_id UUID;
BEGIN
  -- Pegar o character_choice submetido
  SELECT id INTO v_choice_id
  FROM character_choices
  WHERE order_type = 'manual_payment'
  AND status = 'submitted'
  LIMIT 1;
  
  IF v_choice_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum character_choice submetido encontrado';
    RETURN;
  END IF;
  
  -- Pegar um admin
  SELECT user_id INTO v_admin_id
  FROM user_roles
  WHERE role = 'admin'
  LIMIT 1;
  
  IF v_admin_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum admin encontrado';
    RETURN;
  END IF;
  
  RAISE NOTICE '📝 Simulando aprovação pelo admin...';
  RAISE NOTICE '   Choice ID: %', v_choice_id;
  RAISE NOTICE '   Admin ID: %', v_admin_id;
  
  -- Aprovar a escolha
  UPDATE character_choices
  SET 
    status = 'approved',
    approved_at = NOW(),
    approved_by = v_admin_id,
    approved_by_name = (SELECT full_name FROM profiles WHERE id = v_admin_id)
  WHERE id = v_choice_id;
  
  RAISE NOTICE '✅ Escolha aprovada com sucesso!';
  
END $$;

-- PASSO 8: Verificar resultado final
SELECT 
  'RESULTADO_FINAL' as tipo,
  cc.id as choice_id,
  cc.order_id,
  cc.status as choice_status,
  cc.character_name as personagem_escolhido,
  cc.submitted_at,
  cc.approved_at,
  cc.approved_by_name as aprovado_por,
  pq.character_name as personagem_na_fila,
  pq.production_status as status_producao,
  pq.current_stage as estagio_atual
FROM character_choices cc
LEFT JOIN production_queue pq ON pq.order_id = cc.order_id AND pq.order_type = cc.order_type
WHERE cc.order_type = 'manual_payment'
ORDER BY cc.created_at DESC
LIMIT 1;
