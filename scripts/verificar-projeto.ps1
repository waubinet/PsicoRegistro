# Verifica pré-requisitos do ambiente para desenvolver/compilar o PsicoRegistro.
$ErrorActionPreference = "Continue"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "== PsicoRegistro: verificação do ambiente ==" -ForegroundColor Cyan
$ok = $true

function Check($label, $cond, $hint) {
  if ($cond) { Write-Host "[OK]  $label" -ForegroundColor Green }
  else { Write-Host "[!!]  $label — $hint" -ForegroundColor Yellow; $script:ok = $false }
}

Check "Node.js instalado" (Get-Command node -ErrorAction SilentlyContinue) "Instale Node 18+ (https://nodejs.org)"
Check "npm instalado" (Get-Command npm -ErrorAction SilentlyContinue) "Vem com o Node.js"
Check "Rust/cargo instalado" (Get-Command cargo -ErrorAction SilentlyContinue) "Instale via https://rustup.rs"
Check "node_modules presente" (Test-Path node_modules) "Rode .\scripts\instalar-dependencias.ps1"

# Smart App Control: pode bloquear a compilação de binários nativos locais.
$sac = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy" -ErrorAction SilentlyContinue).VerifiedAndReputablePolicyState
if ($sac -eq 1) {
  Write-Host "[!!]  Smart App Control está ATIVO (enforcement)." -ForegroundColor Yellow
  Write-Host "      Ele pode bloquear a execução de build scripts do cargo (erro 4551)." -ForegroundColor Yellow
  Write-Host "      Se a compilação falhar com 'política de Controle de Aplicativo bloqueou este arquivo'," -ForegroundColor Yellow
  Write-Host "      desative o Smart App Control em: Segurança do Windows > Controle de aplicativos e navegador" -ForegroundColor Yellow
  Write-Host "      > Configurações de proteção baseada em reputação > Smart App Control > Desativado." -ForegroundColor Yellow
} else {
  Write-Host "[OK]  Smart App Control não está em modo de imposição." -ForegroundColor Green
}

if ($ok) { Write-Host "Ambiente pronto." -ForegroundColor Green }
else { Write-Host "Há itens pendentes acima." -ForegroundColor Yellow }
