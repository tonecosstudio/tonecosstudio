# TONART Studio

O site público oficial TONART Studio está em **https://tonartstudio.com.br**, hospedado manualmente no projeto Vercel `tonart-studio-public` da equipe Washington, com GitHub `tonecosstudio/tonecosstudio` como fonte única. **Cloudflare permanece como backend canônico** (Worker, D1/R2) e preview protegido. Em 09/11/2026 o catálogo visual foi publicado manualmente no domínio oficial como **pré-lançamento somente leitura/noindex**, no deployment Vercel `dpl_HF9PbdGxtke3cdg981yhFEauZP2B` (`READY`), SHA `0d7cc5dd957215672c328187215035fb162c7322`. Renders comuns estão visíveis e os 264 modelos SpecialSTL identificados permanecem em quarentena, sem substituições aprovadas. **Lançamento comercial e indexação continuam NO-GO**. A regra permanente está em [AGENTS.md](AGENTS.md).

## Quem é dono de quê

| Recurso | Conta e origem | Estado |
| --- | --- | --- |
| Repositório do site | GitHub tonecosstudio/tonecosstudio (ID 1163825583) | Único código-fonte do site; PR #4 draft |
| Hospedagem do frontend oficial | Vercel `tonart-studio-public`, equipe Washington | `tonartstudio.com.br` e `www`, deploy manual controlado, site pré-lançamento/noindex |
| Prévia | Cloudflare Pages + Cloudflare Access | Testes privados, sem segundo frontend público oficial |
| API de modelos e imagens | Cloudflare Worker tonecos-catalogo-api, mesma conta Tonecos | Autoridade única dos modelos; D1/R2 somente via Worker |
| Código do backend da API | Origem temporária GitHub washingtonmsdj/catalogo → destino **services/catalogo/** neste repo | Migração para monorepo **autorizada como plano**, sem copiar/cutover/publicar até gates |
| Publicação | PR #4 Draft → CI offline → Vercel projeto oficial | Git auto deploy desligado; nenhum GO de mídia sem aprovação |
| Supabase, Stripe, clientes, pedidos | Aplicação comercial futura | Excluídos do MVP público somente leitura |

O endereço GitHub antigo washingtonmsdj/tonecosstudio redireciona ao mesmo repositório institucional ID 1163825583. Isso **não** transfere a Vercel antiga para a conta Tonecos.

**Decisão canônica:** o frontend e o backend ficarão no **mesmo repositório tonecosstudio/tonecosstudio**. O serviço Worker, os dados D1 e imagens R2 continuam únicos na Cloudflare Tonecos. A implementação segue o [plano canônico de consolidação](docs/MIGRACAO_CATALOGO_MONOREPO.md), sem criar outro GitHub repo nem importar a antiga interface React.

**Migração em andamento:** a API pública foi copiada **inativa** para [`services/catalogo/`](services/catalogo/README.md), com 22 migrations D1 versionadas e testes offline. O publicador ativo e o banco **continuam na origem atual**; nenhuma versão nova do Worker foi publicada. Plano: [MIGRACAO_CATALOGO_MONOREPO.md](docs/MIGRACAO_CATALOGO_MONOREPO.md).

## Arquitetura e escopo

Navegador → Vercel React/Vite (`tonartstudio.com.br`) → `/catalogo-api/` na mesma origem → adaptador Vercel GET restrito → Worker canônico `tonecos-catalogo-api` → D1/R2. Prévia privada alternativa: Cloudflare Pages → Pages Function GET → Worker canônico. O Pages não controla o banco nem mantém outro catálogo. O site público mostra Home, Universo, listagem/busca, fichas/galerias, Sobre, Contato por e-mail, Termos e Privacidade. Sem cadastro, login, orçamento confirmado, checkout, pagamento ou admin nesta fase.

A aplicação comercial antiga continua no repositório para uma fase posterior, mas não foi incluída nos chunks do MVP readonly homologado. Preservar a identidade visual escura/dourada Arcade existente, sem outro frontend ou design system.

## Desenvolvimento e validação

Requer Node.js 24 LTS e npm. Usar **npm ci** e **npm run release:verify** em ambiente configurado para validar TypeScript, lint, auditorias, testes/cobertura, build e dependências. Copiar .env.example para .env.local apenas em desenvolvimento; segredos não podem entrar em VITE_* nem no Git. O proxy first-party é configurado no Cloudflare Pages, não em uma nova API do site.

O workflow GitHub `quality.yml` valida as alterações da PR por impacto; a produção Vercel só é atualizada manualmente com SHA aprovado. Compilação verde não comprova QA visual, origem de mídia, revisão jurídica ou GO do MVP.

## Documentação vigente

- [AGENTS.md](AGENTS.md): regras de execução, conta e SSOT.
- [URGENTE.md](URGENTE.md): checkpoint operacional e bloqueios.
- [docs/README.md](docs/README.md): índice da documentação ativa e do arquivo histórico.
- [docs/TONECOS-STUDIO-CONSOLIDACAO.md](docs/TONECOS-STUDIO-CONSOLIDACAO.md): autoridade de cada camada.
- [docs/TONECOS_CATALOG_FIRST_PARTY_PROXY.md](docs/TONECOS_CATALOG_FIRST_PARTY_PROXY.md): caminho do Worker.
- [docs/TONECOS_SAFE_PREVIEW.md](docs/TONECOS_SAFE_PREVIEW.md): proteção do preview.
- [docs/OPERACAO_CLOUDFLARE_PAGES.md](docs/OPERACAO_CLOUDFLARE_PAGES.md): publicação, rollback e limite gratuito.

O catálogo visual já está publicado em pré-lançamento na Vercel com renders comuns visíveis. **Não liberar imagens SpecialSTL em quarentena, indexação, contas, pedidos ou pagamentos**, nem declarar lançamento comercial concluído, sem direitos verificados, revisão pertinente e autorização explícita. A PR #4 permanece Draft; o deploy manual não equivale a merge.
