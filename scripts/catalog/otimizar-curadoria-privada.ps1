param(
  [ValidateRange(1,100000)][int]$Limit=85
)
$utf8 = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8
$ErrorActionPreference = 'Stop'
$Here=Split-Path -Parent $MyInvocation.MyCommand.Path
$Root=Join-Path $env:USERPROFILE 'Downloads\telegram-2370335738-images'
$Output=Join-Path $env:USERPROFILE 'Documents\TONART-Telegram-Import\otimizacao-privada'
$Manifest=Join-Path $Output 'entrada-curadoria.jsonl'
$Webp=Join-Path $Output 'webp'
$Prep=Join-Path $Here 'preparar-webp-curadoria-privada.py'
$Converter=Join-Path $Here 'build-telegram-webp-final.mjs'
$Audit=Join-Path $Here 'verificar-webp-curadoria-privada.py'
$Python='python'
& $Python $Prep --limit $Limit --root $Root --manifest $Manifest
if($LASTEXITCODE -ne 0){throw 'Falha ao preparar manifesto privado'}
& node $Converter --root $Root --output $Webp --manifest $Manifest --private-curadoria --limit $Limit --checkpoint-size 25
if($LASTEXITCODE -ne 0){throw 'Falha no conversor WebP existente'}
& $Python $Audit --root $Root --output $Webp
if($LASTEXITCODE -ne 0){throw 'Falha de integridade, nao publicar'}
Write-Host 'TONART: otimização privada concluída. Nenhum upload/publicação realizado.'
