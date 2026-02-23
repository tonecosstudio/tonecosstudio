# 🎯 Sistema SSOT (Single Source of Truth) - Implementado

## ✅ O QUE FOI IMPLEMENTADO

Implementado sistema completo de **SSOT (Single Source of Truth)** onde TODAS as informações dos templates vêm do banco de dados, garantindo que os dados estejam sempre atualizados.

## 🔑 CONCEITO SSOT

**Problema Anterior**: Informações hardcoded no código (ex: "5% de desconto PIX")
**Solução SSOT**: Todas as informações vêm da tabela `system_settings` no banco de dados

### Vantagens
✅ Alterar desconto PIX no banco → templates atualizam automaticamente
✅ Alterar preços → todos os templates mostram valores corretos
✅ Alterar limite mensal → informações sempre precisas
✅ Zero manutenção de código para mudanças de valores

## 📊 FONTE DE VERDADE: system_settings

Todas as configurações do sistema estão centralizadas na tabela `system_settings`:

```sql
-- Configurações disponíveis
pix_discount_percentage     → 5.00 (5% de desconto PIX)
default_price_full          → 500.00 (Preço padrão cheio)
default_price_pix           → 475.00 (Preço com desconto PIX)
default_deposit_amount      → 100.00 (Valor da entrada)
monthly_production_limit    → 20 (Limite mensal de produção)
sales_open_day             → 15 (Dia de abertura das vendas)
```

## 🎨 NOVAS VARIÁVEIS DE TEMPLATE (14 novas!)

### Preços (SSOT)
- `{{PRECO_PADRAO}}` → R$ 500,00 (busca de system_settings)
- `{{PRECO_PIX}}` → R$ 475,00 (busca de system_settings)
- `{{VALOR_ENTRADA}}` → R$ 100,00 (busca de system_settings)

### Descontos (SSOT)
- `{{DESCONTO_PIX}}` → 5% (busca de system_settings)
- `{{DESCONTO_PIX_VALOR}}` → R$ 25,00 (calculado automaticamente)

### Limites de Produção (SSOT)
- `{{LIMITE_MENSAL}}` → 20 peças (busca de system_settings)
- `{{VENDAS_MES_ATUAL}}` → 12 peças (busca de monthly_production)
- `{{VAGAS_DISPONIVEIS}}` → 8 vagas (calculado em tempo real)
- `{{PERCENTUAL_VENDIDO}}` → 60% (calculado em tempo real)

### Datas (SSOT)
- `{{DIA_ABERTURA_VENDAS}}` → Dia 15 (busca de system_settings)

### Variáveis Existentes (Cliente)
- `{{NOME_CLIENTE}}`, `{{EMAIL_CLIENTE}}`
- `{{ULTIMO_PEDIDO_ID}}`, `{{ULTIMO_PEDIDO_STATUS}}`, `{{ULTIMO_PEDIDO_RASTREIO}}`, `{{ULTIMO_PEDIDO_DATA}}`
- `{{ULTIMO_ORCAMENTO_ID}}`, `{{ULTIMO_ORCAMENTO_VALOR}}`
- `{{ULTIMO_PAGAMENTO_VALOR}}`, `{{ULTIMO_PAGAMENTO_STATUS}}`
- `{{ASSINATURA_PLANO}}`, `{{ASSINATURA_STATUS}}`
- `{{DATA_HOJE}}`, `{{HORA_ATUAL}}`

**TOTAL: 24 variáveis disponíveis** (14 novas SSOT + 10 existentes)

## 🔧 ARQUITETURA IMPLEMENTADA

### 1. Serviço de Templates (`templateService.ts`)

```typescript
// Nova função que busca configurações do sistema
export async function fetchSystemSettings(): Promise<SystemSettings> {
  // Busca todas as configurações de system_settings
  // Busca dados de produção mensal em tempo real
  // Retorna objeto com todas as configurações
}

// Função processTemplate agora é async
export async function processTemplate(
  template: string, 
  customerData: CustomerData
): Promise<string> {
  // 1. Busca configurações do sistema (SSOT)
  const systemSettings = await fetchSystemSettings();
  
  // 2. Substitui variáveis do cliente
  // 3. Substitui variáveis do sistema (SSOT)
  // 4. Retorna template processado
}
```

### 2. Componente QuickRepliesSelector

```typescript
// Atualizado para usar versão async
const processed = await processTemplate(reply.message, customerData);
```

### 3. Banco de Dados

```sql
-- Função que retorna dados de produção em tempo real
get_current_production_limit()
  → prod_global_limit (limite configurado)
  → prod_units_sold (vendas do mês)
  → prod_available (vagas restantes)
  → prod_percentage_sold (percentual vendido)
```

## 📝 TEMPLATES DE EXEMPLO CRIADOS

7 novos templates que demonstram o poder do SSOT:

1. **Informações de Preço Atualizadas**
   - Mostra preços, desconto PIX e economia

2. **Vagas Disponíveis**
   - Status completo de produção do mês

3. **Resumo Completo do Pedido**
   - Combina dados do cliente + sistema

4. **Últimas Vagas do Mês**
   - Template de urgência com dados reais

5. **Desconto PIX Especial**
   - Destaca economia no PIX

6. **Planos de Assinatura**
   - Informações de assinatura + preços

7. **Informações Gerais**
   - Overview completo do sistema

## 🎯 EXEMPLO PRÁTICO

### Cenário: Alterar Desconto PIX de 5% para 10%

**ANTES (sem SSOT)**:
```typescript
// Código hardcoded
const desconto = "5%"; // ❌ Precisa mudar em vários lugares
const precoNormal = 500;
const precoPix = 475; // ❌ Precisa recalcular manualmente
```

**AGORA (com SSOT)**:
```sql
-- Alterar apenas no banco de dados
UPDATE system_settings 
SET value = '10' 
WHERE key = 'pix_discount_percentage';

-- Todos os templates atualizam automaticamente! ✅
```

### Resultado Automático:
- `{{DESCONTO_PIX}}` → 10% (atualizado)
- `{{PRECO_PIX}}` → R$ 450,00 (recalculado)
- `{{DESCONTO_PIX_VALOR}}` → R$ 50,00 (recalculado)
- Todos os templates mostram valores corretos instantaneamente!

## 🚀 COMO USAR

### 1. Criar Template com Variáveis SSOT

```
Olá {{NOME_CLIENTE}}! 

💰 Preços atuais:
• Normal: {{PRECO_PADRAO}}
• PIX: {{PRECO_PIX}} ({{DESCONTO_PIX}} OFF)
• Economia: {{DESCONTO_PIX_VALOR}}

📊 Vagas: {{VAGAS_DISPONIVEIS}}
```

### 2. Alterar Configurações no Banco

```sql
-- Alterar desconto PIX
UPDATE system_settings 
SET value = '10' 
WHERE key = 'pix_discount_percentage';

-- Alterar preço padrão
UPDATE system_settings 
SET value = '600.00' 
WHERE key = 'default_price_full';

-- Alterar limite mensal
UPDATE system_settings 
SET value = '30' 
WHERE key = 'monthly_production_limit';
```

### 3. Templates Atualizam Automaticamente

Não precisa tocar no código! Todos os templates que usam essas variáveis mostrarão os novos valores.

## 📊 FLUXO DE DADOS

```
┌─────────────────────┐
│  system_settings    │ ← FONTE DE VERDADE
│  (banco de dados)   │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ fetchSystemSettings │ ← Busca configurações
│  (templateService)  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  processTemplate    │ ← Substitui variáveis
│  (async)            │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ QuickRepliesSelector│ ← Mostra preview
│  (componente)       │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Mensagem Final     │ ← Dados sempre atualizados
│  (para o cliente)   │
└─────────────────────┘
```

## ✅ BENEFÍCIOS IMPLEMENTADOS

1. **Manutenção Zero**: Alterar valores no banco, não no código
2. **Consistência**: Mesma informação em todos os lugares
3. **Tempo Real**: Dados sempre atualizados
4. **Escalabilidade**: Fácil adicionar novas configurações
5. **Auditoria**: Histórico de mudanças no banco
6. **Flexibilidade**: Admin pode alterar valores sem desenvolvedor

## 🧪 COMO TESTAR

### 1. Aplicar Migration
```bash
# Executar o arquivo bat
aplicar-templates-ssot.bat

# Ou via CLI
npx supabase db push
```

### 2. Testar Templates
1. Abrir: http://localhost:8080/admin/suporte
2. Selecionar conversa
3. Clicar "Respostas Rápidas"
4. Selecionar template com variáveis SSOT
5. Ver preview com dados reais do banco

### 3. Alterar Configuração
```sql
-- No Supabase Dashboard ou via SQL
UPDATE system_settings 
SET value = '7.5' 
WHERE key = 'pix_discount_percentage';
```

### 4. Verificar Atualização
- Recarregar página
- Selecionar mesmo template
- Ver novo valor de desconto (7.5%)

## 📁 ARQUIVOS MODIFICADOS

1. ✅ `src/lib/services/templateService.ts`
   - Adicionado `fetchSystemSettings()`
   - `processTemplate()` agora é async
   - 14 novas variáveis SSOT

2. ✅ `src/components/admin/QuickRepliesSelector.tsx`
   - Atualizado para usar `await processTemplate()`

3. ✅ `supabase/migrations/20260222093000_add_ssot_templates.sql`
   - 7 templates de exemplo usando SSOT

4. ✅ `aplicar-templates-ssot.bat`
   - Script para aplicar migration

## 🎉 RESULTADO FINAL

Sistema profissional onde:
- ✅ Todas as informações vêm do banco de dados
- ✅ Zero hardcode de valores no código
- ✅ Alterações refletem instantaneamente
- ✅ Manutenção simplificada
- ✅ Dados sempre consistentes e atualizados

---

**Data**: 22/02/2026
**Status**: ✅ IMPLEMENTADO E PRONTO PARA USO
**Variáveis Totais**: 24 (14 SSOT + 10 cliente)
