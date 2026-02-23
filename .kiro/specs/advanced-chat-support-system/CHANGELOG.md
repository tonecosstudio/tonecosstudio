# Changelog - Ajustes Estratégicos e Operacionais

## Versão 2.0 - Foco Operacional (Baseado em Feedback GPT)

### ✅ Melhorias Implementadas

#### 1. SLA Interno e Métricas Operacionais
**Problema identificado:** Sistema media volume mas não qualidade
**Solução:**
- Adicionado contador de conversas abertas há +24h (alerta SLA)
- Adicionado cálculo de tempo médio de primeira resposta
- Destaque visual para conversas que excedem 24h sem resposta
- Dashboard focado em qualidade, não apenas volume

#### 2. Definição Clara de "Conversa Resolvida"
**Problema identificado:** Ambiguidade sobre quando marcar como resolvida
**Solução:**
- Regra automática: status "aguardando_usuario" por 48h → sugerir resolver
- Timeout configurável pelo admin (padrão: 48h)
- Evita conversas esquecidas e abandono invisível

#### 3. Lembretes Comerciais Mínimos
**Problema identificado:** Sistema cortou totalmente alavanca de venda
**Solução:**
- Lembrete automático de orçamento não respondido em 3 dias
- Lembrete automático de pagamento pendente em 24h
- Configurável e desativável por conversa
- Não envia se houver atividade recente (12h)
- Aumenta receita sem virar sistema enterprise

#### 4. Múltiplas Tags por Conversa
**Problema identificado:** Limitação de 1 tag pode ser restritiva
**Solução:**
- Suporte a múltiplas tags (array)
- Casos comuns: "pedido + reclamacao", "assinatura + pagamento"
- Não aumenta complexidade relevante
- Filtros funcionam com qualquer combinação

#### 5. Flags de Risco
**Problema identificado:** Falta contexto sobre histórico problemático
**Solução:**
- Flags: cliente_conflito, atraso_critico, pagamento_problema
- Destaque visual proeminente (vermelho)
- Warning ao abrir conversa com flag
- Muda postura no atendimento
- Log de auditoria para flags

#### 6. Indicador de Produção Interna
**Problema identificado:** Status oficial não reflete realidade operacional
**Solução:**
- Estágios internos: molde_pronto, impressao_iniciada, pintura_iniciada, finalizacao
- Visível APENAS para admin (não notifica cliente)
- Timeline com histórico de mudanças
- Notas por estágio
- Transforma chat em controle operacional real

#### 7. Campo "Promessa Feita"
**Problema identificado:** Prazos prometidos são esquecidos
**Solução:**
- Campo `promised_date` na conversa
- Countdown visual na lista
- Destaque laranja/vermelho quando vence
- Alerta ao abrir conversa com promessa vencida
- Notificação interna 1 dia antes
- Evita: "Mas você disse que..."

#### 8. Estratégia de Comunicação Definida
**Problema identificado:** Ambiguidade sobre chat vs email
**Decisão:**
- **Email é primário** para notificações automáticas
- **Chat é secundário** para suporte ativo
- Conversa automática criada com critérios:
  - Status de pedido: SE cliente já usou chat antes
  - Pagamento pendente: SE valor > R$500
  - Orçamento: SEMPRE (oportunidade de venda)
- Evita "conversas fantasma"

### ❌ Removido do Escopo

#### 1. Detalhes Técnicos Excessivos
- Criptografia em nível de banco (deixado implícito)
- Log de auditoria muito detalhado (mantido apenas essencial)
- Métricas excessivas (focado em SLA operacional)

#### 2. Foco em Auditoria Corporativa
- Sistema é ferramenta de controle operacional, não auditoria
- Prioridade: reduzir mensagens repetitivas, controlar qualidade, evitar conflitos

### 📊 Impacto Esperado

**Redução de Carga Manual:**
- Automação de status: -70% de "onde está meu pedido?"
- Lembretes comerciais: +15% conversão de orçamentos
- Flags de risco: -50% de conflitos escalados

**Controle de Qualidade:**
- SLA 24h: 95% das conversas respondidas em 24h
- Primeira resposta: média < 2h
- Promessas cumpridas: 90%+

**Aumento de Receita:**
- Lembretes de orçamento: +R$X/mês
- Lembretes de pagamento: -Y% inadimplência
- Sidebar CRM: +Z% upsell

### 🎯 Próximos Passos

1. Revisar requirements e design atualizados
2. Criar tasks de implementação
3. Priorizar Fase 3 (Automação) como primeira entrega
4. Implementar em 6 semanas conforme plano

### 📝 Notas de Implementação

**Prioridade de Desenvolvimento:**
1. **Fase 3 (Automação)** - PRIORIDADE MÁXIMA
2. Fase 1 (Infraestrutura)
3. Fase 2 (Interface Admin)
4. Fase 4 (Interface Cliente)
5. Fase 5 (Features Avançadas)
6. Fase 6 (Polish & Testing)

**Decisões Arquiteturais:**
- PostgreSQL array para tags e risk_flags (simples, performático)
- Tabela separada para production_stages (auditoria)
- Tabela separada para reminders (processamento assíncrono)
- Índices GIN para busca em arrays
- Índice parcial para promised_date (apenas não nulos)

