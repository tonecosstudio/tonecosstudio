# 🗺️ Mapa Visual do Sistema de Créditos

## 📊 Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA DE CRÉDITOS                       │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Frontend   │───▶│  API Service │───▶│   Supabase   │ │
│  │   (React)    │    │  (TypeScript)│    │  (Postgres)  │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Páginas do Sistema

### Admin

```
/admin/creditos/
├── dashboard          → 📊 Métricas gerais
├── assinaturas        → 👥 Gerenciar assinaturas
├── personagens        → 🎭 CRUD de personagens
└── ciclos             → 🔄 Ciclos de produção
```

### Usuário

```
/
├── painel-creditos       → 💳 Meu painel
└── catalogo-personagens  → 🛒 Catálogo de compras
```

---

## 🗄️ Estrutura do Banco de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE TABLES                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📋 subscription_credit_plans                                │
│     ├── id (UUID)                                           │
│     ├── plan_type (trimestral | semestral)                  │
│     ├── price (DECIMAL)                                     │
│     ├── base_credits (INTEGER)                              │
│     └── bonus_credits (INTEGER)                             │
│                                                              │
│  👤 subscription_credit_subscriptions                        │
│     ├── id (UUID)                                           │
│     ├── user_id → auth.users                                │
│     ├── plan_id → subscription_credit_plans                 │
│     ├── status (active | expired | cancelled)               │
│     └── auto_renew (BOOLEAN)                                │
│                                                              │
│  💰 subscription_credit_user_credits                         │
│     ├── id (UUID)                                           │
│     ├── user_id → auth.users                                │
│     ├── subscription_id → subscriptions                     │
│     ├── total_credits (INTEGER)                             │
│     ├── used_credits (INTEGER)                              │
│     └── available_credits (INTEGER)                         │
│                                                              │
│  📝 subscription_credit_transactions                         │
│     ├── id (UUID)                                           │
│     ├── user_id → auth.users                                │
│     ├── transaction_type (allocation | debit | ...)         │
│     ├── credits_amount (INTEGER)                            │
│     └── description (TEXT)                                  │
│                                                              │
│  🎭 subscription_credit_characters                           │
│     ├── id (UUID)                                           │
│     ├── name (TEXT)                                         │
│     ├── price_cash (DECIMAL)                                │
│     ├── price_credits (INTEGER)                             │
│     └── is_exclusive_semestral (BOOLEAN)                    │
│                                                              │
│  🔄 subscription_credit_production_cycles                    │
│     ├── id (UUID)                                           │
│     ├── name (TEXT)                                         │
│     ├── capacity_limit (INTEGER)                            │
│     ├── current_count (INTEGER)                             │
│     ├── status (open | full | closed)                       │
│     └── close_date (TIMESTAMPTZ)                            │
│                                                              │
│  📦 subscription_credit_orders                               │
│     ├── id (UUID)                                           │
│     ├── user_id → auth.users                                │
│     ├── production_cycle_id → cycles                        │
│     ├── order_type (individual | automatic)                 │
│     ├── status (pending | confirmed | ...)                  │
│     └── is_locked (BOOLEAN)                                 │
│                                                              │
│  📋 subscription_credit_order_items                          │
│     ├── id (UUID)                                           │
│     ├── order_id → orders                                   │
│     ├── character_id → characters                           │
│     └── credits_cost (INTEGER)                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Uso

### 1. Usuário Assina

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Usuário  │────▶│ Escolhe  │────▶│ Realiza  │────▶│ Recebe   │
│ acessa   │     │  Plano   │     │Pagamento │     │ Créditos │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                           │
                                                           ▼
                                                    ┌──────────┐
                                                    │ Sistema  │
                                                    │  aloca   │
                                                    │ créditos │
                                                    └──────────┘
```

### 2. Usuário Compra Personagem

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Usuário  │────▶│ Escolhe  │────▶│ Confirma │────▶│ Créditos │
│ acessa   │     │Personagem│     │  Compra  │     │debitados │
│catálogo  │     │          │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                           │
                                                           ▼
                                                    ┌──────────┐
                                                    │Personagem│
                                                    │adicionado│
                                                    │ao pedido │
                                                    └──────────┘
```

### 3. Admin Fecha Ciclo

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Admin   │────▶│  Fecha   │────▶│  Debita  │────▶│  Trava   │
│ acessa   │     │  Ciclo   │     │ créditos │     │ pedidos  │
│  ciclos  │     │          │     │automáticos│     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                           │
                                                           ▼
                                                    ┌──────────┐
                                                    │  Inicia  │
                                                    │ produção │
                                                    └──────────┘
```

---

## 🔐 Segurança (RLS)

```
┌─────────────────────────────────────────────────────────────┐
│                      RLS POLICIES                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  👤 USUÁRIOS                                                 │
│     ✅ Veem apenas seus dados                                │
│     ✅ Podem criar suas assinaturas                          │
│     ✅ Podem criar seus pedidos                              │
│     ✅ Podem editar pedidos não travados                     │
│     ❌ Não podem editar créditos diretamente                 │
│                                                              │
│  👨‍💼 ADMINS                                                   │
│     ✅ Veem todos os dados                                   │
│     ✅ Podem gerenciar tudo                                  │
│     ✅ Podem ajustar créditos                                │
│     ✅ Podem fechar ciclos                                   │
│                                                              │
│  🌐 PÚBLICO                                                  │
│     ✅ Veem planos ativos                                    │
│     ✅ Veem personagens ativos                               │
│     ✅ Veem ciclos abertos                                   │
│     ❌ Não veem dados de usuários                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Dashboard Admin - Métricas

```
┌─────────────────────────────────────────────────────────────┐
│              DASHBOARD DE CRÉDITOS                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📈 ASSINATURAS                                              │
│     • Total: 150                                            │
│     • Ativas: 120                                           │
│     • Expiradas: 20                                         │
│     • Canceladas: 10                                        │
│                                                              │
│  💰 CRÉDITOS                                                 │
│     • Alocados: 30,000                                      │
│     • Usados: 18,000                                        │
│     • Disponíveis: 12,000                                   │
│     • Expirados: 500                                        │
│                                                              │
│  🔄 CICLOS                                                   │
│     • Abertos: 1                                            │
│     • Fechados: 5                                           │
│     • Capacidade: 80/100                                    │
│                                                              │
│  💵 RECEITA                                                  │
│     • MRR: R$ 18,000                                        │
│     • Trimestral: 80 assinaturas                            │
│     • Semestral: 40 assinaturas                             │
│                                                              │
│  🎭 PERSONAGENS                                              │
│     • Total: 50                                             │
│     • Ativos: 45                                            │
│     • Exclusivos: 10                                        │
│                                                              │
│  📦 PEDIDOS                                                  │
│     • Total: 300                                            │
│     • Individuais: 200                                      │
│     • Automáticos: 100                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Tipos de Pedidos

### Pedido Individual

```
┌─────────────────────────────────────────────────────────────┐
│  PEDIDO INDIVIDUAL                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Usuário escolhe personagem                                 │
│         ↓                                                    │
│  Créditos debitados IMEDIATAMENTE                           │
│         ↓                                                    │
│  Personagem adicionado ao ciclo atual                       │
│         ↓                                                    │
│  Pedido travado (não pode editar)                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pedido Automático

```
┌─────────────────────────────────────────────────────────────┐
│  PEDIDO AUTOMÁTICO                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Usuário adiciona personagens ao pedido                     │
│         ↓                                                    │
│  Créditos NÃO debitados ainda                               │
│         ↓                                                    │
│  Usuário pode editar até ciclo fechar                       │
│         ↓                                                    │
│  Ciclo fecha → Créditos debitados                           │
│         ↓                                                    │
│  Pedido travado (não pode mais editar)                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Tipos de Transações

```
┌─────────────────────────────────────────────────────────────┐
│                    TIPOS DE TRANSAÇÕES                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ➕ allocation                                               │
│     Créditos alocados ao criar/renovar assinatura           │
│                                                              │
│  ➖ debit_immediate                                          │
│     Débito imediato (pedido individual)                     │
│                                                              │
│  ➖ debit_cycle_close                                        │
│     Débito no fechamento (pedido automático)                │
│                                                              │
│  ⏰ expiration                                               │
│     Créditos expirados                                      │
│                                                              │
│  🔧 adjustment                                               │
│     Ajuste manual (admin)                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Ativação em 3 Passos

```
┌─────────────────────────────────────────────────────────────┐
│                    ATIVAÇÃO DO SISTEMA                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1️⃣  Aplicar Migration                                       │
│      .\aplicar-migration-creditos.ps1                       │
│      ↓                                                       │
│      Cria 8 tabelas no Supabase                             │
│      Insere 2 planos iniciais                               │
│                                                              │
│  2️⃣  Regenerar Tipos                                         │
│      npm run generate-types                                 │
│      ↓                                                       │
│      Atualiza tipos TypeScript                              │
│                                                              │
│  3️⃣  Reiniciar Servidor                                      │
│      Ctrl+C → npm run dev                                   │
│      ↓                                                       │
│      Sistema pronto para uso!                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist Visual

```
┌─────────────────────────────────────────────────────────────┐
│                    CHECKLIST DE ATIVAÇÃO                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Backend                                                     │
│  ☐ Migration aplicada                                       │
│  ☐ 8 tabelas criadas                                        │
│  ☐ 2 planos inseridos                                       │
│  ☐ RLS policies ativas                                      │
│                                                              │
│  Frontend                                                    │
│  ☐ Tipos regenerados                                        │
│  ☐ Servidor reiniciado                                      │
│  ☐ Sidebar mostra "Sistema de Créditos"                     │
│  ☐ Dashboard carrega                                        │
│                                                              │
│  Testes                                                      │
│  ☐ Criar 1 personagem                                       │
│  ☐ Criar 1 ciclo                                            │
│  ☐ Testar fluxo de compra                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎉 Sistema Pronto!

```
     ✅ Backend completo
     ✅ Frontend completo
     ✅ API integrada
     ✅ Documentação completa
     ✅ Sem gambiarras
     
     🚀 Execute os 3 passos e comece a usar!
```
