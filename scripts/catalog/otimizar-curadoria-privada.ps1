param(
  [ValidateRange(1,1000000)][int]$Limit = 100000,
  [switch]$RetryFailed
)
$utf8 = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8
$ErrorActionPreference = 'Stop'
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Join-Path $env:USERPROFILE 'Downloads\telegram-2370335738-images'
$Output = Join-Path $env:USERPROFILE 'Documents\TONART-Telegram-Import\otimizacao-privada'
$Manifest = Join-Path $Output 'entrada-curadoria.jsonl'
$Webp = Join-Path $Output 'webp'
$Prep = Join-Path $Here 'preparar-webp-curadoria-privada.py'
$Converter = Join-Path $Here 'build-telegram-webp-final.mjs'
$Audit = Join-Path $Here 'verificar-webp-curadoria-privada.py'
& python $Prep --limit $Limit --root $Root --manifest $Manifest
if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar manifesto privado' }
$Args = @($Converter, '--root', $Root, '--output', $Webp, '--manifest', $Manifest,
  '--private-curadoria', '--limit', $Limit, '--checkpoint-size', '100')
if ($RetryFailed) { $Args += '--retry-failed' }
& node @Args
$ConverterStatus = $LASTEXITCODE
$Report = Join-Path $Webp 'manifests\runs\auditoria-estudios-final.json'
& python $Audit --root $Root --output $Webp --report $Report
$AuditStatus = $LASTEXITCODE
if ($ConverterStatus -ne 0 -or $AuditStatus -ne 0) {
  throw "WebP com pendencias objetivas. Conversor=$ConverterStatus Auditoria=$AuditStatus. Consulte os manifestos."
}
Write-Host 'TONART: todos os WebP privados de estúdios auditados. Sem upload/publicação.'
