# Proposta: Hierarquia Unificada de Preços

## 🎯 OBJETIVO
Mostrar a hierarquia completa (Níveis → Planos → Coleções) em uma única visualização, sem tabs separadas.

---

## 📊 ESTRUTURA ATUAL (Problema)

### Tabs Separadas:
1. **Tab "Níveis & Planos"** → Mostra níveis
2. **Tab "Modalidades"** → Configura multiplicadores
3. **Tab "Coleções"** (em outra aba) → Atribui coleções

**Problema**: Hierarquia quebrada, usuário não vê a relação entre os elementos.

---

## ✅ ESTRUTURA PROPOSTA (Solução)

### Visualização Hierárquica Única:

```
┌─────────────────────────────────────────────────────────────┐
│ GESTÃO DE PREÇOS                                    [+ Criar Nível] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 📋 MODALIDADES ATIVAS (configurar multiplicadores)           │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Avulso: 1.0x  │  Trimestral: 0.93x  │  Semestral: 0.90x │   │
│ │ Anual: 0.85x                                [Editar]  │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ 📊 NÍVEIS DE PREÇO                                           │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🥉 Nível Bronze - R$ 500,00                    [Editar] │ │
│ │                                                          │ │
│ │ 📦 PLANOS GERADOS AUTOMATICAMENTE:                      │ │
│ │   • Avulso: R$ 500,00 (1.0x)                           │ │
│ │   • Trimestral: R$ 465,00 (0.93x)                      │ │
│ │   • Semestral: R$ 450,00 (0.90x)                       │ │
│ │   • Anual: R$ 425,00 (0.85x)                           │ │
│ │                                                          │ │
│ │ 🎯 COLEÇÕES NESTE NÍVEL (2):                            │ │
│ │   • Vingadores                                          │ │
│ │   • Thundercats                          [Gerenciar]    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🥈 Nível Prata - R$ 750,00                     [Editar] │ │
│ │                                                          │ │
│ │ 📦 PLANOS GERADOS AUTOMATICAMENTE:                      │ │
│ │   • Avulso: R$ 750,00 (1.0x)                           │ │
│ │   • Trimestral: R$ 697,50 (0.93x)                      │ │
│ │   • Semestral: R$ 675,00 (0.90x)                       │ │
│ │   • Anual: R$ 637,50 (0.85x)                           │ │
│ │                                                          │ │
│ │ 🎯 COLEÇÕES NESTE NÍVEL (1):                            │ │
│ │   • Liga da Justiça                      [Gerenciar]    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🥇 Nível Ouro - R$ 1.000,00                    [Editar] │ │
│ │                                                          │ │
│ │ 📦 PLANOS GERADOS AUTOMATICAMENTE:                      │ │
│ │   • Avulso: R$ 1.000,00 (1.0x)                         │ │
│ │   • Trimestral: R$ 930,00 (0.93x)                      │ │
│ │   • Semestral: R$ 900,00 (0.90x)                       │ │
│ │   • Anual: R$ 850,00 (0.85x)                           │ │
│ │                                                          │ │
│ │ 🎯 COLEÇÕES NESTE NÍVEL (0):                            │ │
│ │   Nenhuma coleção atribuída              [Atribuir]     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUXO DE USO

### 1. Configurar Modalidades (topo da página)
- Usuário vê e edita multiplicadores
- Alteração recalcula TODOS os planos automaticamente

### 2. Criar/Editar Níveis
- Criar novo nível com preço base
- Sistema gera 4 planos automaticamente
- Planos aparecem expandidos abaixo do nível

### 3. Atribuir Coleções
- Dentro de cada nível, botão "Gerenciar Coleções"
- Abre dialog para selecionar coleções
- Coleções aparecem listadas no card do nível

### 4. Visualização Completa
- Tudo visível em uma página
- Hierarquia clara: Nível → Planos → Coleções
- Sem necessidade de navegar entre tabs

---

## 📋 COMPONENTES NECESSÁRIOS

### 1. **PricingHierarchyView** (NOVO - componente principal)
```tsx
<PricingHierarchyView>
  <ModalitiesConfig />  {/* Topo: configurar multiplicadores */}
  <TiersList>           {/* Lista de níveis */}
    <TierCard>
      <TierHeader />    {/* Nome, preço base, ações */}
      <PlansSection />  {/* Planos gerados */}
      <CollectionsSection /> {/* Coleções atribuídas */}
    </TierCard>
  </TiersList>
</PricingHierarchyView>
```

### 2. **ModalitiesConfig** (já existe, adaptar)
- Mostrar em formato compacto no topo
- Edição inline ou dialog

### 3. **TierCard** (NOVO)
- Card expansível para cada nível
- Mostra: nome, preço, planos, coleções
- Ações: editar, deletar, gerenciar coleções

### 4. **PlansSection** (NOVO)
- Lista os 4 planos gerados
- Formato: "Modalidade: R$ X (multiplicador)"
- Somente leitura (gerados automaticamente)

### 5. **CollectionsSection** (adaptar existente)
- Lista coleções atribuídas ao nível
- Botão "Gerenciar" abre dialog
- Dialog usa CollectionTierAssignment existente

---

## 🎨 LAYOUT DETALHADO

### Seção 1: Modalidades (Topo)
```tsx
<Card className="mb-6">
  <CardHeader>
    <CardTitle>Modalidades de Compra</CardTitle>
    <CardDescription>
      Multiplicadores aplicados ao preço base de cada nível
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-4 gap-4">
      <div>
        <Label>Avulso</Label>
        <Input value="1.0x" disabled />
      </div>
      <div>
        <Label>Trimestral</Label>
        <Input value="0.93x" />
      </div>
      <div>
        <Label>Semestral</Label>
        <Input value="0.90x" />
      </div>
      <div>
        <Label>Anual</Label>
        <Input value="0.85x" />
      </div>
    </div>
    <Button variant="outline" className="mt-4">
      Salvar Alterações
    </Button>
  </CardContent>
</Card>
```

### Seção 2: Níveis (Lista)
```tsx
<div className="space-y-4">
  {tiers.map(tier => (
    <Card key={tier.id}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {tier.icon} {tier.name}
              <Badge variant="outline">R$ {tier.base_price}</Badge>
            </CardTitle>
            <CardDescription>
              {tier.description}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Editar</Button>
            <Button variant="outline" size="sm">Deletar</Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Planos Gerados */}
        <div>
          <h4 className="font-semibold mb-2">Planos Gerados Automaticamente</h4>
          <div className="grid grid-cols-2 gap-2">
            {tier.plans.map(plan => (
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>{plan.mode_name}</span>
                <span className="font-mono">
                  R$ {plan.price} ({plan.multiplier}x)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Coleções Atribuídas */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">
              Coleções neste Nível ({tier.collections.length})
            </h4>
            <Button variant="outline" size="sm">
              Gerenciar Coleções
            </Button>
          </div>
          {tier.collections.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tier.collections.map(collection => (
                <Badge key={collection.id} variant="secondary">
                  {collection.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma coleção atribuída
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

---

## ✅ BENEFÍCIOS

1. **Visualização Completa**
   - Tudo em uma página
   - Hierarquia clara e visível
   - Sem navegação entre tabs

2. **Entendimento Imediato**
   - Usuário vê como níveis geram planos
   - Vê quais coleções usam cada nível
   - Entende o impacto de mudanças

3. **Fluxo Natural**
   - Configurar modalidades (topo)
   - Criar níveis (meio)
   - Ver planos e coleções (dentro de cada nível)

4. **Menos Cliques**
   - Não precisa trocar de tab
   - Tudo acessível com scroll
   - Ações contextuais em cada card

---

## 🚀 IMPLEMENTAÇÃO

### Passo 1: Criar PricingHierarchyView
- Componente principal que orquestra tudo
- Busca dados de níveis, planos e coleções
- Renderiza em estrutura hierárquica

### Passo 2: Adaptar ModalitiesConfig
- Versão compacta para topo da página
- Mantém funcionalidade de edição

### Passo 3: Criar TierCard
- Card expansível para cada nível
- Integra PlansSection e CollectionsSection

### Passo 4: Atualizar AdminCollectionsHub
- Substituir tabs por visualização única
- Usar PricingHierarchyView na tab "Níveis & Planos"

---

## 📊 COMPARAÇÃO

### ANTES (Tabs Separadas)
```
Tab 1: Níveis & Planos
  - Lista de níveis
  - Botão "Ver Planos" abre outra tab

Tab 2: Modalidades
  - Configurar multiplicadores

Tab 3: Coleções (em outra página)
  - Atribuir coleções a níveis
```

### DEPOIS (Hierarquia Unificada)
```
Página Única:
  ┌─ Modalidades (topo)
  ├─ Nível Bronze
  │  ├─ Planos (4)
  │  └─ Coleções (2)
  ├─ Nível Prata
  │  ├─ Planos (4)
  │  └─ Coleções (1)
  └─ Nível Ouro
     ├─ Planos (4)
     └─ Coleções (0)
```

---

## ❓ DÚVIDAS PARA CONFIRMAR

1. ✅ Modalidades no topo da página? (sempre visíveis)
2. ✅ Planos expandidos dentro de cada nível? (não em tab separada)
3. ✅ Coleções listadas dentro de cada nível? (não em página separada)
4. ❓ Permitir colapsar/expandir cada nível? (para páginas com muitos níveis)
5. ❓ Manter botão "Atribuição em Massa" de coleções? (útil para atribuir várias de uma vez)
