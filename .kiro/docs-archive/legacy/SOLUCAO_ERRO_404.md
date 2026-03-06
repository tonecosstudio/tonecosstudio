# 🔧 Solução para Erros 404 - Tabelas Não Encontradas

## 📋 Problema Identificado

As requisições estão falhando com erro 404 porque as tabelas `collections` e `cycles` não existem no banco de dados Supabase, apesar das migrations estarem criadas no projeto.

```
GET /rest/v1/collections?select=*&is_active=eq.true... 404 (Not Found)
GET /rest/v1/cycles?select=*&status=eq.open... 404 (Not Found)
```

## ✅ Solução

Você precisa aplicar as migrations ao banco de dados. Existem 3 formas de fazer isso:

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# 1. Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# 2. Fazer login no Supabase
npx supabase login

# 3. Linkar o projeto local com o projeto remoto
npx supabase link --project-ref lprsvnwshfxhpnwrxfpy

# 4. Aplicar todas as migrations
npx supabase db push
```

### Opção 2: Via Dashboard do Supabase (RECOMENDADO - Mais Rápido)

**Passo a passo:**

1. **Abra o SQL Editor do Supabase:**
   - Acesse: https://supabase.com/dashboard/project/lprsvnwshfxhpnwrxfpy/editor
   - Clique em **SQL Editor** no menu lateral

2. **Execute o script consolidado:**
   - Abra o arquivo `APLICAR_MIGRATIONS_CRITICAS.sql` (criado na raiz do projeto)
   - Copie TODO o conteúdo do arquivo
   - Cole no SQL Editor do Supabase
   - Clique em **Run** (ou pressione Ctrl+Enter)

3. **Verifique o resultado:**
   - Você deve ver mensagens de sucesso no console
   - Confirme que as tabelas foram criadas:
     ```sql
     SELECT table_name 
     FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name IN ('collections', 'cycles');
     ```

### Opção 3: Aplicar Todas as Migrations de Uma Vez

Se você quiser garantir que TODAS as migrations estão aplicadas:

```bash
# Windows PowerShell
Get-ChildItem supabase/migrations/*.sql | ForEach-Object {
    Write-Host "Aplicando: $($_.Name)"
    npx supabase db execute -f $_.FullName
}

# Linux/Mac
for file in supabase/migrations/*.sql; do
    echo "Aplicando: $(basename $file)"
    npx supabase db execute -f "$file"
done
```

## 🔍 Verificação

Após aplicar as migrations, verifique se as tabelas foram criadas:

```sql
-- Execute no SQL Editor do Supabase
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('collections', 'cycles');
```

Você deve ver ambas as tabelas listadas.

## 🚀 Próximos Passos

Após aplicar as migrations:

1. **Recarregue a aplicação** (F5 no navegador)
2. Os erros 404 devem desaparecer
3. A aplicação deve carregar normalmente

## 📊 Migrations Críticas para o Sistema

Estas são as migrations essenciais que devem estar aplicadas:

- ✅ `20260202000000_create_collections_system.sql` - Sistema de coleções
- ✅ `20260301000000_create_premium_club_system.sql` - Sistema de ciclos
- ✅ `20260428000000_create_production_queue.sql` - Fila de produção
- ✅ `20260428000001_create_character_choices.sql` - Escolha de personagens
- ✅ `20260428000002_create_production_stages.sql` - Estágios de produção

## ⚠️ Notas Importantes

1. **Ordem das Migrations**: As migrations devem ser aplicadas na ordem dos timestamps (nomes dos arquivos)
2. **Backup**: Sempre faça backup antes de aplicar migrations em produção
3. **Ambiente**: Certifique-se de estar aplicando no ambiente correto (dev/prod)

## 🐛 Troubleshooting

### Erro: "relation already exists"
Significa que a tabela já existe. Você pode ignorar ou usar `DROP TABLE IF EXISTS` antes.

### Erro: "permission denied"
Certifique-se de estar usando as credenciais corretas e que tem permissões de admin.

### Erro: "syntax error"
Verifique se o arquivo SQL está completo e sem caracteres especiais.

## 📞 Suporte

Se os erros persistirem após aplicar as migrations:

1. Verifique os logs do Supabase: https://supabase.com/dashboard/project/lprsvnwshfxhpnwrxfpy/logs
2. Confirme que as RLS policies estão configuradas corretamente
3. Verifique se o usuário tem as permissões necessárias
