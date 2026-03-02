# Guia de Deployment

Este documento fornece instruções detalhadas para fazer deploy do sistema de assinaturas com créditos em produção.

## Índice

- [Pré-requisitos](#pré-requisitos)
- [Preparação](#preparação)
- [Deployment com Docker](#deployment-com-docker)
- [Deployment Manual](#deployment-manual)
- [Configuração de Produção](#configuração-de-produção)
- [Monitoramento](#monitoramento)
- [Backup e Recuperação](#backup-e-recuperação)
- [Troubleshooting](#troubleshooting)

## Pré-requisitos

### Infraestrutura Necessária

- **Servidor:** Linux (Ubuntu 20.04+ recomendado) ou Docker
- **Banco de Dados:** PostgreSQL 14+ (pode ser serviço gerenciado)
- **Node.js:** Versão 18+ (se deployment manual)
- **Memória:** Mínimo 2GB RAM (4GB+ recomendado)
- **Disco:** Mínimo 10GB (depende do volume de dados)

### Serviços Externos

- **Gateway de Pagamento:** Conta Stripe ou Mercado Pago configurada
- **Email:** Servidor SMTP ou serviço (SendGrid, Mailgun, etc.)
- **SSL/TLS:** Certificado válido (Let's Encrypt recomendado)

## Preparação

### 1. Build da Aplicação

```bash
# Clonar repositório
git clone <repository-url>
cd subscription-api

# Instalar dependências
npm ci --only=production

# Compilar TypeScript
npm run build

# Gerar Prisma Client
npx prisma generate
```

### 2. Configurar Variáveis de Ambiente

Crie arquivo `.env` com configurações de produção:

```env
# Server
NODE_ENV=production
PORT=3000

# Database (use serviço gerenciado em produção)
DATABASE_URL="postgresql://user:password@db-host:5432/prod_db?schema=public&connection_limit=10"

# JWT (gere chave forte!)
JWT_SECRET="<chave-aleatória-de-32-bytes>"
JWT_EXPIRES_IN=7d

# Payment Gateway
PAYMENT_GATEWAY_PROVIDER=stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD="<sendgrid-api-key>"
EMAIL_FROM=noreply@yourdomain.com
```

**Importante:** Nunca commite o arquivo `.env` no repositório!

### 3. Executar Migrations

```bash
# Aplicar migrations em produção
npx prisma migrate deploy

# Verificar status
npx prisma migrate status
```

**Nota:** Use `migrate deploy` em produção (não `migrate dev`).

### 4. Popular Dados Iniciais (Seed)

```bash
# Executar seed (planos, personagens iniciais)
npm run db:seed
```

## Deployment com Docker

### Arquivos Docker Incluídos

O projeto já inclui os seguintes arquivos para deployment com Docker:

- `Dockerfile` - Imagem multi-stage otimizada para produção
- `docker-compose.yml` - Stack completo (PostgreSQL + API + pgAdmin opcional)
- `docker-compose.prod.yml` - Overrides para produção
- `.dockerignore` - Arquivos excluídos da imagem
- `.env.production` - Template de variáveis de ambiente para produção

### Quick Start com Docker Compose

```bash
# 1. Copiar e configurar variáveis de ambiente
cp .env.production .env.prod
# Edite .env.prod com seus valores de produção

# 2. Iniciar stack completo
docker-compose --env-file .env.prod up -d

# 3. Verificar status
docker-compose ps
docker-compose logs -f api

# 4. Acessar health check
curl http://localhost:3000/health
```

### Dockerfile Multi-Stage

O `Dockerfile` incluído usa build multi-stage para otimização:

**Stage 1 (Builder):**
- Instala todas as dependências
- Gera Prisma Client
- Compila TypeScript

**Stage 2 (Production):**
- Usa imagem Alpine leve
- Instala apenas dependências de produção
- Copia apenas código compilado
- Roda como usuário não-root
- Inclui health check

### Docker Compose - Desenvolvimento/Staging

```bash
# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down

# Incluir pgAdmin para gerenciar banco
docker-compose --profile tools up -d
# Acesse em http://localhost:5050
```

### Docker Compose - Produção

```bash
# Usar overrides de produção
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d

# Verificar saúde
curl http://localhost:3000/health

# Ver logs
docker-compose logs -f api

# Parar serviços
docker-compose down
```

O arquivo `docker-compose.prod.yml` inclui:
- Configurações otimizadas do PostgreSQL
- Limites de recursos (CPU/memória)
- Logging estruturado
- Restart automático
- Desabilita pgAdmin
- Remove exposição de porta do banco

### Comandos Úteis Docker

```bash
# Rebuild após mudanças no código
docker-compose build api
docker-compose up -d api

# Executar migrations manualmente
docker-compose exec api npx prisma migrate deploy

# Executar seed
docker-compose exec api npm run db:seed

# Acessar banco de dados
docker-compose exec db psql -U subscription_user -d subscription_credit_system

# Ver logs da API
docker-compose logs -f api

# Reiniciar apenas API
docker-compose restart api

# Limpar tudo (incluindo volumes)
docker-compose down -v

# Backup do banco
docker-compose exec db pg_dump -U subscription_user subscription_credit_system > backup.sql

# Restaurar backup
docker-compose exec -T db psql -U subscription_user subscription_credit_system < backup.sql
```

### Docker - Apenas API (Banco Externo)

Se você tem um banco PostgreSQL externo:

```bash
# Build da imagem
docker build -t subscription-api:latest .

# Executar container
docker run -d \
  --name subscription-api \
  -p 3000:3000 \
  --env-file .env.prod \
  subscription-api:latest

# Ver logs
docker logs -f subscription-api

# Parar container
docker stop subscription-api
docker rm subscription-api
```

### Variáveis de Ambiente para Docker

O arquivo `.env.production` é um template completo. Principais variáveis:

```env
# Server
NODE_ENV=production
PORT=3000

# Database (interno ao Docker Compose)
DATABASE_URL=postgresql://subscription_user:SENHA_FORTE@db:5432/subscription_credit_system?schema=public&connection_limit=10

# JWT (GERE UMA CHAVE FORTE!)
JWT_SECRET=<gere-com-crypto.randomBytes(64).toString('hex')>
JWT_EXPIRES_IN=7d

# Payment Gateway
PAYMENT_GATEWAY_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
EMAIL_FROM=noreply@yourdomain.com
```

### Health Checks no Docker

O Dockerfile inclui health check automático:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

Verificar status:

```bash
# Status do container
docker ps

# Logs de health check
docker inspect --format='{{json .State.Health}}' subscription-api | jq
```

## Deployment Manual

### 1. Configurar Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2
```

### 2. Configurar PostgreSQL

```bash
# Criar usuário e banco
sudo -u postgres psql

CREATE USER subscription_user WITH PASSWORD 'secure_password';
CREATE DATABASE subscription_db OWNER subscription_user;
GRANT ALL PRIVILEGES ON DATABASE subscription_db TO subscription_user;
\q
```

### 3. Deploy da Aplicação

```bash
# Criar diretório
sudo mkdir -p /var/www/subscription-api
sudo chown $USER:$USER /var/www/subscription-api

# Copiar arquivos
cd /var/www/subscription-api
# (copie os arquivos via git, scp, rsync, etc.)

# Instalar dependências
npm ci --only=production

# Executar migrations
npx prisma migrate deploy

# Executar seed
npm run db:seed
```

### 4. Configurar PM2

Crie `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'subscription-api',
    script: 'dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G'
  }]
};
```

Iniciar aplicação:

```bash
# Criar diretório de logs
mkdir logs

# Iniciar com PM2
pm2 start ecosystem.config.js

# Configurar para iniciar no boot
pm2 startup
pm2 save

# Ver status
pm2 status

# Ver logs
pm2 logs subscription-api
```

### 5. Configurar Nginx (Reverse Proxy)

```bash
# Instalar Nginx
sudo apt install -y nginx

# Criar configuração
sudo nano /etc/nginx/sites-available/subscription-api
```

Conteúdo:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ativar configuração:

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/subscription-api /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 6. Configurar SSL com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d api.yourdomain.com

# Renovação automática já está configurada
```

## Configuração de Produção

### Segurança

1. **Firewall:**
```bash
# Configurar UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

2. **Rate Limiting:**
Adicione no código (middleware Express):
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de requisições
});

app.use('/api/', limiter);
```

3. **CORS:**
```typescript
import cors from 'cors';

app.use(cors({
  origin: ['https://yourdomain.com'],
  credentials: true
}));
```

### Performance

1. **Connection Pooling:**
Já configurado no Prisma via `connection_limit` na DATABASE_URL.

2. **Caching (futuro):**
Considere adicionar Redis para cache de queries frequentes.

3. **Compressão:**
```typescript
import compression from 'compression';
app.use(compression());
```

### Logs

Configure logs estruturados em produção:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## Monitoramento

### Health Check Endpoint

Adicione endpoint de health check:

```typescript
app.get('/health', async (req, res) => {
  try {
    // Verificar conexão com banco
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### Monitoramento de Jobs

Verifique se os jobs agendados estão rodando:

```bash
# Ver logs do PM2
pm2 logs subscription-api | grep "Job"

# Verificar no banco
psql -U subscription_user -d subscription_db -c "
  SELECT COUNT(*) FROM subscriptions 
  WHERE next_billing_date <= NOW() AND auto_renew = true;
"
```

### Métricas Recomendadas

- Taxa de sucesso de renovações
- Taxa de falha de pagamentos
- Tempo de resposta das APIs
- Uso de CPU e memória
- Conexões ativas ao banco

## Backup e Recuperação

### Backup do Banco de Dados

```bash
# Backup manual
pg_dump -U subscription_user subscription_db > backup_$(date +%Y%m%d).sql

# Backup automático (cron)
# Adicione ao crontab: crontab -e
0 2 * * * pg_dump -U subscription_user subscription_db > /backups/backup_$(date +\%Y\%m\%d).sql
```

### Restauração

```bash
# Restaurar backup
psql -U subscription_user subscription_db < backup_20240115.sql
```

### Backup de Arquivos

```bash
# Backup da aplicação
tar -czf app_backup_$(date +%Y%m%d).tar.gz /var/www/subscription-api

# Backup de logs
tar -czf logs_backup_$(date +%Y%m%d).tar.gz /var/www/subscription-api/logs
```

## Troubleshooting

### Aplicação não inicia

```bash
# Verificar logs
pm2 logs subscription-api --lines 100

# Verificar variáveis de ambiente
pm2 env 0

# Verificar conexão com banco
psql -U subscription_user -d subscription_db -c "SELECT 1;"
```

### Erros de conexão com banco

```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Verificar conexões ativas
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Aumentar limite de conexões (se necessário)
sudo nano /etc/postgresql/14/main/postgresql.conf
# max_connections = 100
sudo systemctl restart postgresql
```

### Jobs não estão executando

```bash
# Verificar se node-cron está ativo
pm2 logs subscription-api | grep "cron"

# Verificar timezone do servidor
timedatectl

# Ajustar timezone se necessário
sudo timedatectl set-timezone America/Sao_Paulo
```

### Performance lenta

```bash
# Verificar uso de recursos
pm2 monit

# Verificar queries lentas no PostgreSQL
sudo -u postgres psql -d subscription_db -c "
  SELECT query, calls, total_time, mean_time 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;
"

# Analisar índices
sudo -u postgres psql -d subscription_db -c "
  SELECT schemaname, tablename, indexname 
  FROM pg_indexes 
  WHERE schemaname = 'public';
"
```

### Rollback de Deployment

```bash
# Parar aplicação
pm2 stop subscription-api

# Restaurar versão anterior
git checkout <previous-commit>
npm ci --only=production
npm run build

# Rollback de migrations (se necessário)
npx prisma migrate resolve --rolled-back <migration-name>

# Reiniciar
pm2 restart subscription-api
```

## Checklist de Deployment

- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados criado e acessível
- [ ] Migrations executadas
- [ ] Seed executado (dados iniciais)
- [ ] SSL/TLS configurado
- [ ] Firewall configurado
- [ ] Backup automático configurado
- [ ] Monitoramento configurado
- [ ] Health check funcionando
- [ ] Jobs agendados rodando
- [ ] Gateway de pagamento testado
- [ ] Email de notificações testado
- [ ] Logs sendo gerados corretamente
- [ ] Documentação atualizada

## Suporte

Para problemas específicos:
1. Verifique os logs: `pm2 logs subscription-api`
2. Consulte a documentação em `docs/`
3. Revise as configurações em `.env`
4. Teste endpoints com `curl` ou Postman
