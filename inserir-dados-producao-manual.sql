-- ============================================================================
-- INSERIR DADOS MANUALMENTE NA PRODUCTION_QUEUE
-- ============================================================================
-- Use este script se os triggers não estiverem funcionando
-- Insere dados diretamente na production_queue para teste
-- ============================================================================

-- Limpar dados antigos (opcional - descomente se quiser)
-- DELETE FROM production_queue;

-- Inserir 10 registros de teste
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
  priority,
  priority_score,
  scheduled_production_date,
  estimated_completion_date,
  choice_deadline,
  created_at,
  updated_at
)
VALUES
-- 1. Item crítico - prazo < 24h
(
  gen_random_uuid(),
  'subscription_delivery',
  '19554ce7-161b-4f3b-ba17-e165ad56b3c0',
  'João Trimestral',
  'trimestral@ordax.com.br',
  (SELECT id FROM collections WHERE is_active = true LIMIT 1),
  'One Piece - Tripulação Mugiwara',
  (SELECT id FROM characters WHERE collection_id = (SELECT id FROM collections WHERE is_active = true LIMIT 1) LIMIT 1),
  'Monkey D. Luffy',
  'in_production',
  'production',
  'approved',
  'critical',
  95,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 day',
  NULL,
  NOW() - INTERVAL '5 days',
  NOW()
),

-- 2. Item aguardando escolha
(
  gen_random_uuid(),
  'subscription_delivery',
  '19554ce7-161b-4f3b-ba17-e165ad56b3c0',
  'João Trimestral',
  'trimestral@ordax.com.br',
  (SELECT id FROM collections WHERE is_active = true LIMIT 1),
  'One Piece - Tripulação Mugiwara',
  NULL,
  NULL,
  'awaiting_choice',
  'awaiting_choice',
  'pending',
  'high',
  80,
  CURRENT_DATE + INTERVAL '3 days',
  CURRENT_DATE + INTERVAL '10 days',
  CURRENT_DATE + INTERVAL '2 days',
  NOW() - INTERVAL '3 days',
  NOW()
),

-- 3. Item em design
(
  gen_random_uuid(),
  'subscription_delivery',
  '19554ce7-161b-4f3b-ba17-e165ad56b3c0',
  'Maria Silva',
  'maria@example.com',
  (SELECT id FROM collections WHERE is_active = true LIMIT 1),
  'One Piece - Tripulação Mugiwara',
  (SELECT id FROM characters WHERE collection_id = (SELECT id FROM collections WHERE is_active = true LIMIT 1) OFFSET 1 LIMIT 1),
  'Roronoa Zoro',
  'in_production',
  'design',
  'approved',
  'normal',
  50,
  CURRENT_DATE + INTERVAL '5 days',
  CURRENT_DATE + INTERVAL '12 days',
  NULL,
  NOW() - INTERVAL '2 days',
  NOW()
),

-- 4. Item em controle de qualidade
(
  gen_random_uuid(),
  'subscription_delivery',
  '19554ce7-161b-4f3b-ba17-e165ad56b3c0',
  'Pedro Santos',
  'pedro@example.com',
  (SELECT id FROM collections WHERE is_active = true LIMIT 1),
  'One Piece - Tripulação Mugiwara',
  (SELECT id FROM characters WHERE collection_id = (SELECT id FROM collections WHERE is_active = true LIMIT 1) OFFSET 2 LIMIT 1),
  'Nami',
  'in_production',
  'quality_check',
  'approved',
  'normal',
  45,
  CURRENT_DATE + INTERVAL '2 days',
  CURRENT_DATE + INTERVAL '5 days',
  NULL,
  NOW() - INTERVAL '7 days',
  NOW()
),

-- 5. Item em embalagem
(
  gen_random_uuid(),
  'subscription_delivery',
  '19554ce7-161b-4f3b-ba17-e165ad56b3c0',
  'Ana Costa',
  'ana@example.com',
  (SELECT id FROM collections WHERE is_active = true LIMIT 1),
  'One Piece - Tripulação Mugiwara',
  (SELECT id FROM characters WHERE collection_id = (SELECT id FROM collections WHERE is_active = true LIMIT 1) OFFSET 3 LIMIT 1),
  'Usopp',
  'in_production',
  'packaging',
  'approved',
  'low',
  30,
  CURRENT_DATE + INTERVAL '1 day',
  CURRENT_DATE + INTERVAL '3 days',
  NULL,
  NOW() - INTERVAL '10 days',
  NOW()
),

-- 6. Item com prioridade alta
(
  gen_random_uuid(),
  'standalone_purchase',
  '19554ce7-161b-4f3b-ba17-e165ad56b3c0',
  'Carlos Oliveira',
  'carlos@example.com',
  (SELECT id FROM collections WHERE is_active = true LIMIT 1),
  'One Piece - Tripulação Mugiwara',
  (SELECT id FROM characters WHERE collection_id = (SELECT id FROM collections WHERE is_active = true LIMIT 1) OFFSET 4 LIMIT 1),
  'Sanji',
  'in_production',
  'production',
  'approved',
  'high',
  75,
  CURRENT_DATE + INTERVAL '4 days',
  CURRENT_DATE + INTERVAL '8 days',
  NULL,
  NOW() - INTERVAL '4 days',
  NOW()
),

-- 7. Item aguardando escolha (urgente)
(
  gen_random_uuid(),
  'subscription_delivery',
  '19554ce7-161b-4f3b-ba17-e165ad56b3c0',
  'Juliana Ferreira',
  'juliana@example.com',
  (SELECT id FROM collections WHERE is_active = true LIMIT 1),
  'One Piece - Tripulação Mugiwara',
  NULL,
  NULL,
  'awaiting_choice',
  'awaiting_choice',
  'pending',
  'high',
  85,
  CURRENT_DATE + INTERVAL '2 days',
  CURRENT_DATE + INTERVAL '9 days',
  CURRENT_DATE + INTERVAL '1 day',
  NOW() - INTERVAL '6 days',
  NOW()
),

-- 8. Item em design (normal)
(
  gen_random_uuid(),
  'subscription_delivery',
  '19554ce7-161b-4f3b-ba17-e165ad56b3c0',
  'Roberto Lima',
  'roberto@example.com',
  (SELECT id FROM collections WHERE is_active = true LIMIT 1),
  'One Piece - Tripulação Mugiwara',
  (SELECT id FROM characters WHERE collection_id = (SELECT id FROM collections WHERE is_active = true LIMIT 1) OFFSET 5 LIMIT 1),
  'Tony Tony Chopper',
  'in_production',
  'design',
  'approved',
  'normal',
  55,
  CURRENT_DATE + INTERVAL '6 days',
  CURRENT_DATE + INTERVAL '13 days',
  NULL,
  NOW() - INTERVAL '1 day',
  NOW()
),

-- 9. Item em produção (normal)
(
  gen_random_uuid(),
  'subscription_delivery',
  '19554ce7-161b-4f3b-ba17-e165ad56b3c0',
  'Fernanda Alves',
  'fernanda@example.com',
  (SELECT id FROM collections WHERE is_active = true LIMIT 1),
  'One Piece - Tripulação Mugiwara',
  (SELECT id FROM characters WHERE collection_id = (SELECT id FROM collections WHERE is_active = true LIMIT 1) OFFSET 6 LIMIT 1),
  'Nico Robin',
  'in_production',
  'production',
  'approved',
  'normal',
  60,
  CURRENT_DATE + INTERVAL '7 days',
  CURRENT_DATE + INTERVAL '14 days',
  NULL,
  NOW() - INTERVAL '3 days',
  NOW()
),

-- 10. Item crítico - bloqueado
(
  gen_random_uuid(),
  'subscription_delivery',
  '19554ce7-161b-4f3b-ba17-e165ad56b3c0',
  'Lucas Martins',
  'lucas@example.com',
  (SELECT id FROM collections WHERE is_active = true LIMIT 1),
  'One Piece - Tripulação Mugiwara',
  (SELECT id FROM characters WHERE collection_id = (SELECT id FROM collections WHERE is_active = true LIMIT 1) OFFSET 7 LIMIT 1),
  'Franky',
  'on_hold',
  'production',
  'approved',
  'critical',
  90,
  CURRENT_DATE + INTERVAL '1 day',
  CURRENT_DATE + INTERVAL '4 days',
  NULL,
  NOW() - INTERVAL '8 days',
  NOW()
);

-- Verificar resultado
SELECT 
  '=== DADOS INSERIDOS ===' as info;

SELECT 
  COUNT(*) as total,
  current_stage,
  priority,
  production_status
FROM production_queue
GROUP BY current_stage, priority, production_status
ORDER BY 
  CASE priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    WHEN 'low' THEN 4
  END,
  current_stage;

-- Ver alguns registros
SELECT 
  customer_name,
  collection_name,
  character_name,
  current_stage,
  priority,
  choice_status,
  scheduled_production_date
FROM production_queue
ORDER BY priority_score DESC
LIMIT 10;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================
-- Após executar este script:
-- ✅ 10 registros inseridos em production_queue
-- ✅ Diferentes estágios (awaiting_choice, design, production, quality_check, packaging)
-- ✅ Diferentes prioridades (critical, high, normal, low)
-- ✅ Alguns aguardando escolha
-- ✅ Alguns com prazo crítico
-- 
-- Agora recarregue o Hub de Produção e deve funcionar!
-- ============================================================================
