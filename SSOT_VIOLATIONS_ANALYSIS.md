# Análise SSOT - Estado Atual

## Objetivo
Mapear violações de Single Source of Truth sem confundir tipos realmente duplicados com modelos distintos por contexto.

## Estado validado
- `OrderStatus` canônico para pedidos unificados está em `src/types/admin/orders.ts`.
- `UnifiedOrder` é o modelo canônico para a visão administrativa unificada.
- Tipos de suporte, integração e crédito/assinatura podem existir temporariamente quando representam payloads ou domínios diferentes.

## Diretriz SSOT
- Novo código deve preferir tipos canônicos em `src/types/admin/orders.ts` quando tratar pedidos unificados.
- Tipos contextuais devem ter nome explícito, como `SupportOrder` ou `IntegrationOrder`.
- Aliases legados só devem permanecer quando necessários para compatibilidade e devem ser marcados para remoção futura.

## Riscos
- Remover tipos legados sem mapear consumidores pode quebrar fluxos ativos.
- Unificar tipos semanticamente diferentes cria acoplamento artificial.
- A prioridade deve ser clareza de boundary, não remoção mecânica.

## Próximas ações
1. Usar `rg "OrderStatus|interface Order|type OrderType" src` antes de qualquer nova migração.
2. Remover aliases apenas quando não houver consumidores.
3. Criar mappers quando payload de infraestrutura não coincidir com modelo de domínio.
4. Validar com `npm run build` e testes focados.
