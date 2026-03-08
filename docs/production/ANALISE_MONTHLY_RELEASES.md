# Análise: Sistema de Lançamentos Mensais

## 📋 Resumo Executivo

A página `/admin/lancamentos-mensais` e o sistema `collection_monthly_releases` fazem parte de um **sistema híbrido de assinatura com coins** que **CONFLITA** com o sistema atual de `character_choices`.

## 🔍 O Que É

Sistema onde:
1. Admin configura 1 personagem por coleção por mês
2. Cliente escolhe entre os personagens disponíveis usando coins
3. Preços contextuais baseados na "coleção ativa" do cliente
4. Sistema de saldo de coins (trimestral: 600, semestral: 1300, anual: 2800)

## 📊 Estrutura do Sistema

### Tabelas Envolvidas
- `collection_monthly_releases` - Lançamentos mensais configurados pelo admin
- `subscription_monthly_selections` - Escolhas dos clientes
- `subscriptions` - Colunas: `active_collection_id`, `coins_balance`, `coins_initial`

### Páginas
- `/admin/lancamentos-mensais` - AdminMonthlyReleases.tsx
- `/escolha-mensal/:month` - MonthlyCharacterSelection.tsx

### Hooks
- `useSubscriptionCoins.ts` - 10 funções relacionadas

### Funções SQL
- `get_contextual_character_price()` - Calcula preço baseado em coleção ativa
- `update_subscription_coins_balance()` - Atualiza saldo automaticamente
- `auto_select_characters_for_subscription()` - Escolha automática
- `simulate_character_selection_impact()` - Simula impacto no saldo

## ⚠️ PROBLEMA: Conflito com Sistema Atual

### Sistema Atual (character_choices)
```
Cliente → Escolhe personagem → Aprovação manual → Produção
```

### Sistema Monthly Releases (não usado)
```
Admin configura lançamentos → Cliente escolhe com coins → Produção automática
```

### Conflitos Identificados

1. **Dois sistemas de escolha paralelos**
   - `character_choices` (usado atualmente)
   - `subscription_monthly_selections` (não usado)

2. **Lógica de preços diferente**
   - Sistema atual: sem coins, sem preços contextuais
   - Monthly releases: preços baseados em coleção ativa (200/240/300/450 coins)

3. **Fluxo de aprovação diferente**
   - Sistema atual: aprovação manual obrigatória
   - Monthly releases: escolha direta, sem aprovação

4. **Tabela subscriptions com colunas não usadas**
   - `active_collection_id` - NULL em todas
   - `coins_balance` - 0 em todas
   - `coins_initial` - 0 em todas

## 🔬 Verificação de Uso

Execute o script para verificar:
```sql
-- Ver scripts/diagnostics/verificar-monthly-releases.sql
```

Resultados esperados:
- `collection_monthly_releases`: 0 registros
- `subscription_monthly_selections`: 0 registros
- `subscriptions.active_collection_id`: todos NULL
- `character_choices`: registros existentes (sistema atual)

## 💡 Decisão Recomendada

### ❌ REMOVER Sistema Monthly Releases

**Motivos:**
1. Não está sendo usado (0 dados)
2. Conflita com sistema atual
3. Adiciona complexidade desnecessária
4. Colunas não usadas na tabela subscriptions
5. Código morto (2 páginas + hook + 4 funções SQL)

### ✅ Manter Sistema Atual (character_choices)

**Motivos:**
1. Está funcionando perfeitamente
2. Testado e validado (4 testes com sucesso)
3. Integrado com production_queue
4. Fluxo de aprovação manual necessário
5. Sem complexidade de coins/preços

## 📝 Plano de Remoção

### 1. Remover Páginas Frontend
- `src/pages/admin/AdminMonthlyReleases.tsx`
- `src/pages/MonthlyCharacterSelection.tsx`
- `src/components/subscription/CharacterSelectionCard.tsx` (se existir)
- `src/components/subscription/BalanceAlert.tsx` (se existir)

### 2. Remover Hook
- `src/hooks/useSubscriptionCoins.ts`

### 3. Criar Migration de Limpeza
```sql
-- Drop tabelas
DROP TABLE IF EXISTS subscription_monthly_selections CASCADE;
DROP TABLE IF EXISTS collection_monthly_releases CASCADE;

-- Drop view
DROP VIEW IF EXISTS subscription_selections_detailed CASCADE;

-- Drop funções
DROP FUNCTION IF EXISTS get_contextual_character_price CASCADE;
DROP FUNCTION IF EXISTS update_subscription_coins_balance CASCADE;
DROP FUNCTION IF EXISTS auto_select_characters_for_subscription CASCADE;
DROP FUNCTION IF EXISTS simulate_character_selection_impact CASCADE;

-- Remover colunas não usadas
ALTER TABLE subscriptions 
DROP COLUMN IF EXISTS active_collection_id,
DROP COLUMN IF EXISTS coins_balance,
DROP COLUMN IF EXISTS coins_initial;
```

### 4. Remover Rotas
- Verificar `src/App.tsx` ou arquivo de rotas
- Remover rotas para as páginas deletadas

## 🎯 Benefícios da Remoção

1. **Código mais limpo** - Remove 2000+ linhas de código não usado
2. **Menos confusão** - Um único sistema de escolha
3. **Banco mais simples** - Remove 2 tabelas, 1 view, 4 funções, 3 colunas
4. **Manutenção mais fácil** - Menos código para manter
5. **Performance** - Menos triggers, menos índices

## 🚀 Próximos Passos

1. Confirmar com usuário a decisão de remover
2. Executar script de verificação para confirmar 0 uso
3. Criar migration de limpeza
4. Remover arquivos frontend
5. Testar sistema atual continua funcionando
6. Commit: "chore: remove unused monthly releases system"

## 📌 Observação

Se no futuro houver necessidade de um sistema de coins/lançamentos mensais, será melhor:
1. Remover o sistema atual primeiro
2. Implementar o novo sistema do zero
3. Com design claro e sem conflitos
4. Baseado nas necessidades reais do negócio

---

**Conclusão:** Sistema de lançamentos mensais é código morto que deve ser removido para manter o projeto limpo e profissional.
