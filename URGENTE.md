# URGENTE — OrdaX Launch Readiness

> SSOT operacional de `washingtonmsdj/ordax`.
> Atualizado em 2026-09-16 a partir de evidência real de GitHub, Supabase e Vercel.
> Não declarar GO com base apenas em build/deploy isolado.

## Estado

**Lançamento público: NO-GO.**

HEAD técnico deste checkpoint:

- `08b744426bccc51ed04de4db34207e625701b619` — Vercel passa a chamar o gate reutilizável `npm run release:verify`.

O backend canônico está observável e o hardening de autoridade avançou, mas ainda existem bloqueadores P0 de dependências e infraestrutura de CI/deploy.

## Evidência confirmada

### Supabase

Projeto canônico: `pdytjhtjlxvbbeuxgnms`.

- estado remoto: `ACTIVE_HEALTHY`;
- migrations recentes aplicadas e observáveis;
- tabelas públicas/Storage auditadas com RLS habilitado;
- Advisor de segurança: 1 warning restante — **Leaked Password Protection Disabled**;
- nenhuma escrita `anon` encontrada em tabelas `public`;
- não foi encontrado `SUPABASE_SERVICE_ROLE_KEY` hardcoded no frontend nem variante `VITE_SUPABASE_SERVICE_ROLE*`;
- `system_settings` não contém chaves com padrão de secret/token/password/private key/service role/API key;
- Edge Function `admin-rpc` ativa com `verify_jwt=true`;
- `bootstrap-admin`, apesar de `verify_jwt=false` na plataforma, valida Bearer token, rate limit, `BOOTSTRAP_ADMIN_SECRET` e o RPC recusa bootstrap após existir admin;
- funções administrativas `SECURITY DEFINER` auditadas chamam `public.assert_admin_access()`, que aceita apenas `service_role` ou perfil com papel `admin`.

Storage:

- `group-attachments`, `payment-proofs`, `payment-vouchers` e `support-attachments` são privados, limitados a 5 MB e com MIME restrito;
- `models` é público para leitura; não há policy de escrita comum para esse bucket.

Hardening aplicado neste ciclo:

- migration `20260916082005_close_remaining_admin_table_dml.sql` aplicada em produção e versionada;
- `authenticated` perdeu `INSERT/UPDATE/DELETE` direto em `public.chat_groups`;
- `authenticated` perdeu `INSERT/UPDATE/DELETE` direto em `public.monthly_production`;
- ambas permanecem `SELECT` no browser; mutações administrativas seguem pelo gateway server-authoritative.

### Vercel / produção web

Projeto canônico: `ordax` (`prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`).

- `https://ordax.com.br/` responde 200;
- `/login` também responde 200 via rewrite SPA;
- produção entrega HSTS, CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, COOP/CORP e `Origin-Agent-Cluster`;
- domínio de produção está atualmente apontando para o deploy `dpl_7C3hzRYEJobe2ZaFGaTdCjDWj7w3`, commit `838224ae1599173f0c000ba7a5609afbe4f0f128`;
- esse deploy está `READY`, mas **não deve ser tratado como certificado de segurança**, pois usa o mesmo grafo de dependências vulnerável;
- `npm ci` foi confirmado no log, eliminando resolução não determinística por `npm install`;
- commits posteriores com gate de audit falharam antes de substituir produção, como desejado.

Audit de produção (`npm audit --omit=dev --audit-level=high`):

- **15 vulnerabilidades de produção:** 1 low, 6 moderate, 7 high e 1 critical;
- famílias observadas: `@remix-run/router`, `brace-expansion`, `dompurify`, `fflate`, `lodash`, `nanoid`, `postcss`, `postcss-selector-parser`, `sharp`, `tar`, `ws`, `zod`;
- o resumo de instalação completo (incluindo árvore de desenvolvimento) mostrou 27 vulnerabilidades: 3 low, 9 moderate, 12 high e 3 critical;
- `@imgly/background-removal-node` é usado apenas por `scripts/catalog/remove-background-worker.mjs`, mas está em `dependencies`; por isso suas dependências antigas entram no audit de produção. A correção correta é removê-lo do runtime/movê-lo para tooling com lockfile regenerado, não ignorar o audit.

Gate criado:

- `package.json` possui `release:verify`, que encadeia typecheck, lint, auditorias de autoridade, coverage, build e dependency audit;
- `vercel.json` usa `installCommand: npm ci` e `buildCommand: npm run release:verify`;
- a primeira tentativa com comando inline longo foi rejeitada pela configuração; o gate foi normalizado para script versionado;
- a tentativa atual não executou porque a conta Vercel retornou **Deployment rate limited — retry in 24 hours**. Não confundir esse status com falha do código.

### GitHub Actions

O Quality Gate continua falhando **antes dos steps** inclusive no HEAD atual.

Run `35074304995`:

- 4 jobs criados;
- `steps=null` em todos;
- sem logs de job; download de log retorna `BlobNotFound`;
- portanto nenhum comando de typecheck/lint/test/build/audit foi executado pelo runner.

A indisponibilidade é externa à definição do workflow e precisa ser resolvida na conta/Actions para obter prova canônica no mesmo SHA.

### Proteção da main

A branch `main` continua sem branch protection/required checks. O conector atual não possui permissão administrativa para habilitar isso.

## P0 — obrigatório antes do GO

- [x] Supabase canônico observável e saudável.
- [x] Reconciliar migrations recentes aplicadas.
- [x] Confirmar RLS nas tabelas auditadas e ausência de escrita `anon` em `public`.
- [x] Fechar DML direto restante de `chat_groups` e `monthly_production`.
- [x] Auditar funções administrativas `SECURITY DEFINER` críticas e `assert_admin_access()`.
- [x] Auditar buckets sensíveis e policies de Storage.
- [x] Tornar instalação do Vercel determinística com `npm ci`.
- [x] Criar gate reutilizável `release:verify` e impedir promoção silenciosa com audit high/critical.
- [ ] Remediar o grafo e regenerar `package-lock.json` até `npm audit --omit=dev --audit-level=high` retornar PASS.
- [ ] Corrigir a indisponibilidade do runner do GitHub Actions e obter Quality Gate com steps realmente executados.
- [ ] Executar `release:verify` completo quando o limite de build da Vercel permitir nova execução.
- [ ] Habilitar Leaked Password Protection no Supabase Auth.
- [ ] Proteger `main` com required checks/regras compatíveis com o fluxo de release.
- [ ] Executar smoke autenticado no backend canônico para auth, catálogo, checkout, pagamentos/comprovantes, assinatura/créditos, produção/fotos, entregas/tracking, suporte/notificações e admin.
- [ ] Provar rollback do mesmo release candidate.

## P1 — performance / dívida controlada

Advisor de performance observou:

- 43 foreign keys sem índice de cobertura;
- 89 policies com `auth.*`/`current_setting()` reavaliado por linha;
- 55 casos de múltiplas policies permissivas para o mesmo papel/ação;
- grande quantidade de índices ainda sem uso observado.

Não aplicar correção em massa sem medir queries e preservar a semântica de RLS. Priorizar tabelas de alto tráfego e migrations pequenas, reversíveis e verificadas.

## Regras de segurança do release

- Não remover ou reduzir o `npm audit` para “fazer o deploy passar”.
- Não tratar Vercel `READY` como substituto de audit/Quality Gate.
- Não declarar testes PASS enquanto GitHub Actions continuar sem steps/logs.
- Não voltar a conceder DML direto de browser para tabelas admin-authoritative.
- Não guardar segredo em `system_settings`, frontend, migration ou arquivo versionado.
- Não editar tipos Supabase gerados para esconder drift.
- Não otimizar RLS/indexes em massa sem evidência e rollback.
- Não declarar lançamento pronto enquanto qualquer item P0 permanecer aberto.

## Próxima execução autorizada

1. regenerar o lockfile com as correções de dependências, removendo `@imgly/background-removal-node` do grafo de produção quando possível;
2. repetir `npm ci` + `npm run release:verify` até zerar high/critical e obter PASS;
3. restaurar execução do GitHub Actions e exigir Quality Gate completo no mesmo SHA;
4. habilitar leaked-password protection e proteção da `main` nas configurações administrativas;
5. executar smoke autenticado e rollback;
6. somente então mudar o estado para GO.
