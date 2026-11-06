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
- Plano e gates: [docs/MIGRACAO_CATALOGO_MONOREPO.md](../../docs/MIGRACAO_CATALOGO_MONOREPO.md). M2 segue candidato inativo, M3/M4 tiveram validação local e CI offline anteriores; qualquer mudança posterior exige novo gate no SHA correspondente. M5/M6 só com aprovação específica.

A verificação `tools/test_worker_entry_integration.mjs` é teste **próprio do monorepo**, fora dos 46 arquivos de origem: compila entry.ts para borda via esbuild e verifica GET/HEAD/Range/POST com mocks e DB inacessível. Não requer Worker deploy. Para M5, consulte o snapshot de versão Cloudflare em `config/catalog-code-consolidation.json → productionObservation`; **não** é aprovação de cutover.

**Portão M5:** `npm run catalog:cutover:check` é uma verificação **somente leitura**, separada dos testes do Worker e sem opções de deploy. No estado atual devolve `BLOCKED` e exit 2 porque o workflow Washington ainda está ativo e a liberação não foi autorizada. Testes mock `node --test scripts/catalog/cutover-readiness.test.mjs` cobrem bloqueios e cenário completo simulado; o workflow `.github/workflows/quality.yml` os roda sem credenciais. Não ativar o destino por mera edição do manifesto; a confirmação exige metadados reais e GO específico. Histórico e passos: [plano M0–M6](../../docs/MIGRACAO_CATALOGO_MONOREPO.md).

## Fonte única de configuração do backend

- **Identidade GitHub e política de cutover:** `../../config/catalog-code-consolidation.json` (inclui `origin.apiDeployWorkflowId`). Não repetir IDs do workflow, repos nem account ID em scripts operacionais.
- **Recursos de runtime já existentes:** `wrangler.jsonc` declara nome do Worker, binding `DB` e seu database ID, bucket `MEDIA` e secret obrigatório. Não editar como forma de publicar ou migrar recursos; o portão de M5 apenas lê e compara.
- **Validação cruzada:** `../../scripts/architecture/catalog-monorepo.test.mjs` fixa autoridades aprovadas e hashes; `../../scripts/catalog/cutover-readiness.mjs` compara estado remoto somente leitura ao manifesto e Wrangler. O teste `cutover-readiness.test.mjs` cobre divergência, rollback ausente e runs pendentes; nenhum desses testes executa SQL ou deploy.
- **Legado removido:** launcher Telegram com caminho relativo inválido e instrução para PC auxiliar em `scripts/catalog/legacy/` (ambos preservados no histórico Git). Scripts editoriais restantes não são runtime nem foram apagados sem comprovação de desuso.

### Validação da origem antes da M5

O preflight `scripts/catalog/cutover-readiness.mjs --live` consulta **somente metadados GitHub** da origem (ID do repositório e `refs/heads/main`) além do workflow e seus estados não terminais. Para liberar o cutover, o SHA observado deve coincidir com os três pins do manifesto (`origin.observedMainSha`, `staging.sourceMain` e `productionObservation.observedSourceMainSha`). O patch de mídia R2 importado da PR de origem também precisa manter o mesmo número, HEAD e base, permanecer aberto/draft e pertencer ao repositório aprovado. Se a PR for alterada, mesclada, fechada ou substituída, a promoção bloqueia até reconciliar o código e o manifesto. Divergência, ausência da referência ou troca de identidade bloqueiam a operação. As consultas não acessam o D1 nem o R2; nenhum deploy ou migração é executado. A autorização explícita, a desativação comprovada do publicador antigo e o rollback continuam obrigatórios.

### Identidade do repositório de destino (M5)

Antes de permitir a transição, o preflight verifica **por GET do GitHub** o ID, o nome e a branch padrão `main` do repositório privado `tonecosstudio/tonecosstudio`, além dos identificadores da origem. Para essa consulta privada, forneça `GITHUB_TOKEN` ou `GH_TOKEN` **somente com acesso de leitura de metadados do repositório**. Token ausente, identidade divergente ou acesso negado resultam em `BLOCKED`, nunca em aprovação implícita. O token não é gravado no manifesto ou nos relatórios e não autoriza deploy; as verificações permanecem restritas a chamadas HTTP GET de metadados. Não há SQL D1, R2 ou mudança de produção.
