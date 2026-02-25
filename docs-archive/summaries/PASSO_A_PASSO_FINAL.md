# ⚡ Passo a Passo - Aplicar Migration

**Tempo estimado:** 2 minutos

---

## 🎯 O Que Fazer

Você precisa criar 2 tabelas no banco de dados:

- `message_templates` (para templates de mensagens)
- `scheduled_messages` (para agendamento)

---

## 📋 Instruções

### 1. Abrir Supabase Studio

Clique neste link ou copie no navegador:

```
http://127.0.0.1:54323/project/default/sql
```

### 2. Copiar o SQL

Abra o arquivo `APLICAR_AGORA.sql` e copie TODO o conteúdo (Ctrl+A, Ctrl+C)

### 3. Colar e Executar

1. Cole o SQL no editor do Supabase Studio
2. Clique no botão "Run" (ou pressione Ctrl+Enter)
3. Aguarde alguns segundos

### 4. Verificar Resultado

Você deve ver no final:

```
message_templates    | 1
scheduled_messages   | 1
```

Isso significa que as tabelas foram criadas com sucesso!

### 5. Recarregar Aplicação

No navegador onde está rodando a aplicação:

- Pressione `Ctrl+Shift+R` (hard reload)
- Ou feche e abra novamente

---

## ✅ Pronto!

O erro `403 Forbidden` deve desaparecer e você terá acesso a:

- ✅ Templates de mensagens
- ✅ Agendamento de mensagens
- ✅ Importação CSV
- ✅ Analytics avançado
- ✅ Busca de mensagens
- ✅ Edição de mensagens
- ✅ Notificações em tempo real
- ✅ Responsividade mobile

---

## 🐛 Se Der Erro

### Erro: "relation already exists"

Significa que a tabela já foi criada. Não precisa fazer nada, apenas recarregue a aplicação.

### Erro: "permission denied"

Execute o SQL no Supabase Studio (não no terminal). O Studio já tem as permissões necessárias.

### Erro: "foreign key constraint"

Verifique se as tabelas `chat_groups` e `profiles` existem. Se não existirem, o banco de dados precisa ser inicializado primeiro.

---

## 📞 Precisa de Ajuda?

Consulte os documentos:

- `GUIA_APLICAR_MIGRATION_GRUPOS.md` - Guia completo
- `README_MELHORIAS_GRUPOS.md` - Documentação geral
- `INSTRUCOES_FINAIS_GRUPOS.md` - Instruções detalhadas

---

**Boa sorte! 🚀**
