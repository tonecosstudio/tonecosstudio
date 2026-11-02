# Documentação Tonecos Studio

Este diretório contém somente documentação que pode orientar trabalho atual. O histórico datado pertence a docs-archive e não define o estado do produto.

## Autoridade

1. [URGENTE.md](../URGENTE.md) — plano, evidências, bloqueios e checkpoints de lançamento;
2. [AGENTS.md](../AGENTS.md) — regras de execução e handoff;
3. [README.md](../README.md) — visão geral e comandos;
4. [TONECOS-STUDIO-CONSOLIDACAO.md](TONECOS-STUDIO-CONSOLIDACAO.md) — autoridade do produto comercial e integração escalável;
5. documentos temáticos vigentes deste diretório;
6. [docs-archive/](../docs-archive/) — histórico para consulta, sem autoridade operacional.

## Estado da organização

A documentação ainda está em consolidação. Na auditoria de 2026-08-30 foram encontrados 41 Markdown na raiz, 40 neste diretório e 54 no arquivo histórico. Vários relatórios antigos se contradizem.

Até P1 do plano urgente terminar:

- trate relatórios FASE, PROGRESSO, RESUMO, STATUS e FINAL como candidatos a arquivo;
- confirme comandos contra package.json e configuração vigente;
- confirme segurança contra migrations, funções, CI e ambiente remoto;
- não copie percentuais ou datas antigas para novos documentos.

## Áreas que terão documentação canônica

- architecture/: visão de componentes, fronteiras e ADRs;
- operations/: deploy, rollback, observabilidade e incidentes;
- setup/: ambiente local, Supabase, Stripe e OAuth;
- security/: modelo de ameaça, RBAC/RLS e resposta a vulnerabilidades;
- product/: fluxos públicos, cliente e admin;
- release/: critérios, checklist e notas de versão.

A estrutura será criada apenas quando os documentos forem classificados, evitando novas pastas vazias ou SSOT concorrentes.
