# 💰 SISTEMA DE PREÇOS CONFIGURÁVEIS

**Data:** 2026-02-15  
**Status:** ✅ Implementado

---

## 🎯 OBJETIVO

Permitir que o admin configure:
1. **Preços globais padrão** (aplicados a todas as coleções)
2. **Preços customizados por coleção** (sobrescreve o padrão)
3. **Valor da entrada** (global ou por coleção)
4. **Desconto PIX** (percentual global)

---

## 📦 ARQUIVOS CRIADOS

### Backend
1. ✅ `supabase/migrations/20260215140000_add_collection_pricing.sql`
   - Adiciona campos de preço nas coleções
   - Cria configurações globais
   - Funções de cálculo automático
   - View de preços
   - Triggers

### Frontend
2. ✅ `src/pages/admin/AdminPricing.tsx`
   - Página admin para gerenciar preços
   - Configurações globais
   - Preços por coleção
   - Preview em tempo real

3. ✅ `src/hooks/useCollectionPricing.ts`
   - Hook para buscar preços dinâmicos
   - Hook para configurações globais
   - TypeScript types

### Scripts
4. ✅ `aplicar-precos-configuraveis.bat`
   - Script para aplicar migration

---

## 🗄️ ESTRUTURA DO BANCO

### Tabela: `collections`

**Novos campos:**
```sql
price_full NUMERIC(10,2) DEFAULT 500.00
price_pix NUMERIC(10,2) DEFAULT 475.00
deposit_amount NUMERIC(10,2) DEFAULT 100.00
is_price_custom BOOLEAN DEFAULT false
```

### Tabela: `system_settings`

**Novas configurações:**
```sql
default_price_full = '500.00'
default_price_pix = '475.00'
default_deposit_amount = '100.00'
pix_discount_percentage = '5.00'
```

---

## 🔧 FUNÇÕES CRIADAS

### 1. `calculate_pix_price(price_full, discount_percentage)`
Calcula preço PIX com desconto:
```sql
SELECT calculate_pix_price(500, 5); -- Retorna 475.00
```

### 2. `get_collection_pricing(collection_id)`
Retorna preços de uma coleção (customizado ou padrão):
```sql
SELECT * FROM get_collection_pricing('uuid-da-colecao');
```

**Retorna:**
- `price_full`: Preço cheio
- `price_pix`: Preço PIX
- `deposit_amount`: Valor da entrada
- `remaining_full`: Restante parcelado
- `remaining_pix`: Restante PIX
- `is_custom`: Se usa preço customizado

---

## 💻 COMO USAR NO FRONTEND

### Hook: `useCollectionPricing`

```typescript
import { useCollectionPricing } from '@/hooks/useCollectionPricing';

function MyComponent() {
  const { data: pricing } = useCollectionPricing(collectionId);
  
  return (
    <div>
      <p>Preço: R$ {pricing?.price_full}</p>
      <p>Entrada: R$ {pricing?.deposit_amount}</p>
      <p>Restante PIX: R$ {pricing?.remaining_pix}</p>
    </div>
  );
}
```

### Hook: `useGlobalPricingSettings`

```typescript
import { useGlobalPricingSettings } from '@/hooks/useCollectionPricing';

function MyComponent() {
  const { data: settings } = useGlobalPricingSettings();
  
  return (
    <div>
      <p>Preço padrão: R$ {settings?.default_price_full}</p>
      <p>Desconto PIX: {settings?.pix_discount_percentage}%</p>
    </div>
  );
}
```

---

## 🎨 PÁGINA ADMIN

### Acesso
```
/admin/precos
```

### Funcionalidades

#### 1. Configurações Globais
- Preço Cheio padrão
- Entrada padrão
- Desconto PIX (%)
- Preview automático dos valores

#### 2. Preços por Coleção
- Lista todas as coleções
- Toggle "Usar preço customizado"
- Campos editáveis quando customizado
- Preview dos valores calculados
- Botão salvar por coleção

---

## 📊 FLUXO DE PREÇOS

### Coleção SEM preço customizado:
```
1. Frontend chama get_collection_pricing(collection_id)
2. Função verifica: is_price_custom = false
3. Retorna valores de system_settings (padrão)
4. Frontend exibe valores padrão
```

### Coleção COM preço customizado:
```
1. Frontend chama get_collection_pricing(collection_id)
2. Função verifica: is_price_custom = true
3. Retorna valores da própria coleção
4. Frontend exibe valores customizados
```

---

## 🔄 ATUALIZAÇÃO AUTOMÁTICA

### Trigger: `update_collection_pix_price`

Quando você atualiza `price_full` de uma coleção customizada:
```sql
UPDATE collections 
SET price_full = 600.00 
WHERE id = 'uuid';

-- Trigger calcula automaticamente:
-- price_pix = 600 * (1 - 5/100) = 570.00
```

---

## 📋 EXEMPLOS DE USO

### Exemplo 1: Configurar Preço Global

**Admin acessa `/admin/precos`:**
1. Altera "Preço Cheio" para R$ 550
2. Altera "Entrada" para R$ 120
3. Mantém "Desconto PIX" em 5%
4. Clica "Salvar"

**Resultado:**
- Todas as coleções sem preço customizado usam R$ 550
- Entrada padrão vira R$ 120
- PIX calculado automaticamente: R$ 522,50

### Exemplo 2: Customizar Coleção Específica

**Admin quer Marvel mais cara:**
1. Acessa `/admin/precos`
2. Encontra coleção "Marvel"
3. Ativa toggle "Customizar"
4. Define "Preço Cheio" = R$ 700
5. Define "Entrada" = R$ 150
6. Clica "Salvar"

**Resultado:**
- Marvel: R$ 700 (entrada R$ 150, PIX R$ 665)
- Outras coleções: R$ 550 (padrão)

### Exemplo 3: Promoção Temporária

**Admin quer desconto de 10% no PIX:**
1. Acessa `/admin/precos`
2. Altera "Desconto PIX" para 10%
3. Clica "Salvar"

**Resultado:**
- Todas as coleções recalculam PIX com 10%
- Preço R$ 550 → PIX R$ 495
- Preço R$ 700 → PIX R$ 630

---

## 🚀 COMO APLICAR

### 1. Executar Migration

**Opção A: Script (Windows)**
```bash
aplicar-precos-configuraveis.bat
```

**Opção B: Supabase SQL Editor**
1. Copiar conteúdo de `20260215140000_add_collection_pricing.sql`
2. Colar no SQL Editor
3. Executar

### 2. Verificar Instalação

```sql
-- Verificar campos nas coleções
SELECT id, name, price_full, price_pix, deposit_amount, is_price_custom 
FROM collections 
LIMIT 5;

-- Verificar configurações globais
SELECT * FROM system_settings 
WHERE key LIKE 'default_%' OR key = 'pix_discount_percentage';

-- Testar função
SELECT * FROM get_collection_pricing('uuid-de-uma-colecao');
```

### 3. Acessar Admin

```
http://localhost:5173/admin/precos
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Backend
- [ ] Migration aplicada sem erros
- [ ] Campos criados nas coleções
- [ ] Configurações globais inseridas
- [ ] Funções criadas
- [ ] View criada
- [ ] Triggers funcionando

### Frontend
- [ ] Hook `useCollectionPricing` funciona
- [ ] Hook `useGlobalPricingSettings` funciona
- [ ] Página `/admin/precos` carrega
- [ ] Pode alterar configurações globais
- [ ] Pode customizar preços por coleção
- [ ] Preview atualiza em tempo real

### Integração
- [ ] `BuyCharacter.tsx` mostra preços dinâmicos
- [ ] Valores mudam ao alterar no admin
- [ ] Cálculos estão corretos
- [ ] Não há valores hardcoded

---

## 🎯 BENEFÍCIOS

### Para o Admin
✅ Controle total sobre preços  
✅ Ajuste rápido sem código  
✅ Promoções fáceis  
✅ Preços diferentes por coleção  
✅ Preview antes de salvar

### Para o Sistema
✅ Sem valores hardcoded  
✅ Cálculos automáticos  
✅ Consistência garantida  
✅ Fácil manutenção  
✅ Escalável

### Para o Cliente
✅ Preços sempre atualizados  
✅ Transparência  
✅ Cálculos corretos  
✅ Experiência consistente

---

## 📝 NOTAS IMPORTANTES

1. **Preço PIX é calculado automaticamente** - Não precisa inserir manualmente
2. **Trigger atualiza PIX** - Ao mudar price_full, price_pix recalcula
3. **Fallback para padrão** - Se coleção não tem preço, usa global
4. **Cache do React Query** - Preços são cacheados por 5 minutos
5. **RLS habilitado** - Apenas admins podem alterar preços

---

## 🔮 PRÓXIMAS MELHORIAS

- [ ] Histórico de mudanças de preço
- [ ] Agendamento de promoções
- [ ] Preços por região/país
- [ ] Cupons de desconto
- [ ] Preços dinâmicos por demanda

---

**Sistema implementado e pronto para uso!** ✅

