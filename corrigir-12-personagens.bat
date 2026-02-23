@echo off
echo ========================================
echo CORRIGIR: 12 PERSONAGENS THUNDERCATS
echo ========================================
echo.

echo PROBLEMA:
echo A pagina mostra "12 personagens" mas so tem 4 cadastrados.
echo.
echo SOLUCAO:
echo 1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor
echo.
echo 2. Copie e cole este codigo SQL (VERSÃO CORRIGIDA):
echo.
type FIX_THUNDERCATS_SIMPLES.sql
echo.
echo 3. Clique em "RUN"
echo.
echo 4. Recarregue a pagina: http://localhost:8080/colecoes/thundercats (Ctrl+F5)
echo.
echo RESULTADO ESPERADO:
echo - Total: 12 personagens
echo - Disponiveis: 2 (Lion-O, Cheetara)
echo - Revelados: 2 (Panthro, Tygra)  
echo - Em breve: 8 (completando 12)
echo.
echo Pressione qualquer tecla para ver instrucoes detalhadas...
pause > nul

echo.
echo ========================================
echo INSTRUCOES DETALHADAS:
echo ========================================
echo.
echo 1. O script vai:
echo    - Criar coluna total_characters se nao existir
echo    - Inserir 12 personagens (mantendo os 4 atuais)
echo    - Atualizar contagem para 12
echo    - Mostrar resultado
echo.
echo 2. Apos executar, a pagina deve mostrar:
echo    - "12 personagens" (em vez de 4)
echo    - Lista completa de 12 personagens
echo    - Status correto de cada um
echo.
echo 3. Se ainda mostrar 4:
echo    - Recarregue com Ctrl+F5
echo    - Verifique se o SQL executou sem erros
echo    - Execute: SELECT COUNT(*) FROM collection_characters WHERE...
echo.
pause