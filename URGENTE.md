# URGENTE — OrdaX Launch Readiness

> SSOT operacional de `washingtonmsdj/ordax`.
> Atualizado em 2026-09-17 com evidência real de GitHub, Supabase e Vercel.
> Não declarar GO com base apenas em deploy `READY`, CI sem steps ou correção não validada no mesmo SHA.

## Estado

**Lançamento público: NO-GO.**

HEAD de código antes deste checkpoint documental:

- `4aba68e07bbfbb29a21eefcdb2246a2820aa77f1` — `build: add typed support for Array.at`.

O P0 deixou de ser um drift difuso e está concentrado em poucos blocos: `orders-service`, notificações/e-mail legados, filtro tipado de standalone purchase e dois ajustes backend que estão **versionados mas ainda não aplicados/deployados**.

Regra P0: corrigir o código para a realidade do banco. **Não recriar APIs aposentadas só para fazer o frontend compilar e não mascarar drift com casts.**

## Avanço consolidado da reconciliação

### Legado removido/aposentado

- RPCs inexistentes `purchase_character_with_coins` e `purchase_collection_with_coins`;
- `validate_collection_limit` + hook sem consumidor ativo;
- leituras antigas de `collector_badges` / `user_badges`;
- `user_notification_settings` aposentado;
- editor legado de pricing por `subscribed_chosen | subscribed_not_chosen | no_subscription`;
- `pricing_history` e RPCs antigos do contextual pricing;
- chamadas do frontend ao RPC inexistente `get_collection_pricing`.

### Contratos ativos já alinhados

- `choice-service`: nullability de `collection_characters` fail-closed;
- ledger de coins: filtro preso ao enum real do PostgreSQL;
- payment methods, subscription plans, subscription-credit, support e DTOs correlatos alinhados à nullability real;
- `character_choices.character_id` usa a relação canônica com `characters`;
- ciclos históricos tratam status `cancelled` e datas nulas explicitamente;
- catálogo admin normaliza `name`, `collection_id` e `is_catalog` sem deixar `null` escapar para contratos estritos;
- coin packages usam `coins_amount` / `bonus_coins`; contextual pricing usa `name/context_type`, não `user_context` fictício;
- `subscription_plans` usa `pricing_tier_id`;
- `production_queue` foi reconciliado com `production_stages + profiles`; estágio/atribuição não são mais lidos de colunas aposentadas da fila;
- workload, bulk operations, bloqueio/desbloqueio e snapshots de RPC de produção usam o estado canônico;
- `subscription_deliveries.shipping_carrier` foi retirado dos fluxos de dashboard e detalhe administrativo;
- TypeScript recebeu somente a lib de tipos `ES2022.Array`; o alvo de emissão continua `ES2020`.

## Supabase canônico

Projeto: `pdytjhtjlxvbbeuxgnms` (`Ordax-2026-1`).

Snapshot auditado em 2026-09-17:

- estado `ACTIVE_HEALTHY`;
- PostgreSQL 17;
- 97 tabelas em `public` e 0 sem RLS habilitado no snapshot;
- Advisor de segurança: 1 warning — **Leaked Password Protection Disabled**;
- tipos em `src/integrations/supabase/types.ts` continuam sendo o SSOT gerado.

Regras permanentes:

- não editar `types.ts` manualmente;
- não criar `SupabaseClient<DatabaseFalso>`;
- não adicionar `as unknown as` para silenciar drift;
- UI não é fronteira de autorização;
- DML admin permanece server-authoritative.

## Produção — estado atual

O banco vivo confirma a arquitetura:

- `production_queue`: pedido/usuário/coleção/personagem/status técnico/datas;
- `production_stages`: estágio, atribuição, bloqueio, duração e responsável;
- `profiles`: identidade do cliente/equipe.

A aplicação agora hidrata o DTO operacional a partir dessas fontes em vez de esperar `current_stage`, `assigned_to`, `customer_name`, `production_status` e outros campos denormalizados antigos na fila.

Pendente dentro do domínio de produção:

- `src/services/notifications/production-notification-service.ts` ainda contém queries antigas e é um dos últimos bloqueios de TypeScript.

## Shipping / tracking

`subscription_deliveries` possui `tracking_code`, mas **não possui `shipping_carrier`**.

`standalone_purchases` possui tanto `tracking_code` quanto `shipping_carrier`.

Já corrigido:

- dashboard do assinante usa `tracking_code` sem inventar carrier;
- detalhe administrativo da entrega não seleciona `shipping_carrier`; expõe `null` apenas como compatibilidade de apresentação para o helper de tracking;
- código versionado da Edge Function `get-my-subscriptions` não consulta mais `production_start_date`, `shipping_carrier` ou `progress_photos` inexistentes.

Bloqueio operacional:

- a Edge Function **viva** `get-my-subscriptions` continua na versão 5 e ainda possui as queries antigas;
- commit de correção: `d44893e3784fa6e57aacaf0c3c27da3e3acb95c4`;
- **não deployado remotamente nesta rodada**.

## Pricing público / compra avulsa

Frontend:

- `collection-pricing-service.ts` não chama mais `get_collection_pricing` inexistente;
- para coleção com `is_price_custom=false`, a tela usa somente os `system_settings` públicos oficiais;
- snapshot auditado: `default_price_full=150.00`, `default_price_pix=142.50`, `default_deposit_amount=30`;
- coleção com preço customizado falha fechado enquanto não houver fronteira pública canônica para esse caso.

Backend — bloqueio crítico:

- a função viva `create_standalone_purchase_atomic(...)` **ainda chama `public.get_collection_pricing(p_collection_id)`**;
- essa função de pricing não existe no banco vivo;
- portanto o backend de criação de compra avulsa continua **não operacional**.

Correção preparada, mas não aplicada:

- migration `supabase/migrations/20260917115000_restore_public_collection_pricing.sql`;
- commit `ac84309835e2fad49c394bc60330a5026d9f313f`;
- cria fronteira pública estreita `get_collection_pricing(uuid)` com fallback validado em `system_settings`, tier ativo quando houver assignment e fail-closed para custom pricing;
- revoga `PUBLIC`, concede apenas `anon/authenticated/service_role` e contém rollback explícito;
- **migration remota não executada**.

## Pricing contextual

`pricing_context_multipliers` hoje representa tamanho/complexidade/acabamento/urgência e possui `name`, `display_name`, `context_type`, `multiplier`, `is_active`, `description` e metadados.

Não existem `user_context` nem `chosen_collection_discount_percentage`.

Consequência: não restaurar a antiga semântica de “assinante escolheu/não escolheu coleção” sobre essa tabela.

Também foi descoberto que `price_categories` não possui coluna `description`, embora o RPC vivo `admin_upsert_price_category` ainda tente gravá-la. Esse drift backend deve ser tratado em migration própria, não com cast no frontend.

## Vercel / prova de build

Projeto: `ordax` (`prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`).

Última prova concluída usada neste checkpoint:

- `dpl_9uDRYSG3zkwYoUooFvEgokhD11Vo` — commit `d44893e...` — `ERROR` em `npm run release:verify` por TypeScript;
- o erro de catálogo `is_catalog` foi corrigido depois, em `d83b468...`;
- o erro de `Array.at` foi tratado depois, em `4aba68e...`;
- portanto a lista do deployment acima contém dois erros já corrigidos mas ainda sem nova prova concluída.

Famílias ainda comprovadamente pendentes no último typecheck:

1. `src/services/admin/orders/orders-service.ts`
   - filtros de status amplos demais para enums específicos;
   - RPC inexistente `search_unified_orders`;
   - tabela inexistente `quote_items`.
2. `src/services/notifications/email-service.ts`
   - referências antigas a `subscription_deliveries.shipping_carrier`.
3. `src/services/notifications/production-notification-service.ts`
   - referências a `customer_id/customer_name/current_stage/priority/...` no modelo antigo da fila.
4. `src/services/payments/standalone-purchase-service.ts`
   - filtro `status?: string` passado diretamente ao enum gerado.

## P0 — restante prioritário

### P0.1 — zerar TypeScript contra o schema real

- [x] coin purchase RPCs inexistentes;
- [x] collection limit aposentado;
- [x] badges / notification settings aposentados;
- [x] contextual pricing antigo aposentado;
- [x] production queue principal reconciliada com stages/profiles;
- [x] catálogo/ciclos/coins/pricing plan nullability alinhados nesta sequência;
- [x] frontend de pricing público sem RPC fantasma;
- [x] código de `get-my-subscriptions` alinhado no Git;
- [ ] simplificar/alinha `email-service.ts` ao papel real de cliente de envio;
- [ ] migrar `production-notification-service.ts` para dados canônicos;
- [ ] reconciliar `orders-service.ts` (`search_unified_orders`, `quote_items`, enums/status);
- [ ] tipar/validar filtro de status de `standalone-purchase-service.ts`.

### P0.2 — mudanças backend preparadas, ainda não ativadas

- [ ] revisar e aplicar de forma controlada a migration `20260917115000_restore_public_collection_pricing.sql`, com rollback testado;
- [ ] deploy controlado da Edge Function `get-my-subscriptions` corrigida;
- [ ] corrigir o RPC `admin_upsert_price_category` que referencia coluna `description` inexistente.

### P0.3 — gate completo no mesmo SHA

Depois de `npm run typecheck` PASS:

1. lint;
2. auditorias de autoridade;
3. `test:coverage`;
4. build;
5. `npm audit --omit=dev --audit-level=high`;
6. `format:check`;
7. repetir `release:verify` completo no SHA candidato.

### P0.4 — release operacional

- [ ] restaurar execução útil do GitHub Actions e required checks;
- [ ] habilitar Leaked Password Protection no Supabase Auth;
- [ ] smoke autenticado completo;
- [ ] rollback provado no mesmo release candidate.

## Regras de segurança do release

- não desligar TypeScript strict;
- não reintroduzir RPC/tabela/coluna aposentada;
- não usar casts para esconder drift;
- não reduzir/remover `npm audit`;
- não tratar Vercel `READY` isoladamente como GO;
- não expor tabela privada como atalho;
- não executar migration remota sem escopo explícito e rollback;
- não deployar Edge Function apenas para silenciar TypeScript;
- não declarar GO enquanto qualquer P0 permanecer aberto.

## Checkpoint desta continuação

**HEAD de entrada:** `ac84309835e2fad49c394bc60330a5026d9f313f`.

**HEAD de código antes deste checkpoint documental:** `4aba68e07bbfbb29a21eefcdb2246a2820aa77f1`.

**Concluído nesta continuação:**

- delivery detail alinhado ao schema real (`884b681...`);
- Edge `get-my-subscriptions` corrigida no Git (`d44893e...`), sem deploy remoto;
- `is_catalog` normalizado no catálogo (`d83b468...`);
- suporte de tipos de `Array.at` adicionado sem mudar target (`4aba68e...`);
- migration de fronteira pública de pricing permanece apenas versionada (`ac843098...`).

**Prova:** schema vivo do Supabase + código vivo da Edge Function + deployments Vercel parciais executando `release:verify`.

**Bloqueios:** typecheck ainda não verde; migration de pricing e Edge corrigida ainda não estão ativas no Supabase; orders/email/production-notification/standalone ainda têm drift comprovado.

**next_action:** simplificar `email-service` e `production-notification-service` para contratos canônicos, depois reconciliar `orders-service` e medir novamente no deployment mais novo.

**do_not_repeat:** não adicionar `shipping_carrier` a `subscription_deliveries`; não restaurar colunas denormalizadas em `production_queue`; não aplicar a migration de pricing nem deployar `get-my-subscriptions` sem checkpoint operacional/rollback; não declarar gate verde sem execução completa no mesmo SHA.
