# Objetivo do Hub de Produção

## 🎯 Propósito Principal

O **Hub de Produção** é o centro de comando para gerenciar todo o fluxo de produção de miniaturas personalizadas do sistema Ordax. É onde a equipe de produção (admin) controla e monitora desde a escolha do personagem pelo cliente até o envio do produto final.

## 📦 Contexto do Negócio

### O que é Ordax?
Sistema de assinaturas de miniaturas personalizadas onde:
1. Cliente assina um plano mensal
2. Recebe créditos para escolher personagens
3. Escolhe personagens de coleções disponíveis
4. Equipe produz as miniaturas personalizadas
5. Produto é enviado ao cliente

### Fluxo de Produção
```
Cliente Escolhe Personagem
         ↓
   Entra na Fila (production_queue)
         ↓
   Aguardando Escolha → Design → Produção → Controle Qualidade → Embalagem → Enviado
         ↓
   Cliente Recebe
```

## 🎨 O que a Página Gerencia

### 1. **Fila de Produção** (`production_queue`)
Cada item na fila representa:
- **Um pedido de miniatura** (subscription_delivery ou standalone_purchase)
- **Cliente específico** (customerName, customerEmail)
- **Personagem escolhido** (characterName, collectionName)
- **Status atual** (awaiting_choice, design, production, etc.)
- **Prioridade** (critical, high, normal, low)
- **Prazos** (choiceDeadline, estimatedCompletionDate)
- **Atribuição** (assignedTo - membro da equipe)

### 2. **Estágios de Produção** (`ProductionStage`)
```
awaiting_choice    → Cliente ainda não escolheu personagem
design             → Equipe está desenhando/modelando
production         → Miniatura sendo produzida
quality_check      → Controle de qualidade
packaging          → Embalagem do produto
shipped            → Enviado ao cliente
```

### 3. **Escolhas de Personagens** (`CharacterChoices`)
- Clientes têm prazo para escolher personagens
- Se não escolherem, entra em alerta crítico
- Admin pode aprovar/rejeitar escolhas
- Sistema bloqueia escolhas após prazo

## 🚨 Alertas Urgentes

### Por que existem?
Garantir que nenhum pedido atrase ou fique esquecido.

### Tipos de Alertas:
1. **Prazo < 24h** (Crítico)
   - Itens com deadline de entrega em menos de 24 horas
   - Requer ação imediata da equipe

2. **Escolhas Pendentes** (Urgente)
   - Clientes que ainda não escolheram personagem
   - Prazo de escolha próximo de expirar

3. **Itens Bloqueados** (Atenção)
   - Produção parada por algum motivo
   - Precisa de intervenção para desbloquear

4. **Atrasados** (Atenção)
   - Itens que excederam tempo médio do estágio
   - Podem atrasar entrega final

## 📊 Métricas Principais

### 1. Total em Produção
- Quantos itens estão na fila total
- Indica carga de trabalho da equipe

### 2. Alertas Críticos
- Soma de itens com prazo < 24h + bloqueados
- Indica urgência de ação

### 3. Escolhas Pendentes
- Clientes que ainda não escolheram
- Indica necessidade de follow-up

### 4. Taxa de Conclusão
- % de itens concluídos vs total
- Indica eficiência da produção

## 🎛️ Funcionalidades Principais

### 1. **Visualizações Múltiplas**

#### Kanban
- Colunas por estágio (Design, Produção, QC, etc.)
- Drag & drop para mover entre estágios
- Visual intuitivo do fluxo

#### Lista
- Tabela detalhada com todas as informações
- Seleção múltipla para ações em massa
- Ordenação e filtros avançados

#### Calendário
- Visualização por prazos e datas
- Identifica gargalos temporais
- Planejamento de capacidade

#### Análises (NOVO)
- Gráficos de distribuição
- Métricas de performance
- Tempo médio por estágio
- Workload da equipe

### 2. **Filtros Globais**
Sempre visíveis, funcionam em todas as visualizações:
- Por coleção
- Por prioridade
- Por estágio
- Por status
- Por membro da equipe
- Por data

### 3. **Ações em Massa**
Quando itens são selecionados:
- **Atribuir** → Designar para membro da equipe
- **Mudar Estágio** → Mover todos para novo estágio
- **Exportar** → Gerar CSV para análise externa

### 4. **Painel de Detalhes** (NOVO)
Slide-over lateral com:
- Informações completas do item
- Histórico de mudanças
- Notas de produção
- Ações rápidas (Editar, Bloquear, etc.)

### 5. **Escolhas de Personagens**
Tab dedicada para:
- Aprovar escolhas de clientes
- Rejeitar escolhas inadequadas
- Ver histórico de escolhas
- Gerenciar prazos

## 🎯 Casos de Uso Reais

### Cenário 1: Início do Dia
```
1. Admin abre o Hub de Produção
2. Vê banner vermelho: "3 Alertas Críticos"
3. Clica em "Prazo < 24h"
4. Filtra automaticamente itens urgentes
5. Atribui para equipe disponível
6. Muda estágio para "production"
```

### Cenário 2: Gerenciamento de Equipe
```
1. Admin vai para visualização Kanban
2. Vê coluna "Design" com 15 itens
3. Seleciona 5 itens
4. Clica em "Atribuir"
5. Escolhe designer disponível
6. Itens são distribuídos
```

### Cenário 3: Análise de Performance
```
1. Admin vai para tab "Análises"
2. Vê gráfico: "Produção" tem 20 itens
3. Tempo médio: 8 horas (acima da meta)
4. Identifica gargalo
5. Redistribui carga de trabalho
```

### Cenário 4: Cliente Não Escolheu
```
1. Banner amarelo: "5 Escolhas Pendentes"
2. Admin clica no alerta
3. Vai para tab "Escolhas"
4. Vê lista de clientes com prazo próximo
5. Envia notificação de lembrete
6. Ou escolhe personagem padrão
```

## 🔄 Integração com Sistema

### Entrada na Fila
Itens entram automaticamente quando:
- Cliente faz escolha de personagem (subscription)
- Cliente compra avulsa (standalone)
- Sistema cria registro em `production_queue`

### Saída da Fila
Itens saem quando:
- Estágio muda para "shipped"
- Status muda para "completed"
- Tracking code é gerado

### Notificações
Sistema envia notificações quando:
- Prazo de escolha está próximo
- Item está atrasado
- Item foi bloqueado
- Estágio mudou

## 📈 Métricas de Sucesso

### Para a Equipe
- ✅ Reduzir tempo médio de produção
- ✅ Aumentar taxa de conclusão
- ✅ Diminuir itens bloqueados
- ✅ Zerar alertas críticos diariamente

### Para o Negócio
- ✅ Cumprir prazos de entrega
- ✅ Manter clientes satisfeitos
- ✅ Otimizar capacidade produtiva
- ✅ Identificar gargalos rapidamente

## 🎨 Por que a Repaginação?

### Problemas Antes
1. ❌ Métricas duplicadas (apareciam 2x)
2. ❌ Alertas escondidos em cards
3. ❌ Filtros dentro de tabs (não globais)
4. ❌ Tab "Visão Geral" redundante
5. ❌ Muito espaço vertical desperdiçado
6. ❌ Sem painel de detalhes rápido

### Melhorias Depois
1. ✅ Métricas únicas e compactas
2. ✅ Alertas em sticky banner (sempre visível)
3. ✅ Filtros globais (funcionam em todas as tabs)
4. ✅ Tab "Análises" com gráficos úteis
5. ✅ 62% menos espaço vertical
6. ✅ Painel lateral de detalhes (Sheet)

## 🚀 Próximos Passos

### Fase 2 (Planejada)
- [ ] Seleção múltipla no Kanban
- [ ] Busca rápida (Cmd+K)
- [ ] Atalhos de teclado
- [ ] Edição inline no painel de detalhes

### Fase 3 (Futura)
- [ ] Gráficos interativos (recharts)
- [ ] Animações suaves
- [ ] Notificações em tempo real
- [ ] Drag & drop melhorado

### Fase 4 (Opcional)
- [ ] Virtualização para listas grandes
- [ ] Infinite scroll
- [ ] Cache otimizado
- [ ] Prefetch inteligente

## 📝 Resumo Executivo

**O Hub de Produção é o coração operacional do Ordax.**

Permite que a equipe:
- 👀 Visualize toda a fila de produção
- 🚨 Identifique urgências imediatamente
- 🎯 Atribua trabalho eficientemente
- 📊 Analise performance em tempo real
- ✅ Garanta entregas no prazo

**Resultado**: Operação mais eficiente, clientes mais satisfeitos, negócio mais lucrativo.
