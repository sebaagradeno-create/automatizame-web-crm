# ============================================
# CLAUDE CODE + OPENROUTER — Automatizame
# ============================================
# Modo Cowork Multi-Agente sin SMS.
# Usamos OpenRouter para tener Claude 3.5 Sonnet
# pagando por uso sin restricciones iniciales.
# ============================================

# Pegá tu API Key de OpenRouter entre las comillas
$OPENROUTER_API_KEY = "sk-or-v1-TU_CLAVE_AQUI"

# Configurar OpenRouter como backend simulando ser Anthropic
$env:ANTHROPIC_BASE_URL = "https://openrouter.ai/api/v1"
$env:ANTHROPIC_API_KEY = $OPENROUTER_API_KEY

# Estos headers extra ayudan a OpenRouter a identificar tu app (opcional pero recomendado)
$env:HTTP_REFERER = "https://agenciamaster.local"
$env:X_TITLE = "Automatizame Cowork"

if (-not ($env:Path -like "*\.local\bin*")) {
    $env:Path += ";C:\Users\usuario\.local\bin"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CLAUDE CODE + OPENROUTER" -ForegroundColor Cyan
Write-Host " Modo Cowork Multi-Agente Activado" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " Pasando restricciones de SMS..." -ForegroundColor Yellow

# Lanzamos Claude Code pidiéndole el modelo Sonnet a través de OpenRouter
claude --model anthropic/claude-3.5-sonnet

Write-Host " Sesión finalizada." -ForegroundColor DarkGray
