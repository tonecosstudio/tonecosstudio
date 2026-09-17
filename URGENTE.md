# URGENTE — OrdaX Launch Readiness

> SSOT operacional de `washingtonmsdj/ordax`.
> Atualizado em 2026-09-17 com evidência de GitHub, Supabase e Vercel.
> Não declarar GO sem gate completo executado no mesmo SHA candidato.

## Estado

**Lançamento público: NO-GO.**

HEAD de código antes deste checkpoint documental:

- `1cb59146f14bb77744c18f54aac15bdcb746df2f` — `fix: accept PostgREST promise-like count queries`.

O drift de TypeScript contra o schema vivo foi reduzido de dezenas de erros para um último bloco comprovado no build anterior (`orders-service`). Esse bloco foi reescrito depois da última execução que realmente chegou ao TypeScript, mas o HEAD atual ainda não possui prova de typecheck porque os dois executores remotos estão bloqueados por infraestrutura/limite.

Regra P0: corrigir a aplicação para o banco canônico. **Não recriar tabela/RPC aposentado, não mascarar drift com cast e não declarar PASS sem execução.**

## Última prova que executou código

Vercel deployment:

- `dpl_H4tHgw7H3yNxdaJf5K4zmYS2Locd`;
- SHA `9bd5e703d8ad8ef2a778e41c24526b84a75ff017`;
- `npm run release:verify` chegou ao TypeScript;
- os únicos erros restantes nesse SHA eram de `src/services/admin/orders/orders-service.ts`:
  - `OrderStatus[]` amplo demais para os enums das tabelas;
  - RPC inexistente `search_unified_orders`;
  - tabela inexistente `quote_items`.

Nesse build **não apareceram mais** erros de:

- `email-service.ts` / `subscription_deliveries.shipping_carrier`;
- `production-notification-service.ts` / campos denormalizados antigos;
- catálogo `is_catalog` nullable;
- `Array.at`;
- `standalone-purchase-service` com filtro de status string.

Depois dessa prova, `orders-service` foi substituído pelo contrato vivo em `655ca2fb6f752f923f9de76239b1352f3e1c78db` e recebeu o ajuste preventivo de `PromiseLike` em `1cb59146f14bb77744c18f54aac15bdcb746df2f`.

## Reconciliação de aplicação concluída no Git

### E-mail e notificações

- `98cb15c843aacd98ef40417feae818b75b88053b` — browser `email-service` reduzido ao papel de cliente de envio autorizado; queries antigas de domínio removidas;
- `sendProductionStarted` agora resolve compra avulsa, que é o único caller browser ativo desse helper;
- orquestrações legadas de e-mail permanecem apenas como superfície compatível fail-closed e devem viver em fluxo server-side;
- `8d112d33c9a23e123d5a8af64abd70009dfc0d49` — notificações de produção passaram a usar campos/relacionamentos canônicos.

### Compra avulsa administrativa

- `9bd5e703d8ad8ef2a778e41c24526b84a75ff017` — `standalone-purchase-service` reduzido aos contratos realmente consumidos;
- RPCs administrativos confirmados vivos antes da reescrita:
  - `admin_approve_standalone_payment_voucher`;
  - `admin_cancel_standalone_purchase`;
  - `admin_mark_standalone_production_complete`;
  - `admin_reject_standalone_payment_voucher`;
  - `admin_update_standalone_fulfillment_status`;
  - `admin_update_standalone_tracking_code`;
- removidas rotinas sem consumidor que carregavam o filtro `status?: string` e casts antigos.

### Pedidos unificados

- `655ca2fb6f752f923f9de76239b1352f3e1c78db` — `orders-service` refeito sobre o schema vivo;
- `ed97107336ffcbc969eaaef547b7c7bff223597c` — teste contratual atualizado para a nova autoridade;
- `1cb59146f14bb77744c18f54aac15bdcb746df2f` — queries PostgREST de contagem aceitas como `PromiseLike`.

Decisões canônicas:

- **não chamar** `search_unified_orders`: o RPC não existe; busca admin é local sobre os resultados hidratados;
- **não consultar** `quote_items`: a tabela não existe; quotes expõem `items: []` até existir uma fonte canônica real;
- `subscription_deliveries` e `standalone_purchases` filtram somente seus status suportados dentro de `purchase_status`;
- `manual_payments` filtra somente seu subconjunto de `payment_status`;
- `quotes.status` continua text e passa pelo conjunto de statuses da UI;
- profiles/collections são hidratados por lookups batched;
- `order_status_history.old_status` nullable é tratado explicitamente.

## Supabase canônico

Projeto: `pdytjhtjlxvbbeuxgnms` (`Ordax-2026-1`).

Snapshot auditado nesta sequência:

- estado `ACTIVE_HEALTHY`;
- PostgreSQL 17;
- 97 tabelas em `public` e 0 sem RLS habilitado no snapshot anterior;
- tipos gerados em `src/integrations/supabase/types.ts` são o SSOT;
- Advisor de segurança ainda aponta **Leaked Password Protection Disabled**.

Regras permanentes:

- não editar `types.ts` manualmente;
- não criar `SupabaseClient<DatabaseFalso>`;
- não adicionar `as unknown as` para silenciar drift;
- UI não é fronteira de autorização;
- DML admin permanece server-authoritative.

## Backend ainda não ativado — bloqueadores reais

### 1. Pricing público da compra avulsa

O frontend não chama mais o RPC fantasma, mas o backend vivo `create_standalone_purchase_atomic(...)` ainda depende de `public.get_collection_pricing(p_collection_id)`, que não existe no banco vivo.

Correção preparada:

- migration `supabase/migrations/20260917115000_restore_public_collection_pricing.sql`;
- commit `ac84309835e2fad49c394bc60330a5026d9f313f`;
- fronteira pública estreita, permissões explícitas e rollback incluído;
- **não aplicada remotamente**.

Não aplicar até existir checkpoint explícito de migration + rollback.

### 2. `get-my-subscriptions`

O código no Git foi alinhado ao schema em:

- `d44893e3784fa6e57aacaf0c3c27da3e3acb95c4`.

Porém a Edge Function viva continua na versão antiga auditada e ainda referencia campos aposentados como `production_start_date`, `shipping_carrier` e `progress_photos`.

- **deploy remoto ainda não executado**.

### 3. Price category RPC

`price_categories` não possui coluna `description`, mas o RPC vivo `admin_upsert_price_category` ainda tenta gravá-la.

- tratar em checkpoint backend separado;
- não adicionar coluna/RPC improvisado apenas para compilar.

## Shipping / tracking

- `subscription_deliveries` tem `tracking_code` e **não** tem `shipping_carrier`;
- `standalone_purchases` tem `tracking_code` e `shipping_carrier`;
- dashboard, detalhe admin, browser email e código versionado de `get-my-subscriptions` já foram alinhados a essa realidade.

## Produção

A aplicação foi reconciliada com:

- `production_queue` para identidade/ligação do item;
- `production_stages` para estágio, atribuição e bloqueio;
- `profiles`, `collections` e personagens para hidratação.

Não restaurar `customer_name`, `current_stage`, `assigned_to` e demais campos denormalizados antigos na fila.

## Executor / CI — bloqueio atual

### Vercel

Após o build de `9bd5e70...`, o projeto Hobby atingiu o limite de deployments.

O status do HEAD posterior informa:

- **`Deployment rate limited — retry in 24 hours.`**

Isso é bloqueio de execução, não nova evidência de falha de código.

### GitHub Actions

O workflow `.github/workflows/quality.yml` continua correto e dispara em `push` para `main`.

Run atual:

- `35227809698`;
- SHA `1cb59146f14bb77744c18f54aac15bdcb746df2f`;
- quatro jobs criados;
- todos terminaram `failure` antes de qualquer step;
- `steps: []` e `runner_id: 0` em todos os jobs.

Portanto esse run **não executou** checkout, `npm ci`, typecheck, testes, build nem audits. Tratar como falha de infraestrutura/alocação de runner até haver evidência mais específica; não usar como prova de código vermelho ou verde.

## P0 — estado atual

### P0.1 — aplicação ↔ schema

- [x] coin purchase RPCs inexistentes removidos;
- [x] collection limit aposentado removido;
- [x] badges / notification settings aposentados;
- [x] contextual pricing antigo aposentado;
- [x] production queue principal reconciliada;
- [x] email browser reconciliado;
- [x] production notifications reconciliadas;
- [x] standalone admin service reduzido aos RPCs vivos;
- [x] `orders-service` sem `search_unified_orders`, sem `quote_items` e com status por domínio;
- [ ] **executar typecheck do HEAD atual** assim que houver executor disponível e corrigir qualquer novo erro revelado.

### P0.2 — backend preparado, ainda não ativo

- [ ] aplicar de forma controlada a migration `20260917115000_restore_public_collection_pricing.sql`, com rollback provado;
- [ ] deploy controlado da Edge Function `get-my-subscriptions` corrigida;
- [ ] corrigir `admin_upsert_price_category` vs coluna `description` inexistente.

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
- [ ] rollback provado no mesmo release candidate;
- [ ] definir required checks/proteção de `main` depois que os checks forem confiáveis.

## Regras de segurança do release

- não desligar TypeScript strict;
- não reintroduzir RPC/tabela/coluna aposentada;
- não usar casts para esconder drift;
- não reduzir/remover `npm audit`;
- não tratar Vercel `READY` isoladamente como GO;
- não tratar Vercel rate-limit ou Actions sem runner como erro de aplicação;
- não expor tabela privada como atalho;
- não executar migration remota sem escopo explícito e rollback;
- não deployar Edge Function apenas para silenciar TypeScript;
- não declarar GO enquanto qualquer P0 permanecer aberto.

## Checkpoint desta rodada

**HEAD de entrada desta continuação:** `8d112d33c9a23e123d5a8af64abd70009dfc0d49`.

**HEAD de código antes deste checkpoint documental:** `1cb59146f14bb77744c18f54aac15bdcb746df2f`.

**Concluído:**

- `standalone-purchase-service` reduzido a contratos administrativos vivos (`9bd5e70...`);
- Vercel provou nesse SHA que somente `orders-service` continuava bloqueando TypeScript;
- `orders-service` refeito contra o schema atual (`655ca2f...`);
- teste contratual atualizado para busca local e ausência do RPC aposentado (`ed97107...`);
- correção preventiva de `PromiseLike` aplicada (`1cb5914...`);
- diagnóstico de executor: Vercel rate-limited; GitHub Actions cria jobs, mas não aloca runner nem executa steps.

**Bloqueios:** nenhum typecheck executado após a reescrita de `orders-service`; pricing migration e Edge corrigida ainda não estão ativas; price-category RPC ainda tem drift; proteção de senha vazada continua desligada.

**next_action:** continuar auditoria estática do HEAD enquanto os executores estão indisponíveis; na primeira execução útil, rodar typecheck do SHA corrente, corrigir somente erros reais revelados e então avançar pelo gate completo. Em paralelo, preparar checkpoints separados de rollback para pricing migration e `get-my-subscriptions` sem aplicá-los por impulso.

**do_not_repeat:** não restaurar `search_unified_orders`; não restaurar `quote_items`; não passar a união `OrderStatus` diretamente para enums específicos do PostgREST; não adicionar `shipping_carrier` a `subscription_deliveries`; não restaurar colunas denormalizadas em `production_queue`; não declarar typecheck PASS sem execução real.
