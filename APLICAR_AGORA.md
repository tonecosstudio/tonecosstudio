# 🚀 APLICAR AGORA - ÚLTIMO PASSO

**O que falta:** Aplicar `UPDATE_HARDCODED_DEADLINES.sql` no banco

---

## ⚡ AÇÃO RÁPIDA

1. O SQL já está na sua área de transferência ✅
2. O navegador já abriu no SQL Editor ✅
3. **Cole (Ctrl+V) e execute (Run)** ⏳

---

## 📋 O QUE ESTE SQL FAZ

### Cria View Consolidada
```sql
v_system_deadlines
```
Acesso fácil a todos os prazos em uma única query.

### Cria Função Helper
```sql
get_deadline('production_days_min')
```
Busca qualquer prazo de forma simples.

### Atualiza Funções Existentes
- `create_subscription_deliveries()` - Usa prazos dinâmicos
- `cleanup_old_notifications()` - Usa prazos dinâmicos

---

## ✅ APÓS EXECUTAR

Você verá no final:

```
=== VIEW DE PRAZOS CRIADA ===
production_days_min: 30
production_days_max: 30
shipping_business_days: 15
...

=== FUNÇÃO get_deadline() CRIADA ===
prazo: production_days_min
valor: 30

=== RESUMO DAS MUDANÇAS ===
View v_system_deadlines criada
Função get_deadline() criada
...
```

---

## 🎯 RESULTADO FINAL

Após aplicar, você terá:

✅ **Prazos oficiais:** 30 dias produção, 15 dias envio, 90 dias total  
✅ **Single Source of Truth:** `system_settings` como fonte única  
✅ **View consolidada:** `v_system_deadlines`  
✅ **Função helper:** `get_deadline()`  
✅ **Serviço frontend:** `deadlineService.ts`  
✅ **Documentação completa:** 7 arquivos criados  

---

## 📚 DOCUMENTAÇÃO

Leia depois:
- `RESUMO_FINAL_PRAZOS.md` - Resumo completo
- `SINGLE_SOURCE_OF_TRUTH_PRAZOS.md` - Como usar
- `PRAZOS_APLICADOS_SUCESSO.md` - Validação

---

**Cole e execute agora!** 🚀
