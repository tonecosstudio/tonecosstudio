# Correção: Personagem em Compra Avulsa

## Problema Resolvido ✅

Compras avulsas mostravam "Aguardando Escolha" mesmo o cliente tendo escolhido o personagem na hora da compra.

## Causa

O código da página `BuyCharacter.tsx` criava `manual_payment` mas NÃO criava `standalone_purchase` com o `character_id` do personagem escolhido.

## Solução Aplicada

### 1. Correção Imediata dos Dados ✅
```bash
node scripts/database/fix-standalone-purchase-character.mjs
```

**Resultado**: 
- 2 compras corrigidas
- Character IDs preenchidos
- Character choices desnecessários removidos
- Production queue atualizado

### 2. Atualização da Edge Function ✅
**Arquivo**: `supabase/functions/create-standalone-purchase/index.ts`

Adicionado parâmetro `characterId`:
```typescript
interface CreatePurchaseRequest {
  collectionId: string;
  cycleId: string;
  characterId?: string; // ← NOVO
  depositVoucherUrl?: string;
}
```

### 3. Atualização da Página de Compra ✅
**Arquivo**: `src/pages/BuyCharacter.tsx`

**ANTES** (Errado):
```typescript
// Criava manual_payment sem standalone_purchase
const { data: payment } = await supabase
  .from("manual_payments")
  .insert({ ... });
```

**DEPOIS** (Correto):
```typescript
// Cria standalone_purchase com character_id
const { data } = await supabase.functions.invoke(
  'create-standalone-purchase',
  {
    body: {
      collectionId: collection.id,
      cycleId: currentCycle.id,
      characterId: currentMonthCharacter.id, // ← Personagem escolhido
      depositVoucherUrl: null
    }
  }
);
```

## Fluxo Correto Agora

1. Cliente acessa `/colecoes/{slug}/comprar`
2. Vê o personagem do mês atual (revealed)
3. Clica em "Reservar com R$ 100,00"
4. Sistema cria `standalone_purchase` COM `character_id`
5. Personagem aparece imediatamente no pedido ✅

## Validação

### Teste Manual
1. Acessar `/colecoes/one-piece/comprar`
2. Clicar em "Reservar"
3. Verificar em "Meus Pedidos" que:
   - ✅ Personagem aparece no pedido
   - ✅ Não mostra "Aguardando Escolha"
   - ✅ Production queue mostra personagem correto

### Query de Verificação
```sql
-- Verificar que todas as compras avulsas têm personagem
SELECT 
  id,
  status,
  character_id,
  collections.name as collection_name
FROM standalone_purchases
LEFT JOIN collections ON collections.id = standalone_purchases.collection_id
WHERE character_id IS NULL;

-- Resultado esperado: 0 linhas
```

## Arquivos Modificados

### Scripts
- ✅ `scripts/database/fix-standalone-purchase-character.mjs` - Correção de dados (EXECUTADO)

### Edge Function
- ✅ `supabase/functions/create-standalone-purchase/index.ts` - Aceita characterId

### Frontend
- ✅ `src/pages/BuyCharacter.tsx` - Usa edge function corretamente

### Documentação
- ✅ `docs/production/ANALISE_BUG_PERSONAGEM_COMPRA_AVULSA.md` - Análise completa
- ✅ `docs/production/CORRECAO_PERSONAGEM_COMPRA_AVULSA.md` - Este documento

## Status Atual

| Item | Status |
|------|--------|
| Dados corrigidos | ✅ Concluído |
| Edge function atualizada | ✅ Concluído |
| Página BuyCharacter atualizada | ✅ Concluído |
| Testes | ⏳ Pendente (teste manual) |

## Próximo Passo

Testar o fluxo completo:
1. Fazer logout/login
2. Acessar `/colecoes/one-piece/comprar`
3. Clicar em "Reservar"
4. Verificar que personagem aparece no pedido

## Diferença Visual

**ANTES**:
```
Produção
Estágio Atual: Aguardando Escolha
Escolha de Personagem: Status Pendente
Prazo: em 7 dias
```

**DEPOIS**:
```
Produção
Personagem: Monkey D. Luffy
Estágio Atual: Em Produção
Status: Confirmado
```

Problema resolvido na raiz! 🎉
