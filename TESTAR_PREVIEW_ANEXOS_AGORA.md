# 🧪 Testar Preview de Anexos - AGORA

## ⚡ TESTE RÁPIDO (2 minutos)

### 1. Abrir Chat
```bash
1. Fazer login como cliente
2. Clicar no botão flutuante de chat (canto inferior direito)
3. Modal deve abrir
```

### 2. Testar Preview de Imagem
```bash
1. Clicar no botão de anexo (📎)
2. Selecionar uma imagem (JPEG ou PNG)
3. ✅ VERIFICAR: Preview aparece ACIMA do textarea
4. ✅ VERIFICAR: Não há sobreposição
5. ✅ VERIFICAR: Thumbnail 80x80 pixels
6. Passar mouse sobre thumbnail
7. ✅ VERIFICAR: Botão X aparece
```

### 3. Testar Preview de PDF
```bash
1. Clicar no botão de anexo
2. Selecionar um PDF
3. ✅ VERIFICAR: Card aparece ACIMA do textarea
4. ✅ VERIFICAR: Nome do arquivo visível
5. ✅ VERIFICAR: Botão X ao lado
```

### 4. Testar Múltiplos Arquivos
```bash
1. Selecionar 2 imagens
2. ✅ VERIFICAR: Ambas aparecem em linha
3. ✅ VERIFICAR: Não há sobreposição
4. ✅ VERIFICAR: Contador mostra "2 arquivo(s)"
```

---

## 🎯 O QUE DEVE APARECER

### Layout Correto:
```
┌─────────────────────────────────────────┐
│ Chat de Suporte                    [X]  │
├─────────────────────────────────────────┤
│                                         │
│ [Mensagens do chat aqui]               │
│                                         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 📷 [img] 📷 [img] 📄 [pdf]          │ │ ← Preview AQUI
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Digite sua mensagem...              │ │ ← Textarea AQUI
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 0/2000 • 3 arquivo(s)                  │
└─────────────────────────────────────────┘
```

---

## ❌ O QUE NÃO DEVE ACONTECER

### Layout Errado (Bug):
```
┌─────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐ │
│ │ Digite sua mensagem...              │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ 📷 [img] ← SOBREPOSTO! ❌               │
└─────────────────────────────────────────┘
```

---

## 🔍 SE O BUG AINDA EXISTIR

### Passo 1: Limpar Cache
```bash
1. Pressionar Ctrl+Shift+R (Windows/Linux)
2. Ou Cmd+Shift+R (Mac)
3. Isso força reload sem cache
```

### Passo 2: Verificar Console
```bash
1. Pressionar F12
2. Ir para aba "Console"
3. Verificar se há erros
4. Tirar screenshot e enviar
```

### Passo 3: Verificar Código
```bash
1. Abrir src/components/customer/CustomerMessageInput.tsx
2. Verificar linha 95-130 (return statement)
3. Verificar se estrutura está assim:

return (
  <div className="p-4 space-y-3 border-t bg-background">
    {/* Preview PRIMEIRO */}
    {selectedFiles.length > 0 && (
      <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-md">
        ...
      </div>
    )}
    
    {/* Input SEGUNDO */}
    <div className="flex gap-2">
      <Textarea ... />
      ...
    </div>
    
    {/* Contador TERCEIRO */}
    <div className="flex justify-between text-xs">
      ...
    </div>
  </div>
);
```

---

## 📸 TIRAR SCREENSHOTS

Se o bug ainda existir, tirar screenshots de:

1. **Layout completo** - Mostrando preview e input
2. **Console do navegador** - F12 → Console
3. **Código do arquivo** - CustomerMessageInput.tsx linhas 95-130

---

## ✅ CHECKLIST DE VERIFICAÇÃO

- [ ] Preview aparece ACIMA do textarea
- [ ] Não há sobreposição
- [ ] Thumbnails de imagens aparecem corretamente
- [ ] Cards de PDF aparecem corretamente
- [ ] Botão X funciona para remover arquivos
- [ ] Contador atualiza corretamente
- [ ] Envio funciona normalmente
- [ ] Arquivos aparecem no chat após envio

---

## 🎉 SE TUDO FUNCIONAR

**Parabéns!** O bug foi corrigido com sucesso! ✅

O sistema de anexos está agora 100% funcional:
- ✅ Preview correto
- ✅ Upload funcional
- ✅ Validação completa
- ✅ Feedback visual
- ✅ Paridade admin/cliente

---

## 📞 PRÓXIMOS PASSOS

Se tudo estiver funcionando:

1. ✅ Marcar bug como resolvido
2. ✅ Testar em diferentes navegadores
3. ✅ Testar com diferentes tipos de arquivo
4. ✅ Testar com múltiplos arquivos
5. ✅ Fazer deploy para produção

**Sistema pronto para uso!** 🚀
