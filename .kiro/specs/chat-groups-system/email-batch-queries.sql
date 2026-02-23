-- =====================================================
-- CHAT GROUPS SYSTEM - Email Batch Queries
-- =====================================================
-- Queries úteis para configurar, testar e monitorar
-- o cron job de envio de emails em batch
-- =====================================================

-- =====================================================
-- CONFIGURAÇÃO
-- =====================================================

-- 1. Verificar se pg_cron está habilitado
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 2. Agendar cron job (SUBSTITUA OS PLACEHOLDERS!)
SELECT cron.schedule(
  'send-group-emails-batch',
  '*/2 * * * *',
  $$ 
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/send-group-emails-batch',
    headers := '{"Authorization": "Bearer [YOUR-SERVICE-ROLE-KEY]", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 3. Verificar job agendado
SELECT * FROM cron.job WHERE jobname = 'send-group-emails-batch';

-- =====================================================
-- MONITORAMENTO
-- =====================================================

-- 4. Ver últimas 10 execuções
SELECT 
  jobid,
  runid,
  status,
  return_message,
  start_time,
  end_time,
  (end_time - start_time) AS duration
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-group-emails-batch')
ORDER BY start_time DESC 
LIMIT 10;

-- 5. Ver últimas 20 execuções com detalhes completos
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time,
  (end_time - start_time) AS duration
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-group-emails-batch')
ORDER BY start_time DESC 
LIMIT 20;

-- 6. Estatísticas de execução
SELECT 
  status,
  COUNT(*) AS count,
  AVG(EXTRACT(EPOCH FROM (end_time - start_time))) AS avg_duration_seconds,
  MIN(EXTRACT(EPOCH FROM (end_time - start_time))) AS min_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (end_time - start_time))) AS max_duration_seconds
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-group-emails-batch')
GROUP BY status;

-- 7. Ver apenas execuções com falha
SELECT 
  runid,
  status,
  return_message,
  start_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-group-emails-batch')
  AND status = 'failed'
ORDER BY start_time DESC 
LIMIT 10;

-- 8. Ver execuções das últimas 24 horas
SELECT 
  status,
  return_message,
  start_time,
  (end_time - start_time) AS duration
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-group-emails-batch')
  AND start_time > NOW() - INTERVAL '24 hours'
ORDER BY start_time DESC;

-- =====================================================
-- TESTES
-- =====================================================

-- 9. Criar grupo de teste
INSERT INTO chat_groups (name, type, created_by)
VALUES ('Grupo Teste Email', 'manual', auth.uid())
RETURNING id;

-- 10. Adicionar você ao grupo de teste (SUBSTITUA [GROUP_ID])
INSERT INTO chat_group_members (group_id, user_id)
VALUES ('[GROUP_ID]', auth.uid());

-- 11. Enviar mensagem de teste (SUBSTITUA [GROUP_ID])
INSERT INTO chat_group_messages (group_id, sender_id, message)
VALUES ('[GROUP_ID]', auth.uid(), 'Teste de email batch - esta mensagem deve gerar um email!')
RETURNING id;

-- 12. Verificar membros do grupo com preferências de email
SELECT 
  cgm.group_id,
  cgm.user_id,
  u.email,
  p.full_name,
  p.email_notifications_enabled
FROM chat_group_members cgm
JOIN auth.users u ON u.id = cgm.user_id
LEFT JOIN profiles p ON p.id = cgm.user_id
WHERE cgm.group_id = '[GROUP_ID]';

-- 13. Verificar mensagens do grupo
SELECT 
  cgm.id,
  cgm.message,
  cgm.sender_id,
  p.full_name AS sender_name,
  cgm.created_at
FROM chat_group_messages cgm
LEFT JOIN profiles p ON p.id = cgm.sender_id
WHERE cgm.group_id = '[GROUP_ID]'
ORDER BY cgm.created_at DESC;

-- =====================================================
-- AJUSTES
-- =====================================================

-- 14. Desabilitar job temporariamente
UPDATE cron.job 
SET active = false 
WHERE jobname = 'send-group-emails-batch';

-- 15. Reabilitar job
UPDATE cron.job 
SET active = true 
WHERE jobname = 'send-group-emails-batch';

-- 16. Desagendar job (remove completamente)
SELECT cron.unschedule('send-group-emails-batch');

-- 17. Reagendar com intervalo de 5 minutos (SUBSTITUA OS PLACEHOLDERS!)
SELECT cron.schedule(
  'send-group-emails-batch',
  '*/5 * * * *',
  $$ 
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/send-group-emails-batch',
    headers := '{"Authorization": "Bearer [YOUR-SERVICE-ROLE-KEY]", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 18. Reagendar com intervalo de 1 minuto (SUBSTITUA OS PLACEHOLDERS!)
SELECT cron.schedule(
  'send-group-emails-batch',
  '* * * * *',
  $$ 
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/send-group-emails-batch',
    headers := '{"Authorization": "Bearer [YOUR-SERVICE-ROLE-KEY]", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- =====================================================
-- LIMPEZA
-- =====================================================

-- 19. Limpar histórico de execuções antigas (mais de 30 dias)
DELETE FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-group-emails-batch')
  AND start_time < NOW() - INTERVAL '30 days';

-- 20. Deletar grupo de teste (SUBSTITUA [GROUP_ID])
DELETE FROM chat_groups WHERE id = '[GROUP_ID]';

-- =====================================================
-- DIAGNÓSTICO
-- =====================================================

-- 21. Verificar todos os cron jobs ativos
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job
ORDER BY jobname;

-- 22. Verificar última execução de cada job
SELECT 
  j.jobname,
  j.schedule,
  j.active,
  MAX(jrd.start_time) AS last_run,
  (
    SELECT status 
    FROM cron.job_run_details 
    WHERE jobid = j.jobid 
    ORDER BY start_time DESC 
    LIMIT 1
  ) AS last_status
FROM cron.job j
LEFT JOIN cron.job_run_details jrd ON jrd.jobid = j.jobid
GROUP BY j.jobid, j.jobname, j.schedule, j.active
ORDER BY j.jobname;

-- 23. Verificar se há mensagens pendentes de envio
-- (Esta query é conceitual - V1 não usa fila de emails)
SELECT 
  cg.name AS group_name,
  cgm.message,
  cgm.created_at,
  COUNT(DISTINCT cgmem.user_id) AS total_members,
  COUNT(DISTINCT CASE WHEN p.email_notifications_enabled THEN cgmem.user_id END) AS members_with_notifications
FROM chat_group_messages cgm
JOIN chat_groups cg ON cg.id = cgm.group_id
JOIN chat_group_members cgmem ON cgmem.group_id = cgm.group_id
LEFT JOIN profiles p ON p.id = cgmem.user_id
WHERE cgm.created_at > NOW() - INTERVAL '10 minutes'
GROUP BY cg.id, cg.name, cgm.id, cgm.message, cgm.created_at
ORDER BY cgm.created_at DESC;

-- 24. Verificar configuração de notificações dos usuários
SELECT 
  COUNT(*) AS total_users,
  COUNT(CASE WHEN p.email_notifications_enabled THEN 1 END) AS with_notifications_enabled,
  COUNT(CASE WHEN NOT p.email_notifications_enabled THEN 1 END) AS with_notifications_disabled,
  COUNT(CASE WHEN p.email_notifications_enabled IS NULL THEN 1 END) AS notifications_not_set
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id;

-- 25. Verificar grupos ativos e seus membros
SELECT 
  cg.id,
  cg.name,
  cg.type,
  COUNT(DISTINCT cgm.user_id) AS total_members,
  COUNT(DISTINCT cgmsg.id) AS total_messages,
  MAX(cgmsg.created_at) AS last_message_at
FROM chat_groups cg
LEFT JOIN chat_group_members cgm ON cgm.group_id = cg.id
LEFT JOIN chat_group_messages cgmsg ON cgmsg.group_id = cg.id
WHERE cg.deleted_at IS NULL
GROUP BY cg.id, cg.name, cg.type
ORDER BY last_message_at DESC NULLS LAST;

-- =====================================================
-- NOTAS
-- =====================================================
-- 
-- Intervalos de cron:
-- - '*/2 * * * *'  = A cada 2 minutos
-- - '*/5 * * * *'  = A cada 5 minutos
-- - '*/10 * * * *' = A cada 10 minutos
-- - '*/15 * * * *' = A cada 15 minutos
-- - '* * * * *'    = A cada 1 minuto
-- - '0 * * * *'    = A cada hora (no minuto 0)
-- - '0 0 * * *'    = Todo dia à meia-noite
--
-- Status de execução:
-- - 'succeeded' = Job executou com sucesso
-- - 'failed'    = Job falhou (verificar return_message)
-- - 'running'   = Job está executando
--
-- =====================================================
