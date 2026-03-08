# Correção de Referências ao Sistema Híbrido

## 🐛 Problema Encontrado

Após remover o sistema de lançamentos mensais, o frontend apresentou erro:
```
GET http://localhost:8080/src/hooks/useSubscriptionCoins.ts?t=1772932870181 
net::ERR_ABORTED 404 (Not Found)
```

## 🔍 Causa

Arquivos ainda importavam componentes e hooks do sistema híbrido removido:
- `SubscriberDashboardHybrid.tsx` importava `useSubscriptionCoins`
- `AdminSubscriptionsHybrid.tsx` usava colunas removidas
- `ProfileSections.tsx` exibia `coins_balance` e `active_collection_id`
- `SubscribeCollection.tsx` tentava inserir colunas removidas
- `AdminUserDetails.tsx` exibia `coins_initial`

## ✅ Solução Aplicada

### 1. Páginas Removidas (3 arquivos)
- `src/pages/SubscriberDashboardHybrid.tsx` → Substituída por `SubscriberDashboard.tsx`
- `src/pages/admin/AdminSubscriptionsHybrid.tsx` → Redirecionada para `/admin/pedidos`
- `src/components/subscription/ChangeActiveCollectionDialog.tsx` → Removida

### 2. Rotas Atualizadas
```tsx
// ANTES
<Route path="/painel-assinante" element={<SubscriberDashboardHybrid />} />
<Route path="/admin/assinaturas-gerenciar" element={<AdminSubscriptionsHybrid />} />

// DEPOIS
<Route path="/painel-assinante" element={<SubscriberDashboard />} />
<Route path="/admin/assinaturas-gerenciar" element={<Navigate to="/admin/pedidos?type=subscription" />} />
```

### 3. Queries Corrigidas

#### ProfileSections.tsx
```tsx
// REMOVIDO
active_collection_id,
coins_balance,
coins_initial,

// REMOVIDO - Busca de coleção ativa
if (subscription.active_collection_id) { ... }

// REMOVIDO - Exibição de coins
<div>Saldo de Coins: {sub.coins_balance} / {sub.coins_initial}</div>
<div>Coleção Ativa: {sub.active_collection.name}</div>
```

#### SubscribeCollection.tsx
```tsx
// REMOVIDO do INSERT
active_collection_id: activeCollectionId,
coins_balance: coinsInitial,
coins_initial: coinsInitial,
```

#### AdminUserDetails.tsx
```tsx
// REMOVIDO
<div>Coins Iniciais: {activeSubscription.coins_initial || 0} coins</div>

// ALTERADO
"Coleção Ativa" → "Coleção"
```

## 📊 Impacto

### Arquivos Modificados
- `src/App.tsx` - Rotas e imports atualizados
- `src/pages/ProfileSections.tsx` - Query e UI simplificadas
- `src/pages/SubscribeCollection.tsx` - Insert corrigido
- `src/pages/admin/AdminUserDetails.tsx` - UI simplificada

### Arquivos Removidos
- 3 arquivos (1.287 linhas)

### Sistema Mantido
- `CoinsPurchase.tsx` - Sistema de coins para compras avulsas (não relacionado)
- `AdminCoinsSystem.tsx` - Gerenciamento de coins de compras avulsas
- `useUserCoins.ts` - Hook para coins de compras avulsas

## ✅ Resultado

- Frontend compila sem erros
- Todas as referências ao sistema híbrido removidas
- Sistema de produção atual funcionando
- Rotas redirecionadas corretamente

## 🎯 Commits

```
94e9e3d - chore: remove unused monthly releases system
9718e95 - chore: remove legacy SQL files and scripts
942f852 - docs: add system cleanup documentation
9bdeae5 - fix: remove remaining hybrid system references
```

## 📝 Observação

O sistema de coins para **compras avulsas** foi mantido intacto:
- `user_coins` table - Para compras standalone
- `coin_transactions` table - Histórico de transações
- `CoinsPurchase.tsx` - Página de compra de coins
- `AdminCoinsSystem.tsx` - Admin de coins
- `useUserCoins.ts` - Hook de coins

Apenas o sistema **híbrido de assinaturas com coins** foi removido.

---

**Status**: ✅ Correção completa aplicada
