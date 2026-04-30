#!/bin/bash

# Script para adicionar lazy loading em imagens que ainda não têm

echo "Adicionando lazy loading em imagens..."

# Lista de arquivos para processar
files=(
  "src/pages/CollectionsShowcase.tsx"
  "src/pages/CollectionsArcade.tsx"
  "src/pages/CollectionDetailsArcade.tsx"
  "src/pages/CharacterSelect.tsx"
  "src/pages/CatalogArcade.tsx"
  "src/pages/BuyCharacter.tsx"
  "src/pages/character-catalog/CharacterCard.tsx"
  "src/pages/catalog/ModelDetails.tsx"
  "src/pages/admin/collections/AdminCollections.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processando: $file"
    # Adiciona loading="lazy" decoding="async" antes do fechamento da tag img
    # que ainda não tem loading
    sed -i 's/<img\([^>]*\)\/>/\n<img\1 loading="lazy" decoding="async" \/>/g' "$file"
  fi
done

echo "Concluído!"
