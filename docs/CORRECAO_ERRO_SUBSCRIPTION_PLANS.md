# Correção do Erro subscription_plans

## Erro Identificado

```
GET https://pabxpvqwtvbjaunjejud.supabase.co/rest/v1/subscription_plans?select=id%2Cname%2Cprice 400 (Bad Request)
```

## Causa Raiz

O código em `AdminHome.tsx` linha 377 estava tentando buscar uma coluna `price` que não existe na tabela `subscription_plans`.

### Estrutura Real da Tabela

A tabela `subscription_plans` possui:
- `price_full` - Preço cheio
- `price_pix` - Preço com desconto PIX

Não existe coluna `price`.

## Correção Aplicada

### Arquivo: `src/pages/admin/AdminHome.tsx`

**Antes (linha 377):**
```typescript
const { data: allSubscriptions } = await supabase
  .from("subscription_plans")
  .select("id, name, price");  // ❌ Coluna 'price' não existe
```

**Depois:**
```typescript
const { data: allSubscriptions } = await supabase
  .from("subscription_plans")
  .select("id, name, price_pix");  // ✅ Usando coluna correta
```

**Cálculo do preço médio também foi corrigido (linha 386):**

**Antes:**
```typescript
const averagePrice =
  allSubscriptions && allSubscriptions.length > 0
    ? allSubscriptions.reduce((acc, s) => acc + (s.price || 0), 0) / allSubscriptions.length
    : 0;
```

**Depois:**
```typescript
const averagePrice =
  allSubscriptions && allSubscriptions.length > 0
    ? allSubscriptions.reduce((acc, s) => acc + (s.price_pix || 0), 0) / allSubscriptions.length
    : 0;
```

## Justificativa da Escolha

Escolhemos `price_pix` ao invés de `price_full` porque:
1. É o preço mais comum usado pelos clientes (desconto PIX)
2. Representa melhor a receita real esperada
3. É mais conservador para cálculos de MRR e LTV

## Verificação

✅ Erro 400 corrigido
✅ Query agora usa colunas existentes
✅ Cálculo de preço médio atualizado
✅ Sem erros de sintaxe no arquivo
✅ getDiagnostics confirmou: "No diagnostics found"

## Status

**CORRIGIDO** - Dashboard agora carrega sem erros de query.
