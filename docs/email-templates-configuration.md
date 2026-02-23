# Email Templates Configuration - Manual Payment System

## Overview

Este documento fornece os templates de email necessários para o sistema de pagamento manual. Configure estes templates no Supabase Dashboard ou no seu serviço de email.

## Como Configurar

### Supabase Dashboard

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para **Authentication > Email Templates**
4. Crie templates customizados para cada tipo de notificação

### Variáveis Disponíveis

Todos os templates podem usar as seguintes variáveis:

- `{{ .PaymentReference }}` - Número de referência do pagamento
- `{{ .CustomerName }}` - Nome do cliente
- `{{ .CustomerEmail }}` - Email do cliente
- `{{ .Amount }}` - Valor do pagamento
- `{{ .Currency }}` - Moeda (BRL)
- `{{ .PaymentMethod }}` - Nome do método de pagamento
- `{{ .PaymentInstructions }}` - Instruções do método de pagamento
- `{{ .PaymentLink }}` - Link para detalhes do pagamento
- `{{ .ConversationLink }}` - Link para a conversa de suporte
- `{{ .SiteURL }}` - URL do site
- `{{ .CompanyName }}` - Nome da empresa (Ordax)

---

## Template 1: Payment Created (Pagamento Criado)

**Quando enviar**: Quando um cliente cria um novo pagamento

**Assunto**: `Pagamento Criado - Pedido #{{ .PaymentReference }}`

**Corpo HTML**:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pagamento Criado</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background: #f9fafb;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
        }
        .info-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #667eea;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: 600;
            color: #6b7280;
        }
        .value {
            color: #111827;
            font-weight: 500;
        }
        .instructions {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 10px 0;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Pagamento Criado com Sucesso!</h1>
    </div>
    
    <div class="content">
        <p>Olá <strong>{{ .CustomerName }}</strong>,</p>
        
        <p>Seu pagamento foi criado com sucesso! Agora você precisa realizar o pagamento e enviar o comprovante.</p>
        
        <div class="info-box">
            <h3>📋 Detalhes do Pagamento</h3>
            <div class="info-row">
                <span class="label">Número de Referência:</span>
                <span class="value">{{ .PaymentReference }}</span>
            </div>
            <div class="info-row">
                <span class="label">Valor:</span>
                <span class="value">{{ .Currency }} {{ .Amount }}</span>
            </div>
            <div class="info-row">
                <span class="label">Método de Pagamento:</span>
                <span class="value">{{ .PaymentMethod }}</span>
            </div>
        </div>
        
        <div class="instructions">
            <h3>💳 Instruções de Pagamento</h3>
            <p>{{ .PaymentInstructions }}</p>
        </div>
        
        <p><strong>Próximos passos:</strong></p>
        <ol>
            <li>Realize o pagamento usando as instruções acima</li>
            <li>Tire uma foto ou screenshot do comprovante</li>
            <li>Envie o comprovante através do link abaixo</li>
        </ol>
        
        <center>
            <a href="{{ .PaymentLink }}" class="button">📤 Enviar Comprovante</a>
        </center>
        
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            <strong>Importante:</strong> Seu pedido será processado após a aprovação do pagamento, que geralmente ocorre em até 24 horas úteis.
        </p>
    </div>
    
    <div class="footer">
        <p>Dúvidas? <a href="{{ .ConversationLink }}">Entre em contato conosco</a></p>
        <p>{{ .CompanyName }} - Colecionáveis de Qualidade</p>
    </div>
</body>
</html>
```

**Corpo Texto Simples**:

```
Pagamento Criado - Pedido #{{ .PaymentReference }}

Olá {{ .CustomerName }},

Seu pagamento foi criado com sucesso!

DETALHES DO PAGAMENTO
- Número de Referência: {{ .PaymentReference }}
- Valor: {{ .Currency }} {{ .Amount }}
- Método de Pagamento: {{ .PaymentMethod }}

INSTRUÇÕES DE PAGAMENTO
{{ .PaymentInstructions }}

PRÓXIMOS PASSOS
1. Realize o pagamento usando as instruções acima
2. Tire uma foto ou screenshot do comprovante
3. Envie o comprovante através do link: {{ .PaymentLink }}

Seu pedido será processado após a aprovação do pagamento, que geralmente ocorre em até 24 horas úteis.

Dúvidas? Entre em contato: {{ .ConversationLink }}

{{ .CompanyName }}
```

---

## Template 2: Payment Under Review (Pagamento em Análise)

**Quando enviar**: Quando um cliente envia o primeiro comprovante (para admins)

**Assunto**: `[ADMIN] Novo Pagamento para Revisar - #{{ .PaymentReference }}`

**Corpo HTML**:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .info-box { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>⚠️ Novo Pagamento Aguardando Revisão</h2>
    </div>
    
    <div class="content">
        <p>Um novo pagamento foi enviado e está aguardando sua revisão.</p>
        
        <div class="info-box">
            <p><strong>Cliente:</strong> {{ .CustomerName }} ({{ .CustomerEmail }})</p>
            <p><strong>Referência:</strong> {{ .PaymentReference }}</p>
            <p><strong>Valor:</strong> {{ .Currency }} {{ .Amount }}</p>
            <p><strong>Método:</strong> {{ .PaymentMethod }}</p>
        </div>
        
        <center>
            <a href="{{ .PaymentLink }}" class="button">🔍 Revisar Pagamento</a>
        </center>
        
        <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
            Por favor, revise o comprovante e aprove ou rejeite o pagamento o mais breve possível.
        </p>
    </div>
</body>
</html>
```

---

## Template 3: Payment Approved (Pagamento Aprovado)

**Quando enviar**: Quando um admin aprova um pagamento

**Assunto**: `✅ Pagamento Aprovado - Pedido #{{ .PaymentReference }}`

**Corpo HTML**:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .success-box { background: #d1fae5; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; }
    </style>
</head>
<body>
    <div class="header">
        <h1>✅ Pagamento Aprovado!</h1>
    </div>
    
    <div class="content">
        <p>Olá <strong>{{ .CustomerName }}</strong>,</p>
        
        <div class="success-box">
            <h2 style="color: #10b981; margin: 0;">🎉 Ótimas notícias!</h2>
            <p style="font-size: 18px; margin: 10px 0;">Seu pagamento foi aprovado com sucesso!</p>
        </div>
        
        <div class="info-box">
            <p><strong>Número de Referência:</strong> {{ .PaymentReference }}</p>
            <p><strong>Valor Pago:</strong> {{ .Currency }} {{ .Amount }}</p>
            <p><strong>Método de Pagamento:</strong> {{ .PaymentMethod }}</p>
        </div>
        
        <p><strong>Próximos passos:</strong></p>
        <ul>
            <li>Seu pedido entrará em produção em breve</li>
            <li>Você receberá atualizações sobre o status da produção</li>
            <li>Acompanhe o progresso na sua conta</li>
        </ul>
        
        <center>
            <a href="{{ .PaymentLink }}" class="button">📄 Ver Recibo</a>
        </center>
        
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            Obrigado por escolher {{ .CompanyName }}! Estamos trabalhando para entregar seu pedido com a máxima qualidade.
        </p>
    </div>
</body>
</html>
```

---

## Template 4: Payment Rejected (Pagamento Rejeitado)

**Quando enviar**: Quando um admin rejeita um pagamento

**Assunto**: `❌ Pagamento Rejeitado - Pedido #{{ .PaymentReference }}`

**Corpo HTML**:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .warning-box { background: #fee2e2; border: 2px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; }
    </style>
</head>
<body>
    <div class="header">
        <h1>❌ Pagamento Rejeitado</h1>
    </div>
    
    <div class="content">
        <p>Olá <strong>{{ .CustomerName }}</strong>,</p>
        
        <p>Infelizmente, não foi possível aprovar seu pagamento.</p>
        
        <div class="warning-box">
            <h3>Motivo da Rejeição:</h3>
            <p>{{ .RejectionReason }}</p>
        </div>
        
        <p><strong>O que fazer agora:</strong></p>
        <ol>
            <li>Verifique o motivo da rejeição acima</li>
            <li>Corrija o problema identificado</li>
            <li>Envie um novo comprovante de pagamento</li>
        </ol>
        
        <center>
            <a href="{{ .PaymentLink }}" class="button">📤 Enviar Novo Comprovante</a>
        </center>
        
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            Se você tiver dúvidas, entre em contato conosco através da <a href="{{ .ConversationLink }}">conversa de suporte</a>.
        </p>
    </div>
</body>
</html>
```

---

## Template 5: Payment Requires Info (Informações Adicionais Necessárias)

**Quando enviar**: Quando um admin solicita mais informações

**Assunto**: `ℹ️ Informações Adicionais Necessárias - Pedido #{{ .PaymentReference }}`

**Corpo HTML**:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .info-box { background: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ℹ️ Informações Adicionais Necessárias</h1>
    </div>
    
    <div class="content">
        <p>Olá <strong>{{ .CustomerName }}</strong>,</p>
        
        <p>Estamos revisando seu pagamento e precisamos de algumas informações adicionais.</p>
        
        <div class="info-box">
            <h3>Mensagem do Administrador:</h3>
            <p>{{ .AdminMessage }}</p>
        </div>
        
        <p><strong>O que fazer:</strong></p>
        <ol>
            <li>Leia a mensagem acima cuidadosamente</li>
            <li>Prepare as informações ou documentos solicitados</li>
            <li>Envie através do link abaixo</li>
        </ol>
        
        <center>
            <a href="{{ .PaymentLink }}" class="button">📤 Enviar Informações</a>
        </center>
        
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            Assim que recebermos as informações, continuaremos a análise do seu pagamento.
        </p>
    </div>
</body>
</html>
```

---

## Template 6: New Message Notification (Nova Mensagem)

**Quando enviar**: Quando há uma nova mensagem na conversa de suporte

**Assunto**: `💬 Nova Mensagem - Pedido #{{ .PaymentReference }}`

**Corpo HTML**:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .message-box { background: #f3f4f6; padding: 15px; border-left: 4px solid #8b5cf6; margin: 15px 0; }
        .button { display: inline-block; background: #8b5cf6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>💬 Nova Mensagem</h2>
    </div>
    
    <div class="content">
        <p>Olá <strong>{{ .CustomerName }}</strong>,</p>
        
        <p>Você recebeu uma nova mensagem sobre seu pagamento:</p>
        
        <div class="message-box">
            <p><strong>{{ .SenderName }}:</strong></p>
            <p>{{ .MessagePreview }}</p>
        </div>
        
        <center>
            <a href="{{ .ConversationLink }}" class="button">💬 Ver Conversa Completa</a>
        </center>
    </div>
</body>
</html>
```

---

## Configuração no Código

### TypeScript/JavaScript

```typescript
// src/lib/email-templates.ts

export const emailTemplates = {
  paymentCreated: {
    subject: (data: any) => `Pagamento Criado - Pedido #${data.paymentReference}`,
    html: (data: any) => `<!-- HTML template here -->`,
    text: (data: any) => `<!-- Text template here -->`
  },
  
  paymentUnderReview: {
    subject: (data: any) => `[ADMIN] Novo Pagamento para Revisar - #${data.paymentReference}`,
    html: (data: any) => `<!-- HTML template here -->`,
    text: (data: any) => `<!-- Text template here -->`
  },
  
  paymentApproved: {
    subject: (data: any) => `✅ Pagamento Aprovado - Pedido #${data.paymentReference}`,
    html: (data: any) => `<!-- HTML template here -->`,
    text: (data: any) => `<!-- Text template here -->`
  },
  
  paymentRejected: {
    subject: (data: any) => `❌ Pagamento Rejeitado - Pedido #${data.paymentReference}`,
    html: (data: any) => `<!-- HTML template here -->`,
    text: (data: any) => `<!-- Text template here -->`
  },
  
  paymentRequiresInfo: {
    subject: (data: any) => `ℹ️ Informações Adicionais Necessárias - Pedido #${data.paymentReference}`,
    html: (data: any) => `<!-- HTML template here -->`,
    text: (data: any) => `<!-- Text template here -->`
  },
  
  newMessage: {
    subject: (data: any) => `💬 Nova Mensagem - Pedido #${data.paymentReference}`,
    html: (data: any) => `<!-- HTML template here -->`,
    text: (data: any) => `<!-- Text template here -->`
  }
};
```

---

## Testes

### Testar Envio de Email

```typescript
// Teste manual no console do navegador ou em um script de teste

import { notificationService } from '@/lib/notification-service';

// Criar um pagamento de teste
const testPaymentId = 'your-test-payment-id';

// Testar cada template
await notificationService.sendPaymentCreated(testPaymentId);
await notificationService.sendPaymentApproved(testPaymentId);
await notificationService.sendPaymentRejected(testPaymentId, 'Comprovante ilegível');
await notificationService.sendInfoRequested(testPaymentId, 'Por favor, envie um comprovante mais claro');
```

---

## Troubleshooting

### Emails não estão sendo enviados

1. Verifique as configurações SMTP no Supabase Dashboard
2. Verifique se o email "from" está verificado
3. Verifique os logs de erro no Supabase
4. Teste com um email pessoal primeiro

### Emails indo para spam

1. Configure SPF e DKIM records
2. Use um domínio verificado
3. Evite palavras de spam no assunto
4. Inclua link de unsubscribe

### Variáveis não sendo substituídas

1. Verifique se os nomes das variáveis estão corretos
2. Verifique se os dados estão sendo passados corretamente
3. Use console.log para debugar os dados

---

## Manutenção

### Atualizar Templates

1. Edite os templates neste documento
2. Atualize no Supabase Dashboard ou no código
3. Teste com emails de teste
4. Documente as mudanças

### Adicionar Novos Templates

1. Crie o template seguindo o formato acima
2. Adicione ao código em `email-templates.ts`
3. Adicione ao serviço de notificação
4. Documente neste arquivo
5. Teste antes de usar em produção

---

**Última Atualização**: 2026-02-16  
**Versão**: 1.0.0  
**Mantido por**: Equipe Ordax
