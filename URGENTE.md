# URGENTE — OrdaX Launch Readiness

> SSOT operacional de `washingtonmsdj/ordax`.
> Atualizado em 2026-09-17 com evidência de GitHub, Supabase e Vercel.
> Não declarar GO sem gate completo executado no mesmo SHA candidato.

## Estado

**Lançamento público: NO-GO.**

HEAD de Git antes deste checkpoint documental:

- `390ce523c38fc735dacce1a98e504468c1964ebe` — `docs: checkpoint edge v6 and staged backend fixes`.

O drift de aplicação contra o schema vivo foi reduzido drasticamente. O último build que realmente chegou ao TypeScript mostrou apenas o antigo `orders-service` como bloqueador; esse serviço foi refeito depois. Ainda não existe prova de typecheck do HEAD atual porque a Vercel está rate-limited e o GitHub Actions cria jobs sem alocar runner.

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

A versão viva v5 consultava campos inexistentes em `subscription_deliveries`: `production_start_date`, `shipping_carrier` e `progress_photos`.

Correção / rollback:

- código corrigido: `d44893e3784fa6e57aacaf0c3c27da3e3acb95c4`;
- rollback exato da v5: `supabase/functions/get-my-subscriptions/ROLLBACK.md`;
- commit do rollback: `1fce76be0484ed51025f4d876e9c30edd1b82479`.

Deploy remoto concluído e verificado:

- status: `ACTIVE`;
- versão: **6**;
- `verify_jwt=true` preservado;
- `ezbr_sha256`: `6c62d8c681a759c32790b2ef2c42e42245e0ca3674eac0396ef1b496cb2ed451`;
- entrypoint ativo corresponde ao Git corrigido;
- colunas e FK usadas pela v6 confirmadas no schema vivo.

Pendente:

- smoke autenticado com sessão real de usuário; as ferramentas atuais não fornecem sessão/token de cliente para invocar a função como usuário final.

## Pricing público da compra avulsa — ATIVADO

O backend vivo `create_standalone_purchase_atomic(...)` dependia de `public.get_collection_pricing(p_collection_id)`, função que não existia.

Migration versionada:

- `supabase/migrations/20260917115000_restore_public_collection_pricing.sql`;
- commit `ac84309835e2fad49c394bc60330a5026d9f313f`;
- rollback documentado no próprio arquivo.

Pré-change validado:

- coleção ativa: `ThunderCats` (`5f4b4fcf-4f96-425f-b535-d656d6e4ba5b`);
- `is_price_custom=false`;
- sem `collection_tier_assignments` ativo;
- defaults vivos:
  - `default_price_full = 150.00`;
  - `default_price_pix = 142.50`;
  - `default_deposit_amount = 30`.

Change remoto executado isoladamente em 2026-09-17.

Pós-change provado:

- `public.get_collection_pricing(uuid)` existe como `STABLE SECURITY DEFINER`;
- `search_path=public, pg_temp` fixo;
- `anon` e `authenticated` possuem somente `EXECUTE` na função;
- `anon` continua **sem SELECT** em `collection_tier_assignments`;
- execução sob `SET LOCAL ROLE anon` funciona;
- ThunderCats retorna:
  - `price_full = 150.00`;
  - `price_pix = 142.50`;
  - `deposit_amount = 30`;
  - `remaining_full = 120.00`;
  - `remaining_pix = 112.50`;
  - `pricing_source = default`.

Consequência: o bloqueio de resolução pública de preço usado pelo backend de compra avulsa foi removido. Não declarar o fluxo de compra inteiro verde sem smoke/transação real do fluxo autenticado.

## Price category RPC — ainda pendente no banco

O banco vivo confirmou que `price_categories` não tem coluna `description`, enquanto `admin_upsert_price_category` ainda tenta INSERT/UPDATE dessa coluna.

Frontend/service:

- `6361fca93715073b60f3cec504424be03260e442` — payload não envia mais `p_description`;
- `191180a4fbce725c8f250c599272d04ab805fb6f` — descrição não vazia falha explicitamente, evitando perda silenciosa.

Migration preparada:

- `supabase/migrations/20260917134500_fix_admin_price_category_description_drift.sql`;
- commit `d681b676bb33e2119451311c8cff30162f4c0b31`;
- preserva assinatura;
- rejeita descrição não vazia;
- grava somente colunas existentes;
- preserva `service_role` e revoga `PUBLIC/anon/authenticated`;
- contém rollback exato da função viva anterior;
- **ainda não aplicada remotamente**.

## Shipping / tracking

- `subscription_deliveries` tem `tracking_code` e **não** tem `shipping_carrier`;
- `standalone_purchases` tem `tracking_code` e `shipping_carrier`;
- dashboard, detalhe admin, browser email e Edge v6 respeitam essa diferença.

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

Esse run não executou checkout, `npm ci`, typecheck, testes, build nem audits. Tratar como falha de infraestrutura/alocação de runner; não usar como prova de código vermelho ou verde.

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
- [ ] executar typecheck do HEAD atual assim que houver executor útil.

### P0.2 — backend restante

- [ ] aplicar isoladamente `20260917134500_fix_admin_price_category_description_drift.sql` e verificar função/privilégios;
- [ ] smoke autenticado da Edge v6;
- [ ] smoke autenticado do fluxo de compra avulsa após a ativação do pricing.

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

**HEAD de Git antes deste checkpoint documental:** `390ce523c38fc735dacce1a98e504468c1964ebe`.

**Concluído nesta etapa:**

- Edge `get-my-subscriptions` v6 ativa e verificada;
- migration pública de pricing aplicada isoladamente;
- função pública testada como `anon` sem abrir tabela privada;
- retorno real de ThunderCats validado contra settings vivos.

**Bloqueios:** nenhum typecheck executado após a reescrita de `orders-service`; migration do RPC de categoria ainda não aplicada; smokes autenticados pendentes; proteção de senha vazada continua desligada.

**next_action:** aplicar isoladamente a migration de `admin_upsert_price_category`, verificar definição/privilégios e depois continuar auditoria estática enquanto os executores estão indisponíveis. Na primeira janela com executor útil, rodar typecheck e gate do HEAD corrente.

**do_not_repeat:** não restaurar `search_unified_orders`; não restaurar `quote_items`; não passar a união `OrderStatus` diretamente para enums específicos do PostgREST; não adicionar `shipping_carrier` a `subscription_deliveries`; não restaurar colunas denormalizadas em `production_queue`; não expor `collection_tier_assignments`; não declarar typecheck PASS sem execução real.
