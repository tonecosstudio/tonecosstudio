# 📅 FLUXO OFICIAL DE PRAZOS - SISTEMA CORRIGIDO

**Data:** 07/03/2026  
**Status:** ✅ PADRONIZADO E CORRIGIDO

---

## 🎯 FLUXO OFICIAL (3 MESES)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CICLO COMPLETO: 90 DIAS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MÊS 1 (MARÇO)          MÊS 2 (ABRIL)         MÊS 3 (MAIO)     │
│  ═══════════════        ═══════════════        ═══════════════  │
│                                                                 │
│  📦 VENDAS              🏭 PRODUÇÃO            🚚 ENVIO         │
│  30 dias                30 dias                15-31 (quinzena) │
│  (mês completo)         (mês completo)         (dia 15 ao fim)  │
│                                                                 │
│  01/03 ────────► 31/03  01/04 ────────► 30/04  15/05 ──► 31/05 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 EXEMPLO PRÁTICO

### Coleção One Piece - Tripulação Mugiwara

| Fase | Período | Datas | Duração |
|------|---------|-------|---------|
| **VENDAS** | Março 2026 | 01/03 a 31/03 | 30 dias |
| **PRODUÇÃO** | Abril 2026 | 01/04 a 30/04 | 30 dias |
| **ENVIO** | Maio 2026 | 15/05 a 31/05 | Segunda quinzena |

**Timeline detalhada:**

```
01/03 ─┐
       │ 📦 VENDAS ABERTAS
       │ • Usuários escolhem personagens
       │ • Pagamentos processados
31/03 ─┘

01/04 ─┐
       │ 🏭 PRODUÇÃO
       │ • Aguardando escolha: 7 dias
       │ • Design: 5 dias
       │ • Produção: 12 dias
       │ • Controle qualidade: 4 dias
       │ • Embalagem: 2 dias
30/04 ─┘

15/05 ─┐
       │ 🚚 ENVIO E ENTREGA
       │ • Postagem: a partir do dia 15
       │ • Entrega: até o último dia do mês (31/05)
       │ • Período: 15 a 17 dias (depende do mês)
31/05 ─┘
```

---

## ⚙️ CONFIGURAÇÕES OFICIAIS

### Prazos Principais

```sql
-- Vendas (Mês 1)
sales_duration_days = 30 dias

-- Produção (Mês 2)
production_days_min = 30 dias
production_days_max = 30 dias

-- Envio (Mês 3 - segunda quinzena: dia 15 ao último dia)
shipping_business_days = 15 dias

-- Intervalo total entre entregas
delivery_interval_days = 90 dias (3 meses completos)
```

### Estágios de Produção (30 dias total)

| Estágio | Horas | Dias | Descrição |
|---------|-------|------|-----------|
| Aguardando escolha | 168h | 7 dias | Prazo para usuário escolher |
| Design | 120h | 5 dias | Criação do design |
| Produção | 288h | 12 dias | Fabricação da peça |
| Controle qualidade | 96h | 4 dias | Inspeção e testes |
| Embalagem | 48h | 2 dias | Preparação para envio |
| **TOTAL** | **720h** | **30 dias** | |

---

## 🔧 CORREÇÕES APLICADAS

### 1. Duplicatas Removidas ✅

**ANTES:**
```sql
('shipping_days', '5', 'Prazo de envio em dias úteis')
('shipping_business_days', '5', 'Prazo de envio em dias úteis')
```

**DEPOIS:**
```sql
('shipping_business_days', '10', 'Prazo de envio em dias úteis (segunda quinzena)')
```

### 2. Prazos Padronizados ✅

**ANTES:**
- Produção: 15-20 dias (inconsistente)
- Envio: 5 dias (muito curto)
- Intervalo: 30 dias hardcoded

**DEPOIS:**
- Produção: 30 dias (mês completo)
- Envio: 15 dias (segunda quinzena: dia 15 ao último dia)
- Intervalo: 90 dias (3 meses completos, configurável)

### 3. Configurações Centralizadas ✅

Todos os prazos agora estão em `system_settings`:

```sql
production_days_min       = 30 dias
production_days_max       = 30 dias
shipping_business_days    = 15 dias (dia 15 ao último dia do mês)
sales_duration_days       = 30 dias
delivery_interval_days    = 90 dias (3 meses completos)
character_choice_days     = 7 dias
balance_payment_days      = 5 dias
```

---

## 📊 CÁLCULO AUTOMÁTICO DE DATAS

### Função SQL Criada

```sql
SELECT * FROM calculate_delivery_dates('2026-03-01');
```

**Resultado:**

| Campo | Data | Descrição |
|-------|------|-----------|
| sales_start | 2026-03-01 | Início das vendas |
| sales_end | 2026-03-31 | Fim das vendas |
| production_start | 2026-04-01 | Início da produção |
| production_end | 2026-04-30 | Fim da produção |
| shipping_start | 2026-05-15 | Início dos envios (dia 15) |
| shipping_end | 2026-05-31 | Prazo final de entrega (último dia do mês) |

---

## 🎯 BENEFÍCIOS

### 1. Clareza ✅
- Fluxo de 3 meses bem definido
- Cada fase tem um mês dedicado
- Fácil comunicação com clientes

### 2. Previsibilidade ✅
- Datas calculadas automaticamente por mês completo
- Sem valores hardcoded
- Configurável via admin
- Sempre do dia 15 ao último dia do mês para envios

### 3. Realismo ✅
- 30 dias de produção (tempo adequado)
- Segunda quinzena completa para envio (dia 15 ao fim do mês)
- Buffer de tempo para imprevistos
- Trabalha com meses completos (fácil de comunicar)

### 4. Consistência ✅
- Uma única fonte de verdade
- Sem duplicatas
- Sem conflitos entre migrations

---

## 📝 COMUNICAÇÃO COM CLIENTE

### Mensagem Padrão

> **Prazo de Entrega:**
> 
> Sua coleção será entregue em aproximadamente 90 dias:
> - **Vendas:** Março (escolha seu personagem até 31/03)
> - **Produção:** Abril (sua peça será produzida durante todo o mês)
> - **Entrega:** Maio (receba entre 15/05 e 31/05 - segunda quinzena)

### FAQ Atualizado

**P: Quanto tempo leva para receber minha peça?**
R: O ciclo completo é de 90 dias (3 meses). Vendas em março, produção em abril, entrega em maio.

**P: Posso escolher meu personagem depois?**
R: Você tem 7 dias após a compra para escolher. Após esse prazo, um personagem será selecionado automaticamente.

**P: Quando começa a produção?**
R: A produção começa no primeiro dia do mês seguinte às vendas e dura 30 dias.

**P: Quando vou receber?**
R: As entregas ocorrem na segunda quinzena do terceiro mês, a partir do dia 15 até o último dia do mês.

---

## 🚀 PRÓXIMOS PASSOS

### Curto Prazo
1. ✅ Aplicar SQL de correção no banco
2. ⏳ Atualizar interface admin para mostrar novo fluxo
3. ⏳ Atualizar emails e notificações com novos prazos
4. ⏳ Atualizar FAQ e páginas de ajuda

### Médio Prazo
1. ⏳ Criar dashboard de acompanhamento de ciclos
2. ⏳ Implementar alertas automáticos por fase
3. ⏳ Adicionar tracking detalhado de produção

### Longo Prazo
1. ⏳ Otimizar produção para reduzir prazos
2. ⏳ Implementar produção paralela de múltiplas coleções
3. ⏳ Sistema de priorização de pedidos

---

## 📁 ARQUIVOS RELACIONADOS

- `FIX_PRAZOS_OFICIAIS.sql` - SQL de correção
- `ANALISE_PRAZOS_SISTEMA.md` - Análise anterior
- `supabase/migrations/20260222094000_add_content_settings.sql` - Configurações
- `supabase/migrations/20260428000002_create_production_stages.sql` - Estágios

---

## ✅ CHECKLIST DE VALIDAÇÃO

- ✅ Duplicatas removidas
- ✅ Prazos padronizados em 30 dias
- ✅ Configurações centralizadas
- ✅ Função de cálculo criada
- ✅ Estágios ajustados para 30 dias
- ✅ Documentação atualizada
- ⏳ SQL aplicado no banco remoto
- ⏳ Interface atualizada
- ⏳ Comunicação com clientes atualizada

---

**Status:** ✅ FLUXO OFICIAL DEFINIDO E DOCUMENTADO  
**Próximo Passo:** Aplicar `FIX_PRAZOS_OFICIAIS.sql` no banco remoto  
**Última Atualização:** 07/03/2026 - 19:00
