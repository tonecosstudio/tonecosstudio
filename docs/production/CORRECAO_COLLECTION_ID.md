# Correção: Assinaturas sem collection_id

## Problema Identificado

Algumas assinaturas no banco de dados não tinham `collection_id` definido, causando a exibição de "Coleção não disponível" nos detalhes do pedido.

## Causa Raiz

As assinaturas foram criadas sem validação obrigatória do campo `collection_id`, permitindo valores NULL.

## Solução Aplicada

### 1. Diagnóstico

Criado script `scripts/database/fix-subscriptions-missing-collection.mjs` para identificar assinaturas sem collection_id.

**Resultado**: 4 assinaturas identificadas:
- `754d39ae-2d0b-4de9-9c9b-2ffdbf92a06a` (Plano anual)
- `d7661bc4-4063-4039-a7dc-06dd0513078a` (Plano semestral)
- `ecaf0b32-a7f6-468a-a9c1-57da509ec5fa` (Plano trimestral)
- `308d0b5a-4d44-4297-bade-d8270f8c5d82` (Plano trimestral)

### 2. Correção dos Dados

Executado script `scripts/database/fix-missing-collections-auto.mjs` que:
- Identificou as 4 assinaturas sem collection_id
- Atribuiu a coleção "One Piece - Tripulação Mugiwara" para todas
- Atualizou com sucesso 100% dos registros

### 3. Correção no Código

#### 3.1. Hook useProductionInfo.ts

**Problema**: Query tentava fazer join com `collection_characters` usando sintaxe incorreta.

**Correção**: Removido join desnecessário, usando campos desnormalizados:

```typescript
// ANTES (incorreto)
.select(`
  id,
  status,
  deadline,
  character_id,
  submitted_at,
  approved_at,
  collection_characters!inner(
    name
  )
`)

// DEPOIS (correto)
.select(`
  id,
  status,
  deadline,
  character_id,
  character_name,
  submitted_at,
  approved_at
`)
```

## Prevenção Futura

### Recomendações

1. **Validação no Banco**: Adicionar constraint NOT NULL na coluna `subscriptions.collection_id`
2. **Validação na Aplicação**: Garantir que toda criação de assinatura exija collection_id
3. **Testes**: Adicionar testes que validem a presença de collection_id

### Scripts Criados

- `scripts/database/fix-subscriptions-missing-collection.mjs` - Diagnóstico detalhado
- `scripts/database/fix-subscriptions-missing-collection-v2.mjs` - Inferência inteligente
- `scripts/database/list-collections.mjs` - Listar coleções disponíveis
- `scripts/database/assign-collections-to-subscriptions.mjs` - Atribuição interativa
- `scripts/database/fix-missing-collections-auto.mjs` - Correção automática (usado)

## Resultado

✅ Problema resolvido
✅ 4 assinaturas corrigidas
✅ Código atualizado para evitar joins desnecessários
✅ Scripts de manutenção criados para uso futuro

## Data da Correção

8 de março de 2026
