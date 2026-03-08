# Correção: Integridade de Dados de Assinaturas

## Problema Identificado

Múltiplas incoerências nos dados de assinaturas causando exibição incorreta nos detalhes do pedido:

1. **Valor R$ 0,00** - Assinaturas sem `total_paid` definido
2. **Progresso incorreto** - `deliveries_completed` não refletia entregas reais
3. **Função de cálculo incorreta** - Nomes de planos em inglês vs português

## Análise Detalhada

### Assinatura Exemplo: 754d39ae-2d0b-4de9-9c9b-2ffdbf92a06a

**Dados antes da correção:**
- Plan Type: `anual`
- Total Paid: `0` (deveria ser R$ 249,90)
- Deliveries Completed: `0` (deveria ser `1` - entrega #1 revelada)
- Deliveries Total: `12`
- Status: `active`

**Incoerências detectadas:**
- ❌ Valor zerado apesar de ser assinatura ativa
- ❌ Progresso não refletia entrega #1 com status `revealed`
- ❌ Função `calculateSubscriptionDeliveryAmount` retornava 0 por usar nomes em inglês

## Soluções Aplicadas

### 1. Correção dos Dados no Banco

**Script:** `scripts/database/fix-subscription-data-integrity.mjs`

**Ações:**
- Atualizado `total_paid` baseado no `plan_type`:
  - `trimestral`: R$ 89,90
  - `semestral`: R$ 149,90
  - `anual`: R$ 249,90
- Recalculado `deliveries_completed` baseado em entregas com status `delivered` ou `revealed`

**Resultado:**
```
✅ 4 assinaturas corrigidas
- 754d39ae-2d0b-4de9-9c9b-2ffdbf92a06a (anual): R$ 0 → R$ 249,90, progresso 0 → 1
- d7661bc4-4063-4039-a7dc-06dd0513078a (semestral): R$ 0 → R$ 149,90, progresso 0 → 1
- ecaf0b32-a7f6-468a-a9c1-57da509ec5fa (trimestral): R$ 0 → R$ 89,90, progresso 0 → 1
- 308d0b5a-4d44-4297-bade-d8270f8c5d82 (trimestral): R$ 0 → R$ 89,90, progresso 0 → 1
```

### 2. Correção do Código

**Arquivo:** `src/services/admin/orders-transformer.ts`

**Problema:** Função `calculateSubscriptionDeliveryAmount` usava nomes de planos em inglês

```typescript
// ANTES (incorreto)
const planPrices: Record<string, number> = {
  monthly: 99.9,
  quarterly: 89.9,
  semiannual: 79.9,
  annual: 69.9,
};

// DEPOIS (correto)
const planPrices: Record<string, number> = {
  trimestral: 89.90,
  semestral: 149.90,
  anual: 249.90,
};
```

## Estrutura Real da Tabela

A tabela `subscriptions` tem a seguinte estrutura:

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  collection_id UUID NOT NULL,
  plan_type TEXT NOT NULL, -- 'trimestral', 'semestral', 'anual'
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Pagamento
  total_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_id TEXT,
  
  -- Entregas
  deliveries_total INTEGER NOT NULL DEFAULT 3,
  deliveries_completed INTEGER NOT NULL DEFAULT 0,
  
  -- Datas
  next_delivery_date TIMESTAMPTZ,
  next_production_start TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Nota:** A tabela NÃO tem colunas `amount`, `start_date` ou `next_billing_date`.

## Scripts Criados

1. **diagnose-subscription-data.mjs** - Diagnóstico detalhado de uma assinatura específica
2. **fix-subscription-data-integrity.mjs** - Correção automática de integridade de dados

## Prevenção Futura

### Recomendações

1. **Validação na Criação**: Garantir que `total_paid` seja sempre definido ao criar assinatura
2. **Atualização Automática**: Criar trigger para atualizar `deliveries_completed` quando status de entrega mudar
3. **Testes**: Adicionar testes que validem integridade dos dados
4. **Documentação**: Manter documentação atualizada sobre estrutura de tabelas

### Trigger Sugerido

```sql
CREATE OR REPLACE FUNCTION update_subscription_deliveries_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('delivered', 'revealed') AND OLD.status NOT IN ('delivered', 'revealed') THEN
    UPDATE subscriptions
    SET deliveries_completed = deliveries_completed + 1
    WHERE id = NEW.subscription_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deliveries_completed
AFTER UPDATE ON subscription_deliveries
FOR EACH ROW
EXECUTE FUNCTION update_subscription_deliveries_completed();
```

## Resultado Final

✅ Dados corrigidos no banco de dados
✅ Código atualizado para usar nomes corretos de planos
✅ Valores exibidos corretamente na interface
✅ Progresso de entregas reflete situação real
✅ Scripts de diagnóstico e correção disponíveis

## Data da Correção

8 de março de 2026

## Arquivos Modificados

- `src/services/admin/orders-transformer.ts`
- `scripts/database/diagnose-subscription-data.mjs` (novo)
- `scripts/database/fix-subscription-data-integrity.mjs` (novo)
- `docs/production/CORRECAO_INTEGRIDADE_ASSINATURAS.md` (novo)
