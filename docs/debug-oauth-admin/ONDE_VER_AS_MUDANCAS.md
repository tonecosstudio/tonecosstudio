# Onde Ver as Mudanças - Guia Visual

## 🎯 Localização das Mudanças

### 1. Sidebar (Menu Lateral)

Procure por **"Catálogo & Produtos"** na seção "Catálogo & Produtos":

```
📦 Catálogo & Produtos
   ├─ 📦 Catálogo & Produtos [Hub]  ← CLIQUE AQUI
   ├─ 📤 Upload Massivo
   ├─ 🔄 Modo Esteira
   └─ 📦 Embalagem
```

### 2. Página Principal

Ao clicar em "Catálogo & Produtos", você verá **3 ABAS**:

```
┌─────────────────────────────────────────────────────────┐
│  Catálogo & Produtos                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [📦 Franquias & Modelos] [📦 Coleções] [📊 Preços & Planos] ← 3 ABAS
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3. Aba "Preços & Planos" (NOVA!)

Clique na aba **"Preços & Planos"** para ver a hierarquia completa:

```
┌─────────────────────────────────────────────────────────┐
│  📊 Preços & Planos                                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ℹ️ Como funciona a hierarquia:                         │
│  1️⃣ Modalidades → Multiplicadores                       │
│  2️⃣ Níveis → Preço base                                 │
│  3️⃣ Planos → Gerados automaticamente                    │
│  4️⃣ Coleções → Atribuídas aos níveis                    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Modalidades de Compra                           │   │
│  │ Configure os multiplicadores...                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Níveis de Preço                    [+ Criar Nível]    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🎯 Nível Bronze  R$ 500,00  4 planos  2 coleções│   │
│  │                                                  │   │
│  │ 📦 Planos Gerados Automaticamente                │   │
│  │   • Avulso: R$ 500,00 (1.0x)                    │   │
│  │   • Trimestral: R$ 465,00 (0.93x)               │   │
│  │   • Semestral: R$ 430,00 (0.86x)                │   │
│  │   • Anual: R$ 395,00 (0.79x)                    │   │
│  │                                                  │   │
│  │ 🎯 Coleções neste Nível                          │   │
│  │   [Vingadores] [Liga da Justiça]                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 🔍 Como Testar

### Passo 1: Acesse a Página
1. Abra o navegador
2. Vá para `/admin/catalogo` ou clique em "Catálogo & Produtos" na sidebar
3. Você verá 3 abas no topo

### Passo 2: Clique na Aba "Preços & Planos"
1. Clique na terceira aba: **"Preços & Planos"**
2. Você verá a hierarquia completa

### Passo 3: Verifique o Conteúdo
Você deve ver:
- ✅ Card de "Modalidades de Compra" no topo
- ✅ Seção "Níveis de Preço" com botão "Criar Nível"
- ✅ Cards para cada nível (se houver níveis criados)
- ✅ Dentro de cada card: planos e coleções

## ⚠️ Se Você Vê Erro 400

Se ao clicar na aba "Preços & Planos" você vê um erro 400, significa que:

1. A migration ainda não foi aplicada no banco de dados
2. A tabela `subscription_plans` não tem as colunas `tier_id` e `plan_mode`

**Solução**: Siga as instruções em `INSTRUCOES_APLICAR_MIGRATION_PRICING.md`

## 📍 URL Direta

Você também pode acessar diretamente pela URL:

```
http://localhost:8080/admin/catalogo?tab=pricing
```

Ou em produção:

```
https://seu-dominio.com/admin/catalogo?tab=pricing
```

## 🎨 O Que Mudou na Sidebar?

**ANTES** (estrutura antiga):
```
📦 Catálogo & Produtos
   ├─ Catálogo & Produtos
   ├─ Upload Massivo
   ├─ Modo Esteira
   └─ Embalagem

💰 Preços
   ├─ Gestão Completa de Preços  ← REMOVIDO
   └─ ...
```

**DEPOIS** (estrutura nova):
```
📦 Catálogo & Produtos
   ├─ Catálogo & Produtos [Hub]  ← UNIFICADO AQUI
   │  └─ Abas: Franquias & Modelos | Coleções | Preços & Planos
   ├─ Upload Massivo
   ├─ Modo Esteira
   └─ Embalagem
```

## 🔄 Mudanças na Estrutura de Abas

**AdminCollectionsHub ANTES** (5 abas):
1. Coleções
2. Modelos
3. Franquias
4. Financeiro
5. Pré-vendas

**AdminCollectionsHub DEPOIS** (3 abas):
1. **Franquias & Modelos** (unificado)
2. **Coleções**
3. **Preços & Planos** (NOVO - hierarquia completa)

## 📝 Resumo

- **Onde**: `/admin/catalogo?tab=pricing`
- **O que**: Hierarquia completa de Modalidades → Níveis → Planos → Coleções
- **Como**: Clique em "Catálogo & Produtos" na sidebar, depois na aba "Preços & Planos"
- **Status**: ✅ Código pronto | ⏳ Migration pendente
