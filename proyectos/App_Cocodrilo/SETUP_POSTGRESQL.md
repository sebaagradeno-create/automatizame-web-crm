# Configuración PostgreSQL — App Cocodrilo

## Overview

La App Cocodrilo se conecta a **PostgreSQL en el VPS** a través de un servidor Node.js que expone un API REST.

**Flujo:**
```
Cocodrilo (browser) ← HTTP/JSON →  Node.js Server ← pg driver → PostgreSQL (VPS)
```

---

## 1. Crear Tabla en PostgreSQL

SSH al VPS:
```bash
ssh root@72.62.13.132
```

Conectar a PostgreSQL:
```bash
psql -U postgres -d automatizacion1
```

Ejecutar SQL:
```sql
CREATE TABLE cocodrilo_movimientos (
  id TEXT PRIMARY KEY,
  tipo TEXT CHECK (tipo IN ('gasto', 'ingreso', 'vencimiento')),
  descripcion TEXT NOT NULL,
  categoria TEXT,
  monto DECIMAL(12, 2),
  moneda TEXT CHECK (moneda IN ('UYU', 'USD')),
  fecha DATE,
  fechaVenc DATE,
  pagado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cocodrilo_tipo ON cocodrilo_movimientos(tipo);
CREATE INDEX idx_cocodrilo_fecha ON cocodrilo_movimientos(fecha);
```

---

## 2. Instalar Server Node.js en VPS

En el VPS:
```bash
cd /root/cocodrilo-server
npm install express pg cors
```

Copiar archivo:
```bash
scp scripts/cocodrilo-server.js root@72.62.13.132:/root/cocodrilo-server/
```

---

## 3. Configurar Systemd (para que corra como servicio)

En el VPS, crear `/etc/systemd/system/cocodrilo.service`:
```ini
[Unit]
Description=Cocodrilo PostgreSQL API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/cocodrilo-server
ExecStart=/usr/bin/node cocodrilo-server.js
Restart=on-failure
RestartSec=10
Environment="NODE_ENV=production"
Environment="PG_HOST=localhost"
Environment="PG_PORT=5432"
Environment="PG_DB=automatizacion1"
Environment="PG_USER=postgres"
Environment="PG_PASSWORD=YOUR_POSTGRES_PASSWORD"

[Install]
WantedBy=multi-user.target
```

Activar:
```bash
systemctl daemon-reload
systemctl enable cocodrilo
systemctl start cocodrilo
systemctl status cocodrilo
```

---

## 4. Configurar Reverse Proxy en Traefik

Añadir a `/etc/easypanel/traefik/config/main.yaml`:
```yaml
http:
  routers:
    cocodrilo:
      rule: Host(`cocodrilo.automatizameuy.com`)
      service: cocodrilo-svc
      middlewares:
        - cors-headers

  services:
    cocodrilo-svc:
      loadBalancer:
        servers:
          - url: http://localhost:4042

  middlewares:
    cors-headers:
      headers:
        accessControlAllowOriginList: ["*"]
        accessControlAllowMethods: ["GET", "POST", "DELETE", "OPTIONS"]
```

Recargar Traefik:
```bash
docker-compose -f /root/docker-compose.yml restart traefik
```

Test:
```bash
curl https://cocodrilo.automatizameuy.com/api/health
```

---

## 5. Configurar en Cocodrilo

Abrir App → Ajustes (⚙️) → campo "API PostgreSQL":
```
https://cocodrilo.automatizameuy.com/api
```

Guardar → esperar indicador ✓ verde + 🗄️ en header

---

## API Endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/movimientos` | Obtener todos los movimientos |
| `POST` | `/api/movimientos` | Guardar lista (UPSERT automático) |
| `DELETE` | `/api/movimientos/:id` | Eliminar movimiento |

### POST /api/movimientos
Envía array de movimientos. El servidor hace UPSERT (inserta o actualiza automáticamente).

**Request:**
```json
[
  {
    "id": "gasto_12345",
    "tipo": "gasto",
    "descripcion": "Supermercado",
    "categoria": "Comida",
    "monto": 450.50,
    "moneda": "UYU",
    "fecha": "2026-04-20",
    "fechaVenc": null,
    "pagado": false
  }
]
```

**Response:**
```json
{ "saved": 1 }
```

---

## Logs

Ver logs del servidor:
```bash
systemctl logs -u cocodrilo -f
```

O en consola del browser (F12 → Console):
```
[PostgreSQL] Conectado
[PostgreSQL] Error al obtener datos: ...
```

---

## Troubleshooting

| Problema | Solución |
|---|---|
| **❌ Conectado a PostgreSQL pero 0 datos** | Base vacía. Crear datos desde Cocodrilo y guardar. |
| **❌ Error "Cannot connect"** | Verificar firewall VPS. URL debe ser accesible. |
| **❌ Error "PG_PASSWORD no válida"** | Revisar credencial en systemd service. |
| **❌ Traefik devuelve 502** | Verificar que Node.js server está corriendo: `systemctl status cocodrilo` |

---

## Backup de Datos

Desde el VPS:
```bash
pg_dump -U postgres automatizacion1 > backup_cocodrilo_$(date +%Y%m%d).sql
```

Restaurar:
```bash
psql -U postgres automatizacion1 < backup_cocodrilo_YYYYMMDD.sql
```

---

**Creado: abril 2026**
