# Operações de publicação — Cloudflare Pages Tonecos

**Runbook de inspeção; não autoriza release.** Data da auditoria: 04/11/2026. Estado atual: **NO-GO**, produção Pages desativada e SEO bloqueado.

## Recursos oficiais

- GitHub: **tonecosstudio/tonecosstudio**, ID 1163825583, branch de integração única, PR #4 draft.
- Cloudflare account: identidade Tonecos **tonecosstudio@gmail.com**, account ID **8827c547d6def5ee5b9ca550fdd5680a**.
- Pages project: **tonecosstudio**; produção esperada branch **main**, domínio reservado **tonecosstudio.pages.dev**; não supor site publicamente liberado.
- Deploy automático: **production_deployments_enabled=false**, **preview_deployment_setting=none**.
- Build: Node 24, npm ci e **npm run release:verify**; saída dist. A configuração remota do Pages é autoridade sobre gatilhos, não um plano Vercel.
- API: **CATALOG_WORKER** aponta ao Worker existente **tonecos-catalogo-api** em preview e produção. Não há binding direto D1/R2 na Pages Function.
- Previews privados sob **Cloudflare Access**.
- Outro Worker chamado **tonecosstudio** foi identificado na conta (Workers Builds redundante desconectado antes); não confundi-lo com o Pages ou Worker API, não recriá-lo, não removê-lo sem análise.
- SEO: scripts/seo/generate-public-index.mjs. Sem flag de release, gerar Disallow:/, HTML noindex,nofollow e ausência de sitemap. TONECOS_PUBLIC_INDEXING_RELEASE não está configurada na produção; hostname permitido na regra atual é https://tonecosstudio.pages.dev, exigindo Pages main/readonly e flag explícita.

## O que fazer com a Vercel antiga

Projeto **tonecosstudio** da equipe Washington **jogo-brasils-projects**, plano **Hobby**, ID **prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu**. Ainda tem Git link histórico para **washingtonmsdj/tonecosstudio**, que no GitHub redireciona ao mesmo repo ID 1163825583.

O projeto antigo conserva **ordax.com.br** e **www.ordax.com.br** como associações **não verificadas**, além de **ordax-three.vercel.app** verificado. Não alterar DNS nem o projeto OrdaX. É um problema de higiene do projeto legado, não motivo para hospedar Tonecos novamente na Vercel.

Mitigação existente: Vercel aceitou requisição previewDeploymentsDisabled=true, mas o conector de leitura não mostrou essa propriedade, portanto não há teste de eficácia. O commit **2bc99d8** adicionou a diretiva **git.deploymentEnabled=false** ao vercel.json canônico, suportada pela documentação oficial da Vercel; **não** significa desconexão concluída. Tentativa de políticas avançadas retornou 403 pro_plan_required no Hobby: **não pagar Pro**.

A desconexão final, quando aprovada, é no **projeto Tonecos legado**: Vercel → equipe jogo-brasils-projects → tonecosstudio → Settings → Git → Disconnect. Referência oficial: https://vercel.com/docs/project-configuration/git-settings . Não há registro de que o Disconnect tenha sido feito. Os domínios históricos devem ser removidos só no projeto legado após verificar que o OrdaX permanece intocado.

## Configuração residual do repositório

A única configuração Vercel mantida no projeto é o `vercel.json` mínimo com `git.deploymentEnabled=false`. Foram removidas as rotas de proxy, regras de cache, cabeçalhos e comandos de compilação da Vercel, bem como o antigo script de decisão de builds. **O site não depende desses recursos.** O frontend e o transporte do catálogo são propriedade do Cloudflare Pages; a configuração Vercel mínima existe apenas como trava preventiva enquanto o projeto antigo ainda apresenta Git conectado. Para desconectar definitivamente, usar o painel Vercel na equipe Washington, mantendo a OrdaX intacta.

## Gates antes de ativar o público

1. Revisar diff/CI da PR #4 e verificação completa de **npm run release:verify** no SHA candidato. O workflow GitHub quality.yml roda em main ou manualmente, não automaticamente em PR draft.
2. QA **autenticado**, desktop/mobile, de Home, seis capas, busca/filtros, ficha e galeria do 10H, link profundo, acessibilidade e falhas. Build SUCCESS do preview **ad578030** no SHA 39e7a04a **não** equivale a QA.
3. Revisão jurídica humana de Termos e Privacidade, dados reais da empresa, LGPD, cookie/logs, proveniência e direitos de imagem/personagens. Não presumir LTDA.
4. Prova de controle do legado Vercel e associações OrdaX; domínio Tonecos, HTTPS, canonical e recursos estáticos verificados.
5. Rollback pronto: identificar último deployment Pages aprovado e garantir caminho para restaurá-lo sem rebuild desnecessário.
6. Somente depois, autorização explícita para merge/produção Pages. SEO Allow + sitemap de sete caminhos públicos somente quando flag de release for deliberadamente habilitada para Pages main; não indexar preview nem páginas privadas.
7. Monitoramento pós-publicação com logs/metadados e probes mínimos. Não sondar D1 em loop ou executar importação para checar frontend.

**Provas já existentes (não repetir por docs):** Cloudflare ad578030 (SHA 39e7a04a) e 13187506 (SHA 16fa5760) tiveram build/deploy SUCCESS. HEAD 2bc99d8 é mudança preventiva Vercel não homologada pelo Pages (queued/idle automático). Nada foi publicado publicamente.

Consultar [arquitetura](TONECOS-STUDIO-CONSOLIDACAO.md), [proxy](TONECOS_CATALOG_FIRST_PARTY_PROXY.md), [preview](TONECOS_SAFE_PREVIEW.md) e [checkpoint](../URGENTE.md).
