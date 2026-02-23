-- ========================================
-- QUERIES ÚTEIS - SISTEMA DE SUPORTE ORDAX
-- ========================================

-- ========================================
-- 1. VERIFICAÇÃO INICIAL
-- ========================================

-- Verificar se as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'support_%'
ORDER BY table_name;

-- Contar registros em cada tabela
SELECT 
  'support_conversations' as tabela,
  COUNT(*) as total
FROM support_conversations
UNION ALL
SELECT 
  'support_messages' as tabela,
  COUNT(*) as total
FROM support_messages
UNION ALL
SELECT 
  'support_quick_replies' as tabela,
  COUNT(*) as total
FROM support_quick_replies;

-- ========================================
-- 2. DESCOBRIR SEU ID DE ADMIN
-- ========================================

-- Ver seu ID de usuário
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'seu@email.com';

-- Verificar se você é admin
SELECT 
  u.id,
  u.email,
  ur.role
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'seu@email.com';

-- ========================================
-- 3. INSERIR RESPOSTAS RÁPIDAS INICIAIS
-- ========================================

-- IMPORTANTE: Substitua 'SEU_USER_ID_ADMIN' pelo seu ID real
-- Copie o ID da query acima

INSERT INTO support_quick_replies (title, message, category, shortcut, created_by)
VALUES 
  (
    'Saudação Inicial',
    'Olá! Obrigado por entrar em contato com a ORDAX. Como posso ajudar você hoje?',
    'saudacao',
    'Ctrl+1',
    'SEU_USER_ID_ADMIN'
  ),
  (
    'Prazo de Produção',
    'O prazo de produção é de 30-45 dias após a confirmação do pagamento. Você receberá atualizações por email durante todo o processo.',
    'prazo',
    'Ctrl+2',
    'SEU_USER_ID_ADMIN'
  ),
  (
    'Verificar Pagamento',
    'Vou verificar o status do seu pagamento agora mesmo e retorno em breve com as informações.',
    'pagamento',
    'Ctrl+3',
    'SEU_USER_ID_ADMIN'
  ),
  (
    'Informar Envio',
    'Seu pedido será enviado em breve. Você receberá o código de rastreamento por email assim que for despachado.',
    'envio',
    'Ctrl+4',
    'SEU_USER_ID_ADMIN'
  ),
  (
    'Agradecimento Final',
    'Obrigado pelo contato! Estamos à disposição para qualquer dúvida. Tenha um ótimo dia!',
    'agradecimento',
    'Ctrl+5',
    'SEU_USER_ID_ADMIN'
  ),
  (
    'Solicitar Mais Informações',
    'Para que eu possa ajudar melhor, você poderia fornecer mais detalhes sobre sua solicitação? Por exemplo, número do pedido, data da compra, etc.',
    'informacao',
    'Ctrl+6',
    'SEU_USER_ID_ADMIN'
  ),
  (
    'Problema Técnico',
    'Entendo sua frustração. Vou encaminhar isso para nossa equipe técnica imediatamente e retorno com uma solução o mais rápido possível.',
    'tecnico',
    'Ctrl+7',
    'SEU_USER_ID_ADMIN'
  ),
  (
    'Reembolso',
    'Vou iniciar o processo de reembolso. O valor será estornado em até 7 dias úteis, dependendo da operadora do seu cartão.',
    'reembolso',
    'Ctrl+8',
    'SEU_USER_ID_ADMIN'
  );

-- ========================================
-- 4. VISUALIZAR DADOS
-- ========================================

-- Ver todas as respostas rápidas cadastradas
SELECT 
  title,
  shortcut,
  category,
  is_active,
  LEFT(message, 50) || '...' as preview
FROM support_quick_replies
ORDER BY shortcut;

-- Ver todas as conversas
SELECT 
  c.id,
  c.subject,
  c.status,
  c.priority,
  u.email as cliente,
  c.created_at,
  (SELECT COUNT(*) FROM support_messages WHERE conversation_id = c.id) as total_mensagens
FROM support_conversations c
LEFT JOIN auth.users u ON u.id = c.user_id
ORDER BY c.created_at DESC
LIMIT 20;

-- Ver mensagens de uma conversa específica
SELECT 
  m.id,
  m.sender_type,
  u.email as remetente,
  LEFT(m.message, 100) as mensagem,
  m.is_internal,
  m.created_at
FROM support_messages m
LEFT JOIN auth.users u ON u.id = m.sender_id
WHERE m.conversation_id = 'ID_DA_CONVERSA'
ORDER BY m.created_at;

-- ========================================
-- 5. ESTATÍSTICAS E MÉTRICAS
-- ========================================

-- Conversas por status
SELECT 
  status,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
FROM support_conversations
GROUP BY status
ORDER BY total DESC;

-- Conversas por prioridade
SELECT 
  priority,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
FROM support_conversations
GROUP BY priority
ORDER BY 
  CASE priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    WHEN 'low' THEN 4
  END;

-- Tempo médio de primeira resposta (em horas)
SELECT 
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (
        (SELECT MIN(created_at) 
         FROM support_messages 
         WHERE conversation_id = c.id 
         AND sender_type = 'admin')
        - c.created_at
      )) / 3600
    )::numeric, 
    2
  ) as tempo_medio_resposta_horas
FROM support_conversations c
WHERE created_at > NOW() - INTERVAL '30 days'
AND EXISTS (
  SELECT 1 FROM support_messages 
  WHERE conversation_id = c.id 
  AND sender_type = 'admin'
);

-- Conversas criadas por dia (últimos 30 dias)
SELECT 
  DATE(created_at) as data,
  COUNT(*) as total_conversas
FROM support_conversations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY data DESC;

-- Top 5 clientes com mais conversas
SELECT 
  u.email,
  COUNT(*) as total_conversas,
  COUNT(*) FILTER (WHERE c.status = 'resolved') as resolvidas,
  COUNT(*) FILTER (WHERE c.status IN ('open', 'pending')) as abertas
FROM support_conversations c
LEFT JOIN auth.users u ON u.id = c.user_id
GROUP BY u.email
ORDER BY total_conversas DESC
LIMIT 5;

-- ========================================
-- 6. CONVERSAS ABERTAS E PENDENTES
-- ========================================

-- Ver todas as conversas abertas (precisam de atenção)
SELECT 
  c.id,
  c.subject,
  c.priority,
  c.status,
  u.email as cliente,
  CASE 
    WHEN c.assigned_to IS NULL THEN 'Não atribuído'
    ELSE (SELECT email FROM auth.users WHERE id = c.assigned_to)
  END as atribuido_para,
  c.created_at,
  EXTRACT(EPOCH FROM (NOW() - c.created_at))/3600 as horas_aberto,
  (SELECT COUNT(*) FROM support_messages WHERE conversation_id = c.id) as total_mensagens
FROM support_conversations c
LEFT JOIN auth.users u ON u.id = c.user_id
WHERE c.status IN ('open', 'pending')
ORDER BY 
  CASE c.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    WHEN 'low' THEN 4
  END,
  c.created_at;

-- Conversas urgentes sem atribuição
SELECT 
  c.id,
  c.subject,
  u.email as cliente,
  c.created_at,
  EXTRACT(EPOCH FROM (NOW() - c.created_at))/3600 as horas_aberto
FROM support_conversations c
LEFT JOIN auth.users u ON u.id = c.user_id
WHERE c.priority = 'urgent'
AND c.assigned_to IS NULL
AND c.status IN ('open', 'pending')
ORDER BY c.created_at;

-- ========================================
-- 7. GERENCIAMENTO DE CONVERSAS
-- ========================================

-- Atribuir conversa para um admin
UPDATE support_conversations
SET 
  assigned_to = 'ID_DO_ADMIN',
  updated_at = NOW()
WHERE id = 'ID_DA_CONVERSA';

-- Alterar prioridade de uma conversa
UPDATE support_conversations
SET 
  priority = 'urgent', -- ou 'high', 'normal', 'low'
  updated_at = NOW()
WHERE id = 'ID_DA_CONVERSA';

-- Alterar status de uma conversa
UPDATE support_conversations
SET 
  status = 'resolved', -- ou 'open', 'pending', 'closed'
  updated_at = NOW(),
  closed_at = CASE WHEN 'resolved' IN ('resolved', 'closed') THEN NOW() ELSE NULL END
WHERE id = 'ID_DA_CONVERSA';

-- Adicionar tags a uma conversa
UPDATE support_conversations
SET 
  tags = ARRAY['pagamento', 'urgente', 'vip'],
  updated_at = NOW()
WHERE id = 'ID_DA_CONVERSA';

-- Fechar múltiplas conversas resolvidas
UPDATE support_conversations
SET 
  status = 'closed',
  closed_at = NOW(),
  updated_at = NOW()
WHERE status = 'resolved'
AND updated_at < NOW() - INTERVAL '7 days';

-- ========================================
-- 8. GERENCIAMENTO DE RESPOSTAS RÁPIDAS
-- ========================================

-- Adicionar nova resposta rápida
INSERT INTO support_quick_replies (title, message, category, shortcut, created_by)
VALUES (
  'Título da Resposta',
  'Texto completo da resposta que será inserida automaticamente...',
  'categoria',
  'Ctrl+9',
  'SEU_USER_ID_ADMIN'
);

-- Editar resposta rápida existente
UPDATE support_quick_replies
SET 
  message = 'Novo texto da resposta atualizado...',
  updated_at = NOW()
WHERE shortcut = 'Ctrl+1';

-- Desativar resposta rápida
UPDATE support_quick_replies
SET 
  is_active = false,
  updated_at = NOW()
WHERE shortcut = 'Ctrl+5';

-- Reativar resposta rápida
UPDATE support_quick_replies
SET 
  is_active = true,
  updated_at = NOW()
WHERE shortcut = 'Ctrl+5';

-- Deletar resposta rápida
DELETE FROM support_quick_replies
WHERE id = 'ID_DA_RESPOSTA';

-- ========================================
-- 9. BUSCA E FILTROS
-- ========================================

-- Buscar conversas por palavra-chave no assunto
SELECT 
  c.id,
  c.subject,
  c.status,
  u.email as cliente,
  c.created_at
FROM support_conversations c
LEFT JOIN auth.users u ON u.id = c.user_id
WHERE c.subject ILIKE '%pedido%'
ORDER BY c.created_at DESC;

-- Buscar conversas por palavra-chave nas mensagens
SELECT DISTINCT
  c.id,
  c.subject,
  c.status,
  u.email as cliente,
  c.created_at
FROM support_conversations c
LEFT JOIN auth.users u ON u.id = c.user_id
INNER JOIN support_messages m ON m.conversation_id = c.id
WHERE m.message ILIKE '%pagamento%'
ORDER BY c.created_at DESC;

-- Buscar conversas por email do cliente
SELECT 
  c.id,
  c.subject,
  c.status,
  c.priority,
  c.created_at
FROM support_conversations c
LEFT JOIN auth.users u ON u.id = c.user_id
WHERE u.email ILIKE '%cliente@email.com%'
ORDER BY c.created_at DESC;

-- Conversas com tags específicas
SELECT 
  c.id,
  c.subject,
  c.tags,
  c.status,
  c.created_at
FROM support_conversations c
WHERE 'pagamento' = ANY(c.tags)
ORDER BY c.created_at DESC;

-- ========================================
-- 10. RELATÓRIOS AVANÇADOS
-- ========================================

-- Relatório mensal de atendimento
SELECT 
  DATE_TRUNC('month', created_at) as mes,
  COUNT(*) as total_conversas,
  COUNT(*) FILTER (WHERE status = 'resolved') as resolvidas,
  COUNT(*) FILTER (WHERE status = 'closed') as fechadas,
  ROUND(
    COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) * 100.0 / COUNT(*),
    2
  ) as taxa_resolucao
FROM support_conversations
WHERE created_at > NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes DESC;

-- Performance por admin (últimos 30 dias)
SELECT 
  u.email as admin,
  COUNT(*) as conversas_atribuidas,
  COUNT(*) FILTER (WHERE c.status IN ('resolved', 'closed')) as resolvidas,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (
        (SELECT MIN(created_at) 
         FROM support_messages 
         WHERE conversation_id = c.id 
         AND sender_id = c.assigned_to)
        - c.created_at
      )) / 3600
    )::numeric,
    2
  ) as tempo_medio_resposta_horas
FROM support_conversations c
LEFT JOIN auth.users u ON u.id = c.assigned_to
WHERE c.assigned_to IS NOT NULL
AND c.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.email
ORDER BY conversas_atribuidas DESC;

-- Conversas por hora do dia (identificar picos)
SELECT 
  EXTRACT(HOUR FROM created_at) as hora,
  COUNT(*) as total_conversas
FROM support_conversations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hora;

-- Conversas por dia da semana
SELECT 
  TO_CHAR(created_at, 'Day') as dia_semana,
  COUNT(*) as total_conversas
FROM support_conversations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(DOW FROM created_at)
ORDER BY EXTRACT(DOW FROM created_at);

-- ========================================
-- 11. LIMPEZA E MANUTENÇÃO
-- ========================================

-- Deletar conversas antigas fechadas (mais de 1 ano)
DELETE FROM support_conversations
WHERE status = 'closed'
AND closed_at < NOW() - INTERVAL '1 year';

-- Marcar mensagens antigas como lidas
UPDATE support_messages
SET read_at = NOW()
WHERE read_at IS NULL
AND created_at < NOW() - INTERVAL '30 days';

-- Remover tags duplicadas
UPDATE support_conversations
SET tags = (
  SELECT ARRAY_AGG(DISTINCT tag)
  FROM UNNEST(tags) AS tag
)
WHERE ARRAY_LENGTH(tags, 1) > 0;

-- ========================================
-- 12. BACKUP E EXPORTAÇÃO
-- ========================================

-- Exportar todas as conversas (formato CSV)
COPY (
  SELECT 
    c.id,
    c.subject,
    c.status,
    c.priority,
    u.email as cliente,
    c.created_at,
    c.closed_at,
    (SELECT COUNT(*) FROM support_messages WHERE conversation_id = c.id) as total_mensagens
  FROM support_conversations c
  LEFT JOIN auth.users u ON u.id = c.user_id
  ORDER BY c.created_at DESC
) TO '/tmp/conversas_backup.csv' WITH CSV HEADER;

-- Exportar mensagens de uma conversa
COPY (
  SELECT 
    m.sender_type,
    u.email as remetente,
    m.message,
    m.created_at
  FROM support_messages m
  LEFT JOIN auth.users u ON u.id = m.sender_id
  WHERE m.conversation_id = 'ID_DA_CONVERSA'
  ORDER BY m.created_at
) TO '/tmp/conversa_mensagens.csv' WITH CSV HEADER;

-- ========================================
-- 13. TESTES E VALIDAÇÃO
-- ========================================

-- Verificar integridade das conversas
SELECT 
  c.id,
  c.subject,
  CASE 
    WHEN c.user_id IS NULL THEN 'Erro: user_id nulo'
    WHEN NOT EXISTS (SELECT 1 FROM auth.users WHERE id = c.user_id) THEN 'Erro: usuário não existe'
    ELSE 'OK'
  END as validacao_usuario,
  CASE 
    WHEN c.assigned_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = c.assigned_to) THEN 'Erro: admin não existe'
    ELSE 'OK'
  END as validacao_admin
FROM support_conversations c
WHERE c.user_id IS NULL
OR (c.assigned_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = c.assigned_to));

-- Verificar conversas sem mensagens
SELECT 
  c.id,
  c.subject,
  c.created_at
FROM support_conversations c
WHERE NOT EXISTS (
  SELECT 1 FROM support_messages WHERE conversation_id = c.id
);

-- Verificar respostas rápidas duplicadas
SELECT 
  shortcut,
  COUNT(*) as total
FROM support_quick_replies
WHERE is_active = true
GROUP BY shortcut
HAVING COUNT(*) > 1;

-- ========================================
-- FIM DAS QUERIES
-- ========================================

-- Para mais informações, consulte:
-- - SISTEMA_SUPORTE_COMPLETO.md
-- - APLICAR_SUPORTE_AGORA.md
-- - RESUMO_SUPORTE_IMPLEMENTADO.md
