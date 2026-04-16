@echo off
cd /d "d:\AGENCIA MASTER\automatizame\scripts"
"C:\Program Files\nodejs\node.exe" hunter_local.js venta todas >> "d:\AGENCIA MASTER\automatizame\scripts\logs\venta_22pm.log" 2>&1
