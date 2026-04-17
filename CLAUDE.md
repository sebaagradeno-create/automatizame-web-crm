# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Proyecto

Agencia de automatización con IA — Uruguay. Seba es el CEO unipersonal. Este repo es el centro de operaciones: workflows n8n, scripts de scraping, agentes IA desplegados y la web de la agencia.

---

## Reglas de Operación

1. **Siempre en español** — sin excepciones.
2. **Respuestas cortas y directas** — Seba no necesita explicaciones de lo que ya sabe.
3. **n8n principal ≠ n8n-v2** — nunca tocar la instancia n8n-v2 (es de prueba).
4. **Backup SIEMPRE** antes de modificar un workflow en producción: `bash /root/backups/backup_wf.sh WORKFLOW_ID NOMBRE_DESCRIPTIVO`. Verificar que el backup tenga nodos antes de continuar.
5. **Borrado prohibido** sin permiso. Si se autoriza: mover a `scratch/` o renombrar a `.bak`.
6. **Cambios críticos** (schema DB, auth, variables de entorno) — explicar antes de ejecutar.
7. **Archivos .js y .py están en .gitignore** — hacer backup manual al VPS cuando hay cambios importantes.
8. **Scripts Python en Windows** — agregar `sys.stdout.reconfigure(encoding='utf-8')` al inicio para evitar errores de encoding con emojis.
9. **No crear archivos en la raíz** — código nuevo va en `src/`, `scripts/` o `n8n_workflows/`.

---

## Infraestructura

| Servicio | Acceso |
|---|---|
| VPS (Easypanel) | `ssh root@72.62.13.132` |
| n8n PRINCIPAL | `https://n8n.automatizameuy.com` (container `automatizacion1_n8n`) |
| n8n-v2 | **NO TOCAR** — instancia separada solo para experimentos |
| PostgreSQL | container `automatizacion1_data-base-n8n`, DB `automatizacion1`, user `postgres` |
| Supabase CRM | `https://db.automatizameuy.com` |
| Web pública | `https://automatizameuy.com` (GitHub → Hostinger autodeploy) |
| Dashboard comando | `https://comando.automatizameuy.com` (server.js puerto 4040, systemd: `dashboard`) |
| Agente Seba (Telegram) | `/root/agente-seba/` puerto 3131 |
| WhatsApp | +598 97 595 464 |

---

## n8n API

- **Base:** `https://n8n.automatizameuy.com/api/v1/`
- **Header:** `X-N8N-API-KEY`
- **JWT:** en `docs/GUIA_PARA_CLAUDE.md` (buscar "n8n API JWT")
- **Credencial Postgres en n8n:** `rfMpsEPaVls9DDGX` (usada por todos los workflows activos)

**Workflows clave:**

| ID | Agente / Función |
|---|---|
| `qAeoG7pQnWyKrCYM` | ELI — cualificadora WhatsApp |
| `8Mv1OO1JTWJOHFMa` | ARIA — Instagram DMs |
| `97AEioHhVr9reHDu` | Calendly |
| `NLaS1UUVXayRfisW` | Receptor MeLi (hunters) |
| `xAxwagCztogO3OZx` | Enviar foto a Telegram |
| `YXm4qW9YC0wGsboY` | Alerta global de errores |

---

## Agentes desplegados

**ELI (WhatsApp):**
- Cualificadora: captura nombre + email + dolor ANTES de dar Calendly
- Extrae email con tag `[EMAIL:xxx@xxx.com]` — el JS lo elimina antes de enviar al usuario
- Webhook email: `https://n8n.automatizameuy.com/webhook/actualizar-email-lead`
- Se identifica como IA cuando le preguntan

**ARIA (Instagram DMs):**
- Usa botonera Meta API tipo "button"
- Guarda leads en tabla `clientes` con campo `instagram_username`
- Incluye primer mensaje del lead en campo `notas`

**Coordinador (Agente Seba v3):**
- Sub-agentes: Técnico / CRM / Contenido
- Activo en n8n

---

## Sistema Inmobiliaria — Destino Abril

**Hunters de scraping** — corren desde la **PC de Seba, NO desde el VPS** (MeLi y Gallito bloquean IP del VPS):

| Script | Fuente | Horarios |
|---|---|---|
| `scripts/hunter_local.js` | MercadoLibre | 09:00, 09:15, 22:00, 22:15 |
| `scripts/hunter_infocasas.js` | InfoCasas | 09:00, 09:30 |
| `scripts/hunter_gallito.js` | Gallito | 10:00, 10:15 |

Ejecutar hunters:
```bash
cd scripts
node hunter_local.js alquiler   # o: npm run alquileres
node hunter_local.js venta      # o: npm run ventas
node hunter_infocasas.js
node hunter_gallito.js
```

**Flujo de fotos a Telegram** (MeLi CDN bloquea hotlinking desde Telegram):
1. Hunter descarga foto desde la PC → convierte a base64 → manda al webhook `hunter-foto-telegram`
2. n8n la reenvía a Telegram con `sendPhoto` usando su credencial interna

**Detección dueño directo:**
- Lee nombre del vendedor en la página
- Keywords de inmobiliaria ("pietrafesa", "remax", etc.) → false
- Más de 10 operaciones → false (profesional)
- 3 o menos operaciones → true (dueño probable)

**Tabla Postgres:** `propiedades_inmobiliaria` — UNIQUE en `url_original` (deduplicación automática)
**Tabla leads:** `leads_destino_abril` — campos: nombre, intencion, tipo_propiedad, zona, telefono, fuente, fotos, estado

**Web Destino Abril:**
- Repo: `d:\AGENCIA MASTER\01_Clientes_Activos\destino-abril\` (React + Vite)
- URL: `https://destino-abril.automatizameuy.com`
- Deploy: `npm run build` → `scp -r dist/. root@72.62.13.132:/root/sites/destino-abril/`
- Server VPS: `/root/sites/destino-abril/server.js` puerto 4041 (systemd: `destino-abril`)
- Lead webhook n8n: `YY4f8tzNtKawLwaO` → `/webhook/destino-abril-lead`
- Instagram DM bot: `daySEvfuE1WIgmH8` (pausado — falta cuenta IG)
- CRM password: `destino2026`

**Backups hunters en VPS:** `/root/backups/caja_fuerte_hunters/`

---

## Deploy web

```bash
scp archivo root@72.62.13.132:/root/dashboard/
```

Traefik config: `/etc/easypanel/traefik/config/main.yaml`

---

## Telegram

- Chat Seba: `5748737739`
- Credencial Telegram en n8n: `vyClPi8ITzGB8wPW`

---

## Modelos IA locales (Ollama)

Disponibles localmente: `gemma4:latest`, `gemma3:12b`

```bash
ollama run gemma4 "tu prompt aquí"
echo "texto" | ollama run gemma4
```

Útil para: datos sensibles que no van a la nube, tareas masivas (clasificar propiedades, generar descripciones en bulk), análisis offline.

---

## Stack técnico

- **Automatización:** n8n self-hosted
- **Base de datos:** PostgreSQL (3 instancias: agencia, destino-abril-crm, supabase)
- **IA cloud:** Google Gemini, Groq (Whisper para voz), OpenAI
- **IA local:** Ollama + Gemma4
- **Scraping:** Puppeteer (Node.js, desde PC local)
- **Meta APIs:** WhatsApp Cloud API, Instagram Graph API
- **Multimedia:** ElevenLabs (voces), HeyGen (video avatar)
- **Web:** HTML/CSS/JS estático, Hostinger, GitHub Actions autodeploy
- **Modelo preferido para agentes internos:** `claude-opus-4-6` (ver `src/ai-services/managed-agents/core/config.js`)
