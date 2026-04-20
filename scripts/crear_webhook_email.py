#!/usr/bin/env python3
# crear_webhook_email.py — Crea workflow n8n para guardar email de lead por WhatsApp
import json, urllib.request, urllib.error, os

JWT = os.environ.get('N8N_API_KEY', '')

WORKFLOW = {
    "name": "Actualizar Email Lead (ELI)",
    "nodes": [
        {
            "id": "webhook-email",
            "name": "Webhook Email",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [240, 300],
            "parameters": {
                "httpMethod": "POST",
                "path": "actualizar-email-lead",
                "responseMode": "responseNode",
                "options": {"allowedOrigins": "*"}
            }
        },
        {
            "id": "update-email",
            "name": "Guardar Email en CRM",
            "type": "n8n-nodes-base.postgres",
            "typeVersion": 2.5,
            "position": [460, 300],
            "parameters": {
                "operation": "executeQuery",
                "query": "UPDATE clientes SET email = '{{ $json.body.email }}', updated_at = NOW() WHERE whatsapp = '{{ $json.body.phone }}' RETURNING id, nombre, email;",
                "options": {}
            },
            "credentials": {
                "postgres": {"id": "2", "name": "Postgres account"}
            }
        },
        {
            "id": "respond-ok",
            "name": "Responder OK",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [680, 300],
            "parameters": {
                "respondWith": "json",
                "responseBody": "={\"ok\": true}"
            }
        }
    ],
    "connections": {
        "Webhook Email": {
            "main": [[{"node": "Guardar Email en CRM", "type": "main", "index": 0}]]
        },
        "Guardar Email en CRM": {
            "main": [[{"node": "Responder OK", "type": "main", "index": 0}]]
        }
    },
    "settings": {"executionOrder": "v1"},
    "staticData": None
}

if not JWT:
    print('ERROR: falta N8N_API_KEY')
    exit(1)

# Verificar si ya existe
req = urllib.request.Request('https://n8n.automatizameuy.com/api/v1/workflows?name=Actualizar+Email+Lead')
req.add_header('X-N8N-API-KEY', JWT)
with urllib.request.urlopen(req) as r:
    existing = json.loads(r.read())
    workflows = existing.get('data', [])
    if workflows:
        print('Ya existe:', workflows[0]['id'], workflows[0]['name'])
        # Activar si no está activo
        if not workflows[0]['active']:
            wf_id = workflows[0]['id']
            req2 = urllib.request.Request(
                f'https://n8n.automatizameuy.com/api/v1/workflows/{wf_id}/activate',
                data=b'{}', method='POST'
            )
            req2.add_header('X-N8N-API-KEY', JWT)
            req2.add_header('Content-Type', 'application/json')
            with urllib.request.urlopen(req2) as r2:
                print('Activado:', json.loads(r2.read()).get('active'))
        exit(0)

# Crear nuevo
data = json.dumps(WORKFLOW).encode()
req = urllib.request.Request(
    'https://n8n.automatizameuy.com/api/v1/workflows',
    data=data, method='POST'
)
req.add_header('Content-Type', 'application/json')
req.add_header('X-N8N-API-KEY', JWT)

try:
    with urllib.request.urlopen(req) as r:
        resp = json.loads(r.read())
        wf_id = resp.get('id')
        print('Workflow creado:', wf_id, resp.get('name'))

    # Activar
    req2 = urllib.request.Request(
        f'https://n8n.automatizameuy.com/api/v1/workflows/{wf_id}/activate',
        data=b'{}', method='POST'
    )
    req2.add_header('X-N8N-API-KEY', JWT)
    req2.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req2) as r2:
        print('Activado:', json.loads(r2.read()).get('active'))

except urllib.error.HTTPError as e:
    print('ERROR:', e.code, e.read().decode()[:300])
