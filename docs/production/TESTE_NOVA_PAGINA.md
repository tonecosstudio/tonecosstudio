# Teste da Nova Página de Pedidos V2

**Data**: 2026-03-08  
**Status**: Pronto para Teste  
**Rota**: `/admin/orders-v2` (temporária)

## ✅ Implementado

### Serviço
- [x] `orders-service-v2.ts` - Serviço otimizado com logs detalhados
- [x] `fetchAllOrders()` - Busca unificada de todos os tipos
- [x] `fetchOrderById()` - Busca individual
- [x] `updateOrderStatus()` - Atualização de status

### Hooks
- [x] `useOrdersData.ts` - Hook de dados com TanStack Query
- [x] `useOrdersFilters.ts` - Gerenciamento de filtros
- [x] `useOrdersPagination.ts` - Gerenciamento de paginação

### Página
- [x] `OrdersPageV2.tsx` - Página principal
- [x] Reutiliza componentes existentes (OrdersTable, OrderFilters, etc)
- [x] Logs detalhados no console para debug

## 🧪 Como Testar

### 1. Adicionar Rota Temporária

Edite o arquivo de rotas (provavelmente `src/App.tsx` ou similar) e adicione:

```typescript
import OrdersPageV2 from '@/pages/admin/OrdersPageV2';

// Adicione a rota:
<Route path="/admin/orders-v2" element={<OrdersPageV2 />} />
```

### 2. Acessar a Nova Página

Navegue para: `http://localhost:5173/admin/orders-v2`

### 3. Abrir Console do Navegador

Pressione F12 e vá para a aba "Console"

### 4. Verificar Logs

Você verá logs detalhados como:

```
🔍 [OrdersV2] Fetching orders with filters: {...}
📄 [OrdersV2] Pagination: {page: 1, pageSize: 20}
📦 [OrdersV2] Deliveries: 5 items
🛒 [OrdersV2] Purchases: 3 items
💰 [OrdersV2] Payments: 2 items
📋 [OrdersV2] Quotes: 1 items
✅ [OrdersV2] Total unified orders: 11
⏱️ [OrdersV2] Query completed in 234.56ms
```

### 5. Verificar Pedidos Avulsos

Na tabela, procure por linhas com ícone 🛒 (standalone_purchase)

Se não aparecerem, verifique os logs de erro:

```
❌ [OrdersV2] Error fetching purchases: {...}
```

## 🔍 Diagnóstico

### Se Pedidos Avulsos NÃO Aparecem

1. **Verificar se há dados no banco**

Execute no Supabase SQL Editor:

```sql
SELECT COUNT(*) FROM standalone_purchases;
```

Se retornar 0, não há pedidos avulsos cadastrados.

2. **Verificar logs de erro**

Procure por `❌ [OrdersV2]` no console

3. **Testar query diretamente**

Execute no Supabase SQL Editor:

```sql
SELECT 
  sp.id,
  sp.status,
  sp.user_id,
  sp.created_at,
  p.full_name,
  c.name as collection_name
FROM standalone_purchases sp
LEFT JOIN profiles p ON sp.user_id = p.id
LEFT JOIN collections c ON sp.collection_id = c.id
ORDER BY sp.created_at DESC
LIMIT 10;
```

### Se Aparecerem Erros de Import

Alguns componentes podem não existir. Isso é normal, a página usa componentes da página antiga.

## 📊 Comparação com Página Antiga

### Página Antiga (`/admin/orders`)
- ❌ Pedidos avulsos não aparecem
- ❌ Sem logs de debug
- ❌ Queries podem falhar silenciosamente

### Página Nova (`/admin/orders-v2`)
- ✅ Todos os tipos de pedidos
- ✅ Logs detalhados
- ✅ Erros visíveis no console
- ✅ Performance otimizada

## 🎯 Próximos Passos

### Se Funcionar Corretamente
1. Migrar rota de `/admin/orders` para usar `OrdersPageV2`
2. Fazer backup de `OrdersPage.tsx` como `OrdersPageOld.tsx`
3. Remover página antiga após 1 semana

### Se Houver Problemas
1. Documentar erros encontrados
2. Corrigir problemas identificados
3. Testar novamente

## 📝 Checklist de Teste

- [ ] Página carrega sem erros
- [ ] Logs aparecem no console
- [ ] Assinaturas (📦) aparecem
- [ ] Avulsos (🛒) aparecem
- [ ] Pagamentos (💰) aparecem
- [ ] Orçamentos (📋) aparecem
- [ ] Filtros funcionam
- [ ] Busca funciona
- [ ] Paginação funciona
- [ ] Detalhes abrem ao clicar

## 🐛 Problemas Conhecidos

1. **Ações em massa** - Mostram "Em desenvolvimento" (não implementadas ainda)
2. **Exportação CSV** - Mostra "Em desenvolvimento" (não implementada ainda)
3. **Geração de etiquetas** - Mostra "Em desenvolvimento" (não implementada ainda)

Essas funcionalidades podem ser copiadas da página antiga se necessário.

## 📞 Suporte

Se encontrar problemas:
1. Copie os logs do console
2. Tire screenshot da página
3. Documente o erro encontrado
4. Compartilhe para análise
