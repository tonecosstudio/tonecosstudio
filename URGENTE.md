# URGENTE — OrdaX Launch Readiness

> SSOT operacional de `washingtonmsdj/ordax`.
> Atualizado em 2026-09-17 com evidência de GitHub, Supabase e Vercel.
> Não declarar GO sem gate completo executado no mesmo SHA candidato.

## Estado

**Lançamento público: NO-GO.**

HEAD de Git antes deste checkpoint documental:

- `1fce76be0484ed51025f4d876e9c30edd1b82479` — `docs: record subscription edge rollback snapshot`.

O drift de aplicação contra o schema vivo foi reduzido drasticamente. O último build que realmente chegou ao TypeScript mostrou apenas `orders-service` como bloqueador; esse serviço foi refeito depois. Ainda não existe prova de typecheck do HEAD atual porque a Vercel está rate-limited e o GitHub Actions cria jobs sem alocar runner.

Regra P0: **não recriar tabela/RPC aposentado, não mascarar drift com cast e não declarar PASS sem execução real.**

## Última prova que executou código

Vercel deployment:

- `dpl_H4tHgw7H3yNxdaJf5K4zmYS2Locd`;
- SHA `9bd5e703d8ad8ef2a778e41c24526b84a75ff017`;
- `npm run release:verify` chegou ao TypeScript;
- os únicos erros restantes nesse SHA eram do antigo `src/services/admin/orders/orders-service.ts`:
  - `OrderStatus[]` amplo demais para enums específicos;
  - RPC inexistente `search_unified_orders`;
  - tabela inexistente `quote_items`.

Nesse build não apareceram mais erros de email, production-notification, catálogo `is_catalog`, `Array.at` ou standalone status.

Depois dessa prova:

- `655ca2fb6f752f923f9de76239b1352f3e1c78db` — `orders-service` refeito sobre o schema vivo;
- `ed97107336ffcbc969eaaef547b7c7bff223597c` — teste contratual atualizado;
- `1cb59146f14bb77744c18f54aac15bdcb746df2f` — suporte `PromiseLike` nas contagens PostgREST.

## Aplicação ↔ schema — concluído no Git

### E-mail e produção

- `98cb15c843aacd98ef40417feae818b75b88053b` — browser `email-service` reduzido ao papel real de cliente de envio;
- `8d112d33c9a23e123d5a8af64abd70009dfc0d49` — notificações de produção passaram a usar contratos canônicos;
- não restaurar campos denormalizados antigos em `production_queue`.

### Compra avulsa administrativa

- `9bd5e703d8ad8ef2a778e41c24526b84a75ff017` — `standalone-purchase-service` reduzido aos RPCs administrativos vivos;
- removidos fluxos sem consumidor e o filtro broad `status?: string`.

### Pedidos unificados

- sem `search_unified_orders`;
- sem `quote_items`;
- busca admin local por nome/e-mail/ID/rastreio;
- status filtrados por domínio/tabela;
- profiles/collections hidratados em lote;
- `order_status_history.old_status` nullable tratado explicitamente;
- FKs relacionais do novo service confirmadas no banco vivo.

## Supabase canônico

Projeto: `pdytjhtjlxvbbeuxgnms` (`Ordax-2026-1`).

Snapshot desta sequência:

- `ACTIVE_HEALTHY`;
- PostgreSQL 17;
- tipos gerados em `src/integrations/supabase/types.ts` são o SSOT;
- Advisor de segurança ainda aponta **Leaked Password Protection Disabled**.

Regras permanentes:

- não editar `types.ts` manualmente;
- não criar `SupabaseClient<DatabaseFalso>`;
- não adicionar `as unknown as` para esconder drift;
- UI não é fronteira de autorização;
- DML admin permanece server-authoritative.

## Edge Function `get-my-subscriptions`

### Antes

A versão viva v5 consultava campos inexistentes em `subscription_deliveries`:

- `production_start_date`;
- `shipping_carrier`;
- `progress_photos`.

### Git / rollback

- código corrigido no Git: `d44893e3784fa6e57aacaf0c3c27da3e3acb95c4`;
- rollback exato da v5 e escopo do deploy: `supabase/functions/get-my-subscriptions/ROLLBACK.md`;
- commit do rollback: `1fce76be0484ed51025f4d876e9c30edd1b82479`.

### Deploy remoto executado

A Edge Function foi atualizada de forma controlada para:

- status: `ACTIVE`;
- versão: **6**;
- `verify_jwt=true` preservado;
- somente o entrypoint funcional mudou; módulos `_shared` usados no bundle foram os capturados da versão viva anterior;
- `ezbr_sha256`: `6c62d8c681a759c32790b2ef2c42e42245e0ca3674eac0396ef1b496cb2ed451`.

Pós-deploy verificado:

- `get_edge_function` retorna v6 ativa;
- entrypoint ativo corresponde ao código corrigido;
- todas as colunas selecionadas pela v6 foram confirmadas no schema vivo;
- FK `subscription_deliveries_collection_character_id_fkey` já havia sido confirmada.

Pendente:

- smoke autenticado com uma sessão real de usuário; as ferramentas atuais não fornecem uma sessão/token de cliente para invocar a função como usuário final.

## Shipping / tracking

- `subscription_deliveries` tem `tracking_code` e **não** tem `shipping_carrier`;
- `standalone_purchases` tem `tracking_code` e `shipping_carrier`;
- dashboard, detalhe admin, browser email e Edge v6 agora respeitam essa diferença.

## Backend ainda não ativado — bloqueadores reais

### 1. Pricing público da compra avulsa — release crítico

O frontend não chama mais o RPC fantasma, mas o backend vivo `create_standalone_purchase_atomic(...)` ainda depende de `public.get_collection_pricing(p_collection_id)`, inexistente no banco vivo.

Correção preparada:

- migration `supabase/migrations/20260917115000_restore_public_collection_pricing.sql`;
- commit `ac84309835e2fad49c394bc60330a5026d9f313f`;
- fronteira pública estreita;
- fallback para settings públicos validados;
- tier ativo quando houver assignment;
- custom pricing falha fechado;
- permissões explícitas e rollback documentado;
- **ainda não aplicada remotamente**.

### 2. Price category RPC

O banco vivo confirmou que `price_categories` não tem coluna `description`, enquanto a função `admin_upsert_price_category` viva ainda tenta INSERT/UPDATE dessa coluna.

Frontend/service:

- `6361fca93715073b60f3cec504424be03260e442` — payload não envia mais `p_description`;
- `191180a4fbce725c8f250c599272d04ab805fb6f` — qualquer descrição não vazia falha explicitamente, evitando perda silenciosa.

Migration preparada:

- `supabase/migrations/20260917134500_fix_admin_price_category_description_drift.sql`;
- commit `d681b676bb33e2119451311c8cff30162f4c0b31`;
- preserva a assinatura do RPC;
- rejeita descrição não vazia;
- grava somente colunas existentes;
- preserva execução para `service_role` e revoga `PUBLIC/anon/authenticated`;
- inclui rollback exato da função viva anterior;
- **ainda não aplicada remotamente**.

## Executor / CI — bloqueio atual

### Vercel

Após o build de `9bd5e70...`, o projeto Hobby atingiu o limite de deployments.

Status posterior:

- `Deployment rate limited — retry in 24 hours.`

Isso é bloqueio de executor, não nova evidência de erro de código.

### GitHub Actions

Run auditado:

- `35227809698`;
- SHA `1cb59146f14bb77744c18f54aac15bdcb746df2f`;
- quatro jobs criados;
- todos `failure` antes de qualquer step;
- `steps: []`;
- `runner_id: 0`.

Portanto esse run não executou checkout, `npm ci`, typecheck, testes, build nem audits. Tratar como falha de infraestrutura/alocação de runner; não usar como prova de código vermelho ou verde.

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
- [ ] executar typecheck do HEAD atual assim que houver executor útil.

### P0.2 — backend preparado, ainda não ativo

- [ ] aplicar de forma controlada a migration `20260917115000_restore_public_collection_pricing.sql`, com rollback provado;
- [ ] aplicar isoladamente a migration `20260917134500_fix_admin_price_category_description_drift.sql`, com verificação pós-change;
- [ ] smoke autenticado da Edge v6.

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

## Checkpoint desta rodada

**HEAD de entrada desta continuação:** `8d112d33c9a23e123d5a8af64abd70009dfc0d49`.

**HEAD de Git antes deste checkpoint documental:** `1fce76be0484ed51025f4d876e9c30edd1b82479`.

**Concluído:**

- `standalone-purchase-service` reduzido a contratos administrativos vivos (`9bd5e70...`);
- Vercel provou nesse SHA que somente o antigo `orders-service` ainda bloqueava TypeScript;
- `orders-service` refeito (`655ca2f...`) e teste contratual atualizado (`ed97107...`);
- ajuste PostgREST `PromiseLike` (`1cb5914...`);
- drift de categoria de preço fail-closed no frontend (`191180a...`) e migration de RPC staged (`d681b67...`);
- rollback da Edge v5 registrado (`1fce76b...`);
- `get-my-subscriptions` deployada e verificada como `ACTIVE` v6 com `verify_jwt=true`.

**Bloqueios:** nenhum typecheck executado após a reescrita de `orders-service`; migration de pricing público ainda não aplicada; migration do RPC de categoria ainda não aplicada; smoke autenticado da Edge pendente; proteção de senha vazada continua desligada.

**next_action:** executar a migration de pricing público em checkpoint isolado após revalidar settings/tier da coleção ativa e, em seguida, verificar função, privilégios e retorno real. Depois tratar a migration de price-category separadamente. Na primeira janela com executor útil, rodar typecheck e gate do HEAD corrente.

**do_not_repeat:** não restaurar `search_unified_orders`; não restaurar `quote_items`; não passar a união `OrderStatus` diretamente para enums específicos do PostgREST; não adicionar `shipping_carrier` a `subscription_deliveries`; não restaurar colunas denormalizadas em `production_queue`; não declarar typecheck PASS sem execução real.
