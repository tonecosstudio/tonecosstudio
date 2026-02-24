# Sistema de Templates Dinâmicos - Respostas Rápidas ✨

## Data: 22/02/2026

## Resumo Executivo

Sistema de templates dinâmicos implementado para respostas rápidas. Permite usar variáveis que são automaticamente substituídas por dados reais do cliente (pedidos, rastreio, pagamentos, orçamentos, assinatura).

---

## Funcionalidades

### 1. Variáveis Disponíveis

#### Dados do Cliente
- `{{NOME_CLIENTE}}` - Nome completo do cliente
- `{{EMAIL_CLIENTE}}` - Email do cliente

#### Pedidos
- `{{ULTIMO_PEDIDO_ID}}` - ID do pedido mais recente
- `{{ULTIMO_PEDIDO_STATUS}}` - Status atual (traduzido)
- `{{ULTIMO_PEDIDO_RASTREIO}}` - Código de rastreamento
- `{{ULTIMO_PEDIDO_DATA}}` - Data de criação

#### Orçamentos
- `{{ULTIMO_ORCAMENTO_ID}}` - ID do orçamento mais recente
- `{{ULTIMO_ORCAMENTO_VALOR}}` - Valor total formatado

#### Pagamentos
- `{{ULTIMO_PAGAMENTO_VALOR}}` - Valor do pagamento mais recente
- `{{ULTIMO_PAGAMENTO_STATUS}}` - Status do pagamento (traduzido)

#### Assinatura
- `{{ASSINATURA_PLANO}}` - Nome do plano ativo
- `{{ASSINATURA_STATUS}}` - Status da assinatura

#### Data e Hora
- `{{DATA_HOJE}}` - Data atual formatada (dd/mm/aaaa)
- `{{HORA_ATUAL}}` - Hora atual formatada (hh:mm)

---

## Como Funciona

### 1. Criar Template com Variáveis

No gerenciador de respostas rápidas (`/admin/respostas-rapidas`):

```
Título: Informar Código de Rastreio

Mensagem:
Olá {{NOME_CLIENTE}}! 👋

Seu pedido {{ULTIMO_PEDIDO_ID}} já foi enviado! 📦

🔍 Código de rastreamento: {{ULTIMO_PEDIDO_RASTREIO}}

Você pode acompanhar a entrega através dos Correios.
```

### 2. Usar no Chat

1. Abrir conversa com cliente
2. Clicar em "Respostas Rápidas"
3. Templates com variáveis mostram ícone ✨
4. Ao selecionar, sistema:
   - Busca dados do cliente no banco
   - Substitui variáveis por valores reais
   - Mostra preview da mensagem processada
5. Confirmar para usar a mensagem

### 3. Preview Automático

Quando template tem variáveis:
- Sistema mostra preview antes de inserir
- Exibe template original
- Exibe mensagem processada com dados reais
- Permite confirmar ou voltar

---

## Exemplos de Uso

### Exemplo 1: Rastreamento

**Template:**
```
Olá {{NOME_CLIENTE}}!

Seu pedido {{ULTIMO_PEDIDO_ID}} foi enviado!

Código: {{ULTIMO_PEDIDO_RASTREIO}}
```

**Processado:**
```
Olá João Silva!

Seu pedido #a1b2c3d4 foi enviado!

Código: BR123456789BR
```

### Exemplo 2: Status do Pedido

**Template:**
```
Oi {{NOME_CLIENTE}}!

Pedido: {{ULTIMO_PEDIDO_ID}}
Status: {{ULTIMO_PEDIDO_STATUS}}
Data: {{ULTIMO_PEDIDO_DATA}}
```

**Processado:**
```
Oi Maria Santos!

Pedido: #x9y8z7w6
Status: Em produção
Data: 15/02/2026
```

### Exemplo 3: Pagamento

**Template:**
```
Olá {{NOME_CLIENTE}}!

Pagamento confirmado! ✅

Valor: {{ULTIMO_PAGAMENTO_VALOR}}
Status: {{ULTIMO_PAGAMENTO_STATUS}}
```

**Processado:**
```
Olá Pedro Costa!

Pagamento confirmado! ✅

Valor: R$ 150,00
Status: Aprovado
```

### Exemplo 4: Orçamento

**Template:**
```
Oi {{NOME_CLIENTE}}!

Orçamento: {{ULTIMO_ORCAMENTO_ID}}
Valor: {{ULTIMO_ORCAMENTO_VALOR}}

Ainda tem interesse?
```

**Processado:**
```
Oi Ana Lima!

Orçamento: #ORC-abc123
Valor: R$ 250,00

Ainda tem interesse?
```

---

## Arquitetura

### Serviço de Templates

**Arquivo:** `src/lib/services/templateService.ts`

**Funções Principais:**

1. `fetchCustomerData(userId)` - Busca dados do cliente
2. `processTemplate(template, customerData)` - Substitui variáveis
3. `detectVariables(template)` - Detecta variáveis usadas
4. `validateTemplate(template)` - Valida variáveis

### Componente Atualizado

**Arquivo:** `src/components/admin/QuickRepliesSelector.tsx`

**Melhorias:**
- Detecta templates com variáveis (ícone ✨)
- Processa templates automaticamente
- Mostra preview antes de usar
- Permite confirmar ou cancelar

### Integração

**Arquivo:** `src/components/admin/ChatInterface.tsx`

**Mudança:**
```typescript
<QuickRepliesSelector 
  onSelect={handleQuickReplySelect} 
  userId={conversation?.user_id}  // ← Passa userId
/>
```

---

## Instalação dos Templates

### 1. Executar SQL

```bash
# Abrir Supabase SQL Editor
# Copiar conteúdo de adicionar-templates-dinamicos.sql
# Executar
```

### 2. Verificar Templates

```sql
SELECT category, title, message 
FROM quick_replies 
WHERE is_active = true
ORDER BY display_order;
```

---

## Tradução de Status

### Status de Pedido
- `pending` → Pendente
- `confirmed` → Confirmado
- `in_production` → Em produção
- `ready` → Pronto
- `shipped` → Enviado
- `delivered` → Entregue
- `cancelled` → Cancelado

### Status de Pagamento
- `pending` → Pendente
- `approved` → Aprovado
- `rejected` → Rejeitado
- `cancelled` → Cancelado

---

## Formatação Automática

### Valores Monetários
```
R$ 150,00  (formato brasileiro)
```

### Datas
```
22/02/2026  (dd/mm/aaaa)
```

### Hora
```
14:30  (hh:mm)
```

### IDs
```
#a1b2c3d4  (primeiros 8 caracteres)
#ORC-abc123  (orçamentos)
```

---

## Casos Especiais

### Cliente Sem Pedidos
```
{{ULTIMO_PEDIDO_ID}} → "Nenhum pedido"
{{ULTIMO_PEDIDO_STATUS}} → "N/A"
```

### Cliente Sem Assinatura
```
{{ASSINATURA_PLANO}} → "Sem assinatura"
{{ASSINATURA_STATUS}} → "N/A"
```

### Rastreio Não Disponível
```
{{ULTIMO_PEDIDO_RASTREIO}} → "Não disponível"
```

---

## Benefícios

### Para o Admin
✅ Respostas mais rápidas e precisas
✅ Menos erros de digitação
✅ Informações sempre atualizadas
✅ Profissionalismo no atendimento

### Para o Cliente
✅ Respostas personalizadas
✅ Informações corretas e atualizadas
✅ Sensação de atendimento humanizado
✅ Confiança no suporte

---

## Testes Recomendados

### Teste 1: Template Simples
1. Criar template sem variáveis
2. Selecionar no chat
3. Verificar se insere diretamente

### Teste 2: Template com Variáveis
1. Criar template com `{{NOME_CLIENTE}}`
2. Selecionar no chat
3. Verificar preview
4. Confirmar
5. Verificar se nome foi substituído

### Teste 3: Pedido com Rastreio
1. Cliente com pedido enviado
2. Usar template de rastreamento
3. Verificar se código aparece correto

### Teste 4: Cliente Sem Dados
1. Cliente novo sem pedidos
2. Usar template de pedido
3. Verificar se mostra "Nenhum pedido"

### Teste 5: Múltiplas Variáveis
1. Template com várias variáveis
2. Verificar se todas são substituídas
3. Verificar formatação

---

## Criando Novos Templates

### Passo a Passo

1. **Acessar Gerenciador**
   ```
   /admin/respostas-rapidas
   ```

2. **Criar Novo Template**
   - Título descritivo
   - Categoria apropriada
   - Mensagem com variáveis

3. **Usar Variáveis**
   ```
   Olá {{NOME_CLIENTE}}!
   
   [Sua mensagem aqui]
   
   Pedido: {{ULTIMO_PEDIDO_ID}}
   Status: {{ULTIMO_PEDIDO_STATUS}}
   ```

4. **Testar**
   - Abrir chat com cliente
   - Selecionar template
   - Verificar preview
   - Confirmar

### Boas Práticas

✅ Use nomes descritivos para títulos
✅ Agrupe por categoria
✅ Teste com clientes reais
✅ Mantenha mensagens profissionais
✅ Use emojis com moderação
✅ Verifique ortografia

❌ Não use muitas variáveis em um template
❌ Não crie templates muito longos
❌ Não use variáveis inexistentes
❌ Não esqueça de testar

---

## Variáveis Personalizadas (Futuro)

### Possíveis Expansões

- `{{NOME_PRODUTO}}` - Nome do produto do pedido
- `{{QUANTIDADE}}` - Quantidade de itens
- `{{PRAZO_ENTREGA}}` - Prazo estimado
- `{{LINK_RASTREIO}}` - Link direto para rastreamento
- `{{CUPOM_DESCONTO}}` - Cupom personalizado
- `{{PONTOS_FIDELIDADE}}` - Pontos do cliente

---

## Troubleshooting

### Variável Não Substituída

**Problema:** Variável aparece como `{{NOME_CLIENTE}}` na mensagem

**Soluções:**
1. Verificar se userId está sendo passado
2. Verificar se cliente existe no banco
3. Verificar console para erros
4. Verificar se variável está escrita corretamente

### Preview Não Aparece

**Problema:** Template não mostra preview

**Soluções:**
1. Verificar se template tem variáveis
2. Verificar se userId está disponível
3. Limpar cache do navegador
4. Verificar console para erros

### Dados Incorretos

**Problema:** Dados substituídos estão errados

**Soluções:**
1. Verificar se cliente tem dados no banco
2. Verificar se está pegando último pedido/pagamento
3. Verificar formatação de datas/valores
4. Verificar tradução de status

---

## Conclusão

Sistema de templates dinâmicos implementado com sucesso! Permite criar respostas rápidas personalizadas que se adaptam automaticamente aos dados de cada cliente, tornando o atendimento mais eficiente e profissional.

✅ 14 variáveis disponíveis
✅ Preview automático
✅ Formatação inteligente
✅ Tradução de status
✅ Fácil de usar
✅ Extensível

**O sistema está pronto para uso em produção!**
