# 💰 Sistema de Preços das Coleções

## Como Funciona Atualmente

### 🎯 Sistema de Pricing Tiers (Níveis de Preço)

O sistema usa **níveis de preço reutilizáveis** ao invés de preços individuais por coleção.

#### Estrutura:

```
pricing_tiers (Níveis de Preço)
├── price_full: R$ 700,00 (preço cheio)
├── deposit_amount: R$ 100,00 (entrada)
├── pix_discount_percentage: 5% (desconto PIX)
└── price_pix: R$ 665,00 (calculado automaticamente)

collection_tier_assignments (Atribuições)
├── collection_id → collections
└── tier_id → pricing_tiers

collections (Coleções)
├── name, description, image_url
└── (SEM campos de preço diretos)
```

### 📊 Fluxo de Preços:

1. **Admin cria Pricing Tier**:
   - Nome: "Nível Premium"
   - Preço cheio: R$ 700,00
   - Entrada: R$ 100,00
   - Desconto PIX: 5%

2. **Coleção é atribuída a um Tier**:
   - Coleção "Heróis da Marvel" → Nível Premium
   - Automaticamente herda todos os preços do tier

3. **Usuário vê o preço**:
   - Sistema busca: `collection → tier_assignment → pricing_tier`
   - Mostra: R$ 700,00 (ou R$ 665,00 no PIX)

### 🔄 Vantagens do Sistema Atual:

✅ **Reutilização**: Um tier pode ser usado por várias coleções
✅ **Atualização em Massa**: Mudar o tier atualiza todas as coleções
✅ **Histórico**: Mantém registro de mudanças de preço
✅ **Flexibilidade**: Coleções podem ter preço custom se necessário

---

## ⚠️ Problema no Modal Atual

### O que está acontecendo:

No modal de criação, há um campo:
```
Preço Mensal (R$) *
```

Mas esse campo **NÃO salva diretamente na coleção**!

### Por quê?

1. A tabela `collections` não tem campo `price`
2. O sistema usa `pricing_tiers` separadamente
3. O campo no modal está "solto" - não conectado ao sistema real

---

## 🎯 Soluções Possíveis

### Opção 1: Remover Campo de Preço do Modal ✅ RECOMENDADO

**Vantagem**: Mantém a arquitetura atual limpa

**Como funciona**:
1. Admin cria a coleção (sem preço)
2. Sistema atribui automaticamente o tier padrão
3. Admin pode mudar o tier depois na aba "Configurações"

**Implementação**:
```tsx
// Remover campo de preço do formulário
// Adicionar seletor de tier na aba "Configurações"

<Select>
  <SelectItem value="tier-1">Nível 1 - R$ 700,00</SelectItem>
  <SelectItem value="tier-2">Nível Premium - R$ 900,00</SelectItem>
</Select>
```

---

### Opção 2: Criar Tier Automaticamente

**Vantagem**: Admin define preço direto na criação

**Como funciona**:
1. Admin preenche preço no modal
2. Sistema cria um tier único para essa coleção
3. Atribui o tier à coleção

**Desvantagem**: Cria muitos tiers (um por coleção)

---

### Opção 3: Sistema Híbrido

**Vantagem**: Flexibilidade máxima

**Como funciona**:
1. Admin escolhe: "Usar tier existente" OU "Preço custom"
2. Se tier: seleciona da lista
3. Se custom: preenche preço e sistema cria tier único

---

## 💡 Recomendação

### Implementar Opção 1 com melhorias:

#### Aba "Básico":
- Nome, descrição, imagem, rotação
- **SEM campo de preço**

#### Aba "Configurações":
```tsx
<div className="space-y-4">
  <Label>Nível de Preço</Label>
  <Select>
    <SelectItem value="default">
      Nível Padrão - R$ 700,00
      <Badge>Padrão</Badge>
    </SelectItem>
    <SelectItem value="premium">
      Nível Premium - R$ 900,00
    </SelectItem>
    <SelectItem value="custom">
      Preço Personalizado
    </SelectItem>
  </Select>

  {/* Se "custom" selecionado */}
  {isCustom && (
    <>
      <Input label="Preço Cheio" />
      <Input label="Entrada" />
      <Input label="Desconto PIX %" />
    </>
  )}
</div>
```

---

## 📝 Estrutura de Dados Completa

### Tabelas Envolvidas:

```sql
-- 1. Níveis de Preço (Reutilizáveis)
pricing_tiers
├── id
├── name: "Nível Premium"
├── price_full: 700.00
├── deposit_amount: 100.00
├── pix_discount_percentage: 5.00
├── price_pix: 665.00 (calculado)
├── is_default: true/false
└── is_active: true/false

-- 2. Atribuições (Qual coleção usa qual tier)
collection_tier_assignments
├── collection_id
├── tier_id
├── assigned_at
└── previous_tier_id (histórico)

-- 3. Coleções (Sem preços diretos)
collections
├── id
├── name
├── description
├── image_url
├── rotation_type
└── is_active

-- 4. Histórico de Mudanças
pricing_history
├── tier_id
├── collection_id
├── change_type
├── old_price_full
├── new_price_full
└── changed_at
```

---

## 🚀 Próximos Passos

### 1. Atualizar Modal (Opção 1):
- [ ] Remover campo "Preço Mensal" da aba Básico
- [ ] Adicionar seletor de Tier na aba Configurações
- [ ] Mostrar preview do preço selecionado
- [ ] Permitir criar tier custom inline

### 2. Melhorar UX:
- [ ] Mostrar preços dos tiers na lista
- [ ] Badge visual indicando tier da coleção
- [ ] Tooltip explicando o sistema de tiers

### 3. Backend:
- [ ] Endpoint para criar coleção + atribuir tier
- [ ] Validação de tier existente
- [ ] Criação de tier custom se necessário

---

## 🎨 Mockup da Solução

### Aba "Configurações" Melhorada:

```
┌─────────────────────────────────────────┐
│ ⚙️ Configurações                        │
├─────────────────────────────────────────┤
│                                         │
│ Nível de Preço *                        │
│ ┌─────────────────────────────────────┐ │
│ │ Nível Padrão - R$ 700,00      [✓]  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Outros níveis disponíveis:              │
│ ○ Nível Premium - R$ 900,00             │
│ ○ Nível Econômico - R$ 500,00           │
│ ○ Preço Personalizado                   │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ Preview do Preço:                       │
│ ┌─────────────────────────────────────┐ │
│ │ Preço Cheio:    R$ 700,00           │ │
│ │ Entrada:        R$ 100,00           │ │
│ │ Saldo:          R$ 600,00           │ │
│ │ Preço PIX:      R$ 665,00 (5% off) │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ Coleção Ativa                    [✓]   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📌 Resumo

**Situação Atual**: Campo de preço no modal não funciona (não conectado ao sistema)

**Causa**: Sistema usa `pricing_tiers` separados, não preços diretos

**Solução**: Remover campo de preço e adicionar seletor de tier na aba Configurações

**Benefício**: Interface alinhada com a arquitetura real do sistema
