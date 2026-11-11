# AGENTS — TONART Studio

## Ordem de verdade e limites

1. Instruções expressas do proprietário e escopo da PR atual.
2. Evidência atual observada no GitHub, código, CI, Cloudflare e Vercel.
3. [URGENTE.md](URGENTE.md), [README.md](README.md) e [docs/README.md](docs/README.md).
4. Documentos técnicos específicos.
5. docs-archive e relatórios datados: **somente histórico**, nunca autorização de deploy.

**Repositório canônico único para site + backend após cutover:** tonecosstudio/tonecosstudio (GitHub ID 1163825583). Usar a branch integration/tonecosstudio-canonical-20261101, **PR #4 draft**; main preservada. Não criar outro repo/PR/branch, não fazer merge ou deploy de produção sem gates e autorização. washingtonmsdj/tonecosstudio é alias histórico para o mesmo ID.

**Hosting oficial vigente (08/11/2026):** frontend no projeto Vercel `tonart-studio-public` (equipe Washington) com domínio `https://tonartstudio.com.br` e redirecionamento `www`, publicação manual controlada da PR #4. Cloudflare Pages permanece somente como prévia protegida, não como segundo frontend oficial. A autoridade única do catálogo continua no Cloudflare Worker `tonecos-catalogo-api` (D1/R2) da conta Tonecos; a Vercel apenas disponibiliza um proxy GET restrito, sem segunda base ou inventário. Backend no checkout de `services/catalogo/` ainda em consolidação, sem trocar o Worker em produção. Não tocar nos domínios OrdaX.

## Regra permanente — MVP visual de renders (decisão do proprietário, 08/11/2026)

- O catálogo apresenta **renders digitais de esculturas/modelos 3D**, não fotografias de peças físicas finalizadas. Não anunciar peça fabricada ou entregue sem evidência.
- **Regra atual do proprietário (09/11): mostrar capas e galerias comuns; ocultar apenas imagens/modelos identificados como SpecialSTL.** `approved: []` não justifica ocultar o acervo inteiro. Renders são representações digitais de esculturas, não fotos de peças produzidas. A revisão de licenças/créditos de terceiros e o lançamento/indexação permanecem gates editoriais; não servem como autorização para esconder todas as imagens comuns.
- **SpecialSTL:** o proprietário determinou ocultar os renders identificados como SpecialSTL devido a preocupações de procedência e possível redistribuição não autorizada; isso não é constatação jurídica de pirataria. Preservar todos os modelos e suas evidências em `src/services/catalog/specialstl-quarantine.json`. Nenhum dos 264 registros da quarentena está aprovado; `approvedImageStorageKey=null` e status técnico legado `pending_authorized_clean_photo` permanecem até substituição comprovada.
- A substituição pode ser **render original TONART ou render de terceiro com licença/permissão verificável**, da **mesma escultura e variante**, preservando crédito legítimo. Não é obrigatória uma foto de peça física. Não apagar/cortar marca d'água, não reutilizar render marcado SpecialSTL, não trocar a identidade por outra escultura e não presumir licença apenas pela ausência de marcas.
- **Sem desbloqueio SpecialSTL:** a liberação de uma chave vinculada a um dos 264 IDs confirmados exige prova de origem/licença e chave exata, validada também na rota `/media`. Demais modelos não exigem allowlist individual para carregar imagem. O sinalizador antigo `VITE_TONART_HIDE_CATALOG_MEDIA` não pode mais ocultar o acervo inteiro; a quarentena é por identidade/caminho, na interface e no servidor. Não duplicar manifesto, Worker, D1/R2 nem inventar imagens.
- **Trilha de substituição SpecialSTL:** o registro `src/services/catalog/public-render-approvals.json`, o validador `scripts/security/catalog-public-media-approval-policy.mjs` e o cliente `src/services/catalog/approved-public-renders.ts` controlam exceções à quarentena. Para substituir uma mídia SpecialSTL, exigir ID + slug + chave exata, SHA-256 do arquivo-fonte, evidência independente de direitos, titular/crédito, data e aprovação expressa do proprietário. Com `approved: []`, existem **zero exceções à quarentena**, não zero imagens comuns. Preservar créditos legítimos e não inferir licença pela existência de um arquivo.
- A Vercel permanece em **pré-lançamento/noindex** até revisão de direitos, QA visual e autorização de produção. Esse estado editorial não pode apagar as imagens comuns do catálogo. A aprovação de substituições SpecialSTL e a autorização de lançamento são decisões distintas.

## MVP somente leitura

- UI atual da Tonecos, com visual Arcade/HUD escuro/dourado da aplicação original; reutilizar componentes. Não redesenhar identidade, importar UI/serviços OrdaX ou criar segundo design system.
- Home, Universo, modelos por categoria/franquia/filtros/cursor, ficha/galeria por slug, Sobre, Contato por mailto e páginas legais. Preservar estados loading/empty/error e navegação desktop/mobile.
- Bundle público sem Supabase, conta, admin, pedidos, pagamentos, assinatura ou Coins. Módulos comerciais podem existir no repositório, mas ficam isolados até homologação futura. Nunca usar segredos Supabase de outro projeto.
- Não criar segunda API, banco, catálogo ou fallback para ordax.com.br. Na Vercel, `api/catalogo-proxy.js` é somente transporte GET restrito para o Worker existente; no Cloudflare Pages, o transporte de prévia usa a Pages Function. D1/R2 continuam com um único owner.
- SEO falha fechada: previews e produção não liberada mantêm robots Disallow, noindex e nenhum sitemap; não ativar TONECOS_PUBLIC_INDEXING_RELEASE antes de GO explícito.

## Regras de custo e execução

Não rodar scans D1, imports, migrações, consultas integrais R2, testes de carga ou polling de catálogo para checar status. Validar sem custos por metadados Cloudflare/GitHub e testes locais. Não contratar Vercel Pro nem contratar outras soluções pagas sem autorização. Não burlar Cloudflare Access nem confundir HTTP 200 da tela de login com QA do site.

Cloudflare Pages tem production_deployments_enabled=false e preview_deployment_setting=none; preservar. No projeto Vercel `tonart-studio-public`, Git auto deploy permanece desativado; publicar somente o SHA validado, sem criar outro projeto. Commit documental não justifica rebuild. Main e PR #4 devem ser reconciliadas apenas com gates e autorização pertinentes.

## Gates obrigatórios

- CI e release:verify completos no SHA candidato, sem ocultar falhas.
- QA visual **autenticado** no desktop e celular, incluindo seis capas da amostra, busca, filtros, ficha e galeria.
- Revisão humana de Termos/Privacidade, operador real, LGPD e direitos de mídia.
- Domínio e HTTPS Vercel verificados não substituem QA visual desktop/mobile, validação de rotas/links, canonical/robots/sitemap e plano de rollback.
- Site pré-lançamento na Vercel já acessível, mas **lançamento/indexação/comercial: NO-GO** até revisão de direitos, QA e autorização. A exibição de imagens comuns na prévia é desejada e não equivale ao GO editorial. PR #4 continua Draft; não afirmar que prévia pública equivale a lançamento concluído.

Ao encerrar uma alteração, atualizar o checkpoint de URGENTE.md com base/HEAD, provas, bloqueios, next_action e do_not_repeat. Evitar novos documentos redundantes. Textos históricos devem ser movidos para docs-archive sem reescrever seu conteúdo.

## Migração monorepo — ordem obrigatória

O [plano único de migração](docs/MIGRACAO_CATALOGO_MONOREPO.md) e o manifesto **config/catalog-code-consolidation.json** são autoridade de fases M0–M6; o guard **npm run catalog:monorepo:check** deve passar antes de registrar avanço. Não considerar a proposta antiga de transferir o repo para tonecosstudio/catalogo como plano vigente. Primeiro reconciliar PR #266 e dependências da origem, depois importar o código Worker **inativo**, testar offline, isolar CI, autorizar um único writer e por último aposentar URLs/arquivar o repositório Washington. Não duplicar frontend, D1, R2, Worker, workflows ou permissões.
