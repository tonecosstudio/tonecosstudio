
# Seleção promocional TONART

Decisão do proprietário de 26/11/2026: substituir integralmente a proposta de OAuth/Drive direto (PR #192, encerrada sem merge) por seleção administrativa persistente. Nenhuma credencial Google é necessária.

- No site comercial, a imagem ativa dos detalhes históricos e galerias Telegram oferece **Adicionar à Black Friday** somente ao administrador autenticado. O download normal é independente.
- Admin → Catálogo → Black Friday (`/admin/blackfriday`) lista imagens, categorias, contagens e direitos; permite remover referências e gerar manifesto JSON atualizado de itens exportáveis. Não altera o catálogo público, direitos, preço, publicação ou arquivos do Drive.
- Worker e D1 existentes são as autoridades. Cada seleção contém campanha, identidade estável, caminho público canônico, tipo e SHA-256 do conteúdo efetivamente servido. Não há cópia da mídia no R2, autorização Google nem segundo catálogo.
- A lista consulta os nomes e categorias atuais. Prévias Telegram sem direitos aprovados podem ser selecionadas para revisão administrativa, mas ficam retidas para exportação; direitos rejeitados ou mídia indisponível não são liberados. Não elevar direitos automaticamente.
- GPT + OrdaX MCP usa manifesto recém-exportado pelo administrador (não tokens, banco direto nem GitHub como banco). Valida novamente visibilidade, vínculo da imagem à ficha, conteúdo e SHA-256 através do site normal antes de gravar na pasta Blackfriday. Deduplica pelo hash, organiza em categorias planas e recalcula títulos pelo inventário real. A exportação não implica exclusão de arquivos anteriormente copiados.
- A migração independente `0054_promotion_image_selections.sql` cria exclusivamente a tabela de seleções. Não aplicar a fila editorial 0034–0053 nem executar Wrangler manual. Integrar por Quality Gate e autorização de schema estritamente delimitada, preservando o publicador único; não declarar produção pronta sem testes, schema, Worker e frontend reais.

