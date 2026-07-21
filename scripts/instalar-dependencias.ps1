# Instala as dependências do projeto PsicoRegistro.
# Execute a partir da raiz do projeto: .\scripts\instalar-dependencias.ps1
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "== PsicoRegistro: instalação de dependências ==" -ForegroundColor Cyan

function Test-Cmd($name) { $null -ne (Get-Command $name -ErrorAction SilentlyContinue) }

if (-not (Test-Cmd node)) { throw "Node.js não encontrado. Instale o Node 18+ (https://nodejs.org)." }
Write-Host "Node: $(node --version)"

if (-not (Test-Cmd cargo)) {
  Write-Warning "Rust/cargo não encontrado no PATH. Instale via https://rustup.rs e reabra o terminal."
} else {
  Write-Host "Cargo: $(cargo --version)"
}

Write-Host "Instalando dependências npm..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install falhou." }

Write-Host "Baixando dependências Rust (cargo fetch)..." -ForegroundColor Cyan
Push-Location src-tauri
cargo fetch
Pop-Location

Write-Host "Dependências instaladas com sucesso." -ForegroundColor Green
Write-Host "IMPORTANTE: para compilar o backend nativo é necessário o 'Desktop development with C++' (VS Build Tools) e o WebView2 Runtime (já presente no Windows 11)." -ForegroundColor Yellow
