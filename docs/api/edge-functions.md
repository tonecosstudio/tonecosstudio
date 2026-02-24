# ⚡ Edge Functions - Ordax

Documentação completa das Supabase Edge Functions (Deno Deploy).

---

## 📋 Visão Geral

Edge Functions são funções serverless que rodam globalmente na edge (Deno Deploy), próximas aos usuários para baixa latência.

### Características

- **Runtime**: Deno (TypeScript/JavaScript)
- **Deploy**: Global (Deno Deploy)
- **Latência**: < 100ms
- **Escalabilidade**: Automática
- **Timeout**: 150 segundos

---

## 📚 Funções Disponíveis

### 1. send-email

**Descrição**: Envia notificações por email para mensagens de chat.

**Endpoint**: `https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/send-email`

**Método**: POST

**Autenticação**: Service Role Key

**Payload**:

```typescript
{
  conversationId: string;
  messageId: string;
  recipientUserId: string;
  messageContent: string;
}
```

**Resposta**:

```typescript
{
  success: boolean;
  emailId?: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
}
```

**Funcionalidades**:

- Verifica se usuário está online (últimos 5 min)
- Suporta Resend e SendGrid
- Retry com exponential backoff (3 tentativas)
- Template HTML responsivo com dark mode
- Log de notificações

**Variáveis de Ambiente**:

```env
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_xxx
EMAIL_FROM=suporte@ordax.com.br
EMAIL_FROM_NAME=Ordax Suporte
BASE_URL=https://ordax.com.br
```

**Exemplo de Uso**:

```typescript
const { data, error } = await supabase.functions.invoke("send-email", {
  body: {
    conversationId: "uuid",
    messageId: "uuid",
    recipientUserId: "uuid",
    messageContent: "Olá! Como posso ajudar?",
  },
});
```

---

### 2. admin-list-users

**Descrição**: Lista todos os usuários (apenas para admins).

**Endpoint**: `https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/admin-list-users`

**Método**: GET

**Autenticação**: Bearer Token (admin)

**Resposta**:

```typescript
{
  users: Array<{
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string;
    profile: {
      full_name: string;
      phone: string;
      // ...
    };
    roles: string[];
  }>;
}
```

**Funcionalidades**:

- Verifica se usuário é admin
- Lista todos os usuários do auth
- Combina com dados de profiles
- Inclui roles

**Exemplo de Uso**:

```typescript
const { data, error } = await supabase.functions.invoke("admin-list-users", {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});
```

---

### 3. admin-promote

**Descrição**: Promove usuário a admin.

**Endpoint**: `https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/admin-promote`

**Método**: POST

**Autenticação**: Service Role Key

**Payload**:

```typescript
{
  user_id: string;
}
```

**Resposta**:

```typescript
{
  success: boolean;
  message: string;
}
```

**Exemplo de Uso**:

```typescript
const { data, error } = await supabase.functions.invoke("admin-promote", {
  body: { user_id: "uuid" },
});
```

---

### 4. auto-sync-groups

**Descrição**: Sincroniza membros de grupos automaticamente.

**Endpoint**: `https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/auto-sync-groups`

**Método**: POST

**Autenticação**: Service Role Key

**Agendamento**: Cron job (a cada 10-15 min)

**Resposta**:

```typescript
{
  success: boolean;
  message: string;
  summary: {
    groupsProcessed: number;
    totalAdded: number;
    totalRemoved: number;
    errors: number;
  }
  results: Array<{
    groupId: string;
    groupName: string;
    added: number;
    removed: number;
    error?: string;
  }>;
}
```

**Funcionalidades**:

- Sincroniza grupos automáticos
- Adiciona novos membros
- Remove membros inválidos
- Suporta múltiplos critérios

**Critérios Suportados**:

- `assinantes`: Usuários com assinatura ativa
- `colecao`: Assinantes de coleção específica
- `lancamentos`: Todos ou compradores anteriores
- `pedidos`: Por status/data de pedidos

---

### 5. send-group-emails-batch

**Descrição**: Envia emails em lote para membros de grupo.

**Endpoint**: `https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/send-group-emails-batch`

**Método**: POST

**Autenticação**: Bearer Token (admin)

**Payload**:

```typescript
{
  groupId: string;
  subject: string;
  content: string;
}
```

**Resposta**:

```typescript
{
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}
```

**Funcionalidades**:

- Envia para todos os membros do grupo
- Processamento em lote
- Retry automático
- Log de envios

---

### 6. classify-image-vision

**Descrição**: Classifica imagem usando OpenAI GPT-4o-mini Vision.

**Endpoint**: `https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/classify-image-vision`

**Método**: POST

**Autenticação**: Bearer Token

**Payload**:

```typescript
{
  imageUrl: string;
  queueItemId: string;
}
```

**Resposta**:

```typescript
{
  success: boolean;
  classification: {
    characterName: string;
    franchiseName: string;
    confidence: number;
  }
}
```

**Funcionalidades**:

- Análise de imagem com IA
- Extração de personagem e franquia
- Score de confiança
- Atualização automática da fila

**Variáveis de Ambiente**:

```env
OPENAI_API_KEY=sk-xxx
```

---

### 7. classify-name

**Descrição**: Classifica nome de personagem usando OpenAI.

**Endpoint**: `https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/classify-name`

**Método**: POST

**Payload**:

```typescript
{
  name: string;
}
```

**Resposta**:

```typescript
{
  franchise: string;
  confidence: number;
}
```

---

### 8. analyze-preferences

**Descrição**: Analisa preferências do usuário com IA.

**Endpoint**: `https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/analyze-preferences`

**Método**: POST

**Payload**:

```typescript
{
  userId: string;
}
```

**Resposta**:

```typescript
{
  preferences: {
    favoriteGenres: string[];
    suggestedCollections: string[];
  };
}
```

---

### 9. create-subscription

**Descrição**: Cria nova assinatura.

**Endpoint**: `https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/create-subscription`

**Método**: POST

**Payload**:

```typescript
{
  planId: string;
  collectionId: string;
  paymentMethodId: string;
}
```

**Resposta**:

```typescript
{
  success: boolean;
  subscriptionId: string;
  paymentLink?: string;
}
```

---

### 10. cancel-subscription

**Descrição**: Cancela assinatura existente.

**Endpoint**: `https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cancel-subscription`

**Método**: POST

**Payload**:

```typescript
{
  subscriptionId: string;
  reason?: string;
}
```

---

### 11. get-my-subscriptions

**Descrição**: Retorna assinaturas do usuário autenticado.

**Endpoint**: `https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/get-my-subscriptions`

**Método**: GET

**Autenticação**: Bearer Token

**Resposta**:

```typescript
{
  subscriptions: Array<{
    id: string;
    plan: string;
    status: string;
    collection: object;
    // ...
  }>;
}
```

---

### 12. process-queue-batch

**Descrição**: Processa lote de itens da fila de upload.

**Endpoint**: `https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/process-queue-batch`

**Método**: POST

**Payload**:

```typescript
{
  batchSize: number;
}
```

---

### 13. queue-reject

**Descrição**: Rejeita item da fila de upload.

**Endpoint**: `https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/queue-reject`

**Método**: POST

**Payload**:

```typescript
{
  queueItemId: string;
  reason: string;
}
```

---

### 14. confirm-model

**Descrição**: Confirma modelo após aprovação.

**Endpoint**: `https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/confirm-model`

**Método**: POST

**Payload**:

```typescript
{
  queueItemId: string;
  characterData: object;
}
```

---

### 15. bootstrap-admin

**Descrição**: Cria primeiro usuário admin (apenas desenvolvimento).

**Endpoint**: `https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/bootstrap-admin`

**Método**: POST

**Payload**:

```typescript
{
  email: string;
  password: string;
}
```

---

## 🔧 Desenvolvimento Local

### Setup

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar Supabase local
supabase start

# Servir function localmente
supabase functions serve send-email --env-file .env.local
```

### Testar Localmente

```bash
# Invocar function
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-email' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"conversationId":"uuid","messageId":"uuid","recipientUserId":"uuid","messageContent":"Test"}'
```

---

## 🚀 Deploy

### Deploy Todas

```bash
supabase functions deploy
```

### Deploy Individual

```bash
supabase functions deploy send-email
```

### Com Secrets

```bash
# Configurar secrets no Dashboard
# Supabase Dashboard > Edge Functions > Secrets

# Ou via CLI
supabase secrets set EMAIL_API_KEY=xxx
```

---

## 📊 Monitoramento

### Ver Logs

```bash
# Logs em tempo real
supabase functions logs send-email --tail

# Logs recentes
supabase functions logs send-email --limit 100
```

### Métricas

Acesse: Supabase Dashboard > Edge Functions > [Function Name] > Metrics

**Métricas Disponíveis**:

- Invocações
- Duração média
- Taxa de erro
- Uso de memória

---

## 🔒 Segurança

### Autenticação

**Service Role Key** (backend):

```typescript
const supabase = createClient(url, serviceRoleKey);
```

**Anon Key + JWT** (frontend):

```typescript
const supabase = createClient(url, anonKey);
// JWT automático via session
```

### CORS

Todas as functions incluem headers CORS:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

### Rate Limiting

Implementado no Supabase (configurável no Dashboard).

---

## 🧪 Testes

### Teste Manual

```bash
# Via curl
curl -X POST https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"uuid","messageId":"uuid","recipientUserId":"uuid","messageContent":"Test"}'
```

### Teste Automatizado

```typescript
// src/test/edge-functions.test.ts
import { supabase } from "@/integrations/supabase/client";

test("send-email function", async () => {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: {
      conversationId: "test-uuid",
      messageId: "test-uuid",
      recipientUserId: "test-uuid",
      messageContent: "Test message",
    },
  });

  expect(error).toBeNull();
  expect(data.success).toBe(true);
});
```

---

## 🐛 Troubleshooting

### Function não responde

1. Verificar logs: `supabase functions logs [name]`
2. Verificar secrets configurados
3. Verificar timeout (150s max)

### Erro de autenticação

1. Verificar JWT válido
2. Verificar permissões (admin/user)
3. Verificar RLS policies

### Erro de CORS

1. Verificar headers CORS na function
2. Verificar método HTTP (OPTIONS)
3. Verificar origem permitida

---

## 📚 Referências

### Código-Fonte

**Localização**: `supabase/functions/`

**Estrutura**:

```
supabase/functions/
├── _shared/
│   └── cors.ts
├── send-email/
│   └── index.ts
├── admin-list-users/
│   └── index.ts
└── ...
```

### Documentação Oficial

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Deno Deploy](https://deno.com/deploy/docs)
- [Deno Standard Library](https://deno.land/std)

---

## 🎯 Melhores Práticas

### Performance

1. **Minimize cold starts**: Mantenha functions pequenas
2. **Cache quando possível**: Use variáveis globais
3. **Timeout adequado**: Configure timeout apropriado
4. **Retry logic**: Implemente retry para operações críticas

### Segurança

1. **Valide inputs**: Sempre valide payload
2. **Use service role com cuidado**: Apenas quando necessário
3. **Log sensível**: Não logue dados sensíveis
4. **Rate limiting**: Configure limites apropriados

### Manutenibilidade

1. **Código limpo**: TypeScript + tipos
2. **Documentação**: Comente código complexo
3. **Testes**: Teste localmente antes de deploy
4. **Versionamento**: Use git tags para releases

---

**Última atualização**: 2026-02-24  
**Versão**: 1.0.0  
**Status**: ✅ Produção
