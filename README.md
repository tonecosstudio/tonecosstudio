# Tonecos Studio

O site oficial Tonecos Studio usa **GitHub Tonecos + Cloudflare Pages da conta Tonecos**. **Vercel não é a hospedagem escolhida**; existe apenas como projeto legado da conta Washington. Estado em 04/11/2026: **MVP do catálogo somente leitura em homologação; NO-GO para lançamento público**.

## Quem é dono de quê

| Recurso | Conta e origem | Estado |
| --- | --- | --- |
| Repositório do site | GitHub tonecosstudio/tonecosstudio (ID 1163825583) | Único código-fonte do site; PR #4 draft |
| Hospedagem do site | Cloudflare conta tonecosstudio@gmail.com, Pages tonecosstudio | Domínio reservado https://tonecosstudio.pages.dev; produção automática OFF |
| Prévia | Cloudflare Pages + Cloudflare Access | Builds privados aprovados; QA visual ainda pendente |
| API de modelos e imagens | Cloudflare Worker tonecos-catalogo-api, mesma conta Tonecos | Autoridade única dos modelos; D1/R2 somente via Worker |
| Código do backend da API | Origem temporária GitHub washingtonmsdj/catalogo → destino **services/catalogo/** neste repo | Migração para monorepo **autorizada como plano**, sem copiar/cutover/publicar até gates |
| Vercel tonecosstudio | Equipe Washington jogo-brasils-projects, Hobby | Projeto antigo, fora do fluxo oficial de lançamento |
| Supabase, Stripe, clientes, pedidos | Aplicação comercial futura | Excluídos do MVP público somente leitura |

O endereço GitHub antigo washingtonmsdj/tonecosstudio redireciona ao mesmo repositório institucional ID 1163825583. Isso **não** transfere a Vercel antiga para a conta Tonecos.

**Decisão canônica:** o frontend e o backend ficarão no **mesmo repositório tonecosstudio/tonecosstudio**. O serviço Worker, os dados D1 e imagens R2 continuam únicos na Cloudflare Tonecos. A implementação segue o [plano canônico de consolidação](docs/MIGRACAO_CATALOGO_MONOREPO.md), sem criar outro GitHub repo nem importar a antiga interface React.

**Migração em andamento:** a API pública foi copiada **inativa** para [`services/catalogo/`](services/catalogo/README.md), com 22 migrations D1 versionadas e testes offline. O publicador ativo e o banco **continuam na origem atual**; nenhuma versão nova do Worker foi publicada. Plano: [MIGRACAO_CATALOGO_MONOREPO.md](docs/MIGRACAO_CATALOGO_MONOREPO.md).

## Arquitetura e escopo

Navegador → Cloudflare Pages React/Vite → /catalogo-api/ na mesma origem → Pages Function com allowlist de GET → Service Binding CATALOG_WORKER → Worker tonecos-catalogo-api → D1/R2. O Pages não controla o banco nem mantém outro catálogo. O site público mostra Home, Universo, listagem/busca, fichas/galerias, Sobre, Contato por e-mail, Termos e Privacidade. Sem cadastro, login, orçamento confirmado, checkout, pagamento ou admin nesta fase.

A aplicação comercial antiga continua no repositório para uma fase posterior, mas não foi incluída nos chunks do MVP readonly homologado. Preservar a identidade visual escura/dourada Arcade existente, sem outro frontend ou design system.

## Desenvolvimento e validação

Requer Node.js 24 LTS e npm. Usar **npm ci** e **npm run release:verify** em ambiente configurado para validar TypeScript, lint, auditorias, testes/cobertura, build e dependências. Copiar .env.example para .env.local apenas em desenvolvimento; segredos não podem entrar em VITE_* nem no Git. O proxy first-party é configurado no Cloudflare Pages, não em uma nova API do site.

O workflow GitHub quality.yml dispara na main ou manualmente, **não automaticamente na branch da PR draft**. Compilação verde não comprova QA visual, revisão jurídica ou liberação pública.

## Documentação vigente

- [AGENTS.md](AGENTS.md): regras de execução, conta e SSOT.
- [URGENTE.md](URGENTE.md): checkpoint operacional e bloqueios.
- [docs/README.md](docs/README.md): índice da documentação ativa e do arquivo histórico.
- [docs/TONECOS-STUDIO-CONSOLIDACAO.md](docs/TONECOS-STUDIO-CONSOLIDACAO.md): autoridade de cada camada.
- [docs/TONECOS_CATALOG_FIRST_PARTY_PROXY.md](docs/TONECOS_CATALOG_FIRST_PARTY_PROXY.md): caminho do Worker.
- [docs/TONECOS_SAFE_PREVIEW.md](docs/TONECOS_SAFE_PREVIEW.md): proteção do preview.
- [docs/OPERACAO_CLOUDFLARE_PAGES.md](docs/OPERACAO_CLOUDFLARE_PAGES.md): publicação, rollback e limite gratuito.

Não ativar produção, domínio, indexação, conta ou pagamento até QA autenticado, revisão jurídica, isolamento do legado Vercel, validação de rollback e autorização explícita.
