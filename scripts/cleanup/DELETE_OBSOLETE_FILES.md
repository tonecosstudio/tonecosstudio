# 🗑️ Arquivos Obsoletos para Deletar

**Data**: 2026-03-08  
**Objetivo**: Manter o sistema limpo e otimizado

---

## ✅ Arquivos Confirmados como Obsoletos

### 1. Páginas Admin Temporárias
- `src/pages/admin/ProductionHub_temp.tsx` - ❌ Não usado (substituído por ProductionHub.tsx)

### 2. Services Legados
- `src/services/admin/orders-service-v2.ts` - ❌ Não usado (substituído por orders-service-v3.ts)

### 3. Diretório Archive Completo
- `scripts/archive/` - ❌ Arquivos antigos de correções e migrações já aplicadas
  - `scripts/archive/fixes-406/` - Correções antigas
  - `scripts/archive/old-analysis/` - Análises antigas
  - `scripts/archive/old-migrations/` - Migrações antigas
  - `scripts/archive/old-seeds/` - Seeds antigos
  - `scripts/archive/old-utilities/` - Utilitários antigos
  - `scripts/archive/temp-fixes/` - Correções temporárias

### 4. Documentação de Debug (Já Resolvidos)
- `docs/production/DEBUG_PERSONAGEM_MODAL.md` - ✅ Bug corrigido
- `docs/production/ANALISE_BUG_PERSONAGEM_COMPRA_AVULSA.md` - ✅ Bug corrigido
- `docs/production/ANALISE_BUG_STATUS_COMPRA_AVULSA.md` - ✅ Bug corrigido

### 5. Scripts de Correção Já Aplicados
- `scripts/database/fix-standalone-purchase-character.mjs` - ✅ Correção aplicada
- `scripts/database/debug-character-relationship.mjs` - ✅ Debug concluído
- `scripts/database/analyze-standalone-purchase.mjs` - ✅ Análise concluída
- `scripts/database/fix-standalone-stages.mjs` - ✅ Correção aplicada
- `scripts/database/fix-stage-payment-sync.mjs` - ✅ Correção aplicada
- `scripts/database/fix-subscription-data-integrity.mjs` - ✅ Correção aplicada
- `scripts/database/diagnose-subscription-data.mjs` - ✅ Diagnóstico concluído
- `scripts/database/assign-collections-to-subscriptions.mjs` - ✅ Atribuição concluída
- `scripts/database/fix-subscriptions-missing-collection.mjs` - ✅ Correção aplicada
- `scripts/database/fix-subscriptions-missing-collection-v2.mjs` - ✅ Correção aplicada

### 6. Scripts de Aplicação de Migrations (Já Aplicadas)
- `scripts/database/apply-production-stages-migration.mjs` - ✅ Migration aplicada
- `scripts/database/execute-production-stages-migration.mjs` - ✅ Migration aplicada
- `scripts/database/apply-constraint-update.mjs` - ✅ Constraint aplicado
- `scripts/database/apply-status-sync-migrations.mjs` - ✅ Migration aplicada
- `scripts/database/apply-delivery-address-migration.mjs` - ✅ Migration aplicada
- `scripts/database/apply-delivery-address-direct.mjs` - ✅ Migration aplicada

---

## 📋 Arquivos a MANTER (Úteis)

### Scripts de Análise (Úteis para Monitoramento)
- ✅ `scripts/database/analyze-delivery-addresses.mjs` - Útil para verificar endereços
- ✅ `scripts/database/analyze-profile-completeness.mjs` - Útil para verificar perfis
- ✅ `scripts/database/analyze-stage-payment-sync.mjs` - Útil para verificar sincronização
- ✅ `scripts/database/analyze-payment-flow.mjs` - Útil para verificar fluxo de pagamento
- ✅ `scripts/database/test-trigger-validation.mjs` - Útil para validar triggers

### Scripts SQL de Aplicação (Referência)
- ✅ `scripts/database/APPLY_*.sql` - Úteis como referência para reaplicar se necessário
- ✅ `scripts/database/EXECUTE_IN_SUPABASE_DASHBOARD.sql` - Útil para executar no dashboard

### Documentação (Referência)
- ✅ `docs/production/RESUMO_IMPLEMENTACOES_2026-03-08.md` - Resumo importante
- ✅ `docs/production/SISTEMA_NIVEL_AAA_CONFIRMADO.md` - Documentação do sistema
- ✅ `docs/production/VALIDACAO_CAMPOS_OBRIGATORIOS.md` - Documentação de validações
- ✅ `docs/production/ENDERECO_ENTREGA_OBRIGATORIO.md` - Documentação de endereços
- ✅ `docs/production/FRONTEND_ENDERECO_IMPLEMENTADO.md` - Documentação frontend
- ✅ `docs/production/IMPLEMENTACAO_SEPARACAO_STATUS.md` - Documentação de status
- ✅ `docs/production/NOVO_FLUXO_ESTAGIOS.md` - Documentação de estágios
- ✅ `docs/production/FLUXO_PAGAMENTO_COMPRAS_AVULSA.md` - Documentação de pagamento

---

## 🗑️ Comando para Deletar

Execute os comandos abaixo para deletar os arquivos obsoletos:

```bash
# Páginas temporárias
rm src/pages/admin/ProductionHub_temp.tsx

# Services legados
rm src/services/admin/orders-service-v2.ts

# Diretório archive completo
rm -rf scripts/archive

# Documentação de debug
rm docs/production/DEBUG_PERSONAGEM_MODAL.md
rm docs/production/ANALISE_BUG_PERSONAGEM_COMPRA_AVULSA.md
rm docs/production/ANALISE_BUG_STATUS_COMPRA_AVULSA.md

# Scripts de correção já aplicados
rm scripts/database/fix-standalone-purchase-character.mjs
rm scripts/database/debug-character-relationship.mjs
rm scripts/database/analyze-standalone-purchase.mjs
rm scripts/database/fix-standalone-stages.mjs
rm scripts/database/fix-stage-payment-sync.mjs
rm scripts/database/fix-subscription-data-integrity.mjs
rm scripts/database/diagnose-subscription-data.mjs
rm scripts/database/assign-collections-to-subscriptions.mjs
rm scripts/database/fix-subscriptions-missing-collection.mjs
rm scripts/database/fix-subscriptions-missing-collection-v2.mjs

# Scripts de aplicação de migrations
rm scripts/database/apply-production-stages-migration.mjs
rm scripts/database/execute-production-stages-migration.mjs
rm scripts/database/apply-constraint-update.mjs
rm scripts/database/apply-status-sync-migrations.mjs
rm scripts/database/apply-delivery-address-migration.mjs
rm scripts/database/apply-delivery-address-direct.mjs
```

---

## 📊 Resumo

**Total de arquivos a deletar**: ~30 arquivos + 1 diretório completo

**Espaço estimado liberado**: ~500KB de código obsoleto

**Benefícios**:
- ✅ Código mais limpo e organizado
- ✅ Menos confusão sobre qual arquivo usar
- ✅ Build mais rápido
- ✅ Menos arquivos para manter

---

**Criado por**: Kiro AI  
**Data**: 2026-03-08
