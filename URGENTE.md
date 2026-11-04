# Tonecos Studio — checkpoint operacional

**Auditado em 04/11/2026 (Bahia). Estado: NO-GO para publicação pública.** O enorme checkpoint cumulativo anterior foi preservado integralmente em [docs-archive/historico-2026-11-04/URGENTE.md](docs-archive/historico-2026-11-04/URGENTE.md). Use [docs/README.md](docs/README.md) como índice dos documentos atuais.

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
