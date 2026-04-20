// Ejecutar DENTRO del contenedor n8n:
// docker cp /root/conectar_agente_real.js automatizacion1_n8n.1.u7puijr09tprhvuexa8bw5nbg:/tmp/conectar_agente_real.js
// docker exec automatizacion1_n8n.1.u7puijr09tprhvuexa8bw5nbg node /tmp/conectar_agente_real.js

const http = require("http");

const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmN2Q4MjA4YS1jMDFlLTQwZDctODVlYS1lMTI4NjQ3NGM5OTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZGFkMTJmMmQtNTk5NC00OTc5LWIzM2QtMWY2NTFhMTdhYTJiIiwiaWF0IjoxNzc2Mjc4MDA5fQ.FBPcUUMZUZyEC0zPRXLBC2m_RojBbRVAsK1wGzYdKFQ";
const WF_ID = "3ZgiLLQCNb1yiFgC";

// El workflow ahora hace:
// 1. Telegram Trigger → recibe mensaje de Seba
// 2. HTTP Request → POST a 172.17.0.1:3131 (agente_seba.js en el VPS)
//    El agente llama a Groq con tools reales y responde por Telegram directamente
// El nodo Telegram de n8n ya no es necesario porque el agente envía la respuesta él mismo

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
      id: "agente1",
      name: "Llamar Agente Seba",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [260, 300],
      parameters: {
        method: "POST",
        url: "http://172.17.0.1:3131",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Content-Type", value: "application/json" }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify({secret:'automatizame2026',instruccion:$json.message.text||'hola',chat_id:String($json.message.chat.id)}) }}",
        options: {
          timeout: 35000
        }
      }
    }
  ],
  connections: {
    "Telegram Trigger": {
      main: [[{ node: "Llamar Agente Seba", type: "main", index: 0 }]]
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
  console.log("Actualizando workflow para usar agente real...");
  call("/api/v1/workflows/" + WF_ID, "PUT", wf, r => {
    if (!r.id) {
      console.log("ERROR:", JSON.stringify(r).substring(0, 400));
      return;
    }
    console.log("ACTUALIZADO ID:", r.id);
    call("/api/v1/workflows/" + r.id + "/activate", "POST", {}, r2 => {
      console.log("ACTIVO:", r2.active, "| ID:", r2.id || JSON.stringify(r2).substring(0, 100));
      console.log("\n✅ Bot conectado al agente real. Enviá un mensaje a @asistentepersonal.");
    });
  });
});
