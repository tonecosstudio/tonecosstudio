#!/bin/bash

# ============================================================================
# SCRIPT 3: Organizar Arquivos SQL do Projeto
# ============================================================================
# Este script move arquivos antigos/temporários para pasta de arquivo
# SEGURO: Apenas move arquivos, não deleta nada
# ============================================================================

echo "🗂️  Organizando arquivos SQL do projeto..."
echo ""

# Criar estrutura de pastas
echo "📁 Criando estrutura de pastas..."
mkdir -p scripts/archive/fixes-406
mkdir -p scripts/archive/temp-fixes
mkdir -p scripts/archive/old-utilities
mkdir -p scripts/archive/old-seeds

# ============================================================================
# 1. Arquivar múltiplos fixes do erro 406
# ============================================================================
echo ""
echo "📦 Arquivando fixes antigos do erro 406..."

if [ -d "scripts/database/fixes" ]; then
    # Mover todos os fixes relacionados ao 406
    mv scripts/database/fixes/fix-406-*.sql scripts/archive/fixes-406/ 2>/dev/null
    mv scripts/database/fixes/fix_406_*.sql scripts/archive/fixes-406/ 2>/dev/null
    mv scripts/database/fixes/solucao-*.sql scripts/archive/fixes-406/ 2>/dev/null
    mv scripts/database/fixes/fix-nuclear-*.sql scripts/archive/fixes-406/ 2>/dev/null
    mv scripts/database/fixes/fix-complete-*.sql scripts/archive/fixes-406/ 2>/dev/null
    
    echo "   ✅ Fixes do 406 arquivados"
else
    echo "   ⚠️  Pasta scripts/database/fixes não encontrada"
fi

# ============================================================================
# 2. Arquivar arquivos temporários da raiz
# ============================================================================
echo ""
echo "📦 Arquivando arquivos temporários da raiz..."

# Lista de arquivos temporários na raiz
temp_files=(
    "add_manual_payment_to_queue.sql"
    "temp_fix_relationships.sql"
    "FIX_NOW.sql"
    "FIX_STANDALONE_PURCHASES.sql"
    "FIX_ENUM_PAYMENT_TYPES.sql"
    "populate_production_queue_manually.sql"
    "seed_production_test_data.sql"
    "reload_schema.sql"
    "check_and_fix_rls.sql"
    "CHECK_ENUM.sql"
    "check_manual_payments_fk.sql"
    "check_production_objects.sql"
    "test_production_objects.sql"
    "diagnostico_subscription.sql"
)

for file in "${temp_files[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" scripts/archive/temp-fixes/
        echo "   ✅ Movido: $file"
    fi
done

# ============================================================================
# 3. Arquivar scripts de verificação redundantes
# ============================================================================
echo ""
echo "📦 Arquivando scripts de verificação redundantes..."

if [ -d "scripts/database/utilities" ]; then
    # Mover verificações antigas (manter apenas as principais)
    mv scripts/database/utilities/verificar-fix-*.sql scripts/archive/old-utilities/ 2>/dev/null
    mv scripts/database/utilities/diagnostico-*.sql scripts/archive/old-utilities/ 2>/dev/null
    mv scripts/database/utilities/test-*.sql scripts/archive/old-utilities/ 2>/dev/null
    mv scripts/database/utilities/testar-*.sql scripts/archive/old-utilities/ 2>/dev/null
    
    echo "   ✅ Scripts de verificação arquivados"
fi

# ============================================================================
# 4. Arquivar seeds antigos
# ============================================================================
echo ""
echo "📦 Arquivando seeds antigos..."

if [ -d "scripts/database/seeds" ]; then
    # Mover seeds de teste
    mv scripts/database/seeds/adicionar-datas-teste.sql scripts/archive/old-seeds/ 2>/dev/null
    mv scripts/database/seeds/popular_dados_teste_grupos.sql scripts/archive/old-seeds/ 2>/dev/null
    mv scripts/database/seeds/seed-chat-data.sql scripts/archive/old-seeds/ 2>/dev/null
    
    echo "   ✅ Seeds antigos arquivados"
fi

# ============================================================================
# 5. Arquivar documentos de análise antigos
# ============================================================================
echo ""
echo "📦 Arquivando análises antigas..."

# Mover análises antigas para docs/archive
if [ -d "docs/archive" ]; then
    # Já existe, apenas mover arquivos da raiz se necessário
    mv ANALISE_*.md docs/archive/ 2>/dev/null
    mv APLICACAO_*.md docs/archive/ 2>/dev/null
    mv APLICAR_*.md docs/archive/ 2>/dev/null
fi

# ============================================================================
# 6. Criar arquivo README nos archives
# ============================================================================
echo ""
echo "📝 Criando READMEs nos arquivos..."

cat > scripts/archive/README.md << 'EOF'
# Arquivos Arquivados

Esta pasta contém arquivos SQL antigos que foram movidos para manter o projeto organizado.

## Estrutura

- `fixes-406/` - Múltiplas tentativas de corrigir o erro 406 do RLS
- `temp-fixes/` - Fixes temporários que foram aplicados
- `old-utilities/` - Scripts de verificação e diagnóstico antigos
- `old-seeds/` - Seeds de teste antigos

## ⚠️ Importante

Estes arquivos foram arquivados, não deletados. Se precisar de algum:
1. Revise o conteúdo
2. Copie para a pasta apropriada
3. Atualize conforme necessário

## Política de Limpeza

Arquivos com mais de 6 meses podem ser deletados permanentemente.
EOF

# ============================================================================
# 7. Relatório final
# ============================================================================
echo ""
echo "============================================"
echo "✅ Organização concluída!"
echo "============================================"
echo ""
echo "📊 Resumo:"
echo "   - Fixes do 406 arquivados em: scripts/archive/fixes-406/"
echo "   - Arquivos temporários em: scripts/archive/temp-fixes/"
echo "   - Utilities antigas em: scripts/archive/old-utilities/"
echo "   - Seeds antigos em: scripts/archive/old-seeds/"
echo ""
echo "📋 Próximos passos:"
echo "   1. Revisar arquivos arquivados"
echo "   2. Deletar o que não é mais necessário"
echo "   3. Commit das mudanças"
echo ""
