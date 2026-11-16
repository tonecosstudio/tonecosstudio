# Documentação operacional — TONART Studio

**Estado verificado em 12/11/2026.** Frontend oficial: Vercel `tonart-studio-public` em https://tonartstudio.com.br. Catálogo e mídias: **único** Cloudflare Worker `tonecos-catalogo-api`, D1/R2 na conta Tonecos, com publicador ativo `washingtonmsdj/catalogo`. A cópia `services/catalogo/` é *staged-offline*, sem cutover aprovado. Cloudflare Pages continua uma prévia protegida, não o frontend oficial.

O site está em **pré-lançamento/noindex**. O modo comercial Vercel (conta e orçamento autenticado) está habilitado; **isso não é GO para indexação, pagamentos ou lançamento comercial completo**. Os módulos de perfil além de dados pessoais, pedidos de orçamento e acesso básico ainda aparecem como indisponíveis.

## Documentos canônicos por finalidade

| Documento | O que responde |
| --- | --- |
| [TONART-COLECOES-ASSINATURAS-COINS.md](TONART-COLECOES-ASSINATURAS-COINS.md) | Estratégia comercial de planos, entregas, preços, Coins e extras; seção 4.1 delimita a curadoria editorial privada da PR #28 e os gates de integração com a PR #27 |
| [README principal](../README.md) | Estado consolidado do MVP, Minha Conta, orçamentos, owners e pendências reais de GO |
| [AGENTS](../AGENTS.md) | Regras, segurança, owners, entrega rápida e política de mídia |
| [URGENTE](../URGENTE.md) | Checkpoint operacional atual; os checkpoints antigos abaixo são históricos, não ordens atuais |
| [TONECOS-STUDIO-CONSOLIDACAO.md](TONECOS-STUDIO-CONSOLIDACAO.md) | Limites de autoridade e integração; confirmar observações datadas antes de agir |
| [TONECOS_CATALOG_FIRST_PARTY_PROXY.md](TONECOS_CATALOG_FIRST_PARTY_PROXY.md) | Site → proxy Vercel/Pages → Worker → D1/R2; filtros e cache |
| [TONECOS_SAFE_PREVIEW.md](TONECOS_SAFE_PREVIEW.md) | Preview protegido e fail-closed |
| [OPERACAO_CLOUDFLARE_PAGES.md](OPERACAO_CLOUDFLARE_PAGES.md) | Runbook específico do Pages privado, não autoriza segundo frontend público |
| [MIGRACAO_CATALOGO_MONOREPO.md](MIGRACAO_CATALOGO_MONOREPO.md) | Plano M0–M6 **pendente de cutover autorizado**, com históricos datados |

**Ordem de leitura proporcional ao trabalho:** README → AGENTS → trecho pertinente de URGENTE; abrir outros documentos somente quando o componente for afetado. Não voltar a ler o acervo histórico inteiro a cada tarefa.

## Marcos confirmados e não confirmados

- Site Vercel `main` integrado até PR #24 (12/11); a visualização de modelos, revisão administrativa e proteção de cache foram entregues sem um segundo catálogo.
- Worker original: PRs [#266](https://github.com/washingtonmsdj/catalogo/pull/266), [#267](https://github.com/washingtonmsdj/catalogo/pull/267), [#268](https://github.com/washingtonmsdj/catalogo/pull/268) e [#269](https://github.com/washingtonmsdj/catalogo/pull/269) integradas na origem. A última corrigiu o teste de cache que provocara rollback; versão observada a 100% em 12/11: `0b6d0d02-58f6-4f99-9a9a-92a605a498ed`.
- Produção Vercel: `VITE_TONECOS_COMMERCIAL_MVP=true`, `VITE_CATALOG_QUOTES_ENABLED=true`, `VITE_PUBLIC_CATALOG_MVP=false`, `VITE_PREVIEW_READ_ONLY=false`.
- Supabase TONART ativo: `profiles` e `quotes` com RLS, RPC `submit_catalog_quote_request`; não inferir E2E de usuário real a partir de schema.
- Pendente: confirmação E2E autenticada de cadastro/login/recovery/orçamento/resposta, QA visual, revisão jurídica e direitos de mídia, autorização específica para indexação. Seções legadas da Minha Conta não integram o MVP funcional de orçamento.
- **Quarentena SpecialSTL** permanece por identidade confirmada (264 registros) e somente pode ser liberada por evidência de direitos e render legítimo da escultura correta. Imagens comuns permanecem visíveis.

## Curadoria editorial interna — checkpoint de 16/11/2026

A [PR #28](https://github.com/tonecosstudio/tonecosstudio/pull/28) organiza candidatos privados por personagem/franquia/variante, tags controladas e coleções internas, preservando o catálogo único Cloudflare D1/R2. **Não é oferta comercial, não cria preço, não movimenta Coins e não publica modelos**. A descrição técnica e os caminhos canônicos estão na [seção 4.1 do documento comercial](TONART-COLECOES-ASSINATURAS-COINS.md). O trabalho de ofertas/assinaturas/Coins permanece na [PR #27](https://github.com/tonecosstudio/tonecosstudio/pull/27); não combinar ou sobrescrever seus arquivos sem reconciliar alterações.

Provas executadas na PR #28: **21/21 Vitest** direcionados, **28/28 verificações SQL** em PostgreSQL isolado com ambas as migrations, **`npm run typecheck:app` integral aprovado**, **44/44 testes do build** e preview Vercel **READY** (prova no commit `ce2a8b18`, comando de build original restaurado depois). A PR #28 segue em *draft*: o Supabase conectado apresenta apenas a Edge Function `tonart-quotes`; **`admin-rpc` não está implantada** e as duas migrations editoriais **não estão aplicadas**. Falta homologar admin/RPC/RLS e coordenar a implantação com a PR #27, sem escrever em produção antes de autorização. O checkpoint de 15/11 em `URGENTE.md` sobre planos e Coins é histórico, não prova de conclusão comercial.

## Manutenção de documentação

Status mutável fica em **URGENTE.md** e resume-se no README; decisões permanentes ficam em AGENTS/manifesto; operações em runbooks. Não abrir outro documento SSOT nem usar arquivos arquivados como ordem de deploy. Observações antigas sobre PR #4 Draft, Cloudflare Pages como hospedagem principal, ausência de contas/orçamentos ou a PR #266 pendente **foram superadas pelo estado atual**.

O histórico anterior a 04/11 e os relatórios datados residem em [docs-archive](../docs-archive/). Código comercial antigo que não está exposto/operacional no MVP não é prova de funcionalidade concluída. A documentação não substitui testes, aprovação humana ou controle de produção; **nenhuma mudança documental, por si, requer build/deploy**.
