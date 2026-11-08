# Documentação operacional — Tonecos Studio

**Hospedagem oficial atual: Vercel `tonart-studio-public` em https://tonartstudio.com.br.** Cloudflare mantém o Worker/D1/R2 e a prévia Pages protegida; não há segundo catálogo. O site está em pré-lançamento somente leitura/noindex, PR #4 Draft e **NO-GO do MVP visual sem renders aprovados**. A regra permanente está em [AGENTS.md](../AGENTS.md), e o checkpoint em [URGENTE.md](../URGENTE.md).

## Ordem de leitura

1. [README principal](../README.md) — contas, produto, stack e arquitetura.
2. [AGENTS](../AGENTS.md) — regras de autorização e implementação.
3. [URGENTE](../URGENTE.md) — checkpoint verificável, próximos gates e do_not_repeat.
4. [TONECOS-STUDIO-CONSOLIDACAO.md](TONECOS-STUDIO-CONSOLIDACAO.md) — autoridades do produto, das contas e das integrações.
5. [TONECOS_CATALOG_FIRST_PARTY_PROXY.md](TONECOS_CATALOG_FIRST_PARTY_PROXY.md) — contrato GET do proxy e Worker canônico; frontend oficial usa o adaptador Vercel.
6. [TONECOS_SAFE_PREVIEW.md](TONECOS_SAFE_PREVIEW.md) — preview protegido e isolamento de Supabase.
7. [OPERACAO_CLOUDFLARE_PAGES.md](OPERACAO_CLOUDFLARE_PAGES.md) — runbook específico do Pages privado; publicação oficial Vercel segue `vercel.json` e [README](../README.md).

## Execução canônica da consolidação

- **[MIGRACAO_CATALOGO_MONOREPO.md](MIGRACAO_CATALOGO_MONOREPO.md)** — plano M0–M6, SSOT de etapas, critérios de GO, ownership, dependências, rollback e checkpoint; prevalece sobre a proposta anterior de transferir o repo do catálogo.
- **[Manifesto de migração](../config/catalog-code-consolidation.json)** — fonte verificável dos blobs Worker/D1 da origem; é snapshot auditado, não autorização de release.
- **[Guard offline](../scripts/architecture/catalog-monorepo.test.mjs)** — executado por npm run catalog:monorepo:check e pelo build, sem rede, D1 ou R2.
- **[Configuração do Worker staged](../services/catalogo/wrangler.jsonc)** — fonte dos recursos Worker/D1/R2 já existentes; o preflight M5 a consulta junto do manifesto, nunca substitui aprovação humana ou o publicador ativo.

## Documentos históricos

Em 04/11/2026 foram identificados **36 documentos de docs/** que descreviam configuração antiga, relatórios datados, catálogo em Supabase, Vercel como hosting, scripts de importação ou recursos da OrdaX. Devem residir apenas em [docs-archive/historico-2026-11-04](../docs-archive/historico-2026-11-04/), sem autoridade operacional. O conteúdo de URGENTE anterior e ORDAX_APP_PLATFORM também pertence ao arquivo. O Git preserva versões anteriores.

Documentação junto aos módulos em src/ e supabase/functions/ é específica desses módulos, majoritariamente da fase comercial futura; não altera o escopo do MVP readonly. Não executar instruções de importação ou consultas caras encontradas em históricos sem escopo e orçamento aprovados.

## Regra de manutenção

Status mutável vai para URGENTE.md; decisão arquitetural, para o contrato vigente; operações, para o runbook existente. **Não abrir SSOT paralelo** por ocasião de um novo chat. Verificar ambiente remoto antes de afirmar estados. Documentação não é teste visual nem gate de segurança.

## Verificação de documentação junto ao código — 04/11/2026

Foram lidos **48 Markdown** existentes em `src/` e `supabase/`: são descrições técnicas dos componentes comerciais e funções Supabase futuras, **não runbooks de operação do MVP público**. Nenhum deles configurava Vercel como hosting; **seis** continham termos da OrdaX ou URLs/caminhos antigos e receberam avisos explícitos, correções de caminhos e instruções de configuração sem domínios de terceiros. Um arquivo vazio (`src/hooks/admin/STATUS_PERSISTENCE_README.md`) foi removido. Os demais documentos locais permanecem associados ao código para preservar a rastreabilidade da fase comercial; afirmações neles não equivalem a validação de produção.
