# URGENTE — OrdaX Launch Readiness

> SSOT operacional de `washingtonmsdj/ordax`.
> Atualizado em 2026-09-17 com evidência real de GitHub, Supabase e Vercel.
> Não declarar GO com base apenas em deploy `READY`, CI sem steps ou correção não validada no mesmo SHA.

## Estado

**Lançamento público: NO-GO.**

HEAD de código deste checkpoint:

- `d9301b56b0fe0b9833f0b08adea42ab2619924af` — `fix: bind coin transaction filters to database enum`.

O bloqueador técnico primário é a reconciliação **aplicação ↔ schema Supabase canônico**. O deployment Vercel do antigo HEAD `8b552360...` executou `npm run release:verify` e falhou no TypeScript. Consultas diretas ao PostgreSQL confirmaram que vários contratos referenciados pelo código já não existem.

Confirmados como ausentes no banco atual:

- RPCs `purchase_character_with_coins`, `purchase_collection_with_coins`, `validate_collection_limit` e `get_collection_pricing`;
- tabelas `collector_badges`, `user_badges`, `user_notification_settings` e `pricing_history`;
- colunas `subscription_deliveries.shipping_carrier`, `production_queue.customer_name` e `pricing_context_multipliers.chosen_collection_discount_percentage`.

Regra P0: corrigir o código para a realidade do banco. **Não recriar APIs aposentadas só para fazer o frontend compilar e não mascarar drift com casts.**

## Implementação iniciada nesta rodada

### `b3e23b5fc04833e8202cac787a9fdf1986b49022`

`refactor: remove dead coin purchase rpc paths`

- removidas chamadas browser a `purchase_character_with_coins` e `purchase_collection_with_coins`, RPCs inexistentes no schema atual;
- removidos hooks/exportações de compra por coins sem consumidor ativo;
- preservados saldo e reembolso que ainda usam fronteiras canônicas existentes.

### `c21c62e55d3b218f8e90a70e0f4fce2f7852d704`

`refactor: remove dead collection limit path`

- removidos `src/hooks/useCollectionLimit.ts` e `src/services/collections/collection-limit-service.ts`;
- `validate_collection_limit` não existe no banco e a busca de consumidores não encontrou uso ativo fora desse caminho legado.

### `91896d29f74a23512c278cf9c8ac6df16ff5b820`

`fix: fail closed on incomplete collection characters`

- `choice-service` deixou de assumir que `collection_characters.name` e `collection_id` nunca são `null`;
- dados incompletos agora interrompem o fluxo explicitamente, sem string vazia ou cast que esconda inconsistência.

### `d9301b56b0fe0b9833f0b08adea42ab2619924af`

`fix: bind coin transaction filters to database enum`

- `coin_transactions.transaction_type` foi alinhado ao enum real do PostgreSQL: `purchase | spend | refund | bonus | adjustment`;
- filtro deixou de enviar `string` arbitrária ao Supabase;
- `subscription_credit` fica fail-closed nesse ledger, pois créditos de assinatura pertencem ao subsistema/ledger próprio.

## Prova disponível do efeito da rodada

- os novos commits dispararam deployments Vercel automaticamente;
- no último snapshot desta rodada, `91896d29...` estava `BUILDING` e `d9301b56...` estava `QUEUED`;
- portanto **ainda não existe prova de typecheck PASS no HEAD atual**;
- não marcar P0 de compilação como concluído enquanto `release:verify` não executar no mesmo SHA e avançar além do TypeScript.

O log parcial de `91896d29...` mostrou instalação em andamento e um erro do classificador de diff do `ignoreCommand` (`fatal: bad object 838224...`), seguido de `Unable to classify the diff; continuing the Vercel build.` Isso não é PASS nem a causa comprovada de falha do código.

## Supabase canônico

Projeto: `pdytjhtjlxvbbeuxgnms` (`Ordax-2026-1`).

Snapshot verificado em 2026-09-17:

- estado `ACTIVE_HEALTHY`;
- PostgreSQL 17;
- 97 tabelas em `public` e **0 sem RLS habilitado**;
- Advisor de segurança: 1 warning — **Leaked Password Protection Disabled**;
- 184 funções `SECURITY DEFINER` auditadas; 0 executáveis diretamente por `anon` e 0 por `authenticated` no snapshot consultado;
- `src/integrations/supabase/types.ts` permanece o SSOT gerado do projeto canônico.

### Regras permanentes de tipos/autoridade

- não editar `types.ts` gerado manualmente;
- não criar `SupabaseClient<DatabaseFalso>` ou `supabase as unknown as ...Client`;
- não adicionar `as unknown as` para silenciar contrato inválido;
- UI nunca é fronteira de autorização;
- DML administrativo continua server-authoritative;
- RPCs service-role-only não voltam a ser expostos ao browser.

## Catálogo

A afirmação antiga de catálogo vazio está obsoleta.

Snapshot de 2026-09-17:

- `models`: 478 rows;
- `public_catalog_models`: 367 rows;
- `collections`: 1 coleção ativa;
- `collection_characters`: 8 rows;
- `models.catalog_visibility`: 458 `general`, 12 `hidden`, 8 `both`.

`public_catalog_models` usa `security_invoker = true` e continua sendo a superfície pública canônica do catálogo. Esses números são snapshot operacional, não regra de produto.

## Pricing

O caminho `get_collection_pricing` continua **ativo no frontend** através de `BuyCharacter.tsx` / `useCollectionPricing`, mas o RPC não existe.

Investigação já feita:

- `pricing_tiers` é legível publicamente;
- `collection_tier_assignments` não concede SELECT a `anon`;
- a coleção ativa atual não possui tier assignment no snapshot consultado;
- não existe view pública de pricing nem RPC público equivalente;
- funções de pricing encontradas no banco são administrativas.

Consequência: **não apagar nem improvisar esse fluxo**. A leitura pública canônica de preço precisa ser definida com autoridade explícita antes da correção. Não expor `collection_tier_assignments` apenas para fazer a página funcionar.

## Drift P0 ainda aberto

### P0.1 — legado comprovadamente morto

- [x] remover compras por coins ligadas a RPCs inexistentes e sem consumidor ativo;
- [x] remover `validate_collection_limit` + hook sem consumidor ativo;
- [ ] continuar varredura por código morto que dependa exclusivamente de contratos inexistentes.

### P0.2 — contratos ativos divergentes

- [x] `choice-service`: tratar nullability real de `collection_characters` fail-closed;
- [x] ledger de coins: alinhar filtro ao enum real do banco;
- [ ] `collector-service`: remover/reprojetar uso de `collector_badges` e `user_badges` inexistentes;
- [ ] `subscriber-dashboard-service` / `email-service`: eliminar `shipping_carrier` inexistente e usar origem real de tracking/transporte;
- [ ] `live-notifications-service`: eliminar `user_notification_settings` inexistente ou migrar para SSOT real;
- [ ] `production-notification-service`: remover dependência de campos denormalizados antigos (`customer_id`, `customer_name` etc.);
- [ ] `subscription-credit-api`: alinhar enums/nullability;
- [ ] `subscription-details-service` e `subscription-service`: alinhar plano ao schema gerado;
- [ ] `support/message-service` e hydration: alinhar nullability real;
- [ ] `context-pricing-service` / `src/types/contextual-pricing.ts`: remover `pricing_history` e campos antigos;
- [ ] definir e implementar autoridade pública canônica de pricing usada por `BuyCharacter`.

### P0.3 — gate completo

Depois de `npm run typecheck` PASS no mesmo SHA:

1. lint;
2. auditorias de autoridade;
3. `test:coverage`;
4. build;
5. `npm audit --omit=dev --audit-level=high`;
6. `format:check`;
7. repetir o gate completo no SHA candidato.

## Vercel / produção

Projeto: `ordax` (`prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`).

- domínio de produção permanecia no último deployment `READY` do commit `838224ae1599173f0c000ba7a5609afbe4f0f128` no snapshot auditado;
- isso não certifica o HEAD atual;
- `vercel.json` executa `npm ci` e `npm run release:verify`;
- o antigo HEAD `8b552360...` falhou realmente no TypeScript;
- novos SHAs desta rodada ainda não forneceram prova de gate completo.

## GitHub Actions / proteção de main

- Quality Gate existe e separa typecheck/lint, coverage, build/audit e authority audits;
- execuções recentes do Actions continuaram sem prova útil de steps/runner;
- `main` permanece `protected: false`, sem required status checks observados;
- enquanto `AGENTS.md` mantiver a decisão atual, mudanças autorizadas seguem diretamente na `main`, pequenas e reversíveis, sempre confirmando o HEAD antes da escrita.

## Dependências npm

Último audit completo registrado antes deste checkpoint:

- 15 vulnerabilidades de produção: 1 low, 6 moderate, 7 high, 1 critical;
- árvore completa: 27 vulnerabilidades.

O número atual continua não certificado porque o gate ainda não avançou até `npm audit` no HEAD mais recente.

Não editar `package-lock.json` manualmente, não reduzir o nível do audit e não classificar tooling como runtime sem verificar uso real.

## P0 — obrigatório antes do GO

- [x] Supabase canônico observável e saudável.
- [x] RLS habilitado nas tabelas `public` auditadas.
- [x] Tipos Supabase canônicos regenerados e auditados como SSOT.
- [x] Hardening administrativo, grupos, pagamentos manuais e integridade de delivery já consolidados nas rodadas anteriores.
- [x] Confirmar falha TypeScript real da aplicação contra o schema atual.
- [x] Iniciar remoção de contratos mortos comprovados.
- [ ] **Zerar `npm run typecheck` no schema canônico.**
- [ ] Obter lint + auditorias + tests + coverage + build PASS no mesmo SHA.
- [ ] Remediar dependências até audit high/critical PASS no mesmo SHA.
- [ ] Restaurar execução útil do GitHub Actions e required checks.
- [ ] Habilitar Leaked Password Protection no Supabase Auth.
- [ ] Executar smoke autenticado completo.
- [ ] Provar rollback do mesmo release candidate.

## Regras de segurança do release

- não desligar TypeScript strict;
- não reintroduzir RPC/tabela/coluna aposentada apenas para satisfazer código legado;
- não usar casts para esconder drift;
- não reduzir/remover `npm audit`;
- não tratar Vercel `READY` isoladamente como GO;
- não expor tabela privada para resolver rapidamente uma leitura pública;
- não executar migration remota ou deploy manual sem escopo explícito e rollback;
- não declarar GO enquanto qualquer P0 permanecer aberto.

## Histórico consolidado útil

- `838224ae1599173f0c000ba7a5609afbe4f0f128` — último deployment `READY` associado ao domínio no snapshot auditado;
- `20260916082005_close_remaining_admin_table_dml.sql` — fechamento de DML admin tratado;
- `20260916143602_stop_dual_writing_manual_payment_info_requests.sql` — timeline manual consolidada;
- `20260916152937_restrict_chat_group_metadata_to_members_or_admins.sql` — metadados de grupos restritos;
- `20260916154052_reconcile_delivery_choice_integrity.sql` — integridade de escolha de entrega;
- `admin-rpc` ativo na versão 11 com `verify_jwt=true`;
- `generate-shipping-label` ativo na versão 1 com `verify_jwt=true`.

## Checkpoint desta rodada

**HEAD de entrada:** `8b552360882aff72ca362dcdc177a1d2fbf3106c`.

**HEAD de código após implementação:** `d9301b56b0fe0b9833f0b08adea42ab2619924af`.

**Concluído:**

- plano repriorizado para drift aplicação ↔ schema;
- duas famílias de código morto removidas (`coin purchase RPCs`, `collection limit`);
- `choice-service` alinhado à nullability real de forma fail-closed;
- ledger de coins alinhado ao enum real do PostgreSQL.

**Provas:**

- ausência dos contratos legados confirmada diretamente no PostgreSQL;
- enum real de `coin_transactions.transaction_type` confirmado no banco;
- buscas de consumidores realizadas antes das remoções;
- commits pequenos e reversíveis aplicados diretamente na `main` conforme `AGENTS.md`.

**Bloqueios:**

- gate do HEAD atual ainda não terminou; não existe typecheck PASS comprovado;
- pricing público usado por `BuyCharacter` ainda não possui uma fronteira canônica equivalente ao RPC aposentado;
- outras famílias de drift ativo ainda permanecem.

**next_action:** continuar P0.2 pelos contratos ativos mais inequívocos (`collector-service`, notifications, shipping/tracking, subscriptions/support/contextual pricing), medindo novamente o typecheck no próximo executor real.

**do_not_repeat:** não restaurar `purchase_*_with_coins` nem `validate_collection_limit`; não declarar o HEAD verde enquanto o deployment correspondente estiver `QUEUED/BUILDING` ou não concluir o gate.