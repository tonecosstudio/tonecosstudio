# 📦 MODELO OPERACIONAL PADRÃO (RECORRENTE MENSAL)

**Data de Implementação:** 24/02/2026  
**Status:** ✅ IMPLEMENTADO

---

## 🔁 REGRA FIXA

O sistema opera com **2 CICLOS POR MÊS**, seguindo um padrão fixo e previsível:

### 🔹 CICLO 1 (Primeira Quinzena)

```
Abertura:    Dia 01 às 00:00
Fechamento:  Dia 15 às 23:59
Produção:    Dia 16 até último dia do mês
Envio:       Até o 5º dia útil do mês seguinte
```

### 🔹 CICLO 2 (Segunda Quinzena)

```
Abertura:    Dia 16 às 00:00
Fechamento:  Último dia do mês às 23:59
Produção:    Dia 01 até último dia do mês seguinte
Envio:       Até o 5º dia útil do mês subsequente
```

---

## 📅 EXEMPLO REAL – MARÇO 2026

### Ciclo 1 – Março 2026

```
📅 Vendas
├─ Abertura:    01/03/2026 às 00:00
└─ Fechamento:  15/03/2026 às 23:59

🏭 Produção
├─ Início:      16/03/2026
└─ Fim:         31/03/2026 (16 dias)

📦 Envio
└─ Até:         07/04/2026 (5º dia útil de abril/2026)
```

**Prazos para o cliente:**

- Compra em 01/03 → Envio até 07/04 → **Prazo: ~37 dias**
- Compra em 15/03 → Envio até 07/04 → **Prazo: ~22 dias**
- **Prazo médio: ~30 dias**

### Ciclo 2 – Março 2026

```
📅 Vendas
├─ Abertura:    16/03/2026 às 00:00
└─ Fechamento:  31/03/2026 às 23:59

🏭 Produção
├─ Início:      01/04/2026
└─ Fim:         30/04/2026 (30 dias)

📦 Envio
└─ Até:         07/05/2026 (5º dia útil de maio/2026)
```

**Prazos para o cliente:**

- Compra em 16/03 → Envio até 07/05 → **Prazo: ~52 dias**
- Compra em 31/03 → Envio até 07/05 → **Prazo: ~37 dias**
- **Prazo médio: ~45 dias**

---

## 📊 PRAZO REAL PARA O CLIENTE

### Ciclo 1 (Primeira Quinzena)

| Dia da Compra | Envio Até                   | Prazo Aproximado |
| ------------- | --------------------------- | ---------------- |
| Dia 01        | 5º dia útil do mês seguinte | ~37 dias         |
| Dia 08        | 5º dia útil do mês seguinte | ~30 dias         |
| Dia 15        | 5º dia útil do mês seguinte | ~22 dias         |

**Prazo médio:** ~30 dias

### Ciclo 2 (Segunda Quinzena)

| Dia da Compra | Envio Até                      | Prazo Aproximado |
| ------------- | ------------------------------ | ---------------- |
| Dia 16        | 5º dia útil do 2º mês seguinte | ~52 dias         |
| Dia 23        | 5º dia útil do 2º mês seguinte | ~45 dias         |
| Último dia    | 5º dia útil do 2º mês seguinte | ~37 dias         |

**Prazo médio:** ~45 dias

---

## 🔒 REGRA FIXA PARA TODOS OS MESES (AUTOMÁTICA)

O sistema deve:

### 1. Identificação Automática do Ciclo

```typescript
// Dia 01-15 → Ciclo 1
// Dia 16-último dia → Ciclo 2

if (dia >= 1 && dia <= 15) {
  ciclo = "Ciclo 1";
} else {
  ciclo = "Ciclo 2";
}
```

### 2. Cálculo Automático de Datas

- ✅ Último dia do mês (considera 28, 29, 30 ou 31 dias)
- ✅ 5º dia útil do mês correspondente
- ✅ Considera sábados e domingos como não úteis
- ✅ Permite inclusão futura de feriados nacionais

### 3. Exibição Dinâmica

O sistema exibe automaticamente:

```
"Este pedido será enviado até DD/MM/AAAA"
"Faltam X dias para o fechamento do ciclo"
"Você está no Ciclo 1/2 de Mês/Ano"
```

### 4. Contador Regressivo

```
⏰ Faltam 5 dias para o fechamento do Ciclo 1
⏰ Faltam 12 horas para o fechamento do Ciclo 2
```

---

## 🏭 STATUS OPERACIONAL INTERNO

Cada ciclo deve ter status:

1. **Aberto para vendas** - Vendas ativas
2. **Fechado** - Vendas encerradas, aguardando produção
3. **Em produção** - Produção em andamento
4. **Produção finalizada** - Aguardando envio
5. **Enviado** - Produtos enviados

---

## 💰 FLUXO FINANCEIRO

### Entrada (R$ 100)

- Paga no momento da compra
- Garante vaga no ciclo atual
- Não reembolsável após fechamento do ciclo

### Saldo Final

- Pago quando produção finalizar
- Notificação automática via email/WhatsApp
- Envio liberado apenas após quitação total

---

## 🧠 VANTAGEM DO MODELO

### ✔ Previsibilidade Total

- Cliente sabe exatamente quando vai receber
- Nenhum ciclo ultrapassa 52 dias
- Prazos claros e fixos

### ✔ Sistema Escalável

- Funciona para qualquer volume de vendas
- Fácil de comunicar
- Fácil de gerenciar

### ✔ Comunicação Clara

```
"Você está no Ciclo 1 de Março/2026"
"Vendas fecham em 15/03/2026"
"Produção: 16/03 a 31/03"
"Envio: Até 07/04/2026"
```

### ✔ Organização Industrial

- Produção dividida em lotes menores
- Melhor controle de qualidade
- Reduz risco de atrasos

---

## 📋 CALENDÁRIO ANUAL 2026

| Mês       | Ciclo 1                       | Ciclo 2                       |
| --------- | ----------------------------- | ----------------------------- |
| Janeiro   | 01-15/01 → Envio até 05/02    | 16-31/01 → Envio até 07/03    |
| Fevereiro | 01-15/02 → Envio até 05/03    | 16-28/02 → Envio até 07/04    |
| Março     | 01-15/03 → Envio até 07/04    | 16-31/03 → Envio até 07/05    |
| Abril     | 01-15/04 → Envio até 07/05    | 16-30/04 → Envio até 07/06    |
| Maio      | 01-15/05 → Envio até 05/06    | 16-31/05 → Envio até 07/07    |
| Junho     | 01-15/06 → Envio até 07/07    | 16-30/06 → Envio até 07/08    |
| Julho     | 01-15/07 → Envio até 07/08    | 16-31/07 → Envio até 07/09    |
| Agosto    | 01-15/08 → Envio até 07/09    | 16-31/08 → Envio até 07/10    |
| Setembro  | 01-15/09 → Envio até 07/10    | 16-30/09 → Envio até 07/11    |
| Outubro   | 01-15/10 → Envio até 07/11    | 16-31/10 → Envio até 07/12    |
| Novembro  | 01-15/11 → Envio até 07/12    | 16-30/11 → Envio até 07/01/27 |
| Dezembro  | 01-15/12 → Envio até 07/01/27 | 16-31/12 → Envio até 07/02/27 |

---

## 🔄 COMPARAÇÃO: MODELO ANTIGO vs NOVO

### ❌ Modelo Antigo (1 ciclo/mês)

```
Vendas:    15/02 a 15/03 (30 dias)
Produção:  16/03 a 30/03 (15 dias)
Envio:     Até 5º dia útil de Abril

Problemas:
- Apenas 1 oportunidade de compra por mês
- Produção concentrada em 15 dias
- Prazo fixo de ~45 dias para todos
```

### ✅ Modelo Novo (2 ciclos/mês)

```
Ciclo 1:
Vendas:    01/03 a 15/03 (15 dias)
Produção:  16/03 a 31/03 (16 dias)
Envio:     Até 5º dia útil de Abril
Prazo:     22-37 dias

Ciclo 2:
Vendas:    16/03 a 31/03 (16 dias)
Produção:  01/04 a 30/04 (30 dias)
Envio:     Até 5º dia útil de Maio
Prazo:     37-52 dias

Vantagens:
✔ 2 oportunidades de compra por mês
✔ Produção distribuída
✔ Prazos variados (22-52 dias)
✔ Mais flexibilidade para o cliente
```

---

## 🎯 IMPLEMENTAÇÃO TÉCNICA

### Arquivos Principais

1. **`src/lib/services/batchCalculator.ts`**
   - Lógica de cálculo dos ciclos
   - Funções de formatação
   - Cálculo de dias úteis

2. **`src/pages/admin/AdminContentSettings.tsx`**
   - Interface de administração
   - Visualização de ciclos
   - Atualização manual (se necessário)

3. **`src/components/content/BatchInfoBanner.tsx`**
   - Banner dinâmico com informações do ciclo
   - Contador regressivo
   - Status visual

4. **`src/components/collections/ReleaseTimeline.tsx`**
   - Timeline visual dos ciclos
   - Datas dinâmicas
   - Integração com SSOT

### Funções Principais

```typescript
// Calcula ciclo atual
const current = calculateCurrentBatch(rules);

// Calcula próximo ciclo
const next = calculateNextBatch(rules, current);

// Calcula próximos 6 ciclos (3 meses)
const future = calculateFutureBatches(rules, 6);

// Verifica se está em período de vendas
const isOpen = isInSalesPeriod(current);

// Gera resumo textual
const summary = getBatchSummary(current);
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Core (Concluído)

- [x] Criar `batchCalculator.ts` com lógica de 2 ciclos
- [x] Implementar cálculo de dias úteis
- [x] Implementar detecção automática de ciclo
- [x] Criar funções de formatação

### Fase 2: Interface Admin (Próximo)

- [ ] Atualizar `AdminContentSettings.tsx`
- [ ] Adicionar visualização de ciclos
- [ ] Adicionar botão "Calcular Próximos Ciclos"
- [ ] Adicionar preview de calendário anual

### Fase 3: Frontend (Próximo)

- [ ] Atualizar `ReleaseTimeline.tsx`
- [ ] Atualizar `BatchInfoBanner.tsx`
- [ ] Atualizar FAQs
- [ ] Adicionar contador regressivo

### Fase 4: Banco de Dados (Próximo)

- [ ] Criar migration para novo modelo
- [ ] Atualizar `system_settings`
- [ ] Adicionar campos de ciclo
- [ ] Migrar dados existentes

### Fase 5: Testes (Próximo)

- [ ] Testes unitários do calculador
- [ ] Testes de integração
- [ ] Testes de UI
- [ ] Testes de performance

---

## 🚀 PRÓXIMOS PASSOS

1. **Atualizar banco de dados** com novo modelo
2. **Atualizar interface admin** para gerenciar ciclos
3. **Atualizar componentes frontend** para exibir ciclos
4. **Criar testes automatizados**
5. **Documentar para equipe**

---

## 📞 COMUNICAÇÃO COM CLIENTE

### Exemplo de Mensagem

```
🎉 Bem-vindo ao Ciclo 1 de Março/2026!

📅 Vendas abertas até: 15/03/2026 às 23:59
🏭 Produção: 16/03 a 31/03
📦 Envio: Até 07/04/2026 (5º dia útil)

⏰ Faltam 12 dias para o fechamento!

Garanta sua vaga agora! 👉 [Link]
```

---

**Status:** ✅ Modelo implementado e pronto para integração  
**Próxima etapa:** Atualizar banco de dados e interface admin
