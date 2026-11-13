# TONART Studio

**Estado verificado em 13/11/2026.** O frontend oficial está no projeto Vercel `tonart-studio-public`, domínio **https://tonartstudio.com.br**, com o código-fonte do site em `tonecosstudio/tonecosstudio/main`. O catálogo público continua usando **um único Worker** `tonecos-catalogo-api` da conta Cloudflare Tonecos (D1 + R2); o publicador ativo do Worker permanece no repositório `washingtonmsdj/catalogo`. A cópia em `services/catalogo/` está **staged-offline**, não é um segundo publicador. O Cloudflare Pages é somente uma prévia protegida.

**Não confundir os dois marcos:** a vitrine visual está publicada em pré-lançamento, mas a **indexação e o lançamento público definitivo ainda não têm GO**. A implantação comercial Vercel atual habilita conta e orçamentos; isso **não** significa checkout, pagamentos ou conta completa.

## Autoridades únicas (SSOT)

| Camada | Autoridade vigente | Limite |
| --- | --- | --- |
| Site e experiência TONART | `tonecosstudio/tonecosstudio/main`; Vercel `tonart-studio-public` | Deploy controlado de SHA aprovado; não criar frontend paralelo |
| Catálogo e imagens | Worker `tonecos-catalogo-api` / D1 `tonecos-catalogo` / R2 `tonecos-catalogo-media` | Writer atual: `washingtonmsdj/catalogo`; não consultar ou migrar D1 em massa |
| Identidade e orçamentos comerciais | Projeto Supabase TONART `icmtmaakjucmuzxnofkd`: Auth, `profiles`, `quotes`, `quote_events`, RLS e RPCs | Não armazenar modelos no Supabase; não criar fluxo paralelo de solicitação |
| Prévia alternativa | Cloudflare Pages protegido por Access | Não é o site oficial público |
| Futura consolidação Worker | `services/catalogo/` e [manifesto de migração](config/catalog-code-consolidation.json) | `releaseAuthorized=false`; sem cutover nem segundo pipeline |

A API é consumida por `/catalogo-api/` e pelo proxy GET restrito existente na Vercel; o navegador **não recebe** credenciais de escrita D1/R2. Cache compartilhado e CDN já ativos. Em 12/11, PRs Worker [#268](https://github.com/washingtonmsdj/catalogo/pull/268) e [#269](https://github.com/washingtonmsdj/catalogo/pull/269) foram integradas; a segunda corrigiu o smoke de cache. Versão Worker validada a 100%: `0b6d0d02-58f6-4f99-9a9a-92a605a498ed`. Na Vercel, a proteção de parâmetros de cache chegou à main pela PR [#24](https://github.com/tonecosstudio/tonecosstudio/pull/24), commit `bb661ab`. Estes são **checkpoints históricos**, não versões que devem ser fixadas automaticamente em novos deploys.

## Recursos implementados e limites do MVP

| Recurso | Estado observado no código/configuração | O que falta validar ou concluir |
| --- | --- | --- |
| Catálogo visual (Home, Universo, busca/filtros, ficha, galeria) | Publicado em pré-lançamento; 12 modelos carregados automaticamente na administração; cache CDN e Worker protegidos | QA visual autenticado desktop/mobile, licenças/créditos, conteúdos e aprovação editorial |
| Capas | Imagens comuns visíveis; **264 identidades SpecialSTL** em quarentena | Substituir **somente** mídias SpecialSTL com prova de direitos e identidade exata, se aplicável; nunca esconder todo o catálogo |
| **Minha Conta** (`/perfil` / `/login`) | Cadastro por e-mail, login, confirmação de e-mail conforme Auth, recuperação de senha, edição de nome/telefone, troca de senha com revalidação da senha atual e logout, mensagens de erro localizadas e claras, sair | E2E real de cadastro/confirmar e-mail/login/recuperação/perfil ainda requer uma caixa de teste controlada; proteção de senhas vazadas segue como gate do Supabase Auth |
| Orçamento do cliente | `/solicitar-orcamento` e `/meus-orcamentos`; seleção de modelos, quantidades, observações, WhatsApp opcional, CEP, escala/acabamento; escrita em `quotes` por RPC autenticada; resposta administrativa com valor + mensagem; histórico imutável em `quote_events` | Backend cliente → admin → resposta textual/valor → histórico foi provado de forma reversível em produção; falta homologar a jornada completa no frontend oficial após o deploy do SHA atual |
| Administração | Login único com autorização por função Supabase; atendimento de orçamentos com status, valor, mensagem ao cliente e histórico persistido; lista completa de usuários com busca/paginação server-side; Central de Comunicação mostra pendentes/em análise/respondidos usando a fila canônica; revisão do catálogo com CSV | Homologar as telas no deploy oficial; edição direta do catálogo ainda não salva, requer processo editorial source-first |
| Pagamentos, assinaturas, pedidos físicos, Coins e suporte completos | **Não habilitados para lançamento**. A área da conta mostra seções anteriores como `Indisponível`. Orçamento não é venda | Fora do MVP de orçamento até decisão e implementação próprias; não simular saldo, recebimentos ou pedidos reais |

O ambiente Vercel produção foi verificado em 12/11: `VITE_TONECOS_COMMERCIAL_MVP=true`, `VITE_CATALOG_QUOTES_ENABLED=true`, `VITE_PUBLIC_CATALOG_MVP=false` e `VITE_PREVIEW_READ_ONLY=false`. As tabelas `profiles` e `quotes` e a RPC `submit_catalog_quote_request` foram constatadas no Supabase ativo; ambas as tabelas têm RLS ativa. **Presença de código, flags e esquema não substitui um teste autenticado de usuário real.**

## Critérios pendentes para GO público

1. Validar integralmente **conta e orçamento** com cliente de teste e administrador real no domínio oficial, incluindo e-mails de confirmação/recuperação, troca de senha e as telas do histórico já persistido por RLS.
2. Restabelecer a autorização Git do owner `tonecosstudio` na instalação Vercel e religar o projeto oficial `tonart-studio-public` ao repositório canônico; depois homologar o SHA atual e executar QA desktop/mobile.
3. Habilitar a proteção de senhas vazadas no Supabase Auth; completar os dados legais do operador sem inventar razão social/endereço/DPO; revisar licença/crédito dos renders mantendo a quarentena SpecialSTL.
4. Obter autorização expressa para lançar e indexar (robots/sitemap/canonical); sem GO, manter `noindex`.
5. Não associar este MVP de catálogo + orçamento a pagamentos ou assinaturas não implementados.

## Execução e documentação

Node 24+, `npm ci`, `npm run release:verify` quando aplicável. Verificar CI, configuração de produção e gates proporcionais ao risco; não tratar compilação como E2E. Nunca executar scan integral no D1, migrações ou importações apenas para conferir estado e **não criar cache, Writer, API, banco ou frontends paralelos**.

- [AGENTS.md](AGENTS.md): regras e owners.
- [URGENTE.md](URGENTE.md): checkpoint operacional de maior prioridade, atualizado por evidências.
- [docs/README.md](docs/README.md): índice da documentação operacional.
- [docs/MIGRACAO_CATALOGO_MONOREPO.md](docs/MIGRACAO_CATALOGO_MONOREPO.md): plano de migração *ainda não autorizada*; seções com SHA ou PR antiga são históricas.
- [docs/TONECOS_CATALOG_FIRST_PARTY_PROXY.md](docs/TONECOS_CATALOG_FIRST_PARTY_PROXY.md): proxy first-party e cache.
