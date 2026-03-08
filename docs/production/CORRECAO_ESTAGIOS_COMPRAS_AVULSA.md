# Correção: Estágios de Compras Avulsa

## ✅ Status: CORRIGIDO

Data: 08/03/2026

## 🎯 Problema Identificado

Compras avulsa estavam com estágios incorretos na fila de produção:

### Problemas Encontrados
1. ❌ Estágio `awaiting_choice` (compras avulsa escolhem personagem na hora da compra)
2. ❌ `choice_status` como `pending` (deveria ser `locked` ou `approved`)
3. ⚠️  `character_id` NULL na `production_queue` (mas presente na `standalone_purchases`)

## 📊 Análise

### Pedido 1: 9254ac09
- **Estágio**: model_preparation ✅
- **Status**: deposit_paid
- **Problema**: character_id NULL

### Pedido 2: b4ff58da
- **Estágio**: awaiting_choice ❌
- **Status**: balance_paid (pagamento completo)
- **Problemas**:
  - Estágio incorreto (deveria ser `payment_confirmed`)
  - choice_status `pending` (deveria ser `locked`)
  - character_id NULL

## 🔧 Correções Aplicadas

### Script Criado
`scripts/database/fix-standalone-stages.mjs`

### Correções Realizadas

#### Pedido 9254ac09
```javascript
{
  character_id: '11111111-1111-1111-1111-111111111101'
}
```

#### Pedido b4ff58da
```javascript
{
  current_stage: 'payment_confirmed',
  production_status: 'ready_for_production',
  choice_status: 'locked',
  character_id: '22222222-2222-2222-2222-222222222201'
}
```

## ✅ Resultado

- ✅ 2 itens corrigidos
- ✅ 0 compras com "awaiting_choice"
- ✅ 0 compras com choice_status "pending"
- ✅ Todos os character_id sincronizados

## 📋 Regras para Compras Avulsa

### Estágios Válidos
Compras avulsa seguem o fluxo normal de 12 estágios, EXCETO:
- ❌ NUNCA usar `awaiting_choice` (cliente escolhe na compra)
- ✅ Iniciar em `awaiting_payment` ou `payment_confirmed`

### Choice Status
- ✅ `locked` - Escolha feita e travada (padrão para compras avulsa)
- ✅ `approved` - Escolha aprovada pelo admin
- ❌ NUNCA `pending` - Não há escolha pendente

### Character ID
- ✅ Sempre sincronizar de `standalone_purchases.character_id`
- ✅ Deve estar presente em `production_queue.character_id`

### Estágio Baseado em Pagamento

| Pagamento | Estágio Correto |
|-----------|-----------------|
| Nenhum | `awaiting_payment` |
| Só depósito | `awaiting_payment` |
| Depósito + Saldo | `payment_confirmed` |

## 🔍 Scripts Disponíveis

### Análise
```bash
node scripts/database/analyze-standalone-stages.mjs
```
Analisa e identifica problemas em compras avulsa.

### Correção
```bash
node scripts/database/fix-standalone-stages.mjs
```
Corrige automaticamente os problemas identificados.

## 📝 Arquivos Modificados

1. ✅ `scripts/database/analyze-standalone-stages.mjs` (CRIADO)
2. ✅ `scripts/database/fix-standalone-stages.mjs` (CRIADO)
3. ✅ `docs/production/CORRECAO_ESTAGIOS_COMPRAS_AVULSA.md` (ESTE ARQUIVO)

## 🎉 Conclusão

Todas as compras avulsa agora seguem o fluxo correto de estágios:
- ✅ Sem "awaiting_choice"
- ✅ choice_status correto (`locked`)
- ✅ character_id sincronizado
- ✅ Estágio baseado no status de pagamento

Sistema pronto para produção!
