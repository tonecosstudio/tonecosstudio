@echo off
echo ========================================
echo COMANDOS RAPIDOS - TESTE DO CHAT
echo ========================================
echo.
echo Este arquivo contem comandos uteis para testar o sistema de chat.
echo.
echo ========================================
echo 1. INICIAR SERVIDOR DE DESENVOLVIMENTO
echo ========================================
echo.
echo npm run dev
echo.
echo Acesse: http://localhost:8080
echo.
echo ========================================
echo 2. TESTAR BOTAO FLUTUANTE DE CHAT
echo ========================================
echo.
echo 1. Fazer login como cliente (nao admin)
echo 2. Navegar para qualquer pagina
echo 3. Verificar botao flutuante no canto inferior direito
echo 4. Clicar no botao e enviar mensagem
echo.
echo URLs para testar:
echo - http://localhost:8080/
echo - http://localhost:8080/catalogo
echo - http://localhost:8080/perfil
echo - http://localhost:8080/colecoes
echo.
echo ========================================
echo 3. TESTAR ATUALIZACAO DE STATUS
echo ========================================
echo.
echo 1. Fazer login como admin
echo 2. Ir para: http://localhost:8080/admin/suporte
echo 3. Selecionar uma conversa
echo 4. Clicar no nome do usuario para abrir sidebar
echo 5. Clicar no icone de editar em um pedido
echo 6. Mudar status e adicionar tracking code
echo 7. Verificar mensagem automatica no chat
echo.
echo ========================================
echo 4. TESTAR FORMULARIO DE CONTATO
echo ========================================
echo.
echo 1. Fazer logout ou usar navegacao anonima
echo 2. Ir para: http://localhost:8080/contato
echo 3. Preencher formulario
echo 4. Fazer login quando solicitado
echo 5. Verificar que conversa foi criada
echo.
echo ========================================
echo 5. VERIFICAR LOGS DO SUPABASE
echo ========================================
echo.
echo Acesse: https://supabase.com/dashboard
echo Va para: Logs ^> Database
echo Verifique erros de triggers e queries
echo.
echo ========================================
echo 6. REGENERAR TIPOS DO SUPABASE
echo ========================================
echo.
echo npx supabase gen types typescript --project-id [PROJECT_ID] ^> src/integrations/supabase/types.ts
echo.
echo Substitua [PROJECT_ID] pelo ID do seu projeto
echo.
echo ========================================
echo 7. EXECUTAR MIGRATIONS
echo ========================================
echo.
echo npx supabase db push
echo.
echo Ou execute manualmente no Supabase Dashboard
echo.
echo ========================================
echo 8. VERIFICAR REALTIME
echo ========================================
echo.
echo 1. Abrir 2 navegadores
echo 2. Fazer login como admin em um
echo 3. Fazer login como cliente em outro
echo 4. Abrir mesma conversa nos dois
echo 5. Enviar mensagem de um lado
echo 6. Verificar que aparece do outro lado
echo.
echo ========================================
echo 9. LIMPAR CACHE DO NAVEGADOR
echo ========================================
echo.
echo Pressione: Ctrl + Shift + Delete
echo Ou: F12 ^> Application ^> Clear Storage ^> Clear site data
echo.
echo ========================================
echo 10. VERIFICAR CONSOLE DO NAVEGADOR
echo ========================================
echo.
echo Pressione: F12
echo Va para: Console
echo Verifique erros em vermelho
echo.
echo ========================================
echo ARQUIVOS DE DOCUMENTACAO
echo ========================================
echo.
echo - ANALISE_ADMIN_SUPORTE_FALTANDO.md
echo - IMPLEMENTACAO_FUNCIONALIDADES_CRITICAS.md
echo - TESTAR_FUNCIONALIDADES_CRITICAS.md
echo - RESUMO_IMPLEMENTACAO_FINAL.md
echo.
echo ========================================
echo PRONTO PARA TESTAR!
echo ========================================
echo.
pause
