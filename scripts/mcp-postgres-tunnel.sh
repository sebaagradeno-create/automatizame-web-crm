#!/bin/bash
# Levanta tunel SSH al postgres de n8n y corre mcp-postgres
# Puerto local 5454 → container postgres en VPS

# Matar tuneles previos en ese puerto
fuser -k 5454/tcp 2>/dev/null || true

# Levantar tunel en background
ssh -f -N -L 5454:localhost:5432 -o StrictHostKeyChecking=no \
    -o ExitOnForwardFailure=yes \
    root@72.62.13.132 \
    -S /tmp/mcp-postgres-tunnel.sock 2>/dev/null

# Esperar que el tunel este listo
sleep 1

# Correr mcp-postgres
exec npx -y mcp-postgres "postgresql://postgres@127.0.0.1:5454/automatizacion1"
