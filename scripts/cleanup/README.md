# 🧹 Scripts de Limpeza do Projeto

Esta pasta contém scripts para limpar e organizar o banco de dados e arquivos do projeto.

## 📋 Ordem de Execução

### 1️⃣ Organizar Arquivos do Projeto (SEGURO)

**Windows (PowerShell):**
```powershell
cd scripts/cleanup
.\03_organize_project_files.ps1
```

**Linux/Mac (Bash):**
```bash
cd scripts/cleanup
chmod +x 03_organize_project_files.sh
./03_organize_project_files.sh
```

**O que faz:**
- Move arquivos antigos para `scripts/archive/`
- Organiza fixes do erro 406
- Arquiva scripts temporários
- NÃO deleta nada, apenas organiza

**Risco:** 🟢 Nenhum (apenas move arquivos)

---

### 2️⃣ Verificar Tabelas Vazias (ANÁLISE)

**Execute no Supabase Dashboard → SQL Editor:**
```sql
-- Copie e cole o conteúdo de:
scripts/cleanup/04_verify_empty_tables.sql
```

**O que faz:**
- Lista todas as tabelas vazias
- Identifica tabelas que podem ser removidas
- Agrupa por categoria (AI, Quotes, etc)
- NÃO remove nada, apenas analisa

**Risco:** 🟢 Nenhum (apenas consulta)

---

### 3️⃣ Remover Tabelas de Backup (BAIXO RISCO)

**Execute no Supabase Dashboard → SQL Editor:**
```sql
-- Copie e cole o conteúdo de:
scripts/cleanup/01_remove_backup_tables.sql
```

**O que faz:**
- Remove `chat_group_messages_backup` (8KB, órfã)
- Lista outras tabelas com "backup" no nome

**Risco:** 🟡 Baixo (remove apenas backups temporários)

**⚠️ Antes de executar:**
- [ ] Fazer backup do banco
- [ ] Verificar se não há dependências

---

### 4️⃣ Remover Features Não Usadas (MÉDIO RISCO)

**Execute no Supabase Dashboard → SQL Editor:**
```sql
-- Copie e cole o conteúdo de:
scripts/cleanup/02_remove_unused_features.sql
```

**⚠️ ATENÇÃO:** Este script está comentado por padrão!

**O que faz:**
- Remove tabelas de AI (se não usa)
- Remove tabelas de Quotes (se não usa)
- Remove tabelas de Preorders (se não usa)
- Remove tabelas de Landing Page (se não usa)

**Risco:** 🟠 Médio (remove tabelas do sistema)

**⚠️ Antes de executar:**
- [ ] Fazer backup do banco
- [ ] Revisar CADA seção do script
- [ ] Descomentar APENAS o que tem certeza
- [ ] Testar em ambiente de dev primeiro

---

## 🎯 Checklist Completo

### Antes de Começar
- [ ] Ler `RELATORIO_ANALISE_SUPABASE.md` completo
- [ ] Fazer backup do banco de dados
- [ ] Fazer commit do código atual
- [ ] Ter ambiente de teste (se possível)

### Execução
- [ ] 1. Executar script de organização de arquivos
- [ ] 2. Executar script de verificação de tabelas vazias
- [ ] 3. Revisar resultados da verificação
- [ ] 4. Decidir quais tabelas remover
- [ ] 5. Executar script de remoção de backups
- [ ] 6. Executar script de remoção de features (se aplicável)

### Validação
- [ ] Aplicação funciona normalmente
- [ ] Testes passam
- [ ] Nenhum erro no console
- [ ] Deploy em staging OK

### Finalização
- [ ] Commit das mudanças
- [ ] Atualizar documentação
- [ ] Criar `CLEANUP_LOG.md` com o que foi removido

---

## 📊 Resultados Esperados

### Antes
- 123 tabelas (68 vazias)
- 364 arquivos SQL
- Estrutura desorganizada

### Depois
- ~100 tabelas (apenas necessárias)
- ~150 arquivos SQL (organizados)
- Estrutura limpa e documentada

---

## 🆘 Em Caso de Problemas

### Se algo quebrou após remover tabelas:

1. **Restaurar backup:**
   ```sql
   -- No Supabase Dashboard → Database → Backups
   -- Selecione o backup anterior e restaure
   ```

2. **Reverter commit:**
   ```bash
   git revert HEAD
   git push
   ```

3. **Recriar tabela específica:**
   - Encontre a migração original em `supabase/migrations/`
   - Execute apenas a parte de criação da tabela

### Se arquivos foram movidos por engano:

```bash
# Mover de volta
mv scripts/archive/[pasta]/[arquivo].sql scripts/database/[pasta]/
```

---

## 💡 Dicas

1. **Faça em etapas:** Não execute tudo de uma vez
2. **Teste cada etapa:** Valide antes de prosseguir
3. **Documente tudo:** Anote o que foi removido e por quê
4. **Mantenha backups:** Por pelo menos 30 dias
5. **Revise com calma:** Não tenha pressa

---

## 📞 Suporte

Se tiver dúvidas:
1. Revise `RELATORIO_ANALISE_SUPABASE.md`
2. Revise `GUIA_ANALISE_SUPABASE.md`
3. Consulte a documentação do Supabase
4. Peça ajuda no chat do projeto

---

**Última atualização:** 03/03/2026
