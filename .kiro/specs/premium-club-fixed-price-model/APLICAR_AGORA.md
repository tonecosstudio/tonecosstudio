# 🚀 APLICAR SPRINT 1 - GUIA RÁPIDO

## ⚡ Passo a Passo Simplificado

### 1️⃣ Aplicar Migration no Supabase

**Opção A: Via Dashboard (Recomendado)**

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New Query**
5. Copie TODO o conteúdo do arquivo:
   ```
   supabase/migrations/20260301000000_create_premium_club_system.sql
   ```
6. Cole no editor SQL
7. Clique em **Run** (ou pressione Ctrl+Enter)
8. Aguarde a execução (pode levar 10-30 segundos)

**Resultado esperado:**
- ✅ "Success. No rows returned"
- ✅ Sem erros vermelhos

---

### 2️⃣ Verificar Tabelas Criadas

No mesmo SQL Editor, execute:

```sql
-- Verificar tabela cycles
SELECT COUNT(*) as total FROM cycles;
-- Esperado: 0 (tabela vazia)

-- Verificar tabela holidays
SELECT COUNT(*) as total FROM holidays;
-- Esperado: ~53 feriados

-- Verificar tabela bonus_pieces
SELECT COUNT(*) as total FROM bonus_pieces;
-- Esperado: 0 (tabela vazia)

-- Verificar colunas adicionadas em subscriptions
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
AND column_name IN ('entry_cycle_id', 'is_legacy_model', 'total_deliveries', 'current_delivery_number');
-- Esperado: 4 linhas
```

---

### 3️⃣ Instalar Dependências

No terminal do projeto:

```bash
# Instalar date-fns-tz (se não estiver instalado)
npm install date-fns-tz

# Instalar fast-check para testes de propriedade
npm install -D fast-check
```

---

### 4️⃣ Executar Testes

```bash
# Executar testes do Sprint 1
npm test timezoneService
npm test businessDayService
```

**Resultado esperado:**
- ✅ Todos os testes passando
- ✅ 60+ testes executados com sucesso

---

## ✅ Checklist de Validação

Marque cada item:

- [ ] Migration executada sem erros
- [ ] Tabela `cycles` criada (0 registros)
- [ ] Tabela `holidays` criada (~53 registros)
- [ ] Tabela `bonus_pieces` criada (0 registros)
- [ ] 4 colunas adicionadas em `subscriptions`
- [ ] 3 colunas adicionadas em `subscription_plans`
- [ ] 4 colunas adicionadas em `collections`
- [ ] 1 coluna adicionada em `subscription_deliveries`
- [ ] Dependências instaladas
- [ ] Testes passando

---

## 🎯 Após Validar

Quando tudo estiver funcionando, me avise com:

**"Sprint 1 aplicado com sucesso, pronto para Sprint 2"**

Então continuarei com a implementação do Sprint 2: Gestão de Ciclos.

---

## ⚠️ Problemas Comuns

### Erro: "relation already exists"
**Solução:** Algumas tabelas já existem. Isso é normal se você já executou a migration antes. Ignore o erro.

### Erro: "Cannot find module date-fns-tz"
**Solução:** Execute `npm install date-fns-tz`

### Testes falhando
**Solução:** 
1. Verifique se as dependências foram instaladas
2. Execute `npm install` para garantir
3. Tente novamente

---

**Data:** 01/03/2026  
**Sprint:** 1 - Fundação  
**Status:** Pronto para aplicar
