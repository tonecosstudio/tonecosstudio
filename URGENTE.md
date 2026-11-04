# Tonecos Studio — checkpoint operacional

**Auditado em 04/11/2026 (Bahia). Estado: NO-GO para publicação pública.** O enorme checkpoint cumulativo anterior foi preservado integralmente em [docs-archive/historico-2026-11-04/URGENTE.md](docs-archive/historico-2026-11-04/URGENTE.md). Use [docs/README.md](docs/README.md) como índice dos documentos atuais.

## Contas e fontes de verdade

- **Repositório do site:** tonecosstudio/tonecosstudio, GitHub ID 1163825583. O nome antigo washingtonmsdj/tonecosstudio redireciona ao mesmo ID. PR [#4](https://github.com/tonecosstudio/tonecosstudio/pull/4), branch integration/tonecosstudio-canonical-20261101, **draft**, sem merge na main. Commits 74b7b60, 5acf41c e 171c84a são de reorganização documental.
- **Hospedagem oficial:** Cloudflare Pages da conta **tonecosstudio@gmail.com**, account ID 8827c547d6def5ee5b9ca550fdd5680a, projeto **tonecosstudio**, hostname reservado **https://tonecosstudio.pages.dev**. Produção automática **OFF** (production_deployments_enabled=false), previews automáticos **OFF** (preview_deployment_setting=none), produção ligada à branch **main**.
- **API e mídia:** Cloudflare Worker **tonecos-catalogo-api** na conta Tonecos, via binding Pages **CATALOG_WORKER** em preview e produção. D1/R2 pertencem ao Worker; sem binding direto na Pages Function. **Código do backend segue no repo washingtonmsdj/catalogo** como dependência histórica, sem duplicação ou migração autorizada nesta PR.
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
