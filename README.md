# ORDAX

Plataforma web da Tonecos Studios para catálogo, clientes, assinaturas, pagamentos e operação de produção de colecionáveis.

## Estado atual

**NO-GO para lançamento.** A recuperação está sendo executada diretamente na **main**, única branch operacional.

O site público renderiza, mas o catálogo publicado está vazio e o projeto Supabase declarado pelo repositório está inativo. O repositório também não possuía CI versionado nem release publicada na auditoria de 2026-08-30.

O plano, as evidências e o próximo passo ficam em [URGENTE.md](URGENTE.md). Não use percentuais ou relatórios datados como estado atual.

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
4. Preencha somente os valores do seu ambiente.
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
