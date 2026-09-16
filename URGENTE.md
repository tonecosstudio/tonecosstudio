# URGENTE — OrdaX Launch Readiness

> SSOT operacional de `washingtonmsdj/ordax`.
> Atualizado em 2026-09-16 com evidência real de GitHub, Supabase e Vercel.
> Não declarar GO com base apenas em deploy `READY`, status de CI sem steps ou correção não validada no release candidate.

## Estado

**Lançamento público: NO-GO.**

Checkpoint técnico imediatamente anterior a esta atualização documental:

- `2d675cb53b6e4bd1821d9046fca291b40538f08b` — leitura de feriados tipada + data civil em `America/Bahia`;
- `700803ed05d1302f7183666db2bc1a2649964162` — sistema de créditos ligado ao schema Supabase gerado, sem `Database` paralelo;
- `7f55d8366d22190742de9efb42e1157b4102d667` — wishlist usando cliente/tipos canônicos;
- `dbbc94d10024aaf024a61a85983cbe03ff211c36` — remove migration antiga de delivery-choice que nunca havia sido aplicada;
- `f5bf57b474ad7f1b9676b80af5a4f8790bb10430` — versiona a reconciliação real de integridade de delivery-choice;
- `20affa159132435f9c9b1c6c08955f566b2a4509` — RPCs de escolha de entrega passam a usar tipos Supabase gerados;
- `701d2a6ba1ebc2fcf448a80c30569d859160fdf0` — remove chamadas browser a RPCs de capacidade service-role-only e alinha status de ciclo;
- `2d5ef144...` — grupos do membro reconstruídos com tabelas/RLS reais, sem `get_member_groups_optimized` fantasma.

O backend canônico está observável e o hardening avançou. Os bloqueadores restantes são principalmente **prova executada de build/test/audit no mesmo SHA**, **grafo npm vulnerável/lockfile**, **infra externa de CI/release**, configurações administrativas e smoke/rollback autenticados.

## Supabase canônico

Projeto: `pdytjhtjlxvbbeuxgnms`.

- estado remoto observado: `ACTIVE_HEALTHY`;
- migrations aplicadas e reconciliadas com os arquivos versionados recentes;
- Advisor de segurança: **1 warning restante — Leaked Password Protection Disabled**;
- nenhuma escrita `anon` indevida encontrada nas tabelas `public` auditadas;
- RLS permanece habilitado nas superfícies auditadas;
- não foi encontrado `SUPABASE_SERVICE_ROLE_KEY` hardcoded no frontend nem variante `VITE_SUPABASE_SERVICE_ROLE*`;
- `system_settings` não contém chaves com padrão de secret/token/password/private key/service role/API key;
- `bootstrap-admin`, embora use `verify_jwt=false` na plataforma, mantém autenticação própria, rate limit, `BOOTSTRAP_ADMIN_SECRET` e recusa bootstrap depois de existir admin;
- operações administrativas sensíveis permanecem atrás de `assert_admin_access()` ou da Edge autenticada equivalente.

### Tipos Supabase

**Concluído:** `src/integrations/supabase/types.ts` foi regenerado integralmente do projeto canônico e informa PostgREST **14.5**.

O gate `scripts/security/audit-supabase-types-ssot.mjs` verifica sinais do schema canônico, incluindo `purchase_modes`, campos atuais de `pricing_tiers`, `subscription_plans.pricing_tier_id`, enum de roles e RPC de snapshot de pricing.

Regra permanente:

- não editar parcialmente o arquivo gerado para esconder drift;
- não criar novos `SupabaseClient<DatabaseFalso>` / `supabase as unknown as ...Client` para contornar o schema;
- remover os clientes paralelos antigos caso a caso, validando primeiro a autorização real no PostgreSQL.

Já removidos/reconciliados nesta etapa:

- `cutoff-service.ts`;
- `base-pricing-service.ts`;
- `next-release-service.ts`;
- `group-service.ts`;
- `cycle-service.ts`;
- `delivery-cycle-mutations-service.ts`;
- `wishlist-service.ts`;
- schema paralelo de `subscription-credit-supabase.ts`;
- gateway falso de `holiday-service.ts`.

### RLS / autoridade

O ciclo anterior zerou no Advisor as categorias:

- `auth_rls_initplan`: **0**;
- `multiple_permissive_policies`: **0**.

Hardening relevante permanece válido:

- `20260916082005_close_remaining_admin_table_dml.sql` fecha DML direto de `chat_groups` e `monthly_production` para `authenticated`;
- DML administrativo permanece atrás de RPC/Edge server-authoritative;
- `reserve_capacity` e `release_capacity` são service-role-only e não são mais chamados pelo browser;
- `chat_groups` não possui mais leitura autenticada indiscriminada `USING (true)`.

### Grupos

Migration aplicada e versionada com o mesmo timestamp remoto:

- `20260916152937_restrict_chat_group_metadata_to_members_or_admins.sql`.

Agora `chat_groups` é legível somente por:

- membro real do grupo; ou
- administrador.

O RPC inexistente `get_member_groups_optimized` foi removido do frontend. `getMemberGroups()` deriva membership, última mensagem e unread count das tabelas reais protegidas por RLS; não lê perfil de terceiros apenas para montar nome de remetente que a UI nem exibe.

### Pagamentos manuais

Migration aplicada/versionada:

- `20260916143602_stop_dual_writing_manual_payment_info_requests.sql`.

Estado:

- `order_status_history` é o SSOT ativo da timeline;
- `payment_info_requests` permanece somente como tabela de compatibilidade inerte;
- no último diagnóstico tinha **0 linhas**;
- nenhuma função/procedure ativa continuava dependendo dela após a consolidação;
- regressão impede volta da dupla escrita.

### Pricing

- snapshot administrativo de pricing permanece server-authoritative;
- o RPC fantasma `update_base_price_with_history` foi removido;
- a tabela fantasma `pricing_history` não existe e a UI/serviço de histórico falso foram removidos;
- atualização singular de base price é feita pela Edge `admin-rpc` depois de autenticação admin e rate limit;
- a ação registra evento administrativo em `security_events` em vez de fingir um histórico inexistente.

Edge `admin-rpc`:

- **ACTIVE**;
- **versão 11**;
- **`verify_jwt=true`**;
- mapeamento de erros mantém validação como 400, recurso ausente como 404, acesso negado como 403 e não vaza erro interno.

### Delivery / ciclos

Migration aplicada e versionada:

- `20260916154052_reconcile_delivery_choice_integrity.sql`.

Ela corrige drift crítico entre Git e produção:

- escolha de personagem exige ownership/autenticação, ciclo permitido, coleção ativa e vínculo real personagem↔coleção da entrega;
- atualiza `character_id` e `collection_character_id` em conjunto;
- troca de coleção valida coleção explicitamente ativa e limpa referências de personagem quando a coleção muda;
- manutenção automática passa a ser fail-closed (`is_active IS TRUE`, status ativo) e também limpa escolhas obsoletas;
- as invariantes foram verificadas diretamente no PostgreSQL após a migration e ficaram cobertas por `src/test/delivery-choice-integrity.test.ts`.

O arquivo antigo `20260831051000_harden_delivery_choice_integrity.sql`, que estava versionado mas nunca aplicado em produção, foi removido para não manter histórico fictício/duplicado.

`cycle-service.ts` também foi alinhado:

- não chama `reserve_capacity` / `release_capacity` pelo browser;
- métodos mortos `incrementCapacity/decrementCapacity` removidos;
- status `cancelled` agora faz parte do domínio real;
- ciclos cancelados não entram em transição automática;
- normalização usa `Database` gerado, sem converter uma row arbitrária em `Cycle` via cast duplo.

### Catálogo / próximo lançamento

O RPC inexistente `get_next_release` foi removido. A leitura usa `collection_characters` + `collections` sob RLS e seleciona release futuro de coleção ativa, com regra de data em `America/Bahia`.

No snapshot de dados auditado em 2026-09-16, o próximo release futuro calculado foi **Panthro / ThunderCats / 2026-10-01**. Isso é dado operacional e pode mudar; não hardcodar esse resultado.

### Feriados / timezone

`holiday-service.ts` não usa mais gateway Supabase falsamente tipado. Feriados são tratados como **data civil em `America/Bahia`** e formatados com `yyyy-MM-dd`; não converter a data para Bahia e em seguida chamar `toISOString()` para produzir a chave do feriado.

## Storage

Último estado auditado:

- `group-attachments`, `payment-proofs`, `payment-vouchers` e `support-attachments`: privados, limite de 5 MB e MIME restrito;
- `models`: público para leitura; não foi encontrada policy comum de escrita de browser no bucket.

## Performance / índices

Último snapshot tratado:

- 27 FKs sem índice de cobertura, todos sem evidência de carga/referências que justifique mass-indexação;
- centenas de índices marcados `unused` no snapshot de estatísticas;
- zero avisos de init-plan RLS;
- zero avisos de múltiplas policies permissivas.

Regra: não criar/remover índices em massa apenas para zerar Advisor. Reavaliar com carga representativa e planos de execução.

## Vercel / produção web

Projeto: `ordax` (`prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`).

Último estado confirmado antes deste checkpoint:

- `https://ordax.com.br/` e `/login` respondiam 200;
- headers de segurança incluíam HSTS, CSP, `nosniff`, `DENY`, Referrer-Policy, Permissions-Policy e COOP/CORP;
- último deploy estável conhecido permanecia `READY` no commit `838224ae1599173f0c000ba7a5609afbe4f0f128`;
- isso **não é certificação de release**;
- novos builds estavam sendo bloqueados por build-rate-limit antes de executar o gate atual;
- `vercel.json` usa `npm ci` e `npm run release:verify`.

Não declarar build atual PASS enquanto o SHA atual não executar o gate completo.

## Dependências npm

Último audit real de produção executado:

- **15 vulnerabilidades de produção:** 1 low, 6 moderate, 7 high, 1 critical;
- árvore completa: 27 vulnerabilidades;
- famílias observadas incluem `@remix-run/router`, `brace-expansion`, `dompurify`, `fflate`, `lodash`, `nanoid`, `postcss`, `postcss-selector-parser`, `sharp`, `tar`, `ws`, `zod`;
- `@imgly/background-removal-node` é tooling de catálogo, mas continua no grafo de runtime em `dependencies` no último `package.json` auditado.

P0: retirar tooling do runtime quando aplicável e **regenerar `package-lock.json` com npm real**, depois repetir audit. Nunca editar lockfile manualmente nem reduzir o audit para fazê-lo passar.

## GitHub Actions

Runner permanece indisponível antes dos steps.

Última execução verificada neste checkpoint:

- run `35117585793` — `Quality Gate`;
- SHA `2d675cb53b6e4bd1821d9046fca291b40538f08b`;
- 4 jobs criados;
- todos retornaram `failure` em poucos segundos;
- **todos com `steps=[]`, `runner_id=0` e `runner_name=""`**.

Logo, nenhum typecheck/lint/test/coverage/build/audit executou nessa run. Isso é bloqueio de infraestrutura/conta do Actions, não evidência de falha do código e também não é PASS.

## Proteção da main

No checkpoint `2d675cb5...`:

- `protected: false`;
- sem required status checks;
- sem regra de proteção ativa observável.

O conector GitHub disponível não possui administração suficiente para habilitar branch protection.

## P0 — obrigatório antes do GO

- [x] Supabase canônico observável e saudável.
- [x] Reconciliar migrations recentes com timestamps reais aplicados.
- [x] Confirmar RLS e ausência de escrita `anon` indevida nas superfícies auditadas.
- [x] Fechar DML direto restante de tabelas admin-authoritative auditadas.
- [x] Zerar `auth_rls_initplan` e `multiple_permissive_policies` tratados no Advisor.
- [x] Auditar Storage sensível.
- [x] Regenerar integralmente `src/integrations/supabase/types.ts` para PostgREST 14.5.
- [x] Adicionar gate que detecta drift dos tipos gerados.
- [x] Consolidar pricing administrativo em fronteira server-authoritative.
- [x] Atualizar `admin-rpc` em produção para v11 com `verify_jwt=true`.
- [x] Consolidar timeline de pagamento manual em um SSOT ativo.
- [x] Fechar metadados de grupos a membro/admin e remover RPC fantasma de member-groups.
- [x] Reconciliar integridade server-side da escolha de coleção/personagem de entregas.
- [x] Remover chamadas browser para RPCs de capacidade service-role-only.
- [x] Começar remoção sistemática dos clientes Supabase paralelos que mascaravam drift.
- [ ] Concluir a remoção dos casts/clientes Supabase paralelos restantes que existam somente por legado de tipos.
- [ ] Obter `typecheck + lint + tests + coverage + build` executados com sucesso **no mesmo SHA de release**.
- [ ] Remediar o grafo npm e regenerar `package-lock.json` até `npm audit --omit=dev --audit-level=high` retornar PASS.
- [ ] Restaurar execução real do GitHub Actions com steps/runner.
- [ ] Obter execução completa de `npm run release:verify` em executor de release.
- [ ] Habilitar Leaked Password Protection no Supabase Auth.
- [ ] Proteger `main` com required checks compatíveis com o fluxo de release.
- [ ] Executar smoke autenticado de auth, catálogo, checkout, pagamentos/comprovantes, assinatura/créditos, produção/fotos, entregas/tracking, suporte/notificações e admin.
- [ ] Provar rollback do mesmo release candidate.

## Regras de segurança do release

- Não remover/reduzir `npm audit` para “fazer passar”.
- Não tratar Vercel `READY` como substituto do gate.
- Não declarar testes PASS enquanto Actions continuar sem steps/runner ou outro executor real não rodar o SHA atual.
- Não reabrir DML direto de browser para tabelas admin-authoritative.
- Não conceder a `authenticated` RPCs que devem permanecer service-role-only só para fazer o frontend funcionar.
- Não guardar segredo em `system_settings`, frontend, migration ou arquivo versionado.
- Não editar `types.ts` gerado manualmente para mascarar drift.
- Não recriar `SupabaseClient<DatabaseFalso>` ou clientes RPC falsos.
- Não manter migration antiga como “aplicada” quando ela não existe no histórico remoto; reconciliar forward-only e versionar o timestamp real.
- Não mass-indexar ou apagar índices sem evidência operacional e rollback.
- Não declarar GO enquanto qualquer P0 permanecer aberto.

## Próxima execução autorizada

1. continuar removendo clientes/casts Supabase paralelos, sempre comparando com schema/autorização real antes da alteração;
2. obter um executor capaz de rodar o gate e corrigir qualquer erro real remanescente de typecheck/lint/test/build;
3. regenerar o lockfile com as correções de dependências, removendo tooling do grafo de produção quando aplicável;
4. repetir `npm ci` + `npm run release:verify` até typecheck/test/build e audit high/critical passarem no mesmo SHA;
5. restaurar execução efetiva do GitHub Actions e tornar os checks obrigatórios na `main`;
6. habilitar leaked-password protection no Auth;
7. executar smoke autenticado completo e provar rollback;
8. somente então mudar o estado para GO.
