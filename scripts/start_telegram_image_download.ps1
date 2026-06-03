$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $Root "tmp\telegram-downloader\.venv\Scripts\python.exe"
$Downloader = Join-Path $Root "scripts\download_telegram_images.py"
$DefaultOut = Join-Path $env:USERPROFILE "Downloads\telegram-2370335738-images"

if (-not (Test-Path -LiteralPath $Python)) {
  Write-Host "Python virtual environment not found at: $Python" -ForegroundColor Red
  Write-Host "Run from the project root: python -m venv tmp\telegram-downloader\.venv"
  exit 1
}

$ApiId = $env:TELEGRAM_API_ID
if (-not $ApiId) {
  $ApiId = Read-Host "Telegram API ID"
}

$ApiHash = $env:TELEGRAM_API_HASH
if (-not $ApiHash) {
  $SecureApiHash = Read-Host "Telegram API hash" -AsSecureString
  $BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureApiHash)
  try {
    $ApiHash = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($BSTR)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
  }
}

$Phone = $env:TELEGRAM_PHONE
if (-not $Phone) {
  $Phone = Read-Host "Telefone Telegram com DDI, ex: +5511999999999"
}

Write-Host ""
Write-Host "Destino: $DefaultOut"
Write-Host "O Telegram pode pedir codigo enviado no app/SMS e senha 2FA. Digite apenas nesta janela."
Write-Host ""

$PreviousApiId = $env:TELEGRAM_API_ID
$PreviousApiHash = $env:TELEGRAM_API_HASH
$PreviousPhone = $env:TELEGRAM_PHONE

try {
  $env:TELEGRAM_API_ID = $ApiId
  $env:TELEGRAM_API_HASH = $ApiHash
  $env:TELEGRAM_PHONE = $Phone

  & $Python $Downloader `
    --chat "https://t.me/c/2370335738/35546" `
    --out $DefaultOut `
    --progress-every 250
} finally {
  $env:TELEGRAM_API_ID = $PreviousApiId
  $env:TELEGRAM_API_HASH = $PreviousApiHash
  $env:TELEGRAM_PHONE = $PreviousPhone
}

Write-Host ""
Write-Host "Processo encerrado. Arquivos salvos em: $DefaultOut"
Read-Host "Pressione Enter para fechar"
