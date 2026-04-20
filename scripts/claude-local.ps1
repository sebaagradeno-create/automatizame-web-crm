# ============================================
# CLAUDE CODE + OLLAMA LOCAL — Automatizame
# ============================================
# Ejecutar este script para usar Claude Code
# GRATIS con modelos locales de Ollama.
#
# Uso: .\claude-local.ps1
# ============================================

# Configurar Ollama como backend
$env:ANTHROPIC_BASE_URL = "http://localhost:11434"
$env:ANTHROPIC_AUTH_TOKEN = "ollama"

# Agregar Claude al PATH si no está
if (-not ($env:Path -like "*\.local\bin*")) {
    $env:Path += ";C:\Users\usuario\.local\bin"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CLAUDE CODE + OLLAMA LOCAL" -ForegroundColor Cyan
Write-Host " Modelo: gemma4 (26B) - GRATIS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " Conectado a: http://localhost:11434" -ForegroundColor Yellow
Write-Host " Costo: $0.00" -ForegroundColor Green
Write-Host ""

# Lanzar Claude Code con Gemma 4
claude --model gemma4
