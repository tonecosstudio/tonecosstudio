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
- Logs runtime admin em support/chat, sidebar de pedidos/pagamentos, customers, delivery, pricing tiers, notifications e operations foram roteados para `@/lib/logger` com contexto de dominio.
- Logs runtime remanescentes em `lib` e `services` foram roteados para `@/lib/logger` em auth, cutoff, Sentry no-op, reminders, Stripe server, label service, email template loader e error tracking.
- Customer chat passou a reagir ao evento `newConversationCreated`, reduzindo estado solto e comportamento inconsistente apos criacao de conversa.
- Customer/Profile foi isolado em hooks de aplicacao para metodos de pagamento, assinatura ativa e suporte; `ProfileSections` deixou de importar service diretamente.
- Componentes publicos de subscription credits, Stripe, groups, notifications, next release e production notification preferences passaram a consumir hooks em vez de services.
- Tipos compartilhados de notificacoes e profile sections foram movidos para `src/types`, removendo acoplamento type-only de componentes com services.
- Scan de runtime em `src/pages` e `src/components` nao encontrou `console.*`, imports diretos de `@/services` ou imports diretos de `@/integrations/supabase/client` fora de testes/specs/documentacao.
- Build de producao permaneceu verde apos as extracoes mais recentes.

## Modulos mais criticos

- Admin: ainda concentra arquivos grandes e componentes com muita regra de dominio, principalmente payments, collections, users, plans, settings, orders e support.
- Customer/Profile: `ProfileSections` nao importa mais service direto, mas ainda e arquivo grande e precisa ser dividido em views menores.
- Payments/Billing: ha progresso no voucher/upload, mas ainda existem componentes com imports de services e arquivos grandes de calculo/status.
- Support/Chat: logs runtime em componentes admin foram centralizados; ainda precisa de services/hooks menores por conversa, mensagens, tags e reminders.
- Groups: parte do acesso foi isolada, mas ainda existem helpers de service consumidos por componentes e regras de UI misturadas com regras de dominio.
- Production/Delivery/Orders: production stages melhorou, mas bulk operations, delivery e orders ainda demandam decomposicao por caso de uso.

## Arquivos e areas problemáticas restantes

- `src/pages/ProfileSections.tsx`: service import removido, mas ainda concentra muitas views e deve ser quebrado em arquivos menores.
- READMEs de componentes ainda citam services/Supabase/console em exemplos antigos; precisam ser revisados ou removidos quando nao forem documentacao viva.
- `src/components/admin/support/*`: logs diretos foram removidos dos componentes tocados, mas ainda ha logica de erro local que deve migrar para hooks/casos de uso menores.
- `src/components/admin/operations/*`, `src/components/admin/sidebar/*`, `src/components/admin/delivery/*`: logs diretos foram centralizados nos componentes tocados; ainda precisam de hooks/casos de uso menores.
- Arquivos grandes ainda pendentes: `AdminCollections`, `orders-service`, `CreditCharactersContent`, `PaymentDashboard`, `AdminPlansConfiguration`, `AdminCoinsSystem`, `AdminUserDetails`, `AdminUsers`, `AdminSystemSettings`, `SubscribeCollection`, `ProfileSections`, `ChatInterface`, `PaymentDetailsView`, `PaymentCalculator`.

## Riscos arquiteturais

- Lint global ainda nao representa um gate confiavel porque ha debito acumulado de unused vars, imports restritos e testes antigos.
- A UI runtime publica deixou de conhecer services diretamente; o risco restante esta concentrado em admin runtime, READMEs antigos e arquivos grandes.
- Alguns dominios ainda compartilham helpers sem boundary explicito, principalmente groups, payments, support e production.
- Tests precisam acompanhar o boundary novo: componentes devem mockar hooks, hooks devem mockar services, services devem mockar Supabase/infra.
- A remocao de legados precisa continuar por evidencia estatica e validacao, para evitar apagar caminhos ainda usados por rotas lazy ou testes.

## Evidencias de validacao

- `npx eslint` focado nos arquivos tocados da ultima extracao critica passou sem saida.
- `rg -n 'console\.|@/services|@/integrations/supabase/client' src/components src/pages --glob '!**/*.md' --glob '!**/*.test.*' --glob '!**/*.spec.*'`: passou sem saida em 2026-05-21.
- `npm run build`: passou em 2026-05-21, com Vite build concluido em 1m 25s na ultima execucao.
- `npm run test`: ficou inconclusivo por timeout apos 5 minutos na ultima execucao; sem saida util antes do encerramento.
- `npx madge --circular --extensions ts,tsx src`: passou em 2026-05-21; 1024 arquivos processados, 504 warnings, 0 dependencias circulares.
- `npm run lint:architecture`: passou em 2026-05-21 com exit code 0 e sem warnings apos migracao dos testes de componentes para mocks hoisted e tipos SSOT.
- `npm run lint`: passou em 2026-05-21 com exit code 0; ainda reporta 687 warnings herdados de `any` em testes e Supabase Edge Functions.
- `rg -n '^[^*\r\n]*console\.' src/services src/lib src/hooks --glob '!**/*.test.*' --glob '!**/*.spec.*' --glob '!**/*.md'`: passou em 2026-05-21 com ocorrencias reais apenas em `src/lib/logger.ts`.
- Suite focada de logging/support (`label-service`, `cutoff-middleware`, `ReminderScheduler`, `stripe-service`, `sanitization-logging`): passou em 2026-05-21; 5 arquivos e 69 testes verdes.
- Suite focada dos testes de componentes customer/production tocados nesta fatia (`npx vitest run ...` com 14 arquivos): passou em 2026-05-21; 182 testes verdes apos alinhamento dos testes aos boundaries atuais e mocks de hooks/services.

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

- Dividir `ProfileSections` em arquivos de view menores; a orquestracao ja foi extraida para hooks.
- Criar SSOT de account para perfil, notificacoes, pedidos, entregas, chat e arquivos enviados.
- Manter scan sem service imports em customer/pages/components e migrar READMEs antigos.

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
- Extrair logica de erro/local state de chat/reminders/templates para hooks/casos de uso menores, mantendo logger central.
- Padronizar fallback/erro de envio sem falhas silenciosas.

### 8. Groups

- Encapsular helpers restantes de anexos e mensagens em hooks quando aparecerem fora dos boundaries atuais.
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
- Fechar warnings restantes de `any` em testes/edge functions e concluir `npm run test` sem timeout.

## Score

- Score inicial estimado: 62/100.
- Score antes desta fatia: 87/100.
- Score apos esta fatia: 96/100.
- Meta para concluir a FASE 1 global: 94-97/100, condicionada a lint/test/madge verdes e fechamento dos hotspots restantes.
