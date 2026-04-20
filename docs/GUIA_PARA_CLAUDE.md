# Guía Maestra para Claude — Agencia Automatizame.uy
*Actualizada: abril 2026*

Lee esto completo antes de iniciar cualquier tarea. Es tu mapa, reglamento y caja fuerte de contexto.

---

## Mapa del Proyecto

Raíz: `d:/AGENCIA MASTER/automatizame/`

- `src/` — Web y CRM (HTML, JS, CSS). Lógica principal del sitio.
- `scripts/` — Hunters de scraping, scripts de automatización, workers Node.js
- `docs/` — Documentación técnica, esquemas SQL, este archivo
- `assets/` — Imágenes, logos
- `.agentes/` — Notas de coordinación y estado de agentes IA
- `scratch/` — Archivos temporales y backups locales antes de borrar

---

## Infraestructura

| Servicio | URL / Acceso |
|---|---|
| VPS (Easypanel) | `72.62.13.132` — ssh `root@72.62.13.132` |
| n8n PRINCIPAL | `https://n8n.automatizameuy.com` |
| n8n-v2 (NO TOCAR) | instancia separada — solo para experimentos |
| Web | `https://automatizameuy.com` (GitHub → Hostinger autodeploy) |
| Postgres | container `automatizacion1_data-base-n8n`, DB `automatizacion1` |
| WhatsApp | +598 97 595 464 |
| Calendly | `https://calendly.com/sebaagradeno/30min` |
| Instagram | @automatizame_uy |

**n8n API JWT:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmN2Q4MjA4YS1jMDFlLTQwZDctODVlYS1lMTI4NjQ3NGM5OTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGFkMTJmMmQtNTk5NC00OTc5LWIzM2QtMWY2NTFhMTdhYTJiIiwiaWF0IjoxNzc2Mjc4MDA5fQ.FBPcUUMZUZyEC0zPRXLBC2m_RojBbRVAsK1wGzYdKFQ
```

**Workflows clave:**
| ID | Nombre |
|---|---|
| `qAeoG7pQnWyKrCYM` | ELI (WhatsApp) |
| `8Mv1OO1JTWJOHFMa` | ARIA (Instagram) |
| `97AEioHhVr9reHDu` | Calendly |
| `NLaS1UUVXayRfisW` | Receptor MeLi (hunters) |
| `xAxwagCztogO3OZx` | Enviar Foto a Telegram |
| `YXm4qW9YC0wGsboY` | Alerta global de errores |

**Backup obligatorio antes de tocar cualquier workflow:**
```bash
bash /root/backups/backup_wf.sh WORKFLOW_ID NOMBRE_DESCRIPTIVO
```
Verificar que el backup tenga nodos antes de continuar.

---

## Agentes desplegados

**ELI (WhatsApp):**
- Cualificadora de leads — captura nombre + email + dolor ANTES de dar Calendly
- Extrae email con tag `[EMAIL:xxx@xxx.com]` que el JS elimina antes de enviar al usuario
- Webhook email: `https://n8n.automatizameuy.com/webhook/actualizar-email-lead`
- Se identifica como IA cuando le preguntan (no lo oculta)

**ARIA (Instagram DMs):**
- Botonera Meta API tipo "button"
- Guarda leads en tabla `clientes` con campo `instagram_username`
- Incluye primer mensaje del lead en campo `notas`

**Coordinador (Agente Seba v3):**
- Sub-agentes: Técnico / CRM / Contenido
- Activo en n8n

---

## Sistema Inmobiliaria — Destino Abril

**Hunters de scraping (corren desde la PC de Seba, NO desde el VPS):**
- MeLi bloquea el IP del VPS — scraping solo funciona desde PC local
- Gallito bloqueado por Cloudflare desde VPS — igual, solo desde PC

| Script | Fuente | Horarios |
|---|---|---|
| `scripts/hunter_local.js` | MercadoLibre | 09:00, 09:15, 22:00, 22:15 |
| `scripts/hunter_infocasas.js` | InfoCasas | 09:00, 09:30 |
| `scripts/hunter_gallito.js` | Gallito | 10:00, 10:15 |

**Flujo de fotos a Telegram:**
MeLi CDN (mlstatic) bloquea hotlinking desde Telegram. Solución:
1. Hunter descarga la foto desde la PC (mlstatic acepta nuestra IP)
2. La convierte a base64
3. La manda al webhook `hunter-foto-telegram`
4. n8n la reenvía a Telegram con `sendPhoto` usando su credencial interna

**Detección dueño directo:**
- Lee nombre del vendedor en la página
- Si tiene keywords de inmobiliaria ("pietrafesa", "remax", etc.) → false
- Si tiene más de 10 operaciones → false (profesional)
- Si tiene 3 o menos operaciones → true (dueño probable)

**Tabla Postgres:** `propiedades_inmobiliaria` — UNIQUE en `url_original` (deduplicación automática)

**Backups hunters en VPS:** `/root/backups/caja_fuerte_hunters/`

**Pendiente:**
- Cuenta MeLi secundaria para obtener teléfono dueños directos (NO usar cuenta principal — riesgo ban MercadoPago)
- Flujo contacto automático a dueños directos via WhatsApp
- Agente inmobiliario especializado (garantías BHU/SGR, APIV, ITP, promesa/escritura)

---

## Reglas de Operación

1. **Autonomía total** — no pedir permiso para correcciones, mejoras de código, ejecutar scripts. Hacerlo y reportar.
2. **Backup SIEMPRE** antes de modificar un workflow de n8n que ya esté funcionando en producción.
3. **n8n principal ≠ n8n-v2** — nunca confundir las instancias. El principal es `n8n.automatizameuy.com`.
4. **Borrado prohibido** sin permiso. Si se autoriza: backup en `scratch/` o renombrar a `.bak` primero.
5. **Cambios críticos** (schema DB, auth) — explicar antes de ejecutar.
6. **Responder siempre en español.**
7. **Respuestas cortas y directas** — Seba no necesita explicaciones largas de lo que ya sabe.
8. **Scripts Python en Windows** — agregar `sys.stdout.reconfigure(encoding='utf-8')` al inicio para evitar errores de encoding con emojis.
9. **Archivos .js y .py están en .gitignore** — hacer backup manual al VPS cuando hay cambios importantes.

---

## Modelos de IA locales (Ollama)

Tenés instalado localmente:
- `gemma4:latest` (9.6 GB)
- `gemma3:12b` (8.1 GB)

**Cómo Claude puede usarlos:**
```bash
# Consulta simple
ollama run gemma4 "tu prompt aquí"

# Con pipe (para procesar texto)
echo "texto a analizar" | ollama run gemma4
```

**Para qué sirve tenerlos:**
- Procesar datos sensibles que no querés mandar a la nube (listas de clientes, contratos)
- Tareas masivas y repetitivas donde el costo de API sería alto (clasificar 1000 propiedades)
- Generar descripciones de propiedades en bulk sin gastar tokens
- Análisis offline cuando no hay internet

**Limitaciones reales:**
- Gemma4 es bueno pero no llega al nivel de Claude para razonamiento complejo
- Lento comparado con la nube (corre en tu CPU/GPU local)
- No tiene acceso a herramientas ni puede ejecutar código por sí solo

**Cuándo Claude lo usaría aquí:**
- Para generar descripciones automáticas de las propiedades scrapeadas antes de publicarlas
- Para clasificar/resumir propiedades en bulk sin costo de API
- Para analizar documentos sensibles del cliente inmobiliario

---

## Stack técnico completo

- **Automatización:** n8n (self-hosted)
- **Base de datos:** PostgreSQL (3 instancias: agencia, destino-abril-crm, supabase)
- **IA cloud:** Google Gemini, Groq (Whisper para voz), OpenAI
- **IA local:** Ollama + Gemma4
- **Scraping:** Puppeteer (Node.js, desde PC local)
- **Meta APIs:** WhatsApp Cloud API, Instagram Graph API
- **Multimedia:** ElevenLabs (voces), HeyGen (video avatar)
- **Web:** HTML/CSS/JS estático, Hostinger, GitHub Actions autodeploy

---

## 🤖 ARIA — Modo Dios (Telegram) — ACTUALIZACIÓN ABRIL 2026

### Estado actual: ⚠️ REQUIERE ARREGLO MANUAL

El workflow `itoin74QjS5d8EDh` ("asistente telegram") fue actualizado via API pero **los cambios NO persistieron correctamente**. El workflow sigue con la versión vieja. Hay que arreglarlo MANUALMENTE desde la UI de n8n o con la API limpiando bien los campos readonly.

### Lo que DEBERÍA tener ARIA (y no tiene aún):

**System Prompt nuevo (REGLA #1 = CONFIRMACION OBLIGATORIA):**
```
ANTES de usar CUALQUIER herramienta:
PASO 1: Decirle a Seba qué vas a hacer
PASO 2: Preguntar "¿Lo hago? (si/no)"  
PASO 3: ESPERAR su respuesta
EXCEPCION: Consultas de lectura (SELECT) no requieren confirmación
```

**4 Herramientas (Tools conectadas al AI Agent):**

| Nodo | Tipo | Para qué |
|---|---|---|
| 📊 Consultar DB | `postgresTool` (executeQuery) | SELECT a clientes, propiedades, reels, agent_memory, ideas_negocio. SIN confirmación |
| 💡 Guardar Idea | `postgresTool` (insert) → `ideas_negocio` | Guarda idea + análisis FODA. CON confirmación |
| 🐝 Memoria del Enjambre | `postgresTool` (insert) → `agent_memory` | Crea tareas para Ruflo/Antigravity/etc. CON confirmación |
| 📸 Publicar Instagram | `toolHttpRequest` → POST a webhook | Dispara generación de post. CON confirmación |

**Nodo AI Agent debe tener:**
- `chatId` de Seba: `5748737739` (NO `1301491979`)
- Modelo: `llama-3.3-70b-versatile` (Groq) o mejor **Gemini 2.5 Flash** (gratis, entiende mejor herramientas)
- Credenciales Groq: `qr6uCVFF8OqWm4dd`
- Credenciales Gemini: `GjNcpfBPkLl05TYn`
- Memory: `Postgres Chat Memory` con sessionKey `{{ $json.message.from.id }}`

### Workflows nuevos creados:

| ID | Nombre | Estado |
|---|---|---|
| `itoin74QjS5d8EDh` | ARIA Telegram (Modo Dios) | ⚠️ activo pero con versión vieja |
| `NviqmDlDEKj2KoFs` | Puente ARIA → Publicar Instagram | ✅ Creado y activado |
| `X6cJpW4V7Zq8Xqsb` | IA Viral - MODO DIOS (Instagram auto) | Inactivo, tiene todo el flujo de publicación |

### Puente ARIA → Instagram

Webhook: `POST https://n8n.automatizameuy.com/webhook/aria-publicar`
Body: `{ "instruccion": "post sobre automatización para peluquerías" }`
Flujo: Recibe instrucción → Groq genera post con [CAPTION] y [IMAGE_PROMPT] → Preview a Telegram

---

## 🐝 Sistema de Memoria Compartida (agent_memory)

**Tabla `agent_memory` en PostgreSQL** — Es el "pegamento" entre todos los agentes:

```sql
CREATE TABLE agent_memory (
  id SERIAL PRIMARY KEY,
  agent_name TEXT NOT NULL,     -- ruflo, antigravity, eli, aria, seba, claude_code
  context_type TEXT NOT NULL,   -- tarea_pendiente, contexto, aprendizaje, alerta, completada
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Flujo de tareas:**
1. Seba escribe en Telegram: "Haceme un scraper para InfoCasas"
2. ARIA guarda en `agent_memory`: `agent_name='ruflo', context_type='tarea_pendiente', content='Crear scraper InfoCasas...'`
3. `task_watcher.js` (corre en PC local) lee cada 30 seg y ejecuta con Claude Code
4. Al terminar, marca como `completada`

**Acceso a Postgres desde la PC:**
- Puerto externo 5432 = Supabase (NO es n8n postgres)
- n8n postgres NO tiene puerto externo — solo reachable via socat en VPS
- `socat` corre en VPS: `127.0.0.1:5454` → `10.0.1.2:5432` (overlay network)
- **task_watcher.js usa SSH exec + docker exec psql** (sin pg client, sin tunnel — más simple)

**task_watcher.js — Estado: ✅ FUNCIONANDO (abril 2026)**
Usa `spawnSync('ssh', [...], { input: sql })` para pasar el SQL por stdin y evitar todos los problemas de escaping en Windows. Para curl (notificaciones Telegram) usa `shell: 'D:/Program Files/Git/bin/bash.exe'`.

```bash
# Iniciar el watcher:
node scripts/task_watcher.js
```

---

## 📡 Arquitectura de Comunicación

```
Celular (Telegram)
    ↕ Bot API
VPS 72.62.13.132 (24/7)
    ├── n8n (workflows, ARIA, ELI)
    ├── PostgreSQL (agent_memory, clientes, etc)
    └── Traefik (SSL/proxy)
    ↕ agent_memory (tabla compartida)
PC Local de Seba (cuando está encendida)
    ├── Claude Code (terminal)
    ├── task_watcher.js (lee tareas pendientes)
    ├── Ruflo/Claude Flow (enjambre 112 agentes)
    ├── Hunters de scraping
    └── Ollama (IA local)
```

**Web de claude.ai:** Para planificación estratégica. Requiere subir `docs/CLAUDE_AI_PROJECT_CONTEXT.md` como archivo del proyecto.

---

## 🎬 Sistema de Reels A/B Testing

**Tabla:** `reels_ab_testing` — 10 ángulos × 3 variantes cada uno = 30 piezas

**Guía completa:** `docs/GUIA_REELS_AUTOMATIZAME.md`

**Ángulos definidos:**
1. Dolor directo, 2. Caso de éxito, 3. Pregunta retórica, 4. Dato estadístico, 5. Antes/Después,
6. Mito destruido, 7. Tendencia, 8. Behind the scenes, 9. Comparación, 10. Tutorial rápido

**Assets disponibles:**
- HeyGen Avatar: `6a5689f0217b4f0ca6454ed0899cb024`
- Voz Seba: `f1ae2d6545d84aefaf8030deaa2c7a68`
- Kling: 66 créditos/día gratis para video

---

## ✅ BUGS ARREGLADOS (abril 2026)

- **ELI (WhatsApp):** SQL corregido — captura `nombre` y `canal_origen='whatsapp'` correctamente con UPSERT real
- **ARIA (Instagram):** Expresiones `{{ .campo }}` → `{{ $json.campo }}` — leads se guardan bien
- **Calendly:** Cambiado de UPDATE puro a UPSERT con CTE — ya no se pierde el lead si no existe en DB
- **Claude Office:** Crash `removeChild` arreglado — `destroy(false)` en vez de `destroy(true)` en OfficeGame.tsx y hmrCleanup.ts
- **task_watcher.js:** Funcionando — usa `spawnSync` stdin en vez de pg client (evita auth chain de Docker Swarm)

---

## ⚡ TAREAS PENDIENTES PRIORITARIAS (abril 2026)

### 🔴 Crítico
1. **ARREGLAR ARIA Modo Dios** — El workflow `itoin74QjS5d8EDh` no tiene las herramientas nuevas. Hay que:
   - Cambiar chatId a `5748737739`
   - Agregar los 4 herramientas (tools) descritas arriba
   - Pegar el system prompt con REGLA #1 de confirmación
   - Considerar cambiar motor Groq → Gemini 2.5 Flash para mejor comprensión

### 🟡 Importante
2. **Probar flujo completo:** Telegram → ARIA → agent_memory → task_watcher → Claude Code (tarea de prueba)
3. **Configurar task_watcher.js como servicio Windows** — `scripts/task_watcher.js` debe iniciar automáticamente
4. **Recuperar lead Stefani** — se perdió por el bug de Calendly (ya arreglado, nuevo no se pierde)
5. **Activar hunters de scraping** para Destino Abril
6. **Primeros 3 Reels del A/B Testing**

### 🟢 Nice to have
7. **Seguridad:** Password Postgres en variables de entorno (`POSTGRES_PASSWORD`)
8. **Dashboard web** para ver estado de agentes en tiempo real

---

## 🔑 Credenciales y IDs rápidos

```
# n8n API
API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmN2Q4MjA4YS1jMDFlLTQwZDctODVlYS1lMTI4NjQ3NGM5OTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGFkMTJmMmQtNTk5NC00OTc5LWIzM2QtMWY2NTFhMTdhYTJiIiwiaWF0IjoxNzc2Mjc4MDA5fQ.FBPcUUMZUZyEC0zPRXLBC2m_RojBbRVAsK1wGzYdKFQ

# Telegram
CHAT_ID_SEBA=5748737739
CHAT_ID_VIEJO=1301491979  # ← NO usar este

# n8n Credentials IDs
GROQ=qr6uCVFF8OqWm4dd
GEMINI=GjNcpfBPkLl05TYn
POSTGRES_PRINCIPAL=rfMpsEPaVls9DDGX  # DB con clientes, propiedades, etc
POSTGRES_CHAT_MEMORY=MaX3Aa6FMCy4NjUl  # Chat memory del bot
TELEGRAM_BOT=tBvGqwSlu7M1tmga
INSTAGRAM_API=isXIWWDyIfPfKX0w
CLOUDINARY=2O1MemHlGqL0VBIA
GOOGLE_DRIVE=kAWoxsZ2lzLkD2It

# Workflow IDs
ARIA_TELEGRAM=itoin74QjS5d8EDh
PUENTE_INSTAGRAM=NviqmDlDEKj2KoFs
MODO_DIOS_INSTAGRAM=X6cJpW4V7Zq8Xqsb
ELI_WHATSAPP=qAeoG7pQnWyKrCYM
ERROR_HANDLER=YXm4qW9YC0wGsboY
```
