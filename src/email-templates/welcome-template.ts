/**
 * Welcome Email Template
 * 
 * This file exports the welcome email HTML template as a string
 * for use with Handlebars templating engine.
 */

export const welcomeTemplate = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Bem-vindo ao ORDAX</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      color: #333333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #ffffff;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
    }
    h1 {
      color: #667eea;
      font-size: 24px;
      margin: 0 0 20px 0;
    }
    p {
      line-height: 1.6;
      margin: 0 0 15px 0;
      color: #555555;
    }
    .highlight {
      background-color: #f0f4ff;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
    }
    .delivery-schedule {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .delivery-item {
      padding: 10px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .delivery-item:last-child {
      border-bottom: none;
    }
    .delivery-number {
      font-weight: bold;
      color: #667eea;
    }
    .button {
      display: inline-block;
      background-color: #667eea;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 30px;
      text-align: center;
      font-size: 12px;
      color: #888888;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      h1 {
        font-size: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">ORDAX</h1>
    </div>
    
    <div class="content">
      <h1>Bem-vindo ao ORDAX, {{userName}}! 🎉</h1>
      
      <p>Estamos muito felizes em tê-lo(a) conosco! Sua assinatura <strong>{{planType}}</strong> foi confirmada com sucesso.</p>
      
      <div class="highlight">
        <p style="margin: 0;"><strong>Detalhes da sua assinatura:</strong></p>
        <p style="margin: 10px 0 0 0;">
          Plano: <strong>{{planType}}</strong><br>
          Total de entregas: <strong>{{deliveriesTotal}}</strong><br>
          Valor pago: <strong>R$ {{totalPaid}}</strong>
        </p>
      </div>
      
      <h2 style="color: #667eea; font-size: 20px; margin: 30px 0 15px 0;">📅 Cronograma de Entregas</h2>
      
      <div class="delivery-schedule">
        {{#each deliveries}}
        <div class="delivery-item">
          <span class="delivery-number">Entrega {{deliveryNumber}}</span> - 
          Previsão: <strong>{{expectedDate}}</strong>
          {{#if isBonusPiece}}
          <span style="color: #764ba2; font-weight: bold;">✨ + Peça Bônus Exclusiva</span>
          {{/if}}
        </div>
        {{/each}}
      </div>
      
      <p><strong>Próximos passos:</strong></p>
      <ul style="line-height: 1.8; color: #555555;">
        <li>Você receberá um lembrete no início de cada mês para escolher sua coleção</li>
        <li>Escolhas devem ser feitas até o dia 15 às 23:59:59 (horário de Salvador/BA)</li>
        <li>Após o prazo, sua escolha anterior será mantida automaticamente</li>
        <li>Acompanhe suas entregas no painel do assinante</li>
      </ul>
      
      <center>
        <a href="{{dashboardUrl}}" class="button">Acessar Meu Painel</a>
      </center>
      
      <p style="margin-top: 30px;">Se tiver alguma dúvida, estamos à disposição!</p>
      
      <p style="margin-top: 20px; color: #888888; font-size: 14px;">
        Atenciosamente,<br>
        <strong>Equipe ORDAX</strong>
      </p>
    </div>
    
    <div class="footer">
      <p>ORDAX - Colecionáveis Premium sob Encomenda</p>
      <p>Este é um e-mail automático. Por favor, não responda.</p>
      <p>Para suporte, entre em contato: {{supportEmail}}</p>
    </div>
  </div>
</body>
</html>`;
