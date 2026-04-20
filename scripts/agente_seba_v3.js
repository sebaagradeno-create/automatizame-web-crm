#!/usr/bin/env node
// agente_seba_v3.js — Coordinador + Técnico + CRM + Contenido
// Autor: Claude Code — Automatizame.uy — Abril 2026

const { execSync } = require('child_process');
const https = require('https');

const instruccion = process.argv[2] || '';
const chatId     = process.argv[3] || '';
const GROQ_KEY   = process.env.GROQ_API_KEY   || '';
const TG_TOKEN   = process.env.TELEGRAM_TOKEN || '';
const DB         = 'automatizacion1_data-base-n8n.1.5rmh7n97cz90p6gxks9hv195w';

// ─────────────────────────────────────────────────────────
// HERRAMIENTAS REALES
// ─────────────────────────────────────────────────────────

const TOOLS = {

  // ── TÉCNICO ──────────────────────────────────────────
  listar_workflows: () => {
    const r = execSync(`docker exec ${DB} psql -U postgres -d automatizacion1 -t -c "SELECT name, active FROM workflow_entity ORDER BY active DESC, name ASC;"`, { encoding:'utf8', timeout:10000 });
    const lines = r.trim().split('\n').filter(l => l.trim());
    const on  = lines.filter(l => l.includes('| t')).map(l => '✅ ' + l.split('|')[0].trim());
    const off = lines.filter(l => l.includes('| f')).map(l => '⭕ ' + l.split('|')[0].trim());
    return `ACTIVOS (${on.length}):\n${on.join('\n')}\n\nINACTIVOS (${off.length}):\n${off.slice(0,5).join('\n')}${off.length > 5 ? `\n...y ${off.length-5} mas` : ''}`;
  },

  activar_workflow: (nombre) => {
    execSync(`docker exec ${DB} psql -U postgres -d automatizacion1 -t -c "UPDATE workflow_entity SET active = true WHERE name ILIKE '%${nombre}%';"`, { encoding:'utf8', timeout:10000 });
    return `Workflow activado: ${nombre}`;
  },

  desactivar_workflow: (nombre) => {
    execSync(`docker exec ${DB} psql -U postgres -d automatizacion1 -t -c "UPDATE workflow_entity SET active = false WHERE name ILIKE '%${nombre}%';"`, { encoding:'utf8', timeout:10000 });
    return `Workflow desactivado: ${nombre}`;
  },

  estado_servidor: () => {
    const cs  = execSync('docker ps --format "{{.Names}} | {{.Status}}"', { encoding:'utf8', timeout:5000 });
    const mem = execSync("free -h | grep Mem | awk '{print $3 \"/\" $2}'", { encoding:'utf8', timeout:5000 });
    const lines = cs.trim().split('\n').map(l => {
      const name = l.split('|')[0].trim().replace('automatizacion1_','').replace(/\.[0-9]\..*/,'');
      return (l.includes('Up') ? '✅' : '❌') + ' ' + name;
    });
    return lines.join('\n') + '\n\nRAM: ' + mem.trim();
  },

  reiniciar_n8n: () => {
    execSync('docker service update --force automatizacion1_n8n', { encoding:'utf8', timeout:30000 });
    return 'n8n reiniciado. Tardá ~30s en volver.';
  },

  // ── CRM ──────────────────────────────────────────────
  ver_leads: (canal) => {
    const filtro = canal && canal !== 'todos' ? `AND canal_origen ILIKE '%${canal}%'` : '';
    const r = execSync(
      `docker exec ${DB} psql -U postgres -d automatizacion1 -t -c "SELECT nombre, whatsapp, estado, canal_origen, created_at::date FROM clientes WHERE 1=1 ${filtro} ORDER BY created_at DESC LIMIT 10;"`,
      { encoding:'utf8', timeout:10000 }
    );
    return r.trim() || 'Sin leads';
  },

  leads_sin_contactar: () => {
    const r = execSync(
      `docker exec ${DB} psql -U postgres -d automatizacion1 -t -c "SELECT nombre, whatsapp, canal_origen, created_at::date FROM clientes WHERE estado = 'nuevo' AND created_at < NOW() - INTERVAL '48 hours' ORDER BY created_at ASC;"`,
      { encoding:'utf8', timeout:10000 }
    );
    const txt = r.trim();
    return txt ? '⚠️ LEADS SIN CONTACTAR +48hs:\n' + txt : '✅ No hay leads sin contactar hace más de 48hs';
  },

  resumen_crm: () => {
    const r = execSync(
      `docker exec ${DB} psql -U postgres -d automatizacion1 -t -c "SELECT canal_origen, COUNT(*) as total FROM clientes GROUP BY canal_origen ORDER BY total DESC; SELECT estado, COUNT(*) FROM clientes GROUP BY estado ORDER BY count DESC;"`,
      { encoding:'utf8', timeout:10000 }
    );
    return 'LEADS POR CANAL Y ESTADO:\n' + r.trim();
  },

  // ── CONTENIDO ────────────────────────────────────────
  // Estos generan texto via Groq (segunda llamada)
  // Se ejecutan llamando a groqContenido()
};

// ─────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────

const PROMPT_COORDINADOR = `Sos el Coordinador del sistema de agentes de Automatizame.uy.
Recibís una instrucción de Seba (el CEO) y decidís qué acción ejecutar.

ACCIONES DISPONIBLES (respondé SOLO con JSON exacto):

TÉCNICO (servidor, n8n, docker):
{"agente":"tecnico","accion":"listar_workflows"}
{"agente":"tecnico","accion":"activar_workflow","nombre":"parte del nombre"}
{"agente":"tecnico","accion":"desactivar_workflow","nombre":"parte del nombre"}
{"agente":"tecnico","accion":"estado_servidor"}
{"agente":"tecnico","accion":"reiniciar_n8n"}

CRM (leads, clientes):
{"agente":"crm","accion":"ver_leads","canal":"whatsapp|instagram|web|todos"}
{"agente":"crm","accion":"leads_sin_contactar"}
{"agente":"crm","accion":"resumen_crm"}

CONTENIDO (posts, reels, historias, calendario):
{"agente":"contenido","accion":"generar_post","tema":"tema específico"}
{"agente":"contenido","accion":"generar_reel","tema":"tema específico"}
{"agente":"contenido","accion":"generar_historia","tema":"tema específico"}
{"agente":"contenido","accion":"calendario_semanal"}

RESPUESTA DIRECTA (saludos, preguntas simples):
{"agente":"responder","mensaje":"respuesta breve"}

REGLAS:
- Si menciona "workflow", "n8n", "servicio", "docker", "servidor" → tecnico
- Si menciona "lead", "cliente", "contacto", "CRM", "ventas", "sin contactar" → crm
- Si menciona "post", "reel", "historia", "story", "contenido", "publicación", "calendario" → contenido
- Si es un saludo o pregunta general → responder
- Si no entendés → {"agente":"responder","mensaje":"No entendí bien. ¿Podés ser más específico?"}
SOLO el JSON. Sin texto extra.`;

const PROMPT_CONTENIDO = `Sos el Agente de Contenido de Automatizame.uy.
Tu trabajo es generar contenido que Seba pueda producir solo, sin equipo, sin clientes todavía, usando solo su celular o grabación de pantalla con Xbox Game Bar (Win+Alt+R en Windows).

CONTEXTO DE NEGOCIO:
- Empresa: Automatizame.uy — agencia de automatización con IA, Uruguay
- CEO: Sebastián Agradeño — uruguayo, directo, experto real en automatización
- Etapa: lanzamiento — sin clientes públicos aún, pero con sistema propio funcionando
- Tono: profesional pero humano, español rioplatense (vos, che, dale, para nada)
- Diferenciador: muestra el sistema real propio como demostración — nadie más en Uruguay tiene esto

ESTRATEGIA DE CANALES (en orden de prioridad):
1. Reels de Instagram → alcance masivo a gente nueva (objetivo principal)
2. Posts carrusel → credibilidad con quienes ya te siguen
3. Historias → engagement y que escriban por DM
4. DM de Instagram → ARIA los recibe y deriva a WhatsApp
5. WhatsApp → ELI cualifica → demo agendada

REGLA DE ORO: El CTA depende del formato:
- Reels → "Escribime por DM si querés que armemos esto en tu negocio"
- Posts → "Guardá este post" o "¿Te pasa esto?" (engagement)
- Historias → "Respondé esta historia" o "Link en bio"
NO siempre mandar a WhatsApp directo — primero capturar en Instagram.

RECURSOS QUE SEBA TIENE PARA PRODUCIR:
- Xbox Game Bar (Win+Alt+R): graba pantalla en Windows, videos quedan en Videos/Capturas
- CapCut (gratis): editar el video, agregar textos encima, música
- El propio sistema funcionando: ELI en WhatsApp, ARIA en Instagram, bot Telegram, dashboard
- Celular para cara a cámara si quiere

REGLAS DE CONTENIDO:
- Sin casos de clientes reales todavía → usar el propio negocio como demostración
- Sin frases de marketing genéricas ("en el mundo actual...", "potenciá tu negocio...")
- Español rioplatense, no tuteo
- Directo al grano — el gancho en los primeros 3 segundos o se van
- SIEMPRE terminar preguntando aprobación: "¿Lo grabamos así o cambiás algo?"

FORMATO REEL — responder SIEMPRE con esta estructura exacta:

TEMA: [titulo del reel]
DURACION: [X segundos]

[GANCHO — 0 a 3s]
Texto en pantalla: "..."
Voz en off: "..." (o SILENCIO con musica)

[DESARROLLO — 3 a Xs]
Que grabar en pantalla: [descripcion exacta — que programa o web abrir, que hacer]
Texto slide 1: "..." (max 6 palabras)
Texto slide 2: "..."
(agregar slides segun duracion, corte cada 3-4 segundos)

[CTA — ultimos 5s]
Texto en pantalla: "Escribime por DM" o segun contexto
Voz: frase corta de cierre

PRODUCCION:
- Abrir antes de grabar: [lista exacta de lo que hay que abrir]
- Grabar con: Xbox Game Bar → Win+Alt+R para empezar, Win+Alt+R para parar
- Video queda en: Videos/Capturas en tu PC
- Editar en: CapCut → [instrucciones especificas de edicion]
- Musica: [estilo especifico sin letra, ej: "beat tecnologico suave"]
- Hashtags: [5 hashtags relevantes Uruguay/automatizacion]

FORMATO POST CARRUSEL (2do en importancia):
- Slide 1: Gancho — pregunta o afirmación (texto grande, fondo oscuro o imagen)
- Slides 2-4: Desarrollo — una idea por slide, texto corto
- Slide final: CTA + @automatizame_uy
- Herramienta sugerida: Canva (gratis) con plantilla oscura
- Caption: máx 100 palabras + 5 hashtags relevantes Uruguay

FORMATO HISTORIA (complementario):
- 3 slides máximo
- Slide 1: Pregunta o dato llamativo
- Slide 2: Respuesta o demostración
- Slide 3: CTA "Respondé" o "Swipe up" / link
- Duración: publicar martes y jueves tarde (18-21hs Uruguay)

CALENDARIO SEMANAL (cuando lo pidan):
Formato por día: DÍA | FORMATO | TEMA | QUÉ GRABAR | OBJETIVO
- Lunes: Reel (mejor día para alcance)
- Martes: Post carrusel
- Miércoles: Historia
- Jueves: Reel
- Viernes: Post carrusel
- Sábado: Historia
- Domingo: descanso
Frecuencia real: 3 veces bien > 7 veces mal. Empezar con lunes + jueves (reels) + un post.

TEMAS QUE FUNCIONAN SIN CASOS DE CLIENTES:
1. Demo en vivo del propio sistema (ELI, ARIA, bot Telegram) — el más poderoso
2. "¿Cuánto tiempo perdés haciendo X manual?" — el más viral
3. Antes/Después inventado con escenario real de negocio
4. Mitos de automatización ("es caro", "es complicado", "solo para empresas grandes")
5. Lo que hace el sistema mientras Seba duerme — mostrar dashboard real
6. Errores que cometen los negocios al responder WhatsApp tarde
TEMAS QUE FUNCIONAN SIN CASOS DE CLIENTES (ver lista completa arriba en el prompt)`;

// ─────────────────────────────────────────────────────────
// HTTP HELPERS
// ─────────────────────────────────────────────────────────

function groqCall(prompt, userMsg, maxTokens) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user',   content: userMsg }
      ],
      temperature: 0.15,
      max_tokens: maxTokens || 250
    });
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).choices[0].message.content.trim()); }
        catch(e) { reject(new Error('Groq error: ' + data.substring(0,300))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sendTelegram(cid, texto) {
  return new Promise((resolve) => {
    if (!cid || !TG_TOKEN) { resolve(); return; }
    const body = JSON.stringify({ chat_id: cid, text: texto.substring(0, 4096) });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: '/bot' + TG_TOKEN + '/sendMessage',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { console.log('TG:', d.substring(0, 150)); resolve(); });
    });
    req.on('error', e => { console.error('TG error:', e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────

async function main() {
  if (!instruccion) { console.log('falta instruccion'); process.exit(1); }

  try {
    // PASO 1: Coordinador decide qué hacer
    const routerResp = await groqCall(PROMPT_COORDINADOR, instruccion, 200);
    console.log('Router:', routerResp);

    let accion;
    try {
      const match = routerResp.match(/\{[\s\S]*\}/);
      accion = JSON.parse(match ? match[0] : routerResp);
    } catch(e) {
      await sendTelegram(chatId, 'No entendi: ' + routerResp.substring(0, 200));
      process.exit(0);
    }

    const { agente, accion: tool, nombre, canal, tema, mensaje } = accion;
    let resultado = '';

    // PASO 2: Ejecutar según agente
    if (agente === 'responder') {
      resultado = mensaje || 'Hola';

    } else if (agente === 'tecnico') {
      if (TOOLS[tool]) {
        resultado = TOOLS[tool](nombre || canal || '');
      } else {
        resultado = 'Herramienta tecnica no encontrada: ' + tool;
      }

    } else if (agente === 'crm') {
      if (TOOLS[tool]) {
        resultado = TOOLS[tool](canal || nombre || '');
      } else {
        resultado = 'Herramienta CRM no encontrada: ' + tool;
      }

    } else if (agente === 'contenido') {
      // PASO 2b: Segunda llamada a Groq para generar el contenido
      let promptContenido = '';
      if (tool === 'generar_post') {
        promptContenido = `Generá un POST de Instagram sobre este tema: "${tema || instruccion}". Seguí el formato POST del sistema.`;
      } else if (tool === 'generar_reel') {
        promptContenido = `Generá un guion de REEL (video corto) sobre este tema: "${tema || instruccion}". Seguí el formato REEL del sistema.`;
      } else if (tool === 'generar_historia') {
        promptContenido = `Generá una HISTORIA (story) sobre este tema: "${tema || instruccion}". Seguí el formato HISTORIA del sistema.`;
      } else if (tool === 'calendario_semanal') {
        promptContenido = `Generá el CALENDARIO SEMANAL de contenido para Automatizame.uy. Seguí el formato CALENDARIO SEMANAL del sistema.`;
      } else {
        promptContenido = `Ayudá con esta tarea de contenido: "${instruccion}"`;
      }

      console.log('Generando contenido para:', tool);
      resultado = await groqCall(PROMPT_CONTENIDO, promptContenido, 800);

    } else {
      resultado = 'Agente desconocido: ' + agente;
    }

    // PASO 3: Formatear y enviar
    const emojis = { tecnico:'🔧', crm:'📊', contenido:'✍️', responder:'🤖' };
    const emoji = emojis[agente] || '🤖';
    const header = agente !== 'responder' ? `${emoji} [${agente}/${tool}]\n\n` : '';
    const respuesta = header + resultado;

    await sendTelegram(chatId, respuesta);
    console.log(JSON.stringify({ ok: true, agente, tool, chars: resultado.length }));

  } catch(err) {
    const msg = 'Error: ' + err.message;
    if (chatId && TG_TOKEN) await sendTelegram(chatId, msg);
    console.error(msg);
    process.exit(1);
  }
}

main();
