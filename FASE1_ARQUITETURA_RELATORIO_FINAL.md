# FASE 1 - Relatorio Arquitetural (Parcial Consolidado)

Data: 2026-05-18
Escopo: hardening estrutural e SSOT

## 1) Problemas encontrados

- Ambiguidade de fronteira em testes de `choice` (teste acessando service direto).
- Tipos de pedido duplicados em contextos diferentes.
- Uso residual de `console.error` em servicos administrativos.
- Documentacao de progresso inconsistente e desatualizada.

## 2) Modulos mais criticos

1. `src/services/admin/*` (alto volume de regras e integracoes)
2. `src/types/*` (historico de duplicacao e legados)
3. `src/components/customer/*` + `src/hooks/customer/*` (boundary UI x aplicacao)

## 3) Arquivos mais problematicos (estado atual por volume/complexidade)

Indicadores coletados:
- Total TS/TSX: `933`
- Arquivos > 500 linhas: `66`
- Arquivos com > 15 imports: `31`
- Arquivos com import relativo profundo (`../../../`): `0`
- TODO/FIXME no codigo: `381`

Observacao:
- tentativa de executar `madge` para ciclo falhou por restricao de cache/offline do npm no ambiente atual.

## 4) Riscos arquiteturais

- Risco medio/alto de regressao em areas com arquivos gigantes.
- Risco de acoplamento em modulos com alta concentracao de imports.
- Risco de manutencao por backlog alto de TODO/FIXME.
- Risco baixo de import profundo (indicador zerado no padrao monitorado).

## 5) Melhorias aplicadas

- Boundary de testes consolidado para camada de `hooks/actions` (sem acesso direto a service).
- Consolidacao SSOT de tipos de pedido em camada canonica.
- Reducao de ruído operacional via logger estruturado em servicos centrais.
- Limpeza de tipagem e imports em arquivos tocados.

## 6) Pendencias restantes

- executar varredura de ciclos totalmente offline
- reduzir backlog de TODO/FIXME critico por prioridade de negocio
- decompor os 66 arquivos acima de 500 linhas com criterio de dominio
- continuar convergencia SSOT em tipos legados residuais

## 7) Score de estabilidade arquitetural

Score atual (parcial): **78/100**

Criterios:
- +20: sem import relativo profundo no padrao monitorado
- +18: consolidacao de boundaries em testes criticos
- +15: consolidacao SSOT principal de tipos de pedido
- +10: validacao recorrente com lint/build
- -10: quantidade de arquivos grandes
- -10: volume de TODO/FIXME
- -5: varredura de ciclos sem automacao offline concluida

## 8) Proximo ciclo recomendado

1. Priorizar top 15 arquivos por risco (linhas + imports + impacto de dominio).
2. Refatorar por lotes pequenos com validação (`eslint` + `build`) em cada lote.
3. Fechar relatorio final da fase com score alvo >= 85/100.
