# Builds build\BitheismPong-itch.zip for uploading to itch.io.
# - index.html at the zip root, folder paths with forward slashes (itch unpacks on Linux)
# - the settings panel (C key) is switched off in the zipped copy only; your local files keep it on
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$root = $PSScriptRoot
$zipPath = Join-Path $root 'build\BitheismPong-itch.zip'
$files = @('index.html', 'style.css', 'sketch.js', 'ball.js', 'paddle.js', 'button.js', 'crt.js', 'music.js',
           'Font\Decaydence.otf', 'Sounds\BallHit.wav')

$panelSrc = [System.IO.File]::ReadAllText((Join-Path $root 'crt-panel.js'))
$panelRelease = $panelSrc.Replace('const CRT_PANEL_ENABLED = true;', 'const CRT_PANEL_ENABLED = false;')
if ($panelRelease -eq $panelSrc) { throw 'Could not find "const CRT_PANEL_ENABLED = true;" in crt-panel.js' }

New-Item -ItemType Directory -Force -Path (Split-Path $zipPath) | Out-Null
if (Test-Path $zipPath) { Remove-Item $zipPath -Confirm:$false }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
  foreach ($f in $files) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $root $f), ($f -replace '\\', '/'), 'Optimal') | Out-Null
  }
  $entry = $zip.CreateEntry('crt-panel.js', 'Optimal')
  $writer = New-Object System.IO.StreamWriter($entry.Open(), (New-Object System.Text.UTF8Encoding($false)))
  $writer.Write($panelRelease)
  $writer.Dispose()
} finally {
  $zip.Dispose()
}

Write-Host "Built $zipPath ($((Get-Item $zipPath).Length) bytes)"
