# tunnel-postgres.ps1
# Tunel SSH: localhost:5454 (PC) -> localhost:5454 (VPS) -> postgres n8n container
# Uso: .\scripts\tunnel-postgres.ps1

$existing = Get-NetTCPConnection -LocalPort 5454 -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Tunel ya activo en puerto 5454" -ForegroundColor Green
    exit 0
}

Write-Host "Levantando tunel SSH postgres n8n..." -ForegroundColor Yellow
Write-Host "localhost:5454 -> VPS:5454 -> postgres container" -ForegroundColor Cyan
Write-Host "Deja esta ventana abierta mientras uses Claude MCP."
Write-Host "Ctrl+C para cerrar."
Write-Host ""

ssh -N -L 5454:127.0.0.1:5454 root@72.62.13.132
