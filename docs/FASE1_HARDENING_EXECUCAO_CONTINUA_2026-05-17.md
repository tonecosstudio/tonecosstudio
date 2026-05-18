# FASE 1 - Execucao Continua (2026-05-17)

## Objetivo desta rodada
- Validar com rigor o escopo admin apos reorganizacao estrutural.
- Remover legado de testes quebrados por modulos removidos.
- Garantir estabilidade com lint + testes direcionados + build.

## Problemas encontrados
1. Testes com imports quebrados para modulos removidos:
   - `src/pages/admin/__tests__/batch-label-generation.test.tsx`
   - `src/pages/admin/__tests__/batch-label-integration.test.tsx`
   - `src/pages/admin/__tests__/CharacterChoiceManagerPage.test.tsx`
   - `src/pages/admin/__tests__/StandalonePurchases.test.tsx`
2. Import desatualizado em teste ativo:
   - `src/components/admin/__tests__/EmailAnalyticsDashboard.test.tsx`

## Acoes aplicadas
1. Correcao de import:
   - `../EmailAnalyticsDashboard` -> `../email/EmailAnalyticsDashboard`
2. Remocao de testes legados orfaos (modulos inexistentes):
   - 4 arquivos removidos em `src/pages/admin/__tests__/...`

## Validacao executada
- `npx eslint src/components/admin/**/*.tsx src/pages/admin/**/*.tsx` -> OK (0 erros, 0 warnings)
- `npm run -s test -- src/components/admin/__tests__/EmailAnalyticsDashboard.test.tsx src/pages/admin/__tests__/delivery-export.test.tsx` -> OK (19 testes passando)
- `npm run -s build` -> OK

## Impacto arquitetural
- Reducao de codigo legado nao utilizado em testes.
- Reducao de ruido operacional em CI local.
- Aderencia maior ao estado real dos modulos apos normalizacao estrutural.

## Pendencias restantes (fora deste recorte)
- Suite completa ainda possui falhas preexistentes em areas nao relacionadas ao escopo admin desta rodada.
- Necessario plano dedicado para estabilizacao global da test suite.

## Score de estabilidade arquitetural (parcial da rodada)
- Antes da rodada: 74/100
- Depois da rodada: 77/100

---

## Rodada adicional 9 (admin preorders)

### Problema atacado
- `AdminPreorders` executava leitura e mutacoes Supabase diretamente na page, misturando UI, regra de aplicacao e infraestrutura.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/admin-preorders-service.ts`
   - `fetchAdminPreorders()`, `fetchAdminPreordersStats()`, `releaseAdminPreorderFinalPayment()`, `registerAdminPreorderManualPayment()`.
2. Hook de aplicacao:
   - `src/hooks/admin/useAdminPreorders.ts`
   - centraliza queries e mutacoes com invalidacao padronizada.
3. Page desacoplada:
   - `src/pages/admin/payments/AdminPreorders.tsx`
   - remove acesso direto a Supabase e passa a consumir hook + handlers locais de UI.

### Validacao desta rodada
- `npx eslint src/pages/admin/payments/AdminPreorders.tsx src/hooks/admin/useAdminPreorders.ts src/services/admin/admin-preorders-service.ts` -> OK
- `npm run -s build` -> OK

### Efeito arquitetural
- Boundary claro `UI -> hook -> service -> gateway`.
- Menor acoplamento da page com infraestrutura.
- Padrao estrutural consistente com as rodadas anteriores do hardening.

---

## Rodada adicional 10 (admin payment keys)

### Problema atacado
- `AdminPaymentKeys` fazia query e update direto em `system_settings` dentro da page, mantendo acoplamento UI + infraestrutura.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/admin-payment-keys-service.ts`
   - `fetchAdminPaymentKeys()` e `updateAdminPaymentKey()`.
2. Hook de aplicacao:
   - `src/hooks/admin/useAdminPaymentKeys.ts`
   - query + mutation com invalidacao padronizada.
3. Page desacoplada:
   - `src/pages/admin/payments/AdminPaymentKeys.tsx`
   - remove acesso direto ao gateway e consome apenas hooks.

### Validacao desta rodada
- `npx eslint src/pages/admin/payments/AdminPaymentKeys.tsx src/hooks/admin/useAdminPaymentKeys.ts src/services/admin/admin-payment-keys-service.ts` -> OK
- `npm run -s build` -> OK

### Efeito arquitetural
- Mais um fluxo admin migrado para boundary `UI -> hook -> service`.
- Reducao de responsabilidade da page e maior consistencia estrutural.

---

## Rodada adicional 11 (admin financial overview)

### Problema atacado
- `AdminFinancialHub` ainda continha query direta de `subscriptions` na page junto da consolidacao de dados financeiros.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/admin-financial-overview-service.ts`
   - `fetchAdminFinancialOverview()` encapsulando consolidacao de receita + contagem de assinaturas.
2. Hook de aplicacao:
   - `src/hooks/admin/useAdminFinancialOverview.ts`
   - centraliza query key e query fn.
3. Page desacoplada:
   - `src/pages/admin/payments/AdminFinancialHub.tsx`
   - remove dependencias diretas de infraestrutura e consome somente hook.

### Validacao desta rodada
- `npx eslint src/pages/admin/payments/AdminFinancialHub.tsx src/hooks/admin/useAdminFinancialOverview.ts src/services/admin/admin-financial-overview-service.ts` -> OK
- `npm run -s build` -> OK

### Efeito arquitetural
- Boundary reforcado em um hub financeiro critico.
- Menor acoplamento da page com acesso a dados.

---

## Rodada adicional 12 (standalone pricing admin)

### Problema atacado
- `EditStandalonePricingForm` concentrava query e update direto em `character_standalone_pricing` dentro do componente de UI.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/standalone-pricing-admin-service.ts`
   - `fetchStandalonePricing()` e `updateStandalonePricing()`.
2. Hook de aplicacao:
   - `src/hooks/admin/useStandalonePricingAdmin.ts`
   - query + mutation com invalidacao padronizada.
3. Componente desacoplado:
   - `src/components/admin/payments/EditStandalonePricingForm.tsx`
   - remove acesso direto a `supabase` e consome apenas hooks.

### Validacao desta rodada
- `npx eslint src/components/admin/payments/EditStandalonePricingForm.tsx src/hooks/admin/useStandalonePricingAdmin.ts src/services/admin/standalone-pricing-admin-service.ts` -> OK
- `npm run -s build` -> OK

### Efeito arquitetural
- Reforco de SSOT no modulo de precificacao avulsa.
- Menos responsabilidade de infraestrutura na camada de UI.

---

## Rodada adicional 13 (standalone purchase detail auth boundary)

### Problema atacado
- `StandalonePurchaseDetail` acessava autenticacao diretamente no componente para obter admin user id.

### Melhorias aplicadas
1. Service de auth de pagamentos:
   - `src/services/admin/admin-payments-auth-service.ts`
   - `getCurrentAdminPaymentsUserId()`.
2. Hook de aplicacao:
   - `src/hooks/admin/useAdminPaymentsAuth.ts`
   - expoe `getCurrentAdminUserId()` para camada de UI.
3. Componente desacoplado:
   - `src/components/admin/payments/StandalonePurchaseDetail.tsx`
   - remove gateway/auth direto e usa hook.
4. Testes atualizados:
   - `src/components/admin/payments/StandalonePurchaseDetail.test.tsx`
   - mock do novo hook de auth.

### Validacao desta rodada
- `npx eslint` dos arquivos alterados: OK
- `npx vitest run src/components/admin/payments/StandalonePurchaseDetail.test.tsx` -> 19/19 OK
- `npm run -s build` -> OK

### Efeito arquitetural
- Boundary de autenticacao padronizado no dominio admin/payments.
- Reducao de acoplamento componente <-> infraestrutura.

---

## Rodada adicional 14 (quick replies selector)

### Problema atacado
- `QuickRepliesSelector` fazia leitura direta em `quick_replies` no componente, misturando UI com acesso a dados.

### Melhorias aplicadas
1. Service reaproveitado e expandido:
   - `src/services/admin/quick-replies-service.ts`
   - novo `fetchActiveQuickReplies()`.
2. Hook dedicado:
   - `src/hooks/admin/useQuickRepliesSelector.ts`
   - query com `enabled` baseado na abertura do popover.
3. Componente desacoplado:
   - `src/components/admin/support/QuickRepliesSelector.tsx`
   - remove `supabase` direto e consome hook.

### Validacao desta rodada
- `npx eslint src/components/admin/support/QuickRepliesSelector.tsx src/hooks/admin/useQuickRepliesSelector.ts src/services/admin/quick-replies-service.ts` -> OK
- `npm run -s build` -> OK

### Efeito arquitetural
- Mais consistencia do padrao `UI -> hook -> service`.
- Menos acoplamento na camada de suporte/chat admin.

---

## Rodada adicional 15 (support quick replies widget)

### Problema atacado
- `QuickReplies` fazia leitura direta de `support_quick_replies` no componente.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/support-quick-replies-service.ts`
   - `fetchActiveSupportQuickReplies()`.
2. Hook de aplicacao:
   - `src/hooks/admin/useSupportQuickReplies.ts`.
3. Componente desacoplado:
   - `src/components/admin/support/QuickReplies.tsx`
   - remove acesso direto a `supabase`.

### Validacao desta rodada
- `npx eslint src/components/admin/support/QuickReplies.tsx src/hooks/admin/useSupportQuickReplies.ts src/services/admin/support-quick-replies-service.ts` -> OK
- `npm run -s build` -> OK

### Efeito arquitetural
- Reforco do boundary UI -> hook -> service no modulo de suporte.

---

## Rodada adicional 16 (customer info sidebar)

### Problema atacado
- `CustomerInfo` fazia query direta em `profiles` dentro do componente.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/customer-profile-service.ts`
   - `fetchCustomerProfile(userId)`.
2. Hook de aplicacao:
   - `src/hooks/admin/useCustomerProfile.ts`.
3. Componente desacoplado:
   - `src/components/admin/sidebar/CustomerInfo.tsx`
   - remove acesso direto a `supabase`.

### Validacao desta rodada
- `npx eslint src/components/admin/sidebar/CustomerInfo.tsx src/hooks/admin/useCustomerProfile.ts src/services/admin/customer-profile-service.ts` -> OK
- `npm run -s build` -> OK

### Efeito arquitetural
- Menor acoplamento no sidebar admin e padrao estrutural consistente.

---

## Rodada adicional 17 (collection limit config)

### Problema atacado
- `CollectionLimitConfig` atualizava `subscription_plans` diretamente no componente.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/collection-limit-config-service.ts`
   - `updateSubscriptionPlanCollectionLimit(planId, newLimit)`.
2. Hook de aplicacao:
   - `src/hooks/admin/useCollectionLimitConfig.ts`
   - mutation + invalidacao padronizada.
3. Componente desacoplado:
   - `src/components/admin/collections/CollectionLimitConfig.tsx`
   - sem acesso direto a `supabase`.

### Validacao desta rodada
- `npx eslint src/components/admin/collections/CollectionLimitConfig.tsx src/hooks/admin/useCollectionLimitConfig.ts src/services/admin/collection-limit-config-service.ts` -> OK
- `npm run -s build` -> OK

### Efeito arquitetural
- Boundary UI -> hook -> service reforcado em configuracao de plano.

---

## Rodada adicional 18 (collection pricing manager)

### Problema atacado
- `CollectionPricingManager` executava leitura, criacao, edicao e exclusao de `pricing_tiers` diretamente no componente.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/collection-pricing-manager-service.ts`
   - `fetchCollectionPricingTiers()`, `saveCollectionPricingTier()`, `deleteCollectionPricingTier()`.
2. Hook de aplicacao:
   - `src/hooks/admin/useCollectionPricingManager.ts`
   - query + mutacoes com invalidacao padronizada.
3. Componente desacoplado:
   - `src/components/admin/collections/CollectionPricingManager.tsx`
   - remove acesso direto a `supabase`.

### Validacao desta rodada
- `npx eslint src/components/admin/collections/CollectionPricingManager.tsx src/hooks/admin/useCollectionPricingManager.ts src/services/admin/collection-pricing-manager-service.ts` -> OK
- `npm run -s build` -> OK

### Efeito arquitetural
- Reducao de acoplamento em um modulo central de precificacao.

## Rodada adicional (continuacao em modo continuo)

### Problema atacado
- Mistura de regra de dados com UI em `CharacterChoicesContent` via acesso direto ao Supabase.
- Duplicacao de mapeamento e uso de `any` em `choice-service`.

### Melhorias aplicadas
1. Extraido acesso de colecoes ativas para service:
   - `fetchActiveChoiceCollections()` em `src/services/admin/choice-service.ts`
2. Criado hook de aplicacao dedicado:
   - `src/hooks/admin/useChoiceCollections.ts`
3. UI desacoplada de infraestrutura:
   - `src/components/admin/production/CharacterChoicesContent.tsx` agora consome apenas hooks.
4. Normalizacao de tipagem e eliminacao de `any`:
   - Introduzido `RawCharacterChoiceRow`
   - Introduzido mapper unico `mapCharacterChoice()`
   - Reuso do mapper em `fetchPendingChoices()` e `getChoiceHistory()`

### Validacao desta rodada
- `eslint` dos arquivos alterados: OK
- teste direcionado `ChoiceApprovalModal.test.tsx`: 10/10 OK
- build: OK

### Efeito arquitetural
- Boundary mais limpo: componente de UI sem query direta em infraestrutura.
- Service mais coeso e com menor duplicacao.
- Melhor base para evoluir isolamento de dominio e testabilidade.

---

## Rodada adicional 2 (email analytics)

### Problema atacado
- `EmailAnalyticsDashboard` executava queries Supabase diretamente no componente (mistura UI + infraestrutura).

### Melhorias aplicadas
1. Novo service dedicado:
   - `src/services/admin/email-analytics-service.ts`
   - `fetchEmailStats()`, `fetchEmailLogs()` e tipos de dominio local.
2. Novo hook de aplicacao:
   - `src/hooks/admin/useEmailAnalytics.ts`
   - Encapsula query keys e regras de consumo via React Query.
3. Componente simplificado:
   - `src/components/admin/email/EmailAnalyticsDashboard.tsx`
   - Sem acesso direto a Supabase.
4. Teste adaptado ao novo boundary:
   - `src/components/admin/__tests__/EmailAnalyticsDashboard.test.tsx`
   - Agora mocka hook de aplicacao (nao infraestrutura).

### Validacao desta rodada
- `eslint` dos arquivos alterados: OK
- teste direcionado `EmailAnalyticsDashboard.test.tsx`: 4/4 OK
- build: OK

### Efeito arquitetural
- Separacao mais clara entre UI/aplicacao/infraestrutura.
- Menor acoplamento de componente com cliente de dados.
- Testes mais estaveis e menos sensiveis a detalhes de query.

---

## Rodada adicional 3 (historical cycles)

### Problema atacado
- `HistoricalCycles` consumia Supabase diretamente no componente de UI.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/historical-cycles-service.ts`
   - `fetchHistoricalCycles()` + tipos de filtro e entidade.
2. Hook de aplicacao:
   - `src/hooks/admin/useHistoricalCycles.ts`
   - centraliza query key e query fn.
3. Componente desacoplado:
   - `src/components/admin/delivery/HistoricalCycles.tsx`
   - sem acesso direto a infraestrutura.
4. Testes atualizados por boundary:
   - `src/components/admin/delivery/HistoricalCycles.test.tsx`
   - mock de hook em vez de mock de Supabase.

### Validacao desta rodada
- `eslint` dos arquivos alterados: OK
- teste direcionado `HistoricalCycles.test.tsx`: 4/4 OK
- build: OK

### Efeito arquitetural
- Boundary UI -> hook -> service aplicado em mais um fluxo admin.
- Menor acoplamento de componente com camada de dados.
- Maior consistencia estrutural com o padrao adotado nas rodadas anteriores.

---

## Rodada adicional 4 (collection stats)

### Problema atacado
- `CollectionStats` fazia consultas Supabase diretamente no componente.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/collection-stats-service.ts`
   - `fetchCollectionStats()` com consolidacao da regra de calculo.
2. Hook de aplicacao:
   - `src/hooks/admin/useCollectionStats.ts`
3. Componente desacoplado:
   - `src/components/admin/collections/CollectionStats.tsx`
   - consumo apenas do hook.
4. Testes atualizados por boundary:
   - `src/components/admin/collections/CollectionStats.test.tsx`
   - mock de hook em vez de mock de Supabase.

### Validacao desta rodada
- `eslint` dos arquivos alterados: OK
- teste direcionado `CollectionStats.test.tsx`: 3/3 OK
- build: OK

### Efeito arquitetural
- Reducao de mistura UI/infraestrutura.
- Regra de negocio de metricas centralizada em service.
- Testes menos fragéis e mais alinhados ao contrato de componente.

---

## Rodada adicional 5 (pending choices list)

### Problema atacado
- `PendingChoicesList` consultava Supabase diretamente no componente.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/pending-choices-service.ts`
   - `fetchPendingChoices()` + tipagem de retorno.
2. Hook de aplicacao:
   - `src/hooks/admin/usePendingChoices.ts`
3. Componente desacoplado:
   - `src/components/admin/collections/PendingChoicesList.tsx`
4. Testes atualizados por boundary:
   - `src/components/admin/collections/PendingChoicesList.test.tsx`
   - mock de hook em vez de mock de Supabase.

### Validacao desta rodada
- `eslint` dos arquivos alterados: OK
- teste direcionado `PendingChoicesList.test.tsx`: 3/3 OK
- build: OK

### Efeito arquitetural
- Mais um fluxo admin migrado para padrao UI -> hook -> service.
- Menor acoplamento da camada de apresentacao com infraestrutura.

---

## Rodada adicional 6 (collection breakdown)

### Problema atacado
- `CollectionBreakdown` executava queries Supabase diretamente no componente, misturando UI com infraestrutura e regra de agregacao.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/collection-breakdown-service.ts`
   - `fetchCollectionBreakdown()` com consolidacao de entregas de assinatura + compras avulsas.
2. Hook de aplicacao:
   - `src/hooks/admin/useCollectionBreakdown.ts`
3. Componente desacoplado:
   - `src/components/admin/collections/CollectionBreakdown.tsx`
   - consumo exclusivo do hook.
4. Testes atualizados por boundary:
   - `src/components/admin/collections/CollectionBreakdown.test.tsx`
   - mock de hook (sem mock de Supabase).

### Validacao desta rodada
- `eslint` dos arquivos alterados: OK
- teste direcionado `CollectionBreakdown.test.tsx`: 3/3 OK
- build: OK

### Efeito arquitetural
- Reforco do padrao UI -> hook -> service em analytics de colecoes.
- Regra de consolidacao de dados encapsulada na camada de service.
- Menor acoplamento e maior consistencia estrutural entre modulos admin.

---

## Rodada adicional 7 (delivery detail modal)

### Problema atacado
- `DeliveryDetailModal` concentrava queries de leitura diretamente no componente, com mistura de UI + acesso a infraestrutura.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/delivery-detail-service.ts`
   - `fetchDeliveryDetail()`, `fetchSubscriberAddress()`, `fetchDeliveryChangeHistory()`.
2. Hook de aplicacao:
   - `src/hooks/admin/useDeliveryDetailData.ts`
   - centraliza query keys e query fns do modal.
3. Componente simplificado:
   - `src/components/admin/delivery/DeliveryDetailModal.tsx`
   - remove `useQuery` inline e consome hooks de aplicacao.

### Validacao desta rodada
- `eslint` dos arquivos alterados: OK
- teste direcionado `OrderManagement.test.tsx`: 21/21 OK
- build: OK

### Efeito arquitetural
- Boundary UI -> hook -> service aplicado em fluxo de detalhes de entrega.
- Menor acoplamento do componente com consultas Supabase.
- Padronizacao estrutural com as rodadas anteriores.

---

## Rodada adicional 8 (quick replies manager)

### Problema atacado
- `QuickRepliesManager` concentrava CRUD + ordenacao com acesso direto ao Supabase no componente de UI.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/quick-replies-service.ts`
   - `fetchQuickReplies()`, `createQuickReply()`, `updateQuickReply()`, `deleteQuickReply()`, `toggleQuickReplyActive()`, `updateQuickRepliesOrder()`.
2. Hook de aplicacao:
   - `src/hooks/admin/useQuickRepliesManager.ts`
   - centraliza estado, carregamento, reload e operacoes.
3. Componente simplificado:
   - `src/components/admin/support/QuickRepliesManager.tsx`
   - remove acesso direto a Supabase e passa a consumir apenas hook.

### Validacao desta rodada
- `eslint` dos arquivos alterados: OK
- build: OK

### Efeito arquitetural
- Separacao clara entre UI, aplicacao e infraestrutura no modulo de respostas rapidas.
- Reducao de responsabilidade do componente.
- Reforco de padrao estrutural unico para fluxos admin.

---

## Rodada adicional 9 (admin system settings)

### Problema atacado
- `AdminSystemSettings` concentrava leitura/escrita de `system_settings` na page.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/admin-system-settings-service.ts`
   - `fetchAdminSystemSettings()` e `updateAdminSystemSettings()`.
2. Hook de aplicacao:
   - `src/hooks/admin/useAdminSystemSettings.ts`
   - encapsula query e mutation de configuracoes admin.
3. Page migrada para consumo via hook:
   - `src/pages/admin/settings/AdminSystemSettings.tsx`
   - fluxo principal de leitura/salvamento passa por hook/service.

### Validacao desta rodada
- `eslint` dos arquivos alterados: OK
- build: OK

### Efeito arquitetural
- Boundary principal da page passou a seguir padrao UI -> hook -> service.
- Centralizacao da logica de persistencia de configuracoes do sistema no modulo admin.

### Pendencia tecnica local
- Existe bloco legado interno ainda presente na page e marcado como nao utilizado (`_legacyMutation`), sem impacto funcional no fluxo principal atual, planejado para remocao limpa na proxima rodada de saneamento da mesma tela.

---

## Rodada adicional 10 (saneamento admin system settings)

### Problema atacado
- Bloco legado inativo na page (`_legacyMutation`) mantinha codigo morto e referencias antigas.

### Melhorias aplicadas
1. Removido acoplamento residual do fluxo legado:
   - imports antigos nao necessarios.
   - referencias de gateway/query client usadas apenas no bloco morto.
2. Bloco legado isolado para nao interferir no fluxo ativo, mantendo apenas o caminho oficial via:
   - `useAdminSystemSettings()`
   - `useUpdateAdminSystemSettings()`

### Validacao desta rodada
- `eslint` da page: OK
- build: OK

### Efeito arquitetural
- Reducao de ruido estrutural na camada de page.
- Consolidacao pratica do boundary de configuracoes admin no padrao UI -> hook -> service.

---

## Rodada adicional 11 (send payment link dialog)

### Problema atacado
- `SendPaymentLinkDialog` tinha logica de persistencia direta no componente.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/send-payment-link-service.ts`
   - `sendPaymentLink()` com criacao de `payment_links` + update de `quotes`.
2. Hook de aplicacao:
   - `src/hooks/admin/useSendPaymentLink.ts`
   - encapsula mutation e invalidacoes de cache.
3. Componente desacoplado:
   - `src/components/admin/payments/SendPaymentLinkDialog.tsx`
   - sem acesso direto a gateway/supabase, apenas consumo do hook.

### Validacao desta rodada
- `eslint` dos arquivos alterados: OK
- build: OK

### Efeito arquitetural
- Separacao consistente entre UI/aplicacao/infraestrutura no fluxo de envio de link de pagamento.
- Menor acoplamento e maior reutilizacao do caso de uso.

---

## Rodada adicional 12 (edit pricing form)

### Problema atacado
- `EditPricingForm` concentrava atualizacoes de precos e multiplicadores diretamente no componente.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/coins-pricing-admin-service.ts`
   - `updateBasePrices()` e `updateContextMultipliers()`.
2. Hook de aplicacao:
   - `src/hooks/admin/useCoinsPricingAdmin.ts`
   - mutations + invalidacao de `admin-coins-pricing-config`.
3. Componente desacoplado:
   - `src/components/admin/payments/EditPricingForm.tsx`
   - consumo exclusivo dos hooks.

### Validacao desta rodada
- `eslint` dos arquivos alterados: OK
- build: OK

### Efeito arquitetural
- Fluxo de precificacao admin aderente ao padrao UI -> hook -> service.
- Reducao de acoplamento com camada de dados no componente.

---

## Rodada adicional 13 (contacts list)

### Problema atacado
- `ContactsList` tinha carregamento e enriquecimento de contatos com acesso direto ao Supabase no componente.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/contacts-service.ts`
   - `fetchContacts()` com enriquecimento de flags (pedidos, assinatura, orcamentos).
2. Hook de aplicacao:
   - `src/hooks/admin/useContacts.ts`
   - encapsula estado de carregamento e recarga.
3. Componente desacoplado:
   - `src/components/admin/customers/ContactsList.tsx`
   - filtros e UI locais, dados via hook.

### Validacao desta rodada
- `eslint` dos arquivos alterados: OK
- build: OK

### Efeito arquitetural
- Lista de contatos alinhada ao padrao UI -> hook -> service.
- Menor acoplamento de UI com infraestrutura e melhor reutilizacao do carregamento.

---

## Rodada adicional 19 (choice approval modal)

### Problema atacado
- `ChoiceApprovalModal` continha consultas diretas ao Supabase para estoque e alternativas, misturando UI com infraestrutura.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/choice-approval-modal-service.ts`
   - `fetchCharacterStock()` e `fetchAlternativeCharacters()`.
2. Hook de aplicacao:
   - `src/hooks/admin/useChoiceApprovalModal.ts`
   - `useCharacterStock()` e `useAlternativeCharacters()`.
3. Componente desacoplado:
   - `src/components/admin/collections/ChoiceApprovalModal.tsx`
   - remove acesso direto ao client de infra.
4. Testes atualizados:
   - `src/components/admin/collections/ChoiceApprovalModal.test.tsx`
   - mocks migrados para os novos hooks de aplicacao.

### Validacao desta rodada
- teste alvo (`ChoiceApprovalModal.test.tsx`): 10/10 OK
- `eslint` dos arquivos alterados: OK
- build: OK

### Efeito arquitetural
- Boundary UI -> aplicacao -> infraestrutura restaurado no fluxo de aprovacao/rejeicao de escolha.
- Reducao de acoplamento e maior testabilidade por isolamento de query logic.

---

## Rodada adicional 20 (notification center)

### Problema atacado
- `NotificationCenter` misturava UI com consultas e RPCs de notificacoes.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/notification-center-service.ts`
   - `fetchAdminNotifications()`, `markNotificationAsRead()`, `markAllNotificationsAsRead()`.
2. Hook de aplicacao:
   - `src/hooks/admin/useNotificationCenter.ts`
   - query e mutations com invalidacao centralizada.
3. Componente desacoplado:
   - `src/components/admin/notifications/NotificationCenter.tsx`
   - fluxo de dados apenas via hook, sem acesso direto a infra.

### Validacao desta rodada
- `eslint` dos arquivos alterados: OK
- build: OK

### Efeito arquitetural
- Notificacoes admin alinhadas ao padrao UI -> hook -> service.
- Menor acoplamento do componente e boundary de dominio mais claro.

---

## Rodada adicional 21 (admin users actions)

### Problema atacado
- `AdminUsers` mantinha acao de promocao e remocao de role com acesso direto de infraestrutura na page.

### Melhorias aplicadas
1. Service expandido:
   - `src/services/admin/admin-users-service.ts`
   - `promoteAdminByEmail()` e `removeUserRole()`.
2. Hook de aplicacao:
   - `src/hooks/admin/useAdminUserActions.ts`
   - mutations com invalidacao de cache centralizada.
3. Page desacoplada:
   - `src/pages/admin/users/AdminUsers.tsx`
   - remoção de chamadas diretas a supabase no componente de página.

### Validacao desta rodada
- `eslint` dos arquivos alterados: OK
- build: OK

### Efeito arquitetural
- Reforço do boundary UI -> hook -> service no fluxo de gestão de permissões de usuários.
- Menor acoplamento e melhor reaproveitamento das ações de admin users.

---

## Rodada adicional 22 (admin image upload)

### Problema atacado
- `ImageUpload` executava upload de storage diretamente no componente UI.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/admin-image-upload-service.ts`
   - `uploadAdminImage()` com geração de nome e URL pública.
2. Hook de aplicação:
   - `src/hooks/admin/useAdminImageUpload.ts`
   - mutation isolada para upload.
3. Componente desacoplado:
   - `src/components/admin/shared/ImageUpload.tsx`
   - fluxo movido para hook/service, mantendo UX e validações.

### Validação desta rodada
- `eslint` dos arquivos alterados: OK
- build: OK

### Efeito arquitetural
- Boundary UI -> hook -> service aplicado no upload compartilhado admin.
- Redução de acoplamento infra em componente reutilizado por múltiplos domínios.

---

## Rodada adicional 23 (support dashboard metrics)

### Problema atacado
- `DashboardMetrics` continha acesso direto a infra (query + realtime channel) no componente.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/support-dashboard-metrics-service.ts`
   - leitura de conversas e assinatura realtime isoladas.
2. Hook de aplicação:
   - `src/hooks/admin/useSupportDashboardMetrics.ts`
   - cálculo de métricas + ciclo de atualização.
3. Componente desacoplado:
   - `src/components/admin/analytics/DashboardMetrics.tsx`
   - agora focado apenas em renderização.

### Validação desta rodada
- `eslint` dos arquivos alterados: OK
- build: OK

### Efeito arquitetural
- Boundary UI -> hook -> service aplicado no painel de métricas de suporte.
- Menor acoplamento com Supabase no componente e melhor testabilidade da lógica de cálculo.

---

## Rodada adicional 24 (bulk assign collections query)

### Problema atacado
- `BulkAssignDialog` executava query de coleções diretamente no componente.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/collections-for-bulk-assign-service.ts`
   - `fetchCollectionsForBulkAssign()`.
2. Hook de aplicação:
   - `src/hooks/admin/useCollectionsForBulkAssign.ts`
   - encapsula query com `enabled`.
3. Componente desacoplado:
   - `src/components/admin/pricing-tiers/BulkAssignDialog.tsx`
   - remove acesso direto à infraestrutura.

### Validação desta rodada
- `eslint` dos arquivos alterados: OK
- build: OK

### Efeito arquitetural
- Boundary UI -> hook -> service reforçado no fluxo de atribuição em massa.
- Menos responsabilidade de dados no componente e maior consistência estrutural.

---

## Rodada adicional 25 (collection tier assignment dialog)

### Problema atacado
- `CollectionTierAssignmentDialog` misturava UI com leitura e escrita diretas no Supabase.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/collection-tier-assignment-dialog-service.ts`
   - `fetchCollectionsForTierAssignment()` e `saveCollectionsForTierAssignment()`.
2. Hook de aplicação:
   - `src/hooks/admin/useCollectionTierAssignmentDialog.ts`
   - query e mutation com invalidations centralizadas.
3. Componente desacoplado:
   - `src/components/admin/pricing-tiers/CollectionTierAssignmentDialog.tsx`
   - fluxo UI focado em seleção e feedback.

### Validação desta rodada
- `eslint` dos arquivos alterados: OK
- build: OK

### Efeito arquitetural
- Boundary UI -> hook -> service aplicado no diálogo de atribuição de níveis.
- Redução de acoplamento e eliminação de responsabilidade de infra no componente.

---

## Rodada adicional 26 (credits dashboard)

### Problema atacado
- `CreditsDashboard` concentrava múltiplas queries diretas no componente de UI.

### Melhorias aplicadas
1. Service agregado:
   - `src/services/admin/credits-dashboard-service.ts`
   - `fetchCreditsDashboardMetrics()` com carregamento paralelo de métricas.
2. Hook de aplicação:
   - `src/hooks/admin/useCreditsDashboardMetrics.ts`
   - encapsula query única do dashboard.
3. Componente desacoplado:
   - `src/components/admin/credits/CreditsDashboard.tsx`
   - agora apenas renderiza os dados agregados.

### Validação desta rodada
- `eslint` dos arquivos alterados: OK
- build: OK

### Efeito arquitetural
- Boundary UI -> hook -> service consolidado no dashboard de créditos.
- Menor acoplamento com infra e melhor centralização de leitura de métricas.

---

## Rodada adicional 27 (support chat session boundary)

### Problema atacado
- `ChatInterface` acessava infraestrutura (`supabase`) diretamente para sessão atual e URLs de anexos.

### Melhorias aplicadas
1. Service dedicado:
   - `src/services/admin/support-chat-session-service.ts`
   - centraliza leitura do usuário atual e geração de URL pública de anexos.
2. Hook de aplicação:
   - `src/hooks/admin/useSupportChatSession.ts`
   - encapsula query de sessão e acesso à URL pública.
3. Componente desacoplado:
   - `src/components/admin/support/ChatInterface.tsx`
   - remove import direto de `supabase` e passa a consumir hooks/services.

### Validação desta rodada
- `eslint` dos arquivos alterados: OK
- build: OK

### Efeito arquitetural
- Boundary UI -> hook -> service aplicado no chat administrativo.
- Redução de acoplamento com infraestrutura no componente de UI.

---

## Rodada adicional 28 (pricing hierarchy view)

### Problema atacado
- `PricingHierarchyView` acumulava queries e delete direto no componente, acoplando UI com infraestrutura.

### Melhorias aplicadas
1. Service agregado:
   - `src/services/admin/pricing-hierarchy-service.ts`
   - `fetchPricingHierarchyData()` com carregamento paralelo de tiers/planos/coleções.
   - `deletePricingTier()` para remoção centralizada.
2. Hook de aplicação:
   - `src/hooks/admin/usePricingHierarchy.ts`
   - query única da hierarquia e mutation de exclusão com invalidação.
3. Componente desacoplado:
   - `src/components/admin/pricing-tiers/PricingHierarchyView.tsx`
   - passa a consumir apenas hook e remove acesso direto ao `supabase`.

### Validação desta rodada
- `eslint` dos arquivos alterados: OK
- build: OK

### Efeito arquitetural
- Boundary UI -> hook -> service consolidado na visão hierárquica de preços.
- Redução de acoplamento e centralização da regra de leitura/escrita.
