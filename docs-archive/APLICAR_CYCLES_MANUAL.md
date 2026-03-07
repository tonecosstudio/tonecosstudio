# Como Aplicar a Correção de Ciclos

## Problema
A tabela `cycles` está usando sistema quinzenal (2 ciclos por mês, ~37 dias total).
Precisa usar os prazos oficiais: 90 dias (3 meses).

## Solução
Aplicar o SQL `FIX_CYCLES_PRAZOS_OFICIAIS.sql` no Supabase SQL Editor.

## Passos

1. Acesse o Supabase Dashboard:
   https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud

2. Vá em: SQL Editor

3. Copie TODO o conteúdo do arquivo `FIX_CYCLES_PRAZOS_OFICIAIS.sql`

4. Cole no SQL Editor

5. Clique em "Run"

6. Verifique o resultado na aba "Results"

## O que o SQL faz

1. Remove todos os ciclos antigos (sistema quinzenal)
2. Remove a coluna `cycle_number` (não é mais necessária)
3. Cria 10 ciclos mensais (março a dezembro 2026)
4. Cada ciclo segue o fluxo oficial:
   - Vendas: 30 dias (mês completo)
   - Produção: 30 dias (mês seguinte)
   - Envio: 5º dia útil da 2ª quinzena do 3º mês

## Exemplo de Resultado

```
Março/2026:
  Vendas: 01/03/2026 - 31/03/2026
  Produção: 01/04/2026 - 30/04/2026
  Envio: ~21/05/2026

Abril/2026:
  Vendas: 01/04/2026 - 30/04/2026
  Produção: 01/05/2026 - 31/05/2026
  Envio: ~20/06/2026
```

## Após Aplicar

Recarregue a página `/admin/ciclos` para ver os ciclos corretos.
