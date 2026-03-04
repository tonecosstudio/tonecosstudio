# Instruções de Deploy - Production Management System

## Status Atual

- ✅ Edge Functions deployed (cron-send-character-choice-reminders, cron-expire-character-choices)
- ⏳ Migrações de banco pendentes devido a conflitos com migrações anteriores
- ⏳ Configuração de cron jobs pendente

## Próximos Passos

### Opção 1: Aplicar SQL via Supabase Dashboard (RECOMENDADO)

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

2. Cole e execute o seguinte SQL:

```sql
-- =====================================================
-- PRODUCTION MANAGEMENT SYSTEM - DEPLOYMENT
-- =====================================================

BEGIN;

-- Step 1: Add expired status to character_choices
ALTER TABLE character_choices DROP CONSTRAINT IF EXISTS character_choices_status_check;
ALTER TABLE character_choices ADD CONSTRAINT character_choices_status_check 
  CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'locked', 'expired'));

-- Step 2: Unschedule existing jobs (if any)
DO $$
BEGIN
  PERFORM cron.unschedule('send-character-choice-reminders');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('expire-character-choices');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Step 3: Schedule reminders job (daily at 09:00 Bahia time)
SELECT cron.schedule(
  'send-character-choice-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-send-character-choice-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Step 4: Schedule expiration job (hourly)
SELECT cron.schedule(
  'expire-character-choices',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-expire-character-choices',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

COMMIT;

-- Verification
SELECT 'Cron Jobs' as check_type, COUNT(*) as count, string_agg(jobname, ', ') as jobs
FROM cron.job 
WHERE jobname IN ('send-character-choice-reminders', 'expire-character-choices');
```

3. Verifique o resultado - deve mostrar 2 cron jobs configurados

### Opção 2: Continuar com CLI (requer correção de migrações anteriores)

As migrações anteriores têm vários problemas:
- Referências a `profiles.role` (coluna não existe)
- Dependências circulares entre tabelas
- Sintaxe SQL com dollar signs incorretos

Para continuar com CLI, seria necessário:
1. Corrigir todas as migrações anteriores (20260202* até 20260427*)
2. Aplicar via `supabase db push`

## Verificação do Deploy

Após aplicar o SQL, execute:

```bash
node verify-deployment.mjs
```

Ou verifique manualmente:

```sql
-- Ver cron jobs
SELECT * FROM cron.job 
WHERE jobname IN ('send-character-choice-reminders', 'expire-character-choices');

-- Ver constraint atualizado
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'character_choices_status_check';
```

## Resumo do Sistema

- **Reminders Job**: Roda diariamente às 09:00 (horário da Bahia)
  - Envia lembretes em 5, 2 e 1 dia antes do deadline
  
- **Expiration Job**: Roda a cada hora
  - Marca escolhas expiradas como 'expired'
  - Notifica administradores

- **Edge Functions**: Já deployadas e ativas
  - `cron-send-character-choice-reminders`
  - `cron-expire-character-choices`
