# URGENTE — OrdaX Launch Readiness

> SSOT operacional de `washingtonmsdj/ordax`.
> Atualizado em 2026-09-16 a partir de evidência real de GitHub, Supabase e Vercel.
> Não declarar GO com base apenas em build/deploy isolado.

## Estado

**Lançamento público: NO-GO.**

Checkpoint de implementação imediatamente anterior a esta atualização documental:

- `17a1c43eea6c68737ff8697c4a8275c4c667b790` — teste de contrato do snapshot canônico de pricing.
- `edcec11f1e871ec6bacb5ac044cead78cfe30d0c` — leitura administrativa de tiers/planos migrada para snapshot server-authoritative.
- `ea5c45cf01bcd3e5f4dfe8f2f01098da128a25c9` — `admin-rpc` versionado com o novo RPC na allowlist.
- `afc7df253c9944c6fed3093948ceecf8d4543ad1` — correção de nulabilidade em `payment-service.ts`.

O backend canônico está observável e o hardening de autoridade/RLS avançou de forma substancial. Os bloqueadores atuais são principalmente: prova de build/test no SHA atual, drift integral dos tipos Supabase, grafo npm vulnerável, configurações administrativas externas e smoke/rollback de release.

## Evidência confirmada

### Supabase

Projeto canônico: `pdytjhtjlxvbbeuxgnms`.

- estado remoto: `ACTIVE_HEALTHY`;
- migrations recentes aplicadas e observáveis;
- tabelas públicas/Storage auditadas com RLS habilitado;
- Advisor de segurança: **1 warning restante — Leaked Password Protection Disabled**;
- nenhuma escrita `anon` encontrada em tabelas `public` nas auditorias realizadas;
- não foi encontrado `SUPABASE_SERVICE_ROLE_KEY` hardcoded no frontend nem variante `VITE_SUPABASE_SERVICE_ROLE*`;
- `system_settings` não contém chaves com padrão de secret/token/password/private key/service role/API key;
- Edge Function `admin-rpc` está **ACTIVE, versão 7, `verify_jwt=true`**;
- `bootstrap-admin`, apesar de `verify_jwt=false` na plataforma, valida Bearer token, rate limit, `BOOTSTRAP_ADMIN_SECRET` e o RPC recusa bootstrap após existir admin;
- funções administrativas `SECURITY DEFINER` críticas auditadas passam por `assert_admin_access()` ou por fronteira equivalente server-authoritative.

#### RLS / grants

Resultado atual do Advisor de performance para as categorias já tratadas:

- `auth_rls_initplan`: **0**;
- `multiple_permissive_policies`: **0**.

Ou seja, o ciclo reduziu os avisos originalmente observados de 89 init-plans e 55 sobreposições permissivas para zero, sem reabrir autoridade de browser.

Também foi corrigido drift funcional de leitura autenticada:

- `models`: `authenticated` voltou a ter somente `SELECT`, com RLS limitando catálogo público/admin;
- `payment_files`: `authenticated` voltou a ter somente `SELECT`, preservando policy de dono/admin;
- `subscription_payments`: `authenticated` voltou a ter somente `SELECT`, preservando policy de dono/admin;
- não restou tabela pública identificada com policy de leitura para `authenticated` sem o grant `SELECT` correspondente.

Hardening de escrita continua válido:

- migration `20260916082005_close_remaining_admin_table_dml.sql` fechou DML direto de `chat_groups` e `monthly_production` para `authenticated`;
- policy legada `quotes_insert_own` foi removida;
- DML administrativo segue pelas fronteiras server-authoritative/RPC já definidas.

#### Pricing server-authoritative

Migration aplicada e versionada:

- `20260916114459_admin_pricing_tier_snapshot_rpc.sql`.

Ela cria `public.admin_get_pricing_tiers_snapshot(uuid)`:

- exige `assert_admin_access()`;
- é `SECURITY DEFINER` com `search_path` explícito;
- não concede EXECUTE para `PUBLIC`, `anon` ou `authenticated`;
- concede EXECUTE apenas para `service_role`;
- entrega em um único contrato tiers, planos, modalidades, contadores de atribuição e assinaturas ativas.

O frontend administrativo deixou de montar esse agregado diretamente a partir de várias tabelas e agora chama o snapshot por `admin-rpc`. A Edge Function v7 já contém esse RPC na allowlist e permanece autenticando o administrador antes de usar o service role.

Há teste de contrato em `src/services/pricing/pricing-tier-read-service.test.ts`, cobrindo:

- uso de um único snapshot;
- filtro por tier;
- mapeamento de preço/modalidade/contadores;
- retorno `null` para tier ausente;
- comportamento fail-closed para payload inválido.

#### Tipos Supabase

O arquivo versionado `src/integrations/supabase/types.ts` está **sistemicamente desatualizado** em relação ao schema canônico.

Evidência:

- arquivo versionado ainda informa PostgREST `14.1`;
- geração atual do projeto canônico informa PostgREST `14.5`;
- o schema real contém `purchase_modes`, `pricing_tiers.price_brl`, `pricing_tiers.is_default`, `subscription_plans.pricing_tier_id` e várias relações/RPCs que o arquivo antigo não representa corretamente;
- existem serviços que criaram interfaces locais e usam `supabase as unknown as ...Client` para contornar esse drift, incluindo `purchase-modes-service.ts` e outros pontos.

**Regra:** não fazer patch manual parcial no arquivo gerado e não adicionar novos casts para esconder o drift. A correção é regenerar o arquivo completo a partir do Supabase canônico e depois remover, caso a caso, os clientes paralelos que existam somente por causa do tipo antigo.

### Storage

- `group-attachments`, `payment-proofs`, `payment-vouchers` e `support-attachments` são privados, limitados a 5 MB e com MIME restrito;
- `models` é público para leitura; não foi encontrada policy comum de escrita de browser nesse bucket.

### Performance / índices

Advisor atual:

- **27 foreign keys sem índice de cobertura**;
- **305 índices sem uso observado**;
- zero avisos de init-plan RLS;
- zero avisos de múltiplas policies permissivas.

Os 27 FKs restantes foram medidos diretamente:

- `catalog_import_items` tem 2.441 linhas, mas `duplicate_of_import_item_id` e `duplicate_of_model_id` têm **0 referências preenchidas**;
- os outros 25 FKs restantes estão em tabelas atualmente vazias e também têm **0 referências preenchidas**.

Portanto não criar 27 índices apenas para zerar o Advisor. Eles ficam como dívida condicionada a carga/uso real. Da mesma forma, não remover em massa os 305 índices marcados como `unused` sem janela representativa de tráfego e análise de plano de execução.

Os três relacionamentos de catálogo que já possuíam referências reais foram indexados anteriormente e reduziram o total de FKs sem cobertura de 30 para 27.

### Vercel / produção web

Projeto canônico: `ordax` (`prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`).

- `https://ordax.com.br/` responde 200;
- `/login` responde 200 via rewrite SPA;
- produção entrega HSTS, CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, COOP/CORP e `Origin-Agent-Cluster`;
- produção continua no deploy `dpl_7C3hzRYEJobe2ZaFGaTdCjDWj7w3`, commit `838224ae1599173f0c000ba7a5609afbe4f0f128`;
- esse deploy está `READY`, mas **não é release certificado**, pois usa o mesmo grafo de dependências vulnerável;
- `npm ci` foi confirmado em build real;
- `vercel.json` chama `npm run release:verify` como build gate.

#### Último build que realmente executou o gate

O último executor que chegou ao TypeScript reportou **8 erros**, todos concentrados em dois blocos:

1. `payment-service.ts`: 2 erros de `null` versus `undefined`;
2. `pricing-tier-read-service.ts`: 6 erros causados pelo `types.ts` antigo (`purchase_modes`, `pricing_tier_id`, `price_brl`).

Esses dois blocos foram corrigidos no código:

- pagamento: commit `afc7df25...`;
- pricing: commits `caff8142...`, `ea5c45cf...`, `edcec11f...` e teste `17a1c43e...`.

**Ainda não existe prova de typecheck/build PASS no SHA atual**, porque os commits novos recebem da Vercel o status de **build rate limit** antes de iniciar novo executor. Não converter isso em “PASS” nem em “falha de código”.

#### Dependências

Último audit de produção executado (`npm audit --omit=dev --audit-level=high`):

- **15 vulnerabilidades de produção:** 1 low, 6 moderate, 7 high e 1 critical;
- famílias observadas: `@remix-run/router`, `brace-expansion`, `dompurify`, `fflate`, `lodash`, `nanoid`, `postcss`, `postcss-selector-parser`, `sharp`, `tar`, `ws`, `zod`;
- árvore completa da instalação mostrou 27 vulnerabilidades: 3 low, 9 moderate, 12 high e 3 critical;
- `@imgly/background-removal-node` é usado apenas em tooling (`scripts/catalog/remove-background-worker.mjs`), mas está em `dependencies`, trazendo dependências antigas para o audit de produção.

A correção deve mover/remover tooling do grafo de runtime e **regenerar `package-lock.json` com npm real**. Não editar lockfile manualmente e não desabilitar/rebaixar o audit.

### GitHub Actions

O runner continua indisponível antes dos steps.

Run mais recente verificado:

- `35093627862` — `Quality Gate`, SHA `17a1c43eea6c68737ff8697c4a8275c4c667b790`;
- 4 jobs criados;
- todos concluídos como failure;
- `steps=null` nos quatro;
- `logs_url=null` nos jobs retornados;
- portanto nenhum typecheck/lint/test/build/audit chegou a executar.

Isso continua sendo bloqueio de infraestrutura/conta do GitHub Actions, não evidência de falha dos testes.

### Proteção da main

A branch `main` segue:

- `protected: false`;
- sem required status checks;
- sem regra de proteção ativa observável.

O conector GitHub atual não possui permissão administrativa para habilitar essa configuração.

## P0 — obrigatório antes do GO

- [x] Supabase canônico observável e saudável.
- [x] Reconciliar migrations recentes aplicadas.
- [x] Confirmar RLS nas tabelas auditadas e ausência de escrita `anon` indevida em `public`.
- [x] Fechar DML direto restante de tabelas admin-authoritative auditadas.
- [x] Auditar funções administrativas `SECURITY DEFINER` críticas e `assert_admin_access()`.
- [x] Auditar buckets sensíveis e policies de Storage.
- [x] Zerar `auth_rls_initplan` no Advisor.
- [x] Zerar `multiple_permissive_policies` no Advisor.
- [x] Corrigir drift de grants SELECT autenticados identificado em catálogo/pagamentos.
- [x] Centralizar agregado administrativo de pricing em snapshot server-authoritative.
- [x] Publicar `admin-rpc` v7 com `verify_jwt=true` e snapshot na allowlist.
- [x] Adicionar regressão de contrato para o snapshot de pricing.
- [x] Tornar instalação Vercel determinística com `npm ci`.
- [x] Criar `release:verify` com typecheck, lint, auditorias, coverage, build e dependency audit.
- [ ] Regenerar **integralmente** `src/integrations/supabase/types.ts` a partir do projeto canônico e remover casts/clientes paralelos que existam apenas para mascarar drift.
- [ ] Obter `typecheck + lint + tests + coverage + build` executados com sucesso no mesmo SHA de release.
- [ ] Remediar o grafo npm e regenerar `package-lock.json` até `npm audit --omit=dev --audit-level=high` retornar PASS.
- [ ] Corrigir a indisponibilidade do runner do GitHub Actions e obter Quality Gate com steps realmente executados.
- [ ] Obter execução completa de `release:verify` em executor de release sem build-rate-limit.
- [ ] Habilitar Leaked Password Protection no Supabase Auth.
- [ ] Proteger `main` com required checks/regras compatíveis com o fluxo de release.
- [ ] Executar smoke autenticado no backend canônico para auth, catálogo, checkout, pagamentos/comprovantes, assinatura/créditos, produção/fotos, entregas/tracking, suporte/notificações e admin.
- [ ] Provar rollback do mesmo release candidate.

## P1 — performance / dívida controlada

- 27 FKs sem índice, atualmente com **zero referências preenchidas**;
- 305 índices sem uso observado no snapshot atual de estatísticas;
- não mass-indexar nem mass-remover índices;
- reavaliar quando houver carga real/representativa e priorizar relações com cardinalidade, cascatas, joins ou planos de execução que demonstrem necessidade.

## Regras de segurança do release

- Não remover ou reduzir o `npm audit` para “fazer o deploy passar”.
- Não tratar Vercel `READY` como substituto de audit/Quality Gate.
- Não declarar testes PASS enquanto GitHub Actions continuar sem steps/logs ou Vercel não executar o SHA atual.
- Não voltar a conceder DML direto de browser para tabelas admin-authoritative.
- Não guardar segredo em `system_settings`, frontend, migration ou arquivo versionado.
- Não editar `types.ts` gerado parcialmente para esconder drift.
- Não criar novos clientes Supabase falsamente tipados apenas para contornar schema desatualizado.
- Não otimizar RLS/indexes em massa sem evidência e rollback.
- Não remover índices marcados `unused` sem janela de tráfego representativa.
- Não declarar lançamento pronto enquanto qualquer item P0 permanecer aberto.

## Próxima execução autorizada

1. regenerar integralmente os tipos Supabase do projeto canônico e reconciliar os clientes/casts criados apenas por drift;
2. obter um executor capaz de rodar o gate e corrigir qualquer erro real remanescente de typecheck/lint/test/build;
3. regenerar o lockfile com as correções de dependências, retirando tooling como `@imgly/background-removal-node` do grafo de produção quando aplicável;
4. repetir `npm ci` + `npm run release:verify` até typecheck/test/build e audit high/critical passarem no mesmo SHA;
5. restaurar execução efetiva do GitHub Actions e tornar seus checks obrigatórios na `main`;
6. habilitar leaked-password protection no Auth;
7. executar smoke autenticado completo e provar rollback;
8. somente então mudar o estado para GO.
