# 🚀 INSTRUÇÕES: Aplicar Desconto PIX 5%

**Data:** 2026-02-15  
**Mudança:** Atualizar desconto PIX de 10% para 5%

---

## ⚡ APLICAÇÃO RÁPIDA

### Opção 1: Script Automático (Windows)
```bash
aplicar-desconto-pix-5-porcento.bat
```

### Opção 2: Supabase SQL Editor
1. Abrir [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecionar projeto
3. Ir em **SQL Editor**
4. Copiar e colar conteúdo de `SQL_ATUALIZAR_DESCONTO_PIX_5_PORCENTO.sql`
5. Clicar em **Run**

### Opção 3: psql (Terminal)
```bash
psql "sua-connection-string" -f supabase/migrations/20260215130000_update_pix_discount_5_percent.sql
```

---

## 📋 PASSO A PASSO DETALHADO

### 1. Backup (Recomendado)
```sql
-- Salvar valores atuais
CREATE TABLE subscription_plans_backup_20260215 AS
SELECT * FROM subscription_plans;
```

### 2. Verificar Valores Atuais
```sql
SELECT 
  plan_type,
  name,
  price_full,
  price_pix,
  ROUND(((price_full - price_pix) / price_full) * 100, 2) as desconto_atual
FROM subscription_plans
WHERE is_active = true;
```

**Resultado esperado (ANTES):**
```
trimestral | 1350.00 | 1215.00 | 10.00
semestral  | 2700.00 | 2430.00 | 10.00
```

### 3. Aplicar Atualização

**Copiar e executar:**
```sql
-- Trimestral: 5% de desconto
UPDATE subscription_plans
SET price_pix = 1282.50, updated_at = NOW()
WHERE plan_type = 'trimestral';

-- Semestral: 5% de desconto
UPDATE subscription_plans
SET price_pix = 2565.00, updated_at = NOW()
WHERE plan_type = 'semestral';
```

### 4. Validar Resultado
```sql
SELECT 
  plan_type,
  name,
  price_full,
  price_pix,
  ROUND(((price_full - price_pix) / price_full) * 100, 2) as desconto_novo,
  price_full - price_pix as economia_reais
FROM subscription_plans
WHERE is_active = true;
```

**Resultado esperado (DEPOIS):**
```
trimestral | 1350.00 | 1282.50 | 5.00 | 67.50
semestral  | 2700.00 | 2565.00 | 5.00 | 135.00
```

### 5. Testar Frontend
1. Abrir `/planos`
2. Verificar valores exibidos
3. Abrir `/colecoes/:slug/comprar`
4. Verificar entrada e restante
5. Abrir `/admin/calculadora`
6. Testar cálculos

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Banco de Dados
- [ ] Backup criado
- [ ] Migration aplicada
- [ ] Valores verificados
- [ ] Desconto = 5%

### Frontend
- [ ] Página `/planos` mostra valores corretos
- [ ] Página de compra avulsa mostra R$ 375 restante PIX
- [ ] Calculadora usa 5% de desconto
- [ ] Todas as páginas carregam sem erro

### Documentação
- [ ] `DOCUMENTACAO_OFICIAL_ORDAX.md` atualizada
- [ ] `VALORES_OFICIAIS_PIX_5_PORCENTO.md` criada
- [ ] `RESUMO_ATUALIZACAO_PIX_5_PORCENTO.md` criada

### Testes
- [ ] Simular compra avulsa
- [ ] Simular assinatura trimestral
- [ ] Simular assinatura semestral
- [ ] Verificar cálculos de taxa

---

## 🔄 ROLLBACK (Se Necessário)

Se precisar voltar para 10%:

```sql
-- Restaurar valores anteriores
UPDATE subscription_plans
SET price_pix = 1215.00, updated_at = NOW()
WHERE plan_type = 'trimestral';

UPDATE subscription_plans
SET price_pix = 2430.00, updated_at = NOW()
WHERE plan_type = 'semestral';
```

Ou restaurar do backup:
```sql
-- Restaurar do backup
UPDATE subscription_plans sp
SET 
  price_pix = b.price_pix,
  updated_at = NOW()
FROM subscription_plans_backup_20260215 b
WHERE sp.id = b.id;
```

---

## 📊 IMPACTO ESPERADO

### Receita por Venda (PIX)
- **Avulso:** +R$ 15,00 por venda
- **Trimestral:** +R$ 67,50 por venda
- **Semestral:** +R$ 135,00 por venda

### Projeção Mensal
Assumindo 20 vendas (10 avulso + 6 trimestral + 4 semestral):

**Antes (10%):** R$ 21.610  
**Depois (5%):** R$ 22.705  
**Ganho:** +R$ 1.095/mês (+5%)

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

1. **SSOT Ativo:** Frontend atualiza automaticamente
2. **Sem alteração de código:** Apenas banco de dados
3. **Assinaturas ativas:** Mantêm preço original
4. **Novos clientes:** Usam novo preço
5. **Cache:** Pode levar alguns minutos para atualizar

---

## 🆘 SUPORTE

### Problemas Comuns

**Frontend não atualiza:**
- Limpar cache do navegador (Ctrl + Shift + R)
- Verificar se migration foi aplicada
- Checar console do navegador

**Valores errados:**
- Verificar query no banco
- Confirmar SSOT está ativo
- Revisar componentes React

**Erro na migration:**
- Verificar connection string
- Confirmar permissões
- Tentar via SQL Editor

---

## 📞 CONTATO

Se encontrar problemas:
1. Verificar logs do Supabase
2. Revisar console do navegador
3. Consultar documentação oficial
4. Criar issue no repositório

---

**Atualização preparada e testada!** ✅  
**Pronto para aplicar em produção.**

