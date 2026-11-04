# MIGRAÇÃO DO CATÁLOGO — REPOSITÓRIO ÚNICO TONECOS

> **Documento canônico de execução e checkpoint.** Decisão do proprietário: o código do frontend e da API ficará exclusivamente no repositório tonecosstudio/tonecosstudio. NÃO criar tonecosstudio/catalogo, fork nem monorepo paralelo. Atualizado em 04/11/2026. **Plano aprovado; migração/cutover de produção ainda NÃO foram executados.**

## 1. Objetivo e fonte da verdade

- GitHub destino: **tonecosstudio/tonecosstudio**, ID **1163825583**; manter a única branch de integração **integration/tonecosstudio-canonical-20261101** e **PR draft #4**, sem branch ou PR nova.
- Origem temporária do Worker: **washingtonmsdj/catalogo**, ID **1398242143**, main observada **a4bf22bb8044a88f0c5d0b54b3e9d3fdead0b34c** em 04/11/2026. O SHA é **evidência histórica, nunca um pin vivo de deploy**. Na inspeção havia 3 PRs abertas (#266 correção de mídia R2; #264 e #263 dependências). Não importar código ignorando essas alterações.
- O frontend antigo no catálogo Washington serve hoje **acheguese.com.br/tonecosstudios/** e **washingtonmsdj.github.io/catalogo/**; ambos tiveram HEAD 200, mas isso não prova conteúdo funcional. O HTML público novo da Tonecos será **um único frontend** no Cloudflare Pages. Não copiar React, CSS, design system, assets gerados ou telas da origem.
- Infraestrutura EXISTENTE e definitiva: Cloudflare **conta Tonecos** (ID **8827c547d6def5ee5b9ca550fdd5680a**), Pages **tonecosstudio**, Worker **tonecos-catalogo-api**, D1 **tonecos-catalogo**, R2 **tonecos-catalogo-media**; Pages Function **functions/catalogo-api/[[path]].js** consome **CATALOG_WORKER**. NÃO criar banco, bucket, Worker, endpoint, canal ou segundo writer.
- **SSOT de execução:** este plano + **config/catalog-code-consolidation.json** (inventário de blob SHA, estado e ownership) + **scripts/architecture/catalog-monorepo.test.mjs** (guard local sem rede). O código e o estado remoto verificados têm precedência sobre SHAs e contadores datados. O **URGENTE.md** é somente o checkpoint breve; não replicar planos concorrentes.

## 2. Estrutura final — uma repo, pipelines separados

    tonecosstudio/tonecosstudio/
    ├── src/                    # Site e componentes públicos existentes
    ├── functions/catalogo-api/ # Proxy GET allowlisted da Pages; não acessa D1/R2 diretamente
    ├── services/catalogo/      # FUTURO dono do código Worker, SQL D1, testes e tooling estritamente necessário
    │   ├── worker/             # API e gateway /media do backend (após gate de importação)
    │   ├── migrations/         # EXCLUSIVAMENTE migrações do banco D1 já existente
    │   ├── config/             # Contratos de schema e Wrangler do Worker existente
    │   ├── tools/              # Apenas utilitários backend comprovadamente necessários
    │   └── README.md          # Operação, ownership, rollback e contrato de deploy
    ├── supabase/               # Módulos comerciais FUTUROS, NÃO confundir com D1
    ├── scripts/catalog/        # Ferramentas legadas: classificar antes de promover à autoridade
    ├── config/catalog-code-consolidation.json
    ├── docs/MIGRACAO_CATALOGO_MONOREPO.md
    └── URGENTE.md

**Pipelines devem ser independentes por impacto.** Mudanças em site/estilos jamais promovem Worker ou rodam SQL. Mudanças no Worker não exigem reconstruir Pages se o contrato não mudou. Migrações SQL apenas com mudança de esquema, orçamento D1 medido SEM consulta SQL prévia, e rollback/migration-first apropriados. A integração de código não autoriza deployment.

## 3. Etapas de execução — marcar SOMENTE com evidência

### M0 — Decisão, proteção, inventário e continuidade (EM EXECUÇÃO)

- [x] Decisão do proprietário: **um repositório**, sem repo tonecosstudio/catalogo e sem duplicar interfaces.
- [x] Duas contas e IDs GitHub confirmados; repositório destino privado, origem público; Cloudflare com Worker, D1, R2 e binding já existentes.
- [x] Árvore de origem lida **uma vez**: 652 blobs, incluindo **12 arquivos worker, 22 migrations, 211 tools, 26 config, 68 src e 280 docs**. Esses conjuntos não têm a mesma autoridade: não migrar 652 arquivos cegamente.
- [x] PRs de origem #266, #264 e #263 identificadas; prioridade para **#266**, que corrige imagem R2. A homologação final dessa mudança é pendência real.
- [x] Checkpoint e inventário de blobs SHA gravados na **branch/PR #4**, sem acionamento de Cloudflare.
- [x] **Guard executado no Windows físico isolado**: Node.js **v24.22.2**, comando `node --test scripts/architecture/catalog-monorepo.test.mjs`, **5 testes / 5 PASS / 0 FAIL**, exit **0**, arquivos provenientes do SHA `d2cffee1fb94b0540b7e362d163200404a929bbe`. Ambiente temporário, sem deploy, D1, R2, rede ou build. O guard de **6/6 PASS (exit 0)** foi reexecutado no SHA **d4b5041821c86893095de7b6bf146d5814fa4ee0**, também no mesmo ambiente isolado Windows Node 24, antes de ampliar os gates do toolchain. A ampliação do guard do toolchain foi executada no SHA **424cdd9fb3a22f6d58167c37fa23b4e94ab48556**, também no Windows isolado Node **24.22.2**: **7/7 PASS, 0 FAIL, exit 0**. Isso prova apenas os contratos locais, não CI completo nem Worker deploy.

**Saída M0:** plano/manifesto/teste versionados; Pages público e Writer do Worker inalterados; próxima ação M1.

### M1 — Reconciliação e mapa causal do código do Worker (PENDENTE)

- [ ] Reconsultar a **main viva** da origem, PRs abertas e o que a #266 efetivamente corrigiu; preservar mudanças exclusivas. Não copiar revisão obsoleta.
- [x] **Mapa inicial de imports do entrypoint feito na origem main auditada:** **9/12** arquivos TS são alcançáveis via import estático de **worker/entry.ts**; **worker/quoteAdminAccess.ts**, **worker/quoteAdminApi.ts** e **worker/quoteWorkflow.ts** não fazem parte desse grafo, não importá-los automaticamente como runtime público. **worker/schemaContract.ts** importa **config/catalog-schema-contract.json**. Paths verificáveis em **config/catalog-code-consolidation.json → origin.staticImportGraph**. Importação dinâmica e funções comerciais ainda requerem revisão.
- [x] **Grafo do deploy API** do workflow **.github/workflows/cloudflare.yml**: **18 referências diretas a utilitários tools/**, com **mais 1 dependência transitiva** `tools/check_worker_gallery_contract.mjs` usada por `worker_release_smoke.mjs`. Todos os **19 hashes** estão no manifesto único; além disso foram identificados wrangler, contrato JSON e tsconfig Worker. `wrangler.jsonc` fixa o MESMO Worker, binding D1 **DB** (database ID 87006366-60f3-4937-af73-2ef5a5f901fb), R2 **MEDIA** e segredo nominal **TURNSTILE_SECRET_KEY**. Não publicar com esse workflow importado sem reconciliação e gates.
- [ ] Finalizar classificação das demais ferramentas (211 arquivos no total), 22 migrations e testes necessários; rastrear consumo interno dos candidatos. Classificar **essencial**, **somente frontend antigo**, **manutenção editorial** ou **histórico**. O mapa de 19 utilitários é **candidato**, não autorização de importação nem prova de todos os imports dinâmicos.
- [ ] Comparar os 60 scripts/catalog presentes no site: não permitir pipelines concorrentes de publicação; manter ingestion/Drive sob o respectivo proprietário até provar ownership e quota.
- [ ] Definir pacote Node/TS isolado sem conflito com **src/** e **supabase/migrations/**, com testes offline reais e prova de cobertura. Construir um mapa de destino/sha de cada arquivo escolhido; nenhuma consulta remota D1/R2.
- [ ] Verificar triggers ativos em **washingtonmsdj/catalogo**, proteção de branch, environments, secrets/variables por presença (**nunca exibir segredos**), histórico de release e rollback. Coordenar com responsável do catálogo antes de travar seus pushes.

**Saída M1:** lista fechada de arquivos e dependências, base fonte reconciliada, nenhum código copiado por especulação. **Não saltar para M5.**

### M2 — Importação inativa do backend na MESMA PR #4 (STAGED-OFFLINE; TYPECHECK/CI PENDENTES)

- [x] Importados **9 módulos públicos Worker**, **22 SQL D1**, config/schema/tsconfig/Wrangler e **10 arquivos de testes/utilitário** (total **44 arquivos de origem**) sob `services/catalogo/`, com `staging.fileBlobs` do manifesto comparável por SHA Git. `media.ts` e teste de mídia incorporam a correção da **PR #266 ainda draft**, sem fazer merge/publicação na origem. As três unidades quote/admin não importadas pelo entrypoint foram excluídas. Nenhum arquivo React antigo, dado, imagem ou deploy foi copiado.
- [ ] Ajustar import paths e tooling para o novo root, sem trocar nome/id de Worker, D1, R2 nem alterar contratos públicos. Sem bundle duplicado de Pages.
- [x] Manifesto passou a **staged-offline**, com `activeWorkerPublisher=washingtonmsdj/catalogo`, `releaseAuthorized=false`, `targetWorkerReleaseEnabled=false`, `targetD1MigrationEnabled=false`; um candidato inativo para testes **não é um segundo writer**.
- [ ] Verificar que o código existente do Studio não possui consumidores de API antiga fora do allowlist da Pages. Não colar segredos, artefatos compilados ou modelos.

**Saída M2:** candidato completo versionado, não publicado, na mesma branch/PR, com hashes verificáveis.

### M3 — Equivalência e testes offline / custo-zero (VALIDADA LOCALMENTE; CI A VERIFICAR)

**Provas reais no Windows autorizado / Node.js 24.22.2:** Worker + patch PR #266 na MESMA estrutura `services/catalogo/` passaram **58/58**. Arquivos de origem foram verificados byte a byte contra **44 SHA Git** com o guard **8/8**, corrigido no commit `b5abd44`; o proxy do site Cloudflare Pages passou **12/12** testes offline. **Suite anterior: 78/78 PASS. Após importação dos dois testes de busca/SQLite: 82/82 PASS localmente, todos exit 0.** O clone local inicialmente alterou CRLF; normalização foi permitida APENAS quando o SHA exato esperado foi comprovado. Isso não é teste de produção. **Typecheck:** TypeScript 5.8.3 do lockfile PASS (exit 0). **Escala:** SQLite local com 22 migrações e 20.320 modelos sintéticos, 4/4 PASS (exit 0). Guard atualizado e comprovado para **46 blobs**: 8/8 PASS. **Pendente:** CI remoto por impacto e corte de publicador autorizado; não promover.

- [x] Suite offline Node 24 **58/58 PASS** no código Worder importado e patch #266: galeria/media (Range, GET/HEAD, ETag, traversal, 200/206/304), aliases, schema e Turnstile.
- [x] Prova de **44/44 hashes Git** por guard **8/8 PASS**, NUL correto no cabeçalho SHA-1; nenhum outro pacote Worker/admin de origem importado.
- [x] `npm run catalog:worker:typecheck` com **tsc 5.8.3** do lockfile: PASS no Windows isolado Node 24.22.2. Ferramenta instalada somente em diretório temporário, sem alterar produção.
- [x] `npm run catalog:worker:search:test`: 4/4 PASS no mesmo ambiente, incluindo SQLite local com **20.320 modelos sintéticos**, filtros e cursor. Dependência esbuild 0.28.2 explicitamente pinada no package/lock do monorepo.
- [x] Pages Function → `CATALOG_WORKER`: **12/12 testes offline PASS**, métodos e paths bloqueados (405/404), não encaminhamento de cookies/autorização, Range em mídia e binding ausente fail-closed. Nenhuma rede/D1/R2.
- [x] **22/22 SQL D1** copiados com os mesmos blobs SHA da origem; teste `schema contract` passou e os bindings continuam DB/MEDIA apontando para recursos EXISTENTES. Nenhum SQL remoto aplicado.
- [x] Migrações 0001–0022 aplicadas apenas em `node:sqlite` **in-memory** durante a prova de escala; índices e paginação validados sem D1 remoto.
- [ ] Revisar se há testes de Worker que dependem de endpoints antigos do Achegue-se e separá-los de testes de frontend. CI não deve usar o D1 como fixture.

**Saída M3:** relatório verificável de testes e SHA da origem/candidato, nenhuma alegação de equivalência sem logs.

### M4 — CI por impacto, SEM publicação (CI VERDE, CUTOVER AINDA BLOQUEADO)

- [x] Integração ao **workflow existente** `.github/workflows/quality.yml`: evento `pull_request` filtrado por paths, único job `catalog-offline` com npm cache e apenas guard/typecheck/testes do Worker/busca/proxy. Jobs comerciais originais ficam restritos ao push/dispatch; nenhum segundo workflow criado.
- [x] **GitHub Actions Quality Gate run #41789856366**, para código HEAD `90503aa58803fcaa467db1a8d6c2e8ad4aecde04`: `status=completed`, `conclusion=success`. Job `Catalog Worker offline / no deploy`: checkout, Node 24, `npm ci`, hashes, typecheck, runtime, busca SQLite e proxy **todos success**. Jobs comerciais foram **skipped** como esperado. [Execução](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41789856366).
- [x] CI offline de PR não recebe secrets, não executa Wrangler deploy nem migrations D1. Manifesto permanece `releaseAuthorized=false`, `targetWorkerReleaseEnabled=false`, `targetD1MigrationEnabled=false`; não altera o publicador Washington.
- [ ] Conferir diffs, checks verdes e readiness do rollback; preparar plano para impedir que o GitHub Washington continue publicando Worker depois do cutover.
- [ ] Preservar deploy Cloudflare Pages produção/preview automáticos **OFF** e manter Cloudflare Access/noindex até autorização de lançamento.

**Saída M4:** código buildável e gates independentes, ainda sem deploy novo.

### M5 — Cutover do ÚNICO publicador da API (BLOQUEADO ATÉ GO EXPLÍCITO)

**Preflight real, somente leitura — 04/11/2026:**
- Cloudflare Workers deployments: `tonecos-catalogo-api` versão **28**, id `a32b09a0-377d-4ff7-b313-4e5a7bf994b6`, recebe **100%**; deployment `a9f13dd7-537d-4106-bfcf-30510cca388b`, de **01/11/2026 10:35:46 UTC**, relacionado ao commit Washington `77ff9b0559c911de992ae9c84b78fdaa5e0fed6b`. A versão anterior **27** (id `3fdef475-a483-4439-a778-bd87f9f76bb1`) existe como **candidata** a rollback, mas o retorno não foi testado; não presumir recuperabilidade.
- Comparação Git `77ff9b0...a4bf22b`: **21 commits** à frente na origem, **nenhum diff em worker/**, **migrations/**, `wrangler.jsonc`, `config/catalog-schema-contract.json` ou `tsconfig.worker.json`. A mudança de API específica do candidato é a correção de mídia da PR #266 (ainda draft); não supor que ela já esteja servida em produção.
- Cloudflare configurações atuais: Worker com bindings **DB** (D1 existente, ID `87006366-60f3-4937-af73-2ef5a5f901fb`), **MEDIA** (R2 atual), secret nominal **TURNSTILE_SECRET_KEY** e var **CORS_ORIGINS**. Pages binding **CATALOG_WORKER** aponta ao mesmo Worker; autodeploy de Pages produção OFF, preview none.
- O workflow existente Washington `.github/workflows/cloudflare.yml` aceita push para main em paths de runtime **e** `workflow_dispatch`. Na origem, dispatch pode ativar D1 migrations remotas. **NÃO copiar, disparar ou adaptar essa lógica sem separar SQL/Worker e comprovar que o writer antigo foi desligado.**
- Candidato Tonecos: Worker de borda compilado **ESM/browser/es2022** e exercitado por mocks reais: **3/3 PASS**, GET/HEAD 200 sem Range, GET com Range 206 e POST 405, **zero D1**. Os comandos do `catalog:worker:test` incluem essa prova; não são release.
- JSON `productionObservation` em `config/catalog-code-consolidation.json` guarda o snapshot verificável, **não** uma permissão ou compromisso de versão. Revalidar imediatamente na janela M5, pois IDs e autorias mudam.

**Sequência única futura (somente após autorização específica):** confirmar nenhuma execução ativa; coordenar desabilitação do workflow de escrita Washington nos gatilhos push **e** dispatch; provar desabilitado pela autoridade do GitHub e publicação única; conferir versão 100% atual (anotar ID como alvo de rollback) e segredo do Worker **por presença, sem expor conteúdo**; aprovar candidato já testado e sem migrations para mudança runtime-only; promover pelo procedimento Cloudflare de versão staged/0% → smoke → 100%; revalidar API/galeria, preservar bundle anterior; se falhar, rollback para o **ID capturado na janela**, validar recuperação e não fingir sucesso. **Não** executar D1 migrations em runtime-only. Somente registrar conclusão depois de provas reais de versão ativa, QA e desativação da origem. Sem GO, nenhuma etapa de produção é permitida.



- [ ] Revalidar main/PRs e pipeline da origem imediatamente antes da janela; coordenar pausa de gatilho da **.github/workflows/cloudflare.yml** no Washington sem apagar provas/branches.
- [ ] Com autorização explícita, desabilitar primeiro **writer antigo**, comprovar que somente o Studio pode promover o MESMO Worker; liberar exatamente um pipeline novo depois de testes M3/M4. **Nunca habilitar dois publishers simultaneamente.**
- [ ] Validar estado remoto do Worker, bindings, compatibilidade de schema, orçamento D1 e versão a restaurar. Se o código não alterou schema, não fazer migrations; se alterou, aplicar somente as necessárias com gates reais.
- [ ] Promover versão de forma controlada, smoke mínimo e rollback testado; D1/R2 permanecem onde estão. Só após prova refletir **cutover-complete** no manifesto; não marcar concluído baseado em CI isolado.

**Saída M5:** API e dados existentes servidos, com apenas um repositório dono do deploy.

### M6 — Única interface pública e encerramento do legado (BLOQUEADO ATÉ GO EXPLÍCITO)

- [ ] Revisão legal de conteúdo, marca, direitos e LGPD; QA autenticado desktop/mobile do site Tonecos, filtros, links profundos, 6 capas e galeria; SEO sob flag explicitamente aprovada.
- [ ] Homologar Cloudflare Pages, HTTPS, domínio/canonical e rollback. Preservar URLs antigas do Achegue-se / GitHub Pages até cutover e redirecionamento testado; **HEAD 200 não basta**.
- [ ] Encerrar Git da Vercel Tonecos antiga na conta Washington, preservando integralmente os domínios OrdaX; não contratar plano pago.
- [ ] Só depois arquivar **washingtonmsdj/catalogo** como histórico read-only quando o mesmo código/contratos/PRs necessários estiverem reconciliados, não houver dependência de workflow/Pages antigo e houver aceite do proprietário. **Não transferir esse repo para tonecosstudio/catalogo e não o apagar.**
- [ ] Atualizar README, AGENTS, docs/README, URGENTE e o manifesto na MESMA PR ou no fluxo canônico já integrado, sem criar documentação paralela.

**Saída M6:** um site, uma API, um repositório dono dos códigos e deploys, um D1 e um R2; origem Washington sem writers; evidências e histórico preservados.

## 4. Travas absolutas

1. **NO-GO por padrão:** nunca habilitar deploy/merge/produção automaticamente por ter criado este plano ou passado um teste.
2. **Um writer por serviço:** Washington é o publicador do Worker até o cutover M5 comprovado; Studio não ativa Worker antes de desabilitar fonte anterior.
3. **Dados não migram:** não criar D1, R2, bancos, buckets, workers, secret scopes ou cópias de mídia. Não realizar auditorias integrais, download em massa, consultas ou imports D1 em testes.
4. **Frontend não se duplica:** nunca importar src/ e assets do antigo catálogo como novo app; aproveitar frontend Tonecos já existente.
5. **Proveniência e drift:** SHA da origem no JSON é observação datada; antes de importar revalidar PR #266 e main. Diff imprevisto bloqueia e exige reconciliação — nunca substituir à força.
6. **Gates reais:** CI e testes locais não substituem QA visual Cloudflare Access, aprovação jurídica, rollback e autorização explícita.
7. **Um fluxo Git:** somente branch integration/tonecosstudio-canonical-20261101 e PR draft #4 durante esta implementação. Outro agente/automação deve verificar HEAD antes de escrever.

## 5. Checkpoint para qualquer conversa/agente

**ESTADO AGORA: M0–M4 concluídas em validação offline; M2 `staged-offline` mantém 46 arquivos de origem + 1 teste de borda nativo. M3: 82/82 testes anteriores + 3/3 novos do Worker compilado = **85/85 locais**, typecheck TS 5.8.3 aprovado. CI M4 está verde nos runs #41789856366 e #41790227284, mas o novo teste ainda precisa passar no HEAD desta alteração. M5 preflight read-only executado, **cutover bloqueado sem GO**; M6 bloqueada.**
**HEAD de observação do frontend:** 7e70ec68a4ac0338be5ddc4a8df9ad47957191c8 (antes deste plano; nunca presumir que continua atual).
**MAIN origem observada:** a4bf22bb8044a88f0c5d0b54b3e9d3fdead0b34c.
**PRs origem abertas na auditoria:** #266 (prioritária), #264, #263.
**DO_NOT_REPEAT:** não rodar D1/R2 para investigar Git, não criar tonecosstudio/catalogo, não replicar UI, não construir novo Worker, não criar PR/branch, não reiniciar builds só por docs.
**NEXT_ACTION:** CI offline M4 aprovado no código candidato; manter único writer em Washington. Para M5: antes de qualquer cutover, obter GO específico, reconciliar status da PR #266 na origem, demonstrar controle dos workflows/credenciais e rollback real sem tocar D1 desnecessariamente. M6 demanda QA visual autenticado, legal e proteção de URLs legadas. Não iniciar deployments por esta documentação.
**BLOQUEIOS:** API publisher ainda em Washington; QA legal/visual, Vercel desconectada e release aprovados ainda pendentes.
