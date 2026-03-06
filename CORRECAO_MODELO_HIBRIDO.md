# Correção do Modelo Híbrido

## ❌ O QUE EU DESCREVI (ERRADO)

### Sistema de Escolha
```
Cliente acessa CATÁLOGO com TODOS os personagens disponíveis:

MARÇO:
- Naruto (200 coins) ✅
- Sasuke (200 coins) ✅
- Kakashi (200 coins) ✅
- Goku (240 coins) ✅
- Vegeta (240 coins) ✅
- Todos disponíveis ao mesmo tempo

Cliente escolhe LIVREMENTE:
- Março: Naruto
- Abril: Goku
- Maio: Vegeta
```

**PROBLEMA**: Isso é compra avulsa, não assinatura mensal!

---

## ✅ O QUE VOCÊ QUER (CORRETO)

### Sistema de Escolha Mensal

```
ASSINATURA (Coleções):
Cada coleção libera 1 personagem por mês

MARÇO 2026:
┌─────────────────────────────────────┐
│ Coleção Naruto                      │
│ Personagem do mês: Naruto Uzumaki   │
│ 200 coins (coleção ativa)          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Coleção Dragon Ball                 │
│ Personagem do mês: Goku             │
│ 240 coins (coleção secundária)     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Coleção Marvel                      │
│ Personagem do mês: Homem-Aranha     │
│ 300 coins (catálogo geral)         │
└─────────────────────────────────────┘

ABRIL 2026:
┌─────────────────────────────────────┐
│ Coleção Naruto                      │
│ Personagem do mês: Sasuke Uchiha    │
│ 200 coins (coleção ativa)          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Coleção Dragon Ball                 │
│ Personagem do mês: Vegeta           │
│ 240 coins (coleção secundária)     │
└─────────────────────────────────────┘

Cliente escolhe QUAL COLEÇÃO quer naquele mês, não qual personagem!
```

---

## 🔄 DIFERENÇAS FUNDAMENTAIS

### Modelo Errado (Que Descrevi)
| Aspecto | Como Funciona |
|---------|---------------|
| **Escolha** | Cliente escolhe PERSONAGEM específico |
| **Disponibilidade** | TODOS os personagens disponíveis sempre |
| **Flexibilidade** | Total (qualquer personagem, qualquer hora) |
| **Tipo** | Compra avulsa com coins |

### Modelo Correto (Que Você Quer)
| Aspecto | Como Funciona |
|---------|---------------|
| **Escolha** | Cliente escolhe COLEÇÃO do mês |
| **Disponibilidade** | 1 personagem por coleção por mês |
| **Flexibilidade** | Limitada (só o personagem do mês) |
| **Tipo** | Assinatura mensal com revelação |

---

## 📖 EXEMPLO PRÁTICO CORRIGIDO

### Cenário: João assina Trimestral (600 coins)

#### PASSO 1: Escolha da Coleção Principal
```
João escolhe: Naruto como coleção principal
→ Personagens de Naruto custam 200 coins
→ Personagens de outras coleções custam 240-450 coins
```

#### PASSO 2: Escolha Mensal (Março)
```
João acessa: /escolher-personagem-marco

Sistema mostra APENAS os personagens do mês de Março:

┌─────────────────────────────────────┐
│ 🥷 COLEÇÃO NARUTO                   │
│ Personagem de Março: Naruto Uzumaki│
│ 💰 200 coins (sua coleção ativa)    │
│ ✅ [Escolher para Março]            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🐉 COLEÇÃO DRAGON BALL              │
│ Personagem de Março: Goku           │
│ 💰 240 coins (coleção secundária)   │
│ ⚠️ +40 coins (não é sua principal)  │
│ [Escolher para Março]               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🦸 COLEÇÃO MARVEL                   │
│ Personagem de Março: Homem-Aranha   │
│ 💰 300 coins (catálogo geral)       │
│ ⚠️ +100 coins (não é sua principal) │
│ [Escolher para Março]               │
└─────────────────────────────────────┘

João escolhe: Naruto (200 coins)
Saldo restante: 400 coins
```

#### PASSO 3: Escolha Mensal (Abril)
```
João acessa: /escolher-personagem-abril

Sistema mostra APENAS os personagens do mês de Abril:

┌─────────────────────────────────────┐
│ 🥷 COLEÇÃO NARUTO                   │
│ Personagem de Abril: Sasuke Uchiha │
│ 💰 200 coins (sua coleção ativa)    │
│ [Escolher para Abril]               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🐉 COLEÇÃO DRAGON BALL              │
│ Personagem de Abril: Vegeta         │
│ 💰 240 coins (coleção secundária)   │
│ [Escolher para Abril]               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🦸 COLEÇÃO MARVEL                   │
│ Personagem de Abril: Homem de Ferro│
│ 💰 300 coins (catálogo geral)       │
│ [Escolher para Abril]               │
└─────────────────────────────────────┘

João escolhe: Vegeta (240 coins)
Saldo restante: 160 coins
```

#### PASSO 4: Escolha Mensal (Maio)
```
João acessa: /escolher-personagem-maio

Sistema mostra APENAS os personagens do mês de Maio:

┌─────────────────────────────────────┐
│ 🥷 COLEÇÃO NARUTO                   │
│ Personagem de Maio: Kakashi Hatake │
│ 💰 200 coins (sua coleção ativa)    │
│ [Escolher para Maio]                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🐉 COLEÇÃO DRAGON BALL              │
│ Personagem de Maio: Piccolo         │
│ 💰 240 coins (coleção secundária)   │
│ ⚠️ Saldo insuficiente (faltam 80)   │
│ [Comprar Coins] [Escolher Naruto]   │
└─────────────────────────────────────┘

João tem 160 coins, mas Piccolo custa 240 coins

Opções:
1. Escolher Kakashi (Naruto, 200 coins) ✅
2. Comprar 80 coins extras (R$ 40)

João escolhe: Kakashi (200 coins)
Saldo restante: -40 coins ❌

Sistema ajusta automaticamente:
Saldo final: 0 coins (sobram 40 coins para próximo mês)
```

---

## 🎯 DIFERENÇAS CHAVE

### 1. Disponibilidade de Personagens

**ERRADO (Que Descrevi):**
```
Catálogo sempre tem TODOS os personagens:
- Naruto ✅
- Sasuke ✅
- Kakashi ✅
- Itachi ✅
- Todos disponíveis ao mesmo tempo
```

**CORRETO (Que Você Quer):**
```
Cada mês tem 1 personagem por coleção:

MARÇO:
- Coleção Naruto → Naruto ✅
- Coleção Dragon Ball → Goku ✅
- Coleção Marvel → Homem-Aranha ✅

ABRIL:
- Coleção Naruto → Sasuke ✅
- Coleção Dragon Ball → Vegeta ✅
- Coleção Marvel → Homem de Ferro ✅

Cliente NÃO pode escolher Sasuke em Março!
Cliente NÃO pode escolher Naruto em Abril!
```

### 2. Tipo de Escolha

**ERRADO:**
```
Cliente escolhe: "Quero Naruto, Goku e Vegeta"
(escolha de PERSONAGENS)
```

**CORRETO:**
```
Cliente escolhe:
- Março: "Quero o personagem da coleção Naruto" → Recebe Naruto
- Abril: "Quero o personagem da coleção Dragon Ball" → Recebe Vegeta
- Maio: "Quero o personagem da coleção Naruto" → Recebe Kakashi

(escolha de COLEÇÕES, não personagens)
```

### 3. Catálogo vs Assinatura

**CATÁLOGO (Compra Avulsa):**
```
/catalogo
→ TODOS os personagens disponíveis
→ Cliente escolhe QUALQUER personagem
→ Paga R$ 500 por personagem (ou coins)
→ Recebe quando quiser
```

**ASSINATURA (Mensal):**
```
/escolher-personagem-[mes]
→ APENAS 1 personagem por coleção naquele mês
→ Cliente escolhe QUAL COLEÇÃO quer
→ Usa coins da assinatura
→ Recebe no cronograma mensal (1 por mês)
```

---

## 🗓️ CRONOGRAMA DE LANÇAMENTOS

### Como Funciona

```
ADMIN define cronograma de lançamentos:

COLEÇÃO NARUTO:
- Março 2026: Naruto Uzumaki
- Abril 2026: Sasuke Uchiha
- Maio 2026: Kakashi Hatake
- Junho 2026: Itachi Uchiha
- Julho 2026: Jiraiya
- ...

COLEÇÃO DRAGON BALL:
- Março 2026: Goku
- Abril 2026: Vegeta
- Maio 2026: Piccolo
- Junho 2026: Gohan
- Julho 2026: Trunks
- ...

COLEÇÃO MARVEL:
- Março 2026: Homem-Aranha
- Abril 2026: Homem de Ferro
- Maio 2026: Capitão América
- Junho 2026: Thor
- Julho 2026: Hulk
- ...
```

### Banco de Dados

```sql
-- Nova tabela: collection_monthly_releases
CREATE TABLE collection_monthly_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id),
  character_id UUID REFERENCES collection_characters(id),
  release_month TEXT NOT NULL,  -- '2026-03'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exemplo de dados:
INSERT INTO collection_monthly_releases VALUES
  ('...', 'naruto-id', 'naruto-char-id', '2026-03', true),
  ('...', 'naruto-id', 'sasuke-char-id', '2026-04', true),
  ('...', 'naruto-id', 'kakashi-char-id', '2026-05', true),
  ('...', 'dragon-ball-id', 'goku-char-id', '2026-03', true),
  ('...', 'dragon-ball-id', 'vegeta-char-id', '2026-04', true);
```

---

## 🔄 FLUXO CORRIGIDO

### Linha do Tempo Mensal

```
DIA 1: LANÇAMENTO DO MÊS
├─ Admin define personagens do mês
├─ Sistema libera escolhas
└─ Cliente vê opções disponíveis

DIA 1-15: PERÍODO DE ESCOLHA
├─ Cliente escolhe QUAL COLEÇÃO quer
├─ Cliente vê APENAS personagem do mês de cada coleção
├─ Cliente pode trocar escolha
└─ Sistema envia lembretes

DIA 15 23:59: PRAZO LIMITE
└─ Sistema fecha escolhas

DIA 16: ESCOLHA AUTOMÁTICA
├─ Para quem não escolheu
└─ Sistema escolhe da coleção principal

DIA 16-20: PREPARAÇÃO
├─ Sistema gera lista de produção
└─ Admin confirma

DIA 21-30: PRODUÇÃO
└─ Peças são produzidas

DIA 1-5 (MÊS SEGUINTE): ENVIO
└─ Peças são enviadas
```

---

## 📊 COMPARAÇÃO FINAL

| Aspecto | Modelo Errado | Modelo Correto |
|---------|---------------|----------------|
| **Disponibilidade** | Todos os personagens sempre | 1 personagem/coleção/mês |
| **Escolha** | Personagem específico | Coleção do mês |
| **Flexibilidade** | Total | Limitada ao mês |
| **Revelação** | Sem surpresa | Revelação mensal |
| **Tipo** | Compra avulsa | Assinatura mensal |
| **Catálogo** | Usado para assinatura | Usado para compra avulsa |

---

## 🎯 MUDANÇAS NECESSÁRIAS

### 1. Banco de Dados

**ADICIONAR:**
```sql
-- Tabela de lançamentos mensais
CREATE TABLE collection_monthly_releases (
  id UUID PRIMARY KEY,
  collection_id UUID REFERENCES collections(id),
  character_id UUID REFERENCES collection_characters(id),
  release_month TEXT NOT NULL,  -- '2026-03'
  is_active BOOLEAN DEFAULT true
);

-- Índice para busca rápida
CREATE INDEX idx_monthly_releases 
ON collection_monthly_releases(release_month, is_active);
```

### 2. Interface

**MUDAR:**
```
❌ /catalogo (para assinantes)
   → Mostrava todos os personagens
   → Cliente escolhia qualquer um

✅ /escolher-personagem-[mes] (para assinantes)
   → Mostra APENAS personagens do mês
   → Cliente escolhe QUAL COLEÇÃO quer

✅ /catalogo (para compra avulsa)
   → Mostra todos os personagens
   → Cliente paga R$ 500 por personagem
```

### 3. Lógica de Escolha

**MUDAR:**
```typescript
// ERRADO:
function getAvailableCharacters() {
  return allCharacters; // Todos disponíveis
}

// CORRETO:
function getAvailableCharactersForMonth(month: string) {
  return db.collection_monthly_releases
    .where('release_month', month)
    .where('is_active', true);
  // Apenas 1 por coleção naquele mês
}
```

### 4. Admin

**ADICIONAR:**
```
Nova página: /admin/monthly-releases

Permite admin definir:
- Qual personagem de cada coleção será lançado em cada mês
- Ordem de lançamento
- Ativar/desativar lançamentos
```

---

## ✅ RESUMO DAS CORREÇÕES

### O que eu entendi ERRADO:
1. ❌ Cliente escolhe personagem específico
2. ❌ Todos os personagens disponíveis sempre
3. ❌ Catálogo usado para assinatura
4. ❌ Flexibilidade total de escolha

### O que é CORRETO:
1. ✅ Cliente escolhe COLEÇÃO do mês
2. ✅ Apenas 1 personagem por coleção por mês
3. ✅ Catálogo usado para compra avulsa
4. ✅ Flexibilidade limitada (revelação mensal)

### Analogia:
```
ERRADO: Netflix (escolhe qualquer filme)
CORRETO: TV a cabo (escolhe qual canal assistir, mas o programa é o que está passando)
```

---

## 🎬 EXEMPLO FINAL CORRIGIDO

```
João assina Trimestral (600 coins) + Naruto (principal)

MARÇO:
Opções disponíveis:
- Naruto (coleção Naruto) → 200 coins
- Goku (coleção Dragon Ball) → 240 coins
- Homem-Aranha (coleção Marvel) → 300 coins

João escolhe: Naruto (200 coins)
Saldo: 400 coins

ABRIL:
Opções disponíveis:
- Sasuke (coleção Naruto) → 200 coins
- Vegeta (coleção Dragon Ball) → 240 coins
- Homem de Ferro (coleção Marvel) → 300 coins

João escolhe: Vegeta (240 coins)
Saldo: 160 coins

MAIO:
Opções disponíveis:
- Kakashi (coleção Naruto) → 200 coins
- Piccolo (coleção Dragon Ball) → 240 coins
- Capitão América (coleção Marvel) → 300 coins

João escolhe: Kakashi (200 coins)
Saldo: -40 coins ❌

Sistema ajusta: Sobram 40 coins para próximo mês
```

**João NÃO pode:**
- Escolher Sasuke em Março (só em Abril)
- Escolher Naruto em Abril (só em Março)
- Escolher 2 personagens de Naruto no mesmo mês

**João PODE:**
- Escolher personagens de coleções diferentes a cada mês
- Trocar escolha até dia 15
- Comprar coins extras se quiser personagem mais caro

---

Está correto agora?
