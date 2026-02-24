#!/bin/bash

# Scripts úteis para Docker

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para printar com cor
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Desenvolvimento
dev_start() {
    print_info "Iniciando ambiente de desenvolvimento..."
    docker-compose -f docker-compose.dev.yml up -d
    print_success "Ambiente de desenvolvimento iniciado!"
    print_info "Frontend: http://localhost:5173"
    print_info "Adminer: http://localhost:8081"
}

dev_stop() {
    print_info "Parando ambiente de desenvolvimento..."
    docker-compose -f docker-compose.dev.yml down
    print_success "Ambiente de desenvolvimento parado!"
}

dev_logs() {
    docker-compose -f docker-compose.dev.yml logs -f
}

dev_restart() {
    print_info "Reiniciando ambiente de desenvolvimento..."
    docker-compose -f docker-compose.dev.yml restart
    print_success "Ambiente reiniciado!"
}

# Produção
prod_build() {
    print_info "Construindo imagem de produção..."
    docker build -t ordax-app:latest .
    print_success "Imagem construída com sucesso!"
}

prod_start() {
    print_info "Iniciando ambiente de produção..."
    docker-compose up -d
    print_success "Ambiente de produção iniciado!"
    print_info "Frontend: http://localhost:8080"
    print_info "Adminer: http://localhost:8081"
}

prod_stop() {
    print_info "Parando ambiente de produção..."
    docker-compose down
    print_success "Ambiente de produção parado!"
}

prod_logs() {
    docker-compose logs -f
}

# Limpeza
clean() {
    print_info "Limpando containers, volumes e imagens..."
    docker-compose -f docker-compose.dev.yml down -v
    docker-compose down -v
    docker system prune -f
    print_success "Limpeza concluída!"
}

clean_all() {
    print_info "Limpeza completa (incluindo imagens)..."
    docker-compose -f docker-compose.dev.yml down -v --rmi all
    docker-compose down -v --rmi all
    docker system prune -af --volumes
    print_success "Limpeza completa concluída!"
}

# Database
db_migrate() {
    print_info "Executando migrations..."
    docker-compose exec postgres psql -U postgres -d ordax -f /docker-entrypoint-initdb.d/
    print_success "Migrations executadas!"
}

db_backup() {
    print_info "Criando backup do banco de dados..."
    docker-compose exec postgres pg_dump -U postgres ordax > backup_$(date +%Y%m%d_%H%M%S).sql
    print_success "Backup criado!"
}

db_restore() {
    if [ -z "$1" ]; then
        print_error "Uso: $0 db-restore <arquivo_backup.sql>"
        exit 1
    fi
    print_info "Restaurando backup do banco de dados..."
    docker-compose exec -T postgres psql -U postgres ordax < "$1"
    print_success "Backup restaurado!"
}

# Status
status() {
    print_info "Status dos containers:"
    docker-compose ps
    echo ""
    docker-compose -f docker-compose.dev.yml ps
}

# Health check
health() {
    print_info "Verificando saúde dos containers..."
    docker-compose ps --format json | jq -r '.[] | "\(.Name): \(.Health)"'
}

# Logs específicos
logs_app() {
    docker-compose logs -f app
}

logs_db() {
    docker-compose logs -f postgres
}

logs_redis() {
    docker-compose logs -f redis
}

# Shell
shell_app() {
    docker-compose exec app sh
}

shell_db() {
    docker-compose exec postgres psql -U postgres -d ordax
}

shell_redis() {
    docker-compose exec redis redis-cli
}

# Menu de ajuda
show_help() {
    echo "Docker Scripts - Ordax"
    echo ""
    echo "Desenvolvimento:"
    echo "  dev-start       Iniciar ambiente de desenvolvimento"
    echo "  dev-stop        Parar ambiente de desenvolvimento"
    echo "  dev-logs        Ver logs do desenvolvimento"
    echo "  dev-restart     Reiniciar ambiente de desenvolvimento"
    echo ""
    echo "Produção:"
    echo "  prod-build      Construir imagem de produção"
    echo "  prod-start      Iniciar ambiente de produção"
    echo "  prod-stop       Parar ambiente de produção"
    echo "  prod-logs       Ver logs da produção"
    echo ""
    echo "Database:"
    echo "  db-migrate      Executar migrations"
    echo "  db-backup       Criar backup do banco"
    echo "  db-restore      Restaurar backup do banco"
    echo ""
    echo "Limpeza:"
    echo "  clean           Limpar containers e volumes"
    echo "  clean-all       Limpeza completa (incluindo imagens)"
    echo ""
    echo "Utilitários:"
    echo "  status          Ver status dos containers"
    echo "  health          Verificar saúde dos containers"
    echo "  logs-app        Ver logs da aplicação"
    echo "  logs-db         Ver logs do banco de dados"
    echo "  logs-redis      Ver logs do Redis"
    echo "  shell-app       Abrir shell na aplicação"
    echo "  shell-db        Abrir shell no banco de dados"
    echo "  shell-redis     Abrir shell no Redis"
    echo ""
}

# Main
case "$1" in
    dev-start)
        dev_start
        ;;
    dev-stop)
        dev_stop
        ;;
    dev-logs)
        dev_logs
        ;;
    dev-restart)
        dev_restart
        ;;
    prod-build)
        prod_build
        ;;
    prod-start)
        prod_start
        ;;
    prod-stop)
        prod_stop
        ;;
    prod-logs)
        prod_logs
        ;;
    clean)
        clean
        ;;
    clean-all)
        clean_all
        ;;
    db-migrate)
        db_migrate
        ;;
    db-backup)
        db_backup
        ;;
    db-restore)
        db_restore "$2"
        ;;
    status)
        status
        ;;
    health)
        health
        ;;
    logs-app)
        logs_app
        ;;
    logs-db)
        logs_db
        ;;
    logs-redis)
        logs_redis
        ;;
    shell-app)
        shell_app
        ;;
    shell-db)
        shell_db
        ;;
    shell-redis)
        shell_redis
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        print_error "Comando desconhecido: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
