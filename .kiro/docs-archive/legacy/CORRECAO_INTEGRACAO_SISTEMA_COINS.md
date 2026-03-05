# ✅ Correção 6: Integração com Sistema de Coins Existente

## 🚨 Problema Identificado

### ❌ Documento Atual (Incompleto):

O documento de preços contextuais foca apenas em:
- ✅ Cálculo de preços em COINS
- ✅ Exibição de preços
- ❌ **NÃO menciona** como integrar com sistema de coins existente

**Sistema de Coins Existente**:
```
✅ Compra de coins (usuário paga R$ → recebe COINS)
✅ Saldo de coins (user_coins table)
✅ Débito de coins (ao comprar personagem)
✅ Histórico de transações
```

**Problema**:
- ❌ Risco de implementação duplicada
- ❌ Lógica divergente entre sistemas
- ❌ Não está claro como o preço calculado se conecta ao débito
- ❌ Falta validação de saldo antes da compra

---

## ✅ Solução: Integração Explícita

### Conceito:

O **Sistema de Preços Contextuais** calcula o preço, mas o **Sistema de Coins** executa a transação.

### Fluxo Completo:

```
1. Usuário vê personagem no catálogo
   ↓
2. Sistema calcula preço contextual
   get_character_price(character_id, user_id) → 1000 coins
   ↓
3. Usuário clica "Comprar"
   ↓
4. Sistema valida saldo
   SELECT balance FROM user_coins WHERE user_id = ? 
   → Se balance < 1000: ERRO "Saldo insuficiente"
   ↓
5. Sistema debita coins
   UPDATE user_coins SET balance = balance - 1000
   ↓
6. Sistema registra transação
   INSERT INTO coin_transactions (user_id, amount, type, reference)
   VALUES (user_id, -1000, 'character_purchase', character_id)
   ↓
7. Sistema adiciona personagem ao usuário
   INSERT INTO user_characters (user_id, character_id)
   ↓
8. Sistema exibe confirmação
   "Personagem adquirido! Saldo: X coins"
```

---

## 📊 Estrutura do Sistema de Coins Existente

### Tabelas Existentes

#### 1. `user_coins`
**Descrição**: Saldo de coins de cada usuário

```sql
-- Tabela existente (não alterar)
CREATE TABLE user_coins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `coin_transactions`
**Descrição**: Histórico de todas as transações de coins

```sql
-- Tabela existente (não alterar)
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount INTEGER NOT NULL,  -- Positivo = crédito, Negativo = débito
  type TEXT NOT NULL,  -- 'purchase', 'character_purchase', 'refund', etc
  reference_id UUID,  -- ID do personagem, pedido, etc
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. `coin_packages`
**Descrição**: Pacotes de coins disponíveis para compra

```sql
-- Tabela existente (não alterar)
CREATE TABLE coin_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  coins_amount INTEGER NOT NULL,
  price_brl DECIMAL(10,2) NOT NULL,  -- Preço em R$
  bonus_coins INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);
```

---

## 🔗 Pontos de Integração

### 1. Cálculo de Preço (Sistema de Preços Contextuais)

```sql
-- Função do sistema de preços contextuais
SELECT get_character_price('character-uuid', 'user-uuid');
-- Retorna: 1000 coins
```

### 2. Validação de Saldo (Sistema de Coins)

```sql
-- Função do sistema de coins
CREATE OR REPLACE FUNCTION validate_user_balance(
  p_user_id UUID,
  p_required_amount INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance INTO v_balance
  FROM user_coins
  WHERE user_id = p_user_id;
  
  IF v_balance IS NULL THEN
    RETURN false;  -- Usuário não tem registro de coins
  END IF;
  
  RETURN v_balance >= p_required_amount;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 3. Compra de Personagem (Integração)

```sql
-- Função que integra ambos os sistemas
CREATE OR REPLACE FUNCTION purchase_character(
  p_user_id UUID,
  p_character_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_balance INTEGER
) AS $$
DECLARE
  v_price INTEGER;
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- 1. Calcular preço contextual
  v_price := get_character_price(p_character_id, p_user_id);
  
  -- 2. Verificar saldo
  SELECT balance INTO v_balance
  FROM user_coins
  WHERE user_id = p_user_id;
  
  IF v_balance IS NULL THEN
    RETURN QUERY SELECT false, 'Usuário não possui saldo de coins', 0;
    RETURN;
  END IF;
  
  IF v_balance < v_price THEN
    RETURN QUERY SELECT false, 
      format('Saldo insuficiente. Necessário: %s coins, Disponível: %s coins', v_price, v_balance),
      v_balance;
    RETURN;
  END IF;
  
  -- 3. Verificar se já possui o personagem
  IF EXISTS (
    SELECT 1 FROM user_characters
    WHERE user_id = p_user_id AND character_id = p_character_id
  ) THEN
    RETURN QUERY SELECT false, 'Você já possui este personagem', v_balance;
    RETURN;
  END IF;
  
  -- 4. Debitar coins
  UPDATE user_coins
  SET balance = balance - v_price,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  -- 5. Registrar transação
  INSERT INTO coin_transactions (user_id, amount, type, reference_id, description)
  VALUES (
    p_user_id,
    -v_price,
    'character_purchase',
    p_character_id,
    format('Compra de personagem - %s coins', v_price)
  );
  
  -- 6. Adicionar personagem ao usuário
  INSERT INTO user_characters (user_id, character_id, acquired_at)
  VALUES (p_user_id, p_character_id, NOW());
  
  -- 7. Retornar sucesso
  RETURN QUERY SELECT true, 
    format('Personagem adquirido com sucesso! Novo saldo: %s coins', v_new_balance),
    v_new_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION purchase_character IS 
  'Integra sistema de preços contextuais com sistema de coins para comprar personagem';
```

---

## 🎯 Regras de Negócio Atualizadas

### RN006: Integração com Sistema de Coins

**Descrição**: Compra de personagem sempre debita coins do saldo do usuário

**Regras**:
1. **Preço é calculado** pelo sistema de preços contextuais (`get_character_price()`)
2. **Saldo é validado** antes da compra (balance >= preço)
3. **Débito é executado** pelo sistema de coins (UPDATE user_coins)
4. **Transação é registrada** no histórico (INSERT coin_transactions)
5. **Personagem é adicionado** ao usuário (INSERT user_characters)

**Validações**:
- ❌ Saldo insuficiente → Erro "Saldo insuficiente. Necessário: X coins"
- ❌ Personagem já possui → Erro "Você já possui este personagem"
- ❌ Personagem não existe → Erro "Personagem não encontrado"
- ✅ Tudo OK → Débito + Adiciona personagem + Retorna novo saldo

**Atomicidade**:
- Toda a operação deve ser atômica (transação SQL)
- Se qualquer passo falhar, rollback completo
- Garantir que coins não sejam debitados sem adicionar personagem

---

## 🎨 Interface do Usuário

### Exibição de Preço e Saldo

```tsx
function CharacterCard({ characterId }) {
  const { data: user } = useUser();
  const { data: priceCoins } = useCharacterPrice(characterId);
  const { data: userBalance } = useUserCoins(user?.id);
  
  const canAfford = userBalance >= priceCoins;
  
  return (
    <Card>
      <CardContent>
        <h3>Personagem X</h3>
        
        {/* Preço contextual */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{priceCoins} 🪙</span>
          {!canAfford && (
            <Badge variant="destructive">Saldo insuficiente</Badge>
          )}
        </div>
        
        {/* Saldo do usuário */}
        <p className="text-sm text-muted">
          Seu saldo: {userBalance} 🪙
        </p>
        
        {/* Botão de compra */}
        <Button 
          onClick={handlePurchase}
          disabled={!canAfford}
        >
          {canAfford ? 'Comprar' : 'Saldo Insuficiente'}
        </Button>
        
        {/* Link para comprar mais coins */}
        {!canAfford && (
          <Button variant="link" onClick={() => navigate('/coins/buy')}>
            Comprar mais coins
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

### Fluxo de Compra

```tsx
function handlePurchase() {
  // 1. Confirmar compra
  if (!confirm(`Comprar personagem por ${priceCoins} coins?`)) {
    return;
  }
  
  // 2. Executar compra
  purchaseCharacter.mutate({
    characterId,
    userId: user.id
  }, {
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        // Invalidar cache
        queryClient.invalidateQueries(['user-coins']);
        queryClient.invalidateQueries(['user-characters']);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error('Erro ao comprar personagem');
    }
  });
}
```

---

## 🔧 Hooks Atualizados

### 1. `useUserCoins` (Novo)

```typescript
export function useUserCoins(userId: string) {
  return useQuery({
    queryKey: ['user-coins', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data.balance;
    },
    enabled: !!userId,
  });
}
```

### 2. `usePurchaseCharacter` (Novo)

```typescript
export function usePurchaseCharacter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ characterId, userId }: PurchaseParams) => {
      const { data, error } = await supabase.rpc('purchase_character', {
        p_user_id: userId,
        p_character_id: characterId
      });
      
      if (error) throw error;
      return data[0];  // { success, message, new_balance }
    },
    onSuccess: () => {
      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: ['user-coins'] });
      queryClient.invalidateQueries({ queryKey: ['user-characters'] });
      queryClient.invalidateQueries({ queryKey: ['coin-transactions'] });
    },
  });
}
```

### 3. `useCoinTransactions` (Novo)

```typescript
export function useCoinTransactions(userId: string) {
  return useQuery({
    queryKey: ['coin-transactions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
```

---

## 📋 Casos de Uso Atualizados

### UC007: Comprar Personagem com Coins

**Ator**: Usuário autenticado

**Pré-condições**:
- Usuário está autenticado
- Usuário tem saldo de coins
- Personagem existe e está disponível

**Fluxo Principal**:
1. Usuário acessa catálogo de personagens
2. Sistema exibe preço contextual de cada personagem
3. Sistema exibe saldo atual do usuário
4. Usuário clica "Comprar" em um personagem
5. Sistema valida saldo (balance >= preço)
6. Sistema exibe confirmação "Comprar por X coins?"
7. Usuário confirma
8. Sistema debita coins do saldo
9. Sistema registra transação no histórico
10. Sistema adiciona personagem ao usuário
11. Sistema exibe confirmação "Personagem adquirido! Novo saldo: Y coins"

**Fluxo Alternativo 5a: Saldo Insuficiente**:
5a1. Sistema exibe erro "Saldo insuficiente. Necessário: X coins, Disponível: Y coins"
5a2. Sistema exibe botão "Comprar mais coins"
5a3. Usuário clica e é redirecionado para página de compra de coins
5a4. Retorna ao passo 1

**Fluxo Alternativo 5b: Personagem Já Possui**:
5b1. Sistema exibe erro "Você já possui este personagem"
5b2. Retorna ao passo 1

**Pós-condições**:
- Coins debitados do saldo
- Transação registrada no histórico
- Personagem adicionado ao usuário
- Saldo atualizado na interface

**Regras de Negócio**: RN001, RN002, RN004, RN006

---

## 🎉 Conclusão

A **Correção 6: Integração com Sistema de Coins** garante que:

1. ✅ **Preço é calculado** pelo sistema de preços contextuais
2. ✅ **Saldo é validado** antes da compra
3. ✅ **Débito é executado** pelo sistema de coins
4. ✅ **Transação é registrada** no histórico
5. ✅ **Atomicidade** garantida (tudo ou nada)
6. ✅ **Interface clara** mostra preço e saldo
7. ✅ **Sem duplicação** de lógica

### Antes (Incompleto):
```
❌ Não menciona sistema de coins existente
❌ Risco de implementação duplicada
❌ Lógica divergente
```

### Depois (Completo):
```
✅ Integração explícita com sistema de coins
✅ Função purchase_character() integra ambos
✅ Validação de saldo antes da compra
✅ Débito atômico com registro de transação
✅ Interface mostra preço e saldo
✅ Sem duplicação de lógica
```

**Status**: ✅ Pronto para implementação

**Próximo Passo**: Atualizar spec com integração!
