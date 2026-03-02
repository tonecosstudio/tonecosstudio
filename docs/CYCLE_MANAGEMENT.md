# Gestão de Ciclos de Produção

## Visão Geral

A gestão de ciclos de produção foi simplificada. Ao invés de uma interface complexa, os ciclos são gerenciados através de:

1. **Configuração de datas no banco de dados** (tabela `cycles`)
2. **Jobs automáticos** que gerenciam transições de status
3. **APIs para consulta** de informações dos ciclos

## Estrutura da Tabela `cycles`

```sql
CREATE TABLE cycles (
  id UUID PRIMARY KEY,
  cycle_number INTEGER NOT NULL, -- 1 ou 2
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  open_start TIMESTAMP NOT NULL,
  open_end TIMESTAMP NOT NULL,
  production_start TIMESTAMP NOT NULL,
  production_end TIMESTAMP NOT NULL,
  shipping_date DATE NOT NULL,
  status TEXT NOT NULL, -- 'open', 'production', 'shipping', 'completed'
  status_changed_at TIMESTAMP,
  capacity_max INTEGER NOT NULL,
  capacity_current INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Fluxo de Status

```
open → production → shipping → completed
```

### Transições Automáticas

Os jobs automáticos devem gerenciar as transições:

1. **open → production**: Quando `open_end` é atingido
2. **production → shipping**: Quando `production_end` é atingido
3. **shipping → completed**: Quando todas as entregas são marcadas como enviadas

## Configuração de Novos Ciclos

### Via SQL (Recomendado)

```sql
-- Criar ciclos para um mês
INSERT INTO cycles (
  id,
  cycle_number,
  month,
  year,
  open_start,
  open_end,
  production_start,
  production_end,
  shipping_date,
  status,
  capacity_max
) VALUES
-- Ciclo 1
(
  gen_random_uuid(),
  1,
  3, -- Março
  2026,
  '2026-03-01 00:00:00',
  '2026-03-10 23:59:59',
  '2026-03-11 00:00:00',
  '2026-03-20 23:59:59',
  '2026-03-25',
  'open',
  500
),
-- Ciclo 2
(
  gen_random_uuid(),
  2,
  3, -- Março
  2026,
  '2026-03-16 00:00:00',
  '2026-03-25 23:59:59',
  '2026-03-26 00:00:00',
  '2026-03-31 23:59:59',
  '2026-04-05',
  'open',
  500
);
```

### Via API (Futuro)

Criar endpoint admin para configuração de ciclos:

```typescript
POST /api/admin/cycles
{
  "cycle_number": 1,
  "month": 3,
  "year": 2026,
  "open_start": "2026-03-01T00:00:00Z",
  "open_end": "2026-03-10T23:59:59Z",
  "production_start": "2026-03-11T00:00:00Z",
  "production_end": "2026-03-20T23:59:59Z",
  "shipping_date": "2026-03-25",
  "capacity_max": 500
}
```

## Consulta de Informações

### Ciclo Atual

```sql
SELECT * FROM cycles
WHERE status = 'open'
  AND open_start <= NOW()
  AND open_end >= NOW()
ORDER BY cycle_number;
```

### Capacidade Disponível

```sql
SELECT 
  id,
  cycle_number,
  capacity_max,
  capacity_current,
  (capacity_max - capacity_current) as capacity_available,
  ROUND((capacity_current::DECIMAL / capacity_max) * 100, 2) as capacity_percentage
FROM cycles
WHERE status = 'open';
```

### Distribuição por Coleção

```sql
SELECT 
  c.name as collection_name,
  COUNT(sd.id) as delivery_count,
  COUNT(sp.id) as purchase_count,
  COUNT(sd.id) + COUNT(sp.id) as total_count
FROM cycles cy
LEFT JOIN subscription_deliveries sd ON sd.cycle_id = cy.id
LEFT JOIN standalone_purchases sp ON sp.cycle_id = cy.id
LEFT JOIN collections c ON c.id = COALESCE(sd.collection_id, sp.collection_id)
WHERE cy.id = 'CYCLE_ID'
GROUP BY c.name
ORDER BY total_count DESC;
```

## Jobs Necessários

### 1. Transição Automática de Status

```typescript
// Executar a cada hora
async function updateCycleStatuses() {
  const now = new Date();
  
  // open → production
  await supabase
    .from('cycles')
    .update({ 
      status: 'production',
      status_changed_at: now.toISOString()
    })
    .eq('status', 'open')
    .lte('open_end', now.toISOString());
  
  // production → shipping
  await supabase
    .from('cycles')
    .update({ 
      status: 'shipping',
      status_changed_at: now.toISOString()
    })
    .eq('status', 'production')
    .lte('production_end', now.toISOString());
}
```

### 2. Atualização de Capacidade

```typescript
// Executar quando há nova compra/entrega
async function updateCycleCapacity(cycleId: string) {
  const { data: deliveries } = await supabase
    .from('subscription_deliveries')
    .select('id')
    .eq('cycle_id', cycleId)
    .not('collection_id', 'is', null);
  
  const { data: purchases } = await supabase
    .from('standalone_purchases')
    .select('id')
    .eq('cycle_id', cycleId)
    .not('status', 'eq', 'cancelled');
  
  const total = (deliveries?.length || 0) + (purchases?.length || 0);
  
  await supabase
    .from('cycles')
    .update({ capacity_current: total })
    .eq('id', cycleId);
}
```

## Relatórios

Para relatórios e análises, usar queries SQL diretas ou criar views:

```sql
CREATE VIEW cycle_summary AS
SELECT 
  cy.id,
  cy.cycle_number,
  cy.month,
  cy.year,
  cy.status,
  cy.capacity_max,
  cy.capacity_current,
  COUNT(DISTINCT sd.id) as delivery_count,
  COUNT(DISTINCT sp.id) as purchase_count,
  COUNT(DISTINCT sd.id) + COUNT(DISTINCT sp.id) as total_pieces
FROM cycles cy
LEFT JOIN subscription_deliveries sd ON sd.cycle_id = cy.id
LEFT JOIN standalone_purchases sp ON sp.cycle_id = cy.id AND sp.status != 'cancelled'
GROUP BY cy.id, cy.cycle_number, cy.month, cy.year, cy.status, cy.capacity_max, cy.capacity_current;
```

## Migração do Sistema Antigo

O sistema antigo (`/admin/ciclos`) foi removido porque:

1. **Complexidade desnecessária**: Interface pesada para algo que é apenas configuração de datas
2. **Automação**: Transições de status devem ser automáticas via jobs
3. **Simplicidade**: Configuração via SQL ou API é mais direta e auditável
4. **Manutenibilidade**: Menos código para manter

## Próximos Passos

1. Criar job para transição automática de status
2. Criar job para atualização de capacidade
3. Criar endpoint admin para configuração de ciclos (opcional)
4. Criar views para relatórios
5. Documentar processo de criação de ciclos mensais
