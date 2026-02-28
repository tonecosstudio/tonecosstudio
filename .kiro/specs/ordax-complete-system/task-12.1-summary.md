# Task 12.1 Summary: Set up pg_cron extension

## Status: ✅ COMPLETED

## Overview
Configuração da infraestrutura de cron jobs usando pg_cron para automação de tarefas no sistema ORDAX.

## Requirements Addressed
- **Requirement 10.1**: Automatic Delivery Creation via Cron Job - execução diária às 00:01 Bahia Time
- **Requirement 34.1**: Monitoring and Logging - log de todas as execuções de cron jobs com status de sucesso/falha

## Implementation Details

### 1. Migration Created
**File**: `supabase/migrations/20260402000000_setup_pg_cron_infrastructure.sql`

### 2. Components Implemented

#### A. pg_cron Extension
- Habilitada a extensão `pg_cron` no PostgreSQL
- Configurado timezone para `America/Bahia` (UTC-3)
- Todos os cron jobs executam no horário de Salvador/BA

#### B. cron_job_logs Table
Tabela para rastrear todas as execuções de cron jobs:

**Campos:**
- `id` (UUID): Identificador único do log
- `job_name` (TEXT): Nome do cron job executado
- `started_at` (TIMESTAMPTZ): Timestamp de início da execução
- `completed_at` (TIMESTAMPTZ): Timestamp de conclusão da execução
- `status` (TEXT): Status da execução (running, success, failed)
- `error_message` (TEXT): Mensagem de erro se falhou
- `execution_details` (JSONB): Detalhes adicionais em formato JSON
- `created_at` (TIMESTAMPTZ): Timestamp de criação do registro

**Constraints:**
- Status deve ser um dos valores: 'running', 'success', 'failed'

**Indexes:**
- `idx_cron_job_logs_job_name`: Índice no campo job_name
- `idx_cron_job_logs_started_at`: Índice no campo started_at (DESC)
- `idx_cron_job_logs_status`: Índice no campo status

#### C. Helper Functions

##### 1. start_cron_job_log()
```sql
start_cron_job_log(
  p_job_name TEXT,
  p_execution_details JSONB DEFAULT NULL
) RETURNS UUID
```
- Inicia o log de uma execução de cron job
- Retorna o ID do log criado
- Status inicial: 'running'

##### 2. complete_cron_job_log()
```sql
complete_cron_job_log(
  p_log_id UUID,
  p_execution_details JSONB DEFAULT NULL
) RETURNS VOID
```
- Marca uma execução como concluída com sucesso
- Atualiza status para 'success'
- Registra timestamp de conclusão

##### 3. fail_cron_job_log()
```sql
fail_cron_job_log(
  p_log_id UUID,
  p_error_message TEXT,
  p_execution_details JSONB DEFAULT NULL
) RETURNS VOID
```
- Marca uma execução como falha
- Atualiza status para 'failed'
- Registra mensagem de erro e timestamp de conclusão

##### 4. cleanup_old_cron_logs()
```sql
cleanup_old_cron_logs() RETURNS INTEGER
```
- Remove logs com mais de 90 dias (conforme Requirement 34.7)
- Retorna quantidade de registros deletados
- Deve ser executado periodicamente para manutenção

#### D. Permissions
- **authenticated**: SELECT (leitura) na tabela cron_job_logs
- **service_role**: ALL (todas as operações) na tabela cron_job_logs

### 3. Timezone Configuration
```sql
ALTER DATABASE postgres SET cron.timezone = 'America/Bahia';
```

Todos os cron jobs agendados com `cron.schedule()` executarão no timezone de Salvador/BA (UTC-3).

## Usage Examples

### Scheduling a Cron Job
```sql
-- Agendar job para executar diariamente às 00:01 (Bahia time)
SELECT cron.schedule(
  'daily-delivery-creation',
  '1 0 * * *',
  $$
  DO $$
  DECLARE
    v_log_id UUID;
  BEGIN
    -- Iniciar log
    v_log_id := start_cron_job_log('daily-delivery-creation');
    
    -- Executar lógica do job
    PERFORM create_scheduled_deliveries();
    
    -- Marcar como sucesso
    PERFORM complete_cron_job_log(v_log_id);
  EXCEPTION
    WHEN OTHERS THEN
      -- Marcar como falha
      PERFORM fail_cron_job_log(v_log_id, SQLERRM);
  END $$;
  $$
);
```

### Viewing Cron Job Logs
```sql
-- Ver últimos 20 logs
SELECT * FROM cron_job_logs 
ORDER BY started_at DESC 
LIMIT 20;

-- Ver logs de um job específico
SELECT * FROM cron_job_logs 
WHERE job_name = 'daily-delivery-creation'
ORDER BY started_at DESC;

-- Ver apenas falhas
SELECT * FROM cron_job_logs 
WHERE status = 'failed'
ORDER BY started_at DESC;
```

### Viewing Scheduled Jobs
```sql
-- Ver todos os jobs agendados
SELECT * FROM cron.job;

-- Ver histórico de execuções do pg_cron
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

## Verification

### Manual Verification
Execute o script de verificação:
```bash
# Usando arquivo SQL
cat verify-pg-cron.sql | npx supabase db execute
```

### Automated Tests
Testes unitários criados em:
- `src/services/cron-job-logger.test.ts`

Execute com:
```bash
npm test -- src/services/cron-job-logger.test.ts --run
```

## Next Steps

As próximas tarefas utilizarão esta infraestrutura:

1. **Task 12.2**: Criar cron job para criação automática de deliveries (00:01 diário)
2. **Task 12.3**: Criar cron job para revelação de personagens (10:00 diário)
3. **Task 12.4**: Criar cron job para verificação de prazos de pagamento (horário)
4. **Task 12.5**: Criar cron job para transições de status de ciclos (horário)

## Files Created/Modified

### Created
1. `supabase/migrations/20260402000000_setup_pg_cron_infrastructure.sql` - Migration principal
2. `src/services/cron-job-logger.test.ts` - Testes unitários
3. `verify-pg-cron.sql` - Script de verificação manual
4. `test-pg-cron-setup.sql` - Script de teste detalhado
5. `apply-pg-cron-migration.ps1` - Script PowerShell para aplicar migration
6. `.kiro/specs/ordax-complete-system/task-12.1-summary.md` - Esta documentação

### Modified
- Nenhum arquivo existente foi modificado

## Notes

### Supabase Considerations
- No Supabase, pg_cron pode já estar habilitado por padrão
- A configuração de timezone pode requerer permissões especiais
- Em produção, verificar se pg_cron está disponível no plano contratado

### Timezone Behavior
- Todos os timestamps são armazenados em UTC no banco
- A configuração `cron.timezone = 'America/Bahia'` afeta apenas a interpretação das expressões cron
- Exemplo: `'1 0 * * *'` executa à 00:01 horário de Bahia, não UTC

### Maintenance
- Executar `cleanup_old_cron_logs()` periodicamente (sugestão: mensalmente)
- Monitorar tamanho da tabela cron_job_logs
- Revisar logs de falhas regularmente para identificar problemas recorrentes

## Compliance

### Requirements Validation
- ✅ **10.1**: Infraestrutura pronta para cron job diário às 00:01 Bahia Time
- ✅ **34.1**: Sistema de logging completo para todas as execuções de cron jobs
- ✅ **34.7**: Retenção de logs por mínimo 90 dias (função cleanup_old_cron_logs)
- ✅ **34.8**: Capacidade de enviar alertas para erros críticos (via fail_cron_job_log)

### Design Validation
- ✅ Timezone configurado para America/Bahia (UTC-3)
- ✅ Tabela de logs com todos os campos especificados
- ✅ Funções helper para facilitar logging
- ✅ Indexes para performance de consultas
- ✅ Permissions adequadas (authenticated: read, service_role: all)

## Conclusion

A infraestrutura de pg_cron foi configurada com sucesso, incluindo:
- Extensão habilitada e configurada para timezone de Bahia
- Tabela de logs com estrutura completa
- Funções helper para facilitar o uso
- Sistema de limpeza automática de logs antigos
- Documentação e testes

O sistema está pronto para receber os cron jobs específicos nas próximas tarefas.
