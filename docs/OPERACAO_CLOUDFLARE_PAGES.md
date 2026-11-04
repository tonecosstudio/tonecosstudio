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


## Propriedade do repositório do catálogo — transferência sem duplicação

**Status auditado em 04/11/2026: AINDA NÃO TRANSFERIDO.** A migração é de **titularidade GitHub**, não de código entre repositórios, não de Cloudflare e não do banco. Origem: [washingtonmsdj/catalogo](https://github.com/washingtonmsdj/catalogo), repo público ID **1398242143**, proprietária Washington com permissão admin. Destino desejado: **tonecosstudio/catalogo**, conta pessoal Tonecos, ainda não criado. Essa conta vê a origem com permissão de leitura, não de administração.

O repo da origem ainda contém **outro frontend React**. Seus arquivos `config/public-runtime.json` e `README.md` declaram **https://acheguese.com.br/tonecosstudios/** como URL pública antiga; o workflow `.github/workflows/pages.yml` publica o preview **https://washingtonmsdj.github.io/catalogo/**. Ambos responderam **HEAD 200** na verificação do desktop Windows; os resultados não comprovam catálogo/renderização. O frontend aprovado para a arquitetura nova é o Studio em Cloudflare Pages, ainda **NO-GO** público.

**Não transferir precipitadamente**: GitHub não redireciona a URL do GitHub Pages quando transfere um repo, mesmo preservando redirecionamento do repositório Git. A publicação antiga pode quebrar; a montagem Achegue-se e as integrações precisam ser verificadas antes. O Cloudflare Worker existente segue na conta Tonecos independentemente do proprietário do repo Git, porém o deploy é orquestrado por `.github/workflows/cloudflare.yml`: push na main que altera `worker/**`, `migrations/**`, `wrangler.jsonc` e ferramentas de release pode tentar atualização de Worker **e migrations D1**. Não usar um commit de preparação em `main` como teste do plano.

**Preflight determinístico:**

1. Confirmar que o novo site público (única UI oficial futura) e o roteamento Achegue-se não dependem do hostname GitHub Pages antigo. Migrar links/canonical ao novo destino apenas durante cutover aprovado, sem desativar a origem pública antes da substituição.
2. Congelar somente ações de publicação que concorrem com a transferência. Não cancelar jobs já ativos sem inspecionar. Provar HEAD main, PRs, branch protection, segredos/variables/ambiente production (sem imprimir seus valores), regras de provenance, endpoints e rollback do Worker. Não rodar consultas D1 para essa verificação.
3. Transferir o **repositório existente** via conta Washington (admin): **GitHub → washingtonmsdj/catalogo → Settings → General → Danger Zone → Transfer → new owner tonecosstudio**. A conta Tonecos deve aceitar o convite por e-mail dentro da janela do GitHub. Não criar um segundo repositório `catalogo`.
4. Após a transferência, comprovar **mesmo repo ID 1398242143**, `main` idêntica, histórico/PRs/issues intactos, acesso admin na Tonecos e instalação GitHub App/Actions autorizada. Atualizar links do repo nos checkouts e integrações; revalidar o frontend antigo e o mount Achegue-se. Segredos podem acompanhar a transferência no GitHub, mas permissões e execução devem ser confirmadas, não presumidas.
5. Revalidar `wrangler.jsonc` contra a mesma conta Cloudflare Tonecos e o **mesmo** Worker `tonecos-catalogo-api`, binding D1 `DB` e R2 `MEDIA`. Conferir apenas metadados e gates offline; não importar modelos, fazer SQL, deploy ou publicar migrations só para provar a transferência.
6. Preservar o site Tonecos em Cloudflare Pages (`CATALOG_WORKER`), sem segunda API/Worker, e então aposentar a interface legada apenas após o novo site assumir de fato. Atualizar o SSOT do catálogo na autoridade do repositório de backend por seu engenheiro responsável.

**Fonte GitHub:** https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository . O conector GitHub disponível nesta sessão **não fornece operação de transfer**, logo nenhuma transferência foi executada. Falhas do preflight mantêm os recursos existentes, sem fallback/rebuild ou cópia.

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
