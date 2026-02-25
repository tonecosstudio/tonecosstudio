# 📊 Guia de Uso - Analytics Avançado

**Versão:** 1.3  
**Data:** 24/02/2026  
**Público:** Administradores e Gestores

---

## 🎯 Visão Geral

O painel AdminHome agora inclui uma seção completa de Analytics Avançado com 4 componentes principais que fornecem insights automáticos sobre o negócio.

---

## 📍 Localização

Acesse: **Admin → Dashboard**

Role até a seção "Analytics Avançado" (após Status do Sistema)

---

## 🔍 Componentes

### 1. 📈 Receita Mensal

**O que mostra:**

- Receita dos últimos 6 meses
- Número de orçamentos por mês
- Tendência (crescimento ou queda)
- Percentual de mudança

**Como usar:**

- Identifique meses com melhor performance
- Compare receita vs número de orçamentos
- Observe a tendência geral
- Use para planejamento financeiro

**Insights:**

- Meses com alta receita mas poucos orçamentos = tickets altos
- Meses com muitos orçamentos mas baixa receita = tickets baixos
- Tendência de crescimento = estratégia funcionando
- Tendência de queda = revisar estratégia

**Exemplo:**

```
Jan: R$ 50.000 (20 orçamentos) = R$ 2.500/orçamento
Fev: R$ 60.000 (15 orçamentos) = R$ 4.000/orçamento
→ Fevereiro teve menos orçamentos mas ticket médio maior
```

---

### 2. 🎯 Funil de Conversão

**O que mostra:**

- Visitantes do site
- Leads gerados (40% dos visitantes)
- Orçamentos solicitados
- Conversões (vendas fechadas)
- Taxa de conversão por estágio
- Taxa de conversão geral

**Como usar:**

- Identifique gargalos no funil
- Compare taxas entre estágios
- Foque em melhorar o estágio mais fraco
- Monitore a taxa geral

**Insights:**

- Taxa baixa visitantes→leads = problema no site/marketing
- Taxa baixa leads→orçamentos = problema no atendimento
- Taxa baixa orçamentos→conversões = problema no fechamento
- Taxa geral < 5% = funil precisa otimização urgente

**Exemplo:**

```
1000 visitantes
  ↓ 40% (bom)
400 leads
  ↓ 25% (baixo - ATENÇÃO!)
100 orçamentos
  ↓ 30% (bom)
30 conversões
= 3% taxa geral (baixo)

Ação: Melhorar conversão de leads em orçamentos
```

---

### 3. 💰 Métricas de Assinaturas

**O que mostra:**

**Cards Principais:**

- MRR (Monthly Recurring Revenue)
- Assinaturas Ativas
- Taxa de Churn
- LTV (Lifetime Value)

**Movimentação:**

- Novas assinaturas
- Assinaturas canceladas
- Saldo (novas - canceladas)

**Insights Automáticos:**

- Valor médio por assinatura
- Status do churn (saudável < 5%)
- Crescimento positivo/negativo

**Como usar:**

- Monitore MRR mensalmente
- Mantenha churn abaixo de 5%
- Aumente LTV com upsells
- Celebre crescimento positivo

**Interpretação:**

**MRR:**

- Crescendo = negócio saudável
- Estável = manter estratégia
- Caindo = ação urgente necessária

**Churn:**

- < 5% = excelente
- 5-10% = aceitável
- > 10% = crítico

**LTV:**

- Alto = clientes fiéis
- Baixo = melhorar retenção

**Exemplo:**

```
MRR: R$ 50.000 (+15% vs mês anterior) ✅
Assinaturas: 100 (+10 novas, -3 canceladas) ✅
Churn: 3% (saudável) ✅
LTV: R$ 6.000 (12 meses × R$ 500)

Status: Negócio saudável e crescendo
```

---

### 4. 🏢 Performance por Franquia

**O que mostra:**

**Resumo Geral:**

- Receita total de todas franquias
- Total de vendas
- Ticket médio

**Gráfico de Barras:**

- Receita por franquia (top 6)
- Comparação visual

**Top 3:**

- 🥇 1º lugar
- 🥈 2º lugar
- 🥉 3º lugar
- Percentual de participação
- Crescimento individual

**Alertas:**

- Franquias com queda > 10%

**Como usar:**

- Identifique franquias de alto desempenho
- Replique estratégias de sucesso
- Apoie franquias com dificuldades
- Reconheça e recompense top performers

**Ações por Situação:**

**Franquia com crescimento alto:**

- Entenda o que está funcionando
- Compartilhe práticas com outras
- Considere expansão

**Franquia estável:**

- Mantenha suporte
- Busque oportunidades de crescimento
- Monitore satisfação

**Franquia em queda:**

- Investigue causas
- Ofereça treinamento
- Revise estratégia local
- Considere mudanças

**Exemplo:**

```
Top 3:
🥇 Franquia SP Centro: R$ 80.000 (+25%) - 40 vendas
🥈 Franquia RJ Sul: R$ 60.000 (+15%) - 30 vendas
🥉 Franquia BH Norte: R$ 50.000 (+10%) - 25 vendas

⚠️ Alerta:
Franquia SP Oeste: R$ 20.000 (-15%) - 10 vendas
→ Ação: Reunião com gestor para entender queda
```

---

## 🎯 Casos de Uso

### Reunião Semanal de Gestão

**Prepare-se com:**

1. Receita da semana (RevenueChart)
2. Taxa de conversão (ConversionFunnel)
3. Status de assinaturas (SubscriptionMetrics)
4. Performance de franquias (FranchiseAnalytics)

**Perguntas a responder:**

- Estamos crescendo?
- Onde estão os gargalos?
- Quais franquias precisam apoio?
- O churn está controlado?

---

### Planejamento Mensal

**Analise:**

1. Tendência de receita (últimos 6 meses)
2. Evolução do funil
3. MRR e projeções
4. Comparativo entre franquias

**Defina:**

- Metas para próximo mês
- Ações corretivas
- Investimentos necessários
- Reconhecimentos

---

### Tomada de Decisão

**Cenário 1: Churn Alto**

```
Churn: 12% (crítico)
↓
Ações:
1. Pesquisa de satisfação
2. Melhorar onboarding
3. Programa de fidelidade
4. Suporte proativo
```

**Cenário 2: Funil Travado**

```
Leads→Orçamentos: 15% (baixo)
↓
Ações:
1. Treinar equipe de vendas
2. Melhorar scripts
3. Reduzir tempo de resposta
4. Oferecer incentivos
```

**Cenário 3: Franquia em Queda**

```
Franquia X: -20% (crítico)
↓
Ações:
1. Reunião urgente
2. Análise de mercado local
3. Revisão de processos
4. Suporte intensivo
```

---

## 📊 Interpretação de Dados

### Cores e Indicadores

**Verde (✅):**

- Crescimento positivo
- Métricas saudáveis
- Tudo funcionando bem

**Amarelo (⚠️):**

- Atenção necessária
- Métricas no limite
- Monitorar de perto

**Vermelho (🔴):**

- Ação urgente
- Métricas críticas
- Intervenção imediata

### Tendências

**↑ Crescendo:**

- Continue a estratégia
- Documente o que funciona
- Escale se possível

**→ Estável:**

- Mantenha o curso
- Busque otimizações
- Teste novidades

**↓ Caindo:**

- Investigue causas
- Aja rapidamente
- Revise estratégia

---

## 💡 Dicas de Uso

### Diariamente

- ✅ Verifique alertas
- ✅ Monitore churn
- ✅ Acompanhe conversões

### Semanalmente

- ✅ Analise receita
- ✅ Revise funil
- ✅ Compare franquias

### Mensalmente

- ✅ Tendências de 6 meses
- ✅ MRR e projeções
- ✅ Planejamento estratégico

---

## 🔄 Filtros de Período

Todos os dados respeitam o filtro de período selecionado no topo da página:

- **Hoje:** Dados do dia atual
- **Última Semana:** Últimos 7 dias
- **Último Mês:** Últimos 30 dias
- **Último Ano:** Últimos 365 dias
- **Customizado:** Escolha as datas

**Dica:** Use períodos diferentes para análises específicas:

- Diário: Monitoramento operacional
- Semanal: Ajustes táticos
- Mensal: Planejamento estratégico
- Anual: Visão de longo prazo

---

## 📤 Exportação

Use o botão "Exportar" no topo para:

- Salvar dados em CSV
- Salvar dados em JSON
- Compartilhar com equipe
- Criar relatórios externos

---

## ❓ FAQ

**P: Os dados são em tempo real?**
R: Sim, os dados são atualizados a cada carregamento da página.

**P: Posso filtrar por franquia específica?**
R: Atualmente não, mas está no roadmap (v1.4).

**P: Como é calculado o LTV?**
R: LTV = Valor Médio da Assinatura × 12 meses

**P: O que é MRR?**
R: Monthly Recurring Revenue - receita recorrente mensal de assinaturas.

**P: Como melhorar o churn?**
R: Foque em onboarding, suporte proativo e programa de fidelidade.

**P: Posso exportar os gráficos?**
R: Ainda não, mas está planejado para v1.4.

---

## 🆘 Suporte

**Dúvidas?** Consulte a [documentação completa](./INDICE_ADMIN_ATUALIZADO.md)

**Problemas?** Reporte no sistema de issues

**Sugestões?** Adicione ao [roadmap](./ROADMAP_MELHORIAS_ADMIN.md)

---

## 📚 Recursos Adicionais

- [Checklist Completo](./CHECKLIST_ADMIN.md)
- [Changelog](./CHANGELOG_ADMIN.md)
- [Guia Rápido](./GUIA_RAPIDO_ADMIN.md)
- [Resumo Executivo](./RESUMO_EXECUTIVO_ADMIN_FINAL.md)

---

**Versão:** 1.3  
**Última Atualização:** 24/02/2026  
**Próxima Revisão:** 03/03/2026
