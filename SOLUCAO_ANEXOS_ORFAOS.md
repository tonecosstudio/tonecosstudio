# Solução para Anexos Órfãos

## Problema
Os logs mostram que as imagens antigas não existem no Storage, apenas a metadata está no banco de dados. Isso causa erros 404 ao tentar carregar as imagens.

## Causa
Provavelmente os arquivos foram deletados do Storage manualmente ou houve algum problema no upload original, mas a metadata permaneceu no banco.

## Soluções Implementadas

### 1. Tratamento de Erro Melhorado
Atualizado `ChatInterface.tsx` para:
- Detectar quando uma imagem não pode ser carregada
- Mostrar um placeholder de "Imagem não disponível" em vez de erro
- Permitir download mesmo se a imagem não carregar
- Remover logs de console desnecessários

### 2. Scripts de Verificação e Limpeza

#### Verificar anexos:
```bash
# Ver lista de anexos no banco
psql -f verificar-anexos-orfaos.sql
```

#### Limpar anexos órfãos (OPCIONAL):
```bash
# ATENÇÃO: Deleta TODOS os anexos antigos
psql -f limpar-anexos-orfaos.sql
```

## Opções para Você

### Opção 1: Manter anexos antigos (Recomendado)
- Não fazer nada
- Anexos antigos aparecerão como "Imagem não disponível"
- Novos anexos funcionarão perfeitamente
- Sem erros no console

### Opção 2: Limpar anexos antigos
Se você quiser começar do zero:

```powershell
# Aplicar limpeza
$env:SUPABASE_ACCESS_TOKEN = "sbp_db8908eec06ba647ff9d0092460dba9fc8253b51"
Get-Content limpar-anexos-orfaos.sql | supabase db query
```

## Teste Agora

1. Recarregue a página do chat
2. Anexos antigos devem aparecer como "Imagem não disponível"
3. Envie uma NOVA imagem
4. A nova imagem deve aparecer corretamente
5. Não deve haver erros no console

## Resultado Esperado

✅ Console limpo, sem erros 404
✅ Anexos antigos mostram placeholder
✅ Novos anexos funcionam perfeitamente
✅ Sistema de anexos totalmente funcional

## Arquivos Modificados
- `src/components/admin/ChatInterface.tsx` (tratamento de erro melhorado)
- `verificar-anexos-orfaos.sql` (script de verificação)
- `limpar-anexos-orfaos.sql` (script de limpeza opcional)
