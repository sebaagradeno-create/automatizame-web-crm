const http = require("http");
const { exec } = require("child_process");
const PORT = 3131;
const SECRET = "automatizame2026";
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", c => body += c);
  req.on("end", () => {
    const ts = new Date().toISOString();
    console.log("[" + ts + "] " + req.method + " | body: " + body.substring(0, 300));
    if (req.method !== "POST") { res.writeHead(405); res.end(); return; }
    let data;
    try { data = JSON.parse(body); } catch(e) {
      console.log("JSON error:", e.message, "| raw:", body.substring(0,100));
      res.writeHead(400); res.end("Bad JSON"); return;
    }
    if (data.secret !== SECRET) {
      console.log("Forbidden - secret incorrecto:", data.secret);
      res.writeHead(403); res.end("Forbidden"); return;
    }
    const instruccion = (data.instruccion || "hola").substring(0, 400);
    const chat_id = String(data.chat_id || "");
    console.log("Ejecutando para chat_id:", chat_id, "instruccion:", instruccion);
    const cmd = ["/root/agente-seba/run.sh", instruccion, chat_id];
    exec(cmd[0] + ' "' + cmd[1].replace(/"/g,'\\"') + '" "' + cmd[2] + '"', {timeout:30000}, (err,out,se) => {
      console.log("Resultado:", (out||se||"").substring(0,200));
      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ok:!err, resultado: out || se || ""}));
    });
  });
});
server.listen(PORT, "0.0.0.0", () => console.log("Agente Seba en :" + PORT));
