param(
  [Parameter(Mandatory = $true)]
  [string]$Root,
  [Parameter(Mandatory = $true)]
  [string]$Batch,
  [Parameter(Mandatory = $true)]
  [string]$Output,
  [int]$Columns = 8,
  [int]$ThumbSize = 220
)

$ErrorActionPreference = 'Stop'

$rows = Import-Csv -LiteralPath $Batch
$sources = @($rows | Where-Object { $_.source } | ForEach-Object { $_.source.Trim() } | Where-Object { $_ })
if ($sources.Count -eq 0) {
  throw "No sources found in batch: $Batch"
}

Add-Type -AssemblyName System.Drawing

$labelH = 52
$pad = 12
$sheetRows = [Math]::Ceiling($sources.Count / $Columns)
$sheetW = $Columns * ($ThumbSize + $pad) + $pad
$sheetH = $sheetRows * ($ThumbSize + $labelH + $pad) + $pad
$bitmap = New-Object System.Drawing.Bitmap $sheetW, $sheetH
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::White)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$font = New-Object System.Drawing.Font('Arial', 9)
$brush = [System.Drawing.Brushes]::Black
$statusBrush = [System.Drawing.Brushes]::DimGray
$errorBrush = [System.Drawing.Brushes]::Firebrick
$listLines = New-Object System.Collections.Generic.List[string]

try {
  for ($i = 0; $i -lt $sources.Count; $i++) {
    $source = $sources[$i]
    $path = Join-Path $Root $source
    $col = $i % $Columns
    $row = [Math]::Floor($i / $Columns)
    $x = $pad + $col * ($ThumbSize + $pad)
    $y = $pad + $row * ($ThumbSize + $labelH + $pad)
    $status = 'ok'

    $graphics.DrawRectangle([System.Drawing.Pens]::LightGray, $x, $y, $ThumbSize, $ThumbSize)
    if (-not (Test-Path -LiteralPath $path)) {
      $status = 'missing'
      $graphics.DrawRectangle([System.Drawing.Pens]::Firebrick, $x + 2, $y + 2, $ThumbSize - 4, $ThumbSize - 4)
      $graphics.DrawString('missing', $font, $errorBrush, $x + 10, $y + 10)
    }
    elseif ((Get-Item -LiteralPath $path).Length -le 0) {
      $status = 'empty'
      $graphics.DrawRectangle([System.Drawing.Pens]::Firebrick, $x + 2, $y + 2, $ThumbSize - 4, $ThumbSize - 4)
      $graphics.DrawString('empty', $font, $errorBrush, $x + 10, $y + 10)
    }
    else {
      try {
        $image = [System.Drawing.Image]::FromFile($path)
        try {
          $scale = [Math]::Min($ThumbSize / $image.Width, $ThumbSize / $image.Height)
          $w = [int]($image.Width * $scale)
          $h = [int]($image.Height * $scale)
          $dx = $x + [int](($ThumbSize - $w) / 2)
          $dy = $y + [int](($ThumbSize - $h) / 2)
          $graphics.DrawImage($image, $dx, $dy, $w, $h)
        }
        finally {
          $image.Dispose()
        }
      }
      catch {
        $status = "error:$($_.Exception.GetType().Name)"
        $graphics.DrawRectangle([System.Drawing.Pens]::Firebrick, $x + 2, $y + 2, $ThumbSize - 4, $ThumbSize - 4)
        $graphics.DrawString('error', $font, $errorBrush, $x + 10, $y + 10)
      }
    }

    $label = ('{0}. {1}' -f ($i + 1), $source)
    if ($label.Length -gt 34) {
      $label = $label.Substring(0, 34)
    }
    $graphics.DrawString($label, $font, $brush, $x, $y + $ThumbSize + 4)
    $graphics.DrawString($status, $font, $statusBrush, $x, $y + $ThumbSize + 24)
    $listLines.Add(('{0}`t{1}`t{2}' -f ($i + 1), $status, $path))
  }

  $outputDir = Split-Path -Parent $Output
  if ($outputDir) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
  }
  $bitmap.Save($Output, [System.Drawing.Imaging.ImageFormat]::Jpeg)
}
finally {
  $graphics.Dispose()
  $bitmap.Dispose()
  $font.Dispose()
}

$listOutput = [System.IO.Path]::ChangeExtension($Output, '.txt')
$listLines | Set-Content -LiteralPath $listOutput -Encoding UTF8
[PSCustomObject]@{
  Preview = $Output
  List = $listOutput
  Count = $sources.Count
}
