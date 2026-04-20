#!/bin/bash

# Script para descargar el APK de Cocodrilo desde GitHub Actions
# y guardarlo en el escritorio

echo "🐊 Descargando APK de Cocodrilo desde GitHub Actions..."
echo ""

REPO="sebaagradeno-create/automatizame-web-crm"
WORKFLOW="build-apk.yml"
ARTIFACT_NAME="app-debug"
DESKTOP="$HOME/Desktop/Cocodrilo_APK"

# Crear carpeta en escritorio si no existe
mkdir -p "$DESKTOP"
echo "✓ Carpeta creada: $DESKTOP"
echo ""

# Obtener el último run exitoso del workflow
echo "Buscando últimas compilaciones..."
RUN_ID=$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --status completed --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null)

if [ -z "$RUN_ID" ]; then
  echo "❌ Error: No se encontraron compilaciones completadas."
  echo "   Verifica que:"
  echo "   1. El workflow se haya ejecutado (Actions → Build Cocodrilo APK)"
  echo "   2. Esté en estado ✅ completado"
  exit 1
fi

echo "✓ Encontrado run #$RUN_ID"
echo ""

# Descargar el artifact
echo "Descargando artifact..."
cd "$DESKTOP"

if gh run download "$RUN_ID" \
  --repo "$REPO" \
  --name "$ARTIFACT_NAME" \
  --dir "." 2>/dev/null; then

  echo "✓ Artifact descargado"

  # Si está comprimido (zip), descomprimirlo
  if [ -f "app-debug.zip" ]; then
    echo "Descomprimiendo..."
    unzip -q app-debug.zip
    rm app-debug.zip
    echo "✓ Descomprimido"
  fi

  # Renombrar para identificar mejor
  if [ -f "app-debug.apk" ]; then
    mv app-debug.apk "Cocodrilo.apk"
    echo "✓ Renombrado a: Cocodrilo.apk"
  fi

  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "✅ APK DESCARGADO CORRECTAMENTE"
  echo "════════════════════════════════════════════════════════════"
  echo ""
  echo "📍 Ubicación: $DESKTOP/Cocodrilo.apk"
  echo ""
  echo "📤 Para compartir por WhatsApp:"
  echo "   1. Abre Google Drive: https://drive.google.com"
  echo "   2. Nueva carpeta: 'Cocodrilo - Finanzas'"
  echo "   3. Sube el archivo desde: $DESKTOP/Cocodrilo.apk"
  echo "   4. Comparte el link"
  echo ""
  echo "📱 Para instalar en celular:"
  echo "   1. Descargá el APK desde el link"
  echo "   2. Celular: Ajustes → Apps → Permisos"
  echo "   3. Busca el navegador/Files → Instalar apps desconocidas: ON"
  echo "   4. Abre el archivo y toca Instalar"
  echo ""

  # Abrir la carpeta en explorador
  if command -v explorer &> /dev/null; then
    echo "Abriendo carpeta..."
    explorer "$DESKTOP" &
  fi

else
  echo "❌ Error al descargar el artifact."
  echo "   Posibles causas:"
  echo "   1. El run no tiene artifacts (workflow en progreso)"
  echo "   2. El token de GitHub no tiene permisos suficientes"
  echo "   3. El workflow falló"
  exit 1
fi
