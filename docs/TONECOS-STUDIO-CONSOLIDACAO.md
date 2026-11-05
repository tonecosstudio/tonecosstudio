# Tonecos Studio — arquitetura e autoridades

**Situação auditada em 04/11/2026:** MVP informativo/readonly hospedado no **Cloudflare Pages da conta Tonecos**, ainda protegido e sem lançamento público. A Vercel histórica da conta Washington **não** é a hospedagem aprovada.

## Produto

**MVP comercial (implementação staged, NÃO ativada no preview):** a conta já tem Auth e perfil no Supabase comercial; a seleção pública de modelos continua transitória e sem gravação. O novo serviço `src/services/customer/catalog-quote-service.ts` converte a seleção em referências canônicas de slug/quantidade, valida a autenticação, consulta os próprios orçamentos e usa um único RPC para registrar solicitação em `public.quotes` — nunca grava catálogo no Supabase nem aceita preço/status informado pelo cliente. A migração `supabase/migrations/20261105062308_tonecos_mvp_customer_quotes_baseline.sql` adiciona a seleção JSON e a RPC `public.submit_catalog_quote_request` (wrapper invoker, corpo privado e escopo somente auth.uid()). **Não executar no Supabase da OrdaX.** O conector disponível nesta sessão lista somente o projeto OrdaX, e o Supabase Tonecos precisará ser vinculado e validado antes de aplicar a migração, ativar `VITE_CATALOG_QUOTES_ENABLED=true` e integrar telas de Minha Conta/Orçamentos. `VITE_PREVIEW_READ_ONLY=true` continua bloqueando qualquer submissão. O Worker/D1 mantém apenas o catálogo nesta integração; o endpoint legado `/api/quotes` não deve ser duplicado ou usado em paralelo pelo novo site. Um valor zero nas novas solicitações é apenas placeholder obrigatório da tabela antiga, nunca preço ofertado, e o estúdio deverá avaliar o slug na fonte do catálogo antes de responder. O serviço `src/services/admin/config/catalog-quote-admin-service.ts` apresenta a fila de solicitações com limite de 100 e responde com preço somente pelo RPC `public.answer_catalog_quote_request`: um administrador precisa autenticar-se, o valor deve ter até duas casas decimais e a solicitação ainda precisa estar pendente/em revisão. A resposta não gera cobrança, pedido, pagamento nem notificação automática. Nenhuma migração/consulta Supabase foi executada.

**Fase atual:** Home, Universo, modelos com busca/filtros/paginação, ficha por slug, galeria, Sobre, Contato por e-mail, Termos e Privacidade. Sem conta, autenticação, pedido, orçamento confirmado, checkout, pagamento, assinatura, Coins ou painel administrativo no bundle do MVP. A aplicação React/Vite existente é reutilizada; PublicCatalogApp seleciona o modo de catálogo. A fase comercial futura continua no código, mas necessita homologação de identidade, RLS, pagamentos e segurança própria antes de ativação.

**Interface:** preservar o design Arcade/HUD original escuro e dourado e os componentes compartilhados. A amostra atual de seis modelos/capas é somente a primeira página observada, não o acervo completo. Navegação por categorias, franquias, cursores, deep links e galeria precisam de teste visual no desktop e no celular.

## Matriz de proprietários

| Camada | SSOT e conta | Restrição |
| --- | --- | --- |
| UI e código do site | GitHub tonecosstudio/tonecosstudio, ID 1163825583 | Branch integration/tonecosstudio-canonical-20261101, PR #4 draft, main preservada |
| Hospedagem oficial | Cloudflare Pages tonecosstudio, identidade tonecosstudio@gmail.com | Produção automática OFF, auto preview none, Access no preview |
| API e mídia | Cloudflare Worker tonecos-catalogo-api na mesma conta Tonecos | Autoridade única de modelos, categorias, franquias, pastas, galeria e imagens |
| Banco e objetos | D1 e R2 sob o Worker canônico | Não duplicar no Supabase, navegador ou Pages Function |
| Fonte do Worker | GitHub washingtonmsdj/catalogo → services/catalogo/ na repo Tonecos | Publicador Washington temporário até cutover da API; não criar outro repo |
| Comercial futuro | Supabase/Stripe da Tonecos | Não incluídos no bundle público readonly |
| Hosting antigo | Vercel tonecosstudio, equipe Washington jogo-brasils-projects (Hobby) | Legado, sem autoridade de publicar o novo site |
| OrdaX | Contas, domínios e sites independentes | Nunca usar ordax.com.br no catálogo Tonecos |

O antigo caminho de GitHub washingtonmsdj/tonecosstudio redireciona ao mesmo repositório **ID 1163825583**, não a um segundo backend ou frontend.

## Fluxo canônico da requisição

Navegador → **Cloudflare Pages** → mesma origem **/catalogo-api/** → **functions/catalogo-api/[[path]].js** → **Service Binding CATALOG_WORKER** → **tonecos-catalogo-api** → D1/R2.

A Pages Function somente faz proxy de GET público sob allowlist; não tem binding D1/R2 nem grava dados. Se CATALOG_WORKER faltar, falha fechada, sem fallback para workers.dev, OrdaX, Supabase ou outro catálogo. O resolvedor de base é src/config/canonical-catalog-endpoint.ts. Contrato detalhado: [TONECOS_CATALOG_FIRST_PARTY_PROXY.md](TONECOS_CATALOG_FIRST_PARTY_PROXY.md).

## Ambiente real e provas

Cloudflare Pages, conta ID **8827c547d6def5ee5b9ca550fdd5680a**, projeto **tonecosstudio**, GitHub ID 1163825583, origem produção **main**, URL de projeto **https://tonecosstudio.pages.dev**. Configuração verificada: **production_deployments_enabled=false**, **preview_deployment_setting=none**; Service Binding CATALOG_WORKER em produção e preview. Variáveis readonly do preview ativas sem VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_PROJECT_ID.

- Preview **ad578030-e02f-47ef-ae23-b4aa6e4ad713** da revisão **39e7a04a**: build e deploy SUCCESS em 04/11/2026 04:50:36 UTC, bundle de 20 chunks sem runtime Supabase/comercial, auditoria sem vulnerabilidades reportadas, proteção de indexação.
- Preview **13187506-f2ab-4931-b586-4aa811ae9e6c** do código **16fa5760**: build/deploy SUCCESS e SEO pré-lançamento bloqueado. Esses logs não provam QA visual.
- Commit preventivo **2bc99d8** implementou vercel.json com **git.deploymentEnabled=false**; o registro de build Cloudflare deste SHA ficou **queued/idle**. Não alegar homologação desse commit sem build.

## Vercel histórica e conflito de domínios

O projeto **tonecosstudio** da Vercel permanece na equipe **jogo-brasils-projects** (Washington, plano Hobby), ID **prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu**. A conexão Git usa o caminho histórico washingtonmsdj/tonecosstudio. Em inspeção do projeto foram encontrados **ordax.com.br** e **www.ordax.com.br**, ambos associados mas **não verificados**, além de **ordax-three.vercel.app** verificado. Isso não demonstra que os domínios OrdaX estejam servindo Tonecos, mas a configuração deve ser limpa na autoridade Vercel sem alterar DNS, a produção OrdaX ou outros projetos.

Foi aceita uma solicitação de desligar previews no projeto antigo, sem confirmação fim a fim. A política premium de deployments retornou **403 pro_plan_required**; não contratar Pro. Desativar o Git link ou provar ausência de auto-deploy antes de liberar a main. Ver [OPERACAO_CLOUDFLARE_PAGES.md](OPERACAO_CLOUDFLARE_PAGES.md).


## Catálogo legado: dois frontends, apenas um backend

A auditoria em 04/11/2026 comprovou que `washingtonmsdj/catalogo` **não é somente backend**: contém uma interface React/Vite independente, `config/brand.json`, `config/public-runtime.json` e os workflows `.github/workflows/pages.yml` (GitHub Pages) e `.github/workflows/cloudflare.yml` (Worker + D1/R2). Seu README aponta `https://acheguese.com.br/tonecosstudios/` como URL canônica legada e `https://washingtonmsdj.github.io/catalogo/` como preview. Em um HEAD físico de 04/11/2026, **ambas as URLs responderam HTTP 200**, o que comprova entrega HTTP e **não** homologação da experiência completa nem da API.

**A integração do catálogo com o novo site já funciona por código e binding.** O site `tonecosstudio/tonecosstudio` não replica modelos: `functions/catalogo-api/[[path]].js` usa `CATALOG_WORKER` para falar com o Worker `tonecos-catalogo-api` na Cloudflare da conta Tonecos, que controla D1 `tonecos-catalogo` e R2 `tonecos-catalogo-media`. As duas interfaces HTML existentes não representam duas bases de dados. A apresentação oficial a ser mantida após o lançamento é o **site único Tonecos Studios em Pages**. Não copiar a UI antiga para o Studio nem mover o banco para o repositório do frontend.

**Decisão atual do proprietário: um só repositório para site e backend.** O destino NÃO é tonecosstudio/catalogo. O código Worker, suas migrations D1 e ferramentas essenciais serão consolidados em **services/catalogo/** sob **tonecosstudio/tonecosstudio**; o frontend Vite antigo do Washington não será importado. A conta Tonecos continuará dona dos mesmos Worker, D1 e R2. A fonte Washington permanece publicadora somente até ser desligada de forma segura; consulte **[MIGRACAO_CATALOGO_MONOREPO.md](MIGRACAO_CATALOGO_MONOREPO.md)**. Preservar o GitHub Pages/Achegue-se antigo enquanto o site Tonecos não tiver cutover verificado.

## Segurança, SEO e critérios de GO

- SEO gerado por scripts/seo/generate-public-index.mjs: sem TONECOS_PUBLIC_INDEXING_RELEASE=true, publicar **Disallow: /**, meta **noindex,nofollow** e nenhum sitemap. Release só após gates explícitos na main/Pages com origem HTTPS validada.
- Termos e Privacidade do MVP descrevem o catálogo readonly; ainda exigem **revisão jurídica humana**, identificação real do operador, LGPD e direitos de personagens/imagens. Nunca afirmar razão social do tipo LTDA sem comprovação.
- QA visual autenticado no Access, em desktop/mobile, das seis capas, listagem, busca, ficha/galeria, navegação direta e estados de erro, ainda pendente.
- CI/release:verify válido no SHA candidato, vínculo Vercel antigo isolado, domínio/canonical/HTTPS verificados, rollback real e autorização do proprietário. **NO-GO até concluir.**

Estado e próximas ações: [URGENTE.md](../URGENTE.md). Não consumir consultas D1/R2 para provar um fato de CI ou infraestrutura já observado.


### Base comercial Tonecos criada no Supabase próprio (2026-11-05)

Projeto `tonecosstudio-site` (`icmtmaakjucmuzxnofkd`). Migrações aplicadas no Supabase e preservadas exatamente em `supabase/migrations/20261105062308_tonecos_mvp_customer_quotes_baseline.sql` e `supabase/migrations/20261105062428_tonecos_admin_access_routine.sql`; substituem a migração staged que presumia a estrutura legada. `public.profiles` é provisionada pelo trigger `auth.users`; `public.quotes` guarda apenas slug/quantidade D1 da seleção. RLS: cliente lê só os próprios dados. A autoridade administrativa privada `private_api.admin_users` não é exposta a clientes; `public.is_tonecos_admin()` confirma autorização antes de consultas e operações de atendimento. Valor do orçamento é NULL até resposta, não zero. Nenhum administrador foi promovido automaticamente; nenhuma conta criada, nenhuma migração do catálogo ou deploy comercial ativado. Para liberar: provisionar o primeiro admin via procedimento confiável, configurar URL e chave publicável do Supabase Tonecos, homologar conta/solicitação/resposta e só depois ativar o recurso no site. Proibido usar credencial secreta no frontend.

### Telas do MVP comercial (ativação separada do catálogo)
A PR #4 possui `TonecosCommercialApp` como entrada exclusiva para modo `VITE_TONECOS_COMMERCIAL_MVP=true` + `VITE_CATALOG_QUOTES_ENABLED=true`, com `VITE_PREVIEW_READ_ONLY=false`, `VITE_PUBLIC_CATALOG_MVP=false`, URL Supabase `https://icmtmaakjucmuzxnofkd.supabase.co` e chave publicável. O `main.tsx` escolhe uma única entrada no build: preview público mantém `PublicCatalogApp` sem Auth/Supabase; modo comercial reutiliza `CatalogMvpShell` e acrescenta `/login`, `/perfil`, `/orcamento`, `/meus-orcamentos` e `/admin/orcamentos`. O catálogo/modelos fica intacto (owner do Codex local). Fluxo: selecionar modelos na sessão → abrir Orçamento pela navegação comercial → autenticar → informar quantidades/notas → RPC autenticada `submit_catalog_quote_request` → acompanhar via `quotes` RLS; administração exclusivamente via `is_tonecos_admin` e `answer_catalog_quote_request`. Sem pagamento, checkout, importação de catálogo, chave secreta em navegador ou publicação automática. **ATENÇÃO:** a produção e o preview atual não devem habilitar `VITE_TONECOS_COMMERCIAL_MVP` antes do GO explícito e homologação completa da identidade/admin.
