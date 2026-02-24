# Templates Dinâmicos - Modo Parcial 🔧

## Status Atual

Sistema de templates dinâmicos funcionando em **modo parcial** para evitar erros 404/400 no console.

---

## Variáveis Disponíveis Atualmente

### ✅ Funcionando
- `{{NOME_CLIENTE}}` - Nome do cliente (tabela profiles)
- `{{EMAIL_CLIENTE}}` - Email do cliente (tabela profiles)
- `{{ULTIMO_ORCAMENTO_ID}}` - ID do orçamento (tabela quotes)
- `{{ULTIMO_ORCAMENTO_VALOR}}` - Valor do orçamento (tabela quotes)
- `{{ULTIMO_PAGAMENTO_VALOR}}` - Valor do pagamento (tabela manual_payments)
- `{{ULTIMO_PAGAMENTO_STATUS}}` - Status do pagamento (tabela manual_payments)
- `{{DATA_HOJE}}` - Data atual
- `{{HORA_ATUAL}}` - Hora atual

### ⏸️ Temporariamente Desabilitadas
- `{{ULTIMO_PEDIDO_ID}}` - Requer tabela preorders ou orders
- `{{ULTIMO_PEDIDO_STATUS}}` - Requer tabela preorders ou orders
- `{{ULTIMO_PEDIDO_RASTREIO}}` - Requer tabela preorders ou orders
- `{{ULTIMO_PEDIDO_DATA}}` - Requer tabela preorders ou orders
- `{{ASSINATURA_PLANO}}` - Requer tabela subscriptions
- `{{ASSINATURA_STATUS}}` - Requer tabela subscriptions

---

## Por Que Foram Desabilitadas?

As tabelas `preorders`, `orders` e `subscriptions` não existem ou têm estrutura diferente no banco de dados atual, causando erros 404/400 no console:

```
GET /rest/v1/preorders?... 404 (Not Found)
GET /rest/v1/orders?... 404 (Not Found)
GET /rest/v1/subscriptions?... 400 (Bad Request)
```

Para manter o console limpo e profissional, essas queries foram comentadas temporariamente no código.

---

## Como Reativar

### Opção 1: Criar as Tabelas

Se você precisa dessas variáveis, crie as tabelas no Supabase:

#### Tabela `preorders` ou `orders`
```sql
CREATE TABLE IF NOT EXISTS preorders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  status TEXT,
  tracking_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tabela `subscriptions`
```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Opção 2: Descomentar o Código

Após criar as tabelas, descomente o código em `src/lib/services/templateService.ts`:

```typescript
// Procure por este comentário:
// NOTA: Tabelas preorders, orders e subscriptions desabilitadas temporariamente

// E descomente o bloco de código abaixo dele
```

---

## Templates Que Funcionam Agora

### Template 1: Saudação com Nome
```
Olá {{NOME_CLIENTE}}! 👋

Como posso te ajudar hoje?

Atendimento em {{DATA_HOJE}} às {{HORA_ATUAL}}.
```

### Template 2: Orçamento
```
Oi {{NOME_CLIENTE}}!

Seu orçamento {{ULTIMO_ORCAMENTO_ID}} no valor de {{ULTIMO_ORCAMENTO_VALOR}} está pronto!

Posso te ajudar com alguma dúvida?
```

### Template 3: Pagamento
```
Olá {{NOME_CLIENTE}}!

Confirmamos o recebimento do pagamento de {{ULTIMO_PAGAMENTO_VALOR}}.

Status: {{ULTIMO_PAGAMENTO_STATUS}}

Obrigado! 🙏
```

### Template 4: Despedida
```
Obrigado pelo contato, {{NOME_CLIENTE}}!

Atendimento realizado em {{DATA_HOJE}} às {{HORA_ATUAL}}.

Qualquer dúvida, estou por aqui! ✨
```

---

## Templates Que NÃO Funcionam Agora

Estes templates usam variáveis desabilitadas:

### ❌ Template de Rastreamento
```
Olá {{NOME_CLIENTE}}!

Seu pedido {{ULTIMO_PEDIDO_ID}} foi enviado!

Código: {{ULTIMO_PEDIDO_RASTREIO}}
```
**Problema:** Requer tabela preorders/orders

### ❌ Template de Status do Pedido
```
Oi {{NOME_CLIENTE}}!

Pedido: {{ULTIMO_PEDIDO_ID}}
Status: {{ULTIMO_PEDIDO_STATUS}}
```
**Problema:** Requer tabela preorders/orders

### ❌ Template de Assinatura
```
Olá {{NOME_CLIENTE}}!

Plano: {{ASSINATURA_PLANO}}
Status: {{ASSINATURA_STATUS}}
```
**Problema:** Requer tabela subscriptions

---

## Solução Temporária

Enquanto as tabelas não são criadas, use templates que funcionam:

### Criar Novos Templates

1. Acessar `/admin/respostas-rapidas`
2. Criar templates usando apenas variáveis disponíveis:
   - `{{NOME_CLIENTE}}`
   - `{{EMAIL_CLIENTE}}`
   - `{{ULTIMO_ORCAMENTO_ID}}`
   - `{{ULTIMO_ORCAMENTO_VALOR}}`
   - `{{ULTIMO_PAGAMENTO_VALOR}}`
   - `{{ULTIMO_PAGAMENTO_STATUS}}`
   - `{{DATA_HOJE}}`
   - `{{HORA_ATUAL}}`

### Editar Templates Existentes

Os templates criados pela migration podem não funcionar completamente. Edite-os para remover variáveis de pedidos e assinaturas.

---

## Console Limpo ✅

Com as queries desabilitadas, o console agora mostra apenas:

```
✅ Sentry DSN não configurado (normal)
✅ Logs de Realtime (normal)
✅ Logs de mensagens (normal)
```

Sem erros 404/400! 🎉

---

## Quando Reativar?

Reative as variáveis de pedidos e assinaturas quando:

1. ✅ Tabelas `preorders` ou `orders` forem criadas
2. ✅ Tabela `subscriptions` for criada
3. ✅ Estrutura das tabelas estiver correta
4. ✅ Dados de teste forem adicionados

---

## Arquivo de Configuração

**Localização:** `src/lib/services/templateService.ts`

**Linha:** ~80 (procure por "NOTA: Tabelas preorders")

**Ação:** Descomentar bloco de código quando tabelas existirem

---

## Conclusão

Sistema de templates dinâmicos funcionando em modo parcial:

✅ 8 variáveis disponíveis
✅ Console limpo sem erros
✅ Templates básicos funcionando
✅ Fácil de reativar quando necessário

⏸️ 6 variáveis temporariamente desabilitadas
⏸️ Aguardando criação de tabelas

**O sistema continua funcional e profissional!**
