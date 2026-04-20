#!/usr/bin/env python3
# fix_preparar_mensaje.py — Corrige Preparar Mensaje para que combine
# datos del SQL RETURNING con los datos originales del payload
import json, urllib.request, sys

JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmN2Q4MjA4YS1jMDFlLTQwZDctODVlYS1lMTI4NjQ3NGM5OTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGFkMTJmMmQtNTk5NC00OTc5LWIzM2QtMWY2NTFhMTdhYTJiIiwiaWF0IjoxNzc2Mjc4MDA5fQ.FBPcUUMZUZyEC0zPRXLBC2m_RojBbRVAsK1wGzYdKFQ'
WF_ID = 'NLaS1UUVXayRfisW'
BASE = 'https://n8n.automatizameuy.com'

NUEVO_PREPARAR_JS = r"""// Combinar datos SQL (id, titulo, es_nueva) con datos originales del item anterior
const sqlData = $input.first().json;

// Recuperar datos completos desde el nodo Limpiar Datos (2 pasos atras)
const limpioData = $('Limpiar Datos').first().json;

// Merge: datos limpios base + resultado SQL encima
const data = { ...limpioData, ...sqlData };

const esNueva = data.es_nueva !== false;
const esDueno = data.es_dueno_directo;
const fotos = JSON.parse(data.imagenes || '[]');
const foto = data.imagen_principal || fotos[0] || '';

const etiqueta = !esNueva ? '♻️ ACTUALIZADA' : (esDueno ? '🔥 DUEÑO DIRECTO' : '🏠 NUEVA PROPIEDAD');

let mensaje = '';
if (foto && foto.startsWith('http')) {
  mensaje += `<a href="${foto}">&#8205;</a>\n`;
}
mensaje += `${etiqueta}\n\n`;
mensaje += `🏷️ <b>${data.titulo || 'Sin título'}</b>\n`;
mensaje += `💰 <b>${data.moneda || 'USD'} ${(data.precio > 0) ? Number(data.precio).toLocaleString('es-UY') : 'Consultar'}</b>\n`;
mensaje += `📍 ${data.barrio || 'Montevideo'}\n`;
if (data.tipo_propiedad) mensaje += `🏘️ ${data.tipo_propiedad}\n`;
if (data.dormitorios) mensaje += `🛏️ ${data.dormitorios} dorm.\n`;
if (data.banios) mensaje += `🚿 ${data.banios} baños\n`;
if (data.superficie_total) mensaje += `📐 ${data.superficie_total} m²\n`;
if (data.es_dueno_directo) mensaje += `✅ Dueño directo\n`;
mensaje += `📸 ${fotos.length} fotos | Fuente: ${data.fuente || 'hunter'}\n`;
mensaje += `──────────────\n`;
if (data.descripcion && data.descripcion.length > 10) {
  mensaje += `📝 ${data.descripcion.substring(0, 200)}...\n`;
  mensaje += `──────────────\n`;
}
const linkLabel = data.fuente === 'infocasas_hunter' ? 'Ver en InfoCasas' : data.fuente === 'gallito_hunter' ? 'Ver en Gallito' : 'Ver en MercadoLibre';
mensaje += `🔗 <a href="${data.url_original}">${linkLabel}</a>`;

return [{ json: { ...data, mensaje_telegram: mensaje, es_nueva: esNueva } }];"""

import subprocess
print('Haciendo backup...')
subprocess.run([
    'ssh', 'root@72.62.13.132',
    f'bash /root/backups/backup_wf.sh {WF_ID} receptor_meli_fix_preparar'
], capture_output=True)

req = urllib.request.Request(f'{BASE}/api/v1/workflows/{WF_ID}')
req.add_header('X-N8N-API-KEY', JWT)
with urllib.request.urlopen(req) as r:
    w = json.loads(r.read())

sys.stdout.reconfigure(encoding='utf-8')
print(f'Workflow: {w["name"]} | {len(w["nodes"])} nodos')

for n in w['nodes']:
    if n['name'] == 'Preparar Mensaje':
        n['parameters']['jsCode'] = NUEVO_PREPARAR_JS
        print('OK Preparar Mensaje actualizado - ahora combina datos SQL + originales')

s = w.get('settings', {})
allowed = ['saveExecutionProgress','saveManualExecutions','saveDataErrorExecution',
           'saveDataSuccessExecution','executionTimeout','timezone','callerPolicy',
           'executionOrder','errorWorkflow']
settings_clean = {k: v for k, v in s.items() if k in allowed}
settings_clean['errorWorkflow'] = 'YXm4qW9YC0wGsboY'

payload = {
    'name': w['name'],
    'nodes': w['nodes'],
    'connections': w['connections'],
    'settings': settings_clean,
    'staticData': None
}

data = json.dumps(payload).encode()
req2 = urllib.request.Request(
    f'{BASE}/api/v1/workflows/{WF_ID}',
    data=data, method='PUT'
)
req2.add_header('Content-Type', 'application/json')
req2.add_header('X-N8N-API-KEY', JWT)
with urllib.request.urlopen(req2) as r:
    resp = json.loads(r.read())
    print(f'Guardado: {resp.get("name")} | nodes: {len(resp.get("nodes",[]))}')
    print('Listo - Telegram mostrara precio, barrio y fuente correctamente')
