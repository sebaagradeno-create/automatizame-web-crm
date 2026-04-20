// Ejecutar DENTRO del contenedor n8n:
// docker cp /root/crear_bot_v2.js automatizacion1_n8n.1.u7puijr09tprhvuexa8bw5nbg:/tmp/crear_bot_v2.js
// docker exec automatizacion1_n8n.1.u7puijr09tprhvuexa8bw5nbg node /tmp/crear_bot_v2.js

const http = require("http");

const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmN2Q4MjA4YS1jMDFlLTQwZDctODVlYS1lMTI4NjQ3NGM5OTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGFkMTJmMmQtNTk5NC00OTc5LWIzM2QtMWY2NTFhMTdhYTJiIiwiaWF0IjoxNzc2Mjc4MDA5fQ.FBPcUUMZUZyEC0zPRXLBC2m_RojBbRVAsK1wGzYdKFQ";
const GROQ_KEY = "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";
const TG_TOKEN = "8746380733:AAGTQHNhFdhGydLXijezQqT0kGYZlZfp1to";

// IDs de workflows anteriores a eliminar (si existen)
const OLD_IDS = ["jmKRC1tyTsW15MXX", "FgNqzg6wqYRzVfjv"];

const SYSTEM_MSG = "Sos el asistente de Seba de Automatizame.uy. Respondé siempre en español, breve y directo. Sos experto en automatización con n8n, IA y negocios digitales. Si te preguntan sobre workflows o leads decí que ejecutás desde el servidor de la agencia.";

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
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "Authorization",
              value: "Bearer " + GROQ_KEY
            }
          ]
        },
        sendBody: true,
        contentType: "json",
        bodyParameters: {
          parameters: [
            { name: "model", value: "llama-3.3-70b-versatile" },
            {
              name: "messages",
              value: "={{ [{role:'system',content:'" + SYSTEM_MSG.replace(/'/g, "\\'") + "'},{role:'user',content:$json.message.text||'hola'}] }}"
            },
            { name: "max_tokens", value: "={{ 300 }}" },
            { name: "temperature", value: "={{ 0.3 }}" }
          ]
        },
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
        text: "={{ '🤖 ' + $json.choices[0].message.content }}",
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

function deleteOld(ids, done) {
  if (!ids.length) return done();
  const id = ids[0];
  console.log("Desactivando y eliminando workflow:", id);
  call("/api/v1/workflows/" + id + "/deactivate", "POST", {}, () => {
    call("/api/v1/workflows/" + id, "DELETE", {}, r => {
      console.log("Eliminado", id, "->", JSON.stringify(r).substring(0, 80));
      deleteOld(ids.slice(1), done);
    });
  });
}

deleteOld(OLD_IDS, () => {
  console.log("Creando workflow nuevo con nodos nativos...");
  call("/api/v1/workflows", "POST", wf, r => {
    if (!r.id) {
      console.log("ERROR al crear:", JSON.stringify(r).substring(0, 400));
      return;
    }
    console.log("CREADO ID:", r.id);
    call("/api/v1/workflows/" + r.id + "/activate", "POST", {}, r2 => {
      console.log("ACTIVO:", r2.active, "| ID:", r2.id || JSON.stringify(r2).substring(0, 100));
      console.log("\n✅ Bot listo. Enviá un mensaje a @asistentepersonal en Telegram.");
    });
  });
});
