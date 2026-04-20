#!/usr/bin/env python3
# fix_workflows.py — Conecta Calendly a alerta global + agrega notas a ARIA
import json, urllib.request, urllib.error, os

JWT = os.environ.get('N8N_API_KEY', '')
BASE = 'https://n8n.automatizameuy.com'
ERROR_WF = 'YXm4qW9YC0wGsboY'  # alerta global expert

def get_wf(wf_id):
    req = urllib.request.Request(f'{BASE}/api/v1/workflows/{wf_id}')
    req.add_header('X-N8N-API-KEY', JWT)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def put_wf(wf_id, w):
    s = w.get('settings', {})
    allowed = ['saveExecutionProgress','saveManualExecutions','saveDataErrorExecution',
               'saveDataSuccessExecution','executionTimeout','timezone','callerPolicy',
               'executionOrder','errorWorkflow']
    settings_clean = {k: v for k, v in s.items() if k in allowed}
    settings_clean['errorWorkflow'] = ERROR_WF  # siempre conectar alerta

    payload = {
        'name': w['name'],
        'nodes': w['nodes'],
        'connections': w['connections'],
        'settings': settings_clean,
        'staticData': None
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(f'{BASE}/api/v1/workflows/{wf_id}', data=data, method='PUT')
    req.add_header('Content-Type', 'application/json')
    req.add_header('X-N8N-API-KEY', JWT)
    with urllib.request.urlopen(req) as r:
        resp = json.loads(r.read())
        print(f'  Guardado: {resp.get("name")} | nodes: {len(resp.get("nodes",[]))} | errorWorkflow: {resp.get("settings",{}).get("errorWorkflow","?")}')
        return resp

# ── 1. CALENDLY → alerta global ──────────────────────────
print('[1/2] Calendly → conectar alerta global...')
cal = get_wf('97AEioHhVr9reHDu')
print(f'  Backup verificado: {len(cal.get("nodes",[]))} nodos')
put_wf('97AEioHhVr9reHDu', cal)

# ── 2. ARIA → guardar dolor/problema en notas ─────────────
print('[2/2] ARIA → agregar notas al INSERT de leads...')
aria = get_wf('8Mv1OO1JTWJOHFMa')
print(f'  Backup verificado: {len(aria.get("nodes",[]))} nodos')

for n in aria['nodes']:
    if n['name'] == 'Execute a SQL query':
        old = n['parameters'].get('query', '')
        if 'notas' not in old:
            n['parameters']['query'] = """INSERT INTO clientes (nombre, instagram_username, canal_origen, estado, notas)
VALUES (
  'Usuario de Instagram',
  '{{ $json["sender_psid"] }}',
  'instagram_dm',
  'nuevo',
  'Primer mensaje: {{ $node["🔍 Extraer Mensaje"].json["message_text"] }}'
)
ON CONFLICT (instagram_username)
DO UPDATE SET
  updated_at = NOW(),
  notas = CASE
    WHEN clientes.notas IS NULL OR clientes.notas = ''
    THEN EXCLUDED.notas
    ELSE clientes.notas
  END
RETURNING id;"""
            print('  Notas agregadas al INSERT de ARIA')
        else:
            print('  ARIA ya tiene notas, sin cambios')

put_wf('8Mv1OO1JTWJOHFMa', aria)

print('\nListo.')
