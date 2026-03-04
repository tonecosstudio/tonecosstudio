# Proposta de Reorganização Admin - Estrutura Unificada

## 🎯 OBJETIVO
Unificar e organizar todas as funcionalidades relacionadas em um único local lógico.

---

## 📊 ESTRUTURA ATUAL (Problemas)

### ❌ DUPLICAÇÃO: Coleções em 2 lugares
1. **Gestão de Catálogo** → Tab "Coleções" (criar/editar)
2. **Gestão de Preços** → Tab "Coleções" (atribuir a níveis)

### ❌ CONFUSÃO: Financeiro no lugar errado
- **Gestão de Catálogo** → Tab "Financeiro" (relatórios de vendas)
- Deveria estar em seção própria de Financeiro

### ❌ SEPARAÇÃO: Preços separado de Produtos
- Criar coleção em um lugar
- Definir preço em outro lugar
- Deveria ser tudo junto

---

## ✅ ESTRUTURA PROPOSTA (Nova)

### 1. 📦 CATÁLOGO & PRODUTOS [HUB EXPANDIDO]
**Descrição**: Tudo sobre criar e organizar produtos para venda

**Tabs**:
1. **Franquias** (organização do catálogo)
   - Criar/editar franquias (Marvel, DC, Star Wars, etc)
   - Categorização

2. **Modelos** (personagens individuais)
   - Criar/editar modelos
   - Upload de arquivos 3D
   - Atribuir a franquias

3. **Coleções** (produtos de assinatura)
   - Criar/editar coleções
   - Selecionar modelos para a coleção
   - **Definir preços/níveis aqui mesmo** ← UNIFICADO
   - Ativar/desativar para venda

4. **Níveis & Planos** (sistema de preços)
   - Níveis de preço (Bronze, Prata, Ouro, etc)
   - Modalidades de compra (Avulso, Trimestral, Semestral, Anual)
   - Planos gerados automaticamente
   - **Sistema atual de "Gestão Completa de Preços"** ← MOVIDO PARA CÁ

5. **Pré-vendas**
   - Gerenciar pré-vendas de coleções

**Páginas integradas**:
- AdminFranchises
- AdminModels
- AdminCollections (+ atribuição de preços)
- PricingTiersManager (sistema atual)
- PurchaseModesConfig
- CollectionTierAssignment
- AdminPreorders

---

### 2. 💰 FINANCEIRO [NOVO HUB]
**Descrição**: Relatórios de vendas e receita

**Tabs**:
1. **Visão Geral**
   - Dashboard financeiro
   - Receita total
   - Gráficos de vendas

2. **Por Coleção**
   - Receita por coleção
   - Assinaturas ativas
   - **Conteúdo atual de "Financeiro" em Catálogo** ← MOVIDO PARA CÁ

3. **Por Período**
   - Relatórios mensais/anuais
   - Comparativos

4. **Cupons & Descontos**
   - Gerenciar cupons
   - **AdminCoupons** ← MOVIDO PARA CÁ

**Páginas integradas**:
- AdminCollectionFinancials (movido de Catálogo)
- AdminCoupons (movido de menu principal)
- Novos relatórios financeiros

---

### 3. 💳 PAGAMENTOS [HUB - JÁ EXISTE]
**Descrição**: Processar e gerenciar pagamentos

**Tabs** (mantém atual):
1. Pagamentos
2. Métodos
3. Chaves API
4. Calculadora
5. Verificação

---

### 4. 🚀 OPERAÇÕES [SEÇÃO - JÁ EXISTE]
**Descrição**: Operações diárias

**Itens** (mantém atual):
- Orçamentos
- Assinaturas
- Dashboard de Ciclos
- Gerenciar Entregas
- Gerenciar Capacidade
- Trilha de Auditoria

---

### 5. 🎨 PRODUÇÃO [SEÇÃO - JÁ EXISTE]
**Descrição**: Ferramentas de produção

**Itens** (mantém atual):
- Upload Massivo
- Modo Esteira
- Embalagem

---

### 6. 💬 COMUNICAÇÃO [HUB - JÁ EXISTE]
**Descrição**: Comunicação com clientes

**Tabs** (mantém atual):
- Suporte
- Grupos
- Respostas Rápidas
- Templates
- Notificações
- Histórico

---

### 7. 👥 USUÁRIOS [PÁGINA - JÁ EXISTE]
**Descrição**: Gerenciar usuários

---

### 8. ⚙️ CONFIGURAÇÕES [HUB - JÁ EXISTE]
**Descrição**: Configurações do sistema

---

## 📋 MENU FINAL PROPOSTO

```
📊 VISÃO GERAL
  └─ Dashboard

📦 CATÁLOGO & PRODUTOS [HUB]
  ├─ Franquias
  ├─ Modelos
  ├─ Coleções (com preços)
  ├─ Níveis & Planos
  └─ Pré-vendas

🚀 OPERAÇÕES
  ├─ Orçamentos
  ├─ Assinaturas
  ├─ Dashboard de Ciclos
  ├─ Gerenciar Entregas
  ├─ Gerenciar Capacidade
  └─ Trilha de Auditoria

🎨 PRODUÇÃO
  ├─ Upload Massivo
  ├─ Modo Esteira
  └─ Embalagem

💰 FINANCEIRO [HUB NOVO]
  ├─ Visão Geral
  ├─ Por Coleção
  ├─ Por Período
  └─ Cupons & Descontos

💳 PAGAMENTOS [HUB]
  ├─ Pagamentos
  ├─ Métodos
  ├─ Chaves API
  ├─ Calculadora
  └─ Verificação

💬 COMUNICAÇÃO [HUB]
  ├─ Suporte
  ├─ Grupos
  ├─ Respostas Rápidas
  ├─ Templates
  ├─ Notificações
  └─ Histórico

👥 USUÁRIOS
  └─ Gerenciar Usuários

⚙️ CONFIGURAÇÕES [HUB]
  └─ Configurações do Sistema
```

---

## 🔄 MUDANÇAS NECESSÁRIAS

### 1. Expandir "Gestão de Catálogo" → "Catálogo & Produtos"
**Adicionar tabs**:
- ✅ Franquias (já existe)
- ✅ Modelos (já existe)
- ✅ Coleções (já existe)
- ➕ **Níveis & Planos** (mover de "Gestão de Preços")
- ✅ Pré-vendas (já existe)
- ❌ Remover "Financeiro" (mover para hub próprio)

### 2. Criar novo hub "Financeiro"
**Mover para cá**:
- Tab "Financeiro" de Catálogo → "Por Coleção"
- AdminCoupons do menu → "Cupons & Descontos"
- Adicionar novos relatórios

### 3. Deletar "Gestão Completa de Preços" do menu
**Motivo**: Conteúdo movido para "Catálogo & Produtos"

### 4. Integrar preços na criação de coleções
**Na tab "Coleções"**:
- Ao criar/editar coleção
- Já permite atribuir nível de preço
- Tudo em uma tela só

---

## 📊 COMPARAÇÃO

### ANTES (14 itens no menu)
- Dashboard
- 6 itens Operações
- **4 itens Catálogo** (incluindo hub)
- **3 itens Financeiro** (Preços, Pagamentos, Cupons)
- 2 itens Comunicação
- 1 item Configurações

### DEPOIS (13 itens no menu) ← REDUÇÃO
- Dashboard
- **1 hub Catálogo & Produtos** (5 tabs) ← UNIFICADO
- 6 itens Operações
- 3 itens Produção
- **1 hub Financeiro** (4 tabs) ← NOVO
- **1 hub Pagamentos** (5 tabs)
- 1 hub Comunicação (6 tabs)
- 1 item Usuários
- 1 hub Configurações

---

## ✅ BENEFÍCIOS

1. **Unificação Lógica**
   - Tudo sobre produtos em um lugar
   - Tudo sobre dinheiro em outro lugar
   - Sem duplicação

2. **Fluxo Natural**
   - Criar franquia → Criar modelo → Criar coleção (com preço) → Vender
   - Tudo no mesmo hub

3. **Menos Confusão**
   - "Coleções" aparece só uma vez
   - "Financeiro" é claramente sobre receita
   - "Preços" integrado na criação de produtos

4. **Mais Organizado**
   - Catálogo = Produtos
   - Financeiro = Receita
   - Pagamentos = Processar pagamentos
   - Operações = Dia a dia

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Aprovar estrutura proposta
2. Criar novo hub "Financeiro"
3. Mover tabs de "Gestão de Preços" para "Catálogo & Produtos"
4. Integrar atribuição de preços na criação de coleções
5. Atualizar menu de navegação
6. Atualizar redirects
7. Testar fluxos completos
8. Documentar mudanças

---

## ❓ DÚVIDAS PARA CONFIRMAR

1. ✅ Sistema de níveis/planos atual está bom? (você disse que sim)
2. ✅ Mover tudo de preços para dentro de Catálogo? (você disse que sim)
3. ✅ Criar hub Financeiro separado para receita? (você disse que sim)
4. ❓ Cupons devem ir para Financeiro ou ficar separado?
5. ❓ Pré-vendas fica em Catálogo ou vai para Operações?
