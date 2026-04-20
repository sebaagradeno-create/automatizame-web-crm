# crear_tareas_windows.ps1
# Crea tareas programadas para el Hunter Local de MercadoLibre
# Ejecutar como Administrador: powershell -ExecutionPolicy Bypass -File crear_tareas_windows.ps1

$nodeExe   = (Get-Command node -ErrorAction SilentlyContinue).Source
$scriptDir = "d:\AGENCIA MASTER\automatizame\scripts"
$script    = "$scriptDir\hunter_local.js"
$logDir    = "$scriptDir\logs"

if (-not $nodeExe) {
    Write-Host "ERROR: Node.js no encontrado en PATH" -ForegroundColor Red
    exit 1
}

# Crear carpeta de logs
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# Funcion para crear tarea
function CrearTarea {
    param($nombre, $hora, $operacion, $categoria)

    $logFile = "$logDir\hunter_${operacion}_${hora.Replace(':','')}.log"
    $accion = New-ScheduledTaskAction `
        -Execute $nodeExe `
        -Argument "`"$script`" $operacion $categoria" `
        -WorkingDirectory $scriptDir

    $trigger = New-ScheduledTaskTrigger -Daily -At $hora

    $settings = New-ScheduledTaskSettingsSet `
        -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
        -RestartCount 1 `
        -RestartInterval (New-TimeSpan -Minutes 10) `
        -StartWhenAvailable

    # Redirigir output a log (wrapper bat)
    $batFile = "$scriptDir\logs\run_${operacion}_${hora.Replace(':','')}.bat"
    @"
@echo off
cd /d "$scriptDir"
node "$script" $operacion $categoria >> "$logFile" 2>&1
"@ | Set-Content $batFile -Encoding UTF8

    $accion2 = New-ScheduledTaskAction `
        -Execute "cmd.exe" `
        -Argument "/c `"$batFile`"" `
        -WorkingDirectory $scriptDir

    # Registrar tarea
    $existing = Get-ScheduledTask -TaskName $nombre -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $nombre -Confirm:$false
        Write-Host "  Tarea anterior eliminada: $nombre" -ForegroundColor Yellow
    }

    Register-ScheduledTask `
        -TaskName $nombre `
        -Action $accion2 `
        -Trigger $trigger `
        -Settings $settings `
        -Description "Hunter MeLi automatico - $operacion $categoria" `
        -RunLevel Highest `
        -Force | Out-Null

    Write-Host "  ✅ Creada: $nombre | $hora hs | node hunter_local.js $operacion $categoria" -ForegroundColor Green
}

Write-Host "`n🏹 CONFIGURANDO HUNTER AUTOMÁTICO - MERCADOLIBRE UY" -ForegroundColor Cyan
Write-Host "   Node.js: $nodeExe" -ForegroundColor Gray
Write-Host "   Script:  $script`n" -ForegroundColor Gray

# Tareas de ALQUILERES
CrearTarea "Hunter_MeLi_Alquileres_9am"  "09:00" "alquiler" "todas"
CrearTarea "Hunter_MeLi_Alquileres_22pm" "22:00" "alquiler" "todas"

# Tareas de VENTAS
CrearTarea "Hunter_MeLi_Ventas_9am"  "09:15" "venta" "todas"
CrearTarea "Hunter_MeLi_Ventas_22pm" "22:15" "venta" "todas"

Write-Host "`n📋 TAREAS REGISTRADAS:" -ForegroundColor Cyan
Get-ScheduledTask | Where-Object { $_.TaskName -like "Hunter_MeLi*" } |
    Select-Object TaskName, State | Format-Table -AutoSize

Write-Host "`n✅ Listo. El hunter correrá automáticamente:" -ForegroundColor Green
Write-Host "   - 09:00 hs → Alquileres (todas las categorías)" -ForegroundColor White
Write-Host "   - 09:15 hs → Ventas (todas las categorías)" -ForegroundColor White
Write-Host "   - 22:00 hs → Alquileres (todas las categorías)" -ForegroundColor White
Write-Host "   - 22:15 hs → Ventas (todas las categorías)" -ForegroundColor White
Write-Host "`n   Logs en: $logDir" -ForegroundColor Gray
Write-Host "`n   Para probar ahora: node `"$script`" alquiler todas" -ForegroundColor Yellow
