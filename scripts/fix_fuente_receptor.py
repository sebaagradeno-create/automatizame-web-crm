#!/usr/bin/env python3
# fix_fuente_receptor.py — Corrige el campo fuente en Limpiar Datos
# Para que InfoCasas y Gallito se guarden con su fuente correcta
import json, urllib.request

JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmN2Q4MjA4YS1jMDFlLTQwZDctODVlYS1lMTI4NjQ3NGM5OTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGFkMTJmMmQtNTk5NC00OTc5LWIzM2QtMWY2NTFhMTdhYTJiIiwiaWF0IjoxNzc2Mjc4MDA5fQ.FBPcUUMZUZyEC0zPRXLBC2m_RojBbRVAsK1wGzYdKFQ'
WF_ID = 'NLaS1UUVXayRfisW'
BASE = 'https://n8n.automatizameuy.com'

# Backup primero
import subprocess
print('Haciendo backup...')
subprocess.run([
    'ssh', 'root@72.62.13.132',
    f'bash /root/backups/backup_wf.sh {WF_ID} receptor_meli_fix_fuente'
], capture_output=True)

req = urllib.request.Request(f'{BASE}/api/v1/workflows/{WF_ID}')
req.add_header('X-N8N-API-KEY', JWT)
with urllib.request.urlopen(req) as r:
    w = json.loads(r.read())

import sys
sys.stdout.reconfigure(encoding='utf-8')
print(f'Workflow: {w["name"]} | {len(w["nodes"])} nodos')

for n in w['nodes']:
    if n['name'] == 'Limpiar Datos':
        code = n['parameters'].get('jsCode', '')
        if "'meli_hunter_local'" in code:
            # Reemplazar fuente hardcodeada por dinamica
            code = code.replace(
                "fuente:          'meli_hunter_local',",
                "fuente:          item.fuente || 'meli_hunter_local',"
            )
            n['parameters']['jsCode'] = code
            print('✅ Limpiar Datos: fuente ahora es dinamica')
        else:
            print('ℹ️  Limpiar Datos: fuente ya parece dinamica o tiene otro formato')
            # Buscar la línea para debug
            for i, line in enumerate(code.split('\n')):
                if 'fuente' in line.lower():
                    print(f'   Línea {i}: {line}')

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
    print('✅ Listo — InfoCasas y Gallito guardarán su fuente correctamente')
