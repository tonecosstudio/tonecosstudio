# ⚡ Início Rápido - Sistema de Créditos

## 🎯 3 Comandos para Ativar

```powershell
# 1. Aplicar migration
.\aplicar-migration-creditos.ps1

# 2. Regenerar tipos
npm run generate-types

# 3. Reiniciar servidor
# Ctrl+C e depois npm run dev
```

## ✅ Verificar

1. **Admin:** http://localhost:5173/admin/creditos/dashboard
2. **Usuário:** http://localhost:5173/painel-creditos
3. **Sidebar:** Deve mostrar "Sistema de Créditos"

## 📝 Primeiros Passos

### 1. Criar Personagens (Admin)
- Acesse `/admin/creditos/personagens`
- Clique "Criar Personagem"
- Preencha nome, preço em créditos, etc.

### 2. Criar Ciclo (Admin)
- Acesse `/admin/creditos/ciclos`
- Clique "Criar Ciclo"
- Defina capacidade e data de fechamento

### 3. Testar (Usuário)
- Acesse `/painel-creditos`
- Veja planos disponíveis
- Acesse `/catalogo-personagens`
- Veja personagens criados

## 🐛 Problemas?

### Erro: "Supabase CLI não encontrado"
```powershell
npm install -g supabase
```

### Erro: "Não está logado"
```powershell
supabase login
```

### Erro: "Projeto não está linkado"
```powershell
supabase link --project-ref SEU_PROJECT_REF
```

### Páginas não aparecem
- Limpe cache: Ctrl+Shift+R
- Verifique se servidor foi reiniciado

## 📚 Documentação Completa

- **README_ATIVACAO_SISTEMA_CREDITOS.md** - Guia completo
- **STATUS_SISTEMA_CREDITOS.md** - Status da implementação
- **SISTEMA_CREDITOS_INSTRUCOES.md** - Instruções detalhadas

## 🎉 Pronto!

Sistema 100% implementado e pronto para uso.

Execute os 3 comandos acima e comece a usar! 🚀
