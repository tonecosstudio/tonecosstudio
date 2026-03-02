# Quick Deployment Guide

## 🚀 Fastest Way to Deploy

### Using Docker Compose (Recommended)

```bash
# 1. Configure environment
cp .env.production .env.prod
nano .env.prod  # Edit with your values

# 2. Start everything
docker-compose --env-file .env.prod up -d

# 3. Check status
docker-compose ps
curl http://localhost:3000/health
```

That's it! Your API is running with PostgreSQL.

## 📋 What You Get

- **PostgreSQL 16** - Production database
- **Subscription API** - Node.js application
- **Auto migrations** - Runs on startup
- **Health checks** - Built-in monitoring
- **Background jobs** - Scheduled tasks running

## 🔧 Essential Commands

```bash
# View logs
docker-compose logs -f api

# Restart API
docker-compose restart api

# Run migrations manually
docker-compose exec api npx prisma migrate deploy

# Access database
docker-compose exec db psql -U subscription_user -d subscription_credit_system

# Stop everything
docker-compose down

# Clean everything (including data)
docker-compose down -v
```

## 🛠️ Optional: pgAdmin

To manage your database with a GUI:

```bash
# Start with pgAdmin
docker-compose --profile tools up -d

# Access at http://localhost:5050
# Default: admin@example.com / admin (change in .env.prod)
```

## 🔐 Security Checklist

Before going to production:

- [ ] Change `JWT_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- [ ] Change `DB_PASSWORD` to a strong password
- [ ] Configure real payment gateway (Stripe/Mercado Pago)
- [ ] Configure SMTP for emails
- [ ] Use HTTPS/SSL in production
- [ ] Review all values in `.env.prod`

## 📚 Full Documentation

For detailed deployment options, see:
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Complete deployment guide
- [.env.example](.env.example) - All environment variables explained
- [README.md](README.md) - Project overview

## 🆘 Troubleshooting

**API won't start?**
```bash
docker-compose logs api
```

**Database connection failed?**
```bash
docker-compose ps db
docker-compose logs db
```

**Need to reset everything?**
```bash
docker-compose down -v
docker-compose up -d
```

## 🌐 Production Deployment

For production with optimizations:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d
```

This adds:
- PostgreSQL performance tuning
- Resource limits (CPU/memory)
- Production logging
- Security hardening

## 📊 Monitoring

Health check endpoints:
- `GET /health` - Overall status
- `GET /health/db` - Database status

Example:
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```
