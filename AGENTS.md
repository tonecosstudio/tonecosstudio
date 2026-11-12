# AGENTS — TONART Studio

## Ordem de verdade e limites

1. Instruções expressas do proprietário e escopo da PR atual.
2. Evidência atual observada no GitHub, código, CI, Cloudflare e Vercel.
3. [URGENTE.md](URGENTE.md), [README.md](README.md) e [docs/README.md](docs/README.md).
4. Documentos técnicos específicos.
5. docs-archive e relatórios datados: **somente histórico**, nunca autorização de deploy.

**Repositório canônico do site e candidato futuro do backend:** `tonecosstudio/tonecosstudio` (GitHub ID 1163825583), com **`main` como SSOT após integração da PR #4 em 11/11/2026**. O publicador **ATIVO** do Worker/D1/R2 permanece `washingtonmsdj/catalogo` até cutover M5 autorizado; `services/catalogo/` não é segunda versão produtiva. Não ressuscitar a branch de integração nem criar repositórios, PRs, fluxos ou instalações paralelos. Novas alterações seguem os gates pertinentes e deploy de produção requer autorização específica. `washingtonmsdj/tonecosstudio` é alias histórico do mesmo ID.

**Hosting oficial vigente (08/11/2026):** frontend no projeto Vercel `tonart-studio-public` (equipe Washington) com domínio `https://tonartstudio.com.br` e redirecionamento `www`, publicação manual controlada da PR #4. Cloudflare Pages permanece somente como prévia protegida, não como segundo frontend oficial. A autoridade única do catálogo continua no Cloudflare Worker `tonecos-catalogo-api` (D1/R2) da conta Tonecos; a Vercel apenas disponibiliza um proxy GET restrito, sem segunda base ou inventário. Backend no checkout de `services/catalogo/` ainda em consolidação, sem trocar o Worker em produção. Não tocar nos domínios OrdaX.

## Regra permanente — MVP visual de renders (decisão do proprietário, 08/11/2026)

- O catálogo apresenta **renders digitais de esculturas/modelos 3D**, não fotografias de peças físicas finalizadas. Não anunciar peça fabricada ou entregue sem evidência.
- **Regra atual do proprietário (09/11): mostrar capas e galerias comuns; ocultar apenas imagens/modelos identificados como SpecialSTL.** `approved: []` não justifica ocultar o acervo inteiro. Renders são representações digitais de esculturas, não fotos de peças produzidas. A revisão de licenças/créditos de terceiros e o lançamento/indexação permanecem gates editoriais; não servem como autorização para esconder todas as imagens comuns.
- **SpecialSTL:** o proprietário determinou ocultar os renders identificados como SpecialSTL devido a preocupações de procedência e possível redistribuição não autorizada; isso não é constatação jurídica de pirataria. Preservar todos os modelos e suas evidências em `src/services/catalog/specialstl-quarantine.json`. Nenhum dos 264 registros da quarentena está aprovado; `approvedImageStorageKey=null` e status técnico legado `pending_authorized_clean_photo` permanecem até substituição comprovada.
- A substituição pode ser **render original TONART ou render de terceiro com licença/permissão verificável**, da **mesma escultura e variante**, preservando crédito legítimo. Não é obrigatória uma foto de peça física. Não apagar/cortar marca d'água, não reutilizar render marcado SpecialSTL, não trocar a identidade por outra escultura e não presumir licença apenas pela ausência de marcas.
- **Sem desbloqueio SpecialSTL:** a liberação de uma chave vinculada a um dos 264 IDs confirmados exige prova de origem/licença e chave exata, validada também na rota `/media`. Demais modelos não exigem allowlist individual para carregar imagem. O sinalizador antigo `VITE_TONART_HIDE_CATALOG_MEDIA` não pode mais ocultar o acervo inteiro; a quarentena é por identidade/caminho, na interface e no servidor. Não duplicar manifesto, Worker, D1/R2 nem inventar imagens.
- **Trilha de substituição SpecialSTL:** o registro `src/services/catalog/public-render-approvals.json`, o validador `scripts/security/catalog-public-media-approval-policy.mjs` e o cliente `src/services/catalog/approved-public-renders.ts` controlam exceções à quarentena. Para substituir uma mídia SpecialSTL, exigir ID + slug + chave exata, SHA-256 do arquivo-fonte, evidência independente de direitos, titular/crédito, data e aprovação expressa do proprietário. Com `approved: []`, existem **zero exceções à quarentena**, não zero imagens comuns. Preservar créditos legítimos e não inferir licença pela existência de um arquivo.
- A vitrine visual está publicada na Vercel, mas **indexação permanece retida/noindex** até GO editorial específico; esse estado não pode ocultar imagens comuns. A liberação de substituições SpecialSTL, a recepção de orçamentos autenticados e a autorização de checkout/pagamentos são decisões independentes.

## Checkpoint operacional confirmado — 12/11/2026

- **Vercel de produção (inspeção autenticada):** `VITE_TONECOS_COMMERCIAL_MVP=true`, `VITE_CATALOG_QUOTES_ENABLED=true`, `VITE_PUBLIC_CATALOG_MVP=false`, `VITE_PREVIEW_READ_ONLY=false`. Conta e orçamento autenticado estão habilitados; não significa que o cliente, o admin ou e-mails tenham passado E2E.
- **Supabase TONART:** projeto `icmtmaakjucmuzxnofkd` ativo; tabelas `profiles` e `quotes` presentes com RLS, RPC `submit_catalog_quote_request` presente. Não consultar dados de clientes para comprovar configuração.
- **Minha Conta MVP:** cadastro, login, recuperação de senha, edição de nome e telefone e sair. A navegação preserva recursos legados desativados (pagamentos, notificações, suporte, assinaturas); **não declarar conta 100% completa**. Fluxos de orçamento do cliente e atendimento do admin precisam de prova E2E com sessões reais e controle de acesso.
- **Worker original:** PRs #266, #267, #268 e #269 integradas na origem. A PR #269 corrigiu o smoke canônico para URL sem cache-buster; release com smoke, cache HIT e rollback gate aprovados, versão `0b6d0d02…` a 100% em 12/11. O histórico da PR #266 como pendente em planos antigos não é status atual.
- **GO continua separado:** vitrine visual pré-lançada, comercial opt-in habilitado, mas **indexação/lançamento aberto, licenças de imagens, termos/LGPD e QA visual + E2E ainda requerem evidências e autorização explícita**.
- **Execução:** ler apenas os documentos pertinentes, implementar a lacuna efetiva no owner correto primeiro e validar proporcionalmente; não criar relatórios, workflows ou PRs extras para tarefas simples. Não executar leitura integral D1/R2, criar segundo banco, usar dados fictícios como prova de pedidos ou rebuild para mero ajuste documental.

## Catálogo público e orçamento autenticado por feature gate

- UI atual da Tonecos, com visual Arcade/HUD escuro/dourado da aplicação original; reutilizar componentes. Não redesenhar identidade, importar UI/serviços OrdaX ou criar segundo design system.
- Home, Universo, modelos por categoria/franquia/filtros/cursor, ficha/galeria por slug, Sobre, Contato por mailto e páginas legais. Preservar estados loading/empty/error e navegação desktop/mobile.
- **Dois modos sem duplicação:** o catálogo somente leitura não exige login nem Supabase. Quando as flags comerciais do ambiente estiverem habilitadas, Conta, login e solicitação/acompanhamento de orçamento usam os portais e serviços canônicos existentes (`TONECOS_COMMERCIAL_ROUTES`, `src/services/customer/catalog-quote-service.ts` e serviço administrativo correspondente), a tabela única `quotes` do Supabase TONART, autenticação, RPC e RLS. Não recriar formulário, tabela, portal, login ou API paralelos. Solicitação de orçamento não equivale a compra/cobrança; checkout, Coins e pagamentos exigem autorização própria. Nunca compartilhar segredos Supabase entre projetos.
- Não criar segunda API, banco, catálogo ou fallback para ordax.com.br. Na Vercel, `api/catalogo-proxy.js` é somente transporte GET restrito para o Worker existente; no Cloudflare Pages, o transporte de prévia usa a Pages Function. D1/R2 continuam com um único owner.
- SEO falha fechada: previews e produção não liberada mantêm robots Disallow, noindex e nenhum sitemap; não ativar TONECOS_PUBLIC_INDEXING_RELEASE antes de GO explícito.

## Regras de custo e execução

Não rodar scans D1, imports, migrações, consultas integrais R2, testes de carga ou polling de catálogo para checar status. Validar sem custos por metadados Cloudflare/GitHub e testes locais. Não contratar Vercel Pro nem contratar outras soluções pagas sem autorização. Não burlar Cloudflare Access nem confundir HTTP 200 da tela de login com QA do site.

Cloudflare Pages tem `production_deployments_enabled=false` e `preview_deployment_setting=none`; preservar. No projeto Vercel `tonart-studio-public`, Git auto deploy permanece desativado; publicar somente o SHA validado, sem criar outro projeto. Commit documental não justifica rebuild. A PR #4 foi integrada: novas entregas partem da `main` canônica, com gates e autorização proporcionais ao risco.

## Gates obrigatórios

- CI e release:verify completos no SHA candidato, sem ocultar falhas.
- QA visual **autenticado** no desktop e celular, incluindo seis capas da amostra, busca, filtros, ficha e galeria.
- Revisão humana de Termos/Privacidade, operador real, LGPD e direitos de mídia.
- Domínio e HTTPS Vercel verificados não substituem QA visual desktop/mobile, validação de rotas/links, canonical/robots/sitemap e plano de rollback.
- A vitrine visual já está publicada no domínio oficial; **indexação SEO, pagamentos, assinaturas e liberação SpecialSTL continuam NO-GO** sem autorização específica e gates aplicáveis. Orçamentos autenticados podem operar apenas quando as flags do ambiente e as políticas de acesso do Supabase os habilitarem, sem pressupor checkout. PR #4 já integrada à main; publicação manual do SHA e QA de produção continuam processos distintos.

Ao encerrar uma alteração, atualizar o checkpoint de URGENTE.md com base/HEAD, provas, bloqueios, next_action e do_not_repeat. Evitar novos documentos redundantes. Textos históricos devem ser movidos para docs-archive sem reescrever seu conteúdo.

## Migração monorepo — ordem obrigatória

O [plano único de migração](docs/MIGRACAO_CATALOGO_MONOREPO.md) e o manifesto **config/catalog-code-consolidation.json** são autoridade de fases M0–M6; o guard **npm run catalog:monorepo:check** deve passar antes de registrar avanço. Não considerar a proposta antiga de transferir o repo para tonecosstudio/catalogo como plano vigente. PR #266 e demais correções posteriores (#267–#269) já foram integradas à origem: qualquer futura extração para `services/catalogo/` precisa revalidar e importar o **estado corrente** antes do cutover, testar offline, isolar CI, autorizar um único writer e só depois aposentar URLs/arquivar o repositório Washington. Não duplicar frontend, D1, R2, Worker, workflows ou permissões.
