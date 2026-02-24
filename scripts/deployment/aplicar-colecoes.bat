@echo off
echo ========================================
echo APLICAR COLECOES NO SUPABASE
echo ========================================
echo.

echo 1. Verificando conexao com Supabase...
echo.

REM Usar a chave anonima do .env
set "SUPABASE_URL=https://pabxpvqwtvbjaunjejud.supabase.co"
set "SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"

echo URL: %SUPABASE_URL%
echo.

echo 2. Executando script SQL para inserir colecoes...
echo.

REM Executar o script SQL usando curl
curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SUPABASE_KEY%" ^
  -H "Content-Type: application/json" ^
  -H "Prefer: return=minimal" ^
  -d "{\"sql\": \"$(type inserir-colecoes.sql)\"}"

echo.
echo.

echo 3. Verificando se as colecoes foram inseridas...
echo.

REM Buscar coleções para verificar
curl "%SUPABASE_URL%/rest/v1/collections?select=id,name,slug,is_active" ^
  -H "apikey: %SUPABASE_KEY%" ^
  -H "Content-Type: application/json"

echo.
echo.

echo 4. Testando acesso a colecao Thundercats...
echo.

REM Testar a coleção específica
curl "%SUPABASE_URL%/rest/v1/collections?select=*&slug=eq.thundercats" ^
  -H "apikey: %SUPABASE_KEY%" ^
  -H "Content-Type: application/json"

echo.
echo.

echo ========================================
echo INSTRUCOES:
echo ========================================
echo.
echo Para testar no navegador:
echo 1. Abra: http://localhost:8080/colecoes/thundercats
echo 2. A pagina deve mostrar os detalhes da colecao
echo 3. Se ainda mostrar "Colecao nao encontrada", recarregue a pagina (Ctrl+F5)
echo.
echo Se preferir executar manualmente no Supabase:
echo 1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor
echo 2. Cole o conteudo do arquivo "inserir-colecoes.sql"
echo 3. Execute o script
echo.
pause