# Tonecos Studio — checkpoint operacional

**Auditado em 05/11/2026 (Bahia). Estado: NO-GO para publicação pública.**


## Frontend — hero responsivo e QA por página (05/11/2026)

- **Ajuste no código:** `src/components/arcade/ArcadeLayout.tsx` agora usa tracking fluido em `ArcadeHero` (`clamp(0.08em, 2vw, 0.15em)`). A medição em `/privacidade` achou o H1 2 px maior que a caixa em 320 px; agora o texto mede 266/266 px. Em 360 px o tracking volta a 7.2 px; em 1280 px, 10.8 px e tamanho desktop preservado.
- **QA autenticado no preview:** `/universo` em 320 px: nenhum card “Todos”, uma CTA “Ver todos os modelos”, “Animes e Desenhos” em uma linha (109 × 15 px) e sem overflow. `/privacidade` em 320, 360 e 1280 px: título sem overflow; `/contato` e `/termos` sem overflow em 320 px. `/`, `/sobre`, árvore Dragon Ball e ficha de modelo também foram conferidos nas larguras da rodada anterior.
- **Código:** commit `b9f0af1f1ae22d9a104848b2f5b71d8dbac6ce67`, mesma branch e PR #4 draft.
- **Preview privado:** [https://8563636a.tonecosstudio.pages.dev/universo](https://8563636a.tonecosstudio.pages.dev/universo), deployment `8563636a-ddc2-4c6a-b23f-c4aca8296c30`, ambiente preview, source SHA `b9f0af1`; Cloudflare Pages build e deploy SUCCESS. A configuração de build executou typecheck, `catalog:mvp:test` e build. Produção e Worker/D1/R2 não foram alterados.
- **NEXT_ACTION:** revisar `/modelos` no preview atual em 320, 390, 768 e 1280 px, incluindo busca, filtros, grade e paginação; depois prosseguir pelas demais rotas e estados públicos.
- **DO_NOT_REPEAT:** não gerar build por atualização só documental, não criar branch/PR extra, não publicar em produção e não tocar em Worker, D1 ou R2.

## Backend — SSOT, remoção de legado e preflight de cutover (05/11/2026)

- **Owner isolado do layout local:** somente `config/catalog-code-consolidation.json`, `services/catalogo/README.md`, testes/guarda offline, preflight de cutover e documentação existente; não alterar componentes React, Pages Function, Worker ativo nem dados.
- **SSOT corrigida:** `origin.apiDeployWorkflowId` passa a residir no manifesto; preflight lê IDs de repositórios/conta/Worker de `config/catalog-code-consolidation.json` e D1/R2 de `services/catalogo/wrangler.jsonc`. O guard independente verifica a identidade aprovada e impede drift; flags M5 não foram liberadas.
- **Obsoletos removidos do repositório ativo:** `scripts/catalog/legacy/baixar-imagens-telegram.cmd` (launcher de caminho inválido) e `scripts/catalog/legacy/leia-pc-auxiliar.txt` (fluxo auxiliar abandonado). Conteúdo permanece no histórico Git. Ferramentas editoriais restantes preservadas.
- **Prova anterior:** [Quality Gate #41969104125](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41969104125) aprovado para o preflight anterior; o novo conjunto de mudanças requer CI do HEAD vigente. Nenhum D1, R2, Worker deploy ou migração foi realizado.
- **NEXT_ACTION:** verificar Quality Gate da última revisão, corrigir falha real se houver; manter M5 BLOCKED até GO, fonte Washington desativada, rollout/rollback provados e credenciais verificadas.
- **DO_NOT_REPEAT:** não criar outra branch/PR, não rodar scans D1/R2, não apagar scripts editoriais sem prova de desuso, não tocar layout nem gerar build de frontend por documentação.
 O enorme checkpoint cumulativo anterior foi preservado integralmente em [docs-archive/historico-2026-11-04/URGENTE.md](docs-archive/historico-2026-11-04/URGENTE.md). Use [docs/README.md](docs/README.md) como índice dos documentos atuais.

## Frontend — rodada 1 de responsividade (04/11/2026)

- **Escopo:** navegação compartilhada, rodapé e catálogo público. No preview protegido atual, as oito rotas principais foram conferidas a 320 px sem rolagem horizontal. A listagem foi verificada em 320, 390, 768, 1024, 1440 e 1920 px, com 2, 2, 4, 4, 5 e 6 colunas. Categorias e franquias também foram abertas em celular; o painel de seleção ocupa a largura de 320 px e mantém o modelo e as ações visíveis.
- **Ajustes no código:** alvos de toque de 44 × 44 px no botão do menu e 44 px de altura nos links do menu e do rodapé; busca da listagem com placeholder curto e largura de texto ajustada quando o controle para limpar não está presente.
- **Commits de código:** 35c492e (menu), 7ce12ea (rodapé), e7351da (busca), 2bf5357 (expectativa de teste atualizada).
- **Preview privado pronto:** [https://0694c96e.tonecosstudio.pages.dev/modelos](https://0694c96e.tonecosstudio.pages.dev/modelos), deployment 0694c96e-2482-44b8-ab52-e2b8b3886c00, commit 54b6ead2fb22ba3ebacb676a314a9142a8090157. Cloudflare Pages build SUCCESS / deploy SUCCESS; typecheck, catalog:mvp:test (4 arquivos, 78 testes) e npm run build concluíram.
- **Tentativa anterior:** deployment b73d4bce falhou porque um teste ainda procurava o placeholder antigo; foi corrigido em 2bf5357. Não publicou assets. Produção e o Worker permanecem inalterados.

## Contas e fontes de verdade

- **Repositório do site:** tonecosstudio/tonecosstudio, GitHub ID 1163825583. O nome antigo washingtonmsdj/tonecosstudio redireciona ao mesmo ID. PR [#4](https://github.com/tonecosstudio/tonecosstudio/pull/4), branch integration/tonecosstudio-canonical-20261101, **draft**, sem merge na main. Commits 74b7b60, 5acf41c e 171c84a são de reorganização documental.
- **Hospedagem oficial:** Cloudflare Pages da conta **tonecosstudio@gmail.com**, account ID 8827c547d6def5ee5b9ca550fdd5680a, projeto **tonecosstudio**, hostname reservado **https://tonecosstudio.pages.dev**. Produção automática **OFF** (production_deployments_enabled=false), previews automáticos **OFF** (preview_deployment_setting=none), produção ligada à branch **main**.
- **API e mídia:** Cloudflare Worker **tonecos-catalogo-api** na conta Tonecos, via binding Pages **CATALOG_WORKER** em preview e produção. D1/R2 pertencem ao Worker; sem binding direto na Pages Function. **Código do backend segue temporariamente no repo washingtonmsdj/catalogo**, com migração para services/catalogo neste repo autorizada como plano; deploy e release continuam sem autorização.
- **MVP:** catálogo readonly (Home, Universo, Modelos, ficha e galeria, Sobre, Contato mailto, Termos e Privacidade). Supabase/Stripe, login, conta, pedidos, pagamentos, moedas e admin não estão no bundle público homologado; módulos comerciais existentes são fase futura.
- **Cloudflare Access** protege os previews. Requisição externa com HTTP 200 de tela Sign in, inclusive para robots, **não é QA do conteúdo**.
- **Worker redundante** com nome tonecosstudio foi observado na conta, mas seu Workers Builds paralelo já foi desconectado anteriormente. Não confundir com o Pages ou com a API; não excluir sem auditoria específica.

## Builds existentes — NÃO repetir por documentação

- **ad578030-e02f-47ef-ae23-b4aa6e4ad713**, SHA **39e7a04a**, Cloudflare Pages preview: build e deploy **SUCCESS** em **04/11/2026 04:50:36 UTC**. Logs atestam bundle com 20 chunks sem runtime Supabase/comercial, robots e meta bloqueando indexação, sem sitemap, npm audit sem vulnerabilidades reportadas.
- **13187506-f2ab-4931-b586-4aa811ae9e6c**, SHA **16fa5760**: build/deploy **SUCCESS** às **04:39:09 UTC**, validando gate SEO antes do lançamento.
- **2bc99d80565ca97199bfcb146540a4b00319cd1f**: alteração preventiva **vercel.json git.deploymentEnabled=false**; evento Pages deste SHA ficou **queued/idle**. Isso **não prova build** desse SHA; as mudanças documentais seguintes tampouco exigem novo build. Não criar outro preview só para zerar check histórico.
- Seis capas WebP da primeira página e detalhe do modelo **nier-10h-nier** têm evidências HTTP econômicas anteriores, mas **não foram homologados visualmente** em desktop/mobile. Não inferir acervo total de apenas seis modelos.

## Vercel Washington — legado, NÃO é o hosting oficial

- Equipe **jogo-brasils-projects**, conta Washington, plano **Hobby**, projeto **tonecosstudio**, ID **prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu**. Git link histórico aponta a washingtonmsdj/tonecosstudio, que redireciona ao mesmo repo ID.
- Domínios **ordax.com.br** e **www.ordax.com.br** permanecem associados ao projeto Vercel antigo, porém **não verificados**; **ordax-three.vercel.app** está verificado. A associação antiga não significa que Tonecos esteja servindo DNS OrdaX. **Não alterar DNS ou projeto OrdaX.**
- Vercel aceitou uma solicitação para desativar previews; efeito fim a fim **ainda não comprovado**. A política premium para bloqueio de Git teve **403 pro_plan_required**: não contratar Pro.
- O novo vercel.json usa diretiva oficial gratuita git.deploymentEnabled=false, mas **não prova desconexão do Git legado**. O vínculo e os domínios antigos devem ser tratados **no projeto correto**, sem afetar OrdaX, antes de liberar a main. Veja [runbook](docs/OPERACAO_CLOUDFLARE_PAGES.md).

## Pendente para GO

1. **QA visual completo — pendente:** [preview privado atual](https://0694c96e.tonecosstudio.pages.dev/modelos). A rodada responsiva foi validada; seguem pendentes a revisão individual das capas e galeria, caminhos de refresh/deep link, acessibilidade e estados de falha.
2. **Revisão jurídica humana** de Termos e Privacidade, dados reais do operador (não presumir LTDA), LGPD, cookies/logs e direitos de mídia/personagens.
3. **Desconexão/prova de isolamento da Vercel antiga**, limpeza dos vínculos de domínio no projeto legado sem afetar OrdaX, hostname/canonical/HTTPS/SEO corretos e rollback Pages verificado.
4. **Gates do SHA candidato, merge e publicação Cloudflare Pages** apenas com autorização explícita. SEO TONECOS_PUBLIC_INDEXING_RELEASE não está habilitado; sem autorização mantém robots Disallow, noindex e nenhum sitemap.

**next_action:** QA autenticado com evidência e retirada segura da dependência operacional Vercel; depois revisão legal, rollback e decisão sobre merge Pages.

**do_not_repeat:** não varrer/consultar D1 para status, importar Drive/Telegram, executar builds já aprovados, criar novos workers/apps/PRs, migrar Supabase, comprar Pro, ativar conta/pagamentos/SEO, mexer no OrdaX ou publicar o site antes dos gates.

Documentos ativos: [README](README.md), [AGENTS](AGENTS.md), [arquitetura](docs/TONECOS-STUDIO-CONSOLIDACAO.md), [proxy](docs/TONECOS_CATALOG_FIRST_PARTY_PROXY.md), [preview](docs/TONECOS_SAFE_PREVIEW.md) e [runbook Pages](docs/OPERACAO_CLOUDFLARE_PAGES.md).

## 04/11/2026 — Hardening de hospedagem legada (repositório)

- A proteção oficial `vercel.json → git.deploymentEnabled=false` foi preservada. Removidas as **8 rewrites Vercel** que apontavam diretamente ao Worker público, a regra legada de cache, headers, comandos de build e o script `scripts/vercel/should-ignore-build.mjs`. O arquivo passou a ser somente **bloqueio preventivo de deployments automáticos**; o caminho canônico da aplicação permanece Cloudflare Pages Function + CATALOG_WORKER.
- Essa alteração é **no repositório**, não uma desconexão feita no painel Vercel. A Vercel Washington continua com Git link a verificar/desconectar; não afirmar isolamento fim a fim nem liberar main.
- Sem mudanças nas Functions Pages, Worker, D1/R2, backend ou ambiente remoto. **Nenhum novo build Cloudflare é necessário para provar remoção da configuração Vercel**; QA autenticado do bundle já homologado continua pendente.

## 04/11/2026 — Auditoria de documentos locais comerciais

- **48 Markdown de módulos inspecionados**, seis com referências à marca/arquivos antigos corrigidas ou sinalizadas. `src/components/customer/README.md` não usa mais links absolutos de Windows. Exemplos de links de e-mail OrdaX foram substituídos por domínio reservado inválido, jamais origem de produção. Um README vazio foi excluído.
- No código comercial futuro, `src/pages/admin/credits/AdminCoinsSystem.tsx` ainda exibe a frase **ORDAX** e `supabase/functions/_shared/email.ts` ainda tem nome de remetente padrão `Ordax`. **Não faz parte do bundle readonly**; corrigir e homologar na etapa comercial antes de habilitar Supabase, cadastro ou e-mail. O código `getPublicBaseUrl` exige origem configurada, sem fallback OrdaX.
- **Nenhum Supabase, Worker, deployment ou build foi acionado** por esta auditoria documental.

## 04/11/2026 — Nova missão: consolidar backend e frontend no mesmo repo

- **DECISÃO DO PROPRIETÁRIO:** um repositório canônico **tonecosstudio/tonecosstudio**, sem **tonecosstudio/catalogo**; [plano operacional](docs/MIGRACAO_CATALOGO_MONOREPO.md), fases M0–M6; [inventário imutável de origem](config/catalog-code-consolidation.json), guard offline **npm run catalog:monorepo:check**.
- **Origem GitHub temporária:** washingtonmsdj/catalogo público ID 1398242143, main observada **a4bf22bb8044a88f0c5d0b54b3e9d3fdead0b34c**, **652 arquivos**: 12 Worker, 22 migrations, 211 tools, 26 config, 68 src antigo, 280 docs. PRs #266 (mídia R2), #264 e #263 abertas. Importar somente Worker/contratos/sql D1/ferramentas necessárias após reconciliar #266; NÃO duplicar UI nem criar serviços.
- **Integração runtime já existente:** Cloudflare Pages Tonecos → binding CATALOG_WORKER → Worker tonecos-catalogo-api → D1/R2 únicos. **Active Worker publisher continua Washington**; manifest está inicialmente em **inventoried**, deploy pelo Studio e migrations novos bloqueados.
- **Próxima execução:** revalidar HEAD/PR #4 + main/PR #266 origem, rodar guard offline, mapear dependências para M1. Só então importar code staged-offline em services/catalogo na mesma PR; testes e CI por impacto, nunca dois writers.
- **Não repetir:** auditoria D1/R2, builds por documentação, import de frontend antigo, criação tonecosstudio/catalogo, novos branches/PRs, mudanças DNS/Achegue-se, alterações de produção ou arquivamento antes do cutover.
- **NO-GO:** sem merge, Cloudflare Pages produção desligada, QA visual/legal e Vercel legacy pendentes. Histórico da proposta de transferir o repo GitHub foi superado por esta decisão de monorepo.

## 04/11/2026 — Execução M0 e início M1

- No SHA d2cffee1fb94b0540b7e362d163200404a929bbe, **guard Node 24.22.2: 5/5 PASS, saída 0**, no desktop Windows autorizado (cópia isolada em pasta temporária). Sem D1/R2, rede ou deploy. Teste adicional do grafo estático precisa ser reexecutado no novo SHA.
- **Import graph real:** Worker entry.ts alcança 9/12 módulos; os três quoteAdmin/quoteWorkflow estão desconectados do entrypoint no snapshot e não devem ser migrados como parte da API pública sem revisão. schemaContract.ts usa config/catalog-schema-contract.json. Grafo agora no mesmo manifesto SSOT. PR #266 ainda aberta/draft, com correção HEAD/GET sem Range; **bloqueia assumir equivalência da main antiga**.
- **Próxima ação:** mapear toolchain worker e migrations D1, fechar escopo, homologar PR #266 sem promover Worker, somente então importar serviços/catalogo staged-offline nesta PR #4. Jamais ativar dois publicadores.

## 04/11/2026 — M1, dependências do deploy API (sem deploy)

- Leitura do workflow Cloudflare API **na main origem a4bf22b**: 18 referências tools, mais 1 ferramenta transitiva (check_worker_gallery_contract), todos com Git blobs no manifesto único. Wrangler, schema JSON e tsconfig Worker também ancorados em SHA. A pipeline existente pode publicar versões e aplicar migrações quando muda schema: **não copiar/ativar gatilhos sem neutralizar este comportamento**.
- O guard estático 6/6 PASS no SHA d4b5041 (Node 24 Windows, exit 0). Teste do toolchain executado na versão 424cdd9: **7/7 PASS, 0 FAIL, exit 0** em Node 24 no Windows isolado. **Registro histórico do M1:** essa pendência referia-se ao release; em M2 o código de runtime foi importado **inativo** com fechamento das suas dependências. Ferramentas de deploy seguem aguardando M4; a PR #266 continua draft e deve ser reconciliada antes de qualquer release.

## 04/11/2026 — M2/M3 aprovadas localmente; M4 CI remoto VERDE (sem deploy)

- **Repositório único:** `tonecosstudio/tonecosstudio` PR draft #4, branch `integration/tonecosstudio-canonical-20261101`. Código do Worker importado sob `services/catalogo/` como **staged-offline**. Atualmente **46 blobs rastreados**: 9 Worker públicos, 22 SQL D1, 3 configs, 12 arquivos de utilitários/testes. Três módulos quote/admin e o frontend antigo não foram importados.
- **Mídia:** `worker/media.ts` e regressões vêm da PR Washington #266 ainda draft; worker original continua com um só publicador no repo Washington. `releaseAuthorized=false`, `targetWorkerReleaseEnabled=false`, `targetD1MigrationEnabled=false`.
- **Provas locais reais, Windows Node 24.22.2:** guard/hash **8/8 PASS sobre 46 SHA Git**; Worker **58/58 PASS**; Pages proxy **12/12 PASS**; busca/SQLite **4/4 PASS** aplicando 22 migrations em banco in-memory com **20.320 modelos fictícios**. Total **82/82 PASS**, todos exit 0. TypeScript **5.8.3** do lockfile passou `catalog:worker:typecheck` exit 0. Zero SQL D1 remoto, zero R2 remoto e zero deployments.
- **M4 CI por impacto:** alterado **apenas** o workflow existente `.github/workflows/quality.yml`. Em PRs com mudança em catálogo, job `catalog-offline` faz `npm ci`, guard, TS, Worker, busca SQLite e proxy; outras suítes pesadas continuam no fluxo original de main/dispatch. **GitHub Actions run #41789856366 SUCCESS** no SHA do código `90503aa58803fcaa467db1a8d6c2e8ad4aecde04`, todos os passos do job catalog-offline sucesso, jobs gerais skipped. Sem secrets, deploy Wrangler ou migrations D1.
- **NEXT_ACTION:** M4 gates offline verdes; **NÃO executar M5 sem autorização explícita e validação de único writer**. Revalidar PR #266, rollback, credenciais e roteamento antes de uma promoção; manter release bloqueado. M5 cutover do escritor e M6 desativação de Washington/Achegue-se exigem gate e autorização específicos. **DO_NOT_REPEAT:** reimportações, scans de D1/R2, builds de site por documentação, contas/repos paralelos ou mudanças em OrdaX/Vercel.

## 04/11/2026 — M5 preflight read-only e prova de Worker compilado

- Cloudflare Worker **versão 28** id `a32b09a0-377d-4ff7-b313-4e5a7bf994b6` a **100%**; deployment `a9f13dd7-537d-4106-bfcf-30510cca388b` em 01/11. Versão 27 id `3fdef475-a483-4439-a778-bd87f9f76bb1` registrada, **não testada como rollback**. Fonte deployed commit `77ff9b0`, 21 commits atrás da main Washington `a4bf22b`, **zero diferenças no runtime/migrations/config** entre esses SHAs. PR #266 ainda draft adiciona o ajuste de mídia no candidato.
- Workspace de teste Windows: compilação real do `worker/entry.ts` para **ESM/browser/es2022**, mocks R2 e D1 bloqueado; **3/3 testes PASS, exit 0**, validando GET e HEAD HTTP 200, Range HTTP 206 e POST 405 sem DB. Novo teste incorporado ao `catalog:worker:test`; total local passa a **85/85** (82 prévios + 3 novos), à espera do job CI no novo HEAD.
- Workflow de origem Washington ainda tem triggers **push main** e **workflow_dispatch**, que pode forçar migrations D1. **Não ativar segundo publicador, nem copiar workflow, nem lançar SQL via dispatch.** Estado do manifesto: staged-offline, releaseAuthorized=false, sourceWriterDisabled=false, targetWorkerReleaseEnabled=false, targetD1MigrationEnabled=false. Snapshot read-only em `productionObservation`, com IDs e bloqueios; revalidar no cutover.
- **NEXT_ACTION:** conferir CI do novo teste; M5 necessita autorização específica, desabilitar origem, validar único publisher/versão atual/rollback e promover somente então. M6 requer aprovação de site, legal e redirects. **DO_NOT_REPEAT:** consultas D1/R2, builds de UI por docs, múltiplas branches/PRs, migração de bucket, imports e CI redundantes.

**Complemento M5 — pacote Wrangler dry-run:** Wrangler **4.155.0** compilou `services/catalogo/wrangler.jsonc` via `deploy --dry-run --outdir <TEMP>` com `exit 0`, `entry.js` 51.750 bytes (gzip reportado 11,86 KiB), DB e MEDIA reconhecidos. Nenhuma credencial, deploy, consulta SQL D1 ou objeto R2 utilizado. **Não repetir compilação sem alteração de Worker/config**. `TURNSTILE_SECRET_KEY` e o controle de writer Washington continuam pendentes de comprovação na janela M5; release permanece não autorizado. A prova e a sequência canônica de cutover/rollback estão em `docs/MIGRACAO_CATALOGO_MONOREPO.md`.

## 04/11/2026 — Bloqueio M5 verificável no código (última execução)

- **PR #4:** commits `cfde077` (nova checagem `npm run catalog:cutover:check` somente leitura, cinco testes com mocks) e `8266937` (corrige contrato de transição `cutover-approved`, antes impossível). Continua `draft`; nenhum segundo publicador/Worker/banco/workflow criado.
- **Prova GitHub real:** workflow Washington `cloudflare.yml` id `371358484` = **active**, jobs in_progress **0**, queued **0**. `catalog:cutover:check` no Windows retornou `BLOCKED / exit 2` (sem Cloudflare credentials), falha fechada corretamente; 5/5 novos testes + 9/9 guard PASS. GitHub Actions run [#41797866215](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41797866215) **success**, com teste de bloqueio em CI. Total offline do job: **91 testes** (9 guard + 5 gate + 61 Worker + 4 SQLite + 12 Pages), mais TypeScript; sem SQL remoto/D1/R2.
- **NEXT_ACTION:** não refazer CI/check de status sem código novo. M5 segue bloqueada por source writer ativo, GO explícito e falta de prova das credenciais/rollback. Após GO, desabilitar fluxo Washington, verificar único publicador pelo GitHub, consultar Worker versão ativa e bindings via leitura, preparar rollback, seguir procedimento canônico sem migrations de runtime-only. M6 permanece condicionada a QA frontend/jurídico/redirects. **Sem tocar na produção nesta fase.**

## 04/11/2026 — Ajuste de frontend em /modelos

- **Base:** `6789278c99441ae6b8fbc12211305edc1072c864`. **HEAD do frontend:** `e4d46d2a99269f5f951e1fed0d10d3115fdf764a` na PR draft #4.
- A barra de busca e filtros foi reorganizada para telas menores e agora exibe os filtros ativos e a opção de limpá-los. “Minha seleção” abre em painel lateral com miniaturas, links para fichas e rolagem da lista.
- **Prova:** esbuild aceitou o TSX localmente. A homologação visual autenticada em desktop e celular, o build de preview deste SHA e os gates de release estão pendentes.
- **NEXT_ACTION:** validar o painel e os filtros em preview protegido antes de promover qualquer versão. **DO_NOT_REPEAT:** não reconstruir por este checkpoint documental nem consultar D1/R2 para validar layout.


## 04/11/2026 — Responsividade de /universo

- PR #4, branch `integration/tonecosstudio-canonical-20261101`. O commit de código `1aa61962ad1f4f021c9e095f4590b76e9a0cba24` reaproveita em `/universo` a prop `compact` já existente em `ArcadeHero`, reduzindo a altura do hero. Comparação medida: 321 → 241 px em 320×780 e 420 → 276 px em 1440×900.
- Preview Cloudflare privado [`bf4f697f`](https://bf4f697f.tonecosstudio.pages.dev/universo), deployment `bf4f697f-2df9-4539-8c19-6a7538c09793`, build/deploy **SUCCESS**, ambiente `preview`, fonte `084a6ed33be039a2f74c7e0a49953ee3f5721208`. Pipeline: typecheck, `catalog:mvp:test` (**78/78**) e `npm run build` concluídos.
- QA do Universo no preview em 320, 390, 768, 1024, 1440 e 1920 px: **nenhum overflow horizontal**; grade responsiva de categorias em 2/2/3/4/4/4 colunas. Seis links/categorias e total de 2.575 modelos renderizados. Uma primeira consulta no preview anterior falhou de forma transitória e se recuperou pelo botão “Tentar novamente”; a página nova carregou sem estado de erro.
- Produção/Worker/D1/R2 e configuração de deploy **inalterados**. Prévia iniciada manualmente porque previews automáticos seguem desativados.
- **NEXT_ACTION:** seguir na mesma PR draft #4 para a próxima página do frontend, usando o preview privado e verificando breakpoints antes de avançar.


## 04/11/2026 — Alvos do breadcrumb em /universo/:categoria

- PR #4, branch `integration/tonecosstudio-canonical-20261101`. O commit de código `d87640d30dd94937ec3f5ca3fc6137beede7ebb7` leva os dois links do breadcrumb e “Ver todos os modelos” a **44 px** de altura mínima e adiciona contorno de foco visível. Busca e botão permanecem em 48 px.
- Preview Cloudflare privado [`6000c1e9`](https://6000c1e9.tonecosstudio.pages.dev/universo/animes-desenhos), deployment `6000c1e9-ec15-4106-8b6d-035d23ef2f01`, build/deploy **SUCCESS**, ambiente `preview`, fonte `5d7ef72cbe8529c4a200756df6ef027754ee37d4`.
- Typecheck, `catalog:mvp:test` (**78/78**) e `npm run build` passaram. O build também passou pelas verificações de monorepo (9/9) e proxy/segurança/SEO (28/28).
- QA do preview em 320, 360, 390, 430, 640, 768, 1024, 1280, 1440 e 1920 px: **sem overflow horizontal**; grade em 2/3/4 colunas e os três alvos do breadcrumb medindo 44 px em todas as larguras. Foco de teclado confirmado nos três links com contorno dourado de 2 px. Primeira listagem mostra 24 franquias.
- Deploy manual somente em `preview`; produção, Worker, D1 e R2 permanecem inalterados. Previews automáticos continuam desativados.
- **NEXT_ACTION:** continuar na mesma PR draft #4 pela próxima tela pública; manter o preview privado como fonte de validação.

## Rodada 4 — navegação e responsividade da ficha do modelo (04/11/2026)

- Ao abrir uma ficha a partir de uma franquia, a rota mantinha a rolagem da listagem e podia esconder o início do conteúdo. O roteador público agora leva navegações novas ao topo, preserva links com hash e deixa o navegador restaurar a posição em navegações de volta.
- Preview privado: [abrir ficha do Androide 17](https://307479be.tonecosstudio.pages.dev/modelos/dragon-ball-androide-17-busto-display) — Cloudflare Pages deployment `307479be-f003-45b1-ae6b-5710e9647cc5`, código `e294b8a9515e2e53338eede9992f57ec2649453d`, build/deploy SUCCESS.
- QA real: clique da franquia para a ficha iniciou em `scrollY=0`; “Voltar” do navegador recuperou a listagem em `scrollY=610`. Dez larguras (320–1920 px), sem overflow horizontal; link de retorno 44 px, botão de seleção 46 px e miniatura entre 62–106 px.
- Validações Cloudflare: typecheck, `catalog:mvp:test` (78/78), `catalog:monorepo:check` (9/9), gates de segurança/proxy/SEO (28/28) e Vite build passaram. Preview preserva robots/noindex e exclui o runtime comercial/Supabase.
- A primeira execução do build falhou porque o componente ainda não estava montado; a ligação foi corrigida no commit acima e o build final passou. Só preview manual; produção, Worker, D1 e R2 inalterados. PR #4 continua draft.
- **NEXT_ACTION concluída:** ficha do modelo validada; a próxima rota, Sobre, está registrada na Rodada 5.

## Rodada 5 — responsividade da página Sobre (04/11/2026)

- A página Sobre reaproveita o modo compacto de `ArcadeHero`: altura medida do hero caiu de 321 para 241 px em 320 px e de 420 para 276 px em 1440 px, trazendo a seção Missão mais perto do topo.
- Preview privado: [abrir Sobre](https://02462383.tonecosstudio.pages.dev/sobre) — deployment `02462383-a2f9-48b1-8226-43bc605f92b6`, código `35e7d3fe614f0558c82192def5e904ff3997268a`, build/deploy SUCCESS.
- QA em 320, 360, 390, 430, 640, 768, 1024, 1280, 1440 e 1920 px: sem overflow; grades adaptam entre 1/2/4 colunas conforme a largura; alvos de FAQ com 56 px.
- Typecheck, `catalog:mvp:test` (78/78), verificação monorepo (9/9), gates de segurança/proxy/SEO (28/28) e Vite build passaram. Navegação ficha/listagem também revalidada no mesmo preview. Robots/noindex preservados, sem runtime comercial/Supabase; produção, Worker, D1 e R2 inalterados.
- **NEXT_ACTION concluída:** a página Contato foi validada na Rodada 6.

## Rodada 6 — QA responsivo de Contato (04/11/2026)

- Preview privado [Contato](https://02462383.tonecosstudio.pages.dev/contato), deployment `02462383-a2f9-48b1-8226-43bc605f92b6`, build/deploy SUCCESS no código `35e7d3fe614f0558c82192def5e904ff3997268a`.
- QA em 320, 360, 390, 430, 640, 768, 1024, 1280, 1440 e 1920 px: sem overflow horizontal; os links de e-mail têm altura de 44 px. A página explica que o catálogo é informativo e não recebe cadastro, pedidos ou pagamentos.
- Sem mudança de código: o layout e os links existentes funcionaram no preview atualizado. Typecheck e gates de build já passaram no mesmo deployment, registrados na Rodada 5. Produção inalterada.
- **NEXT_ACTION concluída:** Termos e Privacidade validados na Rodada 7.

## Rodada 7 — hero compacto em Contato e páginas legais (04/11/2026)

- Contato, Termos e Privacidade usam o hero compacto do `ArcadeHero`. Alturas (320 → 1440 px): Contato 291/404 → 211/260 px; Termos 354/404 → 274/260 px; Privacidade 319/420 → 239/276 px.
- Preview privado [abrir a Home atualizada](https://6b759de1.tonecosstudio.pages.dev/) — deployment `6b759de1-763c-4145-aa45-29fd6c3a6422`, código `3963059a1ab5b38723cf210f58526af723791f0d`, build/deploy SUCCESS. As rotas `/contato`, `/termos` e `/privacidade` estão no mesmo preview.
- QA nas dez larguras (320–1920 px): sem overflow. Links de e-mail permanecem com 44 px. Typecheck, `catalog:mvp:test` (78/78), check monorepo (9/9), gates de segurança/proxy/SEO (28/28) e Vite build passaram; robots/noindex preservados, sem runtime comercial/Supabase.
- Apenas preview manual; produção e Worker inalterados.

## Rodada 8 — QA responsivo da Home (04/11/2026)

- QA visual em 320, 360, 390, 430, 640, 768, 1024, 1280, 1440 e 1920 px: sem overflow; o hero acompanha 88svh, as grades se ajustam à largura e os modelos em destaque carregam.
- Ações principais medem 56 px; ações de navegação secundária, 44 px. Nenhuma alteração de código na Home.
- **NEXT_ACTION:** continuar QA das interações de busca, paginação e seleção do catálogo no mesmo preview privado.

## Rodada 9 — franquia Street Fighter e alvos móveis (04/11/2026)

- Na página `/universo/games/street-fighter`, o breadcrumb “Raiz da franquia” tinha 16 px de altura; “Ver mais modelos” tinha 20 px. O componente agora aplica alvo mínimo de 44 px, foco visível e o mesmo tratamento aos breadcrumbs das pastas e ao CTA “Explorar todos os modelos”.
- Preview privado [abrir Street Fighter](https://9201bcb6.tonecosstudio.pages.dev/universo/games/street-fighter), deployment `9201bcb6-f3fb-4945-9aac-6cb1a38da974`, ambiente preview, source commit `a0312bb91b533d6830a85e0f5b7524d7ed4c33c2`, build/deploy SUCCESS.
- QA em 320, 360, 390, 414, 768, 1024, 1280, 1440, 1600 e 1920 px: sem overflow; root, breadcrumb, exploração e “Ver mais” medem 44 px. A pasta Akuma lista 6 referências, abre e retorna à raiz; o CTA mantém `category=games&franchise=street-fighter` ao abrir Modelos.
- Gates do Pages: typecheck, `catalog:mvp:test` (78/78), monorepo (9/9), segurança/proxy/SEO (28/28), Vite build e compilação da Pages Function passaram. Preview readonly/noindex; produção, Worker, D1 e R2 inalterados.

## Rodada 10 — interações de Modelos no preview atual (04/11/2026)

- Na mesma versão de preview: página 2 mostra 36 modelos e volta à página 1; busca “androide” retorna 35, limpar restaura 36; adicionar e remover referência alterna `0/50 → 1/50 → 0/50`. Sem overflow. Nenhum pedido ou dado comercial é criado.
- **HEAD funcional validado:** `a0312bb91b533d6830a85e0f5b7524d7ed4c33c2`. PR #4 segue draft; preview manual; produção automática e previews automáticos permanecem desativados.
- **NEXT_ACTION:** seguir por `/universo/filmes-series`, auditar a categoria em larguras móveis e desktop e corrigir somente achados concretos. Não repetir as páginas já aprovadas nem gerar build só por alterações documentais.
- **DO_NOT_REPEAT:** não publicar produção, alterar Worker/D1/R2/DNS, varrer catálogo integral ou criar branch/PR adicional.


## Rodada 11 — categorias restantes e pastas aninhadas (04/11/2026)

- QA das seis categorias do Universo no preview `9201bcb6`: Games, Filmes & Séries, Marvel & DC, Tokusatsu & Cultura Japonesa, Pessoas e Animes & Desenhos. Em cada página, dez larguras (320–1920 px) sem overflow; breadcrumb 44 px, campo e botão de busca 48 px.
- Busca testada na UI: `star` → Star Wars (37 modelos), `batman` → Batman (77), `jaspion` → Jaspion (2), `elvis` → Elvis Presley (1) e `dragon` → Dragon Ball (517). Limpar recupera as contagens completas da listagem.
- Franquias representativas abertas: Star Wars (18 pastas/8 referências), Batman (21/8), Jaspion (2 referências, sem pastas), Elvis Presley (1 referência) e Dragon Ball (14/8). A pasta Batman mostra 8 de 23 modelos e mantém `category=marvel-dc&franchise=batman&folder=batman` ao explorar o catálogo.
- Em Dragon Ball, raiz → Androides → Androide 17 mostrou 2 referências; os três breadcrumbs medem 44 px, os retornos para pai e raiz funcionam e não há overflow nas dez larguras. Imagens carregaram após a consulta completar.
- Sem nova alteração de código: permanece a prévia manual aprovada da Rodada 9, commit funcional `a0312bb91b533d6830a85e0f5b7524d7ed4c33c2`. Produção, Worker, D1 e R2 inalterados.
- **NEXT_ACTION:** revisar uma ficha e galeria com sessão do preview atual, incluindo retorno ao caminho de franquia/pasta e dimensões de miniaturas. Não rebuildar para este registro documental.


## Rodada 12 — fichas e galeria a partir de pasta aninhada (04/11/2026)

- A ficha do Androide 17 abriu a partir de `Dragon Ball → Androides → Androide 17`, carregou a imagem publicada e o link “Voltar à pasta” retornou ao caminho exato da subpasta.
- A ficha do Androide 18 tem duas imagens: selecionar a segunda muda a imagem principal e `aria-pressed`; imagem e miniaturas carregam corretamente.
- Ambas as fichas passaram em 320, 360, 390, 414, 768, 1024, 1280, 1440, 1600 e 1920 px sem overflow. Link de retorno 44 px, seleção 46 px e miniaturas entre 62 e 106 px. A navegação por Tab alcançou “Raiz da franquia” e mostrou contorno dourado sólido de 2 px no alvo de 44 px; a seleção permaneceu vazia.
- Preview protegido `9201bcb6`, source funcional `a0312bb91b533d6830a85e0f5b7524d7ed4c33c2`; sem novo build ou alteração de código nesta rodada. Produção e recursos do Worker continuam intactos.
- **NEXT_ACTION:** seguir por `/universo/marvel-dc/equipes-e-grupos`, revisar busca/franquias de maior volume e foco de teclado. Não repetir testes já aprovados de ficha/galeria nem gerar build somente para documentação.


## Rodada 13 — miniaturas imersivas e pastas responsivas (04/11/2026)

- Referência visual analisada: [STLForge](https://stlforge.cl/stl-models/), com quadro vertical 2:3, imagem em `object-fit: cover` e zoom suave. O padrão foi aplicado às capas da listagem `/modelos` e às referências nas páginas de franquia/pasta; ficha e galeria continuam exibindo a imagem inteira com `contain`.
- Na página `/universo/marvel-dc/equipes-e-grupos`, o grid de pastas usa uma coluna em 320 px para evitar truncar nomes longos; passa a duas a partir de 360 px, três em `sm` e quatro em `lg`.
- **QA do código:** GitHub Actions Quality Gate #41920100209 **completed/success** no SHA `8044a7f2b533a941d59b8cc1bd103a69bae22d49`.
- **Preview privado atualizado:** [abrir Modelos](https://5eff704d.tonecosstudio.pages.dev/modelos), deployment `5eff704d-77be-40fa-b53f-ed2e355d47b3`, commit exato acima; ambiente `preview`, Cloudflare Pages build **SUCCESS** e deploy **SUCCESS**. Configuração remota confirmada: produção na `main`, produção automática desativada e previews automáticos desativados; publicação manual restrita ao preview. Produção, Worker, D1, R2 e DNS inalterados.
- **Responsividade medida:** `/modelos` em 320, 360, 390, 768, 1440 e 1920 px: sem overflow horizontal; grade em 2/2/2/4/5/6 colunas; capas `cover` na proporção 2:3. Página da franquia em 320, 360, 390, 768 e 1440 px: sem overflow, grid de pastas em 1/2/2/3/4 colunas e miniaturas preenchendo os quadros. X-Men aninhado também conferido a 320 px, com rótulos inteiros.
- **NEXT_ACTION:** continuar a revisão página por página pela Home, priorizando hero, imagens, navegação e layout em 320/390/768/1440 px. Manter a PR #4 em draft; não publicar produção nem refazer builds só por documentação.


## Rodada 14 — Home com capas imersivas e grade de tablet (04/11/2026)

- As seis capas de destaque da Home agora usam proporção 2:3, `object-fit: cover` e zoom suave no hover, sem a margem escura interna. Fichas e galerias continuam preservando a imagem inteira.
- Grid da Home: 2 colunas no celular, 3 a partir de `sm`, 4 em `lg` e 6 em `xl`. O tablet de 768 px passa a mostrar três destaques por linha, evitando miniaturas estreitas.
- **Quality Gate:** GitHub Actions #41923699109 **completed/success** no SHA `5da7c74ea9c33f37964139dddfa86533d50b7897`.
- **Preview final:** [abrir Home](https://a00e389a.tonecosstudio.pages.dev/), deployment `a00e389a-939b-4ddc-bba4-91cb1265de7e`, SHA exato acima; Cloudflare Pages build **SUCCESS** e deploy **SUCCESS**, ambiente `preview`. Configuração remota manteve `main` como produção com deployments automáticos desligados e previews automáticos desativados. Produção, Worker, D1, R2 e DNS inalterados.
- **QA responsivo da Home:** 320/390/768/1024/1280/1440 px sem overflow horizontal; grade em 2/2/3/4/6/6 colunas; seis imagens conferidas em `cover`, proporção 2:3.
- **NEXT_ACTION:** continuar a revisão detalhada pela página Sobre em 320/390/768/1440 px; manter PR #4 em draft e não refazer build por documentação.

## Rodada 15 — página Sobre e FAQ acessível (04/11/2026)

- O FAQ agora expõe o estado aberto/fechado com `aria-expanded`, liga cada botão ao painel correspondente e mantém foco visível dourado no teclado. A área de pergunta pode quebrar linha em celular; os alvos mantêm pelo menos 44 px de altura.
- **Quality Gate:** [#41926515835](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41926515835) **SUCCESS** no SHA `6287a342078f5b4bf6a47f29850e949d56e22cc1` (job aplicável concluído com sucesso; demais jobs condicionais ignorados).
- **Preview atualizado:** [abrir Sobre](https://5efaa52b.tonecosstudio.pages.dev/sobre), deployment `5efaa52b-44f1-44d3-b9b6-1c721b052974`; build e deploy **SUCCESS** no mesmo SHA, ambiente `preview`. As configurações de produção automática desligada e preview automático desativado foram preservadas.
- QA visual em 320/390/768/1440 px: sem overflow horizontal; valores e produção usam 1/1/2/4 e 1/1/2/3 colunas; FAQ manteve controles utilizáveis. Teste manual por Space abriu/fechou o painel, sincronizou `aria-expanded` e `hidden`, e exibiu o contorno de foco de 2 px. Nenhum erro no console.
- Sem alteração de produção, Worker, D1, R2 ou DNS. PR #4 segue draft. **NEXT_ACTION:** continuar pela página Contato, revisar o formulário por e-mail e responsividade em 320/390/768/1440 px.


## Rodada 16 — Contato responsivo no preview atual (04/11/2026)

- QA do componente público `PublicCatalogContact` no preview protegido mais recente, sem acionar o link `mailto:`.
- Em 320, 390, 768 e 1440 px, não houve overflow horizontal. Hero com 211/211/248/260 px; botão de e-mail 143×44 px; ações “Ver Modelos” 188×48 px e “Início” 116×44 px. As ações empilham no celular e ficam em linha a partir de 768 px.
- O texto explicativo quebra sem ultrapassar o card. Navegação por teclado mostrou contorno dourado de foco com 2 px no link de e-mail.
- Preview privado: [Contato](https://3bc09d16.tonecosstudio.pages.dev/contato), deployment `3bc09d16-0dff-41bf-91ae-e65712e95eb2`, build e deploy SUCCESS no SHA de código `446ab60396c96e64f31892d9bbf14253d0b96c57`. Nenhuma mensagem foi enviada; produção e Worker inalterados.
- **NEXT_ACTION:** revisar a rota 404 responsiva no preview atual. Manter a PR #4 draft e não gerar build por atualização documental.


## Rodada 17 — rota 404 pública responsiva (04/11/2026)

- A rota pública usa uma seção nomeada dentro do `main` de `ArcadeFrame`, sem `main` aninhado nem papel de status aplicado à página inteira. O conteúdo preserva a identidade arcade.
- Layout com 16 px de margem em telas estreitas, tipografia responsiva e link SPA com alvo mínimo de 44 px e foco visível.
- Preview privado: [abrir a rota 404](https://7f927529.tonecosstudio.pages.dev/__qa-not-found), deployment `7f927529-577e-43f8-95d4-f2a6cb24df03`, ambiente `preview`, commit de código `a05ed4cfa180092cf74964f563c64115edba8b34`; Pages build/deploy SUCCESS. Pipeline de preview executou typecheck, catálogo MVP (78 testes), verificações de segurança/proxy/SEO e Vite build.
- QA no navegador em 320/390/768/1440 px: sem overflow; larguras do documento 314/384/762/1434 px; exatamente um `main`; CTA “Ver modelos” com 130×44 px em todas as larguras. Foco de teclado confirmado com contorno dourado sólido de 2 px e offset de 2 px; console sem erros.
- Produção, Worker, D1, R2 e DNS inalterados. **Rodada concluída.**

## Rodada 18 — espaçamento responsivo em Termos (04/11/2026)

- Em `TermsArcadeView`, abaixo do breakpoint `sm`, a seção usa 16 px de margem interna, os cards 16 px de padding e a linha entre numeração e texto 12 px de gap. Em telas maiores permanecem os espaçamentos anteriores; texto legal preservado.
- Preview privado: [abrir Termos](https://cde8393a.tonecosstudio.pages.dev/termos), deployment `cde8393a-0488-4f07-98e0-f3097ee2db17`, ambiente `preview`, commit de código `f690bb237bdba91ab07bf143ca89fa82ed1b7acc`; Pages build/deploy SUCCESS.
- QA em 320/390/768/1440 px: sem overflow; largura do parágrafo 196/266/608/742 px e primeira regra em 7/5/2/2 linhas. CTA mede 198×48 px; console sem erros. A página mantém os sete tópicos e o contato legal.
- A captura automática de tela não ficou disponível nesta sessão; medições do layout e conteúdo foram conferidos no navegador. Produção e serviços do catálogo inalterados.

## Rodada 19 — espaçamento responsivo em Privacidade (04/11/2026)

- `PrivacyArcadeView` agora usa os mesmos espaçamentos responsivos de Termos: seção com `px-4 sm:px-6`, cards e contato com `p-4 sm:p-6`, linha com `gap-3 sm:gap-4`. Nenhum texto da política foi alterado.
- Preview privado: [abrir Privacidade](https://3c28acd5.tonecosstudio.pages.dev/privacidade), deployment `3c28acd5-66b2-47e0-acc4-3faebea77313`, ambiente `preview`, commit de código `4a51b38cfaac14c5bdff6d987e25f6e6d306a9aa`; build/deploy SUCCESS.
- QA em 320/390/768/1440 px: sem overflow; documento com 314/384/762/1434 px; parágrafos dos cards com 196/266/608/742 px e no máximo 9/6/3/2 linhas, respectivamente. Ações medem 198×48 px (“Ver Universo”) e 116×44 px (“Início”); console sem erros.
- Captura automática de tela indisponível por timeout no navegador desta sessão; árvore acessível, conteúdo e medidas de layout foram conferidos. Produção, Worker, D1, R2 e DNS inalterados. PR #4 segue draft.
- **NEXT_ACTION concluída:** `/modelos` e o painel Minha seleção foram revisados nas Rodadas 20–21; seguir pela próxima área com pendência concreta no catálogo, sem build só por documentação.


## Rodada 20 — grade, filtros e capas em /modelos (04/11/2026)

- QA na página do catálogo: 36 cards na primeira página, paginação mantida e seleção vazia por padrão. Em 320/390/768/1440 px: sem overflow e grade de 2/2/4/5 colunas.
- As imagens das capas carregam em `cover` no quadro 2:3. Busca e selects medem 48 px; o campo de busca por franquia mede 44 px.
- Os filtros são carregados sob demanda quando abertos. O select apresentou as seis categorias publicadas; “Marvel & DC” atualizou o parâmetro da URL e os resultados, e limpar restaurou `/modelos`.
- Preview privado de QA: [Modelos](https://3c28acd5.tonecosstudio.pages.dev/modelos), deployment `3c28acd5-66b2-47e0-acc4-3faebea77313`, build/deploy SUCCESS. Console sem erros; nenhuma seleção foi deixada salva.

## Rodada 21 — alvo de toque do painel Minha seleção (04/11/2026)

- O botão de fechar do componente compartilhado `SheetContent` media 16×16 px. `src/components/ui/sheet.tsx` agora oferece alvo de 44×44 px, preserva o foco visível e expõe o rótulo acessível “Fechar”.
- Preview privado: [abrir Modelos](https://6fa8ce1b.tonecosstudio.pages.dev/modelos), deployment `6fa8ce1b-6995-41b3-a2a8-b10c2bb88a70`, ambiente `preview`, commit de código `77856cba0e971948d2b2ee2d142139ccdf3b60a5`; build/deploy SUCCESS.
- Pipeline do Pages: typecheck, catálogo MVP `78/78`, verificação monorepo `9/9`, segurança/proxy/SEO `28/28`, Vite build e compilação da Pages Function concluídos.
- QA com o painel aberto em 320/390/768/1440 px: botão “Fechar” 44×44 px, com offset de 16 px do topo e da direita; painel sem overflow e com 320/390 px em mobile e 448 px em desktop. Fechar encerra o painel; seleção permaneceu vazia; console sem erros.
- Produção, Worker, D1, R2 e DNS inalterados. PR #4 segue draft.
- **NEXT_ACTION:** continuar a inspeção da próxima área pública do catálogo na mesma PR e só gerar nova prévia para alterações de código.

## Rodada 22 — alvos de toque em mobile e tablet (04/11/2026)

- **Branch/base:** PR #4 permanece open/draft em `integration/tonecosstudio-canonical-20261101`; base observada `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`. Código validado no SHA `6994e2d095eeed53cb6a09b6f6751a20c6ae6a16`.
- **Achado e correção:** no mobile, o link de marca do cabeçalho tinha 28 px de altura e os quatro links de navegação do rodapé próprio da Home tinham 12 px. Em 1024 px, a navegação desktop tinha links de 15 px. O logo, os links do menu desktop e os quatro links da Home agora têm área mínima de 44 px; rótulos e aparência visual foram preservados.
- **QA responsivo no preview:** Home, Modelos, Universo, Marvel & DC, Equipes e Grupos, ficha de Anjo, Sobre, Contato, Termos e Privacidade verificados em 320, 360, 390, 640, 768, 1024, 1440 e 1920 px. Nenhuma das 80 combinações apresentou rolagem horizontal. Em 320 px, marca/menu/links da navegação móvel têm 44 px; o botão de seleção da ficha tem 46 px e a miniatura da galeria 62 px. Em 1024 px, links da navegação desktop têm 44 px. O menu móvel abre com links de 44 px e fecha corretamente.
- **Fluxo de conteúdo:** a ficha de Anjo carregou e exibiu uma imagem publicada; console sem erros. A Home exibiu seis cards e nenhuma imagem quebrada entre as imagens carregadas.
- **Preview privado atual:** [abrir Home](https://693d03d5.tonecosstudio.pages.dev/), deployment `693d03d5-cf70-410f-b7fc-db95267e4c10`, ambiente `preview`, fonte SHA `6994e2d095eeed53cb6a09b6f6751a20c6ae6a16`; Cloudflare Pages build/deploy SUCCESS. O build configurado executa typecheck, `catalog:mvp:test` e `npm run build`.
- Produção, main, Worker, D1, R2 e DNS inalterados. A PR continua draft; sem merge/publicação.
- **next_action:** continuar QA visual página por página, incluindo filtros e galeria em diferentes larguras, e gerar nova prévia apenas após outra alteração de código.
- **do_not_repeat:** não gerar outra build por atualização documental; não ativar previews automáticos, alterar a main, Worker/D1/R2/DNS, SEO público ou produção; não misturar QA visual pendente de capas com a checagem responsiva de layout já concluída nesta rodada.

## Rodada 23 — continuidade responsiva: ficha, contato e Universo (05/11/2026)

- **Objetivo contínuo:** manter a revisão do frontend página por página na mesma PR #4 e no preview privado manual. O objetivo persistente já cobre essa continuidade; este checkpoint registra o próximo passo sem abrir meta duplicada.
- **Preview usado:** [Tonecos Studio](https://693d03d5.tonecosstudio.pages.dev/), ambiente privado, source code SHA `6994e2d095eeed53cb6a09b6f6751a20c6ae6a16`. Nenhuma mudança de código nesta rodada.
- **Ficha e galeria:** Aang, Appa & Momo abriu com a imagem publicada (1600 px de largura natural). Em 320/390/768/1024/1440 px, o documento não excedeu a viewport (larguras medidas: 314/384/762/1018/1434 px); imagem e ficha se ajustam, com duas colunas em 1024 px e acima. Botão de seleção, retorno e miniatura mantiveram alvos de pelo menos 44 px.
- **Universo:** em 320/390/768/1024/1440 px, sem overflow horizontal. A grade de categorias passou de 2 colunas no celular para 3 em 768 px e 4 a partir de 1024 px. As seis imagens das categorias carregaram; botões/links medidos mantêm 44 px ou mais.
- **Contato:** conferência adicional a 320 px sem overflow e sem alvos de toque abaixo de 44 px; nenhum link de e-mail foi acionado.
- Não houve correção de código necessária, novo build ou novo deployment. Produção, Worker, D1, R2 e DNS inalterados; PR #4 segue open/draft.
- **NEXT_ACTION:** auditar a página 2 de /modelos em 320/390/768/1024/1440 px, incluindo paginação, preservação de busca/filtros e tamanho dos alvos; alterar código e gerar preview novo apenas diante de um problema reproduzível.

## Backend — preflight M5 mais seguro (05/11/2026)

- **Escopo isolado do layout:** apenas `scripts/catalog/cutover-readiness.mjs`, respectivo teste e filtro por path do workflow Quality existente; nenhuma alteração na UI, no Worker staged, em Pages Function, D1/R2 ou segredos.
- **Correção:** o preflight agora exige ausência comprovada de runs `requested`, `waiting`, `pending`, `queued` e `in_progress` do publicador Washington; verifica repositório de destino, conta/Worker Cloudflare e evidência explícita de rollback. Estado desconhecido permanece bloqueado. A verificação só lê metadados GitHub/Cloudflare; nenhum deploy ou SQL.
- **Commits:** `3ba44a0` (preflight), `aab4f4d` (testes), `230623e` (acionamento do CI existente). PR #4 segue open/draft, base `fdd2992`. O gate na revisão `230623e` foi iniciado em [GitHub Actions #41969042567](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41969042567); **resultado ainda pendente no momento deste registro**.
- **NEXT_ACTION:** verificar os testes offline desse SHA. M5 segue BLOCKED até GO específico, controle exclusivo do writer Washington, evidência real de rollback e credenciais autorizadas; nenhuma promoção antecipada.
- **DO_NOT_REPEAT:** não abrir PR/branch extra, não refazer build frontend só por docs, não consultar D1/R2, não implantar Worker nem alterar main ou produção.

## Rodada 24 — paginação e alvos de busca em /modelos (05/11/2026)

- **Achado e correção:** o botão “Limpar busca” media 36×36 px. Em `src/pages/CatalogModelsArcade.tsx`, agora mede 44×44 px e tem contorno dourado de foco por teclado, com 2 px.
- **Commit de código:** `411088b71232221acac59014491667e9ed95cfbd` (`fix: enlarge mobile clear-search target`).
- **Preview privado:** [Modelos filtrado](https://ea55cd12.tonecosstudio.pages.dev/modelos?q=batman&category=marvel-dc), deployment `ea55cd12-7a7a-4ae6-93b2-469b91b8cad9`, ambiente `preview`; build e deploy SUCCESS no SHA do código. O build configurado executou typecheck, `catalog:mvp:test` e `npm run build`.
- **QA da página 1 e da página 2:** em 320/390/768/1024/1440 px, documento sem overflow (314/384/762/1018/1434 px), grade 2/2/4/4/5 colunas e 36 modelos por página. Limpar busca mede 44 px; paginação inferior mede 48 px. Não foram encontrados alvos abaixo de 44 px.
- **Fluxo conferido:** busca “batman” + categoria Marvel & DC chegaram à página 2 sem perder os parâmetros; limpar a busca por Enter removeu `q` e preservou `category=marvel-dc`, voltando à página 1. O foco do teclado no botão mostrou contorno dourado sólido de 2 px.
- Produção, Worker, D1, R2 e DNS inalterados. PR #4 segue open/draft; preview manual permanece privado.
- **NEXT_ACTION:** revisar os estados vazio e inválido da busca em 320–768 px; corrigir somente problemas reproduzíveis e manter o próximo passo na mesma PR.

## Rodada 25 — estados de busca e revisão mobile do acervo (05/11/2026)

- **Busca em `/modelos`:** `?q=ab` exibe a orientação para usar ao menos três caracteres; uma busca sem correspondências informa que nenhum modelo publicado atende aos filtros; `?q=` volta ao acervo completo com 36 modelos e 36 imagens. O botão de limpar aparece somente com texto na busca e mede 44×44 px.
- **QA responsivo da busca:** 320/390/768 px, largura do documento 314/384/762 px, sem overflow horizontal. Campos, filtros e botão Buscar medem de 44 a 48 px de altura; nenhum dos 36 cards estoura seu próprio container.
- **Fichas de modelo:** `/modelos/nier-10h-nier` e o título longo `/modelos/adao-negro-adao-negro-estatua-cinza-sobre-destrocos` conferidos em 320/390/768 px. Sem overflow; o título quebra em linhas; Voltar ao catálogo mede 44 px, Adicionar à seleção 46 px e seletor de imagem de 62 a 106 px.
- **Universos:** `/universo` e `/universo/marvel-dc/equipes-e-grupos` conferidos em 320/390/768 px. Sem overflow horizontal ou textos/cards transbordando; a página de grupos mostra 4 pastas e 8 modelos, com imagens `object-fit: cover` preenchendo os cards.
- **Preview privado verificado:** [Equipes e grupos](https://ea55cd12.tonecosstudio.pages.dev/universo/marvel-dc/equipes-e-grupos), deployment `ea55cd12-7a7a-4ae6-93b2-469b91b8cad9`, build/deploy SUCCESS no commit `411088b71232221acac59014491667e9ed95cfbd`. O arquivo da listagem de modelos no HEAD consultado tem o mesmo blob SHA do incluído nesse deployment. Os 17 commits entre ele e o HEAD `aa5055a32491e6571c64c8a370b4a0c24f22d0dc` alteram apenas documentação, configuração de consolidação, scripts/testes e workflow, sem mudança de frontend; não refiz o build por commits sem alteração visual.
- Não houve defeito reproduzível nesta rodada; nenhum arquivo de UI foi alterado. Produção, Worker, D1, R2 e DNS continuam inalterados. PR #4 permanece open/draft.
- **NEXT_ACTION:** localizar uma ficha com várias imagens publicadas e validar a galeria e seus alvos de toque em 320/390/768 px; depois continuar pelas páginas de categoria e detalhes do acervo, corrigindo somente problemas reproduzíveis.


## Rodada 26 — galeria, busca e preview atualizado (05/11/2026)

- **Atualização necessária:** a branch recebeu mudanças funcionais no proxy do Pages e no gateway público do catálogo depois do deployment `ea55cd12`. Criei uma nova prévia privada no commit `dfee04ad4459d84599a79bf8d5c5e2b1f09cfd5b`: [Tonecos Studio preview](https://188e1855.tonecosstudio.pages.dev), deployment `188e1855-62bc-4ecb-8188-b5d24e36fe6a`. Ambiente `preview`, com `VITE_PREVIEW_READ_ONLY=true` e `VITE_PUBLIC_CATALOG_MVP=true`; todos os estágios concluíram SUCCESS. Os logs confirmam `npm ci`, `npm run typecheck`, `npm run catalog:mvp:test` e `npm run build`. Não alterei Worker, D1, R2, DNS ou produção.
- **Ficha de quatro imagens:** `/modelos/dragon-ball-androide-18-traje-casual-frente` validada na prévia nova em 320/390/768 px. Documento 314/384/762 px, sem overflow; miniaturas de 62/79/106 px cabem na faixa. Selecionar a quarta miniatura atualiza o estado acessível e a imagem principal (asset carregado com 1600 px de largura).
- **Busca na prévia nova:** `?q=ab` mostra a orientação de mínimo de três caracteres; uma consulta sem correspondências mostra o estado vazio; `?q=` retorna 36 cards e 36 imagens. Em 320 e 768 px não há overflow horizontal.
- **Categoria na prévia nova:** `/universo/animes-desenhos` exibe 24 franquias e 24 imagens sem overflow em 320/390/768 px. A busca “dragon” retorna Dragon Ball (517 modelos); com dois caracteres, Buscar franquias permanece desabilitado. Console sem erros.
- PR #4 segue open/draft. O HEAD funcional do site corresponde ao commit implantado; este checkpoint altera apenas `URGENTE.md`. Produção e serviços auxiliares permanecem intactos.
- **NEXT_ACTION:** revisar `/universo/animes-desenhos/dragon-ball` em 320/390/768 px, incluindo listagem de modelos e retorno; continuar pelas demais categorias e corrigir apenas problemas reproduzíveis.

## Rodadas 27–28 — franquias Dragon Ball e Naruto, preview atualizado (05/11/2026)

**Meta contínua atualizada:** seguir pelas franquias públicas, conferindo navegação, pastas, modelos filtrados e paginação em 320/390/768 px; corrigir somente defeitos reproduzíveis na PR #4; publicar preview privado após mudanças funcionais e registrar a próxima rota aqui. Produção e recursos do Worker permanecem fora de escopo.

- **Preview privado exato:** [abrir Modelos — página 2](https://d6f94b5d.tonecosstudio.pages.dev/modelos?category=animes-desenhos&franchise=dragon-ball), deployment `d6f94b5d-2c43-431d-a05b-944e3cc17a23`, ambiente preview, commit `758f0fc465bb78ce04b64bb4d66f1cbfc528ae0f`. Build e deploy SUCCESS. Pipeline registrado nos logs: `npm ci`, `npm run typecheck`, catálogo MVP **79/79**, monorepo **9/9**, verificações de segurança/proxy/SEO **32/32**, Vite build e compilação da Pages Function. O novo teste confirma que erros upstream não recebem cache público; o proxy também aplica `Content-Security-Policy: sandbox`.
- **Dragon Ball:** raiz em 320/390/768 px sem overflow; 14 pastas e 8 referências com imagens carregadas. Grade de pastas 1/2/3 colunas; modelos 2/2/3. A subpasta Dragon Ball Super carregou Jiren e duas referências; breadcrumbs “Raiz da franquia” e “Dragon Ball Super” medem 44 px e o retorno à raiz funciona.
- **Modelos Dragon Ball:** páginas 1 e 2 mostram 36 modelos cada. Em 320/390/768 px, sem overflow (largura do documento 314/384/762 px) e grade 2/2/4. A página 2 começa em Bulma, mantém `category=animes-desenhos&franchise=dragon-ball` e carrega imagens pela rota first-party; retorno à página 1 preserva os filtros.
- **Naruto:** raiz com 18 pastas e 8 referências; Akatsuki com 11 subpastas e 8 referências visíveis. Nas duas rotas, 320/390/768 px sem overflow; grades de pastas 1/2/3 e de modelos 2/2/3. Breadcrumbs medem 44 px. “Explorar todos os modelos” preserva `category=animes-desenhos&franchise=naruto&folder=akatsuki`; a listagem apresenta 13 modelos e, em 320/390/768 px, grade 2/2/4 sem overflow. Console sem erros.
- Nenhum defeito de layout reproduzível encontrado nessas rotas; não houve mudança de UI nesta rodada. Preview é readonly. Produção, Worker, D1, R2 e DNS não foram alterados. PR #4 permanece open/draft.
- **NEXT_ACTION:** revisar `/universo/animes-desenhos/one-piece` e a listagem filtrada de One Piece em 320/390/768 px; continuar pelas próximas rotas com dados e navegação aninhada, corrigindo apenas problemas confirmados.

## Rodada 29 — franquia One Piece e modelos filtrados (05/11/2026)

- QA no preview privado atualizado [One Piece](https://d6f94b5d.tonecosstudio.pages.dev/universo/animes-desenhos/one-piece), deployment `d6f94b5d-2c43-431d-a05b-944e3cc17a23`, ambiente `preview`, código funcional `758f0fc465bb78ce04b64bb4d66f1cbfc528ae0f`. A PR #4 segue open/draft; o HEAD atual `2e6e074` acrescenta apenas este checkpoint documental. Não foi necessário novo build.
- Raiz de One Piece: **22 pastas e 8 referências**. Em 320/390/768 px, documentos de 314/384/762 px, sem overflow. Grade de pastas 1/2/3 colunas e referências 2/2/3. O rótulo longo “Akainu x Kizaru x Aokiji” cabe sem corte ou overflow; alvo da pasta é maior que 44 px.
- Pasta Luffy: 4 referências; dois breadcrumbs com 44 px; grade 2/2/3 sem overflow nas mesmas larguras. “Explorar todos os modelos” preserva `category=animes-desenhos&franchise=one-piece&folder=luffy`; a lista mostra 4 modelos e grade 2/2/4.
- Da raiz, “Explorar todos os modelos” preserva `category=animes-desenhos&franchise=one-piece` e exibe 27 modelos na página 1. Em 320/390/768 px, sem overflow, grade 2/2/4; as imagens visíveis carregaram. Console sem erros.
- Não encontrei problema de UI reproduzível; não houve alteração de código nesta rodada. Preview permanece readonly. Produção, Worker, D1, R2 e DNS inalterados.
- **NEXT_ACTION:** revisar a franquia de Animes & Desenhos com mais de 36 modelos (Tartarugas Ninja) a partir da busca/lista da categoria, conferindo pasta, busca e paginação responsiva em 320/390/768 px.

## Rodada 30 — Tartarugas Ninja, busca e página 2 (05/11/2026)

- QA no [preview privado do catálogo](https://d6f94b5d.tonecosstudio.pages.dev/universo/animes-desenhos/as-tartarugas-ninja), deployment `d6f94b5d-2c43-431d-a05b-944e3cc17a23`, código funcional `758f0fc465bb78ce04b64bb4d66f1cbfc528ae0f`. PR #4 continua open/draft; o HEAD `9fdf82c` contém apenas checkpoints documentais além desse código. Preview readonly; sem novo build.
- **Categoria e busca:** `/universo/animes-desenhos` lista 24 franquias. Em 320/390/768 px, documentos 314/384/762 px, grade 2/2/3, busca com 48 px e sem overflow; 24 imagens carregaram. A busca “Tartarugas Ninja” retorna a franquia correta com 44 modelos, e a abertura do resultado leva à rota canônica.
- **Franquia e pasta:** raiz de As Tartarugas Ninja com 14 pastas e 8 referências; sem overflow em 320/390/768 px, grades 1/2/3 e 2/2/3. Breadcrumb mede 44 px. A pasta Michelangelo abre 6 referências e preserva o contexto ao explorar Modelos; os breadcrumbs medem 44 px e a grade fica em 2/2/3 na pasta e 2/2/4 na listagem filtrada.
- **Paginação:** filtro `category=animes-desenhos&franchise=as-tartarugas-ninja` mostra 36 modelos na página 1 e 8 na página 2. A página 2 começa em Slash, mantém os filtros e carrega as 8 imagens. Em 320/390/768 px, as duas páginas não têm overflow (documento 314/384/762 px), com grade 2/2/4. O retorno à página 1 restaura os 36 itens. Console sem erros.
- Nenhum defeito de UI reproduzível; sem alteração de código nesta rodada. Produção, Worker, D1, R2 e DNS inalterados.
- **NEXT_ACTION:** revisar Star Wars na categoria `/universo/filmes-series` e no catálogo filtrado, incluindo a página 2 de 37 modelos, folders, busca e retorno em 320/390/768 px.
## Rodada 31 — Star Wars, busca, pastas e página 2 responsivas (05/11/2026)

**Meta contínua atualizada:** percorrer as franquias públicas priorizando volume e lacunas de navegação; revisar busca, pastas, listagens, paginação e retorno em 320/390/768 px; corrigir somente defeitos reproduzíveis; publicar preview privado para mudanças funcionais e registrar o próximo passo. Produção, Worker, D1, R2 e DNS seguem fora de escopo. Nenhuma migration Supabase foi executada.

- **Preview final:** [Star Wars — página 2](https://c292ea1c.tonecosstudio.pages.dev/modelos?category=filmes-series&franchise=star-wars), deployment `c292ea1c-4b77-4deb-8b0f-e49c7e9c88ee`, ambiente `preview`, código `dfe747943fa553e41e3bdf4c977beeb9140d2acc`. Build e deploy SUCCESS. O build executou `typecheck`, catálogo MVP **6/6 arquivos e 92/92 testes**, verificações existentes do Worker/proxy e `vite build`. O preview mantém `VITE_PREVIEW_READ_ONLY=true`.
- **Ajuste reproduzível:** a contagem da página passou a respeitar singular e plural (`1 modelo`, `36 modelos`) em `CatalogModelsArcade.tsx`. A primeira build da alteração revelou duas expectativas de teste com o texto antigo; ambas foram atualizadas em seguida e a build final passou.
- **Categoria e busca:** no preview anterior `ff6ba077` (commit `e3e8b47`), `/universo/filmes-series` exibiu 24 franquias; buscar “Star Wars” reduziu a grade a um resultado com 37 modelos. Em 320/390/768 px, documentos mediram 314/384/762 px, sem overflow; grade 2/2/3, 24 imagens carregadas e busca com 48 px.
- **Franquia/pasta:** Star Wars tem 18 pastas e 8 referências na raiz. A pasta Darth Vader exibe 8 referências; os dois breadcrumbs medem 44 px. Em 320/390/768 px, sem overflow; grades de pastas 1/2/3 e referências 2/2/3. “Explorar todos os modelos” preserva `category=filmes-series&franchise=star-wars&folder=darth-vader`; a listagem contém 8 modelos e usa grade 2/2/4.
- **Paginação no preview final `c292ea1c`:** página 1 com 36 modelos; página 2 com Yoda e o texto corrigido “1 modelo nesta página”. Em 320/390/768 px, sem overflow (documento 314/384/762 px), grade 2/2/4, imagem carregada e filtros de categoria/franquia preservados. Voltar retorna aos 36 modelos e mantém os filtros. Console sem erros.
- PR #4 permanece open/draft. O preview `c292ea1c` representa o frontend público validado no commit `dfe7479`; os commits posteriores observados nesta rodada tocaram documentação, serviço administrativo de orçamento e migrations Supabase, sem alterar as telas públicas. Nenhuma migration foi executada; produção, Worker, D1, R2 e DNS inalterados.

- **NEXT_ACTION:** revisar O Senhor dos Anéis (`/universo/filmes-series/o-senhor-dos-aneis`, 44 modelos), incluindo busca da categoria, pastas, listagem filtrada, página 2 e retorno em 320/390/768 px.

## Rodada 32 — O Senhor dos Anéis, pastas e paginação responsiva (05/11/2026)

- **Rotas conferidas:** raiz de O Senhor dos Anéis com 44 modelos, 24 pastas e 8 referências; Aragorn com 4 referências. Breadcrumbs medem 44 px. “Explorar todos os modelos” preserva categoria, franquia e pasta.
- **QA no preview anterior:** em 320/390/768 px, documentos de 314/384/762 px, sem overflow; grade de pastas 1/2/3 colunas e referências 2/2/3. A listagem filtrada mostra 36 modelos na página 1 e 8 na página 2. A página 2 preserva os filtros, carrega as 8 miniaturas e mantém a grade 2/2/4; voltar restaura a página 1.
- **Revalidação no preview final:** O Senhor dos Anéis foi conferido novamente em `7071d9e9`: as 24 pastas exibem as contagens no singular/plural corretos, inclusive “1 modelo”; raiz responsiva em 320/390/768 px, sem overflow. Na listagem, as páginas 1 e 2 preservam `category=filmes-series&franchise=o-senhor-dos-aneis`; página 2 tem 8 modelos e 8 imagens carregadas, sem overflow nas três larguras.

## Rodada 33 — contagem de pastas e prévia atualizada (05/11/2026)

**Meta contínua atualizada:** avançar pelos recortes do acervo com maior volume, conferindo navegação, subpastas, imagens, filtros, paginação e retorno em 320/390/768/1024/1440 px; corrigir apenas defeitos reproduzíveis na mesma PR; criar uma prévia privada para mudanças funcionais e registrar aqui o próximo foco. Produção, Worker, D1, R2 e DNS seguem fora de escopo; migrations Supabase continuam sem execução.

- **Defeito reproduzível corrigido:** pastas com uma peça mostravam “1 modelos”. `CanonicalUniverseFolders.tsx` agora pluraliza conforme a contagem. O teste de integração cobre “1 modelo” e “3 modelos”.
- **Build recuperado:** duas prévias iniciais revelaram falhas de TypeScript existentes na branch (entrada comercial ainda ausente, tipo de nota do RPC e uso de `replaceAll` incompatível com o alvo configurado). Ajustes mantiveram o caminho comercial desativado até existir uma entrada compilável e alinharam os tipos/formatação; nenhuma migration ou ação em produção.
- **Prévia final:** [Tonecos Studio — Equipes e Grupos](https://7071d9e9.tonecosstudio.pages.dev/universo/marvel-dc/equipes-e-grupos?folder=x-men/viloes), deployment `7071d9e9-64f7-4cb3-88ec-45fd42a60e69`, ambiente preview, commit de código `7fa188512e33d64254889525ff0ef0edaa97cda1`. Build e deploy SUCCESS; pipeline passou por typecheck, catálogo MVP **8/8 arquivos e 108/108 testes**, verificações existentes da Pages Function e build Vite. Preview permanece readonly.
- **Marvel & DC / Equipes e Grupos:** raiz com 4 pastas e 354 modelos. Guardiões da Galáxia tem 6 subpastas e 15 modelos; “Explorar todos os modelos” preserva `category=marvel-dc&franchise=equipes-e-grupos&folder=guardioes-da-galaxia`. Corrigi e confirmei “1 modelo”, “6 modelos” e demais plurais. Raiz, pasta e listagem filtrada sem overflow entre 320 e 1440 px; a listagem de Guardiões exibe 15 modelos.
- PR #4 continua open/draft. A branch recebeu depois do commit do preview `9c61145`, que só centraliza rotas comerciais e atualiza testes comerciais; não altera o frontend público conferido neste preview. Produção, Worker, D1, R2 e DNS inalterados.

## Rodada 34 — X-Men e subpasta Vilões (05/11/2026)

- **X-Men:** raiz de 208 modelos com 26 subpastas e 8 referências de prévia. A contagem singular funciona nas pastas com um item. Sem overflow em 320/390/768/1024/1440 px; breadcrumbs com 44 px. A listagem mantém categoria/franquia/pasta e mostra 36 modelos em cada uma das páginas 1 e 2; todas as 36 miniaturas da página 2 carregaram, sem falhas. Página 1 foi conferida em 320/390/768 px e página 2 nas cinco larguras.
- **Vilões:** 46 modelos, 10 subpastas e 8 referências. Os três breadcrumbs medem 44 px. Em 320/390/768 px, sem overflow; grades de pastas 1/2/3 e referências 2/2/3. A listagem mantém `folder=x-men/viloes`, com 36 modelos na página 1 e 10 na página 2; as 10 imagens da página 2 carregaram sem falhas e a grade ficou em 2/2/4 nas três larguras.
- Sem alteração adicional de layout necessária. O preview validado é readonly; nenhum dado comercial, banco ou serviço de produção foi alterado.


## Rodada 35 — Magneto e gate funcional orientado pela SSOT (05/11/2026)

**Meta contínua atualizada:** reduzir a validação manual rota a rota usando a fonte canônica e os componentes compartilhados. Automatizar a navegação e os contratos dos padrões de página; manter inspeção visual para uma amostra responsiva e para layouts/fluxos que realmente sejam diferentes. Depois avançar aos recortes restantes de Marvel & DC. Produção, Worker, D1, R2, DNS e migrations permanecem fora do escopo.

- **SSOT:** dados públicos continuam vindo do Worker pelo `public-catalog-gateway`; pastas e cards usam os mesmos componentes compartilhados. Não é necessário alterar cada rota separadamente.
- **Cobertura funcional ampliada:** `catalog:mvp:test` agora inclui os testes de descoberta canônica, pastas, rota de personagem e rota de detalhes: `CatalogArcade.integration.test.tsx`, `CanonicalUniverseFolders.integration.test.tsx`, `CatalogCharacterArcade.test.tsx` e `ModelDetailsRoute.test.tsx`. A execução do gate na [GitHub Actions #41985822399](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41985822399) passou: **12/12 arquivos, 121/121 testes**. A expansão detectou que a fixture de pastas não respeitava o contrato do Worker; IDs-filhos aninhados e `hasChildren: false` alinharam o teste à SSOT.
- **Limite da automação atual:** esses testes cobrem funcionamento e rotas, não renderização real em cada largura. A checagem visual continua em larguras representativas; a próxima melhoria de processo é automatizar um smoke de viewport por padrão de página, usando caminhos do catálogo canônico.
- **Prévia privada:** [Magneto no preview](https://ed77b38d.tonecosstudio.pages.dev/universo/marvel-dc/equipes-e-grupos?folder=x-men%2Fviloes%2Fmagneto), deployment `ed77b38d-4b97-43a9-9889-708df34112a5`, código público `c49f85380e37ca245dc05b4b319771050fde72de`; build e deploy SUCCESS. O preview continua readonly.
- **QA de Magneto:** a prévia atual mostra o caminho completo de breadcrumbs e 8 cards de referência. “Explorar todos os modelos” preserva categoria, franquia e pasta; a listagem filtrada contém **11 modelos**. Os componentes públicos usados nesta prévia são os mesmos da checagem responsiva anterior: em 320/390/768 px, larguras de documento 314/384/762 px, sem overflow; breadcrumbs de 44 px.
- PR #4 segue open/draft. HEAD observado `7076feb13968ae25795b634b5afc65901b614c02`; os commits posteriores ao código desta prévia tratam do fluxo administrativo/comercial e de uma migration Supabase ainda não aplicada. Nenhuma alteração em produção, Worker, D1, R2 ou DNS.

**NEXT_ACTION:** criar uma checagem de viewport automatizada por padrão compartilhado (início, universo/franquia/pasta, listagem filtrada e detalhes) com larguras 320/390/768/1024/1440 px e rotas selecionadas da SSOT; então revisar Batman (77 modelos) e seguir pelos próximos recortes.

## Rodada 36 — Universo, capas e contagens (05/11/2026)

**Meta contínua:** manter o frontend público responsivo por padrão compartilhado, usar o catálogo canônico/SSOT e corrigir somente problemas reproduzíveis. Próximo foco: categoria Games e uma navegação de franquia/pasta; não revisar manualmente cada URL quando o mesmo componente atende várias rotas.

- **Melhoria visual em `src/pages/CatalogArcade.tsx`:** capas de categorias e franquias agora ocupam toda a largura do card em quadro 4:3, com `object-cover` e zoom sutil no hover; título e contagem ficam em faixa própria. O layout preserva o estilo Arcade e melhora a leitura das miniaturas em mobile.
- **Defeito corrigido:** `formatModelCountLabel` é compartilhado entre categoria, franquia e pasta, removendo “1 modelos”. Na categoria Marvel & DC, Caçador de Marte e Constantine aparecem como “1 modelo”; os demais mantêm o plural. A busca por Caçador de Marte retorna o recorte canônico com a contagem correta.
- **Responsividade no preview final:** /universo e /universo/marvel-dc conferidos em 320, 390, 768, 1024 e 1440 px. Sem overflow horizontal; grades 2/2/3/4/4. Documento mediu 314/384/762/1018/1434 px. Alvos visíveis de interação com pelo menos 44 px.
- **Imagens:** 6/6 capas da raiz e 24/24 capas de Marvel & DC carregadas após percorrer a lista; zero imagens quebradas. Inspeção visual mobile confirma que o recorte preenche o card e mantém a figura principal legível.
- **CI no commit de código `566dd0733f6a3a37cb8b8811acd8d7f8ac47410c`:** GitHub Actions [Quality Gate #41991679782](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41991679782) concluído com sucesso; teste público MVP: 12 arquivos e 125 testes aprovados. A verificação monorepo, Worker offline, SQLite e Pages proxy também passaram.
- **Preview privado atualizado:** [abrir Universo](https://ef8ab5fb.tonecosstudio.pages.dev/universo), deployment `ef8ab5fb-b6af-4e07-b42b-b08fc5833439`, ambiente `preview`, código exato `566dd0733f6a3a37cb8b8811acd8d7f8ac47410c`, build e deploy SUCCESS. A prévia segue readonly.
- PR #4 continua open/draft. Nenhum deploy de produção, alteração no Worker, D1, R2, DNS ou migration Supabase nesta rodada. A autoridade do catálogo continua no Worker via `public-catalog-gateway`; não foi criada fonte paralela.

**NEXT_ACTION:** revisar `/universo/games`, testar busca por franquia e abrir uma pasta representativa em 320/390/768/1024/1440 px; reutilizar os mesmos padrões e corrigir somente diferenças observadas. Produção, Worker, D1, R2, DNS e migrations seguem fora do escopo.


## Rodada 37 — categorias do Universo e responsividade mobile (05/11/2026)

- **Alteração em `src/pages/CatalogArcade.tsx`:** a sentinela canônica `id=all` deixa de aparecer como card na raiz de `/universo`; o CTA **Ver todos os modelos** continua apontando para `/modelos`. A SSOT mantém categorias, contagens, IDs e capas. Para `animes-desenhos`, o rótulo de apresentação passa a “Animes e Desenhos” e usa `white-space: nowrap` com fonte fluida em telas estreitas.
- **Regressão coberta:** `CatalogArcade.integration.test.tsx` verifica remoção do card, permanência do CTA, texto de uma linha e navegação para a categoria. A primeira execução revelou apenas uma asserção sem espera pelo carregamento; o teste passou a esperar o título. Nenhum comportamento de catálogo/Worker foi alterado.
- **CI do HEAD visualizado `c413238f727e5ea59be1a41321f9df5b7c9f38f2`:** GitHub Actions [Quality Gate #41995982915](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41995982915) success; MVP frontend **16/16 arquivos e 148/148 testes**, além de typecheck e verificações offline do Worker/Pages.
- **Preview privado:** [abrir Universo](https://750f757a.tonecosstudio.pages.dev/universo), deployment `750f757a-ec1a-4aa0-af92-989b5d76138a`, ambiente preview, fonte exata `c413238f727e5ea59be1a41321f9df5b7c9f38f2`. Build e deploy Cloudflare Pages success; `VITE_PREVIEW_READ_ONLY=true`.
- **QA da raiz:** em 320/390/768/1024/1440 px, documento 314/384/762/1018/1434 px, sem overflow; grade 2/2/3/4/4. O título ficou em uma linha (9/10,92/12/12/12 px) e os seis cards de categoria não incluem “Todos”. O CTA segue disponível.
- **Continuidade no mesmo preview:** Games mostra 24 franquias com aviso de lista parcial e busca; grade 2/2/3/4/4, botão e campo de 48 px, sem overflow nas cinco larguras. Street Fighter mantém 24 pastas e oito referências de prévia; Akuma abre seis referências, breadcrumb mínimo de 44 px e filtros preservados em `/modelos?category=games&franchise=street-fighter&folder=akuma`. A pasta não teve overflow em 320/390/768/1024/1440 px.
- PR #4 permanece open/draft. Produção, Worker, D1, R2, DNS e migrations Supabase inalterados.

**NEXT_ACTION:** continuar a revisão do frontend pela Home (`/`) e fluxo responsivo de navegação para modelos; usar SSOT e os componentes compartilhados, corrigindo diferenças reproduzíveis e registrar a próxima prévia privada somente após mudança funcional.

## Rodada 38 — “Todos” removido e título responsivo em /universo (05/11/2026)

- Em `src/pages/CatalogArcade.tsx`, a grade da raiz omite apenas a categoria sentinela `id=all`; categorias, IDs, contagens e capas continuam vindos da SSOT pelo Worker. O CTA **Ver todos os modelos** permanece apontando para `/modelos`.
- O rótulo exibido **Animes e Desenhos** fica em uma linha com `white-space: nowrap`, fonte fluida de 10–14 px e espaçamento compacto no mobile. A regressão cobre a ausência do card, a presença do CTA e a rota correta.
- O teste de integração agora espera o carregamento assíncrono da categoria. Um ajuste separado, somente no setup de teste comercial, define `VITE_CATALOG_QUOTES_ENABLED` antes da importação do módulo; nenhum fluxo/runtime comercial mudou.
- QA no preview final em 320/390/768/1024/1440 px: sem overflow horizontal; largura do documento 314/384/762/1018/1434 px; grade 2/2/3/4/4; seis cards e título em uma linha. Também conferi 360/430/639/640 px sem overflow. A captura final no navegador confirma o CTA e a remoção do card “Todos”.
- GitHub Actions [Quality Gate #41998212637](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41998212637): **17/17 arquivos e 156/156 testes** aprovados, com os demais gates do workflow concluídos.
- Preview privado final: [abrir Universo](https://7e955bb9.tonecosstudio.pages.dev/universo), Cloudflare Pages deployment `7e955bb9-95d2-4f62-9b16-99e83be40a4e`, fonte exata `8f7935495819841e2e77702270165f1108d21798`, build/deploy SUCCESS e `VITE_PREVIEW_READ_ONLY=true`. Home também passou por QA nas larguras 320/390/768/1024/1440 sem overflow; a ficha 10H abriu pelo catálogo e exibiu conteúdo e imagem.
- Produção, Worker, D1, R2, DNS e migrations Supabase inalterados; a PR #4 continua draft.

**NEXT_ACTION:** finalizar QA responsivo de uma ficha de modelo no preview final em 320/390/768/1024/1440 px e então seguir pela listagem do catálogo. Reutilizar componentes e SSOT; criar nova prévia apenas após mudança funcional.

## Rodada 39 — ficha, listagem e pasta responsivas no preview (05/11/2026)

- Preview privado vigente: [abrir Universo](https://7e955bb9.tonecosstudio.pages.dev/universo), deployment `7e955bb9-95d2-4f62-9b16-99e83be40a4e`, fonte de código `8f7935495819841e2e77702270165f1108d21798`; `VITE_PREVIEW_READ_ONLY=true`. O Quality Gate [#41998212637](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41998212637) está concluído com sucesso para esse SHA (17 arquivos/156 testes). PR #4 continua draft; o HEAD atual `e4f86c221c4a3d16cace89518328640accd8bb71` contém o checkpoint documental, sem código novo.
- Ficha `/modelos/nier-10h-nier`: em 320/390/768/1024/1440 px, larguras do documento 314/384/762/1018/1434 px e nenhum overflow horizontal. A grade passa de uma coluna até 768 px para duas em 1024/1440 px. A imagem carregou (largura natural 1600 px); retorno 44 px e botão de seleção 46 px. Seleção permaneceu em 0/50.
- Listagem `/modelos`: 36 itens na primeira página; grade em 2/2/4/4/5 colunas nas cinco larguras, sem overflow. As seis primeiras imagens carregaram e não havia imagens quebradas; busca e botão 48 px, busca de franquias 44 px, paginação e acesso à seleção 44 px.
- Categoria `/universo/animes-desenhos`: 24 franquias na primeira leva, com aviso de lista parcial; grade 2/2/3/4/4 colunas, sem overflow. Campo e botão de busca têm 48 px, seis primeiras capas carregaram e o CTA mantém `/modelos?category=animes-desenhos`.
- Dragon Ball e `?folder=androides`: raiz com 14 pastas e 8 referências; Androides com 6 subpastas e 8 referências. Sem overflow nas cinco larguras. A grade de subpastas fica em 1/2/3/4/4 colunas e a de referências em 2/2/3/4/4. Breadcrumbs, “Explorar todos os modelos” e “Ver mais modelos” têm alvo de 44 px; o CTA preserva categoria, franquia e pasta em `/modelos`. As oito imagens de referência carregaram.
- Nenhuma falha reproduzível nesta inspeção; sem alteração de código ou novo build/deploy. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/marvel-dc/equipes-e-grupos` no mesmo preview em 320/390/768/1024/1440 px, observando títulos longos, imagens e navegação de retorno; reutilizar o componente e a SSOT.

## Rodada 40 — Equipes e Grupos / X-Men responsivos (05/11/2026)

- QA no preview privado vigente [em Equipes e Grupos](https://7e955bb9.tonecosstudio.pages.dev/universo/marvel-dc/equipes-e-grupos), source de código `8f7935495819841e2e77702270165f1108d21798`. A CI [#41998212637](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41998212637) segue verde para esse código; PR #4 draft, HEAD documental `f3dcf1a940181db20156d5087c9f919fd24b5409`. Sem novo build.
- A raiz da franquia tem 4 pastas e 8 referências; em 320/390/768/1024/1440 px não houve overflow. As grades mudam progressivamente para 1/2/3/4/4 colunas nas pastas e 2/2/3/4/4 nas referências. O breadcrumb e as ações medem 44 px; “Explorar todos os modelos” preserva categoria e franquia.
- A pasta X-Men lista 26 subpastas e 8 referências; os nomes maiores incluem Charles Xavier, Homem de Gelo e Confrontos. Sem overflow nas cinco larguras; as grades ficam em 1/2/3/4/4 e 2/2/3/4/4 colunas. Breadcrumbs de raiz/franquia e CTA têm 44 px; filtros incluem `folder=x-men`.
- Na pasta X-Men/Vilões, 10 subpastas e 8 referências se mantêm sem overflow nas mesmas larguras. Grade de pastas 1/2/3/4/4, grade de referências 2/2/3/4/4, três breadcrumbs com 44 px e CTA com categoria/franquia/pasta preservadas. As 8 imagens de referência carregaram, sem falhas.
- Nenhum defeito reproduzível nesta família compartilhada; sem alterações de código. Produção, Worker, D1, R2, DNS e migrations permanecem inalterados.

**NEXT_ACTION:** revisar a raiz `/universo/marvel-dc` no preview em 320/390/768/1024/1440 px, conferindo a primeira leva de franquias, imagens e busca parcial; aplicar os mesmos componentes/SSOT.

## Frontend — Universo e franquias responsivas (05/11/2026)

- **Código validado:** commit `3623980eb4fc8084d3d82cdf8541feb756ee4f98` na branch `integration/tonecosstudio-canonical-20261101`, PR #4 draft; base main `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`.
- **Ajustes:** a raiz `/universo` não mostra a categoria agregada “Todos”, mantém “Ver todos os modelos” e exibe “Animes e Desenhos” em uma linha com tipografia fluida. Os títulos de franquia usam escala responsiva e limite de duas linhas; “Exterminador” e “Constantine” cabem inteiros em celular.
- **Preview privado atual:** https://f2ef62e9.tonecosstudio.pages.dev/universo — Cloudflare Pages deployment `f2ef62e9-7185-4665-ae33-0ea406d5bfd4`, commit de código `3623980`, ambiente `preview`; build e deploy **SUCCESS** pela configuração de preview (`typecheck`, `catalog:mvp:test`, `build`).
- **QA a 320 px:** documento com 314 px, sem overflow. Na raiz, o título Anime ocupa 109/109 px com `white-space: nowrap`; card “Todos” ausente e uma ação “Ver todos os modelos”. Marvel & DC e Animes e Desenhos têm 24 franquias em duas colunas, sem títulos excedendo a caixa.
- **QA a 1280 px:** Marvel & DC tem 24 franquias em quatro colunas; documento com 1274 px; sem overflow nos títulos.
- Captura da raiz mobile: `outputs/universo-preview-mobile-320.png`. Produção, Worker, D1, R2 e DNS inalterados; previews automáticos continuam desativados.

**NEXT_ACTION:** continuar em `/universo/animes-desenhos/dragon-ball`, revisar pastas e modelos no mobile/desktop e seguir pelas próximas franquias.
**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview atual; não gerar build para documentação isolada; não tocar na `main`, produção ou Worker.

## Rodada 41 — título de categoria em telas estreitas (05/11/2026)

- **Correção de frontend:** em `src/pages/CatalogArcade.tsx`, a fonte de “Animes e Desenhos” agora escala de 8 px a 14 px conforme a largura, mantendo `white-space: nowrap`. O card agregado “Todos” segue filtrado; a ação “Ver todos os modelos” permanece única. O teste de integração existente acompanha a classe responsiva.
- **Código publicado em preview:** commit `4009d3aee8a22d4dc7bdfc0b9202cf03b1259c1d`, branch `integration/tonecosstudio-canonical-20261101`, PR #4 draft, base `main` `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`.
- **Preview privado novo:** [abrir Universo](https://28272bc2.tonecosstudio.pages.dev/universo), Cloudflare Pages deployment `28272bc2-4a5f-48ea-b2e4-1c045ef90251`, ambiente `preview`, build e deploy **SUCCESS**. O build usa `typecheck`, `catalog:mvp:test` e `build`.
- **QA visual:** 280/320/360/390/768/1280 px, sem overflow horizontal. O título cabe integralmente no espaço interno do cartão em 280 px (`scrollWidth=clientWidth=89)); em 320–1280 px também permanece numa linha. Card “Todos” ausente e uma CTA “Ver todos os modelos”.
- A URL antiga `ef8ab5fb` servia conteúdo anterior; usar a nova URL de preview para esta revisão. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** continuar a revisão responsiva em `/universo/animes-desenhos/dragon-ball`, conferir pastas/modelos e navegação nos breakpoints móveis e desktop; seguir página por página na mesma PR.

**DO_NOT_REPEAT:** não apresentar `ef8ab5fb` como preview atual; não criar novo preview para documentação isolada; não alterar `main`, produção ou Worker.

## Rodada 42 — breadcrumbs canônicos e navegação Dragon Ball (05/11/2026)

- **Frontend:** `src/pages/CatalogArcade.tsx` obtém o nome da categoria pela lista canônica e resolve o nome da franquia por uma busca limitada à categoria/slug. Os breadcrumbs exibem os nomes publicados sem uma tabela local de franquias. O rótulo “Animes e Desenhos” continua consistente com o card da categoria.
- **Testes existentes:** atualizadas as expectativas de chamadas para refletir a leitura das categorias e preservar a busca de franquias; nenhum teste novo foi adicionado.
- **Preview privado:** [Dragon Ball](https://35dace08.tonecosstudio.pages.dev/universo/animes-desenhos/dragon-ball), deployment `35dace08-d3f3-4d43-b8b5-46d0a56990e9`, commit de código `037325392483cf1eeb2d92cff601b6666e415a37`, ambiente `preview`; build/deploy **SUCCESS** com o comando configurado (`typecheck`, `catalog:mvp:test`, `build`).
- **QA em /universo/animes-desenhos/dragon-ball:** 280/320/360/390/640/768/1024/1280/1440 px, sem overflow. 14 pastas e 8 referências; grades responsivas de pastas 1/2/3/4 colunas e referências 2/2/3/4 colunas. As 8 miniaturas carregaram. Em 320 px, documento 314 px.
- **Navegação:** pasta Androides tem 6 subpastas e 8 referências; Androide 18 tem 8 referências e trilha “Raiz da franquia / Androides / Androide 18”. “Voltar à pasta” da ficha preserva `folder=androides/androide-18`. Ficha do modelo sem overflow em 280/320/360/390/768/1024/1440 px.
- **Categoria:** `/universo/animes-desenhos` apresenta 24 franquias e busca; `dragon ball` encontra Dragon Ball e limpar restaura a listagem. O breadcrumb exibe “Animes e Desenhos”. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/one-piece` em mobile, tablet e desktop; verificar pastas, imagens e retorno às fichas. Depois avançar para outra categoria do Universo na mesma PR.

**DO_NOT_REPEAT:** usar `35dace08` como preview funcional mais recente; não gerar novo preview só por documentação; não alterar `main`, produção ou Worker.

## Rodada 43 — franquia One Piece responsiva (05/11/2026)

- QA em [One Piece no Universo](https://35dace08.tonecosstudio.pages.dev/universo/animes-desenhos/one-piece), preview privado build/deploy **SUCCESS** no código `037325392483cf1eeb2d92cff601b6666e415a37`. Breadcrumb usa “Animes e Desenhos / One Piece”.
- A raiz exibe 22 pastas e 8 modelos de referência. As 8 miniaturas carregaram; CTA de modelos tem 44 px.
- Em 280/320/359/360/390/639/640/768/1023/1024/1280/1440 px não houve overflow. Pastas refluem em 1/2/3/4 colunas e referências em 2/3/4 colunas. O título longo “Akainu x Kizaru x Aokiji” fica dentro de duas linhas.
- Sem alteração de código nesta rodada. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/naruto` em mobile, tablet e desktop; conferir pastas, miniaturas e retorno à ficha. Depois avançar pela categoria sem carregar páginas completas além do limite publicado.

**DO_NOT_REPEAT:** preview funcional é `35dace08`; não gerar build para documentação isolada; não alterar `main`, produção ou Worker.

## Rodada 44 — Universo: categorias e título mobile (05/11/2026)

- **Correção:** em `src/pages/CatalogArcade.tsx`, o filtro da raiz do Universo exclui a categoria agregada por ID e rótulo (“Todos” / “Todos os modelos”); a ação “Ver todos os modelos” continua como acesso à listagem. “Animes e Desenhos” mantém uma linha com tipografia fluida.
- **Preview privado final:** [abrir Universo](https://494e0ae6.tonecosstudio.pages.dev/universo), Cloudflare Pages deployment `494e0ae6-5dea-4b19-9487-37a80f9daa6d`, ambiente `preview`, source `fe13cf80fd41248dcaf7dbdef391e91d49f2bbc0`; build/deploy **SUCCESS** pelo comando configurado (`typecheck`, `catalog:mvp:test`, `build`). O commit de código final é `fe13cf80`.
- **QA visual:** 280/320/360/390/640/768/1024/1440 px, sem overflow horizontal. Seis categorias, card “Todos” ausente, uma ação “Ver todos os modelos”. Título “Animes e Desenhos” com `white-space: nowrap`; em 280 px a caixa mede 89/89 px, em 320 px 109/109 px, e segue em uma linha nos demais tamanhos.
- A primeira tentativa de build no commit `7736a146` revelou uma expectativa antiga de classe CSS; mantive o estilo responsivo já validado e publiquei a versão final no commit acima.
- O preview antigo `ef8ab5fb` serve conteúdo anterior; usar a URL `494e0ae6` para esta revisão. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/naruto` no preview em telas móveis e desktop, incluindo miniaturas, pastas e retorno às fichas; seguir na mesma PR.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview atual; não gerar build para documentação isolada; não alterar `main`, produção ou Worker.

## Rodada 45 — franquias de Animes e Desenhos no mobile e desktop (05/11/2026)

- Preview usado: [Universo](https://494e0ae6.tonecosstudio.pages.dev/universo), deployment `494e0ae6-5dea-4b19-9487-37a80f9daa6d`, código `fe13cf80fd41248dcaf7dbdef391e91d49f2bbc0`; build/deploy já aprovados. Sem novo build nesta rodada.
- `/universo/animes-desenhos` confirmou 24 franquias na primeira leva, duas colunas em 320 px, documento e scroll com 314 px; CTA “Ver todos os modelos” presente.
- `Cavaleiros do Zodíaco`: 23 pastas e 8 referências; em 280/320/390/768/1024/1440 px não houve overflow. Pastas em 1/1/2/3/4/4 colunas e referências em 2/2/2/3/4/4. O maior nome de pasta, “Shura de Capricórnio”, fica dentro do limite de duas linhas. As 8 imagens de referência carregaram.
- A pasta `folder=afrodite` lista 2 modelos. Raiz, pasta e CTA medem 44 px; o CTA preserva categoria, franquia e pasta. A ficha de Afrodite retorna ao caminho exato; imagem carregada (1600 px) e seleção permaneceu vazia. Pasta e ficha sem overflow nas seis larguras.
- `Demon Slayer`: 17 pastas e 8 referências; em 280/320/390/768/1024/1440 px sem overflow. Pastas em 1/1/2/3/4/4 colunas e referências em 2/2/2/3/4/4. O maior nome de pasta, “Sanemi Shinazugawa”, permanece dentro de duas linhas.
- `folder=sanemi-shinazugawa` lista 1 referência; breadcrumbs e CTA medem 44 px e preservam o caminho. A ficha retorna à pasta exata, sem overflow nas seis larguras; imagem carregada (794 px) e seleção permaneceu vazia.
- Sem defeito reproduzível nesta família; não foi necessária mudança de código. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/as-tartarugas-ninja` no mesmo preview em 280/320/390/768/1024/1440 px; conferir nomes, pastas, miniaturas e retorno às fichas.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview; não gerar build para documentação isolada; não alterar `main`, produção ou Worker.
## Rodada 46 — franquias de Animes e Desenhos: Tartarugas, Caverna e ThunderCats (05/11/2026)

- Preview reutilizado: [Universo](https://494e0ae6.tonecosstudio.pages.dev/universo), deployment `494e0ae6-5dea-4b19-9487-37a80f9daa6d`, código `fe13cf80fd41248dcaf7dbdef391e91d49f2bbc0`. Nenhum build/deploy novo.
- `As Tartarugas Ninja`: 14 pastas e 8 referências; em 280/320/390/768/1024/1440 px sem overflow. Pastas em 1/1/2/3/4/4 colunas e referências em 2/2/2/3/4/4; 8/8 imagens carregadas.
- `folder=viloes`: 5 subpastas e 8 referências, sem overflow nas seis larguras; grade de pastas 1/1/2/3/4/4 e referências 2/2/2/3/4/4. `folder=viloes/destruidor`: 4 referências e 3 breadcrumbs; breadcrumbs e CTA com 44 px, filtro preservado. A ficha de Destruidor retornou à subpasta exata; imagem carregada (1079 px), sem overflow nas seis larguras e seleção vazia.
- `Caverna do Dragão`: 8 pastas e 8 referências; sem overflow nas seis larguras, pastas 1/1/2/3/4/4 colunas e referências 2/2/2/3/4/4. As 8 imagens carregaram. A pasta `mestre-dos-magos` tem uma referência; breadcrumbs/CTA têm 44 px e a ficha retorna ao caminho exato; imagem carregada (738 px), sem overflow nas seis larguras.
- `ThunderCats`: 12 pastas e 8 referências; em 280/320/390/768/1024/1440 px sem overflow. Pastas em 1/1/2/3/4/4 colunas, referências em 2/2/2/3/4/4; as 8 imagens carregaram. “Wilykit e Wilykat” permanece dentro do limite de duas linhas.
- Nenhum defeito reproduzível nesta rodada; sem mudanças de frontend. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/jujutsu-kaisen` no preview em 280/320/390/768/1024/1440 px; conferir pastas, miniaturas e retorno à ficha. Continuar sem carregar páginas além do limite canônico publicado.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview; não gerar build para documentação isolada; não alterar `main`, produção ou Worker.