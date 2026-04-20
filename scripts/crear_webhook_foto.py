#!/usr/bin/env python3
# crear_webhook_foto.py — Crea workflow n8n para enviar fotos a Telegram
# Recibe: { foto_base64, caption } → sendPhoto a Telegram
import json, urllib.request, sys
sys.stdout.reconfigure(encoding='utf-8')

JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmN2Q4MjA4YS1jMDFlLTQwZDctODVlYS1lMTI4NjQ3NGM5OTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGFkMTJmMmQtNTk5NC00OTc5LWIzM2QtMWY2NTFhMTdhYTJiIiwiaWF0IjoxNzc2Mjc4MDA5fQ.FBPcUUMZUZyEC0zPRXLBC2m_RojBbRVAsK1wGzYdKFQ'
BASE = 'https://n8n.automatizameuy.com'

# Buscar el credential ID de Telegram "asistente personal11"
req = urllib.request.Request(f'{BASE}/api/v1/credentials')
req.add_header('X-N8N-API-KEY', JWT)
with urllib.request.urlopen(req) as r:
    creds = json.loads(r.read())

tg_cred_id = None
for c in creds.get('data', []):
    if 'asistente' in c['name'].lower() or 'telegram account' in c['name'].lower():
        tg_cred_id = c['id']
        print(f'Credencial Telegram: {c["name"]} (ID: {tg_cred_id})')
        break

if not tg_cred_id:
    print('ERROR: No se encontro credencial Telegram')
    sys.exit(1)

# Workflow: Webhook recibe {foto_base64, caption} → Convert → sendPhoto
workflow = {
    "name": "📸 Enviar Foto Hunter a Telegram",
    "nodes": [
        {
            "id": "webhook-foto",
            "name": "Webhook Foto",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [250, 300],
            "parameters": {
                "httpMethod": "POST",
                "path": "hunter-foto-telegram",
                "responseMode": "onReceived",
                "responseData": "firstEntryJson"
            }
        },
        {
            "id": "code-b64",
            "name": "Procesar Base64",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [470, 300],
            "parameters": {
                "jsCode": """const body = $input.first().json.body || $input.first().json;
const b64 = body.foto_base64;
const caption = body.caption || '';

if (!b64) throw new Error('No foto_base64 en el payload');

// Convertir base64 a binario
const buf = Buffer.from(b64, 'base64');

return [{
  json: { caption },
  binary: {
    foto: {
      data: b64,
      mimeType: 'image/jpeg',
      fileName: 'foto.jpg'
    }
  }
}];"""
            }
        },
        {
            "id": "telegram-foto",
            "name": "Telegram sendPhoto",
            "type": "n8n-nodes-base.telegram",
            "typeVersion": 1.2,
            "position": [690, 300],
            "parameters": {
                "resource": "message",
                "operation": "sendPhoto",
                "chatId": "1301491979",
                "binaryData": True,
                "binaryPropertyName": "foto",
                "additionalFields": {
                    "caption": "={{ $json.caption }}",
                    "parse_mode": "HTML"
                }
            },
            "credentials": {
                "telegramApi": {
                    "id": tg_cred_id,
                    "name": "asistente personal11"
                }
            }
        }
    ],
    "connections": {
        "Webhook Foto": {
            "main": [[{"node": "Procesar Base64", "type": "main", "index": 0}]]
        },
        "Procesar Base64": {
            "main": [[{"node": "Telegram sendPhoto", "type": "main", "index": 0}]]
        }
    },
    "settings": {
        "executionOrder": "v1",
        "errorWorkflow": "YXm4qW9YC0wGsboY"
    },
    "staticData": None
}

data = json.dumps(workflow).encode()
req2 = urllib.request.Request(f'{BASE}/api/v1/workflows', data=data, method='POST')
req2.add_header('Content-Type', 'application/json')
req2.add_header('X-N8N-API-KEY', JWT)
with urllib.request.urlopen(req2) as r:
    resp = json.loads(r.read())
    wf_id = resp.get('id')
    print(f'Workflow creado: {resp.get("name")} (ID: {wf_id})')

# Activar
req3 = urllib.request.Request(f'{BASE}/api/v1/workflows/{wf_id}/activate', data=b'{}', method='POST')
req3.add_header('Content-Type', 'application/json')
req3.add_header('X-N8N-API-KEY', JWT)
with urllib.request.urlopen(req3) as r:
    print('Activado OK')

print(f'\nWebhook listo en: {BASE}/webhook/hunter-foto-telegram')
print('Payload: { "foto_base64": "...", "caption": "texto HTML" }')
