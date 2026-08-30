# Consolidação SSOT - Registro

## Status
Consolidação parcial concluída para reduzir ambiguidade nos tipos de pedidos, mantendo compatibilidade com domínios legados ativos.

## Resultado
- `OrderStatus` canônico permanece em `src/types/admin/orders.ts`.
- `UnifiedOrder` permanece como modelo principal da visão unificada de pedidos.
- Tipos contextuais devem manter nomes explícitos.
- Migrações futuras devem evitar aliases genéricos quando houver alternativa clara.

## Validação esperada
- Build verde após cada migração.
- Nenhum import novo de tipos legados em código novo.
- Nenhum mapper implícito dentro de componente de UI.

## Pendências
- Reavaliar tipos legados de `subscription-credit-system`.
- Remover aliases de compatibilidade quando consumidores forem migrados.
- Centralizar helpers de labels/status em módulo próprio se houver duplicação real.
