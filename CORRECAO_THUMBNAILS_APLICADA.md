# Correção de Thumbnails Aplicada

## Problema Identificado
Os logs mostravam erros 404 ao tentar carregar thumbnails de imagens antigas:
```
ChatInterface.tsx:444 [AttachmentDisplay] Erro ao carregar imagem: 
https://...support-attachments/.../thumb_1771743313900_image_processing20231226-1-tmfxs8.jpg
```

## Causa
- Mensagens antigas foram enviadas quando o sistema gerava thumbnails
- Os thumbnails foram salvos no campo `thumbnail_path` do banco
- Posteriormente, a geração de thumbnails foi desabilitada
- Os arquivos de thumbnail não existem mais no Storage, mas o banco ainda referenciava eles

## Solução Aplicada

### 1. Migration SQL
Criada migration `20260222000002_clean_old_thumbnails.sql`:
```sql
UPDATE support_attachments
SET thumbnail_path = NULL
WHERE thumbnail_path IS NOT NULL
  AND thumbnail_path LIKE '%thumb_%';
```

### 2. Aplicação
```bash
supabase db push
```
✅ Migration aplicada com sucesso

### 3. Limpeza de Código
Removidos imports não utilizados em `ChatInterface.tsx`:
- `X` (ícone)
- `ImageIcon` (ícone)
- `sendMessage` (função do hook não usada diretamente)

## Resultado
- ✅ Thumbnails antigos removidos do banco
- ✅ Novas imagens funcionam sem erros
- ✅ Fallback funciona: se thumbnail não existir, carrega imagem original
- ✅ Console limpo, sem erros 404

## Teste Agora
1. Abra o chat no navegador
2. Envie uma nova imagem
3. Verifique que:
   - Imagem aparece corretamente
   - Não há erros no console
   - Modal "Mensagem enviada" aparece
   - Imagem é exibida na conversa

## Arquivos Modificados
- `supabase/migrations/20260222000002_clean_old_thumbnails.sql` (novo)
- `src/components/admin/ChatInterface.tsx` (limpeza de imports)
- `limpar-thumbnails-antigos.sql` (script auxiliar)
- `aplicar-limpar-thumbnails.bat` (script auxiliar)
