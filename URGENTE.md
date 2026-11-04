# Tonecos Studio — checkpoint operacional

**Auditado em 04/11/2026 (Bahia). Estado: NO-GO para publicação pública.** O enorme checkpoint cumulativo anterior foi preservado integralmente em [docs-archive/historico-2026-11-04/URGENTE.md](docs-archive/historico-2026-11-04/URGENTE.md). Use [docs/README.md](docs/README.md) como índice dos documentos atuais.

## Frontend — rodada 1 de responsividade (04/11/2026)

- **Escopo:** navegação compartilhada, rodapé e catálogo público. Revisão visual no preview protegido anterior em 320 px, 390 px e 768 px, mais desktop. Home, Universo, categoria/franquia, Modelos, ficha, Sobre, Contato, Termos e Privacidade mantiveram conteúdo dentro da largura disponível; a grade passou para quatro colunas em 768 px.
- **Ajustes no código desta rodada:** menu mobile, links do menu e ações do rodapé com alvo mínimo de 44 px; busca da listagem com placeholder curto e espaço de texto ajustado ao estado do botão limpar. Corrige o botão de menu medido em 20 × 20 px e o placeholder truncado em 320 px.
- **Commits de código:** 35c492e (menu), 7ce12ea (rodapé), e7351da (busca).
- **Validação e preview desta rodada:** aguardando build manual do Cloudflare Pages em preview privado. O preview anterior e a produção não recebem estas mudanças até a nova publicação de preview; produção permanece bloqueada.

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

1. **QA visual autenticado** no preview ad578030 em desktop e celular: Home, seis capas, busca/listagem/filtros, ficha e galeria do 10H, navegação direta/refresh, acessibilidade e estados de falha.
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
