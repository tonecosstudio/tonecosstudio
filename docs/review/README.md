# Fila derivada de revisão de identidade

`character-catalog-review-queue.csv` é uma fotografia regenerável de modelos do contrato candidato da PR #26 e do gateway público canônico, reconciliada por ID em 17/11/2026. Não é catálogo da aplicação, fonte de verdade editorial nem mecanismo de publicação.

Todas as linhas começam com identidade `pending_evidence` e biografia `not_started_identity_unverified`. Título, franquia ou caminho de pasta não comprovam personagem. Não preencha decisões aprovadas nesta planilha: vínculos e texto revisados pertencem à curadoria privada existente e só podem chegar à leitura pública por uma projeção canônica autorizada.

Os campos de evidência, resumo, biografia original, fontes, idade contextual, revisor e data estão vazios para revisão futura. Idade só deve ser registrada com arco/versão e fonte confirmados. Não copiar wikis nem transformar uma sugestão de nome em vínculo aprovado.

Para regenerar, forneça o arquivo do contrato candidato desejado:

```powershell
node scripts/catalog/character-catalog-inventory.mjs --format csv --candidate-contract <arquivo-do-contrato> --output docs/review/character-catalog-review-queue.csv
```
