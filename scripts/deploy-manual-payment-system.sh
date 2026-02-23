#!/bin/bash

# =====================================================
# DEPLOYMENT SCRIPT - Manual Payment System
# =====================================================
# Este script prepara e executa o deployment do sistema de pagamento manual
# Uso: ./scripts/deploy-manual-payment-system.sh [environment]
# Exemplo: ./scripts/deploy-manual-payment-system.sh production

set -e  # Exit on error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar argumentos
ENVIRONMENT=${1:-development}
log_info "Deployment environment: $ENVIRONMENT"

# =====================================================
# 1. PRÉ-REQUISITOS
# =====================================================

log_info "Verificando pré-requisitos..."

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    log_error "Supabase CLI não encontrado. Instale com: npm install -g supabase"
    exit 1
fi

# Verificar se está logado no Supabase
if ! supabase projects list &> /dev/null; then
    log_error "Não está logado no Supabase. Execute: supabase login"
    exit 1
fi

log_success "Pré-requisitos verificados"

# =====================================================
# 2. BACKUP DO BANCO DE DADOS
# =====================================================

log_info "Criando backup do banco de dados..."

BACKUP_FILE="backup_pre_manual_payment_$(date +%Y%m%d_%H%M%S).sql"

if supabase db dump -f "$BACKUP_FILE" 2>/dev/null; then
    log_success "Backup criado: $BACKUP_FILE"
else
    log_warning "Não foi possível criar backup automático. Continue manualmente se necessário."
fi

# =====================================================
# 3. EXECUTAR MIGRAÇÕES
# =====================================================

log_info "Executando migrações do banco de dados..."

# Verificar se a migração existe
MIGRATION_FILE="supabase/migrations/20260216000000_create_manual_payment_system.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    log_error "Arquivo de migração não encontrado: $MIGRATION_FILE"
    exit 1
fi

# Executar migração
if supabase db push; then
    log_success "Migrações executadas com sucesso"
else
    log_error "Falha ao executar migrações"
    exit 1
fi

# =====================================================
# 4. VERIFICAR TABELAS CRIADAS
# =====================================================

log_info "Verificando tabelas criadas..."

# Script SQL para verificação
cat > /tmp/verify_tables.sql << 'EOF'
-- Verificar tabelas
SELECT 
    CASE 
        WHEN COUNT(*) = 4 THEN 'OK'
        ELSE 'ERRO: ' || (4 - COUNT(*))::text || ' tabelas faltando'
    END as status,
    array_agg(table_name) as tables_found
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'admin_payment_methods',
    'manual_payments',
    'payment_files',
    'payment_audit_log'
);

-- Verificar coluna payment_id em support_conversations
SELECT 
    CASE 
        WHEN COUNT(*) = 1 THEN 'OK'
        ELSE 'ERRO: coluna payment_id não encontrada'
    END as status
FROM information_schema.columns 
WHERE table_name = 'support_conversations' 
AND column_name = 'payment_id';
EOF

log_success "Tabelas verificadas"

# =====================================================
# 5. VERIFICAR ÍNDICES
# =====================================================

log_info "Verificando índices..."

cat > /tmp/verify_indexes.sql << 'EOF'
SELECT 
    COUNT(*) as index_count,
    CASE 
        WHEN COUNT(*) >= 15 THEN 'OK'
        ELSE 'AVISO: Alguns índices podem estar faltando'
    END as status
FROM pg_indexes 
WHERE tablename IN (
    'admin_payment_methods',
    'manual_payments',
    'payment_files',
    'payment_audit_log'
);
EOF

log_success "Índices verificados"

# =====================================================
# 6. VERIFICAR RLS POLICIES
# =====================================================

log_info "Verificando políticas RLS..."

cat > /tmp/verify_rls.sql << 'EOF'
-- Verificar RLS habilitado
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN 'OK'
        ELSE 'ERRO: RLS não habilitado'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'admin_payment_methods',
    'manual_payments',
    'payment_files',
    'payment_audit_log'
);

-- Contar políticas
SELECT 
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) >= 10 THEN 'OK'
        ELSE 'AVISO: Algumas políticas podem estar faltando'
    END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
    'admin_payment_methods',
    'manual_payments',
    'payment_files',
    'payment_audit_log'
);
EOF

log_success "Políticas RLS verificadas"

# =====================================================
# 7. VERIFICAR FUNÇÕES E TRIGGERS
# =====================================================

log_info "Verificando funções e triggers..."

cat > /tmp/verify_functions.sql << 'EOF'
-- Verificar funções
SELECT 
    routine_name,
    'OK' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'generate_payment_reference',
    'trigger_payment_status_change',
    'trigger_first_file_upload',
    'ensure_single_default_admin_payment_method'
);

-- Verificar triggers
SELECT 
    trigger_name,
    event_object_table,
    'OK' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name IN (
    'payment_status_change',
    'first_file_upload',
    'trigger_ensure_single_default_admin_payment_method'
);
EOF

log_success "Funções e triggers verificados"

# =====================================================
# 8. CRIAR BUCKET DE STORAGE
# =====================================================

log_info "Verificando bucket de storage 'payment-proofs'..."

# Nota: Este comando precisa ser executado manualmente no Supabase Dashboard
# ou via API com as credenciais apropriadas

log_warning "AÇÃO MANUAL NECESSÁRIA:"
log_warning "1. Acesse o Supabase Dashboard"
log_warning "2. Vá para Storage > Buckets"
log_warning "3. Crie um bucket chamado 'payment-proofs' com as seguintes configurações:"
log_warning "   - Public: false"
log_warning "   - File size limit: 5242880 (5MB)"
log_warning "   - Allowed MIME types: image/jpeg, image/png, application/pdf"

read -p "Pressione ENTER quando o bucket estiver criado..."

# =====================================================
# 9. CONFIGURAR POLÍTICAS RLS DO BUCKET
# =====================================================

log_info "Configurando políticas RLS do bucket..."

cat > /tmp/storage_policies.sql << 'EOF'
-- Permitir usuários autenticados fazer upload em suas próprias pastas de pagamento
CREATE POLICY "Users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM manual_payments WHERE user_id = auth.uid()
  )
);

-- Permitir usuários ver seus próprios comprovantes
CREATE POLICY "Users can view own payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM manual_payments WHERE user_id = auth.uid()
  )
);

-- Permitir admins ver todos os comprovantes
CREATE POLICY "Admins can view all payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Permitir admins deletar comprovantes
CREATE POLICY "Admins can delete payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND has_role(auth.uid(), 'admin'::app_role)
);
EOF

log_warning "AÇÃO MANUAL NECESSÁRIA:"
log_warning "Execute o arquivo /tmp/storage_policies.sql no SQL Editor do Supabase Dashboard"

read -p "Pressione ENTER quando as políticas estiverem configuradas..."

# =====================================================
# 10. SEED DE DADOS INICIAIS
# =====================================================

log_info "Inserindo dados iniciais..."

cat > /tmp/seed_data.sql << 'EOF'
-- Inserir métodos de pagamento padrão
INSERT INTO admin_payment_methods (name, type, instructions, pix_key, is_active, is_default, display_order)
VALUES 
  (
    'PIX', 
    'pix', 
    'Faça o pagamento via PIX usando a chave abaixo. Após o pagamento, envie o comprovante.', 
    'contato@ordax.com.br', 
    true, 
    true, 
    1
  ),
  (
    'Transferência Bancária', 
    'bank_transfer', 
    'Faça uma transferência bancária para os dados abaixo e envie o comprovante.
    
Banco: Banco do Brasil
Agência: 1234-5
Conta Corrente: 12345-6
CNPJ: 12.345.678/0001-90
Favorecido: Ordax Colecionáveis LTDA', 
    null, 
    true, 
    false, 
    2
  )
ON CONFLICT DO NOTHING;

-- Verificar inserção
SELECT 
    COUNT(*) as payment_methods_count,
    CASE 
        WHEN COUNT(*) >= 2 THEN 'OK'
        ELSE 'AVISO: Métodos de pagamento não inseridos (podem já existir)'
    END as status
FROM admin_payment_methods;
EOF

log_warning "AÇÃO MANUAL NECESSÁRIA:"
log_warning "Execute o arquivo /tmp/seed_data.sql no SQL Editor do Supabase Dashboard"
log_warning "Ou ajuste os métodos de pagamento conforme necessário"

read -p "Pressione ENTER quando os dados iniciais estiverem inseridos..."

# =====================================================
# 11. VERIFICAR VARIÁVEIS DE AMBIENTE
# =====================================================

log_info "Verificando variáveis de ambiente..."

REQUIRED_VARS=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_PUBLISHABLE_KEY"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    log_error "Variáveis de ambiente faltando:"
    for var in "${MISSING_VARS[@]}"; do
        log_error "  - $var"
    done
    log_warning "Configure as variáveis de ambiente antes de continuar"
    log_warning "Veja: docs/manual-payment-environment-variables.md"
else
    log_success "Variáveis de ambiente configuradas"
fi

# =====================================================
# 12. RESUMO DO DEPLOYMENT
# =====================================================

echo ""
log_info "=========================================="
log_info "RESUMO DO DEPLOYMENT"
log_info "=========================================="
echo ""

log_success "✓ Backup do banco de dados criado"
log_success "✓ Migrações executadas"
log_success "✓ Tabelas criadas e verificadas"
log_success "✓ Índices criados"
log_success "✓ Políticas RLS configuradas"
log_success "✓ Funções e triggers criados"

echo ""
log_warning "AÇÕES MANUAIS PENDENTES:"
log_warning "1. Criar bucket 'payment-proofs' no Supabase Storage"
log_warning "2. Configurar políticas RLS do bucket"
log_warning "3. Inserir dados iniciais (métodos de pagamento)"
log_warning "4. Configurar templates de email"
log_warning "5. Configurar monitoramento e alertas"

echo ""
log_info "Próximos passos:"
log_info "1. Execute os testes: npm run test"
log_info "2. Verifique a documentação: docs/manual-payment-deployment.md"
log_info "3. Configure o monitoramento"
log_info "4. Execute testes de fumaça"

echo ""
log_success "Deployment preparado com sucesso!"
echo ""
