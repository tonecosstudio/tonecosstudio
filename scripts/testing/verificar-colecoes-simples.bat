@echo off
echo ========================================
echo VERIFICAR COLECOES NO SUPABASE
echo ========================================
echo.

echo 1. Abra o Supabase Dashboard no navegador:
echo    https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor
echo.

echo 2. Copie e cole este codigo SQL (versao corrigida com UUIDs validos):
echo.
type inserir-colecoes-auto-uuid.sql
echo.

echo 3. Clique em "RUN" para executar.
echo.

echo 4. Depois de executar, teste no navegador:
echo    http://localhost:8080/colecoes/thundercats
echo.

echo 5. Se ainda mostrar "Colecao nao encontrada":
echo    - Recarregue a pagina com Ctrl+F5
echo    - Verifique se o SQL foi executado com sucesso
echo.

echo ========================================
echo ARQUIVOS DISPONIVEIS:
echo ========================================
echo.
echo 1. inserir-colecoes-simples.sql - Script SQL simplificado
echo 2. SOLUCAO_COLECOES_NAO_ENCONTRADAS.md - Guia completo
echo 3. testar-colecoes.bat - Teste de conexao (ja existente)
echo.

echo Pressione qualquer tecla para voltar ao menu...
pause > nul