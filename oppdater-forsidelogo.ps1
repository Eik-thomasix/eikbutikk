$ErrorActionPreference = 'Stop'

$path = 'src/app/page.tsx'

if (-not (Test-Path -LiteralPath $path)) {
  throw "Fant ikke $path. Kjor scriptet fra prosjektroten."
}

$content = Get-Content -LiteralPath $path -Raw -Encoding UTF8
$original = $content

$oldCount = ([regex]::Matches($content, [regex]::Escape('/EIKLOGO.png'))).Count
if ($oldCount -ne 4) {
  throw "Forventet 4 forekomster av /EIKLOGO.png, men fant $oldCount. Ingen endringer er lagret."
}

$content = $content.Replace('/EIKLOGO.png', '/tilbudsbodenlogo.svg')
$content = $content.Replace('alt="Eiksenteret Sortland Logo"', 'alt="Tilbudsboden.no - fra Eiksenteret Sortland"')
$content = $content.Replace('alt="Eiksenteret Logo"', 'alt="Tilbudsboden.no - fra Eiksenteret Sortland"')

if ($content -eq $original) {
  throw 'Ingen endringer ble gjort.'
}

Set-Content -LiteralPath $path -Value $content -Encoding UTF8 -NoNewline

Write-Host 'Forsidelogoen er oppdatert.'
Write-Host 'Alle 4 forekomster peker na til /tilbudsbodenlogo.svg.'
Write-Host 'Kjor npm run build som neste steg.'
