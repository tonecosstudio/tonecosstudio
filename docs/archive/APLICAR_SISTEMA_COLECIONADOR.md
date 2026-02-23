# 🚀 Guia Rápido - Aplicar Sistema de Colecionador

## Passo 1: Aplicar Migration no Banco

### Opção A: Ambiente Local (Supabase CLI)
```bash
supabase db reset
```

### Opção B: Produção (Supabase Dashboard)
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Abra o arquivo: `supabase/migrations/20260201000002_create_collector_system.sql`
5. Copie todo o conteúdo
6. Cole no SQL Editor
7. Clique em **Run**

### Opção C: Produção (Supabase CLI)
```bash
supabase db push
```

---

## Passo 2: Verificar Instalação

Execute este SQL para verificar se tudo foi criado:

```sql
-- Verificar tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('collector_badges', 'user_badges', 'public_collection');

-- Verificar badges padrão
SELECT id, name, rarity FROM collector_badges ORDER BY requirement_value;

-- Verificar novos campos no profiles
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('username', 'display_name', 'bio', 'collector_level', 'collector_xp');
```

**Resultado esperado:**
- 3 tabelas encontradas
- 10 badges listados
- 5+ campos novos no profiles

---

## Passo 3: Testar Funcionalidades

### 3.1 Configurar Perfil Público
1. Faça login na aplicação
2. Acesse `/perfil`
3. Role até "Perfil Público de Colecionador"
4. Ative o toggle "Perfil Público"
5. Preencha:
   - Username: `seu-username` (3-20 caracteres)
   - Nome de Exibição: `Seu Nome`
   - Bio: `Descrição sobre você`
6. Clique em "Salvar Perfil Público"

### 3.2 Adicionar à Coleção Pública
1. Na mesma página, role até "Minha Coleção Pública"
2. Clique em "Adicionar"
3. Busque um modelo (ex: "batman")
4. Clique em "Adicionar" no modelo desejado
5. Adicione notas (opcional)

### 3.3 Visualizar Perfil Público
1. Clique no link "Ver perfil público" (aparece quando perfil está público)
2. Ou acesse: `/collector/seu-username`
3. Verifique:
   - ✅ Estatísticas aparecem
   - ✅ Badges aparecem (se tiver)
   - ✅ Coleção aparece

### 3.4 Testar Sistema de XP e Badges
1. Como admin, aprove um quote de um usuário
2. Verifique que:
   - ✅ `pieces_owned` aumentou
   - ✅ `total_spent` aumentou
   - ✅ `collector_xp` aumentou
   - ✅ Badge "Primeira Peça" foi concedido (se era a primeira)

---

## Passo 4: Verificar Dados no Banco

```sql
-- Ver perfil de um usuário
SELECT 
  username,
  display_name,
  is_public,
  collector_level,
  collector_xp,
  pieces_owned,
  total_spent
FROM profiles
WHERE id = 'SEU_USER_ID';

-- Ver badges conquistados
SELECT 
  ub.earned_at,
  cb.name,
  cb.rarity,
  cb.icon
FROM user_badges ub
JOIN collector_badges cb ON cb.id = ub.badge_id
WHERE ub.user_id = 'SEU_USER_ID'
ORDER BY ub.earned_at DESC;

-- Ver coleção pública
SELECT 
  pc.notes,
  cm.name as model_name,
  f.name as franchise_name
FROM public_collection pc
JOIN collectible_models cm ON cm.id = pc.model_id
LEFT JOIN franchises f ON f.id = cm.franchise_id
WHERE pc.user_id = 'SEU_USER_ID'
ORDER BY pc.display_order, pc.added_at DESC;
```

---

## 🐛 Troubleshooting

### Erro: "username já está em uso"
- Escolha outro username
- Usernames são únicos no sistema

### Erro: "Perfil não encontrado ou privado"
- Verifique se `is_public = true`
- Verifique se o username está correto

### Badges não aparecem
- Execute manualmente: `SELECT check_and_grant_badges('SEU_USER_ID');`
- Verifique se as estatísticas estão corretas

### Estatísticas não atualizam
- Verifique se o trigger está ativo:
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_update_collector_stats';
```

### Coleção não aparece
- Verifique RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'public_collection';
```

---

## ✅ Checklist Final

- [ ] Migration aplicada com sucesso
- [ ] 3 tabelas criadas
- [ ] 10 badges inseridos
- [ ] Campos adicionados ao profiles
- [ ] Triggers funcionando
- [ ] RLS policies ativas
- [ ] Perfil público configurável
- [ ] Coleção pública gerenciável
- [ ] Página pública acessível
- [ ] XP sendo adicionado automaticamente
- [ ] Badges sendo concedidos automaticamente

---

## 🎉 Pronto!

Seu sistema de gamificação está completo e funcionando!

**Próximos passos:**
1. Teste com usuários reais
2. Monitore badges conquistados
3. Ajuste valores de XP se necessário
4. Adicione novos badges conforme necessário

**Para adicionar novos badges:**
```sql
INSERT INTO collector_badges (id, name, description, icon, rarity, requirement_type, requirement_value)
VALUES ('novo_badge', 'Nome do Badge', 'Descrição', '🎖️', 'rare', 'pieces_owned', 100);
```

---

## 📚 Documentação Completa

Veja `SISTEMA_COLECIONADOR_COMPLETO.md` para documentação detalhada de todas as funcionalidades.
