# URGENTE — OrdaX Launch Readiness

> SSOT operacional de `washingtonmsdj/ordax`.
> Atualizado em 2026-09-16 a partir de evidência real de GitHub, Supabase e Vercel.
> Não declarar GO com base apenas em build/deploy isolado.

## Estado

**Lançamento público: NO-GO.**

Último commit técnico de hardening auditado antes deste checkpoint:

- `f6ab85390da131ecc3e763d8a586b54aa8464528` — bloqueia deploy quando `npm audit --omit=dev --audit-level=high` falha.

O produto está mais próximo de release e o backend canônico voltou a ser observável, mas ainda existem bloqueadores P0 externos e de dependências.

## Evidência confirmada em produção

### Supabase

Projeto canônico: `pdytjhtjlxvbbeuxgnms`.

- estado remoto: `ACTIVE_HEALTHY`;
- migrations recentes estão aplicadas e observáveis;
- tabelas públicas/Storage auditadas estão com RLS habilitado;
- Advisor de segurança ficou com 1 warning: **Leaked Password Protection Disabled**;
- não foi encontrado `SUPABASE_SERVICE_ROLE_KEY` hardcoded no frontend;
- Edge Functions estão observáveis; `admin-rpc` está ativo com `verify_jwt=true`;
- funções com `verify_jwt=false` precisam manter autenticação/segredo interno explícito; `bootstrap-admin` foi conferida e valida Bearer, rate limit e `BOOTSTRAP_ADMIN_SECRET` antes do RPC.

Hardening aplicado neste ciclo:

- migration `20260916082005_close_remaining_admin_table_dml.sql` aplicada em produção e versionada;
- `authenticated` perdeu `INSERT/UPDATE/DELETE` direto em `public.chat_groups`;
- `authenticated` perdeu `INSERT/UPDATE/DELETE` direto em `public.monthly_production`;
- ambas permanecem `SELECT` para o browser; mutações administrativas seguem pelo gateway server-authoritative.

### Vercel

Projeto canônico: `ordax` (`prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`).

- domínio de produção inclui `ordax.com.br` e `www.ordax.com.br`;
- deploy do commit de hardening de banco `d797c52e...` foi observado como `READY`;
- observabilidade consultada não mostrou runtime errors nas últimas 24h do checkpoint;
- `vercel.json` agora força `npm ci` para instalação determinística;
- `vercel.json` agora executa `npm audit --omit=dev --audit-level=high` antes de permitir o build/deploy.

O primeiro `npm ci` real no Vercel concluiu a instalação, mas confirmou **27 vulnerabilidades** no grafo: **3 low, 9 moderate, 12 high e 3 critical**. Isso é P0 e não pode ser ignorado para release.

### GitHub Actions

O Quality Gate continua falhando **antes dos steps**.

Evidência no run do commit `d797c52e...`:

- 4 jobs criados;
- todos com `steps=[]`;
- `runner_id=0` e sem `runner_name`;
- falha em poucos segundos.

Portanto ainda não existe execução canônica do CI para provar typecheck, lint, testes, coverage, authority audits, build e dependency audit no mesmo SHA. Não classificar isso como falha do código: o runner nem chegou a executar comandos.

### Proteção da main

A branch `main` está sem branch protection/required checks. Isso é bloqueador de processo de release até ser habilitado no GitHub.

## P0 — obrigatório antes do GO

- [x] Supabase canônico observável e saudável.
- [x] Reconciliar migrations recentes aplicadas.
- [x] Confirmar RLS habilitado nas tabelas auditadas.
- [x] Fechar DML direto restante de `chat_groups` e `monthly_production`.
- [x] Tornar instalação do Vercel determinística com `npm ci`.
- [x] Fazer deploy falhar em vulnerabilidade `high/critical` de produção.
- [ ] Remediar o grafo até `npm audit --omit=dev --audit-level=high` retornar PASS.
- [ ] Corrigir a indisponibilidade do runner do GitHub Actions e obter Quality Gate com steps realmente executados.
- [ ] Obter PASS no mesmo SHA para typecheck, lint, security/authority audits, unit/integration tests, coverage, build e format check.
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

Não aplicar correção em massa sem medir queries e preservar a semântica de RLS. Priorizar tabelas de alto tráfego e adicionar migrations pequenas, reversíveis e verificadas.

## Regras de segurança do release

- Não remover o novo gate de `npm audit` para “fazer o deploy passar”.
- Não tratar Vercel `READY` como substituto do Quality Gate.
- Não declarar testes PASS enquanto GitHub Actions continuar com `steps=[]`.
- Não voltar a conceder DML direto de browser para tabelas admin-authoritative.
- Não guardar segredo em `system_settings`, frontend, migration ou arquivo versionado.
- Não editar tipos Supabase gerados para esconder drift.
- Não otimizar RLS/indexes em massa sem evidência e rollback.
- Não declarar lançamento pronto enquanto qualquer item P0 permanecer aberto.

## Próxima execução

1. usar o gate de Vercel para obter a lista efetiva do `npm audit` e remediar dependências/lockfile;
2. repetir `npm ci` + audit até zerar high/critical;
3. resolver o bloqueio externo de runner do GitHub Actions e executar o Quality Gate completo;
4. habilitar leaked-password protection e proteção da `main` nas configurações administrativas;
5. executar smoke autenticado e rollback;
6. somente então mudar o estado para GO.
