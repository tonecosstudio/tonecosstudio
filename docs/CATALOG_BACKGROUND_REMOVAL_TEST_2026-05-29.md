# Catalog Background Removal Test - 2026-05-29

## Resultado

Foram testadas duas abordagens para remover fundos de modelos importados do Drive.

## Abordagem 1: algoritmo local simples

Script:

```powershell
node tmp/remove-staging-backgrounds-test.mjs
```

Resultado: inadequado para lote. O algoritmo remove o fundo conectado pelas bordas, mas tambem apaga partes escuras dos personagens e deixa muitos artefatos em imagens com logos/caixas.

Artefatos:

- `tmp/background-removal-test/background-removal-test-contact-sheet.webp`
- `tmp/background-removal-test/background-removal-test-report.json`

## Abordagem 2: segmentacao IMG.LY

Script:

```powershell
node tmp/bgremove/remove-with-imgly.mjs
```

Resultado: muito melhor para teste de curadoria. Preservou personagem/base nos 4 modelos testados:

- `Dante`
- `Frieren`
- `Kyojuro Rengoku`
- `Ranger Verde`

As imagens transparentes foram salvas no bucket `models` em:

```text
catalog-staging-bg-removed/imgly-test/
```

Artefatos:

- `tmp/background-removal-imgly-test/background-removal-imgly-contact-sheet.webp`
- `tmp/background-removal-imgly-test/background-removal-imgly-report.json`

## Aplicacao no staging

As thumbnails dos 4 modelos staging foram atualizadas para usar os PNGs transparentes, mantendo:

- `is_active = false`
- arquivo principal/original em `image_path`
- URLs antigas registradas em relatorio para reversao

Script aplicado:

```powershell
node tmp/apply-bgremoved-preview-thumbnails.mjs
```

Relatorio:

```text
tmp/background-removal-imgly-test/bgremoved-preview-apply-report.json
```

## Reversao

Para restaurar as thumbnails anteriores e remover as tags de teste:

```powershell
node tmp/revert-bgremoved-preview-thumbnails.mjs
```

## Observacao de licenca

`@imgly/background-removal-node` foi instalado apenas em `tmp/bgremove` para teste. Antes de transformar isso em fluxo definitivo de producao, validar licenca/uso comercial e decidir se o modelo ficara hospedado localmente no projeto ou em infraestrutura propria.
