# AGENTS — Tonecos Studio

## Ordem de verdade e limites

1. Instruções expressas do proprietário e escopo da PR atual.
2. Evidência atual observada no GitHub, código, CI, Cloudflare e Vercel.
3. [URGENTE.md](URGENTE.md), [README.md](README.md) e [docs/README.md](docs/README.md).
4. Documentos técnicos específicos.
5. docs-archive e relatórios datados: **somente histórico**, nunca autorização de deploy.

**Repositório canônico único para site + backend após cutover:** tonecosstudio/tonecosstudio (GitHub ID 1163825583). Usar a branch integration/tonecosstudio-canonical-20261101, **PR #4 draft**; main preservada. Não criar outro repo/PR/branch, não fazer merge ou deploy de produção sem gates e autorização. washingtonmsdj/tonecosstudio é alias histórico para o mesmo ID.

**Hosting oficial:** Cloudflare da conta tonecosstudio@gmail.com, projeto Pages tonecosstudio; Service Binding CATALOG_WORKER para o Worker existente tonecos-catalogo-api. O backend do catálogo permanece **temporariamente** no GitHub washingtonmsdj/catalogo enquanto a migração para **services/catalogo/** deste mesmo repositório é preparada com gates; não transferir para um segundo repo nem autorizar outro publicador até cutover. D1/R2 permanecem autoridade única desse Worker. Vercel na equipe Washington é **legado**, não destino de produção. Não tocar no DNS ou nos domínios OrdaX.

## MVP somente leitura

- UI atual da Tonecos, com visual Arcade/HUD escuro/dourado da aplicação original; reutilizar componentes. Não redesenhar identidade, importar UI/serviços OrdaX ou criar segundo design system.
- Home, Universo, modelos por categoria/franquia/filtros/cursor, ficha/galeria por slug, Sobre, Contato por mailto e páginas legais. Preservar estados loading/empty/error e navegação desktop/mobile.
- Bundle público sem Supabase, conta, admin, pedidos, pagamentos, assinatura ou Coins. Módulos comerciais podem existir no repositório, mas ficam isolados até homologação futura. Nunca usar segredos Supabase de outro projeto.
- Não criar segunda API, banco, catálogo ou fallback para ordax.com.br. Pages Function é transporte GET e usa somente CATALOG_WORKER.
- SEO falha fechada: previews e produção não liberada mantêm robots Disallow, noindex e nenhum sitemap; não ativar TONECOS_PUBLIC_INDEXING_RELEASE antes de GO explícito.

## Regras de custo e execução

Não rodar scans D1, imports, migrações, consultas integrais R2, testes de carga ou polling de catálogo para checar status. Validar sem custos por metadados Cloudflare/GitHub e testes locais. Não contratar Vercel Pro nem contratar outras soluções pagas sem autorização. Não burlar Cloudflare Access nem confundir HTTP 200 da tela de login com QA do site.

Cloudflare Pages tem production_deployments_enabled=false e preview_deployment_setting=none; preservar. Commit documental não justifica rebuild, nem uma fila idle equivale a deploy aprovado. Não atualizar a main antes de isolar o Git da Vercel antiga; ver runbook no índice.

## Gates obrigatórios

- CI e release:verify completos no SHA candidato, sem ocultar falhas.
- QA visual **autenticado** no desktop e celular, incluindo seis capas da amostra, busca, filtros, ficha e galeria.
- Revisão humana de Termos/Privacidade, operador real, LGPD e direitos de mídia.
- Domínio, HTTPS/canonical/robots/sitemap, legado Vercel isolado e rollback provado.
- Autorização explícita para merge e para a publicação pública. **Estado atual NO-GO.**

Ao encerrar uma alteração, atualizar o checkpoint de URGENTE.md com base/HEAD, provas, bloqueios, next_action e do_not_repeat. Evitar novos documentos redundantes. Textos históricos devem ser movidos para docs-archive sem reescrever seu conteúdo.

## Migração monorepo — ordem obrigatória

O [plano único de migração](docs/MIGRACAO_CATALOGO_MONOREPO.md) e o manifesto **config/catalog-code-consolidation.json** são autoridade de fases M0–M6; o guard **npm run catalog:monorepo:check** deve passar antes de registrar avanço. Não considerar a proposta antiga de transferir o repo para tonecosstudio/catalogo como plano vigente. Primeiro reconciliar PR #266 e dependências da origem, depois importar o código Worker **inativo**, testar offline, isolar CI, autorizar um único writer e por último aposentar URLs/arquivar o repositório Washington. Não duplicar frontend, D1, R2, Worker, workflows ou permissões.
