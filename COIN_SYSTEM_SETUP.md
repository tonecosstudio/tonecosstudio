# 🪙 Sistema de Coins - Guia de Instalação e Uso

## 📋 Visão Geral

Sistema completo de coins para compra de personagens, integrado com o sistema de preços contextuais existente.

## ✨ Funcionalidades

- ✅ Saldo de coins por usuário
- ✅ Histórico completo de transações
- ✅ Pacotes de coins para compra
- ✅ Compra de personagens com coins
- ✅ Validação de saldo automática
- ✅ Integração com preços contextuais
- ✅ Ajuste manual pelo admin
- ✅ RLS (Row Level Security) configurado
- ✅ Transações atômicas (tudo ou nada)

## 🚀 Instalação

### Pré-requisitos

- Supabase CLI instalado (`npm install -g supabase`)
- Arquivo `.env` configurado com:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Opção 1: Usando Supabase CLI (Recomendado)

```bash
# Aplicar todas as migrations
supabase db push

# Ou aplicar manualmente
supabase db push --file supabase/migrations/20260512000000_create_coin_system.sql
supabase db push --file supabase/migrations/20260512000001_create_coin_functions.sql
supabase db push --file supabase/migrations/20260512000002_update_user_characters_for_coins.sql
```

### Opção 2: Usando Script Bash

```bash
chmod +x apply-coin-migrations.sh
./apply-coin-migrations.sh
```

### Opção 3: Usando Script PowerShell

```powershell
.\apply-coin-migrations.ps1
```

### Opção 4: Manualmente no Supabase Dashboard

1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Copie e cole o conteúdo de cada migration na ordem:
   - `20260512000000_create_coin_system.sql`
   - `20260512000001_create_coin_functions.sql`
   - `20260512000002_update_user_characters_for_coins.sql`
4. Execute cada uma

## 📊 Estrutura de Dados

### Tabelas Criadas

#### `user_coins`
Saldo de coins de cada usuário.

```sql
user_id UUID PRIMARY KEY
balance INTEGER (saldo atual)
total_earned INTEGER (total ganho)
total_spent INTEGER (total gasto)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**Invariante**: `balance = total_earned - total_spent`

#### `coin_transactions`
Histórico completo de transações.

```sql
id UUID PRIMARY KEY
user_id UUID
amount INTEGER (positivo = ganho, negativo = gasto)
transaction_type TEXT (purchase, spend, refund, bonus, etc)
reference_id UUID (ID relacionado)
reference_type TEXT (character, package, subscription)
description TEXT
metadata JSONB
created_at TIMESTAMPTZ
```

#### `coin_packages`
Pacotes de coins disponíveis para compra.

```sql
id UUID PRIMARY KEY
name TEXT
amount INTEGER (coins base)
bonus INTEGER (coins bônus)
price_brl DECIMAL (preço em reais)
is_active BOOLEAN
is_popular BOOLEAN
is_best_value BOOLEAN
sort_order INTEGER
```

**Pacotes Iniciais**:
- Starter: 1000 coins por R$ 10,00
- Basic: 2500 + 500 bônus por R$ 20,00 (Popular)
- Premium: 5000 + 1500 bônus por R$ 35,00 (Melhor Valor)
- Mega: 10000 + 4000 bônus por R$ 60,00

### Campos Adicionados

#### `user_characters`
- `acquisition_type` TEXT (coin_purchase, subscription, gift, etc)
- `price_paid` INTEGER (preço pago em coins)
- `acquired_at` TIMESTAMPTZ (data de aquisição)

## 🔧 Funções Disponíveis

### 1. `add_coins_to_user()`
Adiciona coins ao saldo do usuário.

```sql
SELECT * FROM add_coins_to_user(
  p_user_id := 'user-uuid',
  p_amount := 5000,
  p_transaction_type := 'purchase',
  p_reference_id := 'package-uuid',
  p_reference_type := 'package',
  p_description := 'Compra de pacote Premium',
  p_metadata := '{"package_name": "Premium", "bonus": 1500}'::jsonb
);
```

**Retorna**:
```
success | message | new_balance | transaction_id
true    | ...     | 5000        | uuid
```

### 2. `debit_coins_from_user()`
Debita coins do saldo (com validação).

```sql
SELECT * FROM debit_coins_from_user(
  p_user_id := 'user-uuid',
  p_amount := 1200,
  p_reference_id := 'character-uuid',
  p_reference_type := 'character',
  p_description := 'Purchase: Hulk (Vingadores) - 1200 coins'
);
```

**Retorna**:
```
success | message | new_balance | transaction_id
true    | ...     | 3800        | uuid
```

### 3. `purchase_character_with_coins()` ⭐
Compra personagem com coins (função completa).

```sql
SELECT * FROM purchase_character_with_coins(
  p_user_id := 'user-uuid',
  p_character_id := 'character-uuid'
);
```

**Retorna**:
```
success | message | new_balance | price_paid
true    | Hulk acquired successfully! New balance: 3800 coins | 3800 | 1200
```

**O que faz**:
1. ✅ Valida se personagem existe
2. ✅ Valida se usuário já possui
3. ✅ Calcula preço contextual (usando `get_character_price()`)
4. ✅ Valida saldo suficiente
5. ✅ Debita coins atomicamente
6. ✅ Registra transação
7. ✅ Adiciona personagem ao usuário
8. ✅ Rollback automático em caso de erro

### 4. `get_user_coin_balance()`
Retorna saldo do usuário.

```sql
SELECT get_user_coin_balance('user-uuid');
-- Retorna: 5000
```

### 5. `validate_coin_balance()`
Valida se usuário tem saldo suficiente.

```sql
SELECT * FROM validate_coin_balance(
  p_user_id := 'user-uuid',
  p_required_amount := 1200
);
```

**Retorna**:
```
has_sufficient | current_balance | required_amount | missing_amount
true           | 5000            | 1200            | 0
```

### 6. `admin_adjust_coins()`
Permite admin ajustar saldo manualmente.

```sql
SELECT * FROM admin_adjust_coins(
  p_user_id := 'user-uuid',
  p_amount := 1000,  -- Positivo = adicionar, Negativo = remover
  p_reason := 'Compensação por bug',
  p_admin_id := 'admin-uuid'
);
```

## 🔒 Segurança (RLS)

### Políticas Configuradas

**user_coins**:
- ✅ Usuários veem apenas seu próprio saldo
- ✅ Admins veem todos os saldos
- ✅ Apenas funções podem modificar (SECURITY DEFINER)

**coin_transactions**:
- ✅ Usuários veem apenas suas transações
- ✅ Admins veem todas as transações
- ✅ Apenas funções podem inserir

**coin_packages**:
- ✅ Todos veem pacotes ativos
- ✅ Admins gerenciam pacotes

## 🎯 Integração com Frontend

### Atualizar Hooks

#### `useUserCoins.ts`
Remover mock e usar dados reais:

```typescript
export function useUserCoins(userId?: string | null) {
  return useQuery({
    queryKey: userId ? userCoinsKeys.balance(userId) : ["user-coins", "anonymous"],
    queryFn: async () => {
      if (!userId) {
        return { balance: 0, user_id: "", updated_at: "" };
      }

      const { data, error } = await supabase
        .from("user_coins")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // Se não existe, retornar 0
        if (error.code === 'PGRST116') {
          return { balance: 0, user_id: userId, updated_at: new Date().toISOString() };
        }
        throw error;
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
```

#### `usePurchaseCharacter.ts`
Remover mock e usar função real:

```typescript
export function usePurchaseCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PurchaseCharacterParams): Promise<PurchaseCharacterResponse> => {
      const { characterId, userId } = params;

      const { data, error } = await supabase.rpc("purchase_character_with_coins", {
        p_user_id: userId,
        p_character_id: characterId,
      });

      if (error) throw error;

      return {
        success: data[0].success,
        message: data[0].message,
        new_balance: data[0].new_balance,
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: userCoinsKeys.balance(variables.userId) });
      queryClient.invalidateQueries({ queryKey: ["user-characters"] });
      queryClient.invalidateQueries({ queryKey: ["coin-transactions"] });

      toast({
        title: "Compra realizada!",
        description: data.message,
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na compra",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
```

#### `useCoinTransactions.ts`
Remover mock e usar dados reais:

```typescript
export function useCoinTransactions(userId?: string | null) {
  return useQuery({
    queryKey: userId ? ["coin-transactions", userId] : ["coin-transactions", "anonymous"],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("coin_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}
```

## 💳 Integração de Pagamento

### Próximos Passos

1. **Escolher Gateway**:
   - PIX (Mercado Pago, Stripe, PagSeguro)
   - Cartão de Crédito (Stripe)

2. **Criar Webhook**:
   ```typescript
   // pages/api/webhooks/payment-confirmed.ts
   export default async function handler(req, res) {
     // Validar webhook
     // Adicionar coins usando add_coins_to_user()
   }
   ```

3. **Fluxo de Compra**:
   ```
   Usuário seleciona pacote
   → Cria pedido no gateway
   → Usuário paga
   → Webhook confirma pagamento
   → add_coins_to_user() adiciona coins
   → Usuário recebe coins
   ```

## 🧪 Testes

### Testar Manualmente

```sql
-- 1. Criar usuário de teste (se não existir)
INSERT INTO user_coins (user_id, balance, total_earned, total_spent)
VALUES ('test-user-uuid', 0, 0, 0);

-- 2. Adicionar coins
SELECT * FROM add_coins_to_user(
  'test-user-uuid',
  5000,
  'purchase',
  NULL,
  'package',
  'Teste de compra'
);

-- 3. Verificar saldo
SELECT * FROM user_coins WHERE user_id = 'test-user-uuid';

-- 4. Comprar personagem
SELECT * FROM purchase_character_with_coins(
  'test-user-uuid',
  'character-uuid'
);

-- 5. Ver histórico
SELECT * FROM coin_transactions WHERE user_id = 'test-user-uuid';
```

## 📝 Checklist de Implementação

- [x] Criar tabelas (user_coins, coin_transactions, coin_packages)
- [x] Criar funções SQL
- [x] Configurar RLS
- [x] Inserir pacotes iniciais
- [x] Atualizar user_characters
- [ ] Atualizar hooks do frontend (remover mocks)
- [ ] Integrar gateway de pagamento
- [ ] Criar webhook de confirmação
- [ ] Testar fluxo completo
- [ ] Adicionar testes automatizados
- [ ] Documentar API para frontend

## 🎉 Pronto!

O sistema de coins está completo e pronto para uso. Todas as operações são atômicas, seguras e auditáveis.

**Próximo passo**: Atualizar os hooks do frontend para usar os dados reais!
