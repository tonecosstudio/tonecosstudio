# URGENTE — OrdaX Launch Readiness

> SSOT operacional de `washingtonmsdj/ordax`.
> Atualizado em 2026-09-17 com evidência de GitHub, Supabase e Vercel.
> Não declarar GO sem gate completo executado no mesmo SHA candidato.

## Estado

**Lançamento público: NO-GO.**

HEAD de Git antes deste checkpoint documental:

- `96669eb9dfbe561f091d40979d32eeef4c0b14dd` — `docs: checkpoint public pricing activation`.

O drift conhecido entre aplicação e schema vivo foi reduzido aos últimos checkpoints e os três bloqueios backend identificados nesta sequência já foram corrigidos/ativados: pricing público, Edge `get-my-subscriptions` e `admin_upsert_price_category`.

Ainda **não existe prova de typecheck/gate do HEAD atual**. A Vercel está rate-limited e o GitHub Actions cria jobs sem alocar runner. Portanto o projeto permanece NO-GO mesmo com os contratos backend corrigidos.

Regra P0: **não recriar tabela/RPC aposentado, não mascarar drift com cast e não declarar PASS sem execução real.**

## Última prova que executou código

Vercel deployment:

- `dpl_H4tHgw7H3yNxdaJf5K4zmYS2Locd`;
- SHA `9bd5e703d8ad8ef2a778e41c24526b84a75ff017`;
- `npm run release:verify` chegou ao TypeScript;
- os únicos erros restantes naquele SHA eram do antigo `src/services/admin/orders/orders-service.ts`:
  - `OrderStatus[]` amplo demais para enums específicos;
  - RPC inexistente `search_unified_orders`;
  - tabela inexistente `quote_items`.

Depois dessa prova:

- `655ca2fb6f752f923f9de76239b1352f3e1c78db` — `orders-service` refeito sobre o schema vivo;
- `ed97107336ffcbc969eaaef547b7c7bff223597c` — teste contratual atualizado;
- `1cb59146f14bb77744c18f54aac15bdcb746df2f` — suporte `PromiseLike` nas contagens PostgREST.

Nenhum executor útil rodou o typecheck depois dessa reescrita.

## Aplicação ↔ schema — concluído no Git

### E-mail e produção

- `98cb15c843aacd98ef40417feae818b75b88053b` — browser `email-service` reduzido ao papel real de cliente de envio;
- `8d112d33c9a23e123d5a8af64abd70009dfc0d49` — notificações de produção passaram a usar contratos canônicos;
- `production_queue` não depende mais de campos denormalizados antigos.

### Compra avulsa administrativa

- `9bd5e703d8ad8ef2a778e41c24526b84a75ff017` — `standalone-purchase-service` reduzido aos RPCs administrativos vivos;
- removidos fluxos sem consumidor e o filtro amplo `status?: string`.

### Pedidos unificados

- sem `search_unified_orders`;
- sem `quote_items`;
- busca admin local por nome/e-mail/ID/rastreio;
- status filtrados por domínio/tabela;
- profiles/collections hidratados em lote;
- `order_status_history.old_status` nullable tratado explicitamente;
- FKs relacionais usadas pelo service confirmadas no banco vivo.

## Supabase canônico

Projeto: `pdytjhtjlxvbbeuxgnms` (`Ordax-2026-1`).

Snapshot desta sequência:

- estado `ACTIVE_HEALTHY`;
- PostgreSQL 17;
- tipos gerados em `src/integrations/supabase/types.ts` são o SSOT;
- Advisor de segurança ainda aponta **Leaked Password Protection Disabled**.

Regras permanentes:

- não editar `types.ts` manualmente;
- não criar `SupabaseClient<DatabaseFalso>`;
- não adicionar `as unknown as` para esconder drift;
- UI não é fronteira de autorização;
- DML admin permanece server-authoritative.

## Edge Function `get-my-subscriptions` — ATIVA

A versão viva v5 consultava campos inexistentes em `subscription_deliveries`: `production_start_date`, `shipping_carrier` e `progress_photos`.

Correção / rollback:

- código corrigido: `d44893e3784fa6e57aacaf0c3c27da3e3acb95c4`;
- rollback exato da v5: `supabase/functions/get-my-subscriptions/ROLLBACK.md`;
- commit do rollback: `1fce76be0484ed51025f4d876e9c30edd1b82479`.

Deploy remoto concluído e verificado:

- status `ACTIVE`;
- versão **6**;
- `verify_jwt=true` preservado;
- `ezbr_sha256 = 6c62d8c681a759c32790b2ef2c42e42245e0ca3674eac0396ef1b496cb2ed451`;
- entrypoint ativo corresponde ao Git corrigido;
- colunas e FK usadas pela v6 confirmadas no schema vivo.

Pendente: smoke autenticado com sessão real de usuário.

## Pricing público da compra avulsa — ATIVADO

O backend vivo `create_standalone_purchase_atomic(...)` dependia de `public.get_collection_pricing(p_collection_id)`, que não existia.

Migration versionada:

- `supabase/migrations/20260917115000_restore_public_collection_pricing.sql`;
- commit `ac84309835e2fad49c394bc60330a5026d9f313f`;
- rollback documentado no arquivo.

Change remoto aplicado isoladamente e verificado:

- função `public.get_collection_pricing(uuid)` criada como `STABLE SECURITY DEFINER`;
- `search_path=public, pg_temp` fixo;
- `anon` e `authenticated` possuem somente `EXECUTE` na função;
- `anon` continua sem `SELECT` em `collection_tier_assignments`;
- execução sob `SET LOCAL ROLE anon` funciona.

ThunderCats (`5f4b4fcf-4f96-425f-b535-d656d6e4ba5b`) retorna:

- `price_full = 150.00`;
- `price_pix = 142.50`;
- `deposit_amount = 30`;
- `remaining_full = 120.00`;
- `remaining_pix = 112.50`;
- `pricing_source = default`.

Não declarar o fluxo inteiro de compra verde sem smoke autenticado/transação real.

## Price category RPC — ATIVADO E ALINHADO

Problema original:

- `price_categories` não possui coluna `description`;
- o RPC vivo `admin_upsert_price_category` tentava INSERT/UPDATE dessa coluna.

Frontend/service preparado antes da migration:

- `6361fca93715073b60f3cec504424be03260e442` — payload não envia mais `p_description`;
- `191180a4fbce725c8f250c599272d04ab805fb6f` — cliente legado com descrição não vazia falha explicitamente, evitando perda silenciosa.

Migration versionada:

- `supabase/migrations/20260917134500_fix_admin_price_category_description_drift.sql`;
- commit `d681b676bb33e2119451311c8cff30162f4c0b31`;
- rollback exato da função anterior incluído no próprio arquivo.

Change remoto aplicado isoladamente em 2026-09-17.

Pós-change verificado no banco:

- assinatura existente preservada;
- `SECURITY DEFINER` preservado;
- `search_path=public, pg_temp` fixo;
- `PERFORM public.assert_admin_catalog_access()` preservado;
- função não referencia mais `description` no INSERT/UPDATE;
- `p_description` não vazio é rejeitado explicitamente;
- `service_role` possui `EXECUTE`;
- `anon` e `authenticated` não possuem `EXECUTE` direto.

Pendente de limpeza de UX:

- remover o campo visual de descrição de categoria de `CreditCharactersContent.tsx`, pois o schema canônico não possui essa propriedade.

## Shipping / tracking

- `subscription_deliveries` tem `tracking_code` e **não** tem `shipping_carrier`;
- `standalone_purchases` tem `tracking_code` e `shipping_carrier`;
- dashboard, detalhe admin, browser email e Edge v6 respeitam essa diferença.

## Executor / CI — bloqueio atual

### Vercel

Após o build de `9bd5e70...`, o projeto Hobby atingiu o limite de deployments.

Status dos SHAs posteriores:

- `Deployment rate limited — retry in 24 hours.`

Isso é bloqueio de executor, não evidência nova de erro de aplicação.

### GitHub Actions

Run auditado:

- `35227809698`;
- SHA `1cb59146f14bb77744c18f54aac15bdcb746df2f`;
- quatro jobs criados;
- todos `failure` antes de qualquer step;
- `steps: []`;
- `runner_id: 0`.

Esse run não executou checkout, `npm ci`, typecheck, testes, build nem audits. Tratar como falha de infraestrutura/alocação de runner.

## P0 — estado atual

### P0.1 — aplicação ↔ schema

- [x] coin purchase RPCs aposentados removidos;
- [x] collection limit aposentado removido;
- [x] badges / notification settings aposentados;
- [x] contextual pricing antigo aposentado;
- [x] production queue principal reconciliada;
- [x] email browser reconciliado;
- [x] production notifications reconciliadas;
- [x] standalone admin service reduzido aos RPCs vivos;
- [x] `orders-service` refeito sem contratos inexistentes;
- [x] `get-my-subscriptions` deployada em v6 contra schema vivo;
- [x] `get_collection_pricing` ativada e verificada como anon;
- [x] `admin_upsert_price_category` alinhada e ativada;
- [ ] remover UX de `price_categories.description` que não possui persistência canônica;
- [ ] continuar varredura por contratos aposentados que ainda estejam no default branch;
- [ ] executar typecheck do HEAD atual assim que houver executor útil.

### P0.2 — smokes autenticados

- [ ] Edge `get-my-subscriptions` v6;
- [ ] fluxo de compra avulsa com pricing público restaurado;
- [ ] operação administrativa de criação/edição de price category através de `admin-rpc`.

### P0.3 — gate completo no mesmo SHA

Depois de `npm run typecheck` PASS:

1. lint;
2. auditorias de autoridade;
3. `test:coverage`;
4. build;
5. `npm audit --omit=dev --audit-level=high`;
6. `format:check`;
7. repetir `release:verify` completo no mesmo SHA candidato.

### P0.4 — release operacional

- [ ] obter execução útil de CI/deploy no SHA candidato;
- [ ] habilitar Leaked Password Protection no Supabase Auth;
- [ ] smoke autenticado completo;
- [ ] rollback provado no release candidate;
- [ ] definir required checks/proteção de `main` quando os checks forem confiáveis.

## Regras de segurança do release

- não desligar TypeScript strict;
- não reintroduzir RPC/tabela/coluna aposentada;
- não usar casts para esconder drift;
- não reduzir/remover `npm audit`;
- não tratar Vercel `READY` isoladamente como GO;
- não tratar Vercel rate-limit ou Actions sem runner como erro de aplicação;
- não expor tabela privada como atalho;
- não executar migration remota sem escopo e rollback;
- não declarar GO enquanto qualquer P0 permanecer aberto.

## Checkpoint desta continuação

**HEAD de entrada:** `96669eb9dfbe561f091d40979d32eeef4c0b14dd`.

**Concluído:**

- migration `20260917134500_fix_admin_price_category_description_drift.sql` aplicada isoladamente;
- definição e privilégios do RPC verificados após aplicação;
- os três bloqueios backend desta sequência agora estão ativos/alinhados: Edge v6, pricing público e price-category RPC.

**Bloqueios:** nenhum typecheck executado após a reescrita de `orders-service`; smokes autenticados pendentes; campo visual de descrição da categoria ainda precisa ser removido; Leaked Password Protection continua desligada.

**next_action:** remover a falsa UX de descrição de categoria, continuar a varredura por contratos mortos no default branch e aproveitar qualquer executor que voltar a ficar disponível para rodar o typecheck do SHA corrente antes de avançar ao gate completo.

**do_not_repeat:** não restaurar `search_unified_orders`; não restaurar `quote_items`; não passar a união `OrderStatus` diretamente para enums específicos do PostgREST; não adicionar `shipping_carrier` a `subscription_deliveries`; não restaurar colunas denormalizadas em `production_queue`; não expor `collection_tier_assignments`; não voltar a gravar `price_categories.description`; não declarar typecheck PASS sem execução real.
