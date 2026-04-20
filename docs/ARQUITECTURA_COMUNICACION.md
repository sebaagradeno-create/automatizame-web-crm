# 🧬 Arquitectura de Comunicación — Automatizame.uy
## Cómo todos los agentes se hablan entre sí

---

## 📱 El Flujo Completo (Celular → Ejecución → Resultado)

```
TÚ (celular/calle)
    │
    ├─── 📱 Telegram ──→ ARIA Modo Dios (n8n + Groq)
    │                         │
    │                         ├── Responde al instante (chat IA)
    │                         ├── Guarda ideas en ideas_negocio
    │                         └── Guarda tareas en agent_memory ←── CLAVE
    │                                    │
    │                                    ▼
    │                         ┌─────────────────────┐
    │                         │   agent_memory       │
    │                         │   (PostgreSQL VPS)   │
    │                         │   ───────────────    │
    │                         │   La MEMORIA que     │
    │                         │   TODOS comparten    │
    │                         └─────────────────────┘
    │                                    │
    │                                    ▼
    │                         PC de Seba (cuando está prendida)
    │                         ┌─────────────────────┐
    │                         │  task_watcher.js     │
    │                         │  (lee agent_memory)  │
    │                         │        │             │
    │                         │        ▼             │
    │                         │  Claude Code ───→ Ejecuta código
    │                         │  Ruflo ──────→ Enjambre 112 agentes
    │                         │  Antigravity ─→ DevOps + n8n
    │                         └─────────────────────┘
    │
    └─── 🌐 claude.ai ──→ Copiloto Estratégico (lee el contexto, aconseja)
                              NO ejecuta código
                              NO toca la DB
                              SÍ ayuda a planificar y decidir
```

---

## 🔌 Canales de Comunicación

| Desde | Hacia | Canal | ¿Requiere PC? |
|---|---|---|---|
| Seba (celular) | ARIA | Telegram | ❌ No (VPS 24/7) |
| Seba (celular) | Claude.ai | Web/App claude.ai | ❌ No (nube) |
| ARIA | Enjambre | agent_memory (DB) | ❌ No (VPS) |
| Enjambre | Claude Code | task_watcher.js | ✅ Sí |
| Claude Code | n8n | API REST + JWT | ✅ Sí |
| n8n | Seba | Telegram (alertas) | ❌ No (VPS) |

---

## 📋 Instrucciones de Configuración

### Paso 1: Subir contexto a Claude.ai
1. Abrí **claude.ai** en el navegador (PC o celular)
2. Andá a **Projects** → Crear nuevo proyecto → "Automatizame Master"
3. En **Project Knowledge** → Upload → Subí el archivo:
   `docs/CLAUDE_AI_PROJECT_CONTEXT.md`
4. Listo. Ahora Claude.ai tiene TODO el contexto de la agencia.

### Paso 2: Probar ARIA desde Telegram
1. Abrí Telegram en el celular
2. Buscá tu bot "asistente telegram"
3. Escribí: "Anotá una tarea para Ruflo: investigar precios de SyncLabs para lip sync"
4. ARIA lo guarda en agent_memory automáticamente

### Paso 3: Activar el Task Watcher (cuando estés en la PC)
```bash
# Instalar dependencia de Postgres
cd "d:\AGENCIA MASTER\automatizame"
npm install pg

# Configurar la password
set POSTGRES_PASSWORD=tu_password_de_postgres

# Ejecutar el watcher
node scripts/task_watcher.js
```
El watcher lee agent_memory cada 30 segundos y te muestra las tareas pendientes.

### Paso 4 (Futuro): Automatización total
- Agregar task_watcher.js al startup de Windows para que corra automáticamente
- Configurar Ruflo para que ejecute tareas sin intervención humana
- Agregar nodo SSH en n8n para ejecutar comandos directos en la PC (requiere túnel)

---

## ❓ Preguntas Frecuentes

**¿Puedo apagar la PC?**
Sí. ARIA sigue funcionando 24/7 en el VPS. Las tareas se guardan en agent_memory y se ejecutan cuando prendas la PC.

**¿La app de Claude.ai es igual que la web?**
Sí, exactamente igual. Mismo chat, mismos proyectos. Solo necesitás subir el archivo de contexto una vez.

**¿Claude.ai puede ejecutar código?**
No. Ese es el rol de Claude Code (terminal) y Antigravity. Claude.ai es tu asesor estratégico.

**¿ARIA consume créditos?**
No. Usa Groq (Llama 3.3 70B) que es 100% gratis.
