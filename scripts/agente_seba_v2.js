#!/usr/bin/env node
const { execSync } = require('child_process');
const https = require('https');

const instruccion = process.argv[2] || '';
const chatId = process.argv[3] || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '';
const DB = 'automatizacion1_data-base-n8n.1.5rmh7n97cz90p6gxks9hv195w';

const TOOLS = {
  listar_workflows: () => {
    const result = execSync(
      `docker exec ${DB} psql -U postgres -d automatizacion1 -t -c "SELECT name, active FROM workflow_entity ORDER BY active DESC, name ASC;"`,
      { encoding: 'utf8', timeout: 10000 }
    );
    const lines = result.trim().split('\n').filter(l => l.trim());
    const activos = lines.filter(l => l.includes('| t')).map(l => '✅ ' + l.split('|')[0].trim());
    const inactivos = lines.filter(l => l.includes('| f')).map(l => '⭕ ' + l.split('|')[0].trim());
    return `ACTIVOS (${activos.length}):\n${activos.join('\n')}\n\nINACTIVOS (${inactivos.length}):\n${inactivos.slice(0,5).join('\n')}${inactivos.length > 5 ? `\n...y ${inactivos.length-5} mas` : ''}`;
  },

  activar_workflow: (nombre) => {
    execSync(
      `docker exec ${DB} psql -U postgres -d automatizacion1 -t -c "UPDATE workflow_entity SET active = true WHERE name ILIKE '%${nombre}%';"`,
      { encoding: 'utf8', timeout: 10000 }
    );
    return `Workflow activado: ${nombre}`;
  },

  desactivar_workflow: (nombre) => {
    execSync(
      `docker exec ${DB} psql -U postgres -d automatizacion1 -t -c "UPDATE workflow_entity SET active = false WHERE name ILIKE '%${nombre}%';"`,
      { encoding: 'utf8', timeout: 10000 }
    );
    return `Workflow desactivado: ${nombre}`;
  },

  ver_leads: () => {
    const result = execSync(
      `docker exec ${DB} psql -U postgres -d automatizacion1 -t -c "SELECT nombre, whatsapp, estado, canal_origen, created_at::date FROM clientes ORDER BY created_at DESC LIMIT 10;"`,
      { encoding: 'utf8', timeout: 10000 }
    );
    return result.trim() || 'Sin leads todavia';
  },

  estado_servidor: () => {
    const containers = execSync('docker ps --format "{{.Names}} | {{.Status}}"', { encoding: 'utf8', timeout: 5000 });
    const mem = execSync("free -h | grep Mem | awk '{print $3 \"/\" $2}'", { encoding: 'utf8', timeout: 5000 });
    const lines = containers.trim().split('\n').map(l => {
      const name = l.split('|')[0].trim().replace('automatizacion1_','').replace(/\.[0-9]\..*/,'');
      return (l.includes('Up') ? '✅' : '❌') + ' ' + name;
    });
    return lines.join('\n') + '\n\nRAM: ' + mem.trim();
  },

  reiniciar_n8n: () => {
    execSync('docker service update --force automatizacion1_n8n', { encoding: 'utf8', timeout: 30000 });
    return 'n8n reiniciado';
  }
};

const SYSTEM_PROMPT = `Sos el asistente de Seba de Automatizame.uy. Recibis instrucciones y las convertis en acciones.

HERRAMIENTAS (responde con JSON exacto, sin texto extra):
- {"accion": "listar_workflows"}
- {"accion": "activar_workflow", "nombre": "parte del nombre"}
- {"accion": "desactivar_workflow", "nombre": "parte del nombre"}
- {"accion": "ver_leads"}
- {"accion": "estado_servidor"}
- {"accion": "reiniciar_n8n"}
- {"accion": "responder", "mensaje": "texto breve"}

Responde SOLO con el JSON. Sin explicaciones.`;

async function llamarGroq(instr) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: instr }
      ],
      temperature: 0.1,
      max_tokens: 200
    });
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).choices[0].message.content.trim()); }
        catch(e) { reject(new Error('Groq error: ' + data.substring(0,200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function enviarTelegram(cid, texto) {
  return new Promise((resolve) => {
    const textoLimpio = texto.substring(0, 4000);
    const body = JSON.stringify({ chat_id: cid, text: textoLimpio });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: '/bot' + TELEGRAM_TOKEN + '/sendMessage',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { console.log('TG:', d.substring(0,200)); resolve(); });
    });
    req.on('error', e => { console.error('TG error:', e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!instruccion) { console.log('falta instruccion'); process.exit(1); }
  try {
    const groqResp = await llamarGroq(instruccion);
    console.log('Groq:', groqResp);

    let accionJSON;
    try {
      const match = groqResp.match(/\{[\s\S]*\}/);
      accionJSON = JSON.parse(match ? match[0] : groqResp);
    } catch(e) {
      await enviarTelegram(chatId, 'No entendi: ' + groqResp.substring(0,200));
      process.exit(0);
    }

    const { accion, nombre, mensaje } = accionJSON;
    let resultado = '';

    if (accion === 'responder') {
      resultado = mensaje;
    } else if (TOOLS[accion]) {
      resultado = TOOLS[accion](nombre || '');
    } else {
      resultado = 'Accion desconocida: ' + accion;
    }

    const respuesta = '🤖 [' + accion + ']\n\n' + resultado;
    if (chatId && TELEGRAM_TOKEN) await enviarTelegram(chatId, respuesta);
    console.log(JSON.stringify({ ok: true, accion, resultado: resultado.substring(0,200) }));
  } catch(err) {
    const msg = 'Error: ' + err.message;
    if (chatId && TELEGRAM_TOKEN) await enviarTelegram(chatId, msg);
    console.error(msg);
    process.exit(1);
  }
}

main();
