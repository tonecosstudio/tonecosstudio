# Email Templates - ORDAX

Este diretório contém os templates HTML para os emails transacionais do sistema ORDAX.

## Visão Geral

Todos os templates são responsivos e compatíveis com os principais clientes de email (Gmail, Outlook, Apple Mail, etc.). Os templates usam HTML inline CSS para máxima compatibilidade.

## Templates Disponíveis

### 1. welcome.html
**Propósito:** Email de boas-vindas enviado após confirmação de assinatura.

**Variáveis:**
- `{{userName}}` - Nome do usuário
- `{{planType}}` - Tipo do plano (Trimestral/Semestral)
- `{{deliveriesTotal}}` - Número total de entregas
- `{{totalPaid}}` - Valor total pago (formatado: R$ 0.00)
- `{{deliveries}}` - Array de entregas com:
  - `{{deliveryNumber}}` - Número da entrega
  - `{{expectedDate}}` - Data prevista de envio
  - `{{isBonusPiece}}` - Boolean indicando se inclui peça bônus
- `{{dashboardUrl}}` - URL do painel do assinante
- `{{supportEmail}}` - Email de suporte

**Requisitos:** 17.1

---

### 2. choice-reminder.html
**Propósito:** Lembrete para escolha de coleção (normal ou urgente).

**Variáveis:**
- `{{userName}}` - Nome do usuário
- `{{isUrgent}}` - Boolean (true = 3 dias ou menos até cutoff)
- `{{daysUntilCutoff}}` - Dias restantes até o prazo
- `{{deliveryNumber}}` - Número da entrega
- `{{expectedShippingDate}}` - Data prevista de envio
- `{{currentCollection}}` - Nome da coleção atual (opcional)
- `{{collectionSelectionUrl}}` - URL para seleção de coleção
- `{{supportEmail}}` - Email de suporte

**Requisitos:** 17.2, 17.3

---

### 3. character-revelation.html
**Propósito:** Revelação do personagem da coleção escolhida.

**Variáveis:**
- `{{userName}}` - Nome do usuário
- `{{collectionName}}` - Nome da coleção
- `{{characterName}}` - Nome do personagem revelado
- `{{characterImageUrl}}` - URL da imagem do personagem
- `{{characterDescription}}` - Descrição do personagem (opcional)
- `{{deliveryNumber}}` - Número da entrega
- `{{expectedShippingDate}}` - Data prevista de envio
- `{{dashboardUrl}}` - URL do painel do assinante
- `{{supportEmail}}` - Email de suporte

**Requisitos:** 17.4

---

### 4. production-started.html
**Propósito:** Notificação de início de produção da peça.

**Variáveis:**
- `{{userName}}` - Nome do usuário
- `{{collectionName}}` - Nome da coleção
- `{{characterName}}` - Nome do personagem (opcional)
- `{{deliveryNumber}}` - Número da entrega
- `{{expectedShippingDate}}` - Data prevista de envio
- `{{isBonusPiece}}` - Boolean indicando se inclui peça bônus
- `{{trackingUrl}}` - URL para acompanhamento da entrega
- `{{supportEmail}}` - Email de suporte

**Requisitos:** 17.5

---

### 5. shipping-notification.html
**Propósito:** Notificação de envio com código de rastreamento.

**Variáveis:**
- `{{userName}}` - Nome do usuário
- `{{shippingDate}}` - Data de envio (formatada)
- `{{trackingCode}}` - Código de rastreamento
- `{{trackingUrl}}` - URL para rastreamento na transportadora
- `{{collectionName}}` - Nome da coleção
- `{{characterName}}` - Nome do personagem (opcional)
- `{{deliveryNumber}}` - Número da entrega
- `{{carrier}}` - Nome da transportadora
- `{{estimatedDeliveryDate}}` - Previsão de entrega
- `{{isBonusPiece}}` - Boolean indicando se inclui peça bônus
- `{{shippingAddress}}` - Objeto com:
  - `{{street}}` - Rua
  - `{{number}}` - Número
  - `{{complement}}` - Complemento (opcional)
  - `{{neighborhood}}` - Bairro
  - `{{city}}` - Cidade
  - `{{state}}` - Estado (sigla)
  - `{{zipCode}}` - CEP (formatado: 00000-000)
- `{{dashboardUrl}}` - URL do painel do assinante
- `{{supportEmail}}` - Email de suporte

**Requisitos:** 17.6

---

### 6. balance-reminder.html
**Propósito:** Lembrete de pagamento do saldo (compra avulsa).

**Variáveis:**
- `{{userName}}` - Nome do usuário
- `{{isUrgent}}` - Boolean (true = 1 dia ou menos até prazo)
- `{{balanceAmount}}` - Valor do saldo (formatado: R$ 0.00)
- `{{depositAmount}}` - Valor da entrada (formatado: R$ 0.00)
- `{{totalAmount}}` - Valor total (formatado: R$ 0.00)
- `{{balanceDueDate}}` - Data limite para pagamento (formatada)
- `{{daysRemaining}}` - Dias restantes (para modo urgente)
- `{{orderId}}` - ID do pedido
- `{{collectionName}}` - Nome da coleção
- `{{characterName}}` - Nome do personagem (opcional)
- `{{paymentUrl}}` - URL para página de pagamento
- `{{supportEmail}}` - Email de suporte

**Requisitos:** 17.7, 17.8

---

### 7. cancellation-notice.html
**Propósito:** Notificação de cancelamento por não pagamento.

**Variáveis:**
- `{{userName}}` - Nome do usuário
- `{{orderId}}` - ID do pedido
- `{{cancellationDate}}` - Data do cancelamento (formatada)
- `{{cancellationReason}}` - Motivo do cancelamento
- `{{collectionName}}` - Nome da coleção
- `{{characterName}}` - Nome do personagem (opcional)
- `{{purchaseDate}}` - Data da compra (formatada)
- `{{balanceDueDate}}` - Data limite que foi perdida (formatada)
- `{{depositAmount}}` - Valor retido (formatado: R$ 0.00)
- `{{balanceAmount}}` - Valor não pago (formatado: R$ 0.00)
- `{{totalAmount}}` - Valor total (formatado: R$ 0.00)
- `{{shopUrl}}` - URL da loja
- `{{supportEmail}}` - Email de suporte

**Requisitos:** 17.9

---

## Sistema de Templates

Os templates usam sintaxe Handlebars para variáveis dinâmicas:

### Variáveis Simples
```html
<p>Olá, {{userName}}!</p>
```

### Condicionais
```html
{{#if isUrgent}}
  <p>Urgente!</p>
{{else}}
  <p>Normal</p>
{{/if}}
```

### Loops
```html
{{#each deliveries}}
  <div>Entrega {{deliveryNumber}}</div>
{{/each}}
```

### Comparações
```html
{{#if (eq daysRemaining 1)}}
  <p>1 dia</p>
{{else}}
  <p>{{daysRemaining}} dias</p>
{{/if}}
```

## Boas Práticas

### 1. Compatibilidade com Clientes de Email
- Todos os estilos são inline para máxima compatibilidade
- Tabelas são usadas para layout (não flexbox/grid)
- Fontes web-safe são usadas como fallback
- Imagens têm alt text descritivo

### 2. Responsividade
- Media queries para telas menores que 600px
- Tamanhos de fonte ajustáveis
- Padding reduzido em mobile
- Botões com tamanho de toque adequado (min 44px)

### 3. Acessibilidade
- Contraste adequado de cores (WCAG AA)
- Hierarquia semântica de headings
- Alt text em todas as imagens
- Links descritivos

### 4. Formatação de Valores
- Moeda: `R$ 0.00` (sempre com 2 casas decimais)
- Datas: `DD/MM/YYYY` ou `DD de Mês de YYYY`
- CEP: `00000-000`
- Horários: `HH:MM` (formato 24h)

### 5. Timezone
- Todas as datas/horários devem estar em horário de Salvador/BA (America/Bahia)
- Mencionar explicitamente quando relevante (ex: "23:59:59 horário de Salvador/BA")

## Integração com Email Service

Os templates devem ser renderizados pelo email service usando um template engine (ex: Handlebars):

```typescript
import Handlebars from 'handlebars';
import fs from 'fs';

// Carregar template
const templateSource = fs.readFileSync('src/email-templates/welcome.html', 'utf-8');
const template = Handlebars.compile(templateSource);

// Renderizar com dados
const html = template({
  userName: 'João Silva',
  planType: 'Semestral',
  deliveriesTotal: 6,
  totalPaid: '599.90',
  // ... outras variáveis
});

// Enviar email
await emailService.sendEmail(userEmail, 'Bem-vindo ao ORDAX', html);
```

## Testes

Para testar os templates:

1. **Teste Visual:** Abra o HTML diretamente no navegador
2. **Teste de Email:** Use serviços como [Litmus](https://litmus.com) ou [Email on Acid](https://www.emailonacid.com)
3. **Teste de Variáveis:** Renderize com dados de teste e verifique substituições
4. **Teste Responsivo:** Redimensione a janela ou use DevTools

## Manutenção

Ao modificar templates:

1. Mantenha a estrutura HTML compatível com clientes de email
2. Teste em múltiplos clientes (Gmail, Outlook, Apple Mail)
3. Verifique responsividade em mobile
4. Atualize este README se adicionar novas variáveis
5. Mantenha consistência visual entre templates

## Suporte

Para dúvidas sobre os templates, consulte:
- Design Document: `.kiro/specs/ordax-complete-system/design.md`
- Requirements: `.kiro/specs/ordax-complete-system/requirements.md`
- Email Service: `src/services/email-service.ts`


## Como Usar

### Método sendWelcomeEmail

O serviço de email fornece um método conveniente para enviar o email de boas-vindas:

```typescript
import { emailService } from '@/services/email-service';

// Após criar uma assinatura
const subscription = await createSubscription(userId, planType, collectionId);

// Enviar email de boas-vindas
await emailService.sendWelcomeEmail(subscription.id);
```

O método `sendWelcomeEmail`:
1. Busca os dados da assinatura no Supabase
2. Busca as entregas programadas
3. Carrega e compila o template welcome.html com Handlebars
4. Renderiza o template com os dados dinâmicos
5. Envia o email usando o provedor configurado (SendGrid/SES/SMTP)

### Integração Manual com Handlebars

Se você precisar usar os templates manualmente:

```typescript
import Handlebars from 'handlebars';
import { welcomeTemplate } from '@/email-templates/welcome-template';

// Compilar template
const template = Handlebars.compile(welcomeTemplate);

// Preparar dados
const data = {
  userName: 'João Silva',
  planType: 'Trimestral (3 entregas)',
  deliveriesTotal: 3,
  totalPaid: '450.00',
  deliveries: [
    { deliveryNumber: 1, expectedDate: 'março de 2026', isBonusPiece: false },
    { deliveryNumber: 2, expectedDate: 'abril de 2026', isBonusPiece: false },
    { deliveryNumber: 3, expectedDate: 'maio de 2026', isBonusPiece: false }
  ],
  dashboardUrl: 'https://ordax.com.br/my-subscriptions',
  supportEmail: 'suporte@ordax.com.br'
};

// Renderizar
const html = template(data);

// Enviar
await emailService.sendEmail('user@example.com', 'Bem-vindo ao ORDAX', html);
```

## Configuração do Serviço de Email

O serviço de email requer variáveis de ambiente configuradas:

```env
# Provedor (sendgrid, ses, ou smtp)
VITE_EMAIL_PROVIDER=sendgrid

# Configurações gerais
VITE_EMAIL_FROM=noreply@ordax.com.br
VITE_EMAIL_FROM_NAME=ORDAX
VITE_SUPPORT_EMAIL=suporte@ordax.com.br

# Para SendGrid
VITE_SENDGRID_API_KEY=your_api_key_here

# Para AWS SES
VITE_AWS_SES_REGION=us-east-1
VITE_AWS_SES_ACCESS_KEY_ID=your_key
VITE_AWS_SES_SECRET_ACCESS_KEY=your_secret

# Para SMTP
VITE_SMTP_HOST=smtp.example.com
VITE_SMTP_PORT=587
VITE_SMTP_USER=your_username
VITE_SMTP_PASSWORD=your_password
VITE_SMTP_SECURE=true
```

## Testes

Os templates e o serviço de email incluem testes automatizados:

```bash
# Executar testes do serviço de email
npm test -- src/services/__tests__/email-service.test.ts

# Executar todos os testes
npm test
```
