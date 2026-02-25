# 🐳 Guia Docker - Projeto Ordax

**Data**: 24/02/2026  
**Status**: ✅ Implementado  
**Versão**: 1.0

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Quick Start](#quick-start)
4. [Desenvolvimento](#desenvolvimento)
5. [Produção](#produção)
6. [Comandos Úteis](#comandos-úteis)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O projeto Ordax agora suporta Docker para facilitar o desenvolvimento e deploy. Temos dois ambientes:

### Desenvolvimento

- Hot reload automático
- Volumes montados para código fonte
- PostgreSQL + Redis + Adminer
- Porta: 5173

### Produção

- Build otimizado com multi-stage
- Nginx para servir arquivos estáticos
- PostgreSQL + Redis + Adminer
- Porta: 8080

---

## 📦 Pré-requisitos

### Instalar Docker

**Windows:**

- [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)

**macOS:**

- [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)

**Linux:**

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Verificar Instalação

```bash
docker --version
docker-compose --version
```

---

## 🚀 Quick Start

### Desenvolvimento (Recomendado)

```bash
# 1. Clonar repositório
git clone <repo-url>
cd ordax

# 2. Copiar .env.example para .env
cp .env.example .env

# 3. Iniciar ambiente de desenvolvimento
docker-compose -f docker-compose.dev.yml up -d

# 4. Acessar aplicação
# Frontend: http://localhost:5173
# Adminer: http://localhost:8081
```

### Produção

```bash
# 1. Build da imagem
docker build -t ordax-app:latest .

# 2. Iniciar ambiente
docker-compose up -d

# 3. Acessar aplicação
# Frontend: http://localhost:8080
# Adminer: http://localhost:8081
```

---

## 💻 Desenvolvimento

### Iniciar Ambiente

```bash
# Iniciar todos os serviços
docker-compose -f docker-compose.dev.yml up -d

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f

# Ver logs de um serviço específico
docker-compose -f docker-compose.dev.yml logs -f app
```

### Parar Ambiente

```bash
# Parar serviços
docker-compose -f docker-compose.dev.yml down

# Parar e remover volumes
docker-compose -f docker-compose.dev.yml down -v
```

### Hot Reload

O código fonte está montado como volume, então qualquer alteração será refletida automaticamente:

```yaml
volumes:
  - ./src:/app/src
  - ./public:/app/public
```

### Acessar Shell

```bash
# Shell da aplicação
docker-compose -f docker-compose.dev.yml exec app sh

# Shell do PostgreSQL
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d ordax_dev

# Shell do Redis
docker-compose -f docker-compose.dev.yml exec redis redis-cli
```

---

## 🏭 Produção

### Build da Imagem

```bash
# Build simples
docker build -t ordax-app:latest .

# Build com tag específica
docker build -t ordax-app:v1.0.0 .

# Build sem cache
docker build --no-cache -t ordax-app:latest .
```

### Iniciar Ambiente

```bash
# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Ver status
docker-compose ps
```

### Parar Ambiente

```bash
# Parar serviços
docker-compose down

# Parar e remover volumes
docker-compose down -v
```

### Health Check

```bash
# Verificar saúde dos containers
docker-compose ps

# Testar endpoint de health
curl http://localhost:8080/health
```

---

## 🛠️ Comandos Úteis

### Scripts Bash (Linux/macOS)

```bash
# Tornar script executável
chmod +x docker-scripts.sh

# Ver ajuda
./docker-scripts.sh help

# Desenvolvimento
./docker-scripts.sh dev-start
./docker-scripts.sh dev-stop
./docker-scripts.sh dev-logs

# Produção
./docker-scripts.sh prod-build
./docker-scripts.sh prod-start
./docker-scripts.sh prod-stop

# Database
./docker-scripts.sh db-backup
./docker-scripts.sh db-restore backup.sql

# Limpeza
./docker-scripts.sh clean
./docker-scripts.sh clean-all
```

### Comandos Docker Diretos

```bash
# Ver containers rodando
docker ps

# Ver todos os containers
docker ps -a

# Ver imagens
docker images

# Ver volumes
docker volume ls

# Ver networks
docker network ls

# Limpar sistema
docker system prune -f

# Limpar tudo (cuidado!)
docker system prune -af --volumes
```

### Database

```bash
# Backup
docker-compose exec postgres pg_dump -U postgres ordax > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres ordax < backup.sql

# Executar SQL
docker-compose exec postgres psql -U postgres -d ordax -c "SELECT * FROM users LIMIT 10;"

# Migrations
docker-compose exec postgres psql -U postgres -d ordax -f /docker-entrypoint-initdb.d/migration.sql
```

### Logs

```bash
# Todos os logs
docker-compose logs -f

# Logs de um serviço
docker-compose logs -f app

# Últimas 100 linhas
docker-compose logs --tail=100 app

# Logs desde timestamp
docker-compose logs --since 2024-01-01T00:00:00 app
```

---

## 🐛 Troubleshooting

### Porta já em uso

```bash
# Erro: port is already allocated

# Solução 1: Parar container usando a porta
docker ps
docker stop <container_id>

# Solução 2: Mudar porta no docker-compose.yml
ports:
  - "5174:5173"  # Usar porta diferente
```

### Container não inicia

```bash
# Ver logs do container
docker-compose logs app

# Ver logs detalhados
docker-compose logs --tail=100 app

# Verificar health check
docker inspect <container_id> | grep -A 10 Health
```

### Volumes não montando

```bash
# Verificar volumes
docker volume ls

# Inspecionar volume
docker volume inspect <volume_name>

# Remover e recriar
docker-compose down -v
docker-compose up -d
```

### Build falhando

```bash
# Build com output detalhado
docker build --progress=plain -t ordax-app:latest .

# Build sem cache
docker build --no-cache -t ordax-app:latest .

# Verificar .dockerignore
cat .dockerignore
```

### Permissões (Linux)

```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Relogar ou executar
newgrp docker

# Verificar
docker ps
```

### Limpar espaço em disco

```bash
# Ver uso de disco
docker system df

# Limpar containers parados
docker container prune

# Limpar imagens não usadas
docker image prune

# Limpar volumes não usados
docker volume prune

# Limpar tudo
docker system prune -af --volumes
```

---

## 📊 Arquitetura

### Desenvolvimento

```
┌─────────────────────────────────────────┐
│         docker-compose.dev.yml          │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────┐│
│  │   App    │  │PostgreSQL│  │ Redis ││
│  │  :5173   │  │  :5432   │  │ :6379 ││
│  │(hot      │  │          │  │       ││
│  │ reload)  │  │          │  │       ││
│  └──────────┘  └──────────┘  └───────┘│
│       │              │            │    │
│       └──────────────┴────────────┘    │
│                  │                     │
│           ┌──────────┐                 │
│           │ Adminer  │                 │
│           │  :8081   │                 │
│           └──────────┘                 │
└─────────────────────────────────────────┘
```

### Produção

```
┌─────────────────────────────────────────┐
│          docker-compose.yml             │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────┐│
│  │   App    │  │PostgreSQL│  │ Redis ││
│  │  :8080   │  │  :5432   │  │ :6379 ││
│  │ (nginx)  │  │          │  │       ││
│  │(optimized│  │          │  │       ││
│  │  build)  │  │          │  │       ││
│  └──────────┘  └──────────┘  └───────┘│
│       │              │            │    │
│       └──────────────┴────────────┘    │
│                  │                     │
│           ┌──────────┐                 │
│           │ Adminer  │                 │
│           │  :8081   │                 │
│           └──────────┘                 │
└─────────────────────────────────────────┘
```

---

## 🔒 Segurança

### Produção

1. **Não commitar .env**

   ```bash
   # Adicionar ao .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Usar secrets**

   ```yaml
   # docker-compose.yml
   secrets:
     db_password:
       file: ./secrets/db_password.txt
   ```

3. **Limitar recursos**

   ```yaml
   # docker-compose.yml
   services:
     app:
       deploy:
         resources:
           limits:
             cpus: "0.5"
             memory: 512M
   ```

4. **Usar usuário não-root**
   ```dockerfile
   # Dockerfile
   RUN addgroup -g 1001 -S nodejs
   RUN adduser -S nodejs -u 1001
   USER nodejs
   ```

---

## 📚 Recursos

### Docker

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)

### Nginx

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Nginx Configuration](https://www.nginx.com/resources/wiki/start/)

### PostgreSQL

- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## 🎯 Próximos Passos

1. **Kubernetes** - Deploy em cluster
2. **CI/CD** - Integrar com GitHub Actions
3. **Monitoring** - Prometheus + Grafana
4. **Logging** - ELK Stack
5. **Backup** - Automatizar backups

---

**Status**: ✅ Docker implementado e documentado  
**Ambiente**: Desenvolvimento + Produção  
**Pronto para uso**: ✅ SIM!
