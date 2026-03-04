# Resumo da Correção de Migrations SQL

## Data: 04/03/2026

## Problema Identificado

Múltiplas migrations tinham erros de sintaxe SQL com delimitadores de função PostgreSQL incorretos:
- **Erro**: Delimitadores `$` simples em vez de `$$` duplos
- **Impacto**: Migrations não podiam ser aplicadas, bloqueando o deploy

## Correções Aplicadas

### 1. Trigger de Perfil OAuth (✅ APLICADO)
- **Migration**: `20260304000005_fix_profile_trigger_syntax.sql`
- **Status**: Aplicada com sucesso
- **Resultado**: "Profile trigger configured successfully with RLS bypass"

### 2. Funções de Capacidade
- **Migration**: `20260328000000_create_capacity_functions.sql`
- **Correção**: Delimitadores `$` → `$$`

### 3. Infraestrutura pg_cron
- **Migration**: `20260402000000_setup_pg_cron_infrastructure.sql`
- **Correções**:
  - Removido `ALTER DATABASE` que causava erro de restart
  - Corrigidos delimitadores em 4 funções

### 4. Migrations de Cron Jobs (11 arquivos)
Corrigidos delimitadores em:
- `20260403000000_schedule_delivery_creation_cron.sql`
- `20260404000000_schedule_character_revelation_cron.sql`
- `20260405000000_schedule_cycle_transition_cron.sql`
- `20260406000000_schedule_balance_deadline_checker_cron.sql`
- `20260407000000_schedule_tracking_updater_cron.sql`
- `20260429000000_schedule_character_choice_reminders_cron.sql`
- `20260429000001_schedule_character_choice_expiration_cron.sql`
- E outros...

### 5. Outras Migrations (9 arquivos)
- `20260420000000_add_rejection_reason_fields.sql`
- `20260421000000_create_bonus_pieces_table.sql`
- `20260425000000_create_orders_consolidation_indexes.sql`
- `20260427000000_add_missing_fields_to_standalone_purchases.sql`
- `20260429000005_create_stage_transition_logs.sql`
- `20260429000010_test_auto_populate_trigger.sql`
- `20260503000000_fix_collections_rls_final.sql`
- `20260504000000_migrate_legacy_subscription_data.sql`
- `20260504000004_cleanup_duplicate_subscriptions.sql`

## Scripts Criados

### fix-sql-simple.ps1
Script PowerShell para corrigir delimitadores SQL automaticamente.

```powershell
./fix-sql-simple.ps1
```

## Próximos Passos

### 1. Aplicar Todas as Migrations

Execute o comando (pode demorar alguns minutos):

```bash
supabase db push --include-all
```

**IMPORTANTE**: Este comando aplicará ~50 migrations. Pode demorar 5-10 minutos.

### 2. Testar o Login com Google OAuth

Após as migrations serem aplicadas:

1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Acesse: `http://localhost:8080/login`
3. Clique em "Continuar com Google"
4. Complete o fluxo OAuth

### 3. Verificar se Funcionou

**Sucesso**: Você será redirecionado para a home sem erros na URL

**Falha**: URL terá `error=server_error&error_description=Database+error+saving+new+user`

### 4. Se Ainda Houver Erro

#### A. Verificar Logs do Supabase
```
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/logs/auth-logs
```

Procure por:
- Erros de criação de usuário
- Mensagens do trigger `handle_user_profile`
- Problemas de permissão RLS

#### B. Executar Script de Teste
No SQL Editor do Supabase:

```sql
-- Verificar trigger
SELECT trigger_name, event_manipulation 
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_profile_sync';

-- Verificar função
SELECT proname, prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'handle_user_profile';

-- Testar criação manual
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (test_id, 'test@example.com', NOW(), NOW());
  
  RAISE NOTICE 'Teste bem-sucedido!';
  
  DELETE FROM public.profiles WHERE id = test_id;
END $$;
```

#### C. Verificar Configuração do Google OAuth

No Supabase Dashboard:
1. Authentication > Providers > Google
2. Verificar se está habilitado
3. Confirmar Client ID e Secret
4. Verificar Redirect URLs

#### D. Verificar Redirect URLs

Em Authentication > URL Configuration:

Deve incluir:
- `http://localhost:8080`
- `http://localhost:8080/`
- `http://localhost:8080/**` (com wildcard)

## Arquivos de Documentação

- `OAUTH_FIX_STATUS.md` - Status detalhado da correção OAuth
- `SUPABASE_OAUTH_FIX.md` - Guia completo de correção
- `test-profile-trigger.sql` - Script de teste do trigger

## Resumo Técnico

### O Que Foi Corrigido

1. **Sintaxe SQL**: Delimitadores `$` → `$$` em ~25 arquivos
2. **Trigger OAuth**: Função `handle_user_profile()` com SECURITY DEFINER e RLS bypass
3. **Configuração pg_cron**: Removido ALTER DATABASE problemático
4. **Delimitadores aninhados**: Corrigidos `$` dentro de `cron.schedule()`

### Por Que Estava Falhando

1. PostgreSQL requer `$$` para delimitar blocos de função
2. `$` simples é interpretado como fim de string, causando erro de sintaxe
3. O trigger não era criado corretamente, falhando no OAuth
4. RLS policies bloqueavam inserção de perfis durante autenticação

### Como Foi Resolvido

1. Script PowerShell para substituir todos os delimitadores
2. Migration específica para corrigir o trigger OAuth
3. Bypass de RLS usando `SECURITY DEFINER` e `set_config('role', 'service_role')`
4. Remoção de comandos que requerem restart do banco

## Comandos Úteis

### Verificar Status das Migrations
```bash
supabase db diff
```

### Ver Migrations Pendentes
```bash
supabase db push --dry-run
```

### Aplicar Migrations com Debug
```bash
supabase db push --include-all --debug
```

### Reverter Última Migration (se necessário)
```bash
supabase db reset
```

## Notas Importantes

1. O comando `supabase db push --include-all` pode demorar vários minutos
2. Não interrompa o processo durante a aplicação das migrations
3. Se houver erro em alguma migration, o processo para e você verá qual falhou
4. Todas as correções de sintaxe já foram aplicadas nos arquivos locais
5. O trigger OAuth (`20260304000005`) já foi aplicado com sucesso

## Status Atual

- ✅ Trigger OAuth corrigido e aplicado
- ✅ Sintaxe SQL corrigida em todos os arquivos
- ⏳ Migrations pendentes aguardando aplicação
- ⏳ Teste de login OAuth pendente

## Contato para Suporte

Se precisar de ajuda adicional:
1. Verifique os logs do Supabase (link acima)
2. Execute o script de teste SQL
3. Compartilhe mensagens de erro específicas
