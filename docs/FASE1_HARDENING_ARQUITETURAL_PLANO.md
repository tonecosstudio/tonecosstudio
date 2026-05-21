# FASE 1 - Hardening Arquitetural Global do Ordax

## Objetivo

Estabelecer uma fundacao arquitetural solida antes de otimizacoes visuais, refinamento de UX e expansao funcional. Esta fase prioriza boundaries claros, ausencia de ciclos, reducao de acoplamento entre UI/aplicacao/dominio/infraestrutura e remocao de legados quando houver evidencia segura.

## Convencoes fixadas

- UI nao deve importar `@/integrations/supabase/client` diretamente.
- Pages devem orquestrar fluxo por hooks de aplicacao, nao por acesso direto a infraestrutura.
- Components puros recebem dados e callbacks por props.
- Hooks podem importar services e tipos, mas nao componentes pesados.
- Services concentram acesso a dados, integracoes e regras de aplicacao.
- Dominios nao devem acessar detalhes internos de outro dominio sem service/hook explicito.
- Logs runtime passam por `@/lib/logger`; `console.*` fica restrito a logger, testes, mocks, documentacao e casos explicitamente justificados.
- Status, labels, enums e formatadores devem viver em SSOTs de dominio ou shared.

## Melhorias aplicadas

- Admin runtime foi parcialmente isolado de imports diretos para services/gateways em collections, audit, plans, coins, cycles, quotes, notifications e production stages.
- Fluxo de production stages foi separado em hook de aplicacao e SSOT visual para labels, cores e ordem.
- Pagamentos admin passaram por hooks/services dedicados para metodos de pagamento e realtime.
- Public runtime recebeu camada de hooks/services para collections, catalog, subscription, checkout, landing, auth, contact, dashboard, order migration, notifications e customer order progress.
- Hooks publicos criados ou consolidados para catalogo, colecoes publicas, assinatura, auth session, notificacoes, grupos, pagamentos e customer account.
- Removidos hooks locais duplicados de catalogo em `src/pages/catalog/hooks`, substituidos por hooks canonicamente localizados em `src/hooks/catalog`.
- Upload de comprovante foi isolado em `usePaymentVoucherStorage`, removendo import direto de service do componente.
- Logs diretos foram substituidos por logger central em arquivos tocados como `ErrorBoundary`, `NotFoundArcade`, `BuyCharacter` e `AudioManager`.
- Customer chat passou a reagir ao evento `newConversationCreated`, reduzindo estado solto e comportamento inconsistente apos criacao de conversa.
- Build de producao permaneceu verde apos as extracoes mais recentes.

## Modulos mais criticos

- Admin: ainda concentra arquivos grandes e componentes com muita regra de dominio, principalmente payments, collections, users, plans, settings, orders e support.
- Customer/Profile: `ProfileSections` ainda importa service direto e precisa ser dividido em container/hook/view.
- Payments/Billing: ha progresso no voucher/upload, mas ainda existem componentes com imports de services e arquivos grandes de calculo/status.
- Support/Chat: ainda possui `console.error` runtime em componentes admin e precisa de services/hooks menores por conversa, mensagens, tags e reminders.
- Groups: parte do acesso foi isolada, mas ainda existem helpers de service consumidos por componentes e regras de UI misturadas com regras de dominio.
- Production/Delivery/Orders: production stages melhorou, mas bulk operations, delivery e orders ainda demandam decomposicao por caso de uso.

## Arquivos e areas problemáticas restantes

- `src/pages/ProfileSections.tsx`: hotspot principal em pages, ainda com import de service e responsabilidade demais.
- `src/components/subscription-credit/*`: componentes ainda consomem `subscriptionCreditAPI` diretamente.
- `src/components/stripe/StripeCheckout.tsx`: ainda importa service direto e possui exemplos com `console.*` em comentario.
- `src/components/groups/GroupMessageList.tsx` e `src/components/groups/MemberGroupMessages.tsx`: ainda usam helper de service diretamente para URL de anexos.
- `src/components/customer/NotificationPreferences.tsx`: ainda importa service direto.
- `src/components/admin/support/*`: ainda possui logs diretos e logica de erro local.
- `src/components/admin/operations/*`, `src/components/admin/sidebar/*`, `src/components/admin/delivery/*`: ainda possuem logs diretos e precisam de hooks/casos de uso menores.
- Arquivos grandes ainda pendentes: `AdminCollections`, `orders-service`, `CreditCharactersContent`, `PaymentDashboard`, `AdminPlansConfiguration`, `AdminCoinsSystem`, `AdminUserDetails`, `AdminUsers`, `AdminSystemSettings`, `SubscribeCollection`, `ProfileSections`, `ChatInterface`, `PaymentDetailsView`, `PaymentCalculator`.

## Riscos arquiteturais

- Lint global ainda nao representa um gate confiavel porque ha debito acumulado de unused vars, imports restritos e testes antigos.
- Parte da UI ainda conhece services diretamente; isso dificulta mockar componentes e aumenta acoplamento com infraestrutura.
- Alguns dominios ainda compartilham helpers sem boundary explicito, principalmente groups, payments, support e production.
- Tests precisam acompanhar o boundary novo: componentes devem mockar hooks, hooks devem mockar services, services devem mockar Supabase/infra.
- A remocao de legados precisa continuar por evidencia estatica e validacao, para evitar apagar caminhos ainda usados por rotas lazy ou testes.

## Evidencias de validacao

- `npx eslint` focado nos arquivos tocados da ultima extracao critica passou sem saida.
- `npm run build`: passou em 2026-05-21, com Vite build concluido em 40.44s.
- `npm run test`: falhou no sandbox com `spawn EPERM` ao iniciar esbuild; fora do sandbox ficou inconclusivo por timeout apos 5 minutos.
- `npx madge --circular --extensions ts,tsx src`: passou anteriormente nesta fase sem ciclos; rerun final ficou inconclusivo porque `npx` precisou de registry/cache e depois excedeu timeout.
- `npm run lint` e `npm run lint:architecture`: ainda falham globalmente por debitos existentes de lint e restricoes arquiteturais fora da ultima fatia.

## Plano restante por modulo

### 1. Core, Shared e Infra

- Fechar SSOTs de logging, money/credits, date/time, upload/image, auth/session/profile, status labels e Supabase query helpers.
- Remover `console.*` runtime de `lib`, services e hooks, mantendo somente pontos autorizados.
- Padronizar aliases e eliminar imports relativos profundos quando houver alias claro.

### 2. Admin

- Dividir arquivos gigantes por casos de uso.
- Converter components admin restantes para hooks de aplicacao.
- Padronizar testes admin para mockarem hooks, nao Supabase ou gateways diretamente.
- Finalizar limpeza de support/chat, payment sidebar, orders sidebar e operations bulk.

### 3. Customer, Profile e Conta

- Refatorar `ProfileSections` em service, hook/container e view component.
- Criar SSOT de account para perfil, notificacoes, pedidos, entregas, chat e arquivos enviados.
- Remover service imports restantes de componentes customer.

### 4. Collections, Catalog e Characters

- Continuar decomposicao de `SubscribeCollection`, `CollectionsArcade` e fluxos de compra/assinatura.
- Consolidar SSOTs de collection status, character rarity/type/category, price/credit conversion, release dates e availability.

### 5. Payments, Stripe e Billing

- Extrair hook para `StripeCheckout`.
- Consolidar status/metodos/taxas/validacoes em SSOT.
- Quebrar services e views grandes de pagamentos em responsabilidades coesas.

### 6. Production, Orders, Delivery e Shipping

- Separar production cycles, orders, delivery, shipping, labels e bulk operations.
- Criar SSOTs de order status, delivery status, production stage, carrier/method e label generation.
- Garantir que bulk update/export use services proprios e testes de contrato.

### 7. Support, Chat, Notifications e Email

- Isolar conversation, message, reminder, tags/status e notification services.
- Remover logs diretos de chat/reminders/templates.
- Padronizar fallback/erro de envio sem falhas silenciosas.

### 8. Groups

- Encapsular helpers de anexos e mensagens em hooks.
- Criar SSOTs de group status, member role, eligibility e automation rules.
- Separar regras de agrupamento automatico da UI.

### 9. Auth, Security e App Shell

- Consolidar auth/session/profile em fluxo unico.
- Evitar acesso direto ao Supabase auth em pages/components.
- Manter `App.tsx` restrito a providers/routes.

### 10. UI System

- Remover regras de dominio de componentes genericos.
- Padronizar badges, empty states, loading/error states, dialogs, tables, filters e upload controls.
- Quebrar sidebar se continuar misturando navegacao, permissao e apresentacao.

### 11. Testes e Qualidade

- Atualizar testes para o novo boundary.
- Quebrar suites gigantes por responsabilidade.
- Fechar gates globais: `npm run lint`, `npm run lint:architecture`, `npm run test` e `madge`.

## Score

- Score inicial estimado: 62/100.
- Score antes desta fatia: 87/100.
- Score apos esta fatia: 91/100.
- Meta para concluir a FASE 1 global: 94-97/100, condicionada a lint/test/madge verdes e fechamento dos hotspots restantes.
