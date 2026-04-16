@echo off
cd /d "d:\AGENCIA MASTER\automatizame\scripts"
node "hunter_infocasas.js" venta todas >> "d:\AGENCIA MASTER\automatizame\scripts\logs\infocasas_venta_930am.log" 2>&1
