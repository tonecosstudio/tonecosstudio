# Análise do Sistema SSOT (Single Source of Truth)

## ✅ Status: IMPLEMENTADO E FUNCIONAL

O projeto possui um sistema SSOT bem estruturado e implementado.

---

## O que é SSOT?

SSOT (Single Source of Truth) significa que todas as informações críticas do sistema vêm de uma única fonte centralizada - o banco de dados `system_settings`. Isso garante:

- ✅ Consistência: Todos os componentes mostram os mesmos valores
- ✅ Manutenibilidade: Atualizar em um lugar atualiza em todo o sistema
- ✅ Confiabilidade: Sem valores hardcoded espalhados pelo código
- ✅ Rastreabilidade: Histórico de mudanças no banco de dados

---

## Arquitetura do SSOT

### 1. Fonte de Dados: `system_settings` (Supabase)

Tabela central que armazena todas as configurações:

```sql
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Services Layer

Dois serviços principais centralizam o acesso aos dados:

#### `src/lib/services/pricingService.ts`
**Responsabilidade:** Preços, taxas e limites de produção

```typescript
export interface PricingSettings {
  defaultPriceFull: number;
  defaultPricePix: number;
  defaultDepositAmount: number;
  pixDiscountPercentage: number;
  monthlyProductionLimit: number;
  salesOpenDay: number;
  currentMonthLimit?: number;
  currentMonthSold?: number;
  currentMonthAvailable?: number;
}
```

**Features:**
- Cache em memória (5 minutos)
- Fallback para valores padrão
- Função `clearPricingCache()` para invalidar cache
- Cálculos automáticos de preços PIX e taxas Mercado Pago

#### `src/lib/services/contentService.ts`
**Responsabilidade:** Textos, políticas, prazos e cronogramas

```typescript
export interface ContentSettings {
  // Prazos
  productionDaysMin: number;
  productionDaysMax: number;
  shippingDays: number;
  
  // Lote Atual
  currentBatchName: string;
  currentBatchSalesStart: Date;
  currentBatchSalesEnd: Date;
  currentBatchProductionStart: Date;
  currentBatchProductionEnd: Date;
  
  // Novo Modelo de Ciclos (v2.0)
  currentCycleType: CycleType;
  cycle1SalesStart: Date;
  cycle2SalesStart: Date;
  
  // Políticas
  exchangePolicyText: string;
  cancellationPolicyText: string;
  refundPolicyText: string;
  
  // FAQ
  faqFirstDelivery: string;
  faqExchange: string;
}
```

**Features:**
- Cache em memória (5 minutos)
- Processamento de variáveis em templates: `{{variable}}`
- Formatação automática de datas
- Suporte a modelo recorrente mensal (2 ciclos)

### 3. React Hooks

Facilitam o uso nos componentes:

#### `src/hooks/usePricingSettings.ts`
```typescript
export function usePricingSettings() {
  return useQuery({
    queryKey: ['pricing-settings'],
    queryFn: fetchPricingSettings,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
```

#### `src/hooks/useContentSettings.ts`
```typescript
export function useContentSettings() {
  return useQuery({
    queryKey: ['content-settings'],
    queryFn: fetchContentSettings,
    staleTime: 5 * 60 * 1000,
  });
}
```

---

## Onde o SSOT é Usado

### ✅ Páginas que Usam SSOT

1. **Collections.tsx** - Busca planos de assinatura do banco
2. **AdminContentSettings.tsx** - Interface de gerenciamento do SSOT
3. **DynamicFAQ.tsx** - FAQ dinâmico com dados do SSOT
4. **Templates de Mensagens** - Sistema de variáveis automáticas

### ✅ Componentes que Usam SSOT

- `CycleManagement` - Gerenciamento de ciclos mensais
- `ProductionMetricsBar` - Métricas de produção
- `PricingDisplay` - Exibição de preços
- Quick Replies - Templates com variáveis SSOT

---

## Variáveis Disponíveis no SSOT

### Preços
- `{{PRECO_PADRAO}}` - Preço padrão (R$ 500)
- `{{PRECO_PIX}}` - Preço com desconto PIX (R$ 475)
- `{{DESCONTO_PIX}}` - Percentual de desconto (5%)
- `{{VALOR_ENTRADA}}` - Valor da entrada (R$ 100)

### Produção
- `{{LIMITE_MENSAL}}` - Limite de produção mensal (20)
- `{{VAGAS_DISPONIVEIS}}` - Vagas disponíveis no mês
- `{{PERCENTUAL_VENDIDO}}` - % do limite já vendido

### Cronograma
- `{{LOTE_ATUAL}}` - Nome do lote (ex: "Fevereiro/Março")
- `{{VENDAS_INICIO}}` - Data início vendas
- `{{VENDAS_FIM}}` - Data fim vendas
- `{{PRODUCAO_INICIO}}` - Data início produção
- `{{PRODUCAO_FIM}}` - Data fim produção
- `{{MES_ENVIO}}` - Mês de envio
- `{{PRAZO_ENVIO}}` - Prazo de envio (5º dia útil)

### Políticas
- `{{PRAZO_TROCA}}` - Prazo para trocas (1 dia)
- `{{TEMPO_RESPOSTA}}` - Tempo de resposta suporte (48h)
- `{{POLITICA_TROCA}}` - Texto da política de trocas
- `{{POLITICA_CANCELAMENTO}}` - Texto da política de cancelamento

---

## Página de Gerenciamento: AdminContentSettings

Localização: `src/pages/admin/AdminContentSettings.tsx`

**Interface de administração com 4 abas:**

1. **Cronograma** - Gerenciar datas de vendas, produção e envio
2. **Políticas** - Editar textos de políticas e prazos
3. **FAQ** - Atualizar respostas do FAQ
4. **Documentos** - Datas de atualização de termos e privacidade

**Features:**
- Edição inline com preview
- Validação de campos
- Salvamento em lote
- Indicador de alterações não salvas
- Sistema de cache automático

---

## Migrações SSOT

### `20260222093000_add_ssot_templates.sql`
Adiciona templates de quick replies com variáveis SSOT:
- Template de preços atualizados
- Template de vagas disponíveis
- Template completo de pedido

### `20260224060000_automatic_groups_system.sql`
Sistema de grupos automáticos baseado em SSOT

---

## Scripts de Deployment

### `scripts/deployment/aplicar-ssot-completo.bat`
Aplica todas as migrações SSOT de uma vez

### `scripts/deployment/aplicar-templates-ssot.bat`
Aplica apenas os templates com variáveis SSOT

---

## Modelo Operacional: Recorrente Mensal (v2.0)

O SSOT suporta o novo modelo de 2 ciclos por mês:

### Ciclo 1 (Dias 1-15)
- Vendas: 1-15 do mês
- Produção: 16-31 do mês
- Envio: Até 7º dia útil do mês seguinte

### Ciclo 2 (Dias 16-31)
- Vendas: 16-31 do mês
- Produção: 1-30 do mês seguinte
- Envio: Até 7º dia útil do mês seguinte ao da produção

**Configurações no SSOT:**
```typescript
currentCycleType: "cycle1" | "cycle2"
currentCycleMonth: number
currentCycleYear: number

cycle1SalesStart: Date
cycle1SalesEnd: Date
cycle1ProductionStart: Date
cycle1ProductionEnd: Date
cycle1ShippingDeadline: Date

cycle2SalesStart: Date
cycle2SalesEnd: Date
cycle2ProductionStart: Date
cycle2ProductionEnd: Date
cycle2ShippingDeadline: Date
```

---

## Alinhamento das Informações

### ✅ Bem Alinhado

1. **Preços** - Todos os componentes usam `pricingService`
2. **Cronograma** - Centralizado em `contentService`
3. **Políticas** - Texto único no banco de dados
4. **FAQ** - Dinâmico via `DynamicFAQ` component
5. **Templates** - Sistema de variáveis automáticas

### ⚠️ Áreas de Atenção

1. **Taxas Mercado Pago** - Hardcoded em `pricingService.ts`
   - Justificativa: Taxas são fixas e definidas pelo Mercado Pago
   - Recomendação: Manter assim, mas documentar

2. **Alguns TODOs** - Funcionalidades pendentes
   - Ver `docs/admin-architecture-review.md` para lista completa

3. **Cache Manual** - Requer invalidação manual após updates
   - Solução: Hooks React Query já fazem isso automaticamente
   - Melhoria futura: Webhook para invalidar cache em tempo real

---

## Fluxo de Atualização

### Como Atualizar Configurações

1. **Via Interface Admin:**
   ```
   /admin/configuracoes → Aba "Conteúdo (SSOT)"
   ```

2. **Via SQL Direto:**
   ```sql
   UPDATE system_settings 
   SET value = '550', updated_at = NOW()
   WHERE key = 'default_price_full';
   ```

3. **Invalidação de Cache:**
   - Automática via React Query (5 minutos)
   - Manual via `clearPricingCache()` ou `clearContentCache()`

### Propagação das Mudanças

```
Admin atualiza → system_settings → Cache invalidado → 
Componentes re-fetch → UI atualizada
```

**Tempo de propagação:** Até 5 minutos (tempo do cache)

---

## Documentação Relacionada

### Arquivos de Documentação SSOT

1. `docs-archive/summaries/INDICE_SSOT.md` - Índice completo
2. `docs-archive/summaries/GUIA_ADMIN_SSOT.md` - Guia para admins
3. `docs-archive/summaries/CORRECOES_SSOT_IMPLEMENTADAS.md` - Implementação técnica
4. `docs-archive/summaries/RESUMO_CORRECOES_SSOT.md` - Resumo executivo
5. `docs-archive/summaries/MODELO_OPERACIONAL_RECORRENTE.md` - Novo modelo v2.0

---

## Testes

### Script de Teste
`scripts/testing/testar-templates-inteligentes.bat`

Testa:
- Variáveis de cliente
- Variáveis de assinatura
- Variáveis de preços (SSOT)
- Variáveis de cronograma (SSOT)

---

## Vantagens do SSOT Implementado

### Para Desenvolvedores
- ✅ Código mais limpo (sem valores hardcoded)
- ✅ Fácil manutenção (um lugar para atualizar)
- ✅ Type-safe com TypeScript
- ✅ Cache automático para performance

### Para Administradores
- ✅ Interface visual para atualizar configurações
- ✅ Não precisa mexer no código
- ✅ Mudanças refletem em todo o sistema
- ✅ Histórico de alterações no banco

### Para Usuários
- ✅ Informações sempre consistentes
- ✅ Dados sempre atualizados
- ✅ Sem contradições entre páginas
- ✅ Melhor experiência geral

---

## Recomendações

### ✅ Mantido Corretamente
O sistema SSOT está bem implementado e sendo usado corretamente.

### 🔄 Melhorias Futuras

1. **Webhook de Invalidação**
   - Invalidar cache imediatamente após update
   - Reduzir tempo de propagação de 5min para instantâneo

2. **Versionamento de Configurações**
   - Histórico de mudanças com rollback
   - Auditoria de quem mudou o quê

3. **Validação de Valores**
   - Regras de negócio no banco (CHECK constraints)
   - Validação antes de salvar na interface

4. **Preview de Mudanças**
   - Mostrar como ficará antes de salvar
   - Simulação de templates com novos valores

5. **Testes Automatizados**
   - Unit tests para services
   - Integration tests para fluxo completo

---

## Conclusão

### ✅ SSOT está IMPLEMENTADO e FUNCIONAL

O projeto possui um sistema SSOT robusto e bem estruturado:

- ✅ Centralização de dados em `system_settings`
- ✅ Services layer bem definido
- ✅ React hooks para fácil uso
- ✅ Interface admin para gerenciamento
- ✅ Sistema de cache para performance
- ✅ Suporte a modelo recorrente mensal
- ✅ Documentação completa

**As informações estão alinhadas** e o sistema garante consistência em todo o projeto.

**Não há gambiarras** no SSOT - está implementado profissionalmente seguindo boas práticas.
