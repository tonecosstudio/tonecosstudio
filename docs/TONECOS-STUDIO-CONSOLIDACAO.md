# Tonecos Studio — arquitetura e autoridades

**Situação auditada em 04/11/2026:** MVP informativo/readonly hospedado no **Cloudflare Pages da conta Tonecos**, ainda protegido e sem lançamento público. A Vercel histórica da conta Washington **não** é a hospedagem aprovada.

## Produto

**Fase atual:** Home, Universo, modelos com busca/filtros/paginação, ficha por slug, galeria, Sobre, Contato por e-mail, Termos e Privacidade. Sem conta, autenticação, pedido, orçamento confirmado, checkout, pagamento, assinatura, Coins ou painel administrativo no bundle do MVP. A aplicação React/Vite existente é reutilizada; PublicCatalogApp seleciona o modo de catálogo. A fase comercial futura continua no código, mas necessita homologação de identidade, RLS, pagamentos e segurança própria antes de ativação.

**Interface:** preservar o design Arcade/HUD original escuro e dourado e os componentes compartilhados. A amostra atual de seis modelos/capas é somente a primeira página observada, não o acervo completo. Navegação por categorias, franquias, cursores, deep links e galeria precisam de teste visual no desktop e no celular.

## Matriz de proprietários

| Camada | SSOT e conta | Restrição |
| --- | --- | --- |
| UI e código do site | GitHub tonecosstudio/tonecosstudio, ID 1163825583 | Branch integration/tonecosstudio-canonical-20261101, PR #4 draft, main preservada |
| Hospedagem oficial | Cloudflare Pages tonecosstudio, identidade tonecosstudio@gmail.com | Produção automática OFF, auto preview none, Access no preview |
| API e mídia | Cloudflare Worker tonecos-catalogo-api na mesma conta Tonecos | Autoridade única de modelos, categorias, franquias, pastas, galeria e imagens |
| Banco e objetos | D1 e R2 sob o Worker canônico | Não duplicar no Supabase, navegador ou Pages Function |
| Fonte do Worker | GitHub washingtonmsdj/catalogo | Dependência histórica separada; migração de dono somente em projeto autorizado |
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

## Segurança, SEO e critérios de GO

- SEO gerado por scripts/seo/generate-public-index.mjs: sem TONECOS_PUBLIC_INDEXING_RELEASE=true, publicar **Disallow: /**, meta **noindex,nofollow** e nenhum sitemap. Release só após gates explícitos na main/Pages com origem HTTPS validada.
- Termos e Privacidade do MVP descrevem o catálogo readonly; ainda exigem **revisão jurídica humana**, identificação real do operador, LGPD e direitos de personagens/imagens. Nunca afirmar razão social do tipo LTDA sem comprovação.
- QA visual autenticado no Access, em desktop/mobile, das seis capas, listagem, busca, ficha/galeria, navegação direta e estados de erro, ainda pendente.
- CI/release:verify válido no SHA candidato, vínculo Vercel antigo isolado, domínio/canonical/HTTPS verificados, rollback real e autorização do proprietário. **NO-GO até concluir.**

Estado e próximas ações: [URGENTE.md](../URGENTE.md). Não consumir consultas D1/R2 para provar um fato de CI ou infraestrutura já observado.
