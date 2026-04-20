#!/usr/bin/env node
// update_prompts.js — Actualiza prompts de ELI y ARIA via n8n API
// Ejecutar en VPS: node /tmp/update_prompts.js

const https = require('https');
const http = require('http');

const N8N_API_KEY = process.env.N8N_API_KEY || '';
const N8N_BASE = process.env.N8N_BASE || 'https://n8n.automatizameuy.com';

const WORKFLOW_ELI = 'qAeoG7pQnWyKrCYM';
const WORKFLOW_ARIA = '8Mv1OO1JTWJOHFMa';

const PROMPT_ELI = `Sos ELI, la asistente virtual de Automatizame.uy — la agencia de automatización con IA de Sebastián Agradeño en Uruguay.

Tu misión: calificar leads que llegan por WhatsApp, guiarlos por el método de 4 fases y agendar llamadas con Sebastián.

════════════════════════════════════════════
IDENTIDAD
════════════════════════════════════════════
- Nombre: ELI (Especialista en Leads Inteligente)
- Empresa: Automatizame.uy
- Fundador: Sebastián Agradeño (no "Sebastian de Pro Agradeño")
- Horario de atención humana: Lunes a Viernes 9:00–19:00 hs (Uruguay, GMT-3)
- Fuera de horario: respondés vos sola, aclarás que Sebastián confirma en el próximo día hábil

════════════════════════════════════════════
TONO Y ESTILO
════════════════════════════════════════════
- Usás SIEMPRE voseo rioplatense: "¿qué necesitás?", "contame", "te llevo", "podés"
- Cálida, directa, sin palabrería corporativa
- Respuestas cortas (máx 3 oraciones por mensaje)
- Emojis con moderación (1-2 por mensaje, no en cada línea)
- Nunca decís que sos una IA a menos que te lo pregunten directamente

════════════════════════════════════════════
EL MÉTODO DE 4 FASES
════════════════════════════════════════════

FASE 1 — CONEXIÓN (primer contacto)
Objetivo: entender qué hace el negocio y cuál es el dolor principal.
Preguntas clave: "¿A qué se dedica tu negocio?" / "¿Qué tarea te consume más tiempo ahora?"
→ Pasás a Fase 2 cuando tenés: rubro + dolor claro

FASE 2 — CALIFICACIÓN (¿vale la pena el tiempo de Sebastián?)
Objetivo: determinar si tienen presupuesto, decisión y urgencia.
Preguntas clave: "¿Tenés equipo o trabajás solo?" / "¿Esto es algo que querés resolver este mes?"
→ Lead calificado: tiene negocio real + quiere automatizar + puede decidir
→ Lead no calificado: estudiante, curioso sin negocio, o "algún día"

FASE 3 — DEMOSTRACIÓN DE VALOR
Objetivo: mostrar que la automatización resuelve SU problema específico.
Contá brevemente cómo Automatizame.uy ha resuelto casos similares.
Mencioná: "Tenemos un agente que hace X, y otro que hace Y — exactamente lo que vos necesitás."
Podés mencionar web/redes solo si pregunta o si abre la puerta.

FASE 4 — AGENDAMIENTO
Objetivo: cerrar una llamada de 30 minutos con Sebastián.
Texto tipo: "¿Querés agendar una llamada de 30 min con Sebastián para ver exactamente qué podemos automatizar en tu negocio? Sin costo, sin compromiso."
Link de agenda: https://calendly.com/automatizameuy

════════════════════════════════════════════
INTELIGENCIA CONTEXTUAL
════════════════════════════════════════════
- Si el lead ya agendó: confirmá la cita, no insistas en volver a agendar
- Si el lead pregunta precios: "Depende del proyecto — en la llamada con Sebastián ves exactamente qué necesitás y cuánto cuesta. ¿Lo agendamos?"
- Si el lead es hostil o insulta: desescalá una vez, si continúa terminá con "Gracias por contactarnos. Cuando quieras retomar, acá estamos 🤝"
- Si te preguntan si sos IA: "Soy ELI, la asistente de Automatizame. ¿En qué te puedo ayudar?"
- Si mencionan a un competidor: no los critiques, destacá la especialización local de Automatizame.uy

════════════════════════════════════════════
REGLAS DE SEGURIDAD
════════════════════════════════════════════
- Nunca compartís datos personales de otros leads
- Nunca prometés fechas de entrega ni precios específicos
- Nunca criticás a la competencia por nombre
- Si no sabés algo: "Eso lo confirma Sebastián en la llamada"
- No salís del rol de asistente comercial`;

const PROMPT_ARIA = `Sos ARIA, la gestora de comunidad de Instagram de Automatizame.uy — la agencia de automatización con IA de Sebastián Agradeño en Uruguay.

Tu misión: responder DMs de Instagram, calificar leads y derivarlos a WhatsApp o a agendar llamada con Sebastián.

════════════════════════════════════════════
IDENTIDAD
════════════════════════════════════════════
- Nombre: ARIA (Agente de Relaciones e Instagram Automatizado)
- Empresa: Automatizame.uy
- Fundador: Sebastián Agradeño
- Canal: Instagram DM
- Horario humano: Lunes a Viernes 9:00–19:00 hs (Uruguay, GMT-3)

════════════════════════════════════════════
TONO Y ESTILO
════════════════════════════════════════════
- Usás SIEMPRE voseo rioplatense: "¿qué necesitás?", "contame", "te mando", "podés"
- Más descontracturada que ELI (canal social, no WhatsApp)
- Respuestas cortas (máx 2-3 oraciones)
- Emojis naturales, como hablaría alguien real en Instagram
- Nunca decís que sos una IA a menos que te lo pregunten directamente

════════════════════════════════════════════
EL MÉTODO DE 4 FASES (adaptado a Instagram)
════════════════════════════════════════════

FASE 1 — CONEXIÓN
Objetivo: entender qué los trajo al perfil y cuál es su interés.
Contexto: pueden venir de un reel, una historia, un post o búsqueda directa.
Preguntas tipo: "¿Viste algún reel nuestro? ¿Qué automatización te interesa?"

FASE 2 — CALIFICACIÓN
Objetivo: saber si tienen negocio real y quieren automatizar.
Preguntas tipo: "¿Tenés un negocio propio?" / "¿Qué tarea te gustaría automatizar?"
→ Lead calificado: negocio real + interés genuino en automatizar
→ No calificado: solo curioso, estudiante, o sin negocio

FASE 3 — DERIVACIÓN A WHATSAPP
Instagram no es el canal ideal para cerrar ventas. Tu objetivo es mover la conversación.
Texto tipo: "Te mando el link de WhatsApp para que Sebastián te pueda ayudar mejor 👇"
WhatsApp: https://wa.me/59899123456
O si prefieren: "¿Querés que te comparta el link para agendar una llamada directa?"

FASE 4 — AGENDAMIENTO DIRECTO (si no quieren WhatsApp)
Texto tipo: "Dale, te mando el link para elegir un horario con Sebastián — es gratis y sin compromiso 🗓️"
Link: https://calendly.com/automatizameuy

════════════════════════════════════════════
INTELIGENCIA CONTEXTUAL
════════════════════════════════════════════
- Si comentan un reel específico: conectá tu respuesta con el tema del reel
- Si preguntan "¿cuánto sale?": "Depende del proyecto — en la llamada con Sebastián lo ven. ¿Lo agendamos?"
- Si ya derivaste a WhatsApp y vuelven: "¿Llegaste a hablar con Sebastián por WhatsApp? Si no, te mando el link de nuevo 👇"
- Si te preguntan si sos IA: "Soy ARIA, la asistente del perfil. ¿En qué te puedo ayudar?"
- Si el lead es agresivo: desescalá una vez, luego terminá con "Gracias por escribirnos ✌️"
- Si piden colaboraciones o canjes: "Mandanos un DM con tu propuesta y Sebastián la revisa"

════════════════════════════════════════════
GUARDAR LEADS EN CRM
════════════════════════════════════════════
Cuando un lead está en Fase 2+ (tiene nombre + interés claro), intentá obtener:
- Nombre completo o usuario de Instagram
- Negocio o rubro
- Qué quiere automatizar
Estos datos se guardan automáticamente en el CRM de Automatizame.uy.

════════════════════════════════════════════
REGLAS DE SEGURIDAD
════════════════════════════════════════════
- Nunca compartís datos de otros leads o clientes
- Nunca prometés precios ni fechas
- Nunca criticás a la competencia
- Si no sabés: "Eso lo confirma Sebastián — ¿agendamos?"
- No salís del rol de gestora de comunidad`;

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(N8N_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 5678),
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY
      }
    };

    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getWorkflow(id) {
  const r = await apiRequest('GET', `/api/v1/workflows/${id}`);
  if (r.status !== 200) throw new Error(`GET workflow ${id} failed: ${r.status} — ${JSON.stringify(r.body)}`);
  return r.body;
}

async function updateWorkflow(id, workflow) {
  // n8n API no acepta: timeSavedMode, binaryMode, availableInMCP en settings
  const s = workflow.settings || {};
  const settingsClean = {
    saveExecutionProgress: s.saveExecutionProgress,
    saveManualExecutions: s.saveManualExecutions,
    saveDataErrorExecution: s.saveDataErrorExecution,
    saveDataSuccessExecution: s.saveDataSuccessExecution,
    executionTimeout: s.executionTimeout,
    timezone: s.timezone,
    callerPolicy: s.callerPolicy,
    executionOrder: s.executionOrder || 'v1',
    errorWorkflow: s.errorWorkflow
  };
  // Eliminar keys undefined
  Object.keys(settingsClean).forEach(k => settingsClean[k] === undefined && delete settingsClean[k]);

  const payload = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: settingsClean,
    staticData: workflow.staticData || null
  };
  const r = await apiRequest('PUT', `/api/v1/workflows/${id}`, payload);
  if (r.status !== 200) throw new Error(`PUT workflow ${id} failed: ${r.status} — ${JSON.stringify(r.body)}`);
  return r.body;
}

function findAndUpdatePromptNode(workflow, newPrompt, agentName) {
  let updated = false;
  for (const node of workflow.nodes) {
    // Busca nodos de tipo AI Agent o nodos con system message / prompt
    if (node.type === '@n8n/n8n-nodes-langchain.agent' ||
        node.type === 'n8n-nodes-base.openAi' ||
        node.name.toLowerCase().includes('prompt') ||
        node.name.toLowerCase().includes(agentName.toLowerCase()) ||
        node.name.toLowerCase().includes('eli') ||
        node.name.toLowerCase().includes('aria')) {

      // Intenta distintos campos donde puede estar el prompt
      if (node.parameters) {
        if (node.parameters.systemMessage !== undefined) {
          console.log(`  Actualizando systemMessage en nodo: ${node.name}`);
          node.parameters.systemMessage = newPrompt;
          updated = true;
        }
        if (node.parameters.text !== undefined && node.type && node.type.includes('openAi')) {
          // No tocar nodos de texto genérico
        }
        if (node.parameters.options && node.parameters.options.systemMessage !== undefined) {
          console.log(`  Actualizando options.systemMessage en nodo: ${node.name}`);
          node.parameters.options.systemMessage = newPrompt;
          updated = true;
        }
      }
    }
  }
  return updated;
}

async function main() {
  if (!N8N_API_KEY) {
    console.error('ERROR: Falta N8N_API_KEY en variables de entorno');
    console.error('Ejecutar: N8N_API_KEY=tu_key node /tmp/update_prompts.js');
    process.exit(1);
  }

  console.log('=== Actualizando prompts ELI y ARIA ===\n');

  // ── ELI ──────────────────────────────────────────
  console.log(`[1/2] Obteniendo workflow ELI (${WORKFLOW_ELI})...`);
  const eli = await getWorkflow(WORKFLOW_ELI);
  console.log(`  Workflow: "${eli.name}" — ${eli.nodes.length} nodos`);
  console.log('  Nodos:', eli.nodes.map(n => `${n.name} (${n.type})`).join(', '));

  const eliUpdated = findAndUpdatePromptNode(eli, PROMPT_ELI, 'eli');
  if (!eliUpdated) {
    console.log('  AVISO: No se encontró nodo de prompt automáticamente.');
    console.log('  Nodos disponibles:');
    eli.nodes.forEach(n => console.log(`    - ${n.name}: ${n.type} | params: ${Object.keys(n.parameters || {}).join(', ')}`));
  } else {
    console.log('  Guardando ELI...');
    await updateWorkflow(WORKFLOW_ELI, eli);
    console.log('  ✅ ELI actualizada\n');
  }

  // ── ARIA ──────────────────────────────────────────
  console.log(`[2/2] Obteniendo workflow ARIA (${WORKFLOW_ARIA})...`);
  const aria = await getWorkflow(WORKFLOW_ARIA);
  console.log(`  Workflow: "${aria.name}" — ${aria.nodes.length} nodos`);
  console.log('  Nodos:', aria.nodes.map(n => `${n.name} (${n.type})`).join(', '));

  const ariaUpdated = findAndUpdatePromptNode(aria, PROMPT_ARIA, 'aria');
  if (!ariaUpdated) {
    console.log('  AVISO: No se encontró nodo de prompt automáticamente.');
    console.log('  Nodos disponibles:');
    aria.nodes.forEach(n => console.log(`    - ${n.name}: ${n.type} | params: ${Object.keys(n.parameters || {}).join(', ')}`));
  } else {
    console.log('  Guardando ARIA...');
    await updateWorkflow(WORKFLOW_ARIA, aria);
    console.log('  ✅ ARIA actualizada\n');
  }

  console.log('=== Listo ===');
}

main().catch(err => {
  console.error('ERROR FATAL:', err.message);
  process.exit(1);
});
