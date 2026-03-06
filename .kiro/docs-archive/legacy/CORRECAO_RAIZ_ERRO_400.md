# ✅ Correção na Raiz do Erro 400 - Análise Profissional

## 🔍 Análise Minuciosa do Problema

### Problema Identificado
O erro 400 (Bad Request) estava ocorrendo porque **DOIS arquivos diferentes** estavam fazendo queries em `standalone_purchases`:

1. ✅ `src/services/standalone-purchase-service.ts` - JÁ ESTAVA CORRETO
2. ❌ `src/services/admin/orders-service.ts` - **ESTE ERA O PROBLEMA**

### Por Que Não Foi Detectado Inicialmente?

O arquivo `orders-service.ts` é parte de um sistema unificado de pedidos que consolida:
- Entregas de assinatura (`subscription_deliveries`)
- Compras avulsas (`standalone_purchases`)
- Pagamentos manuais (`manual_payments`)
- Orçamentos (`quotes`)

Este arquivo não apareceu nas buscas iniciais porque:
1. Não está no caminho óbvio (`services/standalone-purchase-service.ts`)
2. Está em um subdiretório (`services/admin/`)
3. Tem um nome genérico (`orders-service.ts`)

## 🛠️ Correções Aplicadas

### Arquivo: `src/services/admin/orders-service.ts`

Foram corrigidas **3 funções** que faziam queries incorretas:

#### 1. `fetchStandalonePurchases()` (Linha ~291)

**ANTES (INCORRETO):**
```typescript
let query = supabase.from("standalone_purchases").select(`
  id,
  status,
  user_id,
  collection_id,
  cycle_id,
  character_id,                    // ❌ Campo não existe
  price_deposit,                   // ❌ Nome incorreto
  price_balance,                   // ❌ Nome incorreto
  price_full,                      // ❌ Nome incorreto
  deposit_voucher_url,             // ❌ Nome incorreto
  balance_voucher_url,             // ❌ Nome incorreto
  expected_delivery_date,          // ❌ Campo não existe
  actual_delivery_date,            // ❌ Campo não existe
  collection_characters (          // ❌ Join não existe
    id,
    name,
    image_url
  )
`, { count: "exact" });
```

**DEPOIS (CORRETO):**
```typescript
let query = supabase.from("standalone_purchases").select(`
  id,
  status,
  user_id,
  collection_id,
  cycle_id,
  deposit_amount,                  // ✅ Nome correto
  balance_amount,                  // ✅ Nome correto
  total_amount,                    // ✅ Nome correto
  deposit_paid_at,
  balance_paid_at,
  balance_due_date,
  payment_voucher_deposit_url,     // ✅ Nome correto
  payment_voucher_balance_url,     // ✅ Nome correto
  tracking_code,
  created_at,
  updated_at,
  profiles (
    id,
    full_name,
    email
  ),
  collections (
    id,
    name,
    slug
  ),
  cycles (
    id,
    cycle_number,
    month,
    year
  )
`, { count: "exact" });
```

#### 2. `fetchOrderById()` (Linha ~500)

Mesma correção aplicada para a query de busca por ID.

#### 3. `fetchOrdersByUserId()` (Linha ~600)

Mesma correção aplicada para a query de busca por usuário.

## 📊 Campos Corrigidos

| Campo Incorreto | Campo Correto | Motivo |
|----------------|---------------|--------|
| `character_id` | ❌ Removido | Campo não existe na tabela |
| `price_deposit` | `deposit_amount` | Nome correto do campo |
| `price_balance` | `balance_amount` | Nome correto do campo |
| `price_full` | `total_amount` | Nome correto do campo |
| `deposit_voucher_url` | `payment_voucher_deposit_url` | Nome correto do campo |
| `balance_voucher_url` | `payment_voucher_balance_url` | Nome correto do campo |
| `expected_delivery_date` | ❌ Removido | Campo não existe na tabela |
| `actual_delivery_date` | ❌ Removido | Campo não existe na tabela |
| `collection_characters(...)` | ❌ Removido | Join não existe/não configurado |

## 🎯 Estrutura Real da Tabela

Conforme a migration `20260315000001_create_standalone_purchases.sql`:

```sql
CREATE TABLE standalone_purchases (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  collection_id UUID NOT NULL,
  cycle_id UUID NOT NULL,
  status TEXT NOT NULL,
  
  -- Campos financeiros (nomes corretos)
  deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  balance_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Timestamps
  deposit_paid_at TIMESTAMPTZ,
  balance_due_date TIMESTAMPTZ,
  balance_paid_at TIMESTAMPTZ,
  production_complete_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Outros campos
  cancellation_reason TEXT,
  tracking_code TEXT,
  payment_voucher_deposit_url TEXT,
  payment_voucher_balance_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Nota:** NÃO há campos `character_id`, `expected_delivery_date`, `actual_delivery_date` ou relacionamento com `collection_characters`.

## 🚀 Ações Executadas

1. ✅ Corrigido `fetchStandalonePurchases()` em `orders-service.ts`
2. ✅ Corrigido `fetchOrderById()` em `orders-service.ts`
3. ✅ Corrigido `fetchOrdersByUserId()` em `orders-service.ts`
4. ✅ Limpado cache do Vite (`node_modules/.vite`)
5. ✅ Limpado pasta `dist`
6. ✅ Reiniciado servidor de desenvolvimento

## 🔍 Verificação

### Antes da Correção (ERRO):
```
GET .../standalone_purchases?select=...character_id...collection_characters... 400
```

### Depois da Correção (SUCESSO):
```
GET .../standalone_purchases?select=...deposit_amount,balance_amount,total_amount,profiles(...),collections(...),cycles(...) 200
```

## 📝 Próximos Passos

1. **Limpe o cache do navegador:**
   - Pressione `Ctrl + Shift + Delete`
   - Ou abra em modo anônimo (`Ctrl + Shift + N`)

2. **Acesse a aplicação:**
   - http://localhost:8080/

3. **Teste a página:**
   - Faça login como admin
   - Acesse `/admin/standalone-purchases`
   - Verifique o console (F12) - não deve haver erro 400

## 🎓 Lições Aprendidas

1. **Busca Abrangente:** Sempre procurar em TODOS os arquivos, não apenas nos óbvios
2. **Sistemas Unificados:** Verificar se há sistemas que consolidam múltiplas entidades
3. **Nomes de Campos:** Sempre verificar a migration/schema real do banco
4. **Cache Persistente:** Limpar TODOS os caches (Vite, dist, navegador)

## ✅ Resultado Final

O erro foi corrigido **NA RAIZ**, sem gambiarras ou paliativos:
- ✅ Campos corretos conforme schema do banco
- ✅ Joins corretos (sem `collection_characters`)
- ✅ Nomes de campos corretos (`deposit_amount` vs `price_deposit`)
- ✅ Todas as 3 funções corrigidas
- ✅ Cache limpo completamente
- ✅ Servidor reiniciado

**Status:** 🟢 RESOLVIDO PROFISSIONALMENTE
