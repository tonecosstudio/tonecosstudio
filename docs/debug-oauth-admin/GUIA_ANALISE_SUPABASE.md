# 🔍 Guia de Análise Completa do Supabase

Este guia vai te ajudar a fazer uma análise "pente fino" de tudo que está implementado no Supabase e comparar com o projeto.

## 📋 Passo a Passo

### 1️⃣ Extrair Estrutura Atual do Supabase

1. Acesse o **Supabase Dashboard** do seu projeto
2. Vá em **SQL Editor**
3. Abra o arquivo `scripts/analyze_supabase_structure.sql`
4. Copie e cole TODO o conteúdo no SQL Editor
5. Execute o script
6. Salve os resultados em um arquivo de texto ou exporte

**O que esse script faz:**
- Lista todas as tabelas e seus tamanhos
- Mostra todas as colunas de cada tabela
- Exibe chaves primárias e estrangeiras
- Lista todos os índices
- Mostra políticas RLS e se estão habilitadas
- Lista funções customizadas
- Mostra triggers
- Lista views
- Mostra constraints (UNIQUE, CHECK, etc)
- Lista enums/tipos customizados
- Mostra buckets de storage
- Lista migrações aplicadas
- Exibe estatísticas de uso

### 2️⃣ Analisar Arquivos do Projeto

Execute o script de análise local:

```bash
node scripts/compare_supabase_structure.js
```

**O que esse script faz:**
- Varre todos os arquivos SQL do projeto
- Lista todas as migrações encontradas
- Identifica tabelas, funções e políticas mencionadas
- Organiza arquivos por categoria (migrações, análises, scripts)
- Gera um resumo de todas as tabelas e onde são mencionadas

### 3️⃣ Comparar e Identificar Problemas

Crie uma planilha ou documento comparando:

#### ✅ Tabelas no Supabase vs Projeto

| Tabela | No Supabase | No Código | Status | Ação |
|--------|-------------|-----------|--------|------|
| users | ✅ | ✅ | OK | - |
| orders | ✅ | ✅ | OK | - |
| temp_test | ✅ | ❌ | Lixo | Remover |
| payments_new | ❌ | ✅ | Faltando | Migrar |

#### 🔍 Problemas Comuns a Verificar

**Tabelas:**
- [ ] Tabelas no Supabase que não existem no código (lixo de testes)
- [ ] Tabelas no código que não foram criadas no Supabase
- [ ] Tabelas com nomes diferentes (ex: `user` vs `users`)
- [ ] Colunas faltando ou com tipos diferentes

**RLS (Row Level Security):**
- [ ] Tabelas sem RLS habilitado que deveriam ter
- [ ] Políticas duplicadas ou conflitantes
- [ ] Políticas muito permissivas (security risk)
- [ ] Políticas que não funcionam corretamente

**Índices:**
- [ ] Faltam índices em colunas frequentemente consultadas
- [ ] Índices duplicados ou desnecessários
- [ ] Índices em colunas que nunca são usadas

**Funções e Triggers:**
- [ ] Funções órfãs (não usadas)
- [ ] Triggers desabilitados ou quebrados
- [ ] Lógica duplicada entre código e banco

**Migrações:**
- [ ] Migrações no projeto que não foram aplicadas
- [ ] Migrações aplicadas fora de ordem
- [ ] Migrações com erros que foram "puladas"

### 4️⃣ Criar Plano de Limpeza

Com base na comparação, crie um plano:

#### 🗑️ Remover (Lixo)
```sql
-- Exemplo: remover tabela de teste
DROP TABLE IF EXISTS temp_test_table;

-- Exemplo: remover função não usada
DROP FUNCTION IF EXISTS old_unused_function();

-- Exemplo: remover política duplicada
DROP POLICY IF EXISTS "duplicate_policy" ON users;
```

#### ✨ Adicionar (Faltando)
```sql
-- Exemplo: criar tabela faltando
CREATE TABLE payments_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... colunas
);

-- Exemplo: adicionar índice faltando
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Exemplo: habilitar RLS
ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;
```

#### 🔧 Corrigir (Inconsistências)
```sql
-- Exemplo: renomear coluna
ALTER TABLE users RENAME COLUMN old_name TO new_name;

-- Exemplo: alterar tipo de coluna
ALTER TABLE orders ALTER COLUMN amount TYPE decimal(10,2);

-- Exemplo: adicionar constraint faltando
ALTER TABLE orders ADD CONSTRAINT fk_user 
  FOREIGN KEY (user_id) REFERENCES users(id);
```

### 5️⃣ Executar Limpeza com Segurança

**⚠️ IMPORTANTE: Faça backup antes!**

```bash
# No Supabase Dashboard, vá em Database > Backups
# Ou use pg_dump se tiver acesso direto
```

**Ordem de execução:**

1. **Primeiro: Backup** ✅
2. **Remover dependências** (triggers, views que usam tabelas)
3. **Remover políticas RLS** que serão recriadas
4. **Remover/alterar tabelas**
5. **Recriar políticas RLS** corretas
6. **Adicionar índices**
7. **Testar tudo** 🧪

### 6️⃣ Atualizar Documentação

Depois da limpeza, atualize:

- [ ] README.md com estrutura atual do banco
- [ ] Diagrama ER (Entity Relationship)
- [ ] Documentação de APIs que mudaram
- [ ] Comentários no código sobre mudanças

## 🛠️ Scripts Úteis

### Verificar Tamanho do Banco
```sql
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as database_size;
```

### Listar Tabelas Vazias (Candidatas a Remoção)
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = pg_tables.schemaname
      AND t.table_name = pg_tables.tablename
      AND t.table_type = 'BASE TABLE'
      AND (SELECT count(*) FROM pg_tables.tablename) > 0
  )
ORDER BY tablename;
```

### Verificar Políticas RLS Faltando
```sql
SELECT 
  t.tablename,
  t.rowsecurity as rls_enabled,
  COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
HAVING t.rowsecurity = false OR COUNT(p.policyname) = 0
ORDER BY t.tablename;
```

## 📊 Template de Relatório

Crie um arquivo `RELATORIO_ANALISE_SUPABASE.md` com:

```markdown
# Relatório de Análise do Supabase

**Data:** [DATA]
**Analisado por:** [SEU NOME]

## Resumo Executivo
- Total de tabelas: X
- Tabelas com problemas: Y
- Migrações pendentes: Z

## Problemas Encontrados

### Críticos 🔴
1. [Descrição do problema]
   - Impacto: [Alto/Médio/Baixo]
   - Ação: [O que fazer]

### Médios 🟡
...

### Baixos 🟢
...

## Plano de Ação
1. [ ] Tarefa 1
2. [ ] Tarefa 2

## Resultados Esperados
- Banco de dados limpo e organizado
- Documentação atualizada
- Performance melhorada
```

## 🎯 Checklist Final

- [ ] Executei o script de análise do Supabase
- [ ] Executei o script de análise do projeto
- [ ] Comparei os resultados
- [ ] Identifiquei problemas e inconsistências
- [ ] Criei plano de limpeza
- [ ] Fiz backup do banco
- [ ] Executei limpeza com segurança
- [ ] Testei tudo após mudanças
- [ ] Atualizei documentação
- [ ] Commitei mudanças no Git

## 💡 Dicas

1. **Não apague nada sem ter certeza** - sempre verifique se não está sendo usado
2. **Teste em ambiente de dev primeiro** - se possível
3. **Documente tudo** - você vai agradecer depois
4. **Faça commits pequenos** - facilita reverter se algo der errado
5. **Peça review** - outra pessoa pode ver coisas que você não viu

---

**Boa análise! 🚀**
