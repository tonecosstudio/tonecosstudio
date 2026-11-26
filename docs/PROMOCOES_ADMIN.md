
# Seleção promocional TONART

Decisão do proprietário de 26/11/2026: substituir integralmente a proposta de OAuth/Drive direto (PR #192, encerrada sem merge) por seleção administrativa persistente. Nenhuma credencial Google é necessária.

- No site comercial, a imagem ativa dos detalhes históricos e galerias Telegram oferece **Adicionar à Black Friday** somente ao administrador autenticado. O download normal é independente.
- Admin → Catálogo → Black Friday (`/admin/blackfriday`) lista imagens, categorias, contagens e direitos; permite remover referências e gerar manifesto JSON atualizado de itens exportáveis. Não altera o catálogo público, direitos, preço, publicação ou arquivos do Drive.
- Worker e D1 existentes são as autoridades. Cada seleção contém campanha, identidade estável, caminho público canônico, tipo e SHA-256 do conteúdo efetivamente servido. Não há cópia da mídia no R2, autorização Google nem segundo catálogo.
- A lista consulta os nomes e categorias atuais. Prévias Telegram sem direitos aprovados podem ser selecionadas para revisão administrativa, mas ficam retidas para exportação; direitos rejeitados ou mídia indisponível não são liberados. Não elevar direitos automaticamente.
- GPT + OrdaX MCP usa manifesto recém-exportado pelo administrador (não tokens, banco direto nem GitHub como banco). Valida novamente visibilidade, vínculo da imagem à ficha, conteúdo e SHA-256 através do site normal antes de gravar na pasta Blackfriday. Deduplica pelo hash, organiza em categorias planas e recalcula títulos pelo inventário real. A exportação não implica exclusão de arquivos anteriormente copiados.
- A migração independente `0054_promotion_image_selections.sql` cria exclusivamente a tabela de seleções. Não aplicar a fila editorial 0034–0053 nem executar Wrangler manual. Integrar por Quality Gate e autorização de schema estritamente delimitada, preservando o publicador único; não declarar produção pronta sem testes, schema, Worker e frontend reais.


## Sincronizar no computador autorizado

Exportar a lista atual pelo admin quando o computador estiver acessível. O manifesto expira operacionalmente em 30 minutos, portanto exportar novamente se necessário. Usar o script canônico, primeiro em simulação e depois com `--apply`:

```powershell
python scripts/catalog/sync_promotion_drive.py <manifesto.json> --root "G:\Meu Drive\Blackfriday"
python scripts/catalog/sync_promotion_drive.py <manifesto.json> --root "G:\Meu Drive\Blackfriday" --apply
```

O script só lê a origem pública oficial, revalida o vínculo à galeria, a categoria e o nome, confirma SHA-256 antes da cópia, deduplica arquivos já existentes e reconcilia a contagem real. Não extrai JWT nem remove imagens do Drive. Um manifesto antigo, mídia alterada ou conflito interrompe a execução antes da cópia. A eventual sincronização remota do cliente Google Drive deve ser confirmada separadamente.

## Liberação canônica da infraestrutura

O Quality Gate existente possui a operação manual `promotion-schema`, com confirmação de escopo `GO-PROMOTION-SELECTION-0054-ONLY`. Ela usa a mesma trava de escritor de produção, valida o histórico 0001–0033 e os publicadores aposentados, prepara um diretório contendo exclusivamente 0054, captura o bookmark, aplica a migração e confere o ledger exato e a tabela física. As migrações editoriais 0034–0053 permanecem de fora; o antigo gate M5 não muda. A publicação rotineira do Worker exige a prova da tabela antes do upload.
