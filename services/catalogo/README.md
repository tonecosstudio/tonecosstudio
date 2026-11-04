# Backend do catálogo — candidato inativo do monorepo

**STATUS: STAGED-OFFLINE. NÃO EXECUTAR WRANGLER DEPLOY NEM D1 MIGRATIONS.**

- Repositório canônico de destino: `tonecosstudio/tonecosstudio`. Código-fonte de origem: `washingtonmsdj/catalogo` (repo ID `1398242143`), main auditada `a4bf22bb8044a88f0c5d0b54b3e9d3fdead0b34c`.
- `worker/media.ts` e `tools/test_worker_media_contract.mjs` vieram da PR de origem **#266**, head `59983806acb7a338ae3b9c1ddfd524561ff8a02f`; ainda está draft/unmerged. Revalidar sempre antes do cutover.
- `worker/entry.ts` importa 8 módulos próprios alcançáveis. Os módulos `quoteAdminAccess`, `quoteAdminApi` e `quoteWorkflow` não fazem parte dessa closure e não foram importados nesta fase.
- `migrations/` são as **22 migrations existentes do D1 Cloudflare**; **não** executá-las contra produção nem confundi-las com `supabase/migrations/`.
- `wrangler.jsonc` é espelho local do serviço EXISTENTE `tonecos-catalogo-api`, binding `DB` para D1 `tonecos-catalogo`, `MEDIA` para R2 `tonecos-catalogo-media`. Seus CORS ainda contêm origens do frontend legado; não alterar/implantar sem plano de cutover.
- A autoridade atual de publicação remota permanece `washingtonmsdj/catalogo`; **nenhum deploy** foi criado no GitHub Tonecos, nem deve existir um segundo writer.
- `config/catalog-code-consolidation.json` contém os Git blob SHAs exatos dos 46 arquivos de origem copiados, incluindo o patch #266; `npm run catalog:monorepo:check` valida bytes e bloqueia mudança de publicador prematura.
- `npm run catalog:worker:test` valida a suite offline (node:assert + Node 24); `npm run catalog:worker:typecheck` executa TS typecheck local quando as dependências do monorepo estão instaladas. Não requer D1, R2 ou Cloudflare.
- **Não importar o frontend React antigo, imagens, blobs R2, dumps D1, ferramentas de deploy que fariam writes, ou segredos da origem.** Ferramentas necessárias à promoção devem ser reconciliadas sob M4 com CI restrito por path e autorização explícita.
- Plano e gates: [docs/MIGRACAO_CATALOGO_MONOREPO.md](../../docs/MIGRACAO_CATALOGO_MONOREPO.md). M2 é candidato inativo; M3/M4 passaram offline e no GitHub Actions; o novo teste de entrada em bundle requer CI; M5/M6 só com aprovação específica.

A verificação `tools/test_worker_entry_integration.mjs` é teste **próprio do monorepo**, fora dos 46 arquivos de origem: compila entry.ts para borda via esbuild e verifica GET/HEAD/Range/POST com mocks e DB inacessível. Não requer Worker deploy. Para M5, consulte o snapshot de versão Cloudflare em `config/catalog-code-consolidation.json → productionObservation`; **não** é aprovação de cutover.
