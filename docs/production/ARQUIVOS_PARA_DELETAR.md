# Arquivos Obsoletos para Deletar

**Data**: 2026-03-08  
**Status**: Lista Completa

## 📋 Arquivos Legados

### Páginas Antigas
1. `src/pages/admin/OrdersPageOld.tsx` - Backup da página antiga de pedidos
2. `src/pages/admin/AdminSubscriptions.tsx` - Página de gerenciar assinaturas (obsoleta)

### Serviços Antigos (se existirem versões antigas)
- Verificar se há `orders-service-old.ts` ou similar

### Componentes Antigos de Orders (se não usados)
- Verificar componentes em `src/components/admin/orders/` que não são mais usados

## ✅ Arquivos a Manter

### Serviços
- `src/services/admin/orders-service-v2.ts` ✅
- `src/services/admin/orders-transformer.ts` ✅
- `src/services/admin/orders-validator.ts` ✅
- `src/services/admin/orders-export.ts` ✅
- `src/services/admin/label-service.ts` ✅

### Hooks
- `src/hooks/admin/orders-v2/useOrdersData.ts` ✅
- `src/hooks/admin/orders-v2/useOrdersFilters.ts` ✅
- `src/hooks/admin/orders-v2/useOrdersPagination.ts` ✅
- `src/hooks/admin/orders-v2/useOrdersCounts.ts` ✅
- `src/hooks/admin/useOrderSelection.ts` ✅
- `src/hooks/admin/useOrderMutations.ts` ✅

### Componentes
- `src/components/admin/orders-v2/OrderTypeFilter.tsx` ✅
- `src/components/admin/orders-v2/OrdersStats.tsx` ✅
- `src/components/admin/orders/*` (componentes reutilizados) ✅

### Página Principal
- `src/pages/admin/OrdersPage.tsx` ✅ (nova versão)
