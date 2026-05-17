# FASE 1 - Hardening Arquitetural e Estabilizacao Estrutural

## Objetivo
Estabelecer uma fundacao arquitetural solida antes de novas expansoes funcionais, refinamentos visuais e otimizacoes de UX.

## Escopo desta fase
- Eliminar dependencias ciclicas e imports cruzados indevidos.
- Reduzir acoplamento entre UI, aplicacao, dominio e infraestrutura.
- Padronizar estrutura de modulos, services, hooks, components e pages.
- Diminuir concentracao de responsabilidade em arquivos gigantes.
- Consolidar convencoes de importacao, aliases e boundaries.

## Diagnostico inicial (baseline)
- `src` contem mais de 800 arquivos TS/TSX.
- Existe ciclo detectado entre:
  - `src/services/admin/stage-service.ts`
  - `src/services/admin/stage-validation.ts`
- Existem arquivos com alto risco de manutencao por tamanho e mistura de responsabilidades em `pages/admin`, `components/admin` e `services`.
- `tsconfig.app.json` estava com `include` restrito a `src/integrations/**/*`, reduzindo cobertura de validacao estrutural.
- Lint em estado de alto ruido, indicando necessidade de estrategia incremental com baseline.

## Plano de execucao
1. **Fundacao e guardrails**
2. **Dependencias e boundaries**
3. **Normalizacao de estrutura por dominio**
4. **Refatoracao de hotspots**
5. **Consolidacao e metricas finais**

## Sprint 1 (implementacao imediata)
1. Corrigir ciclo arquitetural em `services/admin/stage-*`.
2. Corrigir cobertura de compilacao/validacao do app no `tsconfig.app.json`.
3. Criar contratos compartilhados para tipos de estagio (`stage-types`).
4. Registrar baseline inicial de metricas arquiteturais.

## Sprint 2 (arquitetura por dominio)
1. Definir boundaries obrigatorios:
2. `components` nao acessa infraestrutura diretamente.
3. `pages` orquestra via hooks/camada de aplicacao.
4. `services` concentra regras de aplicacao e acesso a dados.
5. `lib` fica restrito a infraestrutura e utilitarios transversais.
6. Remover imports cruzados indevidos entre dominios admin/customer/groups/production.

## Sprint 3 (hotspots de complexidade)
1. Quebrar arquivos criticos em submodulos coesos.
2. Extrair logica repetida para funcoes/shared domain-safe.
3. Reduzir hooks com responsabilidade multipla.
4. Remover codigo legado nao utilizado.

## Criterios de validacao da fase
- Sem dependencia ciclica em `src` (madge circular = 0).
- Sem acesso direto indevido entre modulos de dominios isolados.
- Menor concentracao de logica de dominio dentro de componentes de UI.
- Estrutura de importacao padronizada por alias e convencao definida.
- Tendencia de queda em arquivos gigantes e duplicacoes.

## Relatorio final da fase (formato)
1. Problemas encontrados.
2. Modulos mais criticos.
3. Arquivos mais problematicos.
4. Riscos arquiteturais.
5. Melhorias aplicadas.
6. Pendencias restantes.
7. Score de estabilidade arquitetural (0-100).

## Baseline do score
- Score inicial estimado: **62/100**.
- Meta da FASE 1: **75+** com reducao de risco estrutural.
