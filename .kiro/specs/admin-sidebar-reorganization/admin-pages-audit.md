# Auditoria de Páginas Administrativas

**Data**: 2026-03-01  
**Spec**: admin-sidebar-reorganization  
**Tarefa**: 1.1

## Resumo Executivo

- **Total de arquivos de página**: 56 arquivos
- **Páginas com rotas ativas**: 30 páginas
- **Páginas órfãs (sem rota)**: 11 páginas
- **Páginas de teste**: 8 arquivos
- **Redirects ativos**: 13 redirects

## Lista Completa de Páginas Administrativas

### Páginas com Rotas Ativas (30)

| # | Arquivo | Rota | Status |
|---|---------|------|--------|
| 1 | AdminHome.tsx | `/admin` | ✅ Ativa |
| 2 | UploadQueue.tsx | `/admin/upload` | ✅ Ativa |
| 3 | Conveyor.tsx | `/admin/esteira` | ✅ Ativa |
| 4 | AdminUsers.tsx | `/admin/users` | ✅ Ativa |
| 5 | AdminUserDetails.tsx | `/admin/users/:userId` | ✅ Ativa |
| 6 | AdminQuotes.tsx | `/admin/orcamentos` | ✅ Ativa |
| 7 | AdminModels.tsx | `/admin/modelos` | ✅ Ativa |
| 8 | AdminFranchises.tsx | `/admin/franquias` | ✅ Ativa |
| 9 | AdminCollections.tsx | `/admin/colecoes` | ✅ Ativa |
| 10 | AdminPlans.tsx | `/admin/planos` | ✅ Ativa |
| 11 | AdminSubscriptions.tsx | `/admin/assinaturas` | ✅ Ativa |
| 12 | AuditTrail.tsx | `/admin/auditoria` | ✅ Ativa |
| 13 | CollectionManagement.tsx | `/admin/gerenciar-colecoes` | ✅ Ativa |
| 14 | CycleDashboard.tsx | `/admin/ciclos` | ✅ Ativa |
| 15 | DeliveryManagement.tsx | `/admin/entregas` | ✅ Ativa |
| 16 | CapacityManagement.tsx | `/admin/capacidade` | ✅ Ativa |
| 17 | BonusPieces.tsx | `/admin/pecas-bonus` | ✅ Ativa |
| 18 | AdminPackaging.tsx | `/admin/embalagem` | ✅ Ativa |
| 19 | AdminCoupons.tsx | `/admin/cupons` | ✅ Ativa |
| 20 | AdminAnalytics.tsx | `/admin/analytics` | ✅ Ativa |
| 21 | AdminPreorders.tsx | `/admin/pre-vendas` | ✅ Ativa |
| 22 | AdminSettings.tsx | `/admin/configuracoes` | ✅ Ativa |
| 23 | AdminPaymentKeys.tsx | `/admin/chaves-pagamento` | ✅ Ativa |
| 24 | AdminNotificationSettings.tsx | `/admin/notificacoes` | ✅ Ativa |
| 25 | AdminNotificationHistory.tsx | `/admin/notificacoes/historico` | ✅ Ativa |
| 26 | AdminPricing.tsx | `/admin/precos` | ✅ Ativa |
| 27 | AdminCollectionFinancials.tsx | `/admin/financeiro` | ✅ Ativa |
| 28 | AdminPaymentHub.tsx | `/admin/pagamentos` | ✅ Ativa |
| 29 | AdminCommunication.tsx | `/admin/comunicacao` | ✅ Ativa |
| 30 | AdminGroupDetailsPage.tsx | `/admin/grupos/:groupId` | ✅ Ativa |

### Páginas Órfãs - Sem Rota Definida (11)

| # | Arquivo | Status | Análise |
|---|---------|--------|---------|
| 1 | AdminHolidayManager.tsx | ⚠️ Órfã | Funcionalidade única - gerenciamento de feriados |
| 2 | PaymentVerification.tsx | ⚠️ Órfã | Pode ser integrada ao AdminPaymentHub |
| 3 | StandalonePurchases.tsx | ⚠️ Órfã | Pode ser integrada ao AdminQuotes |
| 4 | AdminPayments.tsx | ⚠️ Órfã | Substituída por AdminPaymentHub |
| 5 | AdminSupport.tsx | ⚠️ Órfã | Substituída por AdminCommunication |
| 6 | AdminSystemSettings.tsx | ⚠️ Órfã | Consolidada em AdminSettings |
| 7 | AdminContentSettings.tsx | ⚠️ Órfã | Consolidada em AdminSettings |
| 8 | AdminProductionLimit.tsx | ⚠️ Órfã | Consolidada em AdminSettings |
| 9 | LegalCompliance.tsx | ⚠️ Órfã | Consolidada em AdminSettings |
| 10 | PaymentCalculator.tsx | ⚠️ Órfã | Consolidada em AdminPaymentHub |
| 11 | AdminPaymentMethods.tsx | ⚠️ Órfã | Consolidada em AdminPaymentHub |

### Páginas de Comunicação Consolidadas (4)

| # | Arquivo | Status | Análise |
|---|---------|--------|---------|
| 1 | AdminQuickReplies.tsx | ⚠️ Órfã | Consolidada em AdminCommunication |
| 2 | CommunicationTemplates.tsx | ⚠️ Órfã | Consolidada em AdminCommunication |
| 3 | AdminGroupsPage.tsx | ⚠️ Órfã | Consolidada em AdminCommunication |
| 4 | AdminCycleManager.tsx | ⚠️ Órfã | Possivelmente consolidada em CycleDashboard |

### Arquivos de Teste (8)

| # | Arquivo | Tipo |
|---|---------|------|
| 1 | AdminCollections.test.tsx | Teste unitário |
| 2 | AdminModels.test.tsx | Teste unitário |
| 3 | AdminUsers.test.tsx | Teste unitário |
| 4 | AuditTrail.test.tsx | Teste unitário |
| 5 | CollectionManagement.test.tsx | Teste unitário |
| 6 | CycleDashboard.test.tsx | Teste unitário |
| 7 | StandalonePurchases.test.tsx | Teste unitário |
| 8 | __tests__/ (diretório) | Testes de integração |

### Subpáginas (2)

| # | Arquivo | Rota Pai |
|---|---------|----------|
| 1 | AdminProductionTimelineEditor.tsx | Parte de AdminQuotes |
| 2 | AdminQuotesPage.tsx | Parte de AdminQuotes |

## Redirects Ativos (13)

### Redirects de Configurações (4)

| De | Para | Motivo |
|----|------|--------|
| `/admin/configuracoes-sistema` | `/admin/configuracoes?tab=general` | Consolidação de abas |
| `/admin/configuracoes-conteudo` | `/admin/configuracoes?tab=content` | Consolidação de abas |
| `/admin/limite-producao` | `/admin/configuracoes?tab=production` | Consolidação de abas |
| `/admin/conformidade-legal` | `/admin/configuracoes?tab=legal` | Consolidação de abas |

### Redirects de Pagamentos (4)

| De | Para | Motivo |
|----|------|--------|
| `/admin/payments` | `/admin/pagamentos?tab=payments` | Migração para português |
| `/admin/payments/:paymentId` | `/admin/pagamentos?tab=payments` | Migração para português |
| `/admin/metodos-pagamento` | `/admin/pagamentos?tab=methods` | Consolidação de abas |
| `/admin/calculadora` | `/admin/pagamentos?tab=calculator` | Consolidação de abas (duplicado) |

### Redirects de Comunicação (4)

| De | Para | Motivo |
|----|------|--------|
| `/admin/suporte` | `/admin/comunicacao?tab=support` | Consolidação de abas |
| `/admin/grupos` | `/admin/comunicacao?tab=groups` | Consolidação de abas |
| `/admin/respostas-rapidas` | `/admin/comunicacao?tab=quick-replies` | Consolidação de abas |
| `/admin/templates-comunicacao` | `/admin/comunicacao?tab=templates` | Consolidação de abas |

### Redirect Duplicado (1)

| De | Para | Problema |
|----|------|----------|
| `/admin/calculadora` | `/admin/pagamentos?tab=calculator` | ⚠️ Definido 2 vezes no código |

## Dependências Entre Páginas

### Páginas que Importam Outras Páginas

1. **AdminQuotes.tsx** → Importa subcomponentes de `quotes/`
2. **AdminCommunication.tsx** → Consolida AdminSupport, AdminQuickReplies, CommunicationTemplates, AdminGroupsPage
3. **AdminSettings.tsx** → Consolida AdminSystemSettings, AdminContentSettings, AdminProductionLimit, LegalCompliance
4. **AdminPaymentHub.tsx** → Consolida AdminPayments, PaymentCalculator, AdminPaymentMethods

### Páginas Referenciadas em Links

- **AdminUserDetails** ← Acessada via AdminUsers
- **AdminGroupDetailsPage** ← Acessada via AdminCommunication

## Análise de Consolidação

### Páginas Já Consolidadas (Podem ser Removidas)

1. **AdminPayments.tsx** → AdminPaymentHub.tsx
2. **AdminSupport.tsx** → AdminCommunication.tsx
3. **AdminSystemSettings.tsx** → AdminSettings.tsx (aba general)
4. **AdminContentSettings.tsx** → AdminSettings.tsx (aba content)
5. **AdminProductionLimit.tsx** → AdminSettings.tsx (aba production)
6. **LegalCompliance.tsx** → AdminSettings.tsx (aba legal)
7. **PaymentCalculator.tsx** → AdminPaymentHub.tsx (aba calculator)
8. **AdminPaymentMethods.tsx** → AdminPaymentHub.tsx (aba methods)
9. **AdminQuickReplies.tsx** → AdminCommunication.tsx (aba quick-replies)
10. **CommunicationTemplates.tsx** → AdminCommunication.tsx (aba templates)
11. **AdminGroupsPage.tsx** → AdminCommunication.tsx (aba groups)

### Páginas Órfãs que Precisam de Resolução

1. **AdminHolidayManager.tsx** → Adicionar rota `/admin/feriados`
2. **PaymentVerification.tsx** → Integrar ao AdminPaymentHub como aba
3. **StandalonePurchases.tsx** → Integrar ao AdminQuotes como filtro/visualização
4. **AdminCycleManager.tsx** → Verificar se já está em CycleDashboard

## Recomendações

### Ações Imediatas

1. ✅ Adicionar rota para AdminHolidayManager
2. ✅ Integrar PaymentVerification ao AdminPaymentHub
3. ✅ Integrar StandalonePurchases ao AdminQuotes
4. ✅ Remover 11 páginas consolidadas
5. ✅ Remover redirect duplicado de `/admin/calculadora`

### Consolidações Propostas

1. **Modelos + Franquias** → Nova página `ModelsAndFranchises.tsx`
2. **Preços + Planos** → Nova página `PricingAndPlans.tsx`
3. **Coleções duplicadas** → Consolidar `/admin/colecoes` e `/admin/gerenciar-colecoes`

### Redirects a Manter

- Redirects de migração português/inglês (6 meses)
- Redirects de consolidação de abas (permanentes)

### Redirects a Remover

- Redirect duplicado de `/admin/calculadora`
- Redirects para páginas obsoletas (após remoção)

## Próximos Passos

1. ✅ Tarefa 1.2: Confirmar e documentar páginas obsoletas
2. ✅ Tarefa 1.3: Mapear e analisar redirecionamentos
3. ✅ Tarefa 1.4: Documentar resolução de páginas órfãs
4. ✅ Tarefa 1.5: Criar mapeamento de URLs antigas para novas
