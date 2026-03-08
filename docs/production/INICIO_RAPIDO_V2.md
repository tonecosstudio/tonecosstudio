# Início Rápido - Nova Página de Pedidos V2

## 🚀 3 Passos para Testar

### 1. Adicionar Rota (1 min)

Edite `src/App.tsx` e adicione:

```typescript
import OrdersPageV2 from '@/pages/admin/OrdersPageV2';

// Adicione esta linha nas rotas:
<Route path="/admin/orders-v2" element={<OrdersPageV2 />} />
```

### 2. Acessar Página (1 min)

Navegue para: `http://localhost:5173/admin/orders-v2`

### 3. Verificar Console (1 min)

Pressione F12 e procure por:

```
🔍 [OrdersV2] Fetching orders...
📦 [OrdersV2] Deliveries: X items
🛒 [OrdersV2] Purchases: Y items  ← PEDIDOS AVULSOS!
💰 [OrdersV2] Payments: Z items
📋 [OrdersV2] Quotes: W items
```

## ✅ Sucesso?

Se você vê pedidos avulsos (🛒), está funcionando!

**Próximo passo**: Migrar rota de `/admin/orders` para usar `OrdersPageV2`

## ❌ Não Funciona?

### Se não há pedidos avulsos:

Execute no Supabase SQL Editor:

```sql
SELECT COUNT(*) FROM standalone_purchases;
```

Se retornar 0, não há dados. Crie um pedido avulso de teste.

### Se há erros no console:

Procure por `❌ [OrdersV2]` e copie a mensagem de erro.

## 📚 Documentação Completa

- `TESTE_NOVA_PAGINA.md` - Guia completo de teste
- `RESUMO_IMPLEMENTACAO_V2.md` - Resumo da implementação
- `DIAGNOSTICO_PEDIDOS_AVULSOS.md` - Diagnóstico do problema

## 💡 Dica

A nova página tem logs detalhados. Use o console para entender o que está acontecendo!
