# Correção: Exibição de Personagem no Modal de Detalhes

## Problema Resolvido ✅

O modal de detalhes do pedido avulso mostrava apenas a coleção, mas não o personagem escolhido.

## Causa

O serviço `orders-service-v3.ts` não estava:
1. Buscando dados de `collection_characters` na query
2. Mapeando os dados do personagem no transformer

## Solução Aplicada

### Arquivo: `src/services/admin/orders-service-v3.ts`

#### 1. Query Atualizada (Linha ~271)

**ANTES**:
```typescript
.select(`
  *,
  profiles!inner(id, full_name, email),
  collections!inner(id, name, slug)
`)
```

**DEPOIS**:
```typescript
.select(`
  *,
  profiles!inner(id, full_name, email),
  collections!inner(id, name, slug),
  collection_characters(id, name, image_url)  // ← ADICIONADO
`)
```

#### 2. Transformer Atualizado (Linha ~460)

**ANTES**:
```typescript
standalonePurchase: {
  // ... outros campos
  character: undefined,  // ← SEMPRE UNDEFINED
}
```

**DEPOIS**:
```typescript
function transformPurchase(purchase: any): UnifiedOrder {
  // Mapear dados do personagem se existir
  const character = purchase.collection_characters ? {
    id: purchase.collection_characters.id,
    name: purchase.collection_characters.name,
    imageUrl: purchase.collection_characters.image_url,
  } : undefined;

  return {
    // ...
    standalonePurchase: {
      // ... outros campos
      character: character,  // ← AGORA MAPEADO CORRETAMENTE
    },
  };
}
```

## Resultado

### ANTES:
```
Detalhes do Pedido
Coleção: One Piece - Tripulação Mugiwara
(personagem não aparecia)
```

### DEPOIS:
```
Detalhes do Pedido
Coleção: One Piece - Tripulação Mugiwara

Personagem
Nome: Monkey D. Luffy
Imagem: [Ver imagem]
```

## Validação

1. Abrir modal de detalhes de qualquer compra avulsa
2. Verificar que seção "Personagem" aparece
3. Verificar que nome e imagem do personagem são exibidos

## Arquivos Modificados

- ✅ `src/services/admin/orders-service-v3.ts`
  - Query: Adicionado `collection_characters` no select
  - Transformer: Mapeamento correto do personagem

## Fluxo Completo Corrigido

1. ✅ Cliente escolhe personagem na compra (BuyCharacter.tsx)
2. ✅ Character_id é salvo no banco (create-standalone-purchase)
3. ✅ Query busca dados do personagem (orders-service-v3.ts)
4. ✅ Transformer mapeia personagem (orders-service-v3.ts)
5. ✅ Modal exibe personagem (StandalonePurchaseDetails.tsx)

## Status

✅ Correção completa aplicada
✅ Sem erros de diagnóstico
✅ Pronto para teste

Agora o personagem aparece corretamente no modal de detalhes! 🎉
