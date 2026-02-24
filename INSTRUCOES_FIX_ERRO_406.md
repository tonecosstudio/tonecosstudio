# Instruções para Corrigir Erro 406

## Problema
O erro 406 (Not Acceptable) está acontecendo porque as políticas RLS (Row Level Security) do Supabase estão bloqueando o acesso às tabelas de chat.

## Solução Imediata

### Opção 1: Via Dashboard do Supabase (RECOMENDADO - Mais Rápido)

1. Acesse o SQL Editor do Supabase:
   ```
   https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor
   ```

2. Abra o arquivo `EXECUTAR_AGORA_FIX_RLS.sql` deste projeto

3. Copie TODO o conteúdo do arquivo

4. Cole no SQL Editor do Supabase

5. Clique em "Run" (ou pressione Ctrl+Enter)

6. Aguarde a confirmação de sucesso

7. Recarregue a página da aplicação (F5 ou Ctrl+R)

### Opção 2: Via Supabase CLI

1. Certifique-se de que o Supabase CLI está instalado:
   ```bash
   npm install -g supabase
   ```

2. Execute o comando para aplicar as migrações:
   ```bash
   npx supabase db push
   ```

3. Aguarde a confirmação

4. Recarregue a página da aplicação

### Opção 3: Via Script Batch (Windows)

1. Execute o arquivo:
   ```
   aplicar-fix-rls-temp.bat
   ```

2. Escolha a opção desejada

3. Siga as instruções na tela

## Verificação

Após aplicar o fix, você deve:

1. Recarregar a página da aplicação (F5)
2. Tentar acessar a página de grupos novamente
3. Verificar se o erro 406 desapareceu do console

## O que foi corrigido?

As políticas RLS foram alteradas temporariamente para permitir que usuários autenticados acessem as tabelas:
- `chat_groups`
- `chat_group_members`
- `chat_group_messages`
- `chat_group_attachments`

Isso é uma solução temporária para desenvolvimento. Em produção, você deve implementar políticas mais restritivas baseadas em roles (admin/member).

## Próximos Passos

Após confirmar que o erro 406 foi resolvido, você pode:
1. Testar a funcionalidade de grupos
2. Implementar políticas RLS mais restritivas quando necessário
3. Continuar o desenvolvimento das features de chat
