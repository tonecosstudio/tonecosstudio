# URGENTE — OrdaX Launch Readiness

> SSOT operacional de `washingtonmsdj/ordax`.
> Atualizado em 2026-09-17 com evidência real do GitHub, Supabase e Vercel.
> Não declarar GO com base apenas em deploy `READY`, status de CI sem steps ou correção não validada no mesmo release candidate.

## Estado

**Lançamento público: NO-GO.**

HEAD observado antes desta atualização documental:

- `8b552360882aff72ca362dcdc177a1d2fbf3106c` — `refactor: bind bonus pieces to generated Supabase schema`.

### Mudança material do diagnóstico em 2026-09-17

O bloqueador técnico primário deixou de ser apenas “obter um executor”. O deployment Vercel do HEAD `8b552360...` executou `npm run release:verify` e falhou no **TypeScript** antes das demais etapas.

A falha não é um falso positivo dos tipos gerados: consultas diretas ao projeto Supabase canônico confirmaram que vários contratos ainda referenciados pelo frontend/serviços **não existem no banco atual**.

Confirmados como ausentes no PostgreSQL canônico:

- RPCs `purchase_character_with_coins`, `purchase_collection_with_coins`, `validate_collection_limit` e `get_collection_pricing`;
- tabelas `collector_badges`, `user_badges`, `user_notification_settings` e `pricing_history`;
- colunas `subscription_deliveries.shipping_carrier`, `production_queue.customer_name` e `pricing_context_multipliers.chosen_collection_discount_percentage`.

Consequência: **P0 imediato = terminar a reconciliação aplicação ↔ schema canônico até `npm run typecheck` zerar sem casts/clientes falsos e sem recriar APIs aposentadas apenas para satisfazer o frontend.**

## Next action canônica

1. remover ou reescrever referências comprovadamente legadas/fantasmas, começando por código morto e fronteiras sem consumidor ativo;
2. corrigir contratos ativos para os tipos/tabelas/RPCs reais do Supabase;
3. repetir o typecheck no HEAD resultante;
4. somente depois avançar para lint, auditorias de autoridade, coverage, build e `npm audit` do mesmo SHA;
5. não iniciar feature nova nem refactor cosmético enquanto o gate estiver bloqueado por drift aplicação ↔ banco.

## Supabase canônico

Projeto: `pdytjhtjlxvbbeuxgnms` (`Ordax-2026-1`).

Estado observado em 2026-09-17:

- projeto `ACTIVE_HEALTHY`;
- PostgreSQL 17;
- **97 tabelas em `public`; 0 sem RLS habilitado**;
- Advisor de segurança: **1 warning — Leaked Password Protection Disabled**;
- `SECURITY DEFINER` auditado: 184 funções; **0 executáveis diretamente por `anon` e 0 por `authenticated`** no snapshot consultado;
- não foi encontrado `SUPABASE_SERVICE_ROLE_KEY` hardcoded no frontend nem variante `VITE_SUPABASE_SERVICE_ROLE*`;
- `system_settings` não contém chaves com padrão de secret/token/password/private key/service role/API key;
- operações administrativas sensíveis permanecem atrás de `assert_admin_access()` ou da Edge autenticada equivalente.

### Tipos Supabase

`src/integrations/supabase/types.ts` é o SSOT gerado do projeto canônico e informa PostgREST 14.5.

Regra permanente:

- não editar parcialmente `types.ts` para esconder drift;
- não criar `SupabaseClient<DatabaseFalso>` / `supabase as unknown as ...Client` para contornar o schema;
- não adicionar `as unknown as` apenas para fazer o typecheck passar;
- remover clientes/tipos paralelos caso a caso, validando primeiro schema e autorização reais.

Já reconciliados em rodadas anteriores/recentes:

- `cutoff-service.ts`;
- `base-pricing-service.ts`;
- `next-release-service.ts`;
- `group-service.ts`;
- `cycle-service.ts`;
- `delivery-cycle-mutations-service.ts`;
- `wishlist-service.ts`;
- schema paralelo de `subscription-credit-supabase.ts`;
- gateway falso de `holiday-service.ts`;
- `model_likes`;
- `bonus_pieces` no commit `8b552360...`.

### Drift ainda comprovado pelo typecheck

Famílias P0 abertas no HEAD `8b552360...`:

- **coins:** chamadas a RPCs de compra inexistentes;
- **collection limits:** `validate_collection_limit` inexistente;
- **pricing legado:** `get_collection_pricing`, `pricing_history` e campos antigos de contexto;
- **collector/gamification:** `collector_badges` e `user_badges` inexistentes;
- **notifications:** `user_notification_settings` inexistente e queries com colunas antigas;
- **delivery/dashboard/email:** referência a `shipping_carrier` inexistente em `subscription_deliveries`;
- **production notifications:** campos denormalizados antigos (`customer_id`, `customer_name` etc.) fora do row atual;
- **subscriptions/credits:** nullability/enums ainda divergentes do schema gerado;
- **support/groups:** tipos locais mais estritos que a nullability real de anexos/dados hidratados.

A correção deve distinguir:

- **código morto/legado sem consumidor** → remover;
- **feature ativa com contrato antigo** → reescrever contra o modelo real;
- **capacidade de produto realmente necessária mas ausente no banco** → documentar como decisão de produto/schema antes de qualquer migration; não inventar automaticamente.

## RLS / autoridade

Hardening já consolidado:

- `auth_rls_initplan`: 0 no ciclo tratado;
- `multiple_permissive_policies`: 0 no ciclo tratado;
- `20260916082005_close_remaining_admin_table_dml.sql` fecha DML direto de `chat_groups` e `monthly_production` para `authenticated`;
- DML administrativo permanece atrás de RPC/Edge server-authoritative;
- `reserve_capacity` e `release_capacity` são service-role-only e não são mais chamados pelo browser;
- `chat_groups` não possui leitura autenticada indiscriminada `USING (true)`.

## Grupos

Migration consolidada:

- `20260916152937_restrict_chat_group_metadata_to_members_or_admins.sql`.

`chat_groups` é legível somente por membro real ou administrador. O RPC inexistente `get_member_groups_optimized` foi removido do frontend e a leitura atual deriva dados das tabelas reais protegidas por RLS.

## Pagamentos manuais

Migration consolidada:

- `20260916143602_stop_dual_writing_manual_payment_info_requests.sql`.

Estado:

- `order_status_history` é o SSOT ativo da timeline;
- `payment_info_requests` permanece somente como compatibilidade inerte;
- regressão impede retorno da dupla escrita.

## Pricing

Arquitetura canônica:

- snapshot administrativo server-authoritative;
- `admin-rpc` ativo, versão 11, `verify_jwt=true`;
- atualização administrativa registra evento em `security_events`;
- `pricing_history` não existe no banco atual.

**Correção pendente:** ainda há referências de tipos/serviços a `pricing_history`, `get_collection_pricing` e campos antigos de `pricing_context_multipliers`. Esses caminhos devem ser removidos ou substituídos pela leitura canônica vigente; não recriar o modelo histórico fictício.

## Delivery / ciclos

Migration consolidada:

- `20260916154052_reconcile_delivery_choice_integrity.sql`.

Ela mantém validações server-side de ownership, ciclo, coleção ativa e vínculo personagem↔coleção, atualiza referências de forma coerente e deixa manutenção automática fail-closed.

`cycle-service.ts` já não chama `reserve_capacity` / `release_capacity` pelo browser e usa tipos gerados.

**Correção pendente:** serviços de dashboard/email ainda esperam `subscription_deliveries.shipping_carrier`, coluna ausente no schema atual. A origem real do transportador/tracking deve ser usada; não adicionar cast ou coluna fantasma no frontend.

## Catálogo

A documentação anterior dizia que o catálogo publicado estava vazio. Isso ficou **obsoleto**.

Snapshot real consultado em 2026-09-17:

- `models`: 478 rows;
- `public_catalog_models`: **367 rows visíveis pela view pública canônica**;
- `collections`: 1 coleção total e ativa;
- `collection_characters`: 8 rows;
- distribuição de `models.catalog_visibility`: 458 `general`, 12 `hidden`, 8 `both`.

A view `public_catalog_models` usa `security_invoker = true` e é a superfície pública usada pelo frontend.

Não hardcodar esses totais como regra de produto: são snapshot operacional e podem mudar.

## Storage

Último estado auditado:

- `group-attachments`, `payment-proofs`, `payment-vouchers` e `support-attachments`: privados, limite de 5 MB e MIME restrito;
- `models`: público para leitura; sem policy comum de escrita de browser encontrada no ciclo auditado.

## Performance / índices

Advisor de performance em 2026-09-17:

- 27 FKs sem índice de cobertura;
- 303 índices classificados como `unused` no snapshot de estatísticas.

Regra: não criar/remover índices em massa só para zerar Advisor. Exigir carga representativa, plano de execução e rollback.

## Vercel / produção web

Projeto: `ordax` (`prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`).

Estado confirmado em 2026-09-17:

- domínio de produção continua apontando para deployment `READY` do commit `838224ae1599173f0c000ba7a5609afbe4f0f128`;
- HEAD `8b552360...` gerou deployment `dpl_FWXyo8aPCgxrjv5wrdy91ZSuUWgp` em `ERROR`;
- esse deployment **executou** `npm run release:verify`;
- falhou no typecheck (`lint_or_type_error`, exit 2), antes de lint/auditorias/coverage/build/audit;
- `vercel.json` usa `npm ci` e `npm run release:verify`;
- headers configurados incluem HSTS, CSP, `nosniff`, `DENY`, Referrer-Policy, Permissions-Policy, COOP/CORP.

Não declarar o HEAD atual como build PASS.

## GitHub Actions

O workflow `.github/workflows/quality.yml` continua configurado para Node 24 e separa:

- typecheck/lint/format de arquivos alterados;
- unit coverage;
- production build + dependency audit;
- auditorias de autoridade.

Run do HEAD `8b552360...`:

- `35120933556` — `Quality Gate`;
- conclusão `failure`;
- quatro jobs (`Build, test and security`, `Unit coverage`, `Production build and dependency audit`, `Authority audits`) encerraram sem prova de steps executados no runner consultado.

Portanto GitHub Actions ainda não é evidência positiva do SHA atual. A Vercel, porém, forneceu evidência independente de falha real de TypeScript no mesmo HEAD.

## Proteção da main

Estado observado no HEAD `8b552360...`:

- `protected: false`;
- sem required status checks ativos.

Enquanto a decisão do usuário registrada em `AGENTS.md` vigorar, mudanças autorizadas são feitas diretamente na `main` em commits pequenos/reversíveis. Antes de cada escrita deve-se confirmar que o HEAD não avançou inesperadamente.

## Dependências npm

Último audit completo de produção registrado antes deste checkpoint:

- 15 vulnerabilidades de produção: 1 low, 6 moderate, 7 high, 1 critical;
- árvore completa: 27 vulnerabilidades.

O número **atual** não foi revalidado porque o `release:verify` do HEAD para no typecheck antes de chegar ao `npm audit`.

`package.json` ainda mantém tooling/Node no grafo de `dependencies`, incluindo `@imgly/background-removal-node`, `sharp`, `pg`, `stripe` e `winston`. Classificar uso real antes de mover/remover.

Regra: regenerar `package-lock.json` com npm real; nunca editar o lockfile manualmente nem reduzir o audit para fazê-lo passar.

## P0 — obrigatório antes do GO

- [x] Supabase canônico observável e saudável.
- [x] Confirmar RLS nas tabelas `public` auditadas.
- [x] Fechar DML direto restante das superfícies admin-authoritative tratadas.
- [x] Regenerar integralmente `src/integrations/supabase/types.ts`.
- [x] Adicionar auditoria de SSOT dos tipos gerados.
- [x] Consolidar pricing administrativo server-authoritative.
- [x] Consolidar timeline de pagamento manual.
- [x] Fechar metadados de grupos a membro/admin.
- [x] Reconciliar integridade server-side da escolha de entrega.
- [x] Remover chamadas browser para RPCs de capacidade service-role-only.
- [x] Começar remoção sistemática de clientes/tipos Supabase paralelos.
- [x] Confirmar que a Vercel executa o gate no HEAD e obter erro real reproduzível.
- [ ] **Zerar o typecheck reconciliando código ativo com o schema canônico.**
- [ ] Remover caminhos mortos que dependem de RPCs/tabelas/colunas comprovadamente inexistentes.
- [ ] Reescrever caminhos ativos ainda baseados em contratos antigos.
- [ ] Concluir a remoção de casts/clientes Supabase paralelos restantes.
- [ ] Obter `typecheck + lint + auditorias + tests + coverage + build` PASS no mesmo SHA.
- [ ] Remediar o grafo npm e obter `npm audit --omit=dev --audit-level=high` PASS no mesmo SHA.
- [ ] Restaurar execução útil do GitHub Actions e required checks compatíveis.
- [ ] Habilitar Leaked Password Protection no Supabase Auth.
- [ ] Executar smoke autenticado de auth, catálogo, checkout, pagamentos/comprovantes, assinatura/créditos, produção/fotos, entregas/tracking, suporte/notificações e admin.
- [ ] Provar rollback do mesmo release candidate.

## Ordem de implementação P0

### P0.1 — drift comprovadamente morto/legado

Prioridade inicial:

- remover chamadas de compra por coins que não têm RPC no schema atual quando não houver consumidor ativo;
- remover/aposentar hooks ligados exclusivamente a esses caminhos mortos;
- remover `validate_collection_limit` se o hook correspondente não tiver consumidor ativo ou substituí-lo pela regra canônica real se houver consumidor;
- remover `get_collection_pricing` legado se a UI ativa já tiver fonte canônica equivalente.

Critério: toda remoção deve ser precedida por busca de consumidores e feita em commit reversível.

### P0.2 — contratos ativos divergentes

Corrigir em seguida:

- `choice-service` nullability de personagem;
- `collector-service` baseado em tabelas inexistentes;
- `subscriber-dashboard-service` / `email-service` e origem real de shipping/tracking;
- notification services com tabelas/colunas aposentadas;
- subscription/credit enums e nullability;
- support attachment nullability;
- contextual pricing residual.

### P0.3 — gate completo

Depois de `npm run typecheck` PASS:

1. lint;
2. auditorias de autoridade;
3. test:coverage;
4. build;
5. npm audit high/critical;
6. format:check;
7. repetir tudo no mesmo SHA candidato.

## Regras de segurança do release

- Não remover/reduzir `npm audit` para “fazer passar”.
- Não desligar TypeScript strict nem relaxar `noImplicitAny` para esconder drift.
- Não editar tipos Supabase gerados manualmente.
- Não recriar tabelas/RPCs/colunas aposentadas apenas porque código legado ainda as chama.
- Não introduzir `as unknown as` como correção de contrato.
- Não tratar Vercel `READY` como substituto do gate.
- Não declarar testes PASS enquanto o SHA atual não tiver executor real.
- Não reabrir DML direto de browser para tabelas admin-authoritative.
- Não conceder a `authenticated` RPCs service-role-only só para fazer o frontend funcionar.
- Não guardar segredo em `system_settings`, frontend, migration ou arquivo versionado.
- Não executar migration remota, deploy ou reativação de serviço pago sem escopo explícito e prova de rollback.
- Não mass-indexar ou apagar índices sem evidência operacional.
- Não declarar GO enquanto qualquer P0 permanecer aberto.

## Histórico consolidado útil

Checkpoints anteriores continuam válidos como histórico, não como fotografia do HEAD:

- `838224ae1599173f0c000ba7a5609afbe4f0f128` — último deployment `READY` ainda associado ao domínio de produção no snapshot atual;
- `20260916082005_close_remaining_admin_table_dml.sql` — fechamento de DML admin restante tratado;
- `20260916143602_stop_dual_writing_manual_payment_info_requests.sql` — consolidação da timeline manual;
- `20260916152937_restrict_chat_group_metadata_to_members_or_admins.sql` — restrição de metadados de grupos;
- `20260916154052_reconcile_delivery_choice_integrity.sql` — integridade de escolha de entrega;
- `admin-rpc` permanece ativo em produção na versão 11 com `verify_jwt=true`;
- `generate-shipping-label` está ativo na versão 1 com `verify_jwt=true`.

## Checkpoint desta rodada

**HEAD de entrada:** `8b552360882aff72ca362dcdc177a1d2fbf3106c`.

**Concluído:**

- diagnóstico reconciliado com o deployment real da Vercel;
- ausência de RPCs/tabelas/colunas legadas confirmada diretamente no PostgreSQL;
- catálogo real reconciliado com a documentação;
- ordem P0 alterada para tratar primeiro o drift aplicação ↔ schema.

**Provas:**

- Vercel deployment do HEAD: `ERROR`, `release:verify` executado, falha TypeScript;
- Supabase: `ACTIVE_HEALTHY`, 97 tabelas `public`, 0 sem RLS no snapshot;
- catálogo: 367 rows na `public_catalog_models` no snapshot;
- branch `main`: não protegida no estado observado.

**Bloqueio principal:** typecheck do HEAD falha por múltiplos contratos legados comprovados.

**next_action:** executar P0.1 em commits pequenos e reversíveis, reconsultando o HEAD antes de cada escrita.

**do_not_repeat:** não voltar a atribuir o bloqueio atual apenas a rate limit/runner; há falha real de TypeScript comprovada na Vercel do HEAD `8b552360...`.
