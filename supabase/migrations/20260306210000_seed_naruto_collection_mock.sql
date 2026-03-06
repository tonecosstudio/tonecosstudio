-- ============================================================================
-- Migration: Seed Naruto Collection (Mock Data)
-- Description: Cria coleção Naruto com 6 personagens para demonstração
-- Date: 2026-03-06 21:00:00
-- ============================================================================

-- ============================================================================
-- PASSO 1: Criar Coleção Naruto
-- ============================================================================

INSERT INTO collections (
  id,
  name,
  slug,
  description,
  image_url,
  is_active,
  is_secondary,
  release_date,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Naruto Shippuden',
  'naruto-shippuden',
  'Coleção inspirada no universo de Naruto Shippuden, com personagens icônicos da série em poses épicas.',
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=600&fit=crop',
  true,
  false, -- Coleção principal (não secundária)
  '2026-03-01',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- Guardar ID da coleção para uso posterior
DO $$
DECLARE
  v_collection_id UUID;
BEGIN
  -- Buscar ID da coleção Naruto
  SELECT id INTO v_collection_id
  FROM collections
  WHERE slug = 'naruto-shippuden';

  -- Se não encontrou, criar
  IF v_collection_id IS NULL THEN
    INSERT INTO collections (
      name,
      slug,
      description,
      image_url,
      is_active,
      is_secondary,
      release_date
    ) VALUES (
      'Naruto Shippuden',
      'naruto-shippuden',
      'Coleção inspirada no universo de Naruto Shippuden',
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=600&fit=crop',
      true,
      false,
      '2026-03-01'
    )
    RETURNING id INTO v_collection_id;
  END IF;

  -- ============================================================================
  -- PASSO 2: Criar 6 Personagens da Coleção
  -- ============================================================================

  -- Personagem 1: Naruto Sage Mode
  INSERT INTO collection_characters (
    id,
    collection_id,
    name,
    description,
    character_type,
    image_url,
    status,
    release_order,
    is_revealed,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_collection_id,
    'Naruto Sage Mode',
    'Naruto Uzumaki em seu poderoso Modo Sábio, com os olhos de sapo e energia natural. Pose icônica pronto para o Rasengan.',
    'standard',
    'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=600&fit=crop',
    'released',
    1,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Personagem 2: Sasuke Uchiha
  INSERT INTO collection_characters (
    id,
    collection_id,
    name,
    description,
    character_type,
    image_url,
    status,
    release_order,
    is_revealed,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_collection_id,
    'Sasuke Uchiha',
    'Sasuke com Sharingan ativado e Chidori na mão. O último Uchiha em pose de combate épica.',
    'standard',
    'https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=400&h=600&fit=crop',
    'released',
    2,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Personagem 3: Kakashi Hatake
  INSERT INTO collection_characters (
    id,
    collection_id,
    name,
    description,
    character_type,
    image_url,
    status,
    release_order,
    is_revealed,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_collection_id,
    'Kakashi Hatake',
    'O Ninja Copiador com seu Sharingan revelado, segurando um kunai. Pose relaxada mas pronta para ação.',
    'standard',
    'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=600&fit=crop&sat=-100',
    'released',
    3,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Personagem 4: Sakura Haruno
  INSERT INTO collection_characters (
    id,
    collection_id,
    name,
    description,
    character_type,
    image_url,
    status,
    release_order,
    is_revealed,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_collection_id,
    'Sakura Haruno',
    'Sakura com seu chakra concentrado nos punhos, pronta para um golpe devastador. Força e determinação.',
    'standard',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop',
    'released',
    4,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Personagem 5: Itachi Uchiha (Premium)
  INSERT INTO collection_characters (
    id,
    collection_id,
    name,
    description,
    character_type,
    image_url,
    status,
    release_order,
    is_revealed,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_collection_id,
    'Itachi Uchiha',
    'Itachi com Mangekyou Sharingan ativado e corvos ao redor. Edição premium com detalhes extras e base especial.',
    'premium',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
    'released',
    5,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Personagem 6: Jiraiya (Premium)
  INSERT INTO collection_characters (
    id,
    collection_id,
    name,
    description,
    character_type,
    image_url,
    status,
    release_order,
    is_revealed,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_collection_id,
    'Jiraiya Sennin',
    'O Eremita Sapo em pose heroica com seu pergaminho gigante. Edição premium com acabamento especial.',
    'premium',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop',
    'released',
    6,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- PASSO 3: Configurar Preços da Coleção
  -- ============================================================================

  -- Atualizar coleção com preços (se a tabela tiver esses campos)
  -- Assumindo que a coleção usa o sistema de pricing padrão
  
  RAISE NOTICE 'Coleção Naruto Shippuden criada com sucesso!';
  RAISE NOTICE 'Collection ID: %', v_collection_id;
  RAISE NOTICE '6 personagens adicionados (4 standard + 2 premium)';

END $$;

-- ============================================================================
-- PASSO 4: Comentários e Documentação
-- ============================================================================

COMMENT ON TABLE collections IS 
  'Tabela de coleções. Exemplo: Naruto Shippuden com 6 personagens.
   
   Estrutura de Personagem:
   - nome: Nome do personagem (ex: Naruto Sage Mode)
   - coleção: Nome da coleção (ex: Naruto Shippuden)
   - tipo: standard ou premium
   - coins: Preço contextual (200-450 coins)
   - valor_avulso: R$ 500 (standard) ou R$ 900 (premium)
   - escala: Definida na produção
   - status: released, revealed, upcoming';

-- ============================================================================
-- PASSO 5: Verificação
-- ============================================================================

DO $$
DECLARE
  v_collection_count INTEGER;
  v_character_count INTEGER;
BEGIN
  -- Contar coleção
  SELECT COUNT(*) INTO v_collection_count
  FROM collections
  WHERE slug = 'naruto-shippuden';

  -- Contar personagens
  SELECT COUNT(*) INTO v_character_count
  FROM collection_characters cc
  JOIN collections c ON c.id = cc.collection_id
  WHERE c.slug = 'naruto-shippuden';

  -- Verificar
  IF v_collection_count = 0 THEN
    RAISE EXCEPTION 'Coleção Naruto não foi criada!';
  END IF;

  IF v_character_count < 6 THEN
    RAISE WARNING 'Apenas % personagens foram criados (esperado: 6)', v_character_count;
  END IF;

  RAISE NOTICE '✅ Verificação concluída:';
  RAISE NOTICE '   - Coleção: % encontrada(s)', v_collection_count;
  RAISE NOTICE '   - Personagens: % criado(s)', v_character_count;
END $$;

-- ============================================================================
-- RESUMO DA COLEÇÃO CRIADA
-- ============================================================================

/*
COLEÇÃO: Naruto Shippuden
========================

PERSONAGENS STANDARD (R$ 500 avulso):
1. Naruto Sage Mode
   - Coins: 200 (coleção ativa) / 240 (secundária) / 300 (catálogo)
   - Valor avulso: R$ 500
   - Descrição: Modo Sábio com Rasengan

2. Sasuke Uchiha
   - Coins: 200 (coleção ativa) / 240 (secundária) / 300 (catálogo)
   - Valor avulso: R$ 500
   - Descrição: Sharingan e Chidori

3. Kakashi Hatake
   - Coins: 200 (coleção ativa) / 240 (secundária) / 300 (catálogo)
   - Valor avulso: R$ 500
   - Descrição: Ninja Copiador

4. Sakura Haruno
   - Coins: 200 (coleção ativa) / 240 (secundária) / 300 (catálogo)
   - Valor avulso: R$ 500
   - Descrição: Força e chakra

PERSONAGENS PREMIUM (R$ 900 avulso):
5. Itachi Uchiha
   - Coins: 450 (sempre)
   - Valor avulso: R$ 900
   - Descrição: Mangekyou Sharingan (edição premium)

6. Jiraiya Sennin
   - Coins: 450 (sempre)
   - Valor avulso: R$ 900
   - Descrição: Eremita Sapo (edição premium)

SISTEMA DE PREÇOS:
==================
- Coleção Ativa: 200 coins (standard)
- Coleção Secundária: 240 coins (standard)
- Catálogo Geral: 300 coins (standard)
- Premium: 450 coins (sempre)

VALORES AVULSOS:
================
- Standard: R$ 500,00
- Premium: R$ 900,00

STATUS:
=======
- Todos: released (disponíveis para compra)
- Todos: revealed (imagem e nome visíveis)
*/

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

