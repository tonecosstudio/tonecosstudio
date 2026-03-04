# Plano Profissional de Limpeza e Correção de Migrations

## Data: 04/03/2026

## Situação Atual

### Problemas Identificados
1. **218 arquivos** na pasta migrations (deveria ter ~50-80 no máximo)
2. **Arquivos .md** misturados com .sql (não devem estar em migrations/)
3. **Migrations duplicadas** com mesmo propósito
4. **Migrations obsoletas** que foram substituídas por versões mais novas
5. **Delimitadores SQL incorretos** em múltiplos arquivos
6. **Migrations de teste/debug** que não deveriam estar em produção

### Arquivos Problemáticos Identificados

#### Arquivos .md (NÃO devem estar em migrations/)
- `20260429000003_IMPLEMENTATION_SUMMARY.md`
- `20260429000003_README.md`
- `APPLY_PRODUCTION_SYNC.md`
- `TASK_6.1.3_COMPLETION_SUMMARY.md`
- `VERIFY_AUTO_POPULATE_TRIGGER.md`
- `VERIFY_TASK_6.1.2_AUTO_POPULATE_TRIGGER.md`

#### Arquivos sem timestamp correto
- `check_sync_trigger.sql`
- `CONSOLIDATED_PRICING_RESTRUCTURE_PHASE1.sql`
- `CONSOLIDATED_PRICING_TIERS_MIGRATION.sql`

#### Migrations de Debug/Teste (devem ser removidas)
- Todas com padrão `fix_406_*` (15+ arquivos)
- `20260223100200_diagnostico_profundo.sql`
- `20260223100500_recriar_tabela_simples.sql`
- `20260223190000_verificar_postgrest.sql`
- `20260223210000_verificar_api_expose.sql`
- `20260223220000_expor_tabela_api.sql`
- `20260223230000_verificar_existencia_tabela.sql`
- `20260224030000_remover_rls_completamente.sql`
- `20260228200001_test_user_notifications.sql`
- `20260429000009_sync_production_status_to_orders_test.sql`
- `20260429000010_test_auto_populate_trigger.sql`

#### Migrations Duplicadas de Profile/OAuth (manter apenas a última)
- `20260304000000_fix_profile_creation_trigger.sql` ❌
- `20260304000001_force_fix_profile_trigger.sql` ❌
- `20260304000002_fix_profile_trigger_permissions.sql` ❌
- `20260304000003_fix_profile_rls_for_trigger.sql` ❌
- `20260304000004_final_profile_trigger_fix.sql` ❌
- `20260304000005_fix_profile_trigger_syntax.sql` ✅ MANTER (última e correta)

#### Migrations Duplicadas de RLS Chat (consolidar)
- Múltiplas tentativas de fix_rls (20+ arquivos entre 20260223-20260227)

## Plano de Ação

### Fase 1: Backup e Preparação
1. ✅ Criar backup completo da pasta migrations
2. ✅ Documentar estado atual
3. ✅ Identificar migrations já aplicadas no banco

### Fase 2: Limpeza de Arquivos
1. **Mover arquivos .md** para pasta de documentação
2. **Remover migrations de debug/teste**
3. **Remover migrations duplicadas obsoletas**
4. **Renomear arquivos sem timestamp correto**

### Fase 3: Correção de Sintaxe SQL
1. **Corrigir delimitadores** em TODOS os arquivos restantes
2. **Validar sintaxe SQL** de cada migration
3. **Remover comandos problemáticos** (COMMENT ON sem permissão, etc)

### Fase 4: Consolidação
1. **Criar migration consolidada** para substituir múltiplas migrations de mesmo propósito
2. **Atualizar referências** entre migrations
3. **Testar ordem de execução**

### Fase 5: Aplicação
1. **Aplicar migrations limpas** no banco de desenvolvimento
2. **Verificar integridade** do banco
3. **Testar funcionalidades críticas** (OAuth, etc)

## Execução Imediata

### Ação 1: Mover Documentação
```bash
mkdir -p .kiro/migrations-docs
mv supabase/migrations/*.md .kiro/migrations-docs/
```

### Ação 2: Remover Migrations de Debug
```bash
# Lista para revisão antes de deletar
```

### Ação 3: Corrigir Delimitadores SQL
```powershell
# Script profissional que corrige TODOS os delimitadores
```

### Ação 4: Aplicar Migrations Limpas
```bash
supabase db push --include-all
```

## Resultado Esperado

- **~80 migrations** limpas e funcionais
- **0 arquivos .md** em migrations/
- **0 migrations de debug/teste**
- **Sintaxe SQL 100% correta**
- **Banco de dados funcional** com OAuth operacional

## Próximos Passos

1. Aprovar este plano
2. Executar Fase 2 (Limpeza)
3. Executar Fase 3 (Correção)
4. Executar Fase 5 (Aplicação)
5. Testar OAuth
