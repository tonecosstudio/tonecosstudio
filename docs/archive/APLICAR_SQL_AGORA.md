# ⚡ APLICAR SQL AGORA - 1 Minuto

## 🎯 Situação Atual

✅ Edge Functions deployed (erro 500 de classify-image-vision resolvido)
⚠️ **Falta aplicar SQL** para resolver:
- Erro 400 (colunas AI faltando)
- Erro 500 (tabela franchise_rules faltando)

---

## 🚀 Solução (3 Passos - 1 Minuto)

### 1️⃣ Abrir
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

### 2️⃣ Copiar e Colar
Abra: **`SQL_COPIAR_COLAR.txt`**

Copie TUDO (Ctrl+A, Ctrl+C) e cole no SQL Editor

### 3️⃣ Executar
Clique em **"Run"** ou pressione Ctrl+Enter

---

## ✅ Resultado Esperado

Você verá várias mensagens de sucesso:
```
✅ CREATE EXTENSION
✅ ALTER TABLE
✅ CREATE TABLE
✅ CREATE INDEX (5x)
✅ ALTER TABLE
✅ DO (2x)
✅ DO
✅ COMMENT (7x)
```

---

## 🎉 Depois de Aplicar

1. Recarregue o frontend (Ctrl+R)
2. Todos os erros vão sumir:
   - ✅ Erro 400 resolvido
   - ✅ Erro 500 (classify-image-vision) resolvido
   - ✅ Erro 500 (confirm-model) resolvido

---

## 📊 O Que o SQL Faz?

### Adiciona à tabela images_queue:
- `ai_suggested_name` (nome sugerido pela IA)
- `ai_confidence` (confiança da sugestão)
- `ai_model_used` (modelo usado)
- `image_hash` (hash para deduplicação)

### Cria tabela franchise_rules:
- Armazena regras de mapeamento de franquias
- Permite que o sistema aprenda com suas escolhas
- Melhora sugestões futuras automaticamente

### Cria índices:
- Acelera buscas e queries
- Melhora performance geral

---

## ⏱️ Tempo Total

**1 minuto** para resolver TODOS os erros! ⚡

---

## 📁 Arquivo Necessário

**`SQL_COPIAR_COLAR.txt`** ← Copie deste arquivo!

---

## 🆘 Problemas?

### SQL deu erro
- Copie a mensagem de erro completa
- Verifique se copiou o SQL inteiro
- Tente novamente

### Erro persiste após aplicar
1. Limpe cache (Ctrl+Shift+Delete)
2. Recarregue com Ctrl+F5
3. Verifique console novamente

---

## 🎯 Checklist

- [ ] Abri o SQL Editor
- [ ] Copiei o SQL de `SQL_COPIAR_COLAR.txt`
- [ ] Colei no editor
- [ ] Cliquei em "Run"
- [ ] Vi mensagens de sucesso
- [ ] Recarreguei o frontend
- [ ] Verifiquei que erros sumiram

---

## 🎉 Pronto!

Após aplicar o SQL, sua aplicação estará **100% funcional**! 🚀

Todos os 5 problemas identificados estarão resolvidos:
1. ✅ React Router warnings
2. ✅ Erro 429 (rate limit)
3. ✅ Erro 400 (colunas)
4. ✅ Erro 500 (classify-image-vision)
5. ✅ Erro 500 (confirm-model)
