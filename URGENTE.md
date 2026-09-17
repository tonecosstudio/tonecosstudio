# URGENTE — OrdaX Launch Readiness

> SSOT operacional de `washingtonmsdj/ordax`.
> Atualizado em 2026-09-17 com evidência real de GitHub, Supabase e Vercel.
> Não declarar GO com base apenas em deploy `READY`, CI sem steps ou correção não validada no mesmo SHA.

## Estado

**Lançamento público: NO-GO.**

HEAD de código deste checkpoint:

- `44e11ed52e370c8b848faa7def20d4689a7e4f9a` — `fix: validate historical cycle status filters`.

O bloqueador técnico primário continua sendo a reconciliação **aplicação ↔ schema Supabase canônico**. A Vercel executa `npm run release:verify` e os últimos deployments validados ainda param no TypeScript. O HEAD acima ainda não possui deployment concluído; portanto não há prova de typecheck PASS.

Regra P0: corrigir o código para a realidade do banco. **Não recriar APIs aposentadas só para fazer o frontend compilar e não mascarar drift com casts.**

## Avanço consolidado da reconciliação

### Legado removido/aposentado

- compras por coins ligadas aos RPCs inexistentes `purchase_character_with_coins` e `purchase_collection_with_coins`;
- `validate_collection_limit` + hook sem consumidor ativo;
- leituras antigas de `collector_badges` / `user_badges`;
- `user_notification_settings` aposentado;
- editor legado de pricing por `subscribed_chosen | subscribed_not_chosen | no_subscription`;
- `pricing_history` e RPCs antigos `update_multiplier_with_history` / `update_chosen_discount_with_history`;
- preview e hooks do antigo contextual pricing que já não correspondem ao banco atual.

### Contratos ativos já alinhados

- `choice-service`: nullability de `collection_characters` fail-closed;
- ledger de coins: filtro preso ao enum real do PostgreSQL;
- payment methods: `is_active` / `is_default` nulos normalizados explicitamente;
- subscription dashboard: progresso com nullability real;
- collection types: `is_active` nulo normalizado;
- subscription plans / subscription-credit / support / notifications: diversos DTOs já alinhados ao schema em commits intermediários desta sequência;
- dashboard do assinante: `subscription_deliveries.shipping_carrier` removido; tracking usa `tracking_code`, com Correios como fallback canônico do helper existente;
- status de assinatura validado contra o enum gerado;
- categorias de preço do admin normalizadas no boundary do serviço;
- ciclos históricos: filtro de status validado contra enum real e cast duplo removido.

## Descoberta crítica — pricing contextual

Consulta direta ao PostgreSQL mostrou que `pricing_context_multipliers` hoje representa outro domínio:

- `size`: pequeno, médio, grande, extra grande;
- `complexity`: simples, média, alta, extrema;
- `finish`: padrão, premium, deluxe;
- `urgency`: normal, expressa, urgente.

As colunas vigentes são `name`, `display_name`, `context_type`, `multiplier`, `is_active`, `description` e metadados. Não existem `user_context` nem `chosen_collection_discount_percentage`.

Consequência aplicada:

- a UI antiga de “assinante escolheu/não escolheu coleção” foi retirada, em vez de ser artificialmente adaptada a uma tabela de outro domínio;
- `src/types/contextual-pricing.ts` agora referencia somente tabelas/campos gerados que realmente existem;
- nenhuma migration foi criada para ressuscitar o modelo antigo.

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

## Shipping / tracking

Verificação direta do schema:

`subscription_deliveries` possui `tracking_code`, mas **não possui `shipping_carrier`**.

`standalone_purchases` possui tanto `tracking_code` quanto `shipping_carrier`.

Já corrigido:

- dashboard do assinante não seleciona nem tipa `shipping_carrier` para entregas de assinatura;
- link de rastreio de assinatura usa apenas `tracking_code`; o helper existente assume Correios quando transportadora não é informada.

Pendente:

- `email-service.ts` ainda contém referência antiga a `subscription_deliveries.shipping_carrier` e deve ser alinhado da mesma forma, preservando `shipping_carrier` apenas onde ele realmente existe (standalone purchase).

## Catálogo

Snapshot operacional auditado:

- `models`: 478 rows;
- `public_catalog_models`: 367 rows;
- `collections`: 1 coleção ativa;
- `collection_characters`: 8 rows.

A view `public_catalog_models` usa `security_invoker = true` e continua sendo a superfície pública canônica.

## Pricing público da compra avulsa

O caminho `get_collection_pricing` continua ativo através de `BuyCharacter.tsx` / `useCollectionPricing`, mas o RPC não existe.

Investigação já feita:

- `pricing_tiers` é legível publicamente;
- `collection_tier_assignments` não concede SELECT a `anon`;
- a coleção ativa auditada não possuía tier assignment;
- não existe view/RPC público canônico equivalente encontrado até agora.

Consequência: não improvisar exposição de tabela privada nem inventar preço. Definir uma fronteira pública canônica antes de corrigir esse fluxo.

## Vercel / prova de build

Projeto: `ordax` (`prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`).

- produção continua associada ao último deployment `READY` conhecido do commit `838224ae1599173f0c000ba7a5609afbe4f0f128` no snapshot auditado;
- deployment `dpl_CeNJmnM9wDxy3LGV1TAkrjzTZuN9` do commit `8fcb670...` falhou no TypeScript e forneceu a lista usada nesta rodada;
- deployment `dpl_FYPkXiXS5xdHBKC2S7wpkxWbJn3m` do commit `c790ac31...` também terminou em `ERROR`, como esperado por ser um checkpoint parcial;
- commits posteriores ainda não apareceram com deployment concluído no último poll;
- não declarar typecheck PASS até um deployment do HEAD atual ou posterior concluir essa etapa.

## P0 — restante prioritário

### P0.1 — zerar TypeScript contra o schema real

- [x] retirar coin purchase RPCs inexistentes;
- [x] retirar collection limit aposentado;
- [x] retirar badges e notification settings aposentados;
- [x] retirar contextual pricing de assinante incompatível com o schema atual;
- [x] corrigir nullability de payment methods, subscriptions, support e categorias admin tratadas nesta sequência;
- [x] remover `shipping_carrier` do dashboard de assinatura;
- [x] validar filtros de ciclo contra enum real;
- [ ] alinhar `email-service.ts` a `subscription_deliveries` real;
- [ ] alinhar `admin-collections-service` a nullability real de `collection_characters`;
- [ ] alinhar `admin-coins-system-service` aos nomes atuais de coin packages e ao pricing vigente;
- [ ] reconciliar `production_queue` e serviços admin de produção sem recriar campos antigos;
- [ ] reconciliar orders (`search_unified_orders`, `quote_items`, enums/status) contra tabelas/RPCs reais;
- [ ] alinhar `standalone-purchase-service` e demais filtros string aos enums gerados;
- [ ] definir autoridade pública canônica para pricing de `BuyCharacter`.

### P0.2 — gate completo no mesmo SHA

Depois de `npm run typecheck` PASS:

1. lint;
2. auditorias de autoridade;
3. `test:coverage`;
4. build;
5. `npm audit --omit=dev --audit-level=high`;
6. `format:check`;
7. repetir `release:verify` completo no SHA candidato.

### P0.3 — release operacional

- [ ] restaurar execução útil do GitHub Actions e required checks;
- [ ] habilitar Leaked Password Protection no Supabase Auth;
- [ ] smoke autenticado completo;
- [ ] rollback provado no mesmo release candidate.

## Próximo bloco estrutural — produção

Antes de editar serviços de produção, consultar schema vivo de `production_queue` e tabelas relacionadas. Os erros atuais mostram código esperando campos antigos como `current_stage`, `assigned_to`, `production_status`, `production_notes`, `customer_name` e outros denormalizados.

Regra para esse bloco:

- campos removidos não serão recriados apenas para compilar;
- dados de cliente/coleção/personagem devem ser hidratados pela relação canônica quando necessários;
- status/estágio devem usar a fonte atualmente persistida;
- qualquer mudança de schema exige evidência de necessidade de produto, migration e rollback.

## Regras de segurança do release

- não desligar TypeScript strict;
- não reintroduzir RPC/tabela/coluna aposentada;
- não usar casts para esconder drift;
- não reduzir/remover `npm audit`;
- não tratar Vercel `READY` isoladamente como GO;
- não expor tabela privada como atalho;
- não executar migration remota sem escopo explícito e rollback;
- não declarar GO enquanto qualquer P0 permanecer aberto.

## Checkpoint desta rodada

**HEAD de entrada desta continuação:** `8fcb67041436674063bc04c1343ac5fa2e5311c1`.

**HEAD de código antes deste checkpoint documental:** `44e11ed52e370c8b848faa7def20d4689a7e4f9a`.

**Concluído nesta continuação:**

- normalização de payment methods e progresso de assinatura;
- normalização de collection types e categorias admin;
- aposentadoria completa do contextual pricing de assinante incompatível com o banco;
- remoção de `shipping_carrier` do fluxo de assinatura no dashboard;
- validação do enum de assinatura e ciclos históricos;
- live audit confirmou o significado real de `pricing_context_multipliers` e a ausência de carrier em `subscription_deliveries`.

**Prova:** consultas diretas ao Supabase + commits pequenos/reversíveis na `main` + deployments Vercel parciais usados como executor de typecheck.

**Bloqueios:** HEAD atual ainda sem deployment concluído; `production_queue`, orders, email tracking e pricing público ainda têm drift.

**next_action:** auditar schema vivo de produção, corrigir `email-service` e DTOs restantes, depois medir novamente o typecheck no deployment do SHA mais novo.

**do_not_repeat:** não restaurar contextual pricing de assinante sobre `pricing_context_multipliers`; não adicionar `shipping_carrier` a `subscription_deliveries`; não declarar gate verde sem execução completa no mesmo SHA.
