# Novo Fluxo de Estágios de Produção

## Fluxo Completo (12 Etapas)

```
1️⃣  Aguardando Pagamento
    Pedido criado, aguardando confirmação de pagamento

2️⃣  Pagamento Confirmado
    Pagamento aprovado, pedido liberado para produção

3️⃣  Aguardando Escolha (apenas assinaturas)
    Cliente precisa escolher personagem do mês

4️⃣  Preparação do Modelo
    Conferência de arquivos e ajustes no modelo 3D

5️⃣  Em Impressão 3D
    Estatueta sendo impressa camada por camada

6️⃣  Limpeza e Preparação
    Remoção de suportes e lixamento da peça

7️⃣  Pintura Artesanal
    Aplicação de cores e detalhes à mão

8️⃣  Controle de Qualidade
    Inspeção final e fotos da peça

9️⃣  Embalagem
    Caixa premium MDF + certificado de autenticidade

🔟  Pronto para Envio
    Aguardando coleta da transportadora

1️⃣1️⃣ Enviado
    Despachado com código de rastreamento

1️⃣2️⃣ Entregue
    Cliente recebeu o pedido
```

## Implementação Técnica

### Tipo TypeScript

```typescript
type ProductionStage = 
  | 'awaiting_payment'        // 1. Aguardando Pagamento
  | 'payment_confirmed'       // 2. Pagamento Confirmado
  | 'awaiting_choice'         // 3. Aguardando Escolha (assinaturas)
  | 'model_preparation'       // 4. Preparação do Modelo
  | 'printing'                // 5. Em Impressão 3D
  | 'post_processing'         // 6. Limpeza e Preparação
  | 'painting'                // 7. Pintura Artesanal
  | 'quality_check'           // 8. Controle de Qualidade
  | 'packaging'               // 9. Embalagem
  | 'ready_to_ship'           // 10. Pronto para Envio
  | 'shipped'                 // 11. Enviado
  | 'delivered';              // 12. Entregue
```

### Labels para Interface

```typescript
const STAGE_LABELS: Record<ProductionStage, string> = {
  awaiting_payment: 'Aguardando Pagamento',
  payment_confirmed: 'Pagamento Confirmado',
  awaiting_choice: 'Aguardando Escolha',
  model_preparation: 'Preparação do Modelo',
  printing: 'Em Impressão 3D',
  post_processing: 'Limpeza e Preparação',
  painting: 'Pintura Artesanal',
  quality_check: 'Controle de Qualidade',
  packaging: 'Embalagem',
  ready_to_ship: 'Pronto para Envio',
  shipped: 'Enviado',
  delivered: 'Entregue',
};
```

### Descrições Detalhadas

```typescript
const STAGE_DESCRIPTIONS: Record<ProductionStage, string> = {
  awaiting_payment: 'Pedido criado, aguardando confirmação de pagamento',
  payment_confirmed: 'Pagamento aprovado, pedido liberado para produção',
  awaiting_choice: 'Cliente precisa escolher personagem do mês',
  model_preparation: 'Conferência de arquivos e ajustes no modelo 3D',
  printing: 'Estatueta sendo impressa camada por camada',
  post_processing: 'Remoção de suportes e lixamento da peça',
  painting: 'Aplicação de cores e detalhes à mão',
  quality_check: 'Inspeção final e fotos da peça',
  packaging: 'Caixa premium MDF + certificado de autenticidade',
  ready_to_ship: 'Aguardando coleta da transportadora',
  shipped: 'Despachado com código de rastreamento',
  delivered: 'Cliente recebeu o pedido',
};
```

### Ícones para Interface

```typescript
const STAGE_ICONS: Record<ProductionStage, string> = {
  awaiting_payment: '💳',
  payment_confirmed: '✅',
  awaiting_choice: '🎭',
  model_preparation: '📐',
  printing: '🖨️',
  post_processing: '🔧',
  painting: '🎨',
  quality_check: '🔍',
  packaging: '📦',
  ready_to_ship: '📮',
  shipped: '🚚',
  delivered: '🏠',
};
```

## Notificações ao Cliente

### Marcos Importantes (enviar notificação)

```typescript
const NOTIFICATION_STAGES: ProductionStage[] = [
  'payment_confirmed',    // ✅ Pagamento aprovado
  'printing',            // ✅ Impressão iniciada
  'painting',            // ✅ Pintura iniciada (com fotos)
  'quality_check',       // ✅ Controle de qualidade (com fotos finais)
  'shipped',             // ✅ Enviado (com rastreamento)
  'delivered',           // ✅ Entregue
];
```

### Estágios Silenciosos (não notificar)

```typescript
const SILENT_STAGES: ProductionStage[] = [
  'awaiting_payment',
  'awaiting_choice',
  'model_preparation',
  'post_processing',
  'packaging',
  'ready_to_ship',
];
```

## Regras de Transição

### Fluxo Normal

```
awaiting_payment 
  → payment_confirmed 
  → awaiting_choice (se assinatura) 
  → model_preparation 
  → printing 
  → post_processing 
  → painting 
  → quality_check 
  → packaging 
  → ready_to_ship 
  → shipped 
  → delivered
```

### Fluxo para Compras Avulsas (pula escolha)

```
awaiting_payment 
  → payment_confirmed 
  → model_preparation 
  → printing 
  → post_processing 
  → painting 
  → quality_check 
  → packaging 
  → ready_to_ship 
  → shipped 
  → delivered
```

### Retrocesso Permitido

```
quality_check → painting (se reprovado)
quality_check → post_processing (se defeito estrutural)
```

## Migration SQL

```sql
-- Atualizar constraint de current_stage
ALTER TABLE production_queue 
DROP CONSTRAINT IF EXISTS production_queue_current_stage_check;

ALTER TABLE production_queue 
ADD CONSTRAINT production_queue_current_stage_check 
CHECK (current_stage IN (
  'awaiting_payment',
  'payment_confirmed',
  'awaiting_choice',
  'model_preparation',
  'printing',
  'post_processing',
  'painting',
  'quality_check',
  'packaging',
  'ready_to_ship',
  'shipped',
  'delivered'
));

-- Migrar dados existentes
UPDATE production_queue 
SET current_stage = CASE current_stage
  WHEN 'design' THEN 'model_preparation'
  WHEN 'production' THEN 'printing'
  -- Manter os que já existem
  ELSE current_stage
END;
```

## Arquivos a Modificar

### 1. Tipos
- `src/services/admin/production-service.ts`
- `src/types/production.ts`

### 2. Serviços
- `src/services/admin/stage-service.ts`
- `src/services/notifications/production-notification-service.ts`

### 3. Componentes
- `src/components/admin/production/StageIndicator.tsx`
- `src/components/customer/OrderProgress.tsx`

### 4. Migrations
- `supabase/migrations/YYYYMMDD_update_production_stages.sql`

## Visualização para Cliente

```
┌─────────────────────────────────────┐
│  Seu Pedido: Monkey D. Luffy        │
├─────────────────────────────────────┤
│                                     │
│  ✅ Pagamento Confirmado            │
│  ✅ Preparação do Modelo            │
│  ✅ Em Impressão 3D                 │
│  🔄 Pintura Artesanal               │
│     (em andamento)                  │
│  ⏳ Controle de Qualidade           │
│  ⏳ Embalagem                        │
│  ⏳ Enviado                          │
│                                     │
└─────────────────────────────────────┘
```

## Próximos Passos

1. ✅ Criar migration para atualizar constraint
2. ✅ Atualizar tipos TypeScript
3. ✅ Atualizar labels e descrições
4. ✅ Atualizar componentes de visualização
5. ✅ Atualizar lógica de notificações
6. ✅ Testar transições de estágio
7. ✅ Migrar dados existentes

## Observações

- ❌ Sem previsões de tempo (prazos já definidos no projeto)
- ✅ Notificações apenas em marcos importantes
- ✅ Fluxo diferente para assinaturas vs compras avulsas
- ✅ Possibilidade de retrocesso em caso de reprovação
- ✅ Ícones e emojis para melhor visualização
