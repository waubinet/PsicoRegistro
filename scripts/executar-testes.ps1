# Executa verificação de tipos, lint, testes do frontend e testes do backend.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "== PsicoRegistro: verificação e testes ==" -ForegroundColor Cyan

Write-Host "-> Verificação de tipos (tsc)..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "Falha na verificação de tipos." }

Write-Host "-> Lint (ESLint)..." -ForegroundColor Cyan
npm run lint
if ($LASTEXITCODE -ne 0) { throw "Falha no lint." }

Write-Host "-> Testes do frontend (Vitest)..." -ForegroundColor Cyan
npm run test
if ($LASTEXITCODE -ne 0) { throw "Falha nos testes do frontend." }

Write-Host "-> Testes do backend (cargo test)..." -ForegroundColor Cyan
Push-Location src-tauri
cargo test
$rustExit = $LASTEXITCODE
Pop-Location
if ($rustExit -ne 0) { throw "Falha nos testes do backend." }

Write-Host "Todos os testes passaram." -ForegroundColor Green
