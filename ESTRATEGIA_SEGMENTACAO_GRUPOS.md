# 🎯 Estratégia de Segmentação de Grupos

## 📊 Visão Geral

Sistema de segmentação automática que organiza usuários em grupos baseado em seu comportamento e status de assinatura, permitindo comunicação direcionada e campanhas específicas.

---

## 🔄 Lógica de Exclusão Mútua

### Regras de Segmentação

```
┌─────────────────────────────────────────────────────────┐
│                    TODOS OS USUÁRIOS                     │
│                   (Novos Membros)                        │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌──────────────┐
│  TEM/TEVE     │         │  NUNCA TEVE  │
│  ASSINATURA   │         │  ASSINATURA  │
└───────┬───────┘         └──────────────┘
        │                         │
        │                         ▼
        │                 ┌──────────────┐
        │                 │ 🆓 Usuários  │
        │                 │    Free      │
        │                 └──────────────┘
        │
        ├─────────────┬─────────────┐
        ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ ⭐ Ativo │  │ ⏰ Expir.│  │ 🔄 Ex-   │
│ Assinante│  │ em 7 dias│  │ Assinante│
└──────────┘  └──────────┘  └──────────┘
```

### Matriz de Exclusão

| Grupo | Assinantes | Expirando | Ex-Assinantes | Free |
|-------|-----------|-----------|---------------|------|
| **Assinantes** | ✅ | ✅ | ❌ | ❌ |
| **Expirando** | ✅ | ✅ | ❌ | ❌ |
| **Ex-Assinantes** | ❌ | ❌ | ✅ | ❌ |
| **Free** | ❌ | ❌ | ❌ | ✅ |

**Legenda:**
- ✅ = Pode estar simultaneamente
- ❌ = Exclusão mútua (não pode estar junto)

---

## 📢 Grupos de Comunicação

### 1. 🎉 Novos Membros
**Público**: Todos os usuários cadastrados

**Uso**:
- Mensagens de boas-vindas
- Novidades e promoções gerais
- Anúncios para toda a base

**Sincronização**: Automática (trigger no cadastro)

---

### 2. 📢 Avisos Importantes
**Público**: Todos os usuários (manual)

**Uso**:
- Comunicados críticos do sistema
- Avisos de manutenção
- Mudanças importantes de política
- Atualizações de segurança

**Sincronização**: Manual (admin decide)

**Dica**: Use este grupo com moderação para manter alta taxa de abertura

---

## 💰 Grupos de Assinantes

### 3. ⭐ Assinantes
**Público**: Usuários com assinatura ativa

**Uso**:
- Conteúdo exclusivo para assinantes
- Novos lançamentos de coleções
- Benefícios e vantagens
- Agradecimentos e reconhecimento

**Sincronização**: Automática (trigger em assinaturas)

**Exclusões**:
- ❌ Ex-Assinantes
- ❌ Usuários Free

---

### 4. ⏰ Assinaturas Expirando
**Público**: Assinantes com vencimento em até 7 dias

**Uso**:
- Lembretes de renovação
- Ofertas de retenção
- Instruções de pagamento
- Benefícios de continuar assinando

**Sincronização**: Diária via `sync_segmentation_groups()`

**Estratégia de Retenção**:
```
Dia -7: "Sua assinatura vence em 7 dias"
Dia -3: "Últimos dias! Renove agora"
Dia -1: "Última chance de renovar"
Dia 0: "Sua assinatura expirou hoje"
```

---

### 5. 🔄 Ex-Assinantes
**Público**: Usuários que já tiveram assinatura mas não têm mais

**Uso**:
- Campanhas de reativação
- Ofertas especiais de retorno
- Pesquisas de cancelamento
- Novidades que podem interessar

**Sincronização**: Automática + diária

**Exclusões**:
- ❌ Assinantes ativos
- ❌ Usuários Free (nunca assinaram)

**Estratégia de Reativação**:
```
Semana 1: "Sentimos sua falta!"
Semana 2: "Oferta especial para você voltar"
Mês 1: "Veja o que você está perdendo"
Mês 3: "Desconto exclusivo de retorno"
```

---

### 6. 🆓 Usuários Free
**Público**: Usuários que NUNCA tiveram assinatura

**Uso**:
- Campanhas de conversão
- Demonstrações de valor
- Ofertas de primeira assinatura
- Onboarding e educação

**Sincronização**: Automática + diária

**Exclusões**:
- ❌ Assinantes
- ❌ Ex-Assinantes

**Estratégia de Conversão**:
```
Dia 1: "Bem-vindo! Conheça nossos planos"
Dia 3: "Veja o que você pode acessar"
Dia 7: "Oferta especial de primeira assinatura"
Dia 14: "Últimos dias da oferta!"
```

---

## 📦 Grupos por Coleção

### 7. 📦 [Nome da Coleção]
**Público**: Assinantes de uma coleção específica

**Uso**:
- Novidades da coleção
- Lançamentos de novos itens
- Conteúdo exclusivo da coleção
- Eventos e promoções específicas

**Sincronização**: Automática (trigger em assinaturas)

**Criação**: Automática quando nova coleção é criada

---

## 🎯 Casos de Uso Práticos

### Lançamento de Nova Coleção

1. **Assinantes**: "Nova coleção disponível para você!"
2. **Ex-Assinantes**: "Volte e conheça nossa nova coleção"
3. **Free**: "Assine agora e tenha acesso à nova coleção"

### Promoção de Desconto

1. **Expirando**: "Renove com 20% de desconto"
2. **Ex-Assinantes**: "Volte com 30% de desconto"
3. **Free**: "Primeira assinatura com 40% de desconto"

### Comunicado de Manutenção

1. **Avisos Importantes**: Todos os usuários recebem

### Pesquisa de Satisfação

1. **Assinantes**: "Como está sendo sua experiência?"
2. **Ex-Assinantes**: "Por que você cancelou?"
3. **Free**: "O que te impede de assinar?"

---

## 🔧 Manutenção e Monitoramento

### Sincronização Diária

Configure um cron job para executar diariamente:

```sql
SELECT sync_segmentation_groups();
```

**Horário recomendado**: 03:00 AM (baixo tráfego)

### Monitoramento de Métricas

```sql
-- Dashboard de segmentação
SELECT 
  'Assinantes Ativos' as segmento,
  COUNT(*) as total
FROM chat_group_members m
JOIN chat_groups g ON g.id = m.group_id
WHERE g.name = '⭐ Assinantes'

UNION ALL

SELECT 
  'Expirando (7 dias)' as segmento,
  COUNT(*) as total
FROM chat_group_members m
JOIN chat_groups g ON g.id = m.group_id
WHERE g.name = '⏰ Assinaturas Expirando'

UNION ALL

SELECT 
  'Ex-Assinantes' as segmento,
  COUNT(*) as total
FROM chat_group_members m
JOIN chat_groups g ON g.id = m.group_id
WHERE g.name = '🔄 Ex-Assinantes'

UNION ALL

SELECT 
  'Usuários Free' as segmento,
  COUNT(*) as total
FROM chat_group_members m
JOIN chat_groups g ON g.id = m.group_id
WHERE g.name = '🆓 Usuários Free';
```

### Verificar Exclusão Mútua

```sql
-- Verificar se há usuários em grupos conflitantes
SELECT 
  u.email,
  STRING_AGG(g.name, ', ') as grupos
FROM chat_group_members m
JOIN auth.users u ON u.id = m.user_id
JOIN chat_groups g ON g.id = m.group_id
WHERE g.type IN ('assinantes', 'ex_assinantes', 'free')
GROUP BY u.id, u.email
HAVING COUNT(DISTINCT g.type) > 1;

-- Resultado esperado: 0 linhas (nenhum conflito)
```

---

## 📚 Arquivos Relacionados

- **Migration**: `supabase/migrations/20260224090000_add_segmentation_groups.sql`
- **Sistema Base**: `supabase/migrations/20260224060000_automatic_groups_system.sql`
- **Documentação**: `SISTEMA_GRUPOS_AUTOMATICOS.md`
- **Aplicar**: `aplicar-grupos-segmentacao.bat`

---

## 💡 Dicas de Uso

1. **Não abuse do grupo "Avisos Importantes"** - Use apenas para comunicados críticos
2. **Teste campanhas em grupos pequenos primeiro** - Ex: teste em "Expirando" antes de enviar para "Ex-Assinantes"
3. **Monitore taxas de abertura** - Ajuste frequência de mensagens baseado no engajamento
4. **Personalize mensagens por segmento** - Cada grupo tem necessidades diferentes
5. **Use templates dinâmicos** - Crie templates específicos para cada segmento
6. **Acompanhe conversões** - Meça quantos Free viram Assinantes após campanhas
7. **Analise churn** - Entenda padrões de cancelamento no grupo "Ex-Assinantes"

