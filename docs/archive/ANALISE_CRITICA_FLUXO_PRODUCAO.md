# Análise Crítica: Fluxo de Produção e Gestão de Pedidos

## PROBLEMAS IDENTIFICADOS NO SISTEMA ATUAL

### 1. **FALTA DE VISÃO DE PRODUÇÃO**

❌ Após pagamento aprovado, não há uma "fila de produção" clara
❌ Não existe um dashboard tipo "cozinha do McDonald's" mostrando o que precisa ser feito
❌ Admin não sabe rapidamente: "O que eu preciso produzir hoje?"

### 2. **GESTÃO DE ESCOLHAS DO CLIENTE É CONFUSA**

❌ Cliente pode trocar personagem, mas onde isso aparece claramente?
❌ Não há deadline visual para escolha
❌ Admin não vê facilmente: "Quem ainda não escolheu?"

### 3. **FALTA DE RASTREABILIDADE VISUAL**

❌ Não há um "quadro kanban" mostrando status de produção
❌ Cliente não vê onde seu pedido está na fila
❌ Sem estimativa de tempo de produção

### 4. **INFORMAÇÕES FRAGMENTADAS**

❌ Dados espalhados entre: Pedidos, Usuários, Assinaturas
❌ Precisa abrir múltiplas páginas para entender um pedido completo
❌ Sem visão consolidada de "O que fazer agora?"

---

## SOLUÇÃO PROPOSTA: SISTEMA DE PRODUÇÃO COMPLETO

### **PÁGINA 1: DASHBOARD DE PRODUÇÃO (Nova)**

**Rota:** `/admin/production`

**Objetivo:** Visão tipo "cozinha do McDonald's" - o que precisa ser feito AGORA

#### Seções:

**A) FILA DE PRODUÇÃO (Kanban Board)**

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ AGUARDANDO  │ EM PRODUÇÃO │  ENVIADO    │  ENTREGUE   │
│  ESCOLHA    │             │             │             │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ 🔴 João     │ 🟡 Maria    │ 🟢 Pedro    │ ✅ Ana      │
│ Faltam 2d   │ 50% pronto  │ Rastreio:   │ Recebido    │
│ Coleção X   │ Coleção Y   │ BR123456    │ há 3 dias   │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**Métricas no topo:**

- 🔴 **Urgente:** 5 pedidos com prazo < 24h
- 🟡 **Hoje:** 12 pedidos para produzir hoje
- 🟢 **Esta semana:** 45 pedidos programados
- ⏱️ **Tempo médio de produção:** 3.5 dias

**B) ALERTAS CRÍTICOS**

- ⚠️ 3 clientes não escolheram personagem (prazo expirando)
- ⚠️ 2 pagamentos pendentes há mais de 48h
- ⚠️ 5 pedidos sem código de rastreio há mais de 24h

**C) FILTROS INTELIGENTES**

- Por coleção (agrupar produção similar)
- Por prazo de entrega
- Por status de escolha do cliente
- Por tipo de assinatura/plano

---

### **PÁGINA 2: GESTÃO DE ESCOLHAS DO CLIENTE (Nova)**

**Rota:** `/admin/customer-choices`

**Objetivo:** Gerenciar o que cada cliente escolheu/precisa escolher

#### Tabela com:

| Cliente     | Coleção     | Status Escolha | Prazo  | Personagem Escolhido        | Ações      |
| ----------- | ----------- | -------------- | ------ | --------------------------- | ---------- |
| João Silva  | Naruto      | 🔴 Pendente    | 2 dias | -                           | 🔔 Lembrar |
| Maria Costa | One Piece   | 🟢 Escolhido   | -      | Luffy                       | ✏️ Alterar |
| Pedro Lima  | Dragon Ball | 🟡 Em análise  | 1 dia  | Goku (aguardando aprovação) | ✅ Aprovar |

**Ações disponíveis:**

- 🔔 **Enviar lembrete** ao cliente
- ✏️ **Alterar escolha** (admin pode mudar se cliente pedir)
- ✅ **Aprovar escolha** (se precisa validação)
- 🚫 **Bloquear escolha** (se estoque acabou)
- 📝 **Adicionar nota** (observações internas)

---

### **PÁGINA 3: LINHA DE PRODUÇÃO DETALHADA (Nova)**

**Rota:** `/admin/production-line`

**Objetivo:** Visão granular de cada etapa de produção

#### Estágios de Produção:

```
1. ⏳ Aguardando Escolha do Cliente
   ↓
2. 🎨 Design/Preparação
   ↓
3. 🏭 Em Produção
   ↓
4. 📦 Embalagem
   ↓
5. 🚚 Enviado
   ↓
6. ✅ Entregue
```

**Para cada pedido:**

- Tempo em cada estágio
- Responsável pela etapa
- Fotos do produto (se aplicável)
- Notas de produção
- Histórico de mudanças

---

### **PÁGINA 4: VISÃO DO CLIENTE (Melhorar Existente)**

**Rota:** `/my-orders` (cliente)

**Adicionar:**

**A) RASTREAMENTO VISUAL**

```
Seu Pedido #12345

[●━━━━━━━━━━] Pagamento Aprovado ✅
[━●━━━━━━━━━] Aguardando sua escolha ⏳
[━━━━━━━━━━━] Em produção
[━━━━━━━━━━━] Enviado
[━━━━━━━━━━━] Entregue
```

**B) AÇÕES DO CLIENTE**

- 🎨 **Escolher Personagem** (se ainda não escolheu)
- ✏️ **Alterar Escolha** (se dentro do prazo)
- 📸 **Ver Prévia** (se disponível)
- 💬 **Mensagem para Produção** (pedidos especiais)
- 📦 **Rastrear Entrega**

**C) ESTIMATIVAS**

- ⏱️ Tempo estimado para produção: 5-7 dias
- 📅 Previsão de envio: 15/03/2026
- 🚚 Previsão de entrega: 20/03/2026

---

## MELHORIAS TÉCNICAS NECESSÁRIAS

### **1. NOVA TABELA: `production_queue`**

```sql
CREATE TABLE production_queue (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES subscription_deliveries(id),
  order_type TEXT, -- 'subscription' | 'standalone'

  -- Status de produção
  production_status TEXT, -- 'awaiting_choice' | 'design' | 'production' | 'packaging' | 'shipped'

  -- Escolha do cliente
  character_choice_status TEXT, -- 'pending' | 'chosen' | 'approved' | 'locked'
  chosen_character_id UUID,
  choice_deadline TIMESTAMP,
  choice_made_at TIMESTAMP,

  -- Produção
  production_started_at TIMESTAMP,
  production_completed_at TIMESTAMP,
  assigned_to_user_id UUID, -- Quem está produzindo
  estimated_completion_date DATE,

  -- Prioridade
  priority INTEGER DEFAULT 0, -- 0=normal, 1=urgente, 2=crítico

  -- Notas
  production_notes TEXT,
  customer_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **2. NOVA TABELA: `character_choices`**

```sql
CREATE TABLE character_choices (
  id UUID PRIMARY KEY,
  order_id UUID,
  user_id UUID,
  collection_id UUID,

  -- Escolha
  character_id UUID,
  character_name TEXT,
  character_image_url TEXT,

  -- Status
  status TEXT, -- 'pending' | 'submitted' | 'approved' | 'rejected' | 'locked'

  -- Datas
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID,
  deadline TIMESTAMP,

  -- Histórico
  previous_choice_id UUID, -- Se trocou
  change_reason TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### **3. NOVA TABELA: `production_stages`**

```sql
CREATE TABLE production_stages (
  id UUID PRIMARY KEY,
  production_queue_id UUID REFERENCES production_queue(id),

  stage_name TEXT, -- 'design' | 'production' | 'packaging' | 'shipping'
  status TEXT, -- 'pending' | 'in_progress' | 'completed' | 'blocked'

  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  assigned_to UUID,

  -- Evidências
  photos JSONB, -- Array de URLs de fotos
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## FUNCIONALIDADES ADICIONAIS CRÍTICAS

### **1. NOTIFICAÇÕES AUTOMÁTICAS**

- ⏰ Cliente não escolheu em 24h → Enviar lembrete
- ⏰ Prazo de escolha expirando → Notificar cliente E admin
- ⏰ Produção atrasada → Alertar admin
- ✅ Cada etapa concluída → Notificar cliente

### **2. RELATÓRIOS E ANALYTICS**

- 📊 Tempo médio por etapa de produção
- 📊 Taxa de escolha no prazo
- 📊 Gargalos de produção
- 📊 Satisfação por coleção
- 📊 Previsão de demanda

### **3. INTEGRAÇÃO COM ESTOQUE**

- ⚠️ Alertar se personagem escolhido está em falta
- 🔄 Sugerir alternativas automaticamente
- 📦 Reservar itens quando escolha é feita

### **4. COMUNICAÇÃO CLIENTE-PRODUÇÃO**

- 💬 Chat direto no pedido
- 📸 Cliente pode enviar referências
- ✅ Admin pode pedir aprovação de mockup

---

## PRIORIZAÇÃO DE IMPLEMENTAÇÃO

### **FASE 1 - CRÍTICO (Implementar AGORA)**

1. ✅ Dashboard de Produção básico
2. ✅ Tabela `production_queue`
3. ✅ Gestão de escolhas do cliente
4. ✅ Notificações de prazo

### **FASE 2 - IMPORTANTE (Próximas 2 semanas)**

1. Kanban board completo
2. Rastreamento visual para cliente
3. Sistema de priorização
4. Relatórios básicos

### **FASE 3 - DESEJÁVEL (Próximo mês)**

1. Chat cliente-produção
2. Upload de fotos de progresso
3. Analytics avançado
4. Integração com estoque

---

## CONCLUSÃO

O sistema atual está **INCOMPLETO** para operação profissional. Falta:

1. ❌ **Visão operacional** - Admin não sabe o que fazer hoje
2. ❌ **Gestão de escolhas** - Processo manual e confuso
3. ❌ **Rastreabilidade** - Cliente no escuro sobre seu pedido
4. ❌ **Automação** - Muita coisa manual que deveria ser automática

**Recomendação:** Implementar FASE 1 imediatamente antes de escalar operação.
