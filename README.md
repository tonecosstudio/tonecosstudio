# Tonecos Studio

Plataforma comercial Tonecos: site, contas, catálogo integrado, seleção de modelos, solicitações de orçamento, pedidos, pagamentos e acompanhamento da produção.

## Estado atual

**NO-GO para lançamento ou substituição do site público.** O repositório está privado e a main foi preservada. O trabalho atual acontece somente na branch `integration/tonecosstudio-canonical-20261101`, porque o projeto Vercel antigo ainda precisa ser comprovadamente isolado do domínio OrdaX.

O catálogo escalável permanece tecnicamente no projeto `washingtonmsdj/catalogo` (Cloudflare Worker/D1/R2) durante a migração. O Studio aproveita o núcleo comercial Supabase existente. A primeira integração de leitura está na branch: a rota `/modelos` usa o gateway canônico HTTPS com filtros/cursor e detalhes sob demanda, sem copiar catálogo ao Supabase. A configuração `VITE_CANONICAL_CATALOG_API_BASE` é obrigatória para ativar essa origem; sem ela, a interface mostra indisponibilidade explícita. **Não há autorização para publicar dados, emitir pedidos ou criar orçamentos automaticamente.**

Veja [URGENTE.md](URGENTE.md) para o checkpoint operacional e [docs/TONECOS-STUDIO-CONSOLIDACAO.md](docs/TONECOS-STUDIO-CONSOLIDACAO.md) para o contrato entre catálogo, sistema comercial, identidade, deploy e orçamento. Não usar métricas ou relatórios datados como prova atual.

## Stack

- React 18, TypeScript e Vite;
- Tailwind CSS, shadcn/ui e Radix UI;
- Supabase Auth, PostgreSQL, Storage e Edge Functions;
- Stripe;
- Vitest e Testing Library.

## Requisitos

- Node.js 24 LTS;
- npm;
- projeto Supabase separado por ambiente;
- credenciais server-side configuradas fora do Git.

## Desenvolvimento local

1. Clone o repositório.
2. Execute npm ci.
3. Copie .env.example para .env.local.
4. Preencha somente os valores do seu ambiente, incluindo `VITE_CANONICAL_CATALOG_API_BASE` **após** homologar o proxy HTTPS do Worker da Tonecos (nunca `ordax.com.br`).
5. Execute npm run dev.

Nunca coloque service_role, Stripe secret, OAuth secret, SMTP secret ou tokens em variáveis VITE_*.

## Quality Gate

Execute antes de cada commit relevante e confirme novamente no push:

- npm run format:check
- npm run typecheck
- npm run lint
- npm run security:supabase-access
- npm run test:coverage
- npm run build
- npm audit --omit=dev --audit-level=high

O GitHub Actions deve executar o mesmo gate em cada push para a main. Um build local isolado não prova prontidão de produção.

## Documentação canônica

- [URGENTE.md](URGENTE.md): plano e status de lançamento;
- [AGENTS.md](AGENTS.md): regras de continuidade e qualidade;
- [docs/README.md](docs/README.md): mapa da documentação vigente;
- [docs/TONECOS-STUDIO-CONSOLIDACAO.md](docs/TONECOS-STUDIO-CONSOLIDACAO.md): arquitetura e gates de migração;
- [docs-archive/](docs-archive/): histórico sem autoridade operacional.

## Estrutura principal

- src/: aplicação React;
- supabase/migrations/: histórico do schema;
- supabase/functions/: Edge Functions;
- scripts/: automações e auditorias;
- docs/: documentação vigente;
- docs-archive/: relatórios históricos;
- public/: assets públicos.

## Segurança

A base possui TypeScript strict, CSP, RLS e auditoria de fronteiras Supabase, mas segurança de lançamento só será declarada após CI verde, projeto remoto acessível, advisors, revisão de grants/RLS/funções e testes de autorização. Veja os gates em URGENTE.md.

## Licença

Proprietary — todos os direitos reservados.
