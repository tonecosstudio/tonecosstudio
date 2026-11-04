# URGENTE — Tonecos Studio / Estado operacional

## MVP — textos legais coerentes com catálogo somente leitura — 04/11/2026

- Identificada divergência entre as páginas `/privacidade` e `/termos` e o modo MVP público: apresentavam coleta de CPF, processamento de pagamento, assinatura e Coins, indisponíveis nesta fase. As páginas agora apresentam textos próprios apenas quando `VITE_PUBLIC_CATALOG_MVP=true` e `VITE_PREVIEW_READ_ONLY=true`; conteúdo comercial anterior permanece para etapa posterior.
- No modo de leitura, ambas deixam de solicitar configurações de contato ao Supabase (`useSystemSettings({enabled:false})`) e usam o e-mail institucional público já configurado. Política descreve dados técnicos de hospedagem, contato via e-mail e direitos aplicáveis de forma cuidadosa, sem afirmar que a infraestrutura não coleta IP/cookies técnicos; termos não apresentam compras ou cadastros.
- Novos testes `src/pages/LegalArcade.mvp.test.tsx` comprovam conteúdo coerente nos dois modos e ausência de consultas ao Supabase nas páginas legais do preview.
- **Atenção:** esta é correção de coerência funcional, **não parecer jurídico**. Revisão final de privacidade e termos por responsável competente permanece gate antes de liberação ampla.
- **next_action:** rodar testes relevantes, realizar um único release:verify protegido deste SHA e QA autenticado. Produção Pages continua desativada. A PR #4 segue draft; não mesclar antes de checar Supabase Tonecos, SEO/robots e QA.

---

## MVP público somente leitura — gate de lançamento — 03/11/2026 (Bahia)

- **Meta de lançamento fase 1:** catálogo público sem login, cadastro, pedidos, pagamentos ou funções administrativas. Páginas liberadas: Home, Universo, Modelos, ficha pública por slug, Sobre, Contato e legais. Aplicação existente reutilizada; Worker `tonecos-catalogo-api` e D1/R2 seguem SSOT.
- **Código MVP na branch única** `integration/tonecosstudio-canonical-20261101`: commits `597a048a` (allowlist central em `src/config/catalog-public-mvp.ts`, bloqueio de rotas privadas em `App.tsx`, chat não carregado em modo somente leitura e assert fail-closed de build), `bf629fa6` (contato público por `mailto:` institucional sem formulário Supabase), `f3ff7bd9` (dois ajustes de lint nos testes), `0740b89b` (isolamento das expectativas de prévia legada vs MVP público no ContactArcade/ArcadeFooter). Nenhum desses commits está na `main`.
- **Configuração Pages PREVIEW protegida:** `VITE_PUBLIC_CATALOG_MVP=true`, `VITE_PREVIEW_READ_ONLY=true`, `VITE_CONTACT_EMAIL=tonecosstudio@gmail.com`, Service Binding `CATALOG_WORKER=tonecos-catalogo-api`, Supabase anon preview já configurado; Cloudflare Access protege `*.tonecosstudio.pages.dev`. Produção automática **desabilitada** e não liberada; `main` permanece na versão antiga, portanto **não ativar produção antes de reconciliar a main**.
- **Resultado real dos gates:** primeiro deploy `27072485` (SHA bf629fa6) falhou em dois testes de sintaxe `no-unexpected-multiline`; retry diagnóstico `2f01144f` confirmou. Deploy `2612ae46` (SHA f3ff7bd9) executou 3.380 testes: 3.345 aprovados, 32 ignorados, 3 falhas por expectativas de prévia que herdavam a nova flag de MVP. Essas três regressões de teste foram corrigidas com `vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false")` no `beforeEach` em `0740b89b`, preservando teste positivo com flag true e sem alterar funcionalidade.
- **Build atual em homologação:** Cloudflare Pages deployment manual `30da90c7-d5ed-4839-a7f0-9f5688bb3f2d`, SHA `0740b89b`, URL privada `https://30da90c7.tonecosstudio.pages.dev`; **build ativo na última checagem**, não afirmar sucesso até resposta `deploy=success`. O último preview previamente aprovado segue `6c43e5bd`/SHA `d4c9846e`.
- **Prova local adicional:** 33 testes de política de rotas passaram no Windows/Node24 com a fonte exata do contrato; comando de fail-closed do build rejeitou `MVP=true` quando `read-only=false`. Esses testes não substituem o release:verify completo.
- **Worker/custo:** seis capas reais WebP e detalhe do modelo 10H já verificados por HTTP de baixa intensidade. PR draft <https://github.com/washingtonmsdj/catalogo/pull/266> de correção de 206 sem Range tem 10 testes e CI verdes, mas merge publica Worker automaticamente; exige staged/smoke/rollback, não mesclar prematuramente. Não consultar D1/R2 só para status, não criar cache/serviço/banco paralelo.
- **Bloqueios antes da URL pública:** 1) build final e smoke de preview protegido; 2) QA visual autenticado Home, seis capas e ficha; 3) integração `main` canônica e verificação do CI de qualidade; 4) preparar env e Service Binding **produção** da mesma autoridade sem abrir login/compra; 5) hostname público, SEO/robots e rollback. Supabase da conta Tonecos não está conectado com acesso admin para auditoria RLS; **cadastro real continua proibido** até essa auditoria. O `robots.txt` mantém `Disallow: /` no staging.
- **do_not_repeat:** não abrir outra PR/branch Tonecos, não repetir builds enquanto `30da90c7` estiver ativo, não promover HEAD documental como novo bundle. Vercel legado e OrdaX intocados.

---

## QA das seis capas e HTTP Range do Worker — 04/11/2026

- **Seis capas verificadas por HTTP HEAD no Worker canônico** (uma única leitura prévia `GET /api/catalog?limit=6` e seis HEADs individuais; sem varredura D1/R2). Todos os modelos da primeira página possuíam capa e cada objeto respondeu `Content-Type: image/webp`, `ETag` e `Content-Length` coerentes: 10H 71.276 B; 2B #2 46.842 B; 2B #4 43.126 B; 2B #5 44.170 B; A Máscara 54.858 B; A2 31.742 B.
- **Achado causal:** todas as seis respostas `HEAD` sem cabeçalho `Range` retornaram `206 Partial Content`. Em `washingtonmsdj/catalogo/worker/media.ts`, `servePublicMedia()` trata `object.range` retornado pelo R2 como se o cliente tivesse pedido byte range. Teste isolado do arquivo real em Windows/Node 24: **2 falhas de GET/HEAD sem Range** e 1 sucesso para Range explícito; alteração somente local para `if (request.headers.has('range') && object.range)` levou a **3/3 PASS**. A correção **NÃO foi implantada**.
- **Seguimento na autoridade correta:** issue <https://github.com/washingtonmsdj/catalogo/issues/265> contém evidência e critérios para o proprietário testar com a suíte canônica e promover versão staged. **Não corrigir na Pages Function como workaround; não fazer commit direto na main do catálogo**, pois push em `worker/**` aciona deploy Cloudflare automaticamente.
- **Orçamento:** leitura prévia de métricas Cloudflare (04/11 UTC) indicou 1.564 linhas lidas, 47 consultas de leitura e zero escrita; dados podem ter atraso. As seis sondas HEAD de mídia dispensam D1 pelo contrato de `worker/entry.ts`.
- **Implantação vigente Tonecos Pages:** `6c43e5bd-ef5d-46fd-b402-aebeae5ede40` / SHA `d4c9846e` com deploy success; alterações posteriores em `URGENTE.md` apenas documentais; produção automática e preview automático desabilitados, Access privado. **Não criar outro build só por este checkpoint.**
- **Próximo gate:** confirmar visualmente no preview autenticado a exibição das seis capas e o clique na ficha `nier-10h-nier`; depois corrigir/promover HTTP Range no repositório do Worker com gates. Sem cadastramento comercial até auditoria do Supabase Tonecos.

---

## Teste HTTP mínimo de catálogo e mídia — 03/11/2026

- **Prova HTTP real, limitada e não destrutiva:** em 03/11 (Bahia), foi consultada apenas a primeira página pública `GET /api/catalog?limit=6` do Worker canônico `tonecos-catalogo-api`. Resposta **HTTP 200** com 6 modelos publicados, `nextCursor` presente e `cover_storage_key` presente em todos os seis. Modelos observados: `10H` (`nier-10h-nier`), três variantes `2B`, `A mascara`, `A2`. Não inferir que o acervo total tem somente seis modelos.
- **Capa real R2:** feito somente um GET de mídia com solicitação `Range: bytes=0-15` para o primeiro `cover_storage_key`, por meio do Worker público. Respondeu **HTTP 206**, `Content-Type: image/webp`, 71.276 bytes (assinatura RIFF/WEBP verificada). A resposta entregou o objeto completo apesar da solicitação de faixa; não fazer polling repetido para investigar isso. Apenas esta capa foi examinada; não afirmar seis capas visualmente homologadas.
- **Ficha e galeria reais:** `GET /api/models/nier-10h-nier` retornou HTTP 200, slug canônico, `image_count=1`, `gallery_version=1` e chave de capa. `GET /api/models/nier-10h-nier/images?limit=1&v=1` retornou **HTTP 200**, `total=1`, `version=1`, papel `cover`, variante `card` presente. O campo `description` não tinha texto; não inventar descrição.
- **Cota antes dos probes:** GraphQL de métricas da conta Tonecos em 04/11 UTC informou `rowsRead=1119`, `readQueries=30`, `rowsWritten=0`. A verificação em si usou somente três GETs públicos JSON e uma mídia; não realizou varredura, auditoria integral, importação ou escrita no D1/R2. As métricas podem ter atraso; não tratar números como contabilidade em tempo real.
- **Front-end:** o usuário já abriu a Home de `6c43e5bd.tonecosstudio.pages.dev` autenticado no Access; o indicador `6 destaques` coincide com a API. Isto é evidência da Home e do serviço; não equivale a prova visual de todas as capas ou teste de clique/navegação da ficha.
- **Estado de deploy:** `6c43e5bd-ef5d-46fd-b402-aebeae5ede40` do SHA `d4c9846e` continua como último bundle verificado `deploy=success`; branch `main` e produção pública não mudaram. Este checkpoint é só documental e **NÃO autoriza novo build**.
- **next_action:** QA visual autenticado das seis miniaturas na Home e clique em `/modelos/nier-10h-nier`, checando uma capa e galeria; depois auditoria RLS/redirect/SMTP do Supabase Tonecos antes de abrir cadastro. Se browser automatizado não estiver conectado, solicitar apenas uma captura da seção e/ou detalhe. Sem consultas D1 adicionais para simples status.

---

## Checkpoint horário — 03/11/2026, 23h (Bahia)

- **Git verificado:** `tonecosstudio/tonecosstudio` branch canônica em `366aa82210c6ee62d23e5ce57f3ef75915ce7811` antes deste registro; `washingtonmsdj/catalogo/main` em `a4bf22bb8044a88f0c5d0b54b3e9d3fdead0b34c`. Sem alteração de código confirmada desde o checkpoint anterior.
- **Drive, apenas metadados:** SSOT STLForgeCatalogo modificado em `2026-11-01T18:26:52.906Z`; Índice Tonecos Studios em `2026-08-09T22:55:11.541Z`. Licenças, capas e proveniência não foram revalidadas nesta hora.
- **Cloudflare Pages, apenas endpoint de deployments:** `6c43e5bd-ef5d-46fd-b402-aebeae5ede40` (`d4c9846e`) segue `build=success`, `deploy=success`; o deployment documental `c98798e7-9baa-4093-87f2-43168f576920` (`366aa822`) permanece `queued/idle`, sem build iniciado. Não disparar outro build: commit posterior é somente documentação. Falha antiga `34aa0b1a` no teste de marca foi corrigida em `d4c9846e`, cujo gate de build passou. Nenhum workflow GitHub recente retornou na consulta da branch.
- **QA ainda ausente:** screenshot autenticado anterior prova Home e seis destaques retornados, **não** prova carregamento das seis capas, fichas individuais, navegação de volta nem E2E completo. Próximo gate é verificar visualmente as seis capas e uma ficha via Edge autenticado/Cloudflare Access, sem consultar D1 para status.
- **Liberação:** MVP público **NO-GO** (QA e acesso anônimo não homologados); cadastro/login/perfil **NO-GO** (Supabase comercial Tonecos ainda sem auditoria RLS/redirect/SMTP/E2E autorizado); pedidos/compras/pagamentos **NO-GO**. `main`, DNS, produção, Vercel legado, OrdaX, Supabase remoto, D1/R2 e clientes intactos.
- **Próximas 3 prioridades:** (1) QA autenticado das seis capas e ficha/voltar; (2) conciliar proveniência/licenças/capas aprovadas no Drive/Git sem reimportar; (3) auditar Supabase comercial após autorização, sem abrir cadastro no preview somente leitura.

---


## Homologação visual — preview protegido aprovado — 03/11/2026 (Bahia)

- **Build final aprovado:** Cloudflare Pages deployment `6c43e5bd-ef5d-46fd-b402-aebeae5ede40`, SHA de código `d4c9846e32cec6c1bc5dbce46026ae747b7abb16`. Estágio `deploy=success`; Pages Functions compiladas, 214 assets publicados, `npm run release:verify` concluído e `npm audit` sem vulnerabilidades relatadas. URL protegida: `https://6c43e5bd.tonecosstudio.pages.dev`.
- **Evidência E2E fornecida pelo usuário:** screenshot do Microsoft Edge já autenticado no Cloudflare Access, Home Tonecos carregando com layout preto/dourado, menu INÍCIO/UNIVERSO/MODELOS, CTAs e `6` destaques. No código `src/pages/LandingPage.tsx`, `featuredCount` vem de `modelsQuery.data.items.length` e `ATIVO` é estado de acervo condicionado a `models.length > 0`: a tela indica que ao menos seis itens foram retornados para a Home. **Não inferir de uma captura da primeira dobra que as capas carregaram nem que as fichas /modelos/:id foram inspecionadas.**
- **Conferência estática de imagens:** `CanonicalCatalogImage` trata onError mostrando placeholder, com testes próprios; `mediaUrl` conserva o prefixo `media/`, compatível com a rota pública do Worker; nenhum arquivo de mídia foi buscado neste checkpoint.
- **Proteções preservadas:** Cloudflare Access em `*.tonecosstudio.pages.dev`; Pages Service Binding `CATALOG_WORKER` para Worker existente; `production_deployments_enabled=false`, preview automático `none`. Não publicar `main`, abrir cadastro, criar nova origem de modelos ou fazer varredura D1/R2.
- **next_action:** QA autenticado do bloco `MODELOS EM DESTAQUE`, verificar carregamento das seis capas e a ficha de uma miniatura, inclusive navegação/voltar; depois auditoria RLS/auth do Supabase comercial Tonecos antes de liberar usuários.
- **do_not_repeat:** o build do SHA `d4c9846e` já foi aprovado; não recompilar ou criar deployment por esta atualização só documental; evitar consultas D1 só para status.

---

## Catálogo — remoção da rota antiga de personagens — 03/11/2026

- A rota pública `/universo/personagem/:slug` ainda invocava `CatalogCharacterArcade.tsx`, que buscava índices/modelos no Supabase e apresentava o título errado `Universo ORDAX`. Isso misturava marcas e criava uma segunda fonte de modelos.
- O Worker canônico atual possui categorias, franquias, pastas e modelos, **não possui índice de personagem isolado**. Em vez de fazer consulta Supabase ou inventar filtro, `CatalogCharacterArcade.tsx` agora faz um redirecionamento determinístico para `/modelos`, a navegação canônica; os links antigos continuam resolvendo para uma página útil sem expor dados antigos.
- Adicionada `src/pages/CatalogCharacterArcade.test.tsx` com 3 cenários: link antigo, query string com personagem/origem e slug desconhecido. Sem alteração de API, RLS ou D1. Depende do próximo gate completo de Vitest/TypeScript antes de implantação.
- `/modelos/:id` também deixou de acionar ficha Supabase por UUID no commit anterior `90970364`. Não excluir outros módulos legados sem auditar as referências ativas.
- **next_action:** somente após concluir o deploy `c702a8a4` do Worker Service Binding, executar um build único do HEAD com os dois ajustes de roteamento e garantir que todos os testes permaneçam verdes. QA visual autenticado, RLS do Supabase comercial e abertura pública seguem NO-GO.

---

## Ficha de modelo — autoridade única — 03/11/2026

- Identificada a bifurcação `src/pages/catalog/ModelDetailsRoute.tsx`: slugs consultavam o Worker canônico, mas parâmetros que pareciam UUID ativavam `ModelDetails.tsx` (consulta ao catálogo legado em Supabase), violando SSOT e permitindo informações distintas para o mesmo caminho público.
- A entrada ativa `/modelos/:id` agora é exportada exclusivamente de `CanonicalModelDetails` e `public-catalog-gateway` (Worker D1/R2). UUIDs/links antigos não provocam consulta a dados Supabase: só serão exibidos se o Worker canônico tiver esse slug; caso contrário, a ficha mostra indisponibilidade, sem inventar correspondências.
- Criada regressão `src/pages/catalog/ModelDetailsRoute.test.tsx` para slug canônico, UUID e deep link UUID, garantindo que a ficha Supabase não seja renderizada. O arquivo antigo permanece inativo até auditoria de imports antes de exclusão física. **Ainda exige teste Vitest/coverage no próximo gate; não promover a main nem iniciar build concorrente ao deployment `c702a8a4`.**
- **next_action:** concluir homologação da Service Binding no Pages, depois executar gate completo do HEAD e verificar navegação de detalhe; auditar imports residuais da ficha antiga antes de removê-la. O Worker segue autoridade única; D1 não foi consultado.
- **do_not_repeat:** sem fonte de catálogo paralela, sem fallback a Supabase, sem reset/import, sem alteração em `main`/domínios/Vercel.

---

## Pages → Worker — Service Binding nativa — 03/11/2026

- **Causa estrutural:** a Pages Function do catálogo fazia `fetch()` ao endereço público do Worker, o que pode falhar em comunicação entre Workers da mesma conta Cloudflare. Migração para **Service Binding** interna, preservando o Worker `tonecos-catalogo-api` como única autoridade do catálogo e mantendo o proxy de leitura pública.
- **Configuração Cloudflare real:** em `tonecosstudio`, `deployment_configs.preview.services.CATALOG_WORKER.service=tonecos-catalogo-api`, sem D1/R2 vinculados à Pages Function. Todas as variáveis de preview foram preservadas; `production_deployments_enabled=false`, previews automáticos `none`. A produção permanece sem ligação/publicação.
- **Código:** `functions/catalogo-api/[[path]].js` acessa exclusivamente `env.CATALOG_WORKER.fetch()`, sem fallback a `fetch` global, e falha fechado se a Service Binding estiver ausente. `scripts/cloudflare/catalog-pages-proxy.test.mjs` passou de 9 para **12 testes**, cobrindo encaminhamento real via Fetcher mock, falta de binding e proibição de rotas de escrita/administrativas. Executado no desktop físico `DESKTOP-4UFL03B` em Node.js, **12/12 PASS**.
- **Homologação pendente:** a alteração precisa de um único novo deploy de preview protegido e verificação HTTP autenticada; os testes não comprovam a saúde do catálogo/D1. Não habilitar produção, cadastro, pedidos ou pagamentos.
- **next_action:** homologar deploy controlado com binding efetivamente presente e Access ativo; não iniciar builds concorrentes; executar QA autenticado sem varreduras D1.
- **do_not_repeat:** não criar Worker/banco/proxy paralelo, não consultar D1/R2, não alterar `main`, DNS, Vercel ou OrdaX.

---

## Pages — deploy aprovado e pendências reais — 03/11/2026 (Bahia)

- **Último deploy manual comprovadamente aprovado:** Cloudflare Pages `5ebcbc98-352e-4f61-8aba-b85a5b370a8b` do commit `9ad335568330189608ce15ca7355384d727993dd`, URL privada `https://5ebcbc98.tonecosstudio.pages.dev`. Todos os estágios `queued`, `initialize`, `clone_repo`, `build` e `deploy` retornaram `success` (finalizado 03/11/2026 23:59 UTC). O comando `npm ci ... && npm run release:verify` retornou sucesso; Vite, Pages Functions e publicação dos 218 assets aprovados, `npm audit` com zero vulnerabilidades reportadas.
- **Roteamento SPA:** o commit `9ad33556` removeu a regra inválida `public/_redirects` e adicionou teste de regressão. O deploy confirmou ausência do aviso de loop de redirecionamento; Pages usa fallback SPA nativo sem arquivo `404.html`.
- **Git SSOT atual:** a branch de integração avançou para `d3967a484be5c1214da11cd428280c38fd6780c0` exclusivamente com uma alteração de documentação de checkpoint, depois do deploy. Não declarar que esse SHA de documentação foi homologado como bundle distinto; não refazer build só por documentação.
- **Proteção e custos:** o preview `*.tonecosstudio.pages.dev` está sob Cloudflare Access e o site está em modo somente leitura; `tonecosstudio.pages.dev` (endereço raiz) não é coberto por essa política. Produção e previews automáticos seguem desligados. Nada foi consultado/alterado no D1/R2, na produção da Vercel, na `main` ou nos domínios públicos.
- **Gates que NÃO foram comprovados:** acesso autenticado ao preview com QA visual desktop/mobile, navegação profunda, execução real da Pages Function no endereço protegido, imagens e fluxos de catálogo; RLS/redirect/SMTP e E2E do projeto Supabase Tonecos. O bloqueio local de escrita via `VITE_PREVIEW_READ_ONLY` não substitui RLS. Cadastro real, pedidos e pagamentos continuam **NO-GO**.
- **next_action:** testar o preview autenticado e a navegação/catalogo sem reimportar dados; confirmar RLS e autoridade de cadastro no Supabase Tonecos com acesso próprio; só então decidir sobre `main`, domínio e abertura de MVP. Não lançar builds paralelos/duplicados.

---

## Checkpoint horário — 03/11/2026, 20h56 (Bahia)

- **Fonte Git:** repositório transferido `tonecosstudio/tonecosstudio`, branch única `integration/tonecosstudio-canonical-20261101`, HEAD `9ad335568330189608ce15ca7355384d727993dd`. O catálogo `washingtonmsdj/catalogo/main` permanece `a4bf22bb8044a88f0c5d0b54b3e9d3fdead0b34c`. Sem alteração confirmada nesses HEADs em relação ao checkpoint mais recente.
- **Drive (somente metadados):** SSOT STLForgeCatalogo modificado em `2026-11-01T18:26:52.906Z`; Índice Tonecos Studios em `2026-08-09T22:55:11.541Z`. Conteúdo/licenças/capas não foram revalidados nesta hora.
- **Cloudflare Pages Tonecos (somente endpoint de deployments):** build manual `5ebcbc98-352e-4f61-8aba-b85a5b370a8b` do HEAD `9ad33556` ainda `build/active`, sem resultado; deploy automático do mesmo SHA `46599831-29db-4cd4-9bd2-d77474530be8` `queued/idle`. Último preview confirmado `deploy/success`: `cd223b66-5c5d-4489-bda9-c3f5f01e9024` (`57c26e5e`). **Não iniciar build concorrente, não promover SHA sem gate verde.**
- **Gates:** `release:verify` completo no SHA final e recuperação de `src/pages/ContactArcade.test.tsx` ainda **não comprovados** nesta hora; conferir resultado de build e logs uma única vez se falhar. Home, catálogo Worker como SSOT, busca, fichas, navegação, primeiro uso e QA anônimo precisam de homologação. Acesso público **NO-GO**. Supabase Tonecos (RLS/redirect/SMTP e E2E com conta de teste) não autorizado/auditado: cadastro/login real **NO-GO**. Compras, pedidos e pagamentos **NO-GO**.
- **Segurança e custos:** nenhuma consulta D1/R2, migração, reimportação, reupload, deploy novo, mudança DNS, Vercel, `main`, Supabase ou projetos OrdaX. Cloudflare Access permanece somente para `*.tonecosstudio.pages.dev` conforme checkpoint anterior; não inferir que o domínio raiz Pages esteja protegido.
- **Próximas prioridades:** (1) aguardar e avaliar gate único do build ativo; (2) homologar fluxo público somente leitura contra catálogo Worker e conferir checkpoints/proveniência; (3) obter autorização de Supabase Tonecos e auditar segurança antes de habilitar contas.

---


> Repositório: `tonecosstudio/tonecosstudio` (privado, transferido do proprietário Washington; identidade institucional).
> **Estado: NO-GO.** A `main` permanece `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41` e NÃO foi atualizada nesta execução.
> Frente única de consolidação: `integration/tonecosstudio-canonical-20261101`.
> Regras e destino técnico: [docs/TONECOS-STUDIO-CONSOLIDACAO.md](docs/TONECOS-STUDIO-CONSOLIDACAO.md).
> Não declarar GO sem `release:verify` completo no mesmo SHA e smokes críticos do runtime.

## Cloudflare Pages — Access e teste de proxy no Node 24 — 03/11/2026

- Access habilitado e verificado na conta Cloudflare da Tonecos. Aplicação `tonecosstudio - Cloudflare Pages` protege `*.tonecosstudio.pages.dev`; política `Allow Members - Cloudflare Pages` permite o e-mail institucional Tonecos. Isso cobre previews, não o domínio principal `tonecosstudio.pages.dev`.
- O adaptador `functions/catalogo-api/[[path]].js` foi testado fisicamente em `DESKTOP-4UFL03B` com Node `v24.22.2`: **9/9 testes passaram** após corrigir uma expectativa de teste sobre normalização feita pelo padrão URL (o caminho `media/.hidden/../private.webp` já chega normalizado). O teste agora cobre tentativa codificada `media/%2e%2e%2fprivate.webp`, que permanece bloqueada antes de contatar o Worker.
- O Pages registrou previews da branch atual, ainda sem build concluído; produção automática desativada. Não declarar GO, não habilitar acesso público ou registro real sem gate completo, homologação de dados, browser QA e segurança do Supabase Tonecos.
- **next_action:** build único controlado da branch protegida, verificar logs e teste HTTP de assets e Pages Function, depois seguir homologação isolada do Supabase e da publicação.
- **do_not_repeat:** não consultar D1, não tocar na `main`, domínios e Vercel OrdaX, não duplicar repositório nem iniciar builds concorrentes.

---

## Cloudflare Pages — metadados sociais e proteção de preview — 03/11/2026

- Gerador social canônico atualizado para reconhecer `CF_PAGES`, `CF_PAGES_BRANCH` e `CF_PAGES_URL`. Apenas URLs HTTPS de preview em `*.tonecosstudio.pages.dev` recebem imagem OG/Twitter absoluta; a produção `main` exige `TONECOS_PUBLIC_ORIGIN` explícito. O fluxo Vercel continua preservado.
- Três regressões foram adicionadas à suíte do gerador social; a lógica de resolução foi testada isoladamente em Node 22 (6 cenários aprovados). O teste completo com `sharp`, o build Node 24 e `release:verify` ainda dependem de execução no ambiente de CI.
- Pages registrou 4 deploys em `queued/idle`, sem publicação confirmada. Cloudflare Access retornou `access.api.error.not_enabled`; previews do Pages são públicos por padrão. **GO permanece bloqueado** até ativar Access, executar build homologado e validar backend/QA.
- **next_action:** habilitar Access no dashboard da conta Tonecos; validar proteção do preview, build único e funcionamento do catálogo/SEO no SHA homologado antes de publicação.
- **do_not_repeat:** não tocar D1/R2, não duplicar SEO/catálogo, não modificar DNS, Vercel, OrdaX, `main` ou abrir branches/PRs adicionais.

---

## Cloudflare Pages — transporte de catálogo somente leitura — 03/11/2026

- **Infraestrutura confirmada:** Cloudflare Pages `tonecosstudio` na conta Tonecos, conectado ao repositório privado `tonecosstudio/tonecosstudio`. Produção e previews automáticos desabilitados; nenhum deploy iniciado.
- **Implementação na branch única:** `functions/catalogo-api/[[path]].js` encaminha somente GET das rotas públicas de catálogo, categorias, franquias, pastas, fichas, galerias e mídia para o Worker canônico existente. Rejeita métodos de escrita, rotas desconhecidas, redirecionamentos upstream e caminhos inseguros; não encaminha cookies nem Authorization, não acessa D1 ou Supabase.
- **Regressão:** `scripts/cloudflare/catalog-pages-proxy.test.mjs` com 9 cenários aprovados em execução local Node.js 22; `npm run build` passou a executar esta suíte junto aos testes existentes de imagem social. A execução completa `release:verify` em Node 24 e CI no novo SHA continua pendente.
- **Proteções:** `NODE_VERSION=24` e `VITE_PREVIEW_READ_ONLY=true` configurados em preview e produção no Pages. Não inferir liberação pública, usuário real, domínio próprio ou catálogo homologado.
- **Pendente:** verificar CI no mesmo SHA, autenticação/segurança do ambiente de preview, integração e cabeçalhos reais das Pages Functions, QA desktop/mobile, SEO e auditoria Supabase Tonecos antes de publicar. Vercel e projetos OrdaX intocados.
- **next_action:** executar gate completo e homologação protegida da nova função sem promoção à `main` nem alteração de domínios.
- **do_not_repeat:** não criar proxy/catalogo/banco paralelo, não consultar D1/R2, não criar branch ou PR adicional, não iniciar builds concorrentes.

---

## MVP — rodapé público sem funções e contato não homologados — 03/11/2026

- **Baseline validada:** `db2fbe0a29b7503652906b95b65c25e7845e6a59`, Vercel `READY` e alias estável do preview Tonecos atualizado. HTTP GET Home, modelos, contato, login e favicon + PNG social responderam 200.
- **Achado:** `ArcadeFooter` mostrava links públicos para Dashboard, Pagamentos, Wishlist e Conta mesmo em `VITE_PREVIEW_READ_ONLY=true`. Além disso, carregava `system_settings` sem necessidade em um preview de catálogo e podia publicar dados de contato não homologados.
- **Correção MVP:** no preview, o rodapé possui somente navegação e um aviso de atendimento em preparação, sem links privados, e não consulta `system_settings`. No ambiente comercial, preserva a entrada única Minha Conta e os canais já configurados; links avançados de Dashboard/Pagamentos/Wishlist não são anunciados até homologação. Nenhuma rota ou serviço foi excluído.
- **Regressão:** `useSystemSettings({ enabled:false })` comprova ausência de leitura; `ArcadeFooter` tem teste de prévia/comercial e a identidade canônica impede regressão dos links. `release:verify` é obrigatório no SHA resultante, não declarar GO antes.
- **Bloqueios:** produção e cadastro público aguardam auditoria Supabase Tonecos (RLS, SMTP, redirects e testes de perfil), isolamento dos domínios OrdaX e QA real desktop/mobile. Preview `READY` não equivale a liberação de usuários.
- **next_action:** validar gate deste commit, repontar alias de preview somente depois de `READY` e obter autoridade de backend Tonecos para E2E de usuário.
- **do_not_repeat:** não criar projetos e fluxos duplicados, não tocar D1/produção/OrdaX, não iniciar builds concorrentes.

---

## MVP — isolamento de sessões antigas no preview — 03/11/2026

- **Baseline:** `d021f9e2463e155477e20b1ecc80714e45b13f8b` teve Vercel `READY`; o preview estável foi atualizado para esse deploy. Home, modelos, contato e login responderam HTTP 200, `og-image.png` HTTP 200 `image/png`, favicon SVG válido. Uma página pequena de catálogo via proxy respondeu 200 com um item e cursor; sem varredura.
- **Achado:** RequireAuth e RequireAdmin dependiam somente de sessão e papel. Mesmo em `VITE_PREVIEW_READ_ONLY=true`, uma sessão armazenada poderia abrir rotas privadas e renderizar menu com Conta/Admin/Coins/Notificações. O sincronizador do perfil também iniciava mesmo em preview.
- **Correção:** guards existentes redirecionam previews diretamente a `/modelos`; consulta de papel desabilitada em preview; menu usa `visibleUser` somente no ambiente comercial e não consulta saldo ou papel em preview; perfil não inicia sincronizador no modo só leitura. Regras server-side/RLS permanecem autoridade de segurança.
- **Regressão:** seis testes React cobrem modos preview/comercial, sessões antigas e prevenção do sincronizador; regressão estática garante guardas e menu. Novo `release:verify` completo obrigatório no SHA novo, sem suprimir testes.
- **Bloqueios:** MVP com usuários reais requer auditoria de RLS, SMTP, redirects, auth e perfil no Supabase Tonecos; projeto disponível no conector ainda não inclui essa autoridade. Separar domínios antigos OrdaX do Vercel e homologar QA visual desktop/mobile.
- **next_action:** gate CI/preview READY no SHA final, smoke dos caminhos protegidos e eventual atualização somente do alias preview. Manter main/produção NO-GO até conclusão dos gates comerciais.
- **do_not_repeat:** não abrir cadastro no preview, não criar segundo backend, não consultar Cloudflare D1, não tocar OrdaX nem gerar builds paralelos.

---

## Correção de gate do MVP — contato em preview somente leitura — 03/11/2026

- **Falha reproduzida no CI:** `5fd73a460ed2f99e7725d80e9b263a7a6bd8efcf` terminou `ERROR` na Vercel; `release:verify` teve 1 teste falho, 3291 aprovados e 32 ignorados. Falhou `src/pages/ContactArcade.test.tsx` ao esperar o texto comercial `Atendimento pela sua conta` enquanto o preview usa `VITE_PREVIEW_READ_ONLY=true` e apresenta `CONTATO EM PREPARAÇÃO`. A Vercel não deve promover SHA com gate falho.
- **Correção de causa raiz:** o modo preview passa a ser avaliado no componente `ContactArcade`, permitindo aos testes Vitest exercer os dois modos com `vi.stubEnv`. A interface esconde o envio em modo somente leitura mesmo se existir uma sessão legada no navegador, sem criar fluxo paralelo. O caminho comercial autenticado continua intacto.
- **Regressões:** testes explícitos para visitante sem sessão e usuário com sessão no preview read-only; os cenários comerciais existentes ficam sob `VITE_PREVIEW_READ_ONLY=false`, com `unstubAllEnvs` no final. Executar gate completo do SHA novo; aprovação não pode ser inferida só do diff.
- **Estado de lançamento:** contas reais ainda NO-GO por ausência de auditoria do Supabase comercial Tonecos, redirecionamentos, confirmação e-mail e RLS, e pelo vínculo herdado dos domínios OrdaX ao projeto Vercel. O alias público de preview mantém a última revisão `READY`.
- **next_action:** confirmar CI/preview `READY` no SHA final, repontar apenas o alias Tonecos ao commit aprovado e fazer teste visual desktop/mobile.
- **do_not_repeat:** não reduzir cobertura nem pular testes; não habilitar cadastro no preview; não criar backend alternativo, consultar D1 ou alterar produção/dominios OrdaX.

---

## MVP — continuidade da marca e contato na área de usuários — 03/11/2026

- **Baseline validada:** `a283923c39d3a1a18530408f1e3abacc37f82ec8` passou na Vercel com estado `READY`. Este checkpoint avança a experiência de conta na mesma branch, sem criar novo sistema de cadastro.
- **Identidade:** títulos do perfil, notificações, pagamentos, pedidos, grupos e solicitação de migração usam `BRAND_NAME` do Tonecos Studio; equipe de atendimento da solicitação deixa de ser exibida como OrdaX. Nenhum contrato de dados ou rota foi movido.
- **Contato no preview:** a rota /contato em ambiente `VITE_PREVIEW_READ_ONLY=true` não conduz a login bloqueado. Apresenta transparência sobre ausência de atendimento no preview e caminho para o catálogo; em produção mantém o fluxo autenticado existente sem criar formulário anônimo paralelo.
- **Regressão:** `brand.test.ts` verifica identidade dos pontos de entrada autenticados e a mensagem de preview de contato. Gate completo no SHA final segue obrigatório.
- **Bloqueios:** `main`, domínio público e usuários reais continuam `NO-GO` enquanto houver aliases OrdaX herdados no projeto Vercel e o Supabase Tonecos não for auditável para signup, RLS, redirects, SMTP e perfil. Canal comercial real precisa de configuração verificada antes do lançamento.
- **next_action:** validar este commit no gate e browser desktop/mobile, depois definir domínio Tonecos e homologar autenticação no projeto Supabase comercial. Só então promover MVP público sem pagamentos.
- **do_not_repeat:** não criar cadastro paralelo, não iniciar builds concorrentes, não usar projeto Supabase OrdaX, não alterar Cloudflare D1 ou projetos OrdaX.

---

## MVP público com usuários — primeira etapa de contas — 03/11/2026

- **Objetivo explícito:** disponibilizar o Tonecos Studio como MVP incremental para pessoas reais, reutilizando autenticação existente sem criar segundo backend de usuários e sem aguardar recursos avançados de coleções, moedas, pedidos e pagamentos.
- **Baseline:** `61f89733fe9bb56891957015c9d8ab1902811c84`, Vercel preview `READY` e alias estável atualizado para ele. `main` permanece protegida; os três aliases OrdaX herdados ainda estão configurados no projeto Tonecos.
- **MVP público candidato:** Home, universo, modelos/fichas, páginas institucionais e autenticação básica existente. Compras/pagamentos não entram no GO apenas porque o front-end possui rotas.
- **Contas:** exibir `CRIAR CONTA` no menu para visitantes quando o ambiente permite autenticação; aceitar `/login?mode=signup`; manter o mesmo cliente e serviço Supabase. Mostrar confirmação por e-mail quando `signUp` não retorna sessão; nunca garantir que a conta existe em respostas anti-enumeração. Em preview read-only, login/cadastro retorna explicação e link ao catálogo, sem formulário que falharia com 403.
- **Marca e transparência:** corrigir referência `Ordax` no login, Termos e Privacidade; remover prazo comercial fixo não atestado dos Termos e promessa não verificada de monitoramento 24/7 na Privacidade. Conteúdo jurídico restante requer revisão do responsável antes de GO.
- **Segurança do MVP:** conexão Supabase disponível neste chat mostra apenas `ordax-platform`, **não** o projeto de autenticação Tonecos. Portanto não foram inspecionadas configurações de confirmação de e-mail, allowlist de redirect, SMTP, CAPTCHA, RLS, políticas de perfil e signup, nem operações reais de clientes. Não testar registro real com credenciais de produção sem acesso e ambiente isolado.
- **Gates:** testes de fluxo de confirmação na camada `auth-session-service`, branding e Vercel `release:verify` no SHA final; QA visual desktop/mobile e E2E autenticado com conta de teste no backend Tonecos ainda pendentes. Preview `READY` sozinho não equivale a MVP público.
- **next_action:** confirmar SHA final e preview; testar inscrição, confirmação, login e perfil em backend Tonecos isolado; confirmar URL pública Tonecos, separar aliases OrdaX e homologar política legal e RLS antes de abrir o MVP a usuários reais.
- **do_not_repeat:** não criar projeto Supabase alternativo, não testar com usuários existentes, não ativar pagamentos/cadastro no preview de leitura, não repontar produção OrdaX, não consultar Cloudflare D1, não abrir branch/PR duplicada.

---

## Isolamento do bootstrap Cloudflare legado — 03/11/2026

- **Baseline validada:** commit `14ea548ff744bcdad9c396162a32a4e0a6420d40` alcançou Vercel `READY`, `release:verify` terminou, `npm audit` reportou 0 vulnerabilidades de produção, e preview inicial + imagem social responderam HTTP 200. Alias de preview da Tonecos repontado para esse commit, sem promover `main`.
- **Achado:** `.env.example` e `.env.local.template` ainda ofereciam domínio, Pages, Worker, rota e R2 da OrdaX como defaults. O bootstrap antigo de Cloudflare podia alterar DNS, zona, bucket, Worker e Pages da OrdaX com `--execute`. Um uploader legado independente aceitava origem `ordax.com.br` como default.
- **Correção:** templates sem origens, projetos ou buckets legados; retirar da árvore ativa o bootstrap Cloudflare antigo, seu Worker `ORDAX_CATALOG` e o uploader HTTP legado, que não são consumidores do gateway canônico e não eram chamados por `release:verify`. O histórico permanece íntegro no Git. Scripts locais de preparação/importação remanescentes devem falhar fechados com origem/bucket OrdaX, não criar links falsos quando não houver origem aprovada, e nunca acessar o Cloudflare nesta etapa.
- **Regressão:** teste canônico de branding exige ausência dos executores órfãos e dos destinos OrdaX pré-configurados nos templates e scripts. Não criar novo mecanismo de deploy nem segundo catálogo.
- **Bloqueios:** ambiente comercial continua `NO-GO`; aliases `ordax.com.br`, `www.ordax.com.br`, `ordax-three.vercel.app` ainda exigem desvinculação administrativa cuidadosa; docs Cloudflare antigas devem ser classificadas como histórico em trabalho separado.
- **next_action:** `release:verify` do SHA final, smoke em preview, QA visual desktop/mobile, isolamento de domínios OrdaX e definição de hostname próprio Tonecos antes de `main`.
- **do_not_repeat:** não executar bootstrap/Cloudflare/D1, não criar aliases OrdaX, não reativar importer Supabase como SSOT, não alterar projeto OrdaX nem criar branch/PR duplicada.

---

## Scripts Docker órfãos da antiga OrdaX — 03/11/2026

- **Baseline verificada:** branch canônica em `59ed86ddb7c6fcb33963c152262868b59386a231`, preview Vercel `READY`. GET do HTML inicial, `/modelos`, `/og-image.png` e `/favicon.svg` retornaram HTTP 200; a imagem social e as tags `og:image`/`twitter:image` já são servidas no HTML estático.
- **Causa real:** `package.json` mantinha oito scripts `docker:*` herdados; `docker:prod:build` gerava uma imagem `ordax-app:latest`. A árvore inteira do repositório nessa revisão **não possui** Dockerfile, `docker-compose.yml` ou `docker-compose.dev.yml`; os comandos, portanto, não constituem entrega funcional e reutilizariam o nome de outro produto.
- **Correção:** excluir apenas os oito scripts órfãos, sem criar imagens, segundo instalador, segundo build system ou containers paralelos. Preservar `release:verify`, `build`, `test:coverage`, lockfile, deploy e código do catálogo. Nova regressão no teste canônico de identidade verifica a ausência dos comandos e dos arquivos Docker ausentes.
- **Provas:** revisão estática comparou a árvore Git e os scripts existentes, assegurando que comandos de CI e scripts de produto permanecem inalterados. A aprovação do commit final ainda depende de `release:verify` e do deploy `READY` no mesmo SHA, sem afirmar teste local ou navegador interativo.
- **Bloqueios:** `main` permanece NO-GO; três aliases OrdaX ainda constam no projeto Vercel `tonecosstudio`. Exigir isolamento administrativo seguro antes de alterar produção/domínio e QA visual desktop/mobile.
- **next_action:** confirmar o gate da branch final, validar preview, isolar aliases antigos via ferramenta própria, selecionar domínio Tonecos e homologar fluxo comercial isolado.
- **do_not_repeat:** não recriar Docker sem demanda e infraestrutura real; não consultar Cloudflare D1, não tocar Supabase/produção, não abrir PR/branch paralela e não iniciar builds manuais.

---

## Metadados sociais absolutos no HTML servido — 03/11/2026

- **Baseline validada:** `7c24338ee355b3dc16eef49fabdbb35086423bf6` teve `release:verify` concluído e Vercel `READY`. HTTP do preview: `/` e `/modelos` 200, `/favicon.svg` 200 `image/svg+xml` e `/og-image.png` 200 `image/png` (1200×630, 15.786 bytes). O HTML inicial, porém, ainda não incluía `og:image` nem `twitter:image` porque essas tags só eram adicionadas pelo React.
- **Correção sem outro gerador:** o script existente de imagem social gera o mesmo PNG em `dist/` e injeta `og:image`, `twitter:image`, formato, dimensões e texto alternativo em `dist/index.html`, somente quando há um origin HTTPS autorizado. Preview usa `VERCEL_URL` validado para projeto `tonecosstudio`; produção exige `TONECOS_PUBLIC_ORIGIN` explícito com hostname próprio HTTPS, rejeitando aliases antigos da OrdaX e `.vercel.app`. Nenhum domínio foi definido automaticamente como oficial.
- **Regressão offline:** `node --test scripts/branding/generate-og-image.test.mjs` testa preview, host forjado, ausência de origem oficial, origens OrdaX rejeitadas e duplicação de metatags. O `release:verify` continua incluindo a suíte Vitest e o build; o teste Node é executado somente no build.
- **Gate de publicação:** exigir o novo `release:verify`, preview `READY` e verificação HTTP de HTML estático com URL absoluta, PNG real e ausência de redirects da OrdaX. Preview protegido não é compartilhamento público homologado; domínios antigos ainda exigem separação administrativa antes de produção.
- **next_action:** homologar os metadados no novo SHA e seguir QA desktop/mobile. Não alterar `main`, domínios OrdaX, Supabase, catálogo Worker/D1 ou produção.

---
## Saída da imagem social exclusivamente no artefato — 03/11/2026

- **Baseline:** `5f33c09743df8402837157521e089e156e6603de` corrigiu o bloqueio TS6133 e iniciou o gate de preview; não supor aprovação enquanto ele estiver em execução.
- **Correção de ciclo de vida:** `npm run build` primeiro compila com Vite, depois gera `dist/og-image.png` (1200×630, PNG) com o gerador Tonecos existente. Não escrever em `public/`: a geração anterior deixava artefato residual no diretório-fonte, contrariando o teste de ausência do PNG legado após um build local.
- **Regressão:** teste canônico de branding verifica ordem do comando, saída exclusivamente em `dist/` e mantém a exclusão do asset OrdaX legado em `public/`.
- **Gate anterior:** `5f33c097` terminou `ERROR` com 3.286 testes aprovados, 32 ignorados e 1 falha estática em `brand.test.ts`: o regex anterior proibia indiscriminadamente `http://`, incluindo o namespace SVG padrão obrigatório. O teste agora admite apenas esse namespace fixo e continua rejeitando URLs HTTP adicionais, chamadas `fetch` e o nome OrdaX no gerador.
- **Gate:** `release:verify` completo no SHA final e GET do preview em `/og-image.png` com HTTP 200 e `image/png`; sem inferir QA visual nem status de produção.
- **Limite:** metatags OG absolutas dependem de hostname Tonecos estável e verificado; não apontar para aliases OrdaX nem preview efêmero.
- **next_action:** validar mesmo SHA, isolar os aliases OrdaX e realizar QA de navegador desktop/mobile antes de promover `main`.
- **do_not_repeat:** não criar gerador paralelo, outro PNG autoritativo, nova branch, consultas ao D1 nem deploy manual.

---

## Imagem social canônica gerada no build — 03/11/2026

- **Baseline:** commit `65bd0546d772347137af1295926fbeb65f48c6be`, preview `READY` confirmado antes da alteração. O commit `fd983ed` havia removido corretamente o `og-image.png` legado que mostrava ORDAX, mas o arquivo ausente caía no HTML da SPA (`/og-image.png` → HTML, não PNG).
- **Implementação:** um script Node ESM `scripts/branding/generate-og-image.mjs`, executado pelo comando `npm run build`, produz `public/og-image.png` 1200×630 com `sharp` já presente em devDependencies. Identidade Tonecos escura/dourada, origem local determinística, nenhuma consulta ao Worker/D1, Supabase ou serviço externo. `SEOHead` agora usa este PNG, não a imagem fallback do catálogo.
- **Provas:** regressão estática em `src/config/brand.test.ts` para branding, saída/rota da imagem e uso pelo componente SEO; confirmar também `release:verify` no novo SHA e resposta HTTP200 `image/png` em `/og-image.png`. Até então permanece NO-GO. Meta OG absoluta para crawlers sem JS depende do hostname oficial validado; não publicar link absoluto para domínios OrdaX ou previews efêmeros.
- **next_action:** validação com preview protegido, QA de metatags no browser, separar aliases OrdaX do projeto Vercel com remoção segura, e homologar operação comercial em staging isolado.
- **do_not_repeat:** não criar imagens sociais paralelas nem segundo design system; não alterar a main, production, DNS, D1 nem staging comercial.

---

## Identidade interna dos manifestos npm — 03/11/2026

- **Baseline validada:** `fd983ed65754d70f171677129ee5eb4082e33365` atingiu `READY` no preview Vercel (build `dpl_DjhG6iQTN7tA4nTtYfNTnDSAT1Wa`). `/favicon.svg` e `/image-fallback.svg` responderam HTTP 200, com Content-Type SVG e sem a marca antiga; `/og-image.png` ainda não existe e cai no fallback HTML da SPA. Não anunciar card social final antes de adicionar imagem real.
- **Causa:** o pacote npm e os dois registros raiz de `package-lock.json` usavam `ordax-web`, apesar do repositório/produto `tonecosstudio`.
- **Correção:** renomear somente a identidade do pacote para `tonecosstudio` em `package.json` e no lockfile, sem alterar versões, dependências, scripts, árvore de dependências nem conexão do repositório Vercel. Regressão verifica igualdade dos três valores de nome nos manifestos.
- **Aprovação:** este commit exige `release:verify` completo e preview `READY` no mesmo SHA. Ainda não promover para produção.
- **next_action:** consolidar arte social Tonecos em imagem real + metatags adequadas quando domínio oficial for definido; QA desktop/mobile com preview protegido; isolar aliases OrdaX no projeto legado com ferramenta de remoção apropriada.
- **do_not_repeat:** não criar segunda instalação/projeto, não publicar antes de gate comercial, não consultar D1 nem tocar DNS OrdaX.

---

## Identidade visual dos ativos públicos — 03/11/2026

- **Baseline:** branch `integration/tonecosstudio-canonical-20261101` em `1cfdcab68fb360f7b3b4f4673d2b04386924cf68`; últimos previews dessa branch publicados no projeto `tonecosstudio`, com proteção de preview via SSO.
- **Evidência:** `public/favicon.ico` era o ícone do template Lovable; `public/image-fallback.svg` exibia `ORDAX`; `public/og-image.png` ainda continha `ORDAX` e `ordax.com.br`. O `index.html` atual não usa mais esse PNG para compartilhamentos.
- **Correção canônica:** um único `public/favicon.svg` com monograma T e paleta atual, declarado explicitamente em `index.html`; `ASSETS.DEFAULT_ICON_URL` é consumido pelas notificações (sem URL hardcoded paralela); fallback mantém visual existente, substitui somente a marca/texto. Os dois binários herdados `favicon.ico` e `og-image.png` são removidos da branch.
- **Provas de regressão:** `src/config/brand.test.ts` verifica assinatura Tonecos, fonte única do ícone e ausência dos dois arquivos antigos. `release:verify` no novo SHA ainda é gate obrigatório; testes devem ser considerados pendentes até conclusão de build.
- **Limitação deliberada:** não anunciar card social PNG final sem nova arte Tonecos revisada. Não publicar OG antigo nem deixar imagem da OrdaX em páginas Tonecos. O restante do layout escuro/dourado permanece inalterado.
- **Ambiente:** `main`/produção ficam NO-GO; os aliases antigos `ordax-three.vercel.app`, `ordax.com.br` e `www.ordax.com.br` continuam bloqueios de isolamento na Vercel e não foram reatribuídos.
- **next_action:** confirmar `release:verify` e assets servidos no preview; homologar desktop/mobile; separar aliases antigos via ação administrativa suportada, preservando o projeto canônico OrdaX.
- **do_not_repeat:** não recuperar banners/ícones OrdaX, não introduzir segundo design system, não migrar catálogo para Supabase nem consultar D1 em massa.

---

## IDs de navegação do catálogo — 03/11/2026

- **Baseline:** branch exclusiva `integration/tonecosstudio-canonical-20261101` em `7ff5153bf1245167cfa8fa3b2fcd026073c7e593`; preview Vercel do baseline READY. `main` e produção preservadas.
- **Causa identificada:** categorias e franquias vindas do Worker eram verificadas como texto e como IDs únicos, mas não como slugs seguros. A UI constrói rotas internas a partir desses IDs; barras, `..` ou delimitadores de consulta podiam criar navegação incorreta.
- **Correção:** o gateway de leitura reutiliza `validCatalogSlug` para os IDs de categoria/franquia e para a categoria de cada franquia. Respostas inconsistentes falham fechadas; não há consulta extra, reindexação, mecanismo duplicado ou alteração do Worker.
- **Regressões offline acrescentadas:** resposta de categoria com `../admin`, franquia com `../admin` e escopo de franquia `games/../admin`, todos rejeitados após uma única leitura HTTP simulada. A aprovação final depende do `release:verify` do SHA deste commit.
- **next_action:** confirmar gate no SHA final e QA de navegação no preview protegido; isolar vínculos legados de domínios OrdaX antes de qualquer lançamento comercial.
- **do_not_repeat:** não alterar `main`, produção, DNS, D1/R2 nem criar branch/PR paralela ou build intermediário.

---

## Identidade única de imagem entre páginas da galeria — 03/11/2026

- **Baseline:** branch `integration/tonecosstudio-canonical-20261101` no commit `5023ac6601185e2b3498b717ca81d4e0b6744b0d`. O preview `dpl_9FE2tx5kG8r6CyaGmuqWE32Qpbzm` executava `release:verify` durante a preparação. O gate anterior, `74d4c436`, está READY.
- **Problema real de integridade:** `public-catalog-gateway.ts` rejeita IDs de imagens duplicados dentro de cada página, mas não pode conhecer os IDs de páginas anteriores, pois é um gateway de chamadas individuais. `CanonicalModelDetails` pode acabar exibindo duas miniaturas de mesmo ID, com keys React e seleção ambíguas, quando a mesma imagem aparece em páginas diferentes.
- **Correção preparada:** a ficha deriva um `Set` dos IDs já carregados por `useInfiniteQuery`. Se qualquer ID reaparecer entre páginas, a galeria inteira apresenta o erro já existente e a contagem "Indisponível" em vez de mostrar miniaturas inconsistentes. O título, metadados publicados da ficha e a origem canônica da mídia ficam intactos. Não há consultas adicionais, dados locais duplicados, nem novo sistema de autorização.
- **Regressão offline:** duas páginas GET individualmente válidas, ambas contendo `img-1`, `total=2`, com `nextCursor=page-2`; exige rejeição ao receber a segunda página, sem miniaturas ou botão "Carregar mais imagens", e exatamente três chamadas simuladas (detalhe + duas páginas). Manter testes de ciclo e capa.
- **Gate e isolamento:** atualizar branch apenas após `5023ac66` concluir a validação, conferir ausência de commits concorrentes e exigir `release:verify` integral do novo SHA. Não alterar `main`, domínios OrdaX, produção, pedidos, pagamentos, D1 ou R2.
- **next_action:** confirmar o novo gate e verificar integração de galeria no preview protegido. Testes comerciais só em staging isolado.

---

## Recuperação da mídia ao retornar a uma foto — 03/11/2026

- **Baseline:** branch canônica `integration/tonecosstudio-canonical-20261101` no commit `74d4c436dc0d4fe3bf62ca6c9154368de1c35566`, preview Vercel `dpl_4PVnPXvCxCkekzVriWekhTc2XSQT` aguardando gate integral no início desta etapa. `main` e produção não modificadas.
- **Problema auditado:** `CanonicalCatalogImage` persistia `failedSrc` em todo o ciclo de vida do componente. Se a capa A falhasse, o visitante selecionasse B e voltasse à A, o estado antigo de A impedia uma nova tentativa, mesmo quando a falha de rede tivesse sido transitória.
- **Correção causal preparada:** encapsular a renderização da mídia em `CatalogImageSource` com identidade React `key={src}`, mantendo o estado de erro local apenas enquanto o URL permanece o mesmo. Assim A falha e exibe placeholder; B pode carregar; ao retornar à A, o navegador pode tentar novamente. Ícones, aparência e fallback existentes são preservados, sem consulta ao gateway.
- **Regressões offline:** acrescentado teste `A → falha → B → A` ao arquivo `CanonicalCatalogImage.test.tsx`, mantendo testes já existentes de mídia ausente, falha e ícones de categoria/franquia.
- **Gate:** somente enviar após `release:verify` do SHA anterior concluir e após confirmar HEAD, pois o projeto usa builds serializados; exigir nova passagem completa do gate. Nada em pedidos, pagamentos, D1, R2, Supabase ou domínios OrdaX é tocado.
- **next_action:** confirmar gate, integrar alteração no mesmo branch, executar testes completos e inspecionar preview protegido se necessário.
- **do_not_repeat:** sem novas imagens locais, sem duplicar componente para cada página, sem builds paralelos e sem desabilitar preview privado.

---

## Ajuste do gate de regressão da galeria — 03/11/2026

- **Gate `2a983f31d0112eeabdbbcef8d7a1cbbfdd561f54`:** preview `dpl_6u9CdF7wdHci24CmGkUk5yC8tHAJ` terminou ERROR em `test:coverage`, com 3.280 testes aprovados, 32 ignorados, 1 falho em `CanonicalModelDetails.integration.test.tsx:252`.
- **Causa reproduzida:** a interface usa `role="status"` tanto para a seleção de modelos quanto para o aviso de cursor circular da galeria. O teste do ciclo usava `getByRole("status")` sem escopo, gerando ambiguidade. A lógica de bloqueio do cursor não foi a causa da falha.
- **Correção:** localizar a mensagem exata do ciclo e exigir que seu elemento tenha `role="status"`. Mantidos os cliques, três imagens obtidas, botão desabilitado e contagem de quatro requisições simuladas. Não modificar código de produção nem reduzir cobertura.
- **Gate:** exigir `release:verify` completo no novo SHA antes de considerar a proteção aprovada. Preview somente leitura, `main`, Vercel produção e D1 intocadas.
- **next_action:** verificar a suíte de galeria e o gate integral, e avançar na auditoria de catálogo somente se o mesmo SHA for READY.
- **do_not_repeat:** não procurar genericamente um role presente em múltiplas seções na mesma tela.

---

## Correções canônicas de integridade e paginação de galeria — 03/11/2026

- **Baseline concorrente observada:** o commit `366de85c2a331144f2038241536e2112362ef6ca` corrigiu a asserção de contato e executou o preview Vercel `dpl_6MfM5SfWC8MUs6tLufH7Eurbsux3`. Esta frente usa exatamente a mesma branch e preserva integralmente os arquivos de Contato/Arcade. A regra é encerrar primeiro o gate anterior, confirmar HEAD/target preview e só então submeter um novo commit.
- **Respostas públicas com identidades incoerentes:** o gateway de leitura já rejeitava duplicatas em modelos e franquias, mas não categorias nem imagens da galeria. Uma resposta limitada com duas categorias de mesmo ID ou duas imagens com mesmo ID deve falhar fechada com `duplicate_catalog_category` e `duplicate_catalog_gallery_image`, respectivamente. Validação local por `Set` por resposta, sem outra fonte, consulta adicional ou modificação no Worker/D1/R2.
- **Paginação da galeria sem ciclo:** a ficha `CanonicalModelDetails` utilizava `getNextPageParam: lastPage.nextCursor`; embora o gateway rejeitasse o cursor idêntico ao anterior, uma sequência `A → B → A` ainda poderia trazer infinitas páginas quando o visitante clicasse em `Carregar mais imagens`. A correção reutiliza `allPageParams` do próprio React Query para não seguir um cursor já visitado, e informa o visitante, mantendo todas as imagens aprovadas já carregadas, sem criar estado paralelo.
- **Testes offline adicionados:** uma resposta GET de categorias com IDs duplicados, uma página GET de galeria com IDs duplicados e um ciclo de galeria entre 3 páginas com uma única leitura da ficha. Provar parada segura, ausência de botão `Carregar mais imagens` após ciclo e quatro chamadas simuladas ao total, sem nenhuma leitura de produção.
- **Gate obrigatório:** `release:verify` integral no novo SHA antes de qualquer alegação de aprovação. `main`, produção, domínios OrdaX, pedidos e pagamentos intocados. Preview protegido e read-only.
- **next_action:** confirmar o gate novo; depois homologar a apresentação de erros/galeria no navegador protegido e avaliar a futura separação dos domínios antes de lançar.
- **do_not_repeat:** não repetir leituras de D1 para testar cursores, não criar mecanismos de execução ou SSOT paralelos, não iniciar builds concorrentes e não enfraquecer testes/coverage.

---

## Correção pontual do teste de contato — 03/11/2026

- **Falha de CI em `1816f1f2af2f91cdb6e1ad014ce9937c751508a3`:** Vercel `dpl_FFCWktmC2Asw8nuoUwYWhVzuWqoF` ERROR, `test:coverage` com **3.277 testes aprovados, 32 ignorados e 1 falho (3310)**. A única falha foi `ContactArcade.test.tsx:72`: `screen.getByRole("status")` encontrou mais de um elemento de status no DOM. O aviso de login existe e aparece corretamente; o teste estava pouco específico. `ArcadeLayout.navigation.test.ts` passou.
- **Correção:** buscar o heading exato `Atendimento pela sua conta` e verificar o contêiner `role="status"` mais próximo. Preserva verificação da UX de visitante e demais casos de envio, erro e sessão expirada. Nenhum ajuste no produto nem redução de threshold.
- **Gate:** `release:verify` completo obrigatório no SHA seguinte. A métrica de funções só pode ser considerada aprovada após sua medição explícita; sem heurística.
- **next_action:** conferir o novo preview até READY ou causa real; manter produção e Cloudflare intocadas.
- **do_not_repeat:** não usar `getByRole("status")` sem escopo em telas com múltiplos status, não baixar a cobertura, não duplicar builds simultâneos.

---

## Correção causal de cobertura sem afrouxar o gate — 03/11/2026

- **Falha confirmada:** no commit `10b4d37ce49167b8a85e3d16702518e8710440d1`, `test:coverage` terminou com **3.273 aprovados, 32 ignorados e 0 falhas**, mas `functions=69.76%` abaixo de 70%; o pipeline falhou fechado. Não foi erro de rede, pacote ou D1.
- **Correção deste checkpoint:** remover apenas o `ArcadeNav` duplicado e não utilizado em `ArcadeLayout.tsx`, pois `MainLayout.tsx` e `src/components/arcade/index.ts` já usam exclusivamente `ArcadeNav.tsx`. A cópia antiga ainda tinha branding OR DAX e callbacks não usados; eliminá-la reduz duplicação real e melhora a integridade da métrica. Preservar ArcadeHero, Card, CTA, efeitos e visual; testar owner canônico por import/barrel.
- **Testes adicionais de comportamento:** autenticação e envio no contato com dados realmente aceitos pelo serviço; erro de suporte visível sem declarar sucesso; navegação para suporte após resposta bem-sucedida; sessão expirada redireciona para login. O serviço é mockado em testes offline, sem escrita Supabase ou chamada real.
- **Gate obrigatório:** mesmo limite 70% de funções, demais limites da baseline preservados; build e auditorias somente após `test:coverage` PASS. Nenhuma exceção, skip ou relaxamento de métricas.
- **next_action:** acompanhar novo preview até READY/ERROR, corrigir a causa se falhar; manter NO-GO de produção/domínios OrdaX.
- **do_not_repeat:** não baixar `coverageThreshold`, não remover testes, não criar dados de produção ou varrer D1, não modificar main.

---

## Estado operacional atual — 03/11/2026

- **Branch SSOT:** `integration/tonecosstudio-canonical-20261101`.
- **Último gate integralmente aprovado antes desta etapa:** `1c48b3295f90cda201b3905de2f92cc911ebce33`, preview `dpl_CKeQnb4FpUBjPA1AzAn3QTWhXGaV` READY, `release:verify` completo (zero vulnerabilidades na auditoria final de produção).
- **Último gate após o READY anterior:** `10b4d37ce49167b8a85e3d16702518e8710440d1`, preview `dpl_7vyGpiFcH49D9gtRBiwqpX91hsQr` **ERROR somente em cobertura de funções**: 69,76% versus mínimo 70%. 3.273 testes passaram e 32 foram ignorados, sem teste falho; TypeScript, lint e auditorias de autoridade passaram, mas `release:verify` não chegou ao build Vite. A mudança de filtros/contato permanece na branch, sem promoção.
- **Prova real de acervo:** gateway HTTPS, cards e mídias publicados carregados em Chrome para Home, Universo e /modelos; ficha 10H com imagem principal e miniatura; emulação CDP 320–1440 px sem overflow horizontal. Isso não é autorização para pagamentos/produção.
- **Bloqueadores de GO:** `main` não atualizada, vínculos Vercel de domínios OrdaX não isolados, preview read-only impede testes reais de autenticação/pedidos, contatos comerciais e produção ainda exigem staging isolado e revisão editorial; formatação baseline pendente segundo AGENTS.md.
- **next_action:** executar o próximo gate com testes comportamentais adicionais para contato e remoção da cópia antiga da navegação. Não reduzir o limite de cobertura; exigir READY e release:verify completo no mesmo SHA. Não iniciar builds concorrentes.
- **do_not_repeat:** nenhuma varredura integral Cloudflare D1, nenhum mirror Supabase, nenhuma alteração dos domínios OrdaX, nem promoção de produção. Uma branch, sem PRs paralelas.

---

## Correção do gate Arcade Lab — 03/11/2026

- **CI do SHA `87038a1bd5de5873c9a895dc613a5fdf6c770490`:** `release:verify` chegou a 3.252 testes aprovados, 32 ignorados e 1 falho; falha única em `ArcadeLab.test.tsx`, asserção `getByRole("img", {name:"10H"})` encontrou dois elementos, como deve ocorrer no layout que mostra miniatura + modelo selecionado.
- **Conserto:** o teste agora exige exatamente duas imagens com o mesmo `src` canônico de `/catalogo-api/media/...`. Preserva prova de que os dois lugares não usam assets legados. Nenhuma alteração de implementação, preços, dados, controles ou rotas.
- **Validação:** o gate completo deste commit é obrigatório antes de afirmar PASS. Sem builds simultâneos, sem varreduras D1.
- **Produção:** Vercel `main` `fdd2992a...` tem deploy ERROR causado pelo antigo teste `BusinessDayService` que comparava `Date.now()`; essa falha já foi corrigida apenas na branch canônica. A última produção READY anterior mantém alias `ordax-three.vercel.app`; sem troca de tráfego, promoção ou alteração DNS.
- **Proteção do preview verificada:** `VITE_PREVIEW_READ_ONLY=true` e `VITE_UPLOAD_SECURITY_FAIL_CLOSED=true` na branch, embora controles de navegador não substituam fronteiras de servidor.
- **next_action:** confirmar `release:verify` neste SHA, inspecionar UX desktop/mobile autenticada em preview e isolar domínios antes de promover.
- **do_not_repeat:** não enfraquecer asserts, não duplicar imagens, não consultar todas as páginas do Worker, não editar main/produção.

---

## Checkpoint 03/11/2026 — prova HTTP Vercel e Arcade Lab canônico

- **Baseline:** `5781d1f43662d2ff9d189745fec976418dfcebe4` na branch exclusiva, preview Vercel `dpl_G7Yakm7ucvRvb9SR3enFePkaFg7J` READY, `release:verify` finalizado e auditoria de dependências de produção `found 0 vulnerabilities`. Sem mudanças de main/prod.
- **Prova mínima e real do acervo:** GET `/modelos` no preview anterior recebeu HTTP 200 com HTML da aplicação; GET `/catalogo-api/api/catalog?limit=1` recebeu HTTP 200 e exatamente uma referência publicada (`10H` / `NieR` / `Games`), mais `nextCursor`. GET da capa correspondente por `/catalogo-api/media/...` recebeu HTTP 206 Partial Content, `image/webp`, `content-length: 71276`. Uma única consulta limitada a um modelo; sem varredura D1. Isso **não prova** renderização do React no browser desktop/mobile.
- **Auditoria de múltiplas frentes:** a Home já usa a primeira página do gateway canônico com limite 6; porém, o modo `Catálogo real` do Arcade Lab usava `useLandingCatalogModels` (Supabase legado), construía link para `/universo/personagem/:slug` e ainda exibia branding OrdaX. Isso misturava autoridades de inventário e links comerciais.
- **Correção neste commit:** Arcade Lab preserva demo visual independente; quando o visitante escolhe `Catálogo real`, consulta somente `listPage({limit:12})` do gateway de leitura canônico e liga cada imagem/ficha a `/modelos/:slug`. Falha fechada se gateway ausente; sem preço/pedido, scan ou import de modelo Supabase. Branding residual da interface Arcade Lab corrigido para Tonecos sem redesign.
- **Testes offline:** demonstração não consulta Worker, resultados reais usam gateway e links canônicos, erros permitem retentar, seleção via teclado permanece intacta. `release:verify` deste novo SHA permanece **pendente** até evidência do CI.
- **next_action:** acompanhar gate do novo SHA; homologar cards da Home, modelos no Arcade Lab e imagens no browser desktop/mobile; isolar domínios OrdaX e manter NO-GO.
- **do_not_repeat:** sem duplicação de catálogo Supabase, sem consulta D1 em massa, sem alterar App/SSOT além da frente de integração e sem tocar `main`/produção.

---

## Correção TypeScript do media fallback — 03/11/2026

- **Falha observada:** preview `dpl_5jqYaPh5Rs8bxTk3AmHGe7oPUqV2` do commit `c1cdedd679c80627a25d57b30a1d4ed22e8ad87d` bloqueado no `tsc -b` por `CanonicalModelDetails.tsx:211`, onde `imageUrl()` devolvia `string | null | undefined` para a prop `src` que exige `string | null`.
- **Correção:** tipagem explícita `imageUrl(...): string | null` e `?? null` na fronteira do gateway; a Home também normaliza explicitamente o possível `undefined`. Sem mudança de backend, sem I/O adicional, sem exclusão de testes.
- **Próximo gate:** executar `release:verify` no novo SHA e continuar somente após PASS. Main, Cloudflare e produção intocados.
- **do_not_repeat:** manter contratos de ausência de mídia em `null`; não permitir `undefined` na prop compartilhada.

---

## Gate das imagens concluído — 03/11/2026

- **Commit `98632545751aa257c2a647ff46f09155ce8686fc`:** preview `dpl_95ZXutQkLGJFGXDKJeTZaHBQ8JHR` READY, `release:verify` completo até `npm audit --omit=dev --audit-level=high` com `found 0 vulnerabilities`. Typecheck, lint, auditorias de autoridade, Vitest/cobertura e Vite atravessados no mesmo SHA. Não confundir gate automatizado com homologação visual real.
- **Produção:** não promovida, `main` não atualizada, domínios OrdaX ainda vinculados ao projeto e lançamento segue NO-GO.

---

## Gate de navegação concluído — 03/11/2026

- **SHA anterior `7c97e733dcc5c35fe0adf57fa9005dd30f9289ae`:** preview Vercel `dpl_69QkCo7SJRy9mMcX7sa5bzBBsHBB` READY; `release:verify` passou até `npm audit --omit=dev --audit-level=high` com `found 0 vulnerabilities`. Testes da pasta (1/1) e da ficha (6/6) aprovados, incluindo o retorno validado. Preview privado; produção, `main` e D1 intocadas.
- **NO-GO** continua até homologação visual real e desvinculação segura dos domínios do OrdaX.

---

## Consolidação da navegação Arcade sem cópias legadas — 03/11/2026

- **Auditoria:** `MainLayout.tsx` importa `ArcadeNav` da implementação dedicada `src/components/arcade/ArcadeNav.tsx`; o barrel `src/components/arcade/index.ts` também exporta esta implementação. Porém `ArcadeLayout.tsx` conserva outra função `ArcadeNav`, com HUD antigo e logo `ORDAX`, sem consumo no shell canônico.
- **Correção preparada:** eliminar somente a função de navegação e seus links/hook imports em `ArcadeLayout.tsx`, cerca de 156 linhas duplicadas. Preservar `ArcadeHero`, `ArcadeCard`, `ArcadeCTA`, CoinCounter e demais componentes usados, além do arquivo canônico `ArcadeNav.tsx`. A compilação de TypeScript serve de gate para algum import direto remanescente.
- **Gate:** remover junto com a correção causal da cobertura do commit `10b4d37ce49167b8a85e3d16702518e8710440d1`, pois a implementação duplicada e não usada acrescenta funções ao denominador sem uso no shell real. Preservar a navegação dedicada como SSOT. Adicionar teste do export canônico e exigir `release:verify` completo no mesmo SHA, sem alterar o layout gold/Arcade.
- **next_action:** verificar outras exportações redundantes apenas após inventário de consumidores; não fazer supressão em massa sem provas.
- **do_not_repeat:** sem duplicar barra lateral/topo e sem reintroduzir marca OrdaX no frontend Tonecos.

---

## Recuperação dos filtros e formulário de contato — 03/11/2026

- **Ponto de partida aprovado:** `1c48b3295f90cda201b3905de2f92cc911ebce33` em `integration/tonecosstudio-canonical-20261101`. Preview Vercel `dpl_CKeQnb4FpUBjPA1AzAn3QTWhXGaV` **READY**; `release:verify` completo, 8/8 testes da ficha aprovados, build Vite concluído e auditoria final `found 0 vulnerabilities`. Nenhum build concorrente iniciado.
- **Problema dos filtros:** após erro HTTP temporário, `Filtrar por categoria` e `Filtrar por franquia` ficam desativados, sem recuperação visível no próprio formulário. Recarregar a página inteira é desnecessário e repete consultas. Preparação: botões de retry manuais e acessíveis junto aos alertas, usando `refetch()` da query existente. Sem leitura extra enquanto o usuário digita ou quando parâmetros da URL são inválidos.
- **Problema da página de contato:** `ContactArcade` pede nome, e-mail e mensagem como formulário público, mas `submitCustomerContact` só aceita `userId`, nome e mensagem de usuário autenticado; o e-mail digitado é ignorado, e visitantes recebem a exigência de login depois de preencher o formulário. `VITE_CONTACT_EMAIL` não está presente nos envs da Vercel listados para este projeto, então o card “Email Direto” pode aparecer vazio. Não criar endpoint público sem autorização/controle.
- **Correção preparada para contato:** visitantes veem o acesso claro ao suporte via login antes do formulário; quem está autenticado preenche somente nome e mensagem, validados por `contactFormSchema.omit({ email: true })` (SSOT mantida). O card de e-mail direto só é exibido quando um endereço estiver realmente configurado; nenhum endereço foi inventado e nenhuma operação de envio anônimo foi criada.
- **Provas planejadas:** simular 503 em categorias e franquias, exigir apenas o retry explícito e zero leituras adicionais da lista; testar formulário oculto ao visitante, login de retorno `/contato` e formulário coerente com os campos aceitos pelo serviço autenticado. Executar `release:verify` completo no SHA seguinte e manter NO-GO de lançamento.
- **Autoridades e segurança:** API pública de modelos permanece Cloudflare Worker D1/R2 read-only, sem duplicação em Supabase; suporte segue autoridade autenticada existente. `main`, produção Vercel, domínios OrdaX, D1, pedidos e pagamentos intocados.
- **next_action:** publicar essas duas correções juntas no commit seguinte da branch de integração; executar o gate completo do mesmo SHA e só então homologar a interface visualmente.
- **do_not_repeat:** não fazer backup ou migração D1, não adicionar e-mail fake, não simular envio de contato como sucesso, não criar branch/PR paralela, não desativar Deployment Protection.

---

## Retorno seguro da ficha /modelos — 03/11/2026

- **Baseline aprovada:** `1d7c1a740bc8a17cf33059ff70d8d8caebb4d5a8` na única branch `integration/tonecosstudio-canonical-20261101`; Vercel preview `dpl_2zHbGKiutqDTJEAG3bR27XXwyEkK` READY, `release:verify` completo, `npm audit --omit=dev --audit-level=high` com `found 0 vulnerabilities`. Nenhuma alteração na main ou produção.
- **Problema observado no código:** `CanonicalModelDetails.catalogReturnPath` confiava no `location.state.catalogReturnSearch` (até 1024 caracteres) para remontar a URL de retorno, sem reutilizar as regras da API de slug, pasta e busca 3–80 caracteres. Podia devolver a pessoa a filtros inválidos e cair num estado de erro após visitar uma ficha. A validação do retorno à pasta do Universo também duplicava regex e limites.
- **Correção:** retorno de ambos os percursos reutiliza `validCatalogSlug` e `validCatalogFolder` exportados pelo gateway. URL de busca inválida, pasta travessia e escopo inválido voltam a `/modelos` em vez de preservar filtro não aceito. URLs válidas mantêm `q`, categoria, franquia e pasta sem alterar o conteúdo. Sem novas consultas, novos sistemas de estado, mudanças no Worker ou escrita Supabase.
- **Testes:** retorno com todos os filtros válidos; rejeição de buscas curta/longa, categoria com barra, franquia que simula endereço externo, pasta com `../` e pasta sem escopo. Mantidos os testes de retorno à pasta do Universo.
- **Gate pendente:** exigir `release:verify` no SHA deste commit. Não promover `main` ou desligar Deployment Protection. Não consultar D1 em massa.
- **next_action:** verificar o gate e, após PASS, homologar no navegador protegido a navegação para o Universo, fichas e retorno com filtros.
- **do_not_repeat:** não duplicar regex do gateway; sem builds concorrentes; sem desfazer o contrato de NO-GO de produção/domínios OrdaX.

---

## Correção do gate de filtros — 03/11/2026

- **Falha observada na suíte de `cccb8c9c`:** `CatalogModelsArcade.integration.test.tsx` (16 testes, 1 falhou). O cenário `folder=../admin` exibia simultaneamente a mensagem de escopo inválido e o badge de pasta selecionada; `getByRole("status")` encontrava dois elementos. A busca com 81 caracteres e os demais casos executados passaram.
- **Correção causal:** a indicação de pasta selecionada só aparece quando `!invalidFolderScope && !invalidCatalogScope`. Não anunciar pasta malformada como seleção válida. Mantidos bloqueios de rede e o teste original, sem relaxar asserções.
- **Gate:** publicar este ajuste somente quando o build falho estiver encerrado e repetir `release:verify` integral no novo SHA.
- **next_action:** verificar que cenário de escopo inválido gera uma mensagem coerente e nenhuma consulta ao Worker, e manter NO-GO de produção.

---

## Filtros públicos fail-closed e evidências de QA — 03/11/2026

- **Baseline aprovado:** `7637d53295be8d57d6fe47129e037c4652f2d337` na única branch canônica; preview Vercel `dpl_BF3jrMgxpEsqrF1JQ3FVv7ebX4ca` READY. `release:verify` finalizado com `found 0 vulnerabilities` na auditoria final. `main` ainda `fdd2992a...`; produção e domínios OrdaX inalterados.
- **Chrome real autorizado em Windows:** preview protegido acessado via permissão temporária Vercel, sem desabilitar proteção e sem salvar token no repo. Em um carregamento da vitrine, emulação CDP verificou 320/360/390/430/768/1024/1440 px, todos com `scrollWidth == innerWidth`; 24 cards reais. Home apresentou 6 links de modelos e 6 mídias carregadas; Universo 6 links de categoria e 6 mídias carregadas; ficha real do modelo 10H mostrou 2 mídias carregadas sem overflow. Este teste usou apenas buscas normais limitadas da interface, sem auditoria integral D1.
- **Defeito restante:** links diretos para `/modelos` com busca de 81+ caracteres ou slug/pasta inválida são bloqueados no gateway, mas a UI apresenta erro genérico; filtros auxiliares podem chamar endpoints que não contribuem para corrigir parâmetros inválidos.
- **Correção deste commit:** `validCatalogSlug` e `validCatalogFolder` passam a ser exportados da única autoridade, `public-catalog-gateway.ts`. A vitrine reutiliza essas funções para impedir consultas inválidas a modelos, categorias e franquias; mostra mensagens específicas para pesquisa curta, pesquisa longa ou escopo incorreto. Sem duplicar validação.
- **Testes offline:** `q` com 81 caracteres, categoria com barra, franquia que simula URL externa e pasta `../admin`, todos com zero leituras ao Worker. Testes já existentes continuam cobrindo buscas válidas e paginação.
- **Gate pendente:** confirmar o `release:verify` integral deste novo SHA antes de uso ou divulgação. Não alterar `main`, produção, pagamentos, Supabase ou D1.
- **next_action:** homologar comportamento de URLs manuais no preview protegido; isolar com segurança os domínios vinculados a OrdaX antes de qualquer promoção.
- **do_not_repeat:** sem builds paralelos, sem branches/PRs adicionais e sem varredura integral do catálogo.

---

## Gate das capas: correção do teste e SEO — 03/11/2026

- **Resultado no SHA `480667f85a02ad073448e44d87fb8ed50ff34120`:** Vercel `dpl_8BczvuXGanVTE7Dn3qdtcsEWi1Wx` ERROR após `test:coverage`. 3.262 testes aprovados, 32 ignorados, 1 falho (`CatalogArcade.integration.test.tsx:125`). O teste procurava link por regex `/Franquia 1/` e encontrava também Franquias 10–19. Componentes da mídia canônica passaram em 4/4 testes; falha não foi de produção nem do gateway.
- **Correção causal neste commit:** asserção passa a identificar o título exato do card `Franquia 1`, preservando a prova da rota e do fallback de mídia, sem mexer na API ou no componente visual.
- **Outro defeito comprovado por Chrome real:** título duplicado `10H — Tonecos Studio | Tonecos Studio`. O formatter central do `SEOHead` agora reconhece títulos já terminados com a marca ou iguais à marca, evitando duplicação no HTML, OG e Twitter. Testes do React Helmet cobrem Home, ficha e catálogo.
- **Gate pendente:** exigir `release:verify` completo no SHA atualizado; não declarar PASS antes de CI Vercel READY e status GitHub sucesso. Preview segue protegido e read-only.
- **next_action:** verificar novo gate; acompanhar isolamento seguro de domínios OrdaX e homologação de operações comerciais em staging isolado. `main`, D1, pedidos e produção não alterados.
- **do_not_repeat:** evitar regex de correspondência parcial em nomes numerados; não fazer builds paralelos, não varrer D1, não criar novo SSOT SEO.

---

## Verificação visual real e capas do Universo — 03/11/2026

- **Gate `53ff8fed810598c8118c9c6607cf7efe6c3e0708` (último READY):** preview `dpl_DSg9HW7HmvdA6yWdGZkdhuqKMLez` READY, `release:verify` passou com auditoria final `found 0 vulnerabilities`. `main` e produção intocadas.
- **Navegador físico/real:** Chrome headless no Windows `DESKTOP-4UFL03B`, preview protegido acessado por link temporário da Vercel, sem desativar Deployment Protection. DOM desktop apresentou cards com imagens publicadas. Emulação CDP de mobile `390×844`: `innerWidth=390`, `scrollWidth=390` (sem overflow), 24 cards reais, 24 fontes `/catalogo-api/media/`, 6 imagens já carregadas (lazy) e 0 falhas entre essas imagens. Screenshot local temporário fora do Git; sem expor link de acesso. O Chrome CLI headless sem CDP impôs largura mínima de 500px e produziu um falso recorte, descartado após validação.
- **Falha remanescente encontrada:** /universo usava `<img>` cru nas capas de categorias/franquias. URLs existentes que retornassem erro exibiam o ícone quebrado do navegador, enquanto cards de modelos já usavam `CanonicalCatalogImage`.
- **Correção neste commit:** /universo passa a reutilizar `CanonicalCatalogImage` com suporte a `fallbackIcon` personalizável, preservando os ícones Gold `FolderOpen` e `ImageOff` anteriores e sem redesenho. Falha de mídia não gera consulta adicional ao gateway; capa ausente continua com o ícone visual original.
- **Regressões:** falha de imagem em categorias/franquias mantém links navegáveis, testes unitários para ícone de fallback, e exatamente uma consulta limitada por rota nos testes. `release:verify` deste novo SHA deve passar antes de qualquer GO.
- **Próximos bloqueios:** teste completo de fluxo comercial em staging isolado, limpeza segura das associações de domínios OrdaX no projeto Vercel e homologação editorial; sem `main`/produção.
- **do_not_repeat:** não alterar componentes Arcade globais só por falso recorte de viewport, não retirar proteção do preview, não varrer D1, não criar segundo catálogo Supabase.

---

## Paginação da vitrine protegida contra ciclos multi-página — 03/11/2026

- **Problema funcional:** o gateway já rejeitava a devolução do mesmo `nextCursor` de uma requisição, mas um ciclo `A → B → A` atravessando páginas diferentes ainda podia repetir os resultados indefinidamente na UI.
- **Correção implementada:** a vitrine verifica `nextCursor` contra a parte já percorrida do histórico da página atual, desativa `Próxima` e explica o motivo. Retornar à página anterior e avançar novamente para a página já conhecida continua permitido, reaproveitando o cache do React Query.
- **Teste novo:** três páginas HTTP simuladas com ciclo entre cursores; confirma parada segura, retorno à página 2, avanço novamente à página 3 e exatamente três leituras, sem ampliar o escopo de consultas ao catálogo real. O QueryClient do harness preserva o cache normal da aplicação em vez de expirar a página imediatamente com `gcTime: 0`.
- **Gate:** a navegação anterior foi aprovada antes deste commit; exigir `release:verify` completo no SHA da paginação sem reduzir testes.
- **next_action:** homologar navegação com dados publicados no preview e concluir isolamento de domínios antes do GO.
- **do_not_repeat:** sem varredura D1, sem inventar ordenação do Worker, sem ampliar limites de página e sem alterar `main`.

---

## Compatibilidade de compilação do retorno ao Universo — 03/11/2026

- **Falha no gate do SHA `bc00c665f8fdcdc456cd4cd3a9015a168c7551ca`:** `tsc -b` bloqueou `String.replaceAll` no alvo atual (`TS2550`), com diagnóstico secundário de `part` implícito `any` na cadeia interrompida.
- **Correção mínima:** substituído `folder.replaceAll("\\\\", "/")` por `folder.split("\\\\").join("/")`, que mantém a mesma normalização de separadores e validação de travessia sem elevar o alvo TypeScript, reduzir proteção ou alterar URLs.
- **Validação:** exigir `release:verify` completo neste SHA; a melhoria de paginação multi-página segue apenas preparada, sem novo build paralelo.
- **next_action:** confirmar gate, então concluir a proteção de cursores na mesma branch.
- **do_not_repeat:** sem mudanças de toolchain por causa de um único método de string, sem `main` e sem consultas diretas à D1.

---

## Navegação sem perda da pasta de origem — 03/11/2026

- **Situação encontrada:** ao abrir a ficha de um modelo a partir de `/universo/:categoria/:franquia?folder=...`, o botão `Voltar ao catálogo` voltava à lista geral de /modelos e perdia a origem da navegação.
- **Correção preparada:** o link do card transmite apenas o contexto estruturado de categoria/franquia/pasta; a ficha reconstrói exclusivamente uma rota interna do Universo após validar slugs e segmentos sem travessia. Com contexto válido, o botão mostra `Voltar à pasta`; contextos malformados voltam para `/modelos`. Preservado o comportamento atual de filtros `catalogReturnSearch` da lista geral.
- **Regressões:** testes de retorno exato, rejeição de escopo externo/travessia e prova de que abrir a ficha a partir da pasta não dispara consultas adicionais ao Worker. Nenhuma mudança de D1/Supabase, preços, pedidos ou rotas globais.
- **Gate de mudanças:** aplicar e testar somente depois de concluir o build anterior de imagens para evitar builds concorrentes; não declarar PASS antes de `release:verify` neste SHA.
- **next_action:** homologar navegação e responsividade no preview autenticado, isolar domínios do OrdaX antes da promoção.
- **do_not_repeat:** sem URLs externas de retorno, sem estado de seleção duplicado, sem consultas de busca em massa.

---

## Imagens resilientes do catálogo — 03/11/2026

- **Baseline comprovada:** `444722fc73fb38b672d50565c5d7d4c853425b4d`, branch `integration/tonecosstudio-canonical-20261101`, Vercel preview `dpl_FYGCpEkqRmNQ4DGgsQh2JX92k8ah` READY e status SUCCESS, `release:verify` concluído. Continua NO-GO de lançamento e main inalterada.
- **Falha de UX encontrada:** Home, /modelos, Universe e ficha/galeria tratavam a ausência de `cover_storage_key`, mas quando um URL existente falhava ao carregar a imagem, aparecia o ícone nativo de imagem quebrada. Isso é particularmente relevante na vitrine pública de um acervo com milhares de referências.
- **Correção canônica:** componente compartilhado `CanonicalCatalogImage`, que preserva os estilos existentes e troca qualquer imagem com `onError` por `Imagem indisponível` (ou `Sem prévia` no thumbnail); ao trocar o URL de um modelo ou imagem selecionada, apresenta o novo URL sem estado antigo contaminado. Aplicado à Home, /modelos, Universe, capa principal e thumbnails da ficha. Nenhuma consulta nova de Worker, D1 ou Supabase. Nenhum segundo media client ou fallback para acervo legado.
- **Testes novos:** falha de carregamento, troca de URL após falha e ausência total de mídia. `release:verify` do novo SHA deve comprovar lint, typecheck, cobertura, auditorias e build. Não tratar somente unit tests como aprovação do projeto.
- **Teste visual externo:** Chrome headless em Windows foi redirecionado à autenticação Vercel. Acessar conteúdo via `web_fetch_vercel_url` confirmou resposta HTML e API, mas não autentica o navegador real para QA visual. Não desativar Deployment Protection. Mobile/desktop real continua pendente.
- **next_action:** obter o gate completo same-SHA e, com acesso apropriado ao preview protegido, homologar visualmente desktop/mobile; isolar os domínios OrdaX antes de qualquer promoção.
- **do_not_repeat:** sem varredura D1, sem reintrodução de Supabase models no frontend, sem redesenho, sem novos PRs e sem mudança na main/prod.

---

## Continuidade de 03/11/2026 — paginação fail-closed

- **Baseline anterior:** `a5daae89b9488dd5351777aaf55d14f9b790d7ff` na branch de integração. `main` preservada.
- **Causa corrigida:** o gateway verificava o formato dos cursores, mas aceitava cursores repetidos e páginas vazias com `nextCursor`, que podem causar paginação sem progresso na vitrine/galeria.
- **Implementado:** `listPage` e `listGallery` rejeitam os dois estados inconsistentes e mantêm a fronteira somente leitura do Worker. Dois testes de regressão com HTTP simulado cobrem esses casos; sem mudança em Supabase, D1, R2, preços, pedidos ou contratos do Worker.
- **Gates pendentes:** executar `release:verify` no SHA da mudança e QA no navegador desktop/mobile; não confundir preview READY com lançamento autorizado.
- **Vercel:** destino de preview confirmado como `jogo-brasils-projects/tonecosstudio`, não `ordax`. Continuam anexados ao projeto Tonecos os domínios `ordax.com.br`, `www.ordax.com.br` (não verificados) e `ordax-three.vercel.app`; manter **NO-GO** até remoção segura desses vínculos, sem mexer em DNS.
- **next_action:** conferir o Quality Gate no preview desse SHA, homologar paginação/ficha e QA visual, isolar os domínios herdados do projeto Tonecos antes de promoção.
- **do_not_repeat:** sem catálogo duplicado Supabase, varredura D1, novas PRs/branches ou alterações na `main` enquanto NO-GO.

---

## Correção do gate 03/11/2026 — cache do teste do Universo

- **Falha reproduzida no gate da integração `a29c36998e583e0809e20457ecc6499b3a33c8c4`:** `release:verify` concluiu 3.252 testes aprovados, 32 ignorados e apenas 1 falho em 3.285; `CatalogArcade.integration.test.tsx` exigia reutilização do cache ao limpar a busca, mas sua configuração de teste `gcTime: 0` eliminava esse cache imediatamente. O erro foi assertion `expected 2, received 3`, sem evidência de acesso indevido ao catálogo.
- **Correção causal:** removido apenas `gcTime: 0` do QueryClient de teste; o React Query passa a usar o cache padrão do app, mantendo o teste que exige zero consultas durante a digitação e retorno à listagem previamente buscada. Sem ajuste da lógica de produção, da segurança ou dos limiares.
- **Validação:** aguardar o gate completo no SHA deste commit; bloquear `main` e lançamento até PASS same-SHA e isolamento dos domínios. Os warnings do restante da suíte foram produzidos por cenários simulados e não equivalem a novos testes falhos.
- **next_action:** verificar Vercel preview deste SHA e homologar interface real em desktop/mobile.
- **do_not_repeat:** não trocar assertions por timers, não eliminar cache do test harness que pretende validá-lo, não disparar varreduras D1, não alterar `main` ou domínios OrdaX.

---

## Checkpoint de 03/11/2026 — busca pontual no Universo

- **Baseline:** `0937fcd0fe3c201d4fb2174c30a00b64f384ac12` no branch canônico; Vercel `dpl_2XJKq4scczzLsHMaJ1MR4kcef3ka` READY, status Vercel SUCCESS e `release:verify` passou com auditoria final `found 0 vulnerabilities`. Sem deploy de produção.
- **Auditoria funcional:** a página `/universo` já usava `createPublicCatalogGateway`, e não uma cópia Supabase. Por isso NÃO foi duplicada ou migrada novamente.
- **Melhoria:** na categoria do Universo, a lista inicial continua limitada a 24 franquias. Agora há busca por nome com submissão explícita e parâmetros no URL; utiliza apenas `GET api/franchises?category=...&q=...&limit=24`, sem varrer todas as páginas nem listar todos os modelos. Busca curta ou excessiva de link direto falha fechada sem I/O. Link para limpar volta à lista padrão e reaproveita cache.
- **Prova adicional (pendente do gate deste commit):** teste de categorias, busca que encontra franquia fora das primeiras 24, validação de zero consultas durante digitação e de ausência de request com `q` curto.
- **Pendências:** verificar `release:verify` no novo SHA; revisar UX real em desktop/mobile e isolar os domínios OrdaX vinculados antes de promoção.
- **next_action:** observar preview no SHA exato, corrigir qualquer falha causal e continuar a homologação visual/funcional; PR antiga #3 contém somente fix de teste cache já incorporado e pode ser encerrada sem merge após prova.
- **do_not_repeat:** sem scan D1, sem segundo catálogo Supabase, sem PR/branch paralela e sem alteração em main/prod.

---

## Consolidação de 03/11/2026 — gateway verde e cache sem perda de dados

- **Baseline verificada:** `f490c5786e7ad9e15701d7126b90234f11e7734e` na única branch de integração; Vercel `dpl_4chA6gWzu8EvKDW6i7ur5wNF913k` terminou READY no próprio SHA, como **preview** sem alvo de produção. `release:verify` concluiu typecheck, lint, auditorias, testes/cobertura, build e `npm audit --omit=dev --audit-level=high`.
- **Resultados do gate:** cobertura global **70,34% funções**, **77,96% linhas** e auditoria final `found 0 vulnerabilities`. O limiar de 70% foi atendido sem afrouxamento. Isso NÃO substitui homologação visual, operações autenticadas ou isolamento de domínios.
- **Falha funcional corrigida neste checkpoint:** `getHolidays` armazenava um `Set` de datas e devolvia feriados com `id` e `name` vazios no cache. Agora mantém cópias completas dos registros do ano e retorna cópias, preservando metadados e impedindo que alterações do consumidor contaminem o cache.
- **Testes de regressão adicionados/reforçados:** metadados após cache-hit, mutabilidade externa, leitura única na repetição de cálculos/consultas e invalidação depois de adicionar feriado. Asserções temporais flutuantes substituídas por verificação determinística de I/O; consolida a intenção da PR antiga #3 na branch canônica, sem merge na `main`.
- **Validação deste novo SHA:** aguardar `release:verify` e smoke visual completos antes de afirmar PASS. Sem consultas diretas D1, R2 ou mutações Supabase; sem deploy de produção.
- **Bloqueio de lançamento:** os domínios herdados `ordax.com.br` e `www.ordax.com.br` (não verificados) e `ordax-three.vercel.app` continuam vinculados ao projeto Tonecos na Vercel. Não alterar DNS nem promover sem remover com segurança esses vínculos.
- **next_action:** acompanhar o preview exato da correção de cache e validar fluxo real do catálogo, identidade de navegação e responsividade; fechar PR #3 somente depois de verificar que o conserto equivalente está integrado no branch canônico e o gate passa.
- **do_not_repeat:** sem branch/PR paralela, sem duplicação de catálogos ou clientes Supabase, sem varrer a D1, sem promover `main` prematuramente.

---

## Gate real e continuidade da vitrine — 02/11/2026

- **Branch única / código atual auditado:** `f75c5ef74b2cd3dcc41528cfab6d43a0ae1144b2`, sem merge na `main` e sem deploy de produção.
- **Vercel confirmado:** projeto `jogo-brasils-projects/tonecosstudio`, preview `dpl_J83NCKuuV8TVoGxLNPBxEzBwAA1u` terminou em `ERROR` após alcançar a medição de cobertura. `release:verify` bloqueou em **cobertura global de funções 65,8% < 70%**. Não reduzir o threshold, excluir arquivos ou usar mocks de sucesso para aumentar artificialmente a métrica.
- **Gates observados no mesmo SHA:** TypeScript, lint, auditorias que antecedem testes e 9/9 testes React do catálogo/ficha **PASS na Vercel**. Vitest de gateway **12/12 PASS local**. A mesma suíte React foi validada **9/9 no desktop Windows autorizado** com HTTP simulado. A correção de espera assíncrona em `f75c5ef` resolveu a única falha do preview anterior (`30d2ca7`: 2.794 PASS, 1 FAIL, 32 ignorados). `npm run build` e a auditoria de dependências subsequentes ao gate de cobertura **não foram alcançados**.
- **Catálogo e UI:** API Cloudflare Worker permanece SSOT de modelos/mídias; franquias têm descoberta indexada sob demanda (`GET /api/franchises`, UI limita a 24), categorias, busca e cursors preservados, sem carga integral do acervo. Visual escuro/dourado original do Arcade **restaurado no código**, aguardando comparação por screenshots desktop/mobile. Tags ainda não têm contrato canônico na API; não simular filtros/consultas D1.
- **Separação de produtos ainda pendente:** o projeto Tonecos Vercel continua registrando `ordax.com.br` e `www.ordax.com.br` como domínios **não verificados**, além de `ordax-three.vercel.app`. Remover os domínios do OS pelo painel do projeto Tonecos antes de promover; não remover DNS ou alterar implantação OrdaX OS.
- **Auditoria de duplicações sem mudança de código:** `src/components/arcade/ArcadeLayout.tsx` contém cópias de `ArcadeNav`, `CoinCounter` e efeitos também existentes em componentes específicos. `MainLayout` usa a navegação separada `src/components/arcade/ArcadeNav.tsx` (marca Tonecos). Algumas funções são idênticas, outras diferem; não fazer remoção em massa sem mapear importadores e comparar comportamentos visuais.
- **Próxima ação comprovável:** aumentar cobertura de funções com testes reais em serviços relevantes e descobertos como pouco exercitados; repetir o gate de 70% no mesmo SHA e avançar para build, auditoria de dependências e QA de navegador. Não publicar ou mesclar enquanto NO-GO.

---
## Catálogo grande: filtro canônico por franquia e correção React Query — 02/11/2026

- **Causa raiz resolvida na branch:** `usePricingSettings` passa uma função sem argumentos ao `queryFn` do TanStack Query. `fetchPricingSettings({ forceRefresh: true })` continua disponível para as coleções e mantém o SSOT do serviço comercial. A incompatibilidade anterior produzia `TS2769` no hook e `TS2339` em consumidores.
- **Franquias, sem catálogo duplicado:** o gateway Cloudflare existente passou a expor `listFranchises` pelo endpoint oficial `GET /api/franchises`, com categoria opcional, busca explícita `q` (3–80 caracteres), máximo 48 itens por contrato e validação estrita de `truncated`, IDs, categorias e contagens. A vitrine solicita somente 24 resultados quando o usuário abre o filtro ou pesquisa uma franquia, exibindo aviso de recorte incompleto. Nada de baixar toda a taxonomia ou consultar D1 diretamente.
- **Fluxo preservado:** categoria, franquia e busca agora participam da URL e do escopo do cursor; trocar de categoria limpa franquia incompatível. Seleção continua até 50 modelos, sem orçamento automático. Interface mantém `ArcadeHero`, `ArcadeCard`, tema escuro/dourado e a ficha por slug/galeria versionada.
- **Validações concluídas:** Vitest gateway **12/12 PASS** isolado, TypeScript strict do gateway **PASS**, esbuild dos TSX e do hook **PASS**, Prettier aplicado; a suíte React do catálogo/ficha **9/9 PASS na Vercel** após correção da condição de corrida em `f75c5ef`, também **9/9 PASS** no desktop autorizado. A cobertura global de funções continua abaixo do mínimo de 70%.
- **Limitação explícita:** tags ainda não fazem parte do contrato público do Worker, não criar tags fictícias/filtros client-side. A `main` segue preservada, sem mudanças no D1, R2, Supabase ou domínios.
- **Próximos gates:** `release:verify` do SHA final, cobertura 70% funções, audit e build; QA visual desktop/mobile e domínio próprio Tonecos. Sem fallback, sem aprovação antecipada.

---

## Recuperação visual do catálogo — 02/11/2026

- **Código restaurado na branch:** `src/pages/CatalogModelsArcade.tsx` reutiliza `ArcadeHero`, `ArcadeSectionTitle` e `ArcadeCard`. `src/pages/catalog/CanonicalModelDetails.tsx` reutiliza `ArcadeCard` e `ArcadeSectionTitle`, com fundo escuro e detalhes dourados.
- Removidos do `src/index.css` os sete tokens temporários `--tonecos-*` da paleta marfim/oliva. Nenhum segundo design system foi criado.
- **Contratos preservados:** gateway Cloudflare de leitura, 24 modelos por página, busca, categorias sob demanda, paginação por cursor, seleção de até 50 IDs, URL compartilhável e galeria versionada incremental. Sem regresso à base de modelos do Supabase.
- **QA local:** Prettier 3.6.2 aprovou quatro arquivos; esbuild 0.25.12 transpila listagem, ficha e teste de integração. **O CI completo, Vitest/coverage do novo SHA e comparação visual desktop/mobile ainda são obrigatórios** antes do merge.
- **Tags:** o gateway atual expõe categoria/franquia/coleção, mas não contrato canônico de tags. Não duplicar campos nem inventar filtro até o Worker disponibilizar contrato explícito.
- Nenhuma migração, consulta D1, deploy de produção ou alteração da `main` foi realizada. O preview de integração ainda requer gates verdes.

---

## Decisão visual canônica — 02/11/2026 (prioridade sobre planos anteriores)

- **Decisão explícita do proprietário:** manter a aparência do antigo OrdaX; ajustar somente a marca **Tonecos Studio** e a capacidade de apresentar mais de **2 mil modelos** com tags, categorias, franquias, filtros, busca, galeria e paginação. Preservar a Home, HUD, navegação, fontes, dark/gold, cards, área do cliente e administração onde funcionam.
- **Restauração em código concluída, homologação pendente:** a vitrine e a ficha voltaram a reutilizar componentes Arcade e a paleta escura/dourada no commit `52224ee`, sem tokens marfim/oliva. Preservados Worker, cursor, slug, seleção e galeria; ainda faltam screenshot/E2E desktop/mobile, CI integral e conferência de contraste. Não executar redesign editorial.
- **Proibição:** não executar redesign editorial completo; não eliminar o visual arcade; não duplicar o componente legado com acesso Supabase para renderizar dados Cloudflare. Integrar a funcionalidade nas superfícies visuais já existentes.
- **Gate novo:** confronto visual desktop/mobile do `main` pré-migração (`fdd2992a7`) contra a branch atual, preservando fluxos de navegação; checar alto volume/estados de tags, busca, filtros, 24 por página e URLs estáveis. Não alegar preservação total enquanto a divergência persistir.
- **Próxima ação de UI:** corrigir a apresentação da listagem e da ficha, mantendo funcionalidade e contratos canônicos; validar regressões e CI. Não consultar D1 ou duplicar catálogo Supabase para testes visuais.

---

## Checkpoint SSOT de preços comerciais — 02/11/2026

- **Fonte única de leitura e validação:** `src/services/pricing/pricing-settings-service.ts` permanece a autoridade canônica para preços, Pix, sinal e parâmetros operacionais. `src/services/pricing/collection-pricing-service.ts` foi refatorado para **delegar** a `fetchPricingSettings({ forceRefresh: true })`, sem uma segunda consulta direta a `system_settings` nem duplicar parse/validadores.
- **Atualização sem preços obsoletos:** a apresentação geral mantém seu cache existente; a leitura para cálculo de uma coleção exige valores frescos e passa pelas mesmas validações de preços. Preço customizado sem contrato servidor é rejeitado, nunca inferido. Supabase segue autoridade do negócio e não há integração comercial automática com os IDs Cloudflare.
- **Prova local:** Vitest 3.2.4 **32/32 PASS** em Desktop Windows autorizado, com mocks explícitos da API de dados e os serviços de produção originais. Casos: campos faltantes, valores inválidos, depósitos acima do Pix, cache e refresh, coleções sem permissão, preços customizados, divergência entre desconto e total, impostos e saldo. Prettier 3.6.2 **PASS** nos quatro arquivos.
- **Release:** o preview do SHA anterior `2c3781cac9474a7d03efa65cf700529cc24c8d29` ainda não foi considerado verde; o último bloqueio conhecido no Vercel era cobertura global de funções `65,62%` contra `70%`. **Não reduzir os thresholds, não mascarar falhas ou afirmar liberação com apenas testes isolados.**
- **Infraestrutura:** `ordax.com.br` e `www.ordax.com.br` continuam vinculados (não verificados) ao projeto Vercel `tonecosstudio`; a separação completa de domínios é gate obrigatório para produção. Main, D1, R2, pedidos e pagamentos não foram alterados.
- **Próxima ação:** examinar o preview do SHA atual e suas métricas reais, corrigir as causas que ainda bloquearem `release:verify` (inclusive cobertura e auditorias) e homologar UX/E2E. Não criar branches nem PRs paralelos.

---

## Checkpoint de cobertura e QA da vitrine — 02/11/2026

- **Baseline antes deste checkpoint:** `9b6d682d6e943262efa47cd9859618c29806a215`, branch `integration/tonecosstudio-canonical-20261101`, main `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`, sem merge.
- **Vercel:** o preview da baseline iniciou após cancelar 15 previews antigos e terminou em **ERROR**, mas avançou por typecheck, lint e auditorias de autoridade. O Vitest fechou com **2.730 testes aprovados**, **0 falhas** e **32 ignorados**. Cobertura total: linhas/declarações 74,04%, branches 78,02%, **funções 65,26%**. O requisito de funções permanece 70%; não foi reduzido. Build de produção e audit de dependências após cobertura **não foram executados** nesse preview.
- **Nova implementação neste checkpoint:** `src/pages/CatalogModelsArcade.integration.test.tsx` cobre, com HTTP simulado e componentes de UI isolados, 7 cenários de busca mínima, categoria sob demanda, paginação cursor, seleção temporária entre páginas, URL compartilhável, galeria versionada, falha fechada e retries de catálogo/ficha/galeria. **Vitest isolado 7/7 PASS no Desktop Windows autorizado**; ainda exige execução dentro da suíte integral do mesmo SHA.
- **Formatação:** auditoria dos 24 arquivos TS/TSX alterados desde a main; 17 exigiam normalização. Prettier **3.8.1** confirmou o conjunto formatado localmente. Essa mudança é mecânica e não altera contratos comerciais.
- **Infraestrutura:** Vercel de produção `tonecosstudio` (projeto existente `prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`) segue com `ordax.com.br` e `www.ordax.com.br` registrados, porém **não verificados**. Removê-los no projeto Tonecos, preservando o OrdaX OS, antes de qualquer merge, promoção ou GO. Apenas previews sem alvo de produção foram afetados pela limpeza.
- **Próxima ação:** observar o preview do SHA gerado por este commit; corrigir a cobertura funcional até o patamar de 70% **com testes reais**, sem excluir arquivos nem alterar o threshold; continuar pelo build, auditoria `npm audit --omit=dev --audit-level=high`, Quality Gate, E2E móvel/desktop e homologação do proxy antes de promover. Não iniciar varreduras D1/R2/Supabase nem criar novo catálogo ou PR paralelo.

---

## Checkpoint técnico — 02/11/2026: correção da ficha e liberação do escopo Vercel

- **Destino Vercel confirmado:** projeto existente `tonecosstudio` (ID `prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`) no escopo `jogo-brasils-projects`, ligado a `washingtonmsdj/tonecosstudio` e Vite/Node 24. A renomeação preservou o ID do projeto.
- **Domínios antigos ainda vinculados:** `ordax.com.br` e `www.ordax.com.br` seguem **não verificados** no projeto Tonecos. **Remover ambos antes de promover à main/produção** e homologar um domínio exclusivo Tonecos. Não declarar isolamento completo até a limpeza.
- **Causa raiz do preview falho:** o Vercel build no commit `bf162ef` falhou em TypeScript (`CanonicalModelDetails.tsx`, linha 89, `TS1127` e erro derivado na linha 239) por sequências literais `\\n` dentro do JSX.
- **Correção nesta entrega:** substituir as cinco sequências `\\n` por quebras de linha reais, formatar a ficha compartilhável, o gateway de galeria e seus testes sem alterar as autoridades.
- **Provas locais isoladas:** Vitest 3.2.4, `public-catalog-gateway.test.ts` **9/9 PASS** incluindo 2 cenários de galeria; TypeScript estrito com `--skipLibCheck` aprovado no gateway; esbuild aprovou a sintaxe TSX da ficha corrigida; Prettier 3.6.2 aprovou os arquivos modificados. Ainda não são substituto do `release:verify` integral, auditorias de dependências, build ou E2E.
- **Segurança:** sem acesso a D1/R2/Supabase de produção, sem preços, pagamentos ou pedidos modificados; `main` preservada. A Vercel registra 49 advisories totais no `npm ci` do preview `bf162ef`; investigar especialmente `npm audit --omit=dev --audit-level=high` com a árvore instalada, sem `npm audit fix --force` automático.
- **Próximo passo:** ler o resultado do preview isolado desta correção, corrigir a próxima falha causal no mesmo branch, executar gates completos no mesmo SHA; depois retirar os dois domínios antigos e homologar mídia/proxy first-party, UX móvel e orçamento idempotente.

---

## Checkpoint operacional — 02/11/2026

- **HEAD da integração:** `bf162ef20bcd56f0d9b6c45b32d729c794904e06` — `feat(catalog): add canonical model detail pages and galleries`. A `main` segue preservada em `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`.
- **Implementado na única branch:** cartões de `/modelos` abrem links diretos compartilháveis; slugs usam a ficha canônica. A ficha carrega os metadados pelo Worker e uma página de até 24 imagens pelo endpoint versionado `/api/models/:slug/images`, valida cursor/versão/payload no gateway e permite carregar mais. Rotas antigas com UUID continuam no componente legado.
- **Testes adicionados, ainda não executados:** dois casos cobrem leitura limitada/versionada da galeria, versão obsoleta e resposta acima do limite em `public-catalog-gateway.test.ts`. Não foi possível executar `npm ci`, TypeScript, lint, Vitest, coverage ou build neste ambiente; o checkout local falhou porque não havia credencial GitHub para o repositório privado. Não declarar PASS com base apenas no código versionado.
- **CI:** `.github/workflows/quality.yml` dispara push somente em `main` ou execução manual. Para o SHA atual, o único check run é Vercel Preview Comments (sucesso de comentários), sem Quality Gate. O status Vercel do SHA está pendente.
- **Bloqueio Vercel P0:** o preview automático atual aponta para `jogo-brasils-projects/ordax`. A Vercel API recusou leitura do deployment por falta de autorização no escopo `jogo-brasils-projects` (403). Ainda não há prova de isolamento Tonecos; o preview não foi promovido nem associado ao domínio do OS. Não enviar commits adicionais até corrigir/verificar esse vínculo, nem mesclar ou promover.
- **Sem alterações de produção:** nenhuma migration Supabase, ingestão, consulta de D1, gravação de orçamento/pedido, publicação de Worker ou promoção foi executada.
- **Next action:** resolver a integração Vercel automática em equipe autorizada; então executar `npm ci`, o quality gate completo e a revisão desktop/mobile/E2E no mesmo SHA, sem promover antes da prova de isolamento. Próxima fatia de produto após esses gates: migrar `/universo` ao Worker e definir o contrato idempotente do orçamento comercial.
- **Do not repeat:** não varrer D1/R2, não recriar catálogo no Supabase, não usar `ordax.com.br`, não repetir builds de catálogo para preencher UI, não fazer push de código enquanto o destino Vercel for o projeto `ordax`.

---

## Histórico anterior (somente evidência datada — não substituir o checkpoint atual)

### Checkpoint legado de 2026-09-17

> Histórico do antigo `washingtonmsdj/ordax`. Este texto NÃO representa o estado vivo do Tonecos Studio.

## Estado

**Lançamento público: NO-GO.**

HEAD de código antes deste checkpoint documental:

- `1cdb04c7614a03900d3b15b0f6f972e1a6cc8898` — `test: await payment realtime connection state`.

O drift principal entre aplicação e schema vivo foi reconciliado. TypeScript, lint e todas as auditorias de autoridade/segurança estão passando em execução real da Vercel. O `test:coverage` foi reduzido de dezenas de falhas para **um único teste conhecido** no último SHA executado; esse teste já possui correção no HEAD, mas o HEAD ainda não recebeu execução completa por rate limit da Vercel.

Regra P0: **não recriar contrato aposentado, não esconder drift com cast, não reduzir cobertura/audits e não declarar PASS sem execução real no mesmo SHA.**

## Melhor prova executada

### Vercel — SHA `4a6f64fcf39ba04b935d2da31a57b9c777f8df0a`

Deployment:

- `dpl_4gQJxy4R3enhDQCjVH8mb4ZAcJ2w`;
- alvo `production`;
- `release:verify` executou de fato;
- TypeScript PASS;
- lint: **0 errors / 182 warnings**;
- Supabase access/types PASS;
- pricing read authority PASS;
- profile authority PASS;
- notification authority PASS;
- public system settings authority PASS;
- secure upload scanner source audit PASS;
- commercial authority PASS;
- `ProductionKanbanBoard.test.tsx`: **8/8 PASS**;
- `enhancements-phase-checkpoint.test.ts`: **21/21 PASS**;
- `file-upload-service.test.ts`: **11/11 PASS**;
- `business-days.test.ts`: PASS;
- `deliveryService.test.ts`: PASS;
- resumo final do Vitest: **1 failed | 223 passed | 3 skipped test files**;
- testes: **1 failed | 2621 passed | 32 skipped**;
- única falha: `src/hooks/use-payment-realtime.test.tsx` — primeiro teste verificava `isConnected` antes do callback assíncrono `SUBSCRIBED` do mock concluir;
- `release:verify` parou em coverage por essa única falha, portanto build e `npm audit --omit=dev --audit-level=high` não foram alcançados neste SHA.

A falha acima foi corrigida depois desse gate em:

- `1cdb04c7614a03900d3b15b0f6f972e1a6cc8898` — `test: await payment realtime connection state`; a asserção de conexão agora aguarda dentro de `waitFor`, sem alterar runtime.

O status Vercel desse HEAD foi rate-limited. Isso **não é falha de código**, mas também **não é prova de PASS**.

## Evolução recente comprovada

### SHA `abc93266106e4900365b9897b2540fe2175fe8b6`

Deployment `dpl_5t5HiyQiXgNtF8F4XFCTvDrTgSzp`:

- TypeScript/lint/audits PASS;
- `enhancements-phase-checkpoint`: **21/21 PASS**;
- `file-upload-service`: **11/11 PASS**;
- final: **222 test files PASS / 2613 tests PASS**;
- restavam somente a suíte Kanban antiga e a corrida do primeiro teste realtime.

### SHA `93418edef38852c94e03e7fa7a2ecca77eb5d6c6`

Deployment `dpl_2JtoQtqGTw48uW13ojaVvHpXw8P8`:

- TypeScript/lint/audits PASS;
- cobertura já havia reduzido os bloqueios para 6 ocorrências conhecidas: 4 testes de peça bônus, 1 fixture de `File.size` e a suíte Kanban com mock hoisted inválido.

Esses blocos foram corrigidos sem relaxar thresholds nem restaurar contratos antigos.

## Correções recentes no `main`

- `2164a10547639b3ba240a047145074917bef4e2a` — testes de peça bônus agora mockam a fronteira canônica de mutações e `.maybeSingle()`;
- `abc93266106e4900365b9897b2540fe2175fe8b6` — teste de comprovante cria arquivo realmente maior que 5 MB, sem redefinir `File.size`;
- `4a6f64fcf39ba04b935d2da31a57b9c777f8df0a` — Kanban deixa de referenciar imports hoisted inválidos e passou 8/8 no gate real;
- `1cdb04c7614a03900d3b15b0f6f972e1a6cc8898` — teste realtime aguarda o estado `SUBSCRIBED` de forma determinística.

Também nesta continuação:

- `quote_items` foi removido dos fluxos vivos de quote/preorder; a tabela continua aposentada/ausente;
- `choice-service` e `reminder-service` deixaram de re-tipar artificialmente o cliente Supabase;
- delivery passou a usar `Database["public"]["Tables"]["subscription_deliveries"]["Row"]` em vez de campos/casts fantasmas;
- `CustomerPaymentDetails`, `groupBroadcast`, produção e mocks históricos foram alinhados aos contratos reais;
- timezone/business days permanecem verdes no executor UTC.

## Backend/Supabase já ativado

Projeto Supabase: `pdytjhtjlxvbbeuxgnms` (`Ordax-2026-1`).

### `get-my-subscriptions`

- v6 `ACTIVE`;
- `verify_jwt=true`;
- schema atual de `subscription_deliveries` respeitado;
- rollback da v5 versionado.

Pendente: smoke autenticado real.

### `upload-payment-proof`

- v1 `ACTIVE`;
- `verify_jwt=true`;
- bucket privado, rate limit, ownership, gravação de upload e notificação administrativa previamente validados;
- rollback de função anteriormente ausente documentado;
- source audit do scanner passa de forma fail-closed.

Pendente:

- smoke autenticado real;
- confirmar operacionalmente a existência/configuração de `MALWARE_SCANNER_URL` no ambiente. O conector Supabase disponível nesta sessão não expõe secrets/env vars, portanto essa existência **não está provada**.

### `get_collection_pricing(uuid)`

Função pública estreita restaurada e verificada:

- `SECURITY DEFINER`, `STABLE`, `search_path=public, pg_temp`;
- `anon/authenticated` recebem somente `EXECUTE` na função;
- `collection_tier_assignments` continua sem SELECT público;
- execução sob `ROLE anon` funciona;
- ThunderCats retorna defaults vivos `150.00 / 142.50 / depósito 30.00`.

### `admin_upsert_price_category`

- função corrigida e aplicada;
- não grava coluna inexistente `description`;
- `p_description` não vazio é rejeitado;
- `service_role` possui `EXECUTE`;
- `anon/authenticated` não executam diretamente;
- rollback versionado na migration correspondente.

Pendente: remover a falsa UX de descrição de categoria ainda existente em `CreditCharactersContent.tsx`. **Não remover a descrição de personagem**, que é um campo real.

## Aplicação ↔ schema — concluído

- coin purchase RPCs aposentados removidos;
- collection limit aposentado removido;
- badges/settings aposentados reconciliados;
- contextual pricing de assinante aposentado;
- produção hidratada por `production_queue + production_stages + profiles`;
- browser email/production notifications sem colunas antigas;
- subscription tracking sem `shipping_carrier` inexistente;
- standalone admin service reduzido aos RPCs vivos;
- `orders-service` sem `search_unified_orders`/`quote_items` inexistentes;
- status filtrados por domínio/tabela;
- pricing público não depende de RPC fantasma no frontend;
- principais Edge Functions alinhadas ao schema vivo.

## Regras permanentes

- `src/integrations/supabase/types.ts` é SSOT gerado; não editar manualmente;
- não criar clientes `Database` falsos;
- não usar `as unknown as` para esconder drift;
- UI não é fronteira de autorização;
- DML administrativo permanece server-authoritative;
- `subscription_deliveries` não possui `shipping_carrier`;
- não restaurar campos denormalizados aposentados em `production_queue`;
- não expor `collection_tier_assignments` para o browser;
- não restaurar `search_unified_orders`, `quote_items` ou pricing contextual antigo.

## Executor / CI

### Vercel

É a prova que está executando `release:verify` de fato. A integração sofre serialização/rate limit e nem todo push gera deployment.

Melhor deployment concluído:

- `dpl_4gQJxy4R3enhDQCjVH8mb4ZAcJ2w`;
- SHA `4a6f64fc...`;
- somente 1 teste falho em 2654 testes coletados;
- essa falha já está corrigida no HEAD `1cdb04c7...`, ainda sem run completo no mesmo SHA.

### GitHub Actions

Continua não confiável como gate:

- jobs historicamente são criados;
- `steps: []`;
- `runner_id: 0`;
- falha antes de checkout/comandos.

Não interpretar isso como falha da aplicação.

## P0 atual

### P0.1 — fechar `test:coverage` no HEAD

- [x] timezone/business days estabilizados;
- [x] ciclo sem dupla conversão de Bahia;
- [x] principais testes de produção migrados para hooks/services canônicos;
- [x] bonus piece suite verde 21/21;
- [x] oversized upload fixture verde 11/11;
- [x] Kanban verde 8/8 em gate real;
- [x] única corrida realtime do SHA `4a6f64fc...` corrigida no HEAD;
- [ ] obter execução Vercel útil de `1cdb04c7...` ou descendente contendo essa correção;
- [ ] atingir `test:coverage` PASS sem reduzir thresholds.

### P0.2 — gate completo no mesmo SHA

Depois de coverage PASS, exigir no mesmo SHA:

1. `typecheck`;
2. lint;
3. todas as auditorias de autoridade;
4. `test:coverage`;
5. build;
6. `npm audit --omit=dev --audit-level=high`;
7. checks de formato aplicáveis;
8. `release:verify` completo.

### P0.3 — smokes autenticados

- [ ] `get-my-subscriptions` v6;
- [ ] upload de comprovante v1;
- [ ] compra avulsa usando pricing público restaurado;
- [ ] criação/edição administrativa de price category via admin-rpc.

### P0.4 — segurança/operacional

- [ ] habilitar Leaked Password Protection no Supabase Auth;
- [ ] confirmar scanner de malware configurado no ambiente;
- [ ] provar rollback do release candidate;
- [ ] definir required checks/proteção de `main` quando o CI voltar a ser confiável.

### P0.5 — remover UX de schema inexistente

- [ ] remover `price_categories.description` da UI/form de categorias em `CreditCharactersContent.tsx`;
- [ ] preservar `collection_characters.description` no formulário de personagem;
- [ ] alinhar o DTO `PriceCategoryInput` para não anunciar campo sem armazenamento canônico.

## Checkpoint desta continuação

**HEAD de código antes deste commit documental:** `1cdb04c7614a03900d3b15b0f6f972e1a6cc8898`.

**Melhor gate concluído:** SHA `4a6f64fcf39ba04b935d2da31a57b9c777f8df0a` — TypeScript/lint/audits PASS, Kanban 8/8 PASS e apenas 1 teste realtime falho no coverage; resumo `223 passed files / 2621 passed tests / 1 failed test`.

**Correção do único teste:** já presente no HEAD `1cdb04c7...`, aguardando apenas prova de executor no mesmo SHA ou descendente.

**next_action:** primeiro obter uma execução útil contendo `1cdb04c7...`. Se coverage passar, deixar o mesmo SHA atravessar build e `npm audit`. Em paralelo apenas em commits pequenos e reversíveis, remover a falsa UX de `price_categories.description`. Depois executar smokes autenticados e fechar segurança operacional. Continuar em NO-GO até tudo isso estar provado.

**do_not_repeat:** não tratar stderr esperado como teste falho; não corrigir warnings cosméticos antes do gate; não restaurar schema aposentado; não reintroduzir clientes Supabase re-tipados; não reduzir coverage/audits; não confundir rate limit da Vercel com falha de código; não declarar GO sem gate completo same-SHA e smokes críticos.

## Checkpoint documental — 2026-09-30 — plataforma de apps próprios

**HEAD confirmado antes da mudança:** `ab359e0d5c4dba21be7edd41f094f49a068b7624`.

**Concluído:**

- criado `ORDAX_APP_PLATFORM.md` na raiz da `main`;
- commit da arquitetura: `47337e1f8d4a1e282cff5f6e6f623dc64d493899`;
- definida direção first-party: apps OrdaX próprios, sem usar produtos de terceiros como base do produto;
- definido contrato futuro de App Runtime, App SDK, Registry, permissões, Store, versionamento, atualização, rollback e compatibilidade;
- definido que a Loja começa ativando apps oficiais empacotados com a release, sem executar JavaScript remoto arbitrário;
- proposta ordem incremental: plataforma mínima -> Store/Notes/Tasks -> atualização -> demais apps -> somente depois pacotes baixáveis.

**Testes/provas:** mudança exclusivamente documental; nenhum runtime, schema, migration, dependência ou configuração foi alterado neste checkpoint. Não foi executado novo `release:verify` como prova de release e o estado de lançamento permanece **NO-GO**.

**Bloqueios:** a arquitetura descrita ainda não está implementada. Download real de apps exige, antes, assinatura, checksum, sandbox, revogação, rollback e modelo de permissões comprovados.

**next_action:** manter os P0 de lançamento acima como prioridade operacional. Quando o usuário autorizar a implementação da plataforma de apps, iniciar em commits pequenos por tipos/schema do manifesto, App Registry estático, App SDK mínimo, Capability/Event/Permission registries e Store 0.1, sem migration remota no primeiro passo.

**do_not_repeat:** não transformar referências externas em forks renomeados; não criar segunda autenticação/SSOT; não permitir código remoto da Loja antes da fronteira de segurança; não construir todos os apps simultaneamente; não declarar a plataforma implementada apenas porque o documento existe.
