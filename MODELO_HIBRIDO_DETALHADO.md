# Modelo Híbrido - Detalhamento Completo

## 🎯 Conceito Central

O modelo híbrido combina:
- ✅ **Flexibilidade do sistema Coins** (cliente escolhe o que quer)
- ✅ **Estrutura do sistema Legado** (cronograma mensal previsível)
- ✅ **Preços contextuais** (baseados em coleção principal)

---

## 📖 EXEMPLO PRÁTICO: Jornada do Cliente

### Cenário: João quer assinar o plano Trimestral

#### PASSO 1: Escolha do Plano
```
João acessa: /planos

Vê 3 opções:
┌─────────────────────────────────────┐
│ 💎 PLANO TRIMESTRAL                 │
│ R$ 1.350 (R$ 1.282,50 no PIX)      │
│                                     │
│ 🪙 600 coins                        │
│ ≈ 3 personagens da coleção ativa   │
│                                     │
│ [Assinar Agora]                     │
└─────────────────────────────────────┘

João clica em "Assinar Agora"
```

#### PASSO 2: Escolha da Coleção Principal
```
João é redirecionado para: /assinar/escolher-colecao

Vê todas as coleções disponíveis:
┌─────────────────────────────────────┐
│ ⭐ NARUTO (Coleção Ativa)           │
│ Personagens: 200 coins cada         │
│ [Escolher como Principal]           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔥 DRAGON BALL (Coleção Secundária) │
│ Personagens: 240 coins cada         │
│ [Escolher como Principal]           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🦸 MARVEL (Catálogo Geral)          │
│ Personagens: 300 coins cada         │
│ [Escolher como Principal]           │
└─────────────────────────────────────┘

João escolhe NARUTO como coleção principal
```

**O QUE ACONTECE NO BANCO:**
```sql
INSERT INTO subscriptions (
  user_id,
  plan_id,
  plan_type,
  primary_collection_id,  -- ← NOVO: Naruto
  coins_balance,          -- ← NOVO: 600
  status
) VALUES (
  'joao-id',
  'trimestral-id',
  'trimestral',
  'naruto-id',
  600,
  'active'
);

-- Adiciona coins ao saldo do usuário
INSERT INTO user_coins (
  user_id,
  balance,
  total_earned
) VALUES (
  'joao-id',
  600,
  600
);
```

#### PASSO 3: Pagamento
```
João confirma pagamento via PIX: R$ 1.282,50
Sistema ativa assinatura
```

#### PASSO 4: Escolha de Personagens
```
João acessa: /catalogo

Vê o catálogo com PREÇOS CONTEXTUAIS:

┌─────────────────────────────────────┐
│ 💰 Seu Saldo: 600 coins             │
│ 🎯 Coleção Principal: Naruto        │
└─────────────────────────────────────┘

PERSONAGENS NARUTO (Coleção Ativa):
┌─────────────────────────────────────┐
│ 🥷 Naruto Uzumaki                   │
│ 💰 200 coins (Coleção Ativa)        │
│ ✅ Disponível                        │
│ [Escolher para Março]               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🦊 Sasuke Uchiha                    │
│ 💰 200 coins (Coleção Ativa)        │
│ ✅ Disponível                        │
│ [Escolher para Abril]               │
└─────────────────────────────────────┘

PERSONAGENS DRAGON BALL (Coleção Secundária):
┌─────────────────────────────────────┐
│ 🐉 Goku                             │
│ 💰 240 coins (Coleção Secundária)   │
│ ⚠️ Mais caro (não é sua principal)  │
│ [Escolher para Maio]                │
└─────────────────────────────────────┘

João escolhe:
- Março: Naruto (200 coins)
- Abril: Sasuke (200 coins)
- Maio: Goku (240 coins)

Total gasto: 640 coins
Saldo restante: -40 coins ❌ ERRO!
```

**SISTEMA ALERTA:**
```
⚠️ Saldo insuficiente!
Você tem 600 coins, mas selecionou 640 coins.

Opções:
1. Remover Goku (240 coins) e escolher outro Naruto (200 coins)
2. Comprar 40 coins avulsos (R$ 20)
3. Deixar Maio sem escolha (sistema escolhe automaticamente)
```

João remove Goku e escolhe Kakashi (Naruto, 200 coins):
```
✅ Escolhas confirmadas:
- Março: Naruto (200 coins)
- Abril: Sasuke (200 coins)
- Maio: Kakashi (200 coins)

Total: 600 coins
Saldo restante: 0 coins
```

**O QUE ACONTECE NO BANCO:**
```sql
-- Registra escolhas
INSERT INTO subscription_character_selections (
  subscription_id,
  character_id,
  cycle_id,
  coins_spent,
  delivery_month,
  status
) VALUES
  ('joao-sub-id', 'naruto-id', 'cycle-mar', 200, '2026-03', 'confirmed'),
  ('joao-sub-id', 'sasuke-id', 'cycle-abr', 200, '2026-04', 'confirmed'),
  ('joao-sub-id', 'kakashi-id', 'cycle-mai', 200, '2026-05', 'confirmed');

-- Atualiza saldo
UPDATE subscriptions 
SET coins_balance = 0 
WHERE id = 'joao-sub-id';

UPDATE user_coins 
SET balance = 0, total_spent = 600 
WHERE user_id = 'joao-id';
```

#### PASSO 5: Cronograma de Produção
```
João acessa: /painel-assinante

Vê seu cronograma:

┌─────────────────────────────────────┐
│ 📅 MARÇO 2026                       │
│ 🥷 Naruto Uzumaki                   │
│ 📦 Status: Em Produção              │
│ 🚚 Previsão: 05/04/2026             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📅 ABRIL 2026                       │
│ 🦊 Sasuke Uchiha                    │
│ 📦 Status: Agendado                 │
│ 🚚 Previsão: 05/05/2026             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📅 MAIO 2026                        │
│ 👁️ Kakashi Hatake                   │
│ 📦 Status: Agendado                 │
│ 🚚 Previsão: 05/06/2026             │
└─────────────────────────────────────┘
```

#### PASSO 6: Mudança de Ideia (Antes do Prazo)
```
Dia 10 de Março (antes do dia 15):

João decide trocar Kakashi por Itachi:

João acessa: /painel-assinante
Clica em "Trocar Personagem" (Maio)

Sistema mostra:
┌─────────────────────────────────────┐
│ ⚠️ Trocar Personagem de Maio        │
│                                     │
│ Atual: Kakashi (200 coins)         │
│ Novo: Itachi (200 coins)           │
│                                     │
│ Diferença: 0 coins                 │
│                                     │
│ [Confirmar Troca]                   │
└─────────────────────────────────────┘

✅ Troca confirmada!
```

**O QUE ACONTECE NO BANCO:**
```sql
UPDATE subscription_character_selections
SET 
  character_id = 'itachi-id',
  updated_at = NOW()
WHERE 
  subscription_id = 'joao-sub-id' 
  AND delivery_month = '2026-05';
```

#### PASSO 7: Não Escolheu a Tempo (Escolha Automática)
```
Cenário alternativo: João não escolheu nada até dia 15

Sistema executa automaticamente:

DIA 16 DE MARÇO:
┌─────────────────────────────────────┐
│ 🤖 ESCOLHA AUTOMÁTICA               │
│                                     │
│ Você não escolheu personagens até  │
│ o prazo (15/03).                   │
│                                     │
│ Sistema escolheu automaticamente:   │
│ - Março: Naruto (200 coins)        │
│ - Abril: Sasuke (200 coins)        │
│ - Maio: Kakashi (200 coins)        │
│                                     │
│ Todos da sua coleção principal     │
│ (Naruto).                          │
│                                     │
│ Você pode trocar até 15/04 para    │
│ os meses seguintes.                │
└─────────────────────────────────────┘
```

**O QUE ACONTECE NO BANCO:**
```sql
-- Sistema escolhe automaticamente os 3 primeiros personagens
-- da coleção principal (Naruto) que ainda não foram entregues

INSERT INTO subscription_character_selections (
  subscription_id,
  character_id,
  cycle_id,
  coins_spent,
  delivery_month,
  status,
  auto_selected  -- ← NOVO: Flag de escolha automática
) 
SELECT 
  'joao-sub-id',
  cc.id,
  cycle.id,
  200,
  cycle.delivery_month,
  'confirmed',
  true
FROM collection_characters cc
JOIN production_cycles cycle ON cycle.delivery_month IN ('2026-03', '2026-04', '2026-05')
WHERE cc.collection_id = 'naruto-id'
  AND cc.status = 'active'
ORDER BY cc.release_order
LIMIT 3;
```

---

## 🔄 FLUXO MENSAL COMPLETO

### Linha do Tempo

```
DIA 1-15: PERÍODO DE ESCOLHA
├─ Cliente pode escolher personagens
├─ Cliente pode trocar escolhas
├─ Cliente pode mudar coleção principal
└─ Sistema envia lembretes (dia 10, 13, 14)

DIA 15 23:59: PRAZO LIMITE
└─ Sistema fecha escolhas

DIA 16: ESCOLHA AUTOMÁTICA
├─ Para quem não escolheu
└─ Sistema escolhe da coleção principal

DIA 16-20: PREPARAÇÃO DE PRODUÇÃO
├─ Sistema gera lista de produção
├─ Admin revisa e confirma
└─ Materiais são separados

DIA 21-30: PRODUÇÃO
├─ Peças são produzidas
├─ Fotos são tiradas
└─ Cliente acompanha progresso

DIA 1-5 (MÊS SEGUINTE): ENVIO
├─ Peças são embaladas
├─ Código de rastreio gerado
└─ Cliente recebe notificação

DIA 6-20: ENTREGA
└─ Cliente recebe em casa
```

---

## 💰 SISTEMA DE PREÇOS CONTEXTUAIS

### Como Funciona

```
Cliente escolhe COLEÇÃO PRINCIPAL: Naruto

TABELA DE PREÇOS:
┌──────────────────────┬─────────────┬──────────────┐
│ Tipo                 │ Coleção     │ Preço        │
├──────────────────────┼─────────────┼──────────────┤
│ Coleção Ativa        │ Naruto      │ 200 coins ✅ │
│ Coleção Secundária   │ Dragon Ball │ 240 coins    │
│ Catálogo Geral       │ Marvel      │ 300 coins    │
│ Premium              │ One Piece   │ 450 coins    │
└──────────────────────┴─────────────┴──────────────┘

EXEMPLOS DE COMPRA:

Opção 1: Só da coleção principal
- Naruto (200) + Sasuke (200) + Kakashi (200) = 600 coins ✅

Opção 2: Mix de coleções
- Naruto (200) + Goku (240) + Vegeta (240) = 680 coins ❌
  → Precisa comprar 80 coins extras

Opção 3: Premium
- Naruto (200) + Luffy Premium (450) = 650 coins ❌
  → Precisa comprar 50 coins extras
  → OU escolher 2 Narutos (400 coins) e sobram 200 coins
```

### Função no Banco (Já Existe!)

```sql
-- Função get_collection_price() já implementada
SELECT get_collection_price(
  'naruto-character-id',  -- ID do personagem
  'naruto-id'             -- ID da coleção principal do cliente
);

-- Retorna:
-- 200 (se personagem é da coleção principal)
-- 240 (se personagem é de coleção secundária)
-- 300 (se personagem é de catálogo geral)
-- 450 (se personagem é premium)
```

---

## 🔄 MUDANÇA DE COLEÇÃO PRINCIPAL

### Cenário: João quer mudar de Naruto para Dragon Ball

```
João acessa: /painel-assinante
Clica em "Mudar Coleção Principal"

Sistema mostra:
┌─────────────────────────────────────┐
│ ⚠️ MUDAR COLEÇÃO PRINCIPAL          │
│                                     │
│ Atual: Naruto                       │
│ Nova: Dragon Ball                   │
│                                     │
│ IMPACTO NOS PREÇOS:                 │
│                                     │
│ Personagens Naruto:                 │
│ 200 coins → 240 coins (+40)        │
│                                     │
│ Personagens Dragon Ball:            │
│ 240 coins → 200 coins (-40)        │
│                                     │
│ SUAS ESCOLHAS FUTURAS:              │
│ - Maio: Kakashi (Naruto)           │
│   Preço atual: 200 coins           │
│   Novo preço: 240 coins (+40)      │
│                                     │
│ ⚠️ Você precisará de 40 coins extras│
│                                     │
│ Opções:                             │
│ 1. Comprar 40 coins (R$ 20)        │
│ 2. Trocar Kakashi por Goku (DB)    │
│ 3. Cancelar mudança                 │
│                                     │
│ [Confirmar] [Cancelar]              │
└─────────────────────────────────────┘
```

**O QUE ACONTECE NO BANCO:**
```sql
-- Atualiza coleção principal
UPDATE subscriptions
SET 
  primary_collection_id = 'dragon-ball-id',
  updated_at = NOW()
WHERE id = 'joao-sub-id';

-- Recalcula preços das escolhas futuras
UPDATE subscription_character_selections scs
SET coins_spent = get_collection_price(scs.character_id, 'dragon-ball-id')
WHERE 
  subscription_id = 'joao-sub-id'
  AND status = 'confirmed'
  AND delivery_month >= '2026-05';  -- Apenas futuras

-- Atualiza saldo
UPDATE subscriptions
SET coins_balance = (
  SELECT 600 - SUM(coins_spent)
  FROM subscription_character_selections
  WHERE subscription_id = 'joao-sub-id'
)
WHERE id = 'joao-sub-id';
```

---

## 📊 COMPARAÇÃO: Legado vs Híbrido

### Sistema Legado (Atual)
```
1. Cliente escolhe: Coleção Naruto
2. Sistema entrega: Personagem SURPRESA de Naruto
3. Cliente pode: Trocar de coleção (até dia 15)
4. Cliente NÃO pode: Escolher personagem específico
5. Preço: Fixo por plano
```

### Sistema Híbrido (Proposto)
```
1. Cliente escolhe: Coleção PRINCIPAL (Naruto)
2. Cliente escolhe: Personagens ESPECÍFICOS (Naruto, Sasuke, Kakashi)
3. Cliente pode: Escolher de QUALQUER coleção (com preços diferentes)
4. Cliente pode: Trocar personagens (até dia 15)
5. Cliente pode: Trocar coleção principal (recalcula preços)
6. Preço: Contextual (baseado em coleção principal)
```

### Exemplo Prático

**LEGADO:**
```
João assina Trimestral + Naruto
→ Março: Recebe Naruto (surpresa)
→ Abril: Recebe Sasuke (surpresa)
→ Maio: Recebe Kakashi (surpresa)

Se João quiser Goku, precisa:
1. Trocar coleção para Dragon Ball (até dia 15)
2. Receber personagem SURPRESA de Dragon Ball
3. Torcer para ser Goku
```

**HÍBRIDO:**
```
João assina Trimestral + Naruto (principal)
→ Março: João ESCOLHE Naruto (200 coins)
→ Abril: João ESCOLHE Goku (240 coins)
→ Maio: João ESCOLHE Kakashi (200 coins)

Total: 640 coins
Saldo: 600 coins
Faltam: 40 coins

João compra 40 coins avulsos (R$ 20)
✅ Confirmado!
```

---

## 🎯 VANTAGENS DO MODELO HÍBRIDO

### Para o Cliente
1. ✅ **Escolhe o que quer** (não é surpresa)
2. ✅ **Flexibilidade total** (pode misturar coleções)
3. ✅ **Preços justos** (paga menos pela coleção principal)
4. ✅ **Controle do saldo** (vê quanto tem e quanto gasta)
5. ✅ **Pode complementar** (compra coins extras se quiser)

### Para o Negócio
1. ✅ **Cronograma previsível** (1 personagem/mês)
2. ✅ **Produção organizada** (sabe o que produzir com antecedência)
3. ✅ **Upsell natural** (cliente quer personagem caro, compra coins)
4. ✅ **Fidelização** (cliente escolhe coleção principal, cria vínculo)
5. ✅ **Dados melhores** (sabe quais personagens são mais populares)

### Para a Operação
1. ✅ **Menos surpresas** (cliente escolheu, não reclama)
2. ✅ **Menos trocas** (cliente já escolheu o que quer)
3. ✅ **Menos suporte** (menos dúvidas sobre "qual personagem vou receber?")
4. ✅ **Mais previsibilidade** (sabe exatamente o que produzir)

---

## 🔧 IMPLEMENTAÇÃO TÉCNICA

### Banco de Dados

```sql
-- 1. Atualizar tabela subscriptions
ALTER TABLE subscriptions 
ADD COLUMN primary_collection_id UUID REFERENCES collections(id),
ADD COLUMN coins_balance INTEGER DEFAULT 0;

-- 2. Criar tabela de escolhas
CREATE TABLE subscription_character_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),
  character_id UUID REFERENCES collection_characters(id),
  cycle_id UUID REFERENCES production_cycles(id),
  coins_spent INTEGER NOT NULL,
  delivery_month TEXT NOT NULL,  -- '2026-03'
  status TEXT DEFAULT 'confirmed',  -- confirmed, produced, delivered
  auto_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Criar índices
CREATE INDEX idx_selections_subscription ON subscription_character_selections(subscription_id);
CREATE INDEX idx_selections_delivery ON subscription_character_selections(delivery_month);
CREATE INDEX idx_selections_status ON subscription_character_selections(status);
```

### Interface

```typescript
// 1. Página de escolha de coleção principal
/assinar/escolher-colecao
→ Componente: PrimaryCollectionSelector

// 2. Catálogo com preços contextuais
/catalogo
→ Componente: CharacterCatalogWithContextualPricing
→ Mostra preço baseado em primary_collection_id

// 3. Dashboard unificado
/painel-assinante
→ Componente: SubscriberDashboardUnified
→ Mostra: saldo, coleção principal, escolhas, cronograma

// 4. Página de escolha de personagens
/escolher-personagens
→ Componente: CharacterSelectionForCycle
→ Permite escolher personagens para próximos meses
```

---

## 📝 RESUMO FINAL

O modelo híbrido é:
- ✅ **Flexível** como o sistema de coins
- ✅ **Estruturado** como o sistema legado
- ✅ **Justo** com preços contextuais
- ✅ **Previsível** com cronograma mensal
- ✅ **Escalável** para crescimento futuro

**É exatamente o que você descreveu:**
1. Cliente assina → Recebe coins
2. Escolhe coleção principal → Define preços
3. Escolhe personagens → Usa coins
4. Produção mensal → 1 personagem/mês
5. Preços contextuais → Baseados em coleção principal

**Próximo passo:** Confirmar se é isso que você quer e começar implementação.
