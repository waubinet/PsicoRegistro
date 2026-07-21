# Gera o instalador do PsicoRegistro para Windows (NSIS .exe e MSI).
#
# Tenta primeiro o build otimizado (release). Se o Smart App Control bloquear
# build scripts de release (erro 4551), faz o fallback para o empacotamento a
# partir do perfil de desenvolvimento (`--debug`), cujos build scripts o Smart
# App Control aceita — gerando um instalador funcional (binário maior, não
# otimizado). Para o instalador otimizado, desative o Smart App Control.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "== PsicoRegistro: geração do instalador ==" -ForegroundColor Cyan
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  throw "cargo não encontrado no PATH. Instale o Rust (https://rustup.rs)."
}

function Show-Bundles($subdir) {
  $bundle = Join-Path (Get-Location) "src-tauri\target\$subdir\bundle"
  Write-Host "Instaladores gerados em:" -ForegroundColor Green
  Get-ChildItem -Recurse -Path $bundle -Include *.exe, *.msi -ErrorAction SilentlyContinue |
    ForEach-Object { Write-Host "  $($_.FullName)" }
}

Write-Host "Tentando build otimizado (release)..." -ForegroundColor Cyan
$out = npm run tauri build 2>&1
$out | Write-Host
if ($LASTEXITCODE -eq 0) {
  Show-Bundles "release"
  return
}

if ($out -match "4551|Controle de Aplicativo|SmartLocker") {
  Write-Warning "Smart App Control bloqueou build scripts de release. Fazendo fallback para --debug."
  npm run tauri build -- --debug
  if ($LASTEXITCODE -ne 0) { throw "Falha ao gerar o instalador (mesmo em --debug)." }
  Show-Bundles "debug"
  Write-Host "Instalador (perfil de desenvolvimento) gerado. Para a versão otimizada, desative o Smart App Control." -ForegroundColor Yellow
} else {
  throw "Falha ao gerar o instalador."
}
