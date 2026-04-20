# 🧠 Contexto Maestro — Automatizame.uy
## Para uso en claude.ai/projects (Web y Celular)
*Última actualización: 19 de abril de 2026, 19:45 UYT*

---

## 🏢 ¿Qué es Automatizame.uy?
Agencia de automatización con IA en Uruguay. CEO: Sebastián Agradeno (Seba).
Ofrecemos chatbots, CRM automatizado, marketing con IA y scraping inmobiliario.

- **Web:** automatizameuy.com
- **Instagram:** @automatizame_uy
- **WhatsApp:** +598 97 595 464
- **Calendly:** calendly.com/sebaagradeno/30min

---

## 🤖 Ecosistema de Agentes (Mente Colmena)

| Agente | Rol | Dónde corre | Estado |
|---|---|---|---|
| **ELI** | Bot WhatsApp — cualifica leads | VPS (n8n) | ✅ Activo (SQL bugs arreglados abr/2026) |
| **ARIA Modo Dios** | Bot Telegram — cerebro central, recibe órdenes de Seba | VPS (n8n + Groq) | ⚠️ Activo pero sin herramientas nuevas |
| **ARIA Instagram** | Bot de DMs en Instagram | VPS (n8n) | ✅ Activo (SQL bugs arreglados abr/2026) |
| **Ruflo (Claude Flow)** | Orquestador de enjambre | PC de Seba | ✅ Clonado en 03_HERRAMIENTAS/ |
| **task_watcher.js** | Bridge Telegram → Claude Code (PC local) | PC de Seba | ✅ Funcionando vía SSH/stdin |
| **Antigravity (Gemini)** | Ingeniero DevOps — crea workflows, toca DB | IDE local | ✅ Activo |
| **Claude Code** | Obrero técnico — escribe código | Terminal local | ✅ Activo |
| **Claude.ai (VOS)** | Copiloto estratégico — analiza, aconseja, planifica | Web/Celular | ✅ Activo |

### Comunicación entre agentes:
- **Memoria compartida:** Tabla `agent_memory` en PostgreSQL (pgvector)
- **ARIA escribe tareas** → Ruflo/Antigravity las leen y ejecutan
- **Todos comparten la misma base de datos** en el VPS

---

## 🖥️ Infraestructura Técnica

| Componente | Detalle |
|---|---|
| **VPS** | 72.62.13.132 — Easypanel, corre 24/7 |
| **n8n Producción** | n8n.automatizameuy.com — 43 workflows |
| **PostgreSQL** | automatizacion1 — Tablas: clientes, propiedades_inmobiliaria, agent_memory, reels_ab_testing, ideas_negocio |
| **pgvector** | Extensión instalada para búsqueda semántica |
| **Traefik** | Proxy reverso con SSL automático |
| **Motor IA (ARIA)** | Groq — Llama 3.3 70B (GRATIS) |
| **Motor IA (Tareas complejas)** | Claude API — $10 de saldo |

---

## 📊 Bases de Datos Clave

### `clientes` — CRM de leads
Campos: nombre, email, whatsapp, negocio, estado, etapa_funnel, fecha_creacion

### `propiedades_inmobiliaria` — Destino Abril
Campos: precio, ubicacion, dormitorios, url, dueno_directo, fuente (MeLi/InfoCasas/Gallito)

### `agent_memory` — Memoria compartida del enjambre
Campos: agent_name, context_type (tarea_pendiente/contexto/aprendizaje/alerta), content, embedding, created_at

### `reels_ab_testing` — Fábrica de contenido
10 ángulos × 3 variantes = 30 Reels planificados
Campos: angulo, variante, guion_base, hook, cta, estado, prioridad

### `ideas_negocio` — Ideas de Seba
Campos: idea, analisis (opinión de ARIA), estado, fecha

---

## 🎬 Marketing y Contenido

### Los 10 Ángulos de Reels (Sistema Doglio):
1. Caos operativo — "Tu negocio es un caos de WhatsApps"
2. Perder leads — "Estás perdiendo clientes mientras dormís"
3. Competencia IA — "Tu competencia ya usa IA"
4. Empleado repetitivo — "Tenés empleados haciendo trabajo de robot"
5. WhatsApp infinito — "100 mensajes sin responder"
6. Escalar sin contratar — "Querés crecer sin contratar más gente"
7. CRM manual — "Tu Excel de clientes es un desastre"
8. Costo de no automatizar — "Cada día sin automatizar perdés plata"
9. Caso de éxito — "Mirá lo que logramos para [cliente]"
10. Futuro IA — "En 6 meses, el que no automatice, cierra"

### Producción de Video (Flujo Anti-Gasto):
1. **Guion** → Gemini Flash (gratis)
2. **Fondo animado** → Kling AI (66 créditos gratis/día)
3. **Montaje** → CapCut (gratis)
4. **LipSync final** → HeyGen (solo cuando el Reel esté perfecto)

### Assets de Video:
- HeyGen Avatar CEO: `6a5689f0217b4f0ca6454ed0899cb024`
- Voz clonada Seba: `f1ae2d6545d84aefaf8030deaa2c7a68`

---

## 🏠 Destino Abril (División Inmobiliaria)

- Web: destino-abril.automatizameuy.com
- **Hunters automáticos:** Scripts Node.js que scrapean MercadoLibre, InfoCasas y Gallito
- **Detección de dueño directo:** ≤3 operaciones + sin keywords inmobiliaria = dueño real
- **Motor de Matching IA:** Cruza lead + propiedad ideal automáticamente

---

## 💰 Modelo de Negocio

### Paquetes de Automatizame:
| Plan | Precio | Incluye |
|---|---|---|
| Starter | ~$297/mes | Chatbot WhatsApp + CRM básico |
| Pro | ~$497/mes | + Instagram DMs + Email marketing |
| Enterprise | ~$997/mes | + Scraping + Matching IA + Dashboard |

### Estrategia de costos de IA:
- **Groq (gratis):** Para ARIA, ideas, chat casual
- **Gemini Flash (gratis/incluido):** Para generación masiva de guiones
- **Claude API ($10 saldo):** Solo para tareas de alta complejidad

---

## 🔄 Workflows Activos en n8n Producción

| Workflow | Estado |
|---|---|
| 🤖 ARIA — Modo Dios (Telegram) | ✅ ACTIVO 24/7 |
| 📩 ARIA Instagram DM Bot | Construido |
| WhatsApp IA — ELI Cualificador | Construido |
| 🎬 IA REEL GENERATOR | Construido |
| 🎬 IA Viral — MODO DIOS | Construido |
| 🏠 Hunters (MeLi, InfoCasas, Gallito) | Construidos |
| 🛡️ FIREWALL — Seguridad | Creado |
| 💰 Sistema de Pagos — Stripe | Creado |
| 🎬 Fábrica de Reels — A/B Testing | Creado |
| Alerta global de errores | Construido |

---

## 📋 Tu Rol como Copiloto (Claude.ai)

### Lo que SÍ podés hacer:
- Analizar estrategia de contenido
- Proponer ángulos de Reels nuevos
- Revisar copy y guiones antes de producir
- Pensar en nuevos servicios o paquetes
- Ayudar a Seba a tomar decisiones de negocio
- Leer este contexto y dar respuestas informadas

### Lo que NO podés hacer (y quién sí puede):
| Tarea | Quién la hace |
|---|---|
| Escribir código | Claude Code (terminal) |
| Crear/modificar workflows n8n | Antigravity (Gemini) |
| Ejecutar scraping | Ruflo + Hunters |
| Tocar la base de datos | Antigravity o ARIA |
| Publicar en redes | n8n + APIs de Instagram |

### Cómo delegar una tarea técnica:
1. Decile a Seba qué hay que hacer y por qué
2. Seba le escribe a ARIA por Telegram o abre Claude Code
3. El agente correspondiente lo ejecuta

---

## 🎯 Prioridades Actuales (Abril 2026)

1. **Arreglar ARIA Modo Dios** — agregar las 4 herramientas y el system prompt con confirmación obligatoria
2. **Probar flujo completo** — Telegram → ARIA escribe tarea → task_watcher la captura → Claude Code ejecuta
3. **Publicar los primeros 3 Reels** usando el sistema A/B Testing
4. **Cerrar primer cliente** usando el Motor de Captación
5. **Escalar Destino Abril** — activar hunters y matching

## 🔧 Cambios Técnicos Recientes (Abril 2026)

- **ELI, ARIA, Calendly:** Bugs de SQL arreglados — leads se capturan correctamente ahora
- **task_watcher.js:** Funcionando — conecta Telegram con Claude Code via SSH+stdin (sin pg client)
- **Claude Office:** Crash `removeChild` arreglado — visualización de agentes estable
- **agent_memory:** Tabla creada con pgvector — sistema de memoria del enjambre activo

---

*Última actualización: 19 de abril de 2026 — Claude Code. Si parece desactualizado, pedile a Seba la versión nueva.*
