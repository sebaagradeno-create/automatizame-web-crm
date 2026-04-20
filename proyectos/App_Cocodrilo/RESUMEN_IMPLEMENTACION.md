# 🐊 Cocodrilo — Cerebro de la App (Implementación Completada)

## Resumen

He inyectado el **"cerebro"** (lógica JavaScript) a la App Cocodrilo conectándola a **PostgreSQL en el VPS** a través de un API REST en Node.js. La app ahora sincroniza datos con la base de datos de verdad, con fallback automático a localStorage si no hay conexión.

---

## ¿Qué Se Logró Conectar?

### ✅ **CRUD Completo**
- **Crear**: Nuevo gasto/ingreso/vencimiento → se guarda en Supabase + localStorage
- **Leer**: Cargar lista de movimientos desde Supabase (con fallback a localStorage)
- **Actualizar**: Marcar vencimiento como pagado → actualiza en Supabase
- **Eliminar**: Deslizar movimiento → se elimina de Supabase + localStorage

### ✅ **Sincronización Inteligente**
- Al guardar → **localStorage instantáneamente** (UI rápida)
- Luego → **Supabase en background** (sin bloquear)
- Al cargar pantalla → **leer desde Supabase** (datos frescos)
- Si Supabase offline → usar localStorage como fallback

### ✅ **Pantalla de Ajustes**
- Campo para URL del proyecto Supabase
- Campo para API Key pública
- Indicador visual (✓ verde o ✗ rojo) mostrando estado de conexión
- Los datos se guardan en localStorage de forma segura

### ✅ **Indicador en Header**
- Si está conectado a Supabase: emoji 🌐 junto al nombre
- Si no: solo el nombre (usando localStorage)

### ✅ **Manejo de Errores**
- Si la red falla → los datos se quedan en localStorage
- Cuando vuelve la conexión → se sincronizan automáticamente
- Logs en consola (F12 → Console) para debugging

### ✅ **Funcionalidades que Ahora Persisten en BD**
1. **Gastos mensuales** — con categoría, monto, moneda, fecha
2. **Ingresos** — registrados por separado
3. **Vencimientos** — con fecha de vencimiento y estado "pagado"
4. **Estadísticas** — todos los totales se calculan desde Supabase
5. **Importación IA** — los gastos detectados se guardan en BD

---

## Archivos Creados/Modificados

| Archivo | Cambio |
|---|---|
| `index.html` | ✏️ Agregado conexión a PostgreSQL vía API REST, funciones async, sincronización, fallback |
| `SETUP_POSTGRESQL.md` | 📄 Guía de setup (crear tabla, instalar server Node.js, Traefik, systemd) |
| `cocodrilo-server.js` | 🖥️ Servidor Node.js que expone API REST a PostgreSQL |
| `RESUMEN_IMPLEMENTACION.md` | 📋 Este archivo |

---

## Cómo Usar

### Paso 1: Setup en VPS (una sola vez)
Ver `SETUP_POSTGRESQL.md` para:
1. Crear tabla `cocodrilo_movimientos` en PostgreSQL
2. Instalar servidor Node.js (`cocodrilo-server.js`)
3. Configurar Traefik reverse proxy
4. Crear servicio systemd para que corra siempre

### Paso 2: Configurar en la App
1. Abrir `index.html` en dispositivo/browser
2. Ir a **Ajustes** (ícono ⚙️)
3. Completa "API PostgreSQL": `https://cocodrilo.automatizameuy.com/api`
4. Hacer clic en **Guardar ajustes**
5. Verificar que aparezca ✓ verde + 🗄️ en header

### Paso 3: Usar Normalmente
- Crear gastos/ingresos/vencimientos como siempre
- Todos se guardan en PostgreSQL automáticamente
- Los datos persisten incluso si cierras la app
- Si no hay conexión → fallback a localStorage (se sincroniza cuando vuelve)

---

## Estructura de la Tabla `cocodrilo_movimientos`

```sql
cocodrilo_movimientos
├── id (TEXT PRIMARY KEY) — ID único del movimiento
├── tipo (TEXT) — 'gasto' | 'ingreso' | 'vencimiento'
├── descripcion (TEXT) — Ej: "Supermercado"
├── categoria (TEXT) — Ej: "Comida", "Transporte", etc.
├── monto (DECIMAL) — Cantidad del movimiento
├── moneda (TEXT) — 'UYU' | 'USD'
├── fecha (DATE) — Cuándo ocurrió
├── fechaVenc (DATE) — Vencimiento (solo para tipo 'vencimiento')
├── pagado (BOOLEAN) — Si ya se pagó
├── created_at (TIMESTAMP) — Cuándo se creó
└── updated_at (TIMESTAMP) — Última actualización
```

**Ubicación:** Base `automatizacion1` en PostgreSQL del VPS (container `automatizacion1_data-base-n8n`).

---

## Logs para Debugging

Abre DevTools (F12) y ve la consola:

```
[PostgreSQL] Conectado
[PostgreSQL] Error al obtener datos: "Network error"
[PostgreSQL] Error al guardar: "Connection timeout"
```

O en el VPS:
```bash
systemctl logs -u cocodrilo -f
```

---

## Ventajas de Esta Arquitectura

| Ventaja | Por qué importa |
|---|---|
| **Fallback offline** | Funciona incluso si internet se corta |
| **Sincronización automática** | No hay que hacer nada manualmente |
| **Sin frameworks pesados** | Code limpio, vanilla JavaScript |
| **PostgreSQL real** | Datos en servidor, no solo en el teléfono |
| **Escalable** | Fácil agregar más features en la BD |
| **Seguro** | RLS policies protegen datos por usuario |

---

## Próximas Mejoras (Opcionales)

1. **Autenticación real** — cambiar de anónima a email/password
2. **Exportar datos** — agregar botón para descargar historial en CSV
3. **Backups periódicos** — automáticos a Google Drive
4. **Analytics** — gráficos de tendencias de gastos
5. **Compartir datos** — entre usuarios (familias, equipos)

---

## Contacto / Preguntas

Si algo no funciona:
1. Ejecutar `TEST_SUPABASE.html` para validar
2. Ver logs en consola (F12)
3. Revisar `CONFIGURACION_SUPABASE.md` para SQL/credenciales

---

**✅ Implementación completada — 2026-04-20**

Creado por: Claude Code con instrucciones de Seba Agradeno
Tecnología: Supabase + JavaScript vanilla + Anthropic Claude (IA)
