-- Popular grupos com membros e mensagens de teste
-- Execute no SQL Editor do Supabase

-- Este script vai:
-- 1. Adicionar todos os usuários como membros de todos os grupos
-- 2. Criar mensagens de teste em cada grupo

DO $$
DECLARE
  grupo_record RECORD;
  usuario_record RECORD;
  contador INT := 0;
BEGIN
  -- Para cada grupo existente
  FOR grupo_record IN 
    SELECT id, name, type FROM chat_groups WHERE deleted_at IS NULL
  LOOP
    RAISE NOTICE 'Processando grupo: % (%)', grupo_record.name, grupo_record.id;
    
    -- Adicionar todos os usuários como membros deste grupo
    FOR usuario_record IN 
      SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 20
    LOOP
      -- Inserir membro (ignorar se já existir)
      INSERT INTO chat_group_members (group_id, user_id, joined_at, last_viewed_at)
      VALUES (
        grupo_record.id,
        usuario_record.id,
        NOW() - (random() * INTERVAL '30 days'),
        NOW() - (random() * INTERVAL '5 days')
      )
      ON CONFLICT (group_id, user_id) DO NOTHING;
      
      contador := contador + 1;
    END LOOP;
    
    -- Criar 5 mensagens de teste para este grupo
    FOR i IN 1..5 LOOP
      INSERT INTO chat_group_messages (
        group_id,
        sender_id,
        message,
        created_at
      )
      SELECT
        grupo_record.id,
        id,
        'Mensagem de teste ' || i || ' no grupo ' || grupo_record.name,
        NOW() - (random() * INTERVAL '10 days')
      FROM auth.users
      ORDER BY random()
      LIMIT 1;
    END LOOP;
    
  END LOOP;
  
  RAISE NOTICE 'Total de membros adicionados: %', contador;
END $$;

-- Verificar resultados
SELECT 
  g.name as grupo,
  g.type as tipo,
  COUNT(DISTINCT m.user_id) as total_membros,
  COUNT(DISTINCT msg.id) as total_mensagens
FROM chat_groups g
LEFT JOIN chat_group_members m ON g.id = m.group_id
LEFT JOIN chat_group_messages msg ON g.id = msg.group_id
WHERE g.deleted_at IS NULL
GROUP BY g.id, g.name, g.type
ORDER BY g.name;
