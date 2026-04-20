// Ejecutar en el servidor: node /root/agente-seba/crear_bot_workflow.js
const http = require("http");

const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmN2Q4MjA4YS1jMDFlLTQwZDctODVlYS1lMTI4NjQ3NGM5OTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGFkMTJmMmQtNTk5NC00OTc5LWIzM2QtMWY2NTFhMTdhYTJiIiwiaWF0IjoxNzc2Mjc4MDA5fQ.FBPcUUMZUZyEC0zPRXLBC2m_RojBbRVAsK1wGzYdKFQ";
const GROQ_KEY = "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";
const TG_TOKEN = "8746380733:AAGTQHNhFdhGydLXijezQqT0kGYZlZfp1to";
const OLD_WF_ID = "jmKRC1tyTsW15MXX";

// Este es el código que correrá DENTRO del nodo Code de n8n
const codeParaN8n = `
const https = require('https');
const instruccion = $input.first().json.message?.text || 'hola';
const chatId = String($input.first().json.message?.chat?.id || '');

const GROQ_KEY = '${GROQ_KEY}';
const TG_TOKEN = '${TG_TOKEN}';

const systemMsg = 'Sos el asistente de Seba de Automatizame.uy. Respondé siempre en español, breve y directo. Sos experto en automatización con n8n, IA y negocios digitales. Si te preguntan sobre workflows o leads decí que ejecutás desde el servidor de la agencia.';

const groqBody = JSON.stringify({
  model: 'llama-3.3-70b-versatile',
  messages: [
    { role: 'system', content: systemMsg },
    { role: 'user', content: instruccion }
  ],
  max_tokens: 300,
  temperature: 0.3
});

return new Promise((resolve) => {
  const req = https.request({
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + GROQ_KEY,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(groqBody)
    }
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      let respuesta = 'No pude procesar tu mensaje.';
      try {
        respuesta = JSON.parse(data).choices[0].message.content;
      } catch(e) {
        respuesta = 'Error: ' + data.substring(0, 100);
      }
      const tgBody = JSON.stringify({ chat_id: chatId, text: '🤖 ' + respuesta });
      const req2 = https.request({
        hostname: 'api.telegram.org',
        path: '/bot' + TG_TOKEN + '/sendMessage',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(tgBody) }
      }, () => resolve([{ json: { ok: true, respuesta } }]));
      req2.on('error', e => resolve([{ json: { ok: false, error: e.message } }]));
      req2.write(tgBody);
      req2.end();
    });
  });
  req.on('error', e => resolve([{ json: { ok: false, error: e.message } }]));
  req.write(groqBody);
  req.end();
});
`;

const wf = {
  name: "Agente Seba Bot Telegram",
  settings: { executionOrder: "v1" },
  nodes: [
    {
      id: "t1", name: "Telegram Trigger",
      type: "n8n-nodes-base.telegramTrigger",
      typeVersion: 1.1, position: [0, 300],
      webhookId: "agente-seba-final",
      credentials: { telegramApi: { id: "EMkuSuIvQQU1R3I0", name: "asistente personal11" } },
      parameters: { updates: ["message"], additionalFields: {} }
    },
    {
      id: "c1", name: "Groq + Responder Telegram",
      type: "n8n-nodes-base.code",
      typeVersion: 2, position: [220, 300],
      parameters: { jsCode: codeParaN8n, mode: "runOnceForAllItems" }
    }
  ],
  connections: {
    "Telegram Trigger": { main: [[{ node: "Groq + Responder Telegram", type: "main", index: 0 }]] }
  }
};

function call(path, method, data, cb) {
  const b = JSON.stringify(data);
  const req = http.request({
    hostname: "localhost", port: 5678, path, method,
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(b), "X-N8N-API-KEY": KEY }
  }, res => {
    let d = ""; res.on("data", c => d += c);
    res.on("end", () => { try { cb(JSON.parse(d)); } catch(e) { cb({ raw: d.substring(0, 200) }); } });
  });
  req.on("error", e => console.error(e));
  req.write(b); req.end();
}

console.log("Desactivando workflow viejo...");
call("/api/v1/workflows/" + OLD_WF_ID + "/deactivate", "POST", {}, () => {
  call("/api/v1/workflows/" + OLD_WF_ID, "DELETE", {}, () => {
    console.log("Creando workflow nuevo...");
    call("/api/v1/workflows", "POST", wf, r => {
      if (!r.id) { console.log("ERR:", JSON.stringify(r).substring(0, 300)); return; }
      console.log("CREADO ID:", r.id);
      call("/api/v1/workflows/" + r.id + "/activate", "POST", {}, r2 => {
        console.log("ACTIVO:", r2.active, "| ID:", r2.id || JSON.stringify(r2).substring(0, 100));
      });
    });
  });
});
