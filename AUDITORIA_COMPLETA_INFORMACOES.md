# 🔍 Auditoria Completa de Informações - Projeto Ordax

## 📊 RESUMO EXECUTIVO

Encontradas **MÚLTIPLAS DIVERGÊNCIAS** em informações críticas espalhadas por todo o projeto:
- ❌ Prazos de produção (15-20 dias vs 15 dias)
- ❌ Cronogramas (15/02-15/03 hardcoded em 5+ lugares)
- ❌ Políticas de troca e cancelamento
- ❌ Prazos de resposta do suporte
- ❌ Datas de atualização de documentos
- ❌ Textos de FAQ duplicados

## 🚨 PROBLEMAS CRÍTICOS ENCONTRADOS

### 1. PRAZOS DE PRODUÇÃO (DIVERGENTES!)

#### Versão 1: "15-20 dias"
**Arquivo**: `src/pages/Terms.tsx`
```typescript
<strong>4.2 Prazo de Produção:</strong> Cada peça é artesanal e leva 
aproximadamente 15 dias para produção, mais o prazo de entrega.
```

#### Versão 2: "15 dias"
**Arquivos**: `src/pages/Plans.tsx`, `src/pages/Collections.tsx`, `src/pages/CollectionDetails.tsx`
```typescript
produção de 15 dias, e envio em até 5 dias úteis
```

**PROBLEMA**: Qual é o prazo correto? 15 ou 15-20 dias?

---

### 2. CRONOGRAMA HARDCODED (5+ LUGARES!)

#### Locais com "15/02-15/03" hardcoded:
1. **src/pages/Collections.tsx** (linha 103-105)
```typescript
<span>🔥 Lote Fevereiro/Março Aberto!</span>
Vendas: 15/02 a 15/03 • Produção: 16-30/03 • Envio: Até 5º dia útil de Abril
```

2. **src/pages/Plans.tsx** (linha 331-333)
```typescript
Exemplo: compra em 15/02-15/03, produção 16-30/03, envio até 5º dia útil de Abril.
```

3. **src/pages/CollectionDetails.tsx** (linha 753-755)
```typescript
Exemplo: compra em 15/02-15/03, produção 16-30/03, envio até 5º dia útil de Abril.
```

4. **src/pages/admin/AdminProductionLimit.tsx** (linha 303)
```typescript
Vendas também fecham após 30 dias (dia 15 a dia 15)
```

**PROBLEMA**: Datas específicas hardcoded que ficam desatualizadas!

---

### 3. POLÍTICAS DE TROCA (DIVERGENTES!)

#### Versão 1: "até 1 dia antes da produção"
**Arquivos**: `src/pages/Plans.tsx`, `src/pages/Collections.tsx`
```typescript
Você pode trocar suas coleções quantas vezes quiser, desde que seja 
até 1 dia antes da produção do próximo lote.
```

#### Versão 2: "ILIMITADAMENTE até o início da produção"
**Arquivo**: `src/pages/SubscribeCollection.tsx`
```typescript
Você poderá trocar ILIMITADAMENTE entre as coleções escolhidas 
até o início da produção.
```

**PROBLEMA**: Qual é a política correta? 1 dia antes ou até o início?

---

### 4. PRAZO DE RESPOSTA DO SUPORTE

**Arquivo**: `src/pages/Support.tsx` (linha 289)
```typescript
<strong>Prazo de resposta:</strong> Nossa equipe responde em até 48 horas úteis.
```

**PROBLEMA**: Hardcoded! Deveria estar em system_settings

---

### 5. DATAS DE ATUALIZAÇÃO DE DOCUMENTOS

#### Terms.tsx
```typescript
Última atualização: 03 de Fevereiro de 2026
```

#### Privacy.tsx
```typescript
Última atualização: 03 de Fevereiro de 2026
```

**PROBLEMA**: Datas hardcoded que precisam ser atualizadas manualmente

---

### 6. FAQ DUPLICADO (3+ LUGARES!)

Mesmas perguntas e respostas em:
- `src/pages/Collections.tsx`
- `src/pages/Plans.tsx`
- `src/pages/CollectionDetails.tsx`

**PROBLEMA**: Atualizar FAQ requer mudanças em múltiplos arquivos

---

## 🎯 SOLUÇÃO: EXPANDIR SYSTEM_SETTINGS

### Novas Configurações Necessárias

```sql
-- Prazos e Cronogramas
INSERT INTO system_settings (key, value, description) VALUES
('production_days_min', '15', 'Prazo mínimo de produção em dias'),
('production_days_max', '20', 'Prazo máximo de produção em dias'),
('shipping_days', '5', 'Prazo de envio em dias úteis'),
('sales_duration_days', '30', 'Duração do período de vendas'),

-- Políticas
('exchange_deadline_days', '1', 'Dias antes da produção para trocar coleção'),
('support_response_hours', '48', 'Prazo de resposta do suporte em horas'),
('refund_policy', 'no_refund_after_payment', 'Política de reembolso'),
('cancellation_policy', 'deliveries_continue', 'Política de cancelamento'),

-- Textos Dinâmicos
('current_batch_name', 'Fevereiro/Março', 'Nome do lote atual'),
('current_batch_sales_start', '2026-02-15', 'Início das vendas do lote'),
('current_batch_sales_end', '2026-03-15', 'Fim das vendas do lote'),
('current_batch_production_start', '2026-03-16', 'Início da produção'),
('current_batch_production_end', '2026-03-30', 'Fim da produção'),
('current_batch_shipping_month', 'Abril', 'Mês de envio'),

-- Documentos
('terms_last_update', '2026-02-03', 'Data da última atualização dos termos'),
('privacy_last_update', '2026-02-03', 'Data da última atualização da privacidade'),

-- FAQ
('faq_exchange_policy', 'Sim! Você pode trocar suas coleções quantas vezes quiser, desde que seja até {{exchange_deadline_days}} dia(s) antes da produção do próximo lote.', 'Resposta FAQ sobre trocas'),
('faq_first_delivery', 'Seguimos um cronograma mensal fixo: Vendas do dia {{sales_open_day}} ao dia {{sales_open_day}} ({{sales_duration_days}} dias), produção de {{production_days_min}} dias, e envio em até {{shipping_days}} dias úteis.', 'Resposta FAQ sobre primeira entrega'),
('faq_cancellation', 'Sim, você pode cancelar sua assinatura a qualquer momento. As peças já pagas serão entregues normalmente.', 'Resposta FAQ sobre cancelamento');
```

---

## 📝 ARQUIVOS QUE PRECISAM SER ATUALIZADOS

### PRIORIDADE CRÍTICA

#### 1. Collections.tsx
- [ ] Linha 103: Substituir "Lote Fevereiro/Março" por `{{current_batch_name}}`
- [ ] Linha 105: Substituir datas hardcoded por variáveis dinâmicas
- [ ] Linha 108: Manter texto genérico
- [ ] Linha 459-465: Usar FAQ do banco

#### 2. Plans.tsx
- [ ] Linha 331-333: Substituir exemplo hardcoded por variáveis
- [ ] FAQ completo: Buscar do banco

#### 3. CollectionDetails.tsx
- [ ] Linha 318: "Ciclo Mensal" OK (genérico)
- [ ] Linha 753-755: Substituir exemplo hardcoded

#### 4. Terms.tsx
- [ ] Linha 19: Usar `{{terms_last_update}}`
- [ ] Linha 71: Usar `{{production_days_min}}-{{production_days_max}}`

#### 5. Privacy.tsx
- [ ] Linha 19: Usar `{{privacy_last_update}}`

#### 6. Support.tsx
- [ ] Linha 289: Usar `{{support_response_hours}}`

#### 7. SubscribeCollection.tsx
- [ ] Linha 366: Padronizar política de troca

#### 8. BuyCharacter.tsx
- [ ] Linha 158: "ciclo atual" OK (genérico)
- [ ] Linha 292: "Ciclo Atual" OK (genérico)

### PRIORIDADE MÉDIA

#### 9. PreorderCheckout.tsx
- [ ] Linha 275: "Iniciamos a produção imediatamente" OK
- [ ] Linha 355: "Produção inicia imediatamente" OK

#### 10. ProfileSections.tsx
- [ ] Linha 348: "status de produção e entrega" OK
- [ ] Linha 444: "entregas" OK

### PRIORIDADE BAIXA

#### 11. QuoteCart.tsx
- [ ] Linha 164: Texto genérico OK
- [ ] Linha 260: Placeholder OK

#### 12. Quote.tsx
- [ ] Linha 235: "Prazo Desejado" OK
- [ ] Linha 302: "Produção artesanal" OK

---

## 🔧 SERVIÇO EXPANDIDO: contentService.ts

```typescript
/**
 * Content Service - SSOT para textos e políticas
 */

export interface ContentSettings {
  // Prazos
  productionDaysMin: number;
  productionDaysMax: number;
  shippingDays: number;
  salesDurationDays: number;
  
  // Políticas
  exchangeDeadlineDays: number;
  supportResponseHours: number;
  refundPolicy: string;
  cancellationPolicy: string;
  
  // Lote Atual
  currentBatchName: string;
  currentBatchSalesStart: Date;
  currentBatchSalesEnd: Date;
  currentBatchProductionStart: Date;
  currentBatchProductionEnd: Date;
  currentBatchShippingMonth: string;
  
  // Documentos
  termsLastUpdate: Date;
  privacyLastUpdate: Date;
  
  // FAQ
  faqExchangePolicy: string;
  faqFirstDelivery: string;
  faqCancellation: string;
}

export async function fetchContentSettings(): Promise<ContentSettings> {
  // Buscar de system_settings
  // Processar variáveis {{}} nos textos
  // Retornar objeto completo
}

export function processContentVariables(text: string, settings: ContentSettings): string {
  // Substituir {{variable}} por valores reais
}
```

---

## 🎨 COMPONENTES REUTILIZÁVEIS

### 1. BatchInfoBanner
```typescript
// Componente que mostra info do lote atual
// Busca dados de system_settings
// Usado em Collections, Plans, etc
<BatchInfoBanner />
```

### 2. FAQSection
```typescript
// Componente que renderiza FAQ
// Busca perguntas/respostas do banco
// Usado em Collections, Plans, CollectionDetails
<FAQSection category="subscriptions" />
```

### 3. PolicyText
```typescript
// Componente que mostra políticas
// Busca de system_settings
<PolicyText type="exchange" />
<PolicyText type="cancellation" />
<PolicyText type="refund" />
```

### 4. DeadlineText
```typescript
// Componente que mostra prazos
// Calcula dinamicamente
<DeadlineText type="production" />
<DeadlineText type="shipping" />
<DeadlineText type="support_response" />
```

---

## 📊 TABELA DE DIVERGÊNCIAS

| Informação | Locais Encontrados | Valores Diferentes | Prioridade |
|------------|-------------------|-------------------|------------|
| Prazo de produção | 4 arquivos | "15 dias" vs "15-20 dias" | 🔴 CRÍTICA |
| Cronograma do lote | 5 arquivos | "15/02-15/03" hardcoded | 🔴 CRÍTICA |
| Política de troca | 3 arquivos | "1 dia antes" vs "até início" | 🔴 CRÍTICA |
| Prazo suporte | 1 arquivo | "48 horas" hardcoded | 🟡 MÉDIA |
| FAQ | 3 arquivos | Textos duplicados | 🟡 MÉDIA |
| Datas de docs | 2 arquivos | "03/02/2026" hardcoded | 🟢 BAIXA |

---

## 🎯 PLANO DE IMPLEMENTAÇÃO

### Fase 1: Expandir system_settings ✅
- [ ] Criar migration com novas configurações
- [ ] Popular com valores atuais
- [ ] Testar queries

### Fase 2: Criar contentService.ts
- [ ] Implementar fetchContentSettings()
- [ ] Implementar processContentVariables()
- [ ] Criar hook useContentSettings()
- [ ] Adicionar cache

### Fase 3: Criar Componentes Reutilizáveis
- [ ] BatchInfoBanner
- [ ] FAQSection
- [ ] PolicyText
- [ ] DeadlineText

### Fase 4: Atualizar Páginas (Prioridade Crítica)
- [ ] Collections.tsx
- [ ] Plans.tsx
- [ ] CollectionDetails.tsx
- [ ] Terms.tsx
- [ ] Privacy.tsx

### Fase 5: Atualizar Páginas (Prioridade Média)
- [ ] Support.tsx
- [ ] SubscribeCollection.tsx
- [ ] Outras páginas

### Fase 6: Testes
- [ ] Testar mudança de lote
- [ ] Testar mudança de prazos
- [ ] Testar mudança de políticas
- [ ] Verificar consistência

---

## 🎉 BENEFÍCIOS ESPERADOS

### 1. Consistência Total
- ✅ Mesma informação em todos os lugares
- ✅ Zero divergências
- ✅ Atualização centralizada

### 2. Manutenção Simplificada
- ✅ Mudar lote: 1 UPDATE no banco
- ✅ Mudar prazo: 1 UPDATE no banco
- ✅ Atualizar FAQ: 1 UPDATE no banco

### 3. Escalabilidade
- ✅ Fácil adicionar novos lotes
- ✅ Fácil adicionar novas políticas
- ✅ Suporte a múltiplos idiomas (futuro)

### 4. Profissionalismo
- ✅ Informações sempre atualizadas
- ✅ Zero erros de comunicação
- ✅ Confiança do cliente

---

## 📈 EXEMPLO PRÁTICO

### Cenário: Mudar para Lote Março/Abril

**ANTES (sem SSOT)**:
```typescript
// Precisa alterar em 5+ arquivos manualmente
Collections.tsx: "Lote Fevereiro/Março" → "Lote Março/Abril"
Collections.tsx: "15/02 a 15/03" → "15/03 a 15/04"
Collections.tsx: "16-30/03" → "16-30/04"
Collections.tsx: "Abril" → "Maio"
Plans.tsx: Repetir tudo acima
CollectionDetails.tsx: Repetir tudo acima
// Risco de esquecer algum lugar!
```

**DEPOIS (com SSOT)**:
```sql
-- 4 UPDATEs no banco
UPDATE system_settings SET value = 'Março/Abril' WHERE key = 'current_batch_name';
UPDATE system_settings SET value = '2026-03-15' WHERE key = 'current_batch_sales_start';
UPDATE system_settings SET value = '2026-04-15' WHERE key = 'current_batch_sales_end';
UPDATE system_settings SET value = 'Maio' WHERE key = 'current_batch_shipping_month';

-- TODO o site atualiza automaticamente! ✅
```

---

## 🧪 CHECKLIST DE VALIDAÇÃO

### Informações Críticas
- [ ] Prazos de produção consistentes
- [ ] Cronograma do lote atualizado
- [ ] Políticas de troca padronizadas
- [ ] Prazo de suporte correto
- [ ] FAQ sem duplicação

### Componentes
- [ ] BatchInfoBanner funcionando
- [ ] FAQSection renderizando
- [ ] PolicyText mostrando políticas
- [ ] DeadlineText calculando prazos

### Páginas
- [ ] Collections.tsx usando SSOT
- [ ] Plans.tsx usando SSOT
- [ ] CollectionDetails.tsx usando SSOT
- [ ] Terms.tsx usando SSOT
- [ ] Privacy.tsx usando SSOT

---

**Status**: 🔴 CRÍTICO - Múltiplas divergências encontradas
**Impacto**: 🔴 ALTO - Afeta experiência do cliente
**Urgência**: 🔴 ALTA - Informações desatualizadas/conflitantes
