# Sistema de Assinaturas com Créditos

Sistema completo de assinaturas com créditos para plataforma de personagens colecionáveis. Gerencia dois planos de assinatura (Trimestral e Semestral), controla saldos de créditos vinculados à assinatura ativa, permite compras individuais e automáticas de personagens, e integra ciclos de produção com capacidade limitada.

## Índice

- [Tecnologias](#tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Setup e Instalação](#setup-e-instalação)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Migrations e Banco de Dados](#migrations-e-banco-de-dados)
- [Scripts Disponíveis](#scripts-disponíveis)
- [API Endpoints](#api-endpoints)
- [Funcionalidades](#funcionalidades)
- [Testes](#testes)
- [Deployment](#deployment)

## Tecnologias

- **TypeScript** - Linguagem principal com strict mode
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web minimalista
- **PostgreSQL** - Banco de dados relacional
- **Prisma** - ORM moderno com type-safety
- **Jest** - Framework de testes unitários
- **fast-check** - Property-based testing
- **Zod** - Validação de schemas e dados
- **node-cron** - Agendamento de jobs
- **Stripe** - Gateway de pagamento (opcional)

## Estrutura do Projeto

```
subscription-api/
├── src/
│   ├── config/           # Configurações (database, payment gateway)
│   ├── models/           # Modelos de dados e tipos TypeScript
│   ├── services/         # Lógica de negócio
│   │   ├── subscription.service.ts
│   │   ├── credit.service.ts
│   │   ├── character.service.ts
│   │   ├── order.service.ts
│   │   ├── production-cycle.service.ts
│   │   ├── payment.service.ts
│   │   └── notification.service.ts
│   ├── routes/           # Definições de rotas da API
│   │   ├── subscriptions.routes.ts
│   │   ├── credits.routes.ts
│   │   ├── characters.routes.ts
│   │   ├── orders.routes.ts
│   │   ├── production-cycles.routes.ts
│   │   └── admin/        # Rotas administrativas
│   ├── middleware/       # Middlewares (auth, error handling)
│   ├── jobs/             # Jobs agendados (cron)
│   │   ├── expire-subscriptions.job.ts
│   │   ├── auto-renew-subscriptions.job.ts
│   │   └── close-production-cycles.job.ts
│   └── index.ts          # Ponto de entrada da aplicação
├── prisma/
│   ├── schema.prisma     # Schema do banco de dados
│   └── seed.ts           # Dados iniciais (planos, personagens)
├── tests/
│   ├── properties/       # Property-based tests
│   └── unit/             # Testes unitários
├── docs/                 # Documentação adicional
├── scripts/              # Scripts de setup
│   ├── init-db.sh        # Inicialização do banco (Linux/Mac)
│   └── init-db.bat       # Inicialização do banco (Windows)
├── .env.example          # Exemplo de variáveis de ambiente
├── package.json          # Dependências e scripts
└── tsconfig.json         # Configuração TypeScript
```

## Setup e Instalação

### Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL 14+ instalado e rodando
- npm ou yarn

### 1. Clonar e instalar dependências

```bash
# Instalar dependências
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e configure as variáveis necessárias:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações. Veja a seção [Variáveis de Ambiente](#variáveis-de-ambiente) para detalhes.

### 3. Configurar banco de dados

#### Opção A: Script automatizado (recomendado)

**Linux/Mac:**
```bash
npm run db:init
```

**Windows:**
```bash
npm run db:init:win
```

Este script irá:
1. Criar o banco de dados se não existir
2. Executar todas as migrations
3. Popular o banco com dados iniciais (seed)

#### Opção B: Manual

```bash
# Executar migrations
npm run db:migrate

# Executar seed inicial
npm run db:seed
```

### 4. Iniciar servidor de desenvolvimento

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3000` (ou a porta configurada em `PORT`).

## Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env`:

### Servidor

```env
PORT=3000                    # Porta do servidor
NODE_ENV=development         # Ambiente: development | production | test
```

### Banco de Dados

```env
DATABASE_URL="postgresql://user:password@localhost:5432/subscription_credit_system?schema=public"
```

**Formato:** `postgresql://[user]:[password]@[host]:[port]/[database]?schema=public`

**Exemplo de produção:**
```env
DATABASE_URL="postgresql://admin:securepass@db.example.com:5432/prod_db?schema=public"
```

### Autenticação JWT

```env
JWT_SECRET=your-secret-key-here    # Chave secreta para assinar tokens (use uma string aleatória longa)
JWT_EXPIRES_IN=7d                  # Tempo de expiração dos tokens (ex: 7d, 24h, 30m)
```

**Importante:** Em produção, use uma chave secreta forte e única. Exemplo de geração:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Gateway de Pagamento

```env
PAYMENT_GATEWAY_PROVIDER=stub      # Opções: stub | stripe | mercadopago
```

#### Configuração Stripe (se `PAYMENT_GATEWAY_PROVIDER=stripe`)

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

Obtenha suas chaves em: https://dashboard.stripe.com/apikeys

#### Configuração Mercado Pago (se `PAYMENT_GATEWAY_PROVIDER=mercadopago`)

```env
MERCADOPAGO_ACCESS_TOKEN=your_mercadopago_access_token
```

Obtenha seu token em: https://www.mercadopago.com.br/developers/panel

#### Modo Stub (desenvolvimento)

O modo `stub` simula pagamentos sem integração real. Útil para desenvolvimento e testes.

### Email/Notificações

```env
SMTP_HOST=smtp.example.com         # Servidor SMTP
SMTP_PORT=587                      # Porta SMTP (587 para TLS, 465 para SSL)
SMTP_USER=your-email@example.com   # Usuário SMTP
SMTP_PASSWORD=your-email-password  # Senha SMTP
EMAIL_FROM=noreply@example.com     # Email remetente
```

**Provedores comuns:**
- Gmail: `smtp.gmail.com:587`
- SendGrid: `smtp.sendgrid.net:587`
- Mailgun: `smtp.mailgun.org:587`

## Migrations e Banco de Dados

### Processo de Migrations

O projeto usa Prisma Migrate para gerenciar o schema do banco de dados.

#### Criar uma nova migration

```bash
npm run db:migrate
```

Isso irá:
1. Detectar mudanças no `prisma/schema.prisma`
2. Criar um arquivo de migration em `prisma/migrations/`
3. Aplicar a migration no banco de dados
4. Regenerar o Prisma Client

#### Resetar banco de dados

**Atenção:** Isso irá apagar todos os dados!

```bash
npm run db:reset
```

Isso irá:
1. Dropar o banco de dados
2. Criar novamente
3. Aplicar todas as migrations
4. Executar o seed

#### Visualizar dados (Prisma Studio)

```bash
npm run db:studio
```

Abre uma interface web em `http://localhost:5555` para visualizar e editar dados.

### Schema do Banco de Dados

O schema completo está em `prisma/schema.prisma`. Principais tabelas:

- **subscriptions** - Assinaturas de usuários
- **subscription_plans** - Configuração de planos (trimestral/semestral)
- **user_credits** - Saldo de créditos por usuário
- **credit_transactions** - Histórico de transações de créditos
- **characters** - Catálogo de personagens
- **orders** - Pedidos de personagens
- **order_items** - Itens de cada pedido
- **production_cycles** - Ciclos de produção com capacidade limitada

### Dados Iniciais (Seed)

O arquivo `prisma/seed.ts` popula o banco com:
- 2 planos de assinatura (Trimestral e Semestral)
- Personagens de exemplo
- Ciclo de produção inicial

Execute o seed com:
```bash
npm run db:seed
```

## Scripts Disponíveis

### Desenvolvimento

```bash
npm run dev              # Inicia servidor com hot reload (tsx watch)
npm run build            # Compila TypeScript para JavaScript
npm start                # Inicia servidor em produção (requer build)
```

### Testes

```bash
npm test                 # Executa todos os testes
npm run test:watch       # Executa testes em modo watch
npm run test:coverage    # Gera relatório de cobertura
npm run test:properties  # Executa apenas property-based tests
npm run test:unit        # Executa apenas testes unitários
```

### Banco de Dados

```bash
npm run db:init          # Inicializa banco (Linux/Mac)
npm run db:init:win      # Inicializa banco (Windows)
npm run db:migrate       # Cria e aplica migration
npm run db:seed          # Popula banco com dados iniciais
npm run db:reset         # Reseta banco (apaga tudo!)
npm run db:studio        # Abre Prisma Studio
```

### Qualidade de Código

```bash
npm run lint             # Executa ESLint
npm run format           # Formata código com Prettier
```

## API Endpoints

### Autenticação

Todos os endpoints (exceto públicos) requerem autenticação via JWT no header:
```
Authorization: Bearer <token>
```

### Endpoints Públicos

#### Assinaturas

**POST /api/subscriptions/activate**
- Ativa nova assinatura para usuário
- Body:
  ```json
  {
    "user_id": 1,
    "plan_type": "trimestral",
    "payment_method_id": "pm_xxx"
  }
  ```
- Response:
  ```json
  {
    "subscription_id": 1,
    "credits_allocated": 600,
    "order_id": 1
  }
  ```

**POST /api/subscriptions/:id/schedule-plan-change**
- Agenda upgrade/downgrade para próxima renovação
- Body:
  ```json
  {
    "new_plan_type": "semestral"
  }
  ```
- Response:
  ```json
  {
    "pending_plan_change": "semestral",
    "effective_date": "2024-06-01T00:00:00Z"
  }
  ```

**POST /api/subscriptions/:id/cancel**
- Cancela assinatura com extorno proporcional
- Body:
  ```json
  {
    "cancellation_type": "with_refund"
  }
  ```
- Response:
  ```json
  {
    "refund_amount": 66.60,
    "credits_expired": 400
  }
  ```

**POST /api/subscriptions/:id/no-renewal**
- Desativa renovação automática (mantém acesso até fim do período)
- Body:
  ```json
  {
    "cancellation_type": "no_renewal"
  }
  ```
- Response:
  ```json
  {
    "end_date": "2024-06-01T00:00:00Z",
    "credits_valid_until": "2024-06-01T00:00:00Z"
  }
  ```

**GET /api/subscriptions/:id**
- Consulta detalhes da assinatura
- Response:
  ```json
  {
    "id": 1,
    "plan_type": "trimestral",
    "status": "active",
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-04-01T00:00:00Z",
    "auto_renew": true,
    "pending_plan_change": null
  }
  ```

#### Créditos

**GET /api/credits/balance**
- Consulta saldo de créditos do usuário autenticado
- Response:
  ```json
  {
    "total_credits": 600,
    "used_credits": 150,
    "available_credits": 450,
    "subscription_status": "active"
  }
  ```

**GET /api/credits/transactions**
- Lista histórico de transações
- Query params: `page=1&limit=20&transaction_type=debit_immediate`
- Response:
  ```json
  {
    "transactions": [
      {
        "id": 1,
        "transaction_type": "allocation",
        "credits_amount": 600,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
  ```

#### Personagens

**GET /api/characters**
- Lista personagens do catálogo
- Query params: `page=1&limit=20&plan_type=semestral`
- Response:
  ```json
  {
    "characters": [
      {
        "id": 1,
        "name": "Personagem A",
        "price_cash": 29.90,
        "price_credits": 100,
        "is_exclusive_semestral": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50
    }
  }
  ```

**GET /api/characters/:id**
- Detalhes de personagem específico
- Response:
  ```json
  {
    "id": 1,
    "name": "Personagem A",
    "description": "Descrição do personagem",
    "price_cash": 29.90,
    "price_credits": 100,
    "is_exclusive_semestral": false
  }
  ```

**GET /api/characters/standard-collection**
- Lista personagens da coleção padrão
- Response:
  ```json
  {
    "characters": [...]
  }
  ```

#### Pedidos

**POST /api/orders/individual**
- Cria pedido de compra individual (débito imediato)
- Body:
  ```json
  {
    "character_id": 1,
    "use_credits": true
  }
  ```
- Response:
  ```json
  {
    "order_id": 1,
    "credits_debited": 100,
    "production_cycle_id": 1
  }
  ```

**GET /api/orders/automatic/:id**
- Consulta pedido automático
- Response:
  ```json
  {
    "order_id": 1,
    "characters": [...],
    "total_credits": 300,
    "is_locked": false,
    "cycle_close_date": "2024-02-01T00:00:00Z"
  }
  ```

**PUT /api/orders/automatic/:id**
- Modifica pedido automático (apenas se ciclo aberto)
- Body:
  ```json
  {
    "character_ids": [1, 2, 3]
  }
  ```
- Response:
  ```json
  {
    "order_id": 1,
    "characters": [...],
    "total_credits": 300
  }
  ```

#### Ciclos de Produção

**GET /api/production-cycles/current**
- Retorna ciclo aberto atual
- Response:
  ```json
  {
    "id": 1,
    "name": "Ciclo Janeiro 2024",
    "capacity_limit": 10000,
    "current_count": 5432,
    "close_date": "2024-02-01T00:00:00Z",
    "status": "open"
  }
  ```

### Endpoints Administrativos

Requerem role `admin` no token JWT.

#### Admin - Assinaturas

**GET /admin/subscriptions**
- Lista todas as assinaturas
- Query params: `page=1&limit=20&status=active&plan_type=semestral`

**GET /admin/subscriptions/:id**
- Detalhes completos de assinatura

**POST /admin/subscriptions/:id/adjust-credits**
- Ajusta manualmente saldo de créditos
- Body:
  ```json
  {
    "credits_adjustment": 100,
    "reason": "Compensação por erro no sistema"
  }
  ```

#### Admin - Personagens

**POST /admin/characters**
- Cria novo personagem
- Body:
  ```json
  {
    "name": "Novo Personagem",
    "description": "Descrição",
    "price_cash": 29.90,
    "price_credits": 100,
    "is_exclusive_semestral": false,
    "is_standard_collection": false
  }
  ```

**PUT /admin/characters/:id**
- Atualiza personagem

**DELETE /admin/characters/:id**
- Desativa personagem (soft delete)

#### Admin - Ciclos de Produção

**POST /admin/production-cycles**
- Cria novo ciclo de produção
- Body:
  ```json
  {
    "name": "Ciclo Fevereiro 2024",
    "capacity_limit": 10000,
    "close_date": "2024-03-01T00:00:00Z"
  }
  ```

**POST /admin/production-cycles/:id/close**
- Fecha ciclo manualmente (processa débitos de pedidos automáticos)

**GET /admin/production-cycles/:id/statistics**
- Estatísticas do ciclo

**GET /admin/dashboard/metrics**
- Métricas gerais do sistema

## Funcionalidades

### Sistema de Assinaturas

- **Dois planos disponíveis:**
  - Trimestral: 600 créditos por 3 meses
  - Semestral: 1400 créditos (1200 base + 200 bônus) por 6 meses
- **Renovação automática** com processamento via job agendado
- **Upgrade/Downgrade** agendado para próxima renovação
- **Cancelamento com extorno** proporcional baseado em tempo restante
- **Não-renovação** mantém acesso até fim do período pago

### Sistema de Créditos

- **Alocação automática** na ativação da assinatura
- **Débito imediato** em compras individuais
- **Débito no fechamento** para pedidos automáticos
- **Expiração vinculada** à assinatura (expira ao cancelar ou expirar)
- **Histórico completo** de todas as transações
- **Invariante de saldo:** `available_credits = total_credits - used_credits`

### Catálogo de Personagens

- **Precificação dupla:** dinheiro e créditos
- **Personagens exclusivos** para plano semestral
- **Coleção padrão** entregue automaticamente ao assinar
- **Filtragem automática** baseada no tipo de plano

### Ciclos de Produção

- **Capacidade limitada** por ciclo
- **Fechamento automático** via job agendado
- **Prioridade** para assinantes do plano semestral
- **Débito de créditos** apenas no fechamento (pedidos automáticos)

### Jobs Agendados

- **Expiração de assinaturas:** Diariamente às 00:00
- **Renovação automática:** Diariamente às 01:00
- **Fechamento de ciclos:** A cada hora

## Testes

### Estrutura de Testes

O projeto utiliza duas abordagens de teste:

1. **Testes Unitários** (Jest) - Testam funções e serviços isoladamente
2. **Property-Based Tests** (fast-check) - Testam propriedades universais do sistema

### Executar Testes

```bash
# Todos os testes
npm test

# Apenas property-based tests
npm run test:properties

# Apenas testes unitários
npm run test:unit

# Com cobertura
npm run test:coverage

# Modo watch (desenvolvimento)
npm run test:watch
```

### Property-Based Tests Implementados

Localização: `tests/properties/`

1. **balance-validation.property.test.ts** - Invariante de saldo de créditos
2. **immediate-debit.property.test.ts** - Débito imediato em compras individuais
3. **credit-balance.property.test.ts** - Validação de saldo antes de compra
4. **plan-credits.property.test.ts** - Cálculo correto de créditos por plano
5. **credit-accumulation.property.test.ts** - Acumulação em renovação
6. **refund-calculation.property.test.ts** - Cálculo de reembolso proporcional

### Cobertura de Testes

Execute `npm run test:coverage` para gerar relatório de cobertura em `coverage/`.

## Deployment

### Build de Produção

```bash
# Compilar TypeScript
npm run build

# Executar migrations em produção
DATABASE_URL="..." npx prisma migrate deploy

# Iniciar servidor
npm start
```

### Variáveis de Ambiente de Produção

Certifique-se de configurar:

```env
NODE_ENV=production
DATABASE_URL="postgresql://..."
JWT_SECRET="<chave-forte-aleatória>"
PAYMENT_GATEWAY_PROVIDER=stripe
STRIPE_SECRET_KEY="sk_live_..."
SMTP_HOST="smtp.sendgrid.net"
# ... outras variáveis
```

### Docker

Exemplo de `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY dist ./dist

EXPOSE 3000

CMD ["npm", "start"]
```

Build e execução:

```bash
# Build
docker build -t subscription-api .

# Run
docker run -p 3000:3000 --env-file .env subscription-api
```

### Considerações de Produção

1. **Banco de Dados:**
   - Use connection pooling (Prisma já faz isso)
   - Configure backups automáticos
   - Monitore performance de queries

2. **Segurança:**
   - Use HTTPS em produção
   - Configure CORS adequadamente
   - Valide todos os inputs
   - Use rate limiting

3. **Monitoramento:**
   - Configure logs estruturados
   - Monitore jobs agendados
   - Alerte sobre falhas de pagamento

4. **Escalabilidade:**
   - Use load balancer para múltiplas instâncias
   - Configure Redis para cache (futuro)
   - Considere separar jobs em workers dedicados

## Documentação Adicional

- `docs/payment-integration.md` - Integração com gateways de pagamento
- `tests/README.md` - Guia completo de testes
- `TESTING_SETUP.md` - Configuração do ambiente de testes
- `PRISMA_SETUP.md` - Detalhes do setup do Prisma

## Suporte

Para dúvidas ou problemas:
1. Verifique a documentação em `docs/`
2. Revise os testes para exemplos de uso
3. Consulte o schema do banco em `prisma/schema.prisma`

## Licença

MIT
