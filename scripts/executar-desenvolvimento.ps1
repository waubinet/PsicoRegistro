# Inicia a aplicação em modo de desenvolvimento (Tauri + Vite).
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "== PsicoRegistro: modo desenvolvimento ==" -ForegroundColor Cyan
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  throw "cargo não encontrado no PATH. Instale o Rust (https://rustup.rs) e reabra o terminal."
}
npm run tauri dev
