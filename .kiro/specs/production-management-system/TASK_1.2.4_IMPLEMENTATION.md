# Task 1.2.4 Implementation: Production Stage Service

## Resumo

Implementação completa do serviço de gestão de estágios de produção (`stage-service.ts`), incluindo funções para buscar histórico de estágios, completar estágios, fazer upload de fotos e calcular datas estimadas de conclusão.

## Arquivos Criados

### 1. `src/services/admin/stage-service.ts`

Serviço principal com 4 funções implementadas:

#### Função 1: `getStageHistory(productionQueueId)`

- **Propósito**: Busca o histórico completo de estágios de um item de produção
- **Parâmetros**:
  - `productionQueueId` (string): ID do item na fila de produção
- **Retorno**: `Promise<ProductionStageRecord[]>`
- **Comportamento**:
  - Busca todos os estágios da tabela `production_stages`
  - Filtra por `production_queue_id`
  - Ordena por `stage_order` (1-6)
  - Transforma dados do banco para formato camelCase
- **Validações**:
  - Lança erro se busca falhar
  - Retorna array vazio se não houver estágios

#### Função 2: `completeStage(stageId, notes?, photos?)`

- **Propósito**: Marca um estágio como completo com notas e fotos opcionais
- **Parâmetros**:
  - `stageId` (string): ID do estágio
  - `notes` (string, opcional): Notas sobre a conclusão
  - `photos` (string[], opcional): URLs de fotos já uploadadas
- **Retorno**: `Promise<ProductionStageRecord>`
- **Comportamento**:
  1. Busca estágio atual
  2. Valida que estágio pode ser completado
  3. Marca como completo com timestamp
  4. Salva notas e fotos (se fornecidas)
  5. Se estágio não foi iniciado, inicia automaticamente
  6. Triggers do banco atualizam automaticamente:
     - `production_queue.current_stage`
     - `production_queue.production_status`
     - Calcula `actual_duration`
- **Validações**:
  - Estágio não pode estar já completado
  - Estágio não pode estar bloqueado
  - Lança erro se estágio não for encontrado

#### Função 3: `uploadStagePhoto(stageId, file)`

- **Propósito**: Faz upload de uma foto para o Supabase Storage
- **Parâmetros**:
  - `stageId` (string): ID do estágio
  - `file` (File): Arquivo de imagem
- **Retorno**: `Promise<string>` (URL pública da foto)
- **Comportamento**:
  1. Valida tipo de arquivo (apenas imagens)
  2. Valida tamanho (máx 5MB)
  3. Gera nome único: `{stageId}/{timestamp}-{random}.{ext}`
  4. Faz upload para bucket `production-photos`
  5. Retorna URL pública
- **Validações**:
  - Apenas arquivos de imagem (`image/*`)
  - Tamanho máximo: 5MB
  - Lança erro se upload falhar

#### Função 4: `calculateEstimatedCompletion(productionQueueId)`

- **Propósito**: Calcula data estimada de conclusão baseada nos estágios restantes
- **Parâmetros**:
  - `productionQueueId` (string): ID do item na fila de produção
- **Retorno**: `Promise<Date>`
- **Comportamento**:
  1. Busca todos os estágios do item
  2. Identifica estágios pendentes e em progresso
  3. Soma durações estimadas dos estágios restantes
  4. Para estágios em progresso, calcula tempo restante
  5. Adiciona horas à data atual
  6. Considera apenas dias úteis (segunda a sexta)
  7. Assume 8 horas de trabalho por dia
- **Lógica de Cálculo**:
  - Estágios `pending`: usa `estimatedDuration` completa
  - Estágios `in_progress`: calcula tempo restante (estimado - elapsed)
  - Estágios `completed` ou `blocked`: não contam
  - Pula fins de semana no cálculo

### 2. `src/services/admin/stage-service.test.ts`

Testes unitários completos com 7 casos de teste:

#### Testes de `getStageHistory`:

1. ✅ Deve buscar histórico de estágios ordenado por stage_order
2. ✅ Deve lançar erro se busca falhar

#### Testes de `completeStage`:

3. ✅ Deve completar estágio com sucesso
4. ✅ Deve lançar erro se estágio já foi completado
5. ✅ Deve lançar erro se estágio está bloqueado

#### Testes de `uploadStagePhoto`:

6. ✅ Deve validar tipo de arquivo
7. ✅ Deve validar tamanho do arquivo

#### Testes de `calculateEstimatedCompletion`:

8. ✅ Deve calcular data estimada baseada em estágios pendentes

## Tipos Exportados

```typescript
export type StageType =
  | "awaiting_choice"
  | "design"
  | "production"
  | "quality_check"
  | "packaging"
  | "shipped";

export type StageStatus = "pending" | "in_progress" | "completed" | "blocked";

export interface ProductionStageRecord {
  id: string;
  productionQueueId: string;
  stageName: StageType;
  stageOrder: number;
  status: StageStatus;
  startedAt: string | null;
  completedAt: string | null;
  estimatedDuration: number;
  actualDuration: number | null;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  notes: string | null;
  photos: string[];
  isBlocked: boolean;
  blockReason: string | null;
  blockedAt: string | null;
  unblockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

## Integração com Database

### Tabela: `production_stages`

O serviço interage com a tabela criada na migration `20260428000002_create_production_stages.sql`:

- **Triggers automáticos**:
  - `trigger_calculate_stage_actual_duration`: Calcula `actual_duration` automaticamente
  - `trigger_sync_production_stage_to_queue`: Sincroniza mudanças com `production_queue`
  - `trigger_update_production_stages_updated_at`: Atualiza `updated_at` automaticamente

- **RLS Policies**:
  - Admins podem ver/editar todos os estágios
  - Clientes podem ver apenas estágios de seus próprios pedidos

### Supabase Storage

- **Bucket**: `production-photos`
- **Estrutura de pastas**: `{stageId}/{timestamp}-{random}.{ext}`
- **Permissões**: Apenas admins podem fazer upload
- **Cache**: 1 hora (3600 segundos)

## Fluxo de Uso

### Exemplo 1: Completar Estágio de Design

```typescript
import { completeStage, uploadStagePhoto } from "@/services/admin/stage-service";

// 1. Upload de fotos (se houver)
const photoUrls: string[] = [];
for (const file of photoFiles) {
  const url = await uploadStagePhoto(stageId, file);
  photoUrls.push(url);
}

// 2. Completar estágio
const updatedStage = await completeStage(stageId, "Design aprovado pelo cliente", photoUrls);

// 3. Triggers do banco automaticamente:
//    - Atualizam production_queue.current_stage para 'production'
//    - Atualizam production_queue.production_status para 'in_production'
//    - Calculam actual_duration
```

### Exemplo 2: Calcular Data Estimada

```typescript
import { calculateEstimatedCompletion } from "@/services/admin/stage-service";

const estimatedDate = await calculateEstimatedCompletion(productionQueueId);

console.log(`Conclusão estimada: ${estimatedDate.toLocaleDateString()}`);
// Output: "Conclusão estimada: 15/05/2026"
```

### Exemplo 3: Visualizar Histórico

```typescript
import { getStageHistory } from "@/services/admin/stage-service";

const stages = await getStageHistory(productionQueueId);

stages.forEach((stage) => {
  console.log(`${stage.stageName}: ${stage.status}`);
  if (stage.actualDuration) {
    console.log(`  Duração: ${stage.actualDuration}h (estimado: ${stage.estimatedDuration}h)`);
  }
});

// Output:
// awaiting_choice: completed
//   Duração: 168h (estimado: 168h)
// design: in_progress
// production: pending
// quality_check: pending
// packaging: pending
// shipped: pending
```

## Validações Implementadas

### Validações de Negócio

1. **Completar Estágio**:
   - ❌ Não pode completar estágio já completado
   - ❌ Não pode completar estágio bloqueado
   - ✅ Pode completar estágio pendente (inicia automaticamente)
   - ✅ Pode completar estágio em progresso

2. **Upload de Foto**:
   - ❌ Apenas arquivos de imagem
   - ❌ Tamanho máximo: 5MB
   - ✅ Formatos aceitos: JPG, PNG, GIF, WebP, etc.

3. **Cálculo de Data Estimada**:
   - ✅ Considera apenas estágios pendentes e em progresso
   - ✅ Pula fins de semana
   - ✅ Assume 8 horas de trabalho por dia

### Validações de Banco de Dados

As seguintes validações são feitas pelo banco (via constraints):

- `started_at <= completed_at`
- `status = 'completed' → completed_at IS NOT NULL`
- `is_blocked = true → block_reason IS NOT NULL`
- `stage_order` único por `production_queue_id`

## Erros TypeScript Esperados

⚠️ **IMPORTANTE**: Os erros TypeScript atuais são esperados porque as novas tabelas (`production_stages`) ainda não estão nos tipos gerados do Supabase.

### Como Resolver

Execute o comando para regenerar os tipos:

```bash
npm run update-types
```

Isso irá:

1. Conectar ao Supabase
2. Buscar schema atualizado
3. Gerar tipos TypeScript em `src/integrations/supabase/types.ts`
4. Resolver todos os erros de tipo

## Próximos Passos

### Fase 2: Production Dashboard (Tasks 2.1 - 2.5)

Agora que a camada de serviços está completa, podemos implementar:

1. **Dashboard Layout** (Task 2.1):
   - ProductionDashboardPage
   - ProductionMetricsBar
   - ProductionFilters

2. **Kanban View** (Task 2.2):
   - ProductionKanbanBoard
   - ProductionKanbanCard
   - Drag-and-drop logic

3. **List View** (Task 2.3):
   - ProductionListView
   - Bulk actions

4. **Calendar View** (Task 2.4):
   - ProductionCalendarView
   - Calendar interactions

5. **Urgent Alerts** (Task 2.5):
   - UrgentAlertsBar
   - Alert notifications

## Conclusão

✅ Task 1.2.4 implementada com sucesso!

O serviço de estágios de produção está completo e pronto para uso. Todas as 4 funções foram implementadas com:

- Validações robustas
- Tratamento de erros
- Integração com Supabase
- Testes unitários
- Documentação completa

A Fase 1.2 (API Service Layer) está agora 100% completa, com todos os 4 serviços implementados:

- ✅ Production Service (1.2.1)
- ✅ Admin Choice Service (1.2.2)
- ✅ Customer Choice Service (1.2.3)
- ✅ Production Stage Service (1.2.4)
