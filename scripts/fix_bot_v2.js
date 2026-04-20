// Ejecutar DENTRO del contenedor n8n:
// docker cp /root/fix_bot_v2.js automatizacion1_n8n.1.u7puijr09tprhvuexa8bw5nbg:/tmp/fix_bot_v2.js
// docker exec automatizacion1_n8n.1.u7puijr09tprhvuexa8bw5nbg node /tmp/fix_bot_v2.js

const http = require("http");

const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmN2Q4MjA4YS1jMDFlLTQwZDctODVlYS1lMTI4NjQ3NGM5OTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGFkMTJmMmQtNTk5NC00OTc5LWIzM2QtMWY2NTFhMTdhYTJiIiwiaWF0IjoxNzc2Mjc4MDA5fQ.FBPcUUMZUZyEC0zPRXLBC2m_RojBbRVAsK1wGzYdKFQ";
const GROQ_KEY = "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";
const TG_TOKEN = "8746380733:AAGTQHNhFdhGydLXijezQqT0kGYZlZfp1to";
const WF_ID = "3ZgiLLQCNb1yiFgC";

const SYSTEM_MSG = "Sos el asistente de Seba de Automatizame.uy. Respondé siempre en español, breve y directo. Sos experto en automatización con n8n, IA y negocios digitales.";

// Workflow actualizado: sin authentication en HTTP Request (usamos header directo)
const wf = {
  name: "Agente Seba Bot v2",
  settings: { executionOrder: "v1" },
  nodes: [
    {
      id: "trig1",
      name: "Telegram Trigger",
      type: "n8n-nodes-base.telegramTrigger",
      typeVersion: 1.1,
      position: [0, 300],
      webhookId: "agente-seba-final",
      credentials: {
        telegramApi: { id: "EMkuSuIvQQU1R3I0", name: "asistente personal11" }
      },
      parameters: {
        updates: ["message"],
        additionalFields: {}
      }
    },
    {
      id: "groq1",
      name: "Llamar Groq",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [260, 300],
      parameters: {
        method: "POST",
        url: "https://api.groq.com/openai/v1/chat/completions",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Authorization", value: "Bearer " + GROQ_KEY },
            { name: "Content-Type", value: "application/json" }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify({model:'llama-3.3-70b-versatile',messages:[{role:'system',content:'" + SYSTEM_MSG.replace(/'/g, "\\'") + "'},{role:'user',content:$json.message.text||'hola'}],max_tokens:300,temperature:0.3}) }}",
        options: {}
      }
    },
    {
      id: "tgsend1",
      name: "Responder Telegram",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [520, 300],
      credentials: {
        telegramApi: { id: "EMkuSuIvQQU1R3I0", name: "asistente personal11" }
      },
      parameters: {
        operation: "sendMessage",
        chatId: "={{ $('Telegram Trigger').first().json.message.chat.id }}",
        text: "={{ '🤖 ' + $('Llamar Groq').first().json.choices[0].message.content }}",
        additionalFields: {}
      }
    }
  ],
  connections: {
    "Telegram Trigger": {
      main: [[{ node: "Llamar Groq", type: "main", index: 0 }]]
    },
    "Llamar Groq": {
      main: [[{ node: "Responder Telegram", type: "main", index: 0 }]]
    }
  }
};

function call(path, method, data, cb) {
  const b = JSON.stringify(data);
  const req = http.request({
    hostname: "localhost",
    port: 5678,
    path,
    method,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(b),
      "X-N8N-API-KEY": KEY
    }
  }, res => {
    let d = "";
    res.on("data", c => d += c);
    res.on("end", () => {
      try { cb(JSON.parse(d)); }
      catch(e) { cb({ raw: d.substring(0, 300) }); }
    });
  });
  req.on("error", e => { console.error("HTTP error:", e.message); cb({ error: e.message }); });
  req.write(b);
  req.end();
}

console.log("Desactivando workflow...");
call("/api/v1/workflows/" + WF_ID + "/deactivate", "POST", {}, () => {
  console.log("Actualizando nodos del workflow...");
  call("/api/v1/workflows/" + WF_ID, "PUT", wf, r => {
    if (!r.id) {
      console.log("ERROR al actualizar:", JSON.stringify(r).substring(0, 400));
      return;
    }
    console.log("ACTUALIZADO ID:", r.id);
    call("/api/v1/workflows/" + r.id + "/activate", "POST", {}, r2 => {
      console.log("ACTIVO:", r2.active, "| ID:", r2.id || JSON.stringify(r2).substring(0, 100));
      console.log("\n✅ Bot actualizado. Enviá un mensaje a @asistentepersonal en Telegram.");
    });
  });
});
