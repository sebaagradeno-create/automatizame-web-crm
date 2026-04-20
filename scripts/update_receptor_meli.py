#!/usr/bin/env python3
# update_receptor_meli.py — Mejora el receptor de MeLi hunter en n8n
# Agrega: deduplicacion, foto real en Telegram, campos completos
import json, urllib.request, urllib.error, os

JWT = os.environ.get('N8N_API_KEY', '')
WF_ID = 'NLaS1UUVXayRfisW'

NUEVO_LIMPIAR_JS = r"""const items = $input.all();
const results = [];

for (const inputData of items) {
  const data = inputData.json.body || inputData.json;
  const properties = Array.isArray(data) ? data : [data];

  for (const item of properties) {
    // Parsear imagenes si viene como string JSON
    let fotos = [];
    try {
      fotos = typeof item.imagenes === 'string' ? JSON.parse(item.imagenes) : (item.imagenes || []);
    } catch(e) { fotos = []; }

    const imagen_principal = item.imagen_principal || fotos[0] || '';

    results.push({
      json: {
        titulo:          (item.titulo || 'Sin título').substring(0, 490),
        precio:          parseFloat(item.precio) || 0,
        moneda:          item.moneda || 'USD',
        url_original:    item.link || item.url_original || '',
        barrio:          (item.barrio || 'Montevideo').substring(0, 190),
        imagen_principal: imagen_principal,
        imagenes:        JSON.stringify(fotos),
        descripcion:     (item.descripcion || '').substring(0, 2000),
        tipo_operacion:  item.tipo_operacion || 'alquiler',
        tipo_propiedad:  item.tipo_propiedad || null,
        dormitorios:     item.dormitorios || null,
        banios:          item.banios || null,
        superficie_total: item.superficie_total || null,
        es_dueno_directo: item.es_dueno_directo === true,
        fuente:          'meli_hunter_local',
        num_fotos:       fotos.length
      }
    });
  }
}

return results;"""

NUEVO_SQL = """INSERT INTO propiedades_inmobiliaria
  (titulo, precio, moneda, url_original, barrio, imagen_principal, imagenes,
   descripcion, tipo_operacion, tipo_propiedad, dormitorios, banios,
   superficie_total, es_dueno_directo, fuente)
VALUES (
  '{{ $json.titulo.replace(/'/g, \"''\") }}',
  {{ $json.precio }},
  '{{ $json.moneda }}',
  '{{ $json.url_original }}',
  '{{ $json.barrio.replace(/'/g, \"''\") }}',
  '{{ $json.imagen_principal }}',
  '{{ $json.imagenes }}'::jsonb,
  '{{ $json.descripcion.replace(/'/g, \"''\") }}',
  '{{ $json.tipo_operacion }}',
  {{ $json.tipo_propiedad ? \"'\" + $json.tipo_propiedad + \"'\" : 'NULL' }},
  {{ $json.dormitorios || 'NULL' }},
  {{ $json.banios || 'NULL' }},
  {{ $json.superficie_total || 'NULL' }},
  {{ $json.es_dueno_directo }},
  'meli_hunter_local'
)
ON CONFLICT (url_original) DO UPDATE SET
  updated_at = NOW(),
  precio = EXCLUDED.precio,
  imagen_principal = CASE WHEN EXCLUDED.imagen_principal != '' THEN EXCLUDED.imagen_principal ELSE propiedades_inmobiliaria.imagen_principal END,
  imagenes = CASE WHEN EXCLUDED.imagenes != '[]'::jsonb THEN EXCLUDED.imagenes ELSE propiedades_inmobiliaria.imagenes END
RETURNING id, titulo, es_dueno_directo,
  (xmax = 0) AS es_nueva;"""

NUEVO_PREPARAR_JS = r"""const data = $input.first().json;
const esNueva = data.es_nueva !== false;
const esDueno = data.es_dueno_directo;
const fotos = JSON.parse(data.imagenes || '[]');
const foto = data.imagen_principal || fotos[0] || '';

// Si ya existia, notificar de todas formas con etiqueta
const etiqueta = !esNueva ? '♻️ ACTUALIZADA' : (esDueno ? '🔥 DUEÑO DIRECTO' : '🏠 NUEVA PROPIEDAD');

let mensaje = '';
// Foto como link invisible (truco Telegram para mostrar preview)
if (foto && foto.startsWith('http')) {
  mensaje += `<a href="${foto}">&#8205;</a>\n`;
}
mensaje += `${etiqueta}\n\n`;
mensaje += `🏷️ <b>${data.titulo}</b>\n`;
mensaje += `💰 <b>${data.moneda} ${data.precio > 0 ? data.precio.toLocaleString() : 'Consultar'}</b>\n`;
mensaje += `📍 ${data.barrio}\n`;
if (data.tipo_propiedad) mensaje += `🏘️ ${data.tipo_propiedad}\n`;
if (data.dormitorios) mensaje += `🛏️ ${data.dormitorios} dorm.\n`;
if (data.superficie_total) mensaje += `📐 ${data.superficie_total} m²\n`;
mensaje += `📸 ${fotos.length} fotos\n`;
mensaje += `──────────────\n`;
if (data.descripcion && data.descripcion.length > 10) {
  mensaje += `📝 ${data.descripcion.substring(0, 200)}...\n`;
  mensaje += `──────────────\n`;
}
mensaje += `🔗 <a href="${data.url_original}">Ver en MercadoLibre</a>`;

return [{ json: { ...data, mensaje_telegram: mensaje, es_nueva: esNueva } }];"""

if not JWT:
    print('ERROR: falta N8N_API_KEY')
    exit(1)

# Backup primero
import subprocess
print('Haciendo backup...')
subprocess.run([
    'ssh', 'root@72.62.13.132',
    f'bash /root/backups/backup_wf.sh {WF_ID} receptor_meli'
], capture_output=True)

req = urllib.request.Request(f'https://n8n.automatizameuy.com/api/v1/workflows/{WF_ID}')
req.add_header('X-N8N-API-KEY', JWT)
with urllib.request.urlopen(req) as r:
    w = json.loads(r.read())

print(f'Workflow: {w["name"]} | {len(w["nodes"])} nodos')

for n in w['nodes']:
    if n['name'] == 'Limpiar Datos':
        n['parameters']['jsCode'] = NUEVO_LIMPIAR_JS
        print('✅ Limpiar Datos actualizado')

    if n['name'] == '💾 Guardar Postgres':
        n['parameters']['query'] = NUEVO_SQL
        print('✅ SQL con deduplicacion actualizado')

    if n['name'] == 'Preparar Mensaje':
        n['parameters']['jsCode'] = NUEVO_PREPARAR_JS
        print('✅ Preparar Mensaje actualizado (foto real + info completa)')

    # Telegram: asegurarse que use parse_mode HTML
    if n['name'] == '📱 Foto a Telegram':
        n['parameters']['additionalFields'] = {'parse_mode': 'HTML'}
        print('✅ Telegram: parse_mode HTML confirmado')

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
    f'https://n8n.automatizameuy.com/api/v1/workflows/{WF_ID}',
    data=data, method='PUT'
)
req2.add_header('Content-Type', 'application/json')
req2.add_header('X-N8N-API-KEY', JWT)
with urllib.request.urlopen(req2) as r:
    resp = json.loads(r.read())
    print(f'Guardado: {resp.get("name")} | nodes: {len(resp.get("nodes",[]))}')
