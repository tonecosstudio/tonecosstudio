# Sistema de Alertas de Saldo

## 🎯 OBJETIVO

Avisar o cliente ANTES de escolher um personagem de outra coleção, mostrando:
- Quanto vai gastar
- Quanto vai sobrar
- Se vai faltar saldo para os próximos meses

---

## 🚨 TIPOS DE ALERTAS

### 1. Alerta de Diferença de Preço

Quando cliente clica em personagem de outra coleção:

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ ATENÇÃO: PERSONAGEM DE OUTRA COLEÇÃO            │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Você está escolhendo um personagem que NÃO é da    │
│ sua coleção ativa (Naruto).                        │
│                                                     │
│ 🐉 GOKU (Coleção Dragon Ball)                      │
│                                                     │
│ 💰 COMPARAÇÃO DE PREÇOS:                           │
│ ├─ Coleção Ativa (Naruto): 200 coins ✅           │
│ └─ Este personagem (Dragon Ball): 240 coins ⚠️    │
│                                                     │
│ 📊 DIFERENÇA: +40 coins                            │
│                                                     │
│ 💳 IMPACTO NO SEU SALDO:                           │
│ ├─ Saldo atual: 400 coins                         │
│ ├─ Custo deste personagem: 240 coins              │
│ └─ Saldo após escolha: 160 coins                  │
│                                                     │
│ ⚠️ ATENÇÃO: Com 160 coins restantes, você só      │
│ poderá escolher personagens de até 160 coins      │
│ nos próximos meses!                                │
│                                                     │
│ 📋 OPÇÕES DISPONÍVEIS COM 160 COINS:              │
│ ❌ Personagens da coleção ativa (200 coins)       │
│ ❌ Personagens de outras coleções (240+ coins)    │
│                                                     │
│ 💡 SUGESTÕES:                                      │
│ 1. Escolher Sasuke (Naruto, 200 coins)            │
│    → Sobraria: 200 coins para o próximo mês       │
│                                                     │
│ 2. Continuar com Goku (240 coins)                 │
│    → Você precisará comprar coins extras depois   │
│                                                     │
│ [Voltar] [Continuar Mesmo Assim]                   │
└─────────────────────────────────────────────────────┘
```

### 2. Alerta de Saldo Insuficiente Futuro

Quando escolha atual deixa saldo insuficiente para próximos meses:

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ AVISO: SALDO PODE SER INSUFICIENTE              │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Se você escolher este personagem:                  │
│                                                     │
│ 🐉 GOKU (240 coins)                                │
│                                                     │
│ 📊 SIMULAÇÃO DO SEU SALDO:                         │
│                                                     │
│ Saldo inicial: 600 coins                           │
│                                                     │
│ ✅ Março: Naruto (200 coins)                       │
│    Saldo após: 400 coins                           │
│                                                     │
│ ⚠️ Abril: Goku (240 coins) ← VOCÊ ESTÁ AQUI       │
│    Saldo após: 160 coins                           │
│                                                     │
│ ❌ Maio: ??? (mínimo 200 coins)                    │
│    Saldo disponível: 160 coins                     │
│    Faltarão: 40 coins                              │
│                                                     │
│ 💡 VOCÊ PRECISARÁ:                                 │
│ • Comprar 40 coins extras (R$ 20) em Maio         │
│ • OU escolher personagem mais barato (não existe)  │
│ • OU refazer suas escolhas anteriores              │
│                                                     │
│ 🎯 RECOMENDAÇÃO:                                   │
│ Escolha Sasuke (Naruto, 200 coins) ao invés de    │
│ Goku para garantir saldo suficiente em Maio.      │
│                                                     │
│ [Voltar] [Escolher Sasuke] [Continuar com Goku]   │
└─────────────────────────────────────────────────────┘
```

### 3. Alerta de Saldo Crítico

Quando saldo está muito baixo:

```
┌─────────────────────────────────────────────────────┐
│ 🚨 SALDO CRÍTICO                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Seu saldo está muito baixo!                        │
│                                                     │
│ 💰 Saldo atual: 160 coins                          │
│ 📅 Meses restantes: 1 (Maio)                       │
│                                                     │
│ ⚠️ PROBLEMA:                                        │
│ Nenhum personagem disponível custa 160 coins       │
│ ou menos!                                           │
│                                                     │
│ 📋 PERSONAGENS DISPONÍVEIS EM MAIO:                │
│                                                     │
│ ❌ Kakashi (Naruto - Ativa)                        │
│    Custo: 200 coins                                │
│    Faltam: 40 coins                                │
│                                                     │
│ ❌ Piccolo (Dragon Ball - Secundária)              │
│    Custo: 240 coins                                │
│    Faltam: 80 coins                                │
│                                                     │
│ ❌ Capitão América (Marvel - Geral)                │
│    Custo: 300 coins                                │
│    Faltam: 140 coins                               │
│                                                     │
│ 💡 SOLUÇÕES:                                        │
│                                                     │
│ 1️⃣ COMPRAR COINS EXTRAS                            │
│    • 40 coins (R$ 20) → Escolher Kakashi          │
│    • 80 coins (R$ 40) → Escolher Piccolo          │
│    • 140 coins (R$ 70) → Escolher Capitão América │
│    [Comprar Coins]                                 │
│                                                     │
│ 2️⃣ REFAZER ESCOLHAS ANTERIORES                     │
│    Volte e troque suas escolhas de Março/Abril    │
│    para economizar coins.                          │
│    [Refazer Escolhas]                              │
│                                                     │
│ 3️⃣ PULAR ESTE MÊS                                  │
│    Você pode não escolher nada em Maio e usar     │
│    os 160 coins no próximo ciclo.                 │
│    [Pular Maio]                                    │
│                                                     │
│ [Voltar]                                            │
└─────────────────────────────────────────────────────┘
```

### 4. Alerta de Confirmação com Resumo

Antes de confirmar escolha de outra coleção:

```
┌─────────────────────────────────────────────────────┐
│ ✅ CONFIRMAR ESCOLHA                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Você está prestes a escolher:                      │
│                                                     │
│ 🐉 GOKU (Coleção Dragon Ball)                      │
│ 💰 Custo: 240 coins                                │
│                                                     │
│ 📊 RESUMO DO IMPACTO:                              │
│                                                     │
│ Saldo antes: 400 coins                             │
│ Custo: -240 coins                                  │
│ Saldo depois: 160 coins                            │
│                                                     │
│ ⚠️ DIFERENÇA vs COLEÇÃO ATIVA:                     │
│ • Personagem da coleção ativa custaria: 200 coins │
│ • Este personagem custa: 240 coins                │
│ • Você está pagando: +40 coins a mais             │
│                                                     │
│ 📅 IMPACTO NOS PRÓXIMOS MESES:                     │
│                                                     │
│ ✅ Março: Naruto (200 coins) - Confirmado         │
│ ⚠️ Abril: Goku (240 coins) - VOCÊ ESTÁ AQUI       │
│ ❌ Maio: Saldo insuficiente (160 coins)           │
│                                                     │
│ 💡 LEMBRE-SE:                                      │
│ Você precisará comprar 40 coins extras (R$ 20)    │
│ para escolher um personagem em Maio.              │
│                                                     │
│ Tem certeza que deseja continuar?                 │
│                                                     │
│ [Cancelar] [Confirmar Escolha]                     │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 INTERFACE VISUAL

### Card de Personagem com Alertas

```
┌─────────────────────────────────────┐
│ 🐉 GOKU                             │
│ Coleção: Dragon Ball                │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⚠️ NÃO É SUA COLEÇÃO ATIVA      │ │
│ │                                 │ │
│ │ 💰 240 coins                    │ │
│ │ 📊 +40 coins vs ativa (200)     │ │
│ │                                 │ │
│ │ Saldo após: 160 coins           │ │
│ │ ⚠️ Pode faltar para próximo mês │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Ver Detalhes] [Escolher]           │
└─────────────────────────────────────┘

vs

┌─────────────────────────────────────┐
│ 🥷 NARUTO                           │
│ Coleção: Naruto (Ativa)             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ✅ SUA COLEÇÃO ATIVA            │ │
│ │                                 │ │
│ │ 💰 200 coins                    │ │
│ │ 📊 Preço prioritário            │ │
│ │                                 │ │
│ │ Saldo após: 200 coins           │ │
│ │ ✅ Suficiente para próximo mês  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Ver Detalhes] [Escolher]           │
└─────────────────────────────────────┘
```

### Barra de Saldo com Alertas

```
┌─────────────────────────────────────────────────────┐
│ 💰 SEU SALDO                                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Saldo atual: 400 coins                             │
│                                                     │
│ ████████████████░░░░░░░░░░░░░░░░░░░░ 66%          │
│                                                     │
│ ✅ Março: Naruto (200 coins) - Confirmado         │
│ ⏳ Abril: Aguardando escolha                       │
│ ⏳ Maio: Aguardando escolha                        │
│                                                     │
│ 💡 DICA: Com 400 coins você pode escolher:        │
│ • 2 personagens da coleção ativa (200 cada)       │
│ • 1 personagem ativa + 1 secundária (200 + 240)   │
│ • 1 personagem geral + sobra 100 coins (300)      │
│                                                     │
└─────────────────────────────────────────────────────┘

Quando saldo fica crítico:

┌─────────────────────────────────────────────────────┐
│ 💰 SEU SALDO                                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Saldo atual: 160 coins                             │
│                                                     │
│ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 26% ⚠️       │
│                                                     │
│ ✅ Março: Naruto (200 coins) - Confirmado         │
│ ✅ Abril: Goku (240 coins) - Confirmado           │
│ ❌ Maio: Saldo insuficiente                        │
│                                                     │
│ ⚠️ ATENÇÃO: Saldo baixo!                           │
│ Você precisará comprar coins extras para Maio.    │
│                                                     │
│ [Comprar Coins] [Refazer Escolhas]                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔔 NOTIFICAÇÕES E LEMBRETES

### 1. Notificação ao Escolher Outra Coleção

```
Toast/Snackbar:
┌─────────────────────────────────────┐
│ ⚠️ Personagem de outra coleção      │
│                                     │
│ Goku custa 240 coins (+40 vs ativa)│
│ Saldo após: 160 coins               │
│                                     │
│ [Ver Detalhes]                      │
└─────────────────────────────────────┘
```

### 2. Notificação de Saldo Baixo

```
Toast/Snackbar:
┌─────────────────────────────────────┐
│ 🚨 Saldo baixo!                     │
│                                     │
│ Você tem 160 coins restantes.      │
│ Pode não ser suficiente para Maio. │
│                                     │
│ [Comprar Coins] [Ver Opções]        │
└─────────────────────────────────────┘
```

### 3. Email/SMS de Lembrete

```
Assunto: ⚠️ Saldo baixo na sua assinatura Ordax

Olá João!

Notamos que seu saldo de coins está baixo:

💰 Saldo atual: 160 coins
📅 Mês restante: Maio

⚠️ ATENÇÃO: Você pode não ter coins suficientes 
para escolher um personagem em Maio.

Personagens disponíveis em Maio:
• Kakashi (Naruto): 200 coins - Faltam 40 coins
• Piccolo (Dragon Ball): 240 coins - Faltam 80 coins

💡 SOLUÇÕES:

1. Comprar coins extras
   → A partir de R$ 20 (40 coins)
   [Comprar Agora]

2. Refazer escolhas anteriores
   → Trocar Goku por Sasuke (economiza 40 coins)
   [Refazer Escolhas]

Qualquer dúvida, estamos à disposição!

Equipe Ordax
```

---

## 📊 CALCULADORA DE SALDO

### Ferramenta Interativa

```
┌─────────────────────────────────────────────────────┐
│ 🧮 CALCULADORA DE SALDO                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Simule suas escolhas e veja o impacto no saldo:   │
│                                                     │
│ Saldo inicial: 600 coins                           │
│                                                     │
│ MARÇO:                                             │
│ [Naruto (200) ▼] → Saldo: 400 coins ✅            │
│                                                     │
│ ABRIL:                                             │
│ [Goku (240) ▼] → Saldo: 160 coins ⚠️              │
│                                                     │
│ MAIO:                                              │
│ [Kakashi (200) ▼] → Saldo: -40 coins ❌           │
│                                                     │
│ ⚠️ RESULTADO:                                       │
│ Você precisará comprar 40 coins extras (R$ 20)    │
│                                                     │
│ 💡 SUGESTÃO AUTOMÁTICA:                            │
│ Trocar Goku por Sasuke economiza 40 coins         │
│ [Aplicar Sugestão]                                 │
│                                                     │
│ [Limpar] [Confirmar Escolhas]                      │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 REGRAS DE NEGÓCIO

### Quando Mostrar Alertas

```typescript
// 1. Alerta de diferença de preço
if (personagem.collection_id !== subscription.active_collection_id) {
  mostrarAlertaDiferencaPreco();
}

// 2. Alerta de saldo insuficiente futuro
const saldoAposEscolha = saldoAtual - personagem.preco;
const mesesRestantes = subscription.meses_restantes - 1;
const precoMinimoProximoMes = 200; // Preço da coleção ativa

if (saldoAposEscolha < (precoMinimoProximoMes * mesesRestantes)) {
  mostrarAlertaSaldoInsuficienteFuturo();
}

// 3. Alerta de saldo crítico
if (saldoAposEscolha < precoMinimoProximoMes) {
  mostrarAlertaSaldoCritico();
}

// 4. Confirmação obrigatória
if (personagem.collection_id !== subscription.active_collection_id) {
  exigirConfirmacao();
}
```

---

## ✅ RESUMO

### Alertas Implementados

1. ✅ **Alerta de Diferença de Preço**
   - Mostra quando personagem é de outra coleção
   - Compara preços (ativa vs escolhida)
   - Mostra impacto no saldo

2. ✅ **Alerta de Saldo Insuficiente Futuro**
   - Simula saldo após escolha
   - Avisa se vai faltar para próximos meses
   - Sugere alternativas

3. ✅ **Alerta de Saldo Crítico**
   - Mostra quando saldo está muito baixo
   - Lista opções de solução
   - Permite comprar coins ou refazer escolhas

4. ✅ **Confirmação Obrigatória**
   - Exige confirmação para outra coleção
   - Mostra resumo completo do impacto
   - Permite cancelar antes de confirmar

### Objetivo Alcançado

✅ Cliente sempre sabe quanto vai gastar
✅ Cliente sempre sabe quanto vai sobrar
✅ Cliente sempre sabe se vai faltar saldo
✅ Cliente pode tomar decisão informada
✅ Evita surpresas desagradáveis

---

Está perfeito agora? 🎯
