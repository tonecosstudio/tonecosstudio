# Próximas Páginas Admin para Corrigir

## Status Atual

### ✅ Páginas Já Corrigidas
1. AdminHome (Dashboard) - Usa AdminLayout, filtros de período corrigidos
2. OrdersPage - Usa AdminLayout, pedidos unificados
3. CharacterChoiceManagerPage - Usa AdminLayout
4. ProductionDashboardPage - Usa AdminLayout
5. PaymentVerification - Usa AdminLayout

### ❌ Páginas que NÃO Usam AdminLayout

Baseado na análise, as seguintes páginas importantes NÃO usam AdminLayout:

1. **AdminModels.tsx** - Gestão de modelos 3D
2. **AdminFranchises.tsx** - Gestão de franquias
3. **AdminModelsAndFranchises.tsx** - Hub de modelos e franquias
4. **AdminPreorders.tsx** - Gestão de pré-vendas
5. **AdminPayments.tsx** - Detalhes de pagamentos
6. **AdminPaymentMethods.tsx** - Métodos de pagamento
7. **AdminPaymentKeys.tsx** - Chaves de pagamento
8. **AdminNotificationSettings.tsx** - Configurações de notificações
9. **AdminNotificationHistory.tsx** - Histórico de notificações
10. **AdminSystemSettings.tsx** - Configurações do sistema
11. **AdminCycleManager.tsx** - Gestão de ciclos
12. **AdminCommunication.tsx** - Comunicação
13. **CommunicationTemplates.tsx** - Templates de comunicação
14. **AdminCollectionFinancials.tsx** - Financeiro de coleções
15. **AdminCollectionsHub.tsx** - Hub de coleções
16. **AdminAnalytics.tsx** - Analytics

## Prioridade de Correção

### Alta Prioridade (Páginas Mais Usadas)
1. **AdminModels** - Cadastro de modelos é fundamental
2. **AdminFranchises** - Organização de franquias
3. **AdminPreorders** - Gestão de pré-vendas
4. **AdminPaymentMethods** - Configuração de pagamentos

### Média Prioridade
5. **AdminSystemSettings** - Configurações gerais
6. **AdminCycleManager** - Gestão de ciclos de produção
7. **AdminNotificationSettings** - Configurações de notificações
8. **AdminModelsAndFranchises** - Hub (pode ser corrigido junto com Models/Franchises)

### Baixa Prioridade
9. **AdminAnalytics** - Relatórios
10. **CommunicationTemplates** - Templates
11. **AdminCollectionFinancials** - Financeiro específico
12. **AdminNotificationHistory** - Histórico

## Páginas que Já Usam AdminLayout Corretamente

✅ AdminUsers
✅ AdminUserDetails
✅ AdminSubscriptions
✅ AdminSupport
✅ AdminSettings
✅ AdminQuickReplies
✅ AdminProductionLimit
✅ AdminPricingManagement
✅ AdminPaymentHub
✅ AdminPackaging
✅ AdminHome
✅ AdminHolidayManager
✅ AdminGroupsPage
✅ AdminGroupDetailsPage
✅ AdminFinancialHub
✅ AdminCoupons
✅ AdminContentSettings
✅ AdminCollections
✅ AdminSubscriptionCreditDashboard
✅ AdminSubscriptionCreditSubscriptions
✅ AdminSubscriptionCreditCycles
✅ AdminSubscriptionCreditCharacters
✅ UploadQueue
✅ StandalonePurchases
✅ ProductionDashboardPage
✅ PaymentCalculator
✅ OrdersPage
✅ LegalCompliance
✅ DeliveryManagement
✅ Conveyor
✅ CollectionManagement
✅ CharacterChoiceManagerPage
✅ CapacityManagement
✅ BonusPieces
✅ AuditTrail

## Recomendação

**Próxima página a corrigir: AdminModels**

Motivo:
- É uma das páginas mais importantes (cadastro de modelos 3D)
- Muito usada no dia a dia
- Relativamente simples de corrigir (só adicionar AdminLayout)
- Não tem dependências complexas

## Padrão de Correção

Para cada página que não usa AdminLayout:

1. Importar AdminLayout
2. Envolver o conteúdo com `<AdminLayout>`
3. Remover qualquer layout customizado (se houver)
4. Verificar se há queries que precisam de filtros de período
5. Testar a página
6. Verificar diagnostics

```typescript
// Antes
export default function MinhaPage() {
  return (
    <div className="space-y-6">
      {/* conteúdo */}
    </div>
  );
}

// Depois
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function MinhaPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* conteúdo */}
      </div>
    </AdminLayout>
  );
}
```
