/**
 * TASK WATCHER — Conecta Telegram con Claude Code
 *
 * Corre en la PC de Seba. Lee tareas de agent_memory vía SSH y las muestra.
 * Flujo: ARIA (Telegram) → agent_memory → este script → Claude Code ejecuta
 *
 * Uso: node scripts/task_watcher.js
 */

const { spawnSync, execSync } = require('child_process');

const POLL_INTERVAL = 30000;
const AGENT_NAMES = ['ruflo', 'claude_code', 'antigravity'];
const DB_CONTAINER = 'automatizacion1_data-base-n8n.1.5rmh7n97cz90p6gxks9hv195w';
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8746380733:AAGTQHNhFdhGydLXijezQqT0kGYZlZfp1to';
const CHAT_ID = '5748737739';
const BASH = 'D:/Program Files/Git/bin/bash.exe';

// Pasa el SQL via stdin para evitar todos los problemas de escaping en Windows
function psql(sql) {
  const result = spawnSync('ssh', [
    'root@72.62.13.132',
    `docker exec -i ${DB_CONTAINER} psql -U postgres -d automatizacion1 -t`
  ], { input: sql, encoding: 'utf8', timeout: 15000 });

  if (result.status !== 0) {
    throw new Error(result.stderr || 'psql error');
  }
  return result.stdout.trim();
}

function checkPendingTasks() {
  const names = AGENT_NAMES.map(n => `'${n}'`).join(',');
  const result = psql(
    `SELECT id, agent_name, content, created_at FROM agent_memory WHERE context_type = 'tarea_pendiente' AND agent_name IN (${names}) ORDER BY created_at ASC LIMIT 5;`
  );
  if (!result) return [];
  return result.split('\n').filter(l => l.trim()).map(line => {
    const parts = line.split('|').map(p => p.trim());
    return { id: parts[0], agent_name: parts[1], content: parts[2], created_at: parts[3] };
  });
}

function markInProcess(id) {
  psql(`UPDATE agent_memory SET context_type = 'tarea_en_proceso' WHERE id = ${id};`);
}

function markCompleted(id) {
  psql(`UPDATE agent_memory SET context_type = 'tarea_completada', updated_at = NOW() WHERE id = ${id};`);
}

function notifyTelegram(msg) {
  try {
    const body = JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'Markdown' });
    execSync(
      `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" -H "Content-Type: application/json" -d '${body.replace(/'/g, "'\\''")}'`,
      { stdio: 'pipe', timeout: 10000, shell: BASH }
    );
  } catch (e) {
    console.log('⚠️ Telegram:', e.message);
  }
}

function poll() {
  try {
    const tasks = checkPendingTasks();
    if (tasks.length === 0) return;

    console.log(`\n🔔 ${tasks.length} tarea(s) nueva(s) desde Telegram!\n`);

    for (const task of tasks) {
      if (!task.id || !task.content) continue;

      console.log('═'.repeat(60));
      console.log(`📋 TAREA #${task.id} | Agente: ${task.agent_name}`);
      console.log('═'.repeat(60));
      console.log(task.content);
      console.log('═'.repeat(60));
      console.log(`\n💡 Ejecutá en Claude Code:`);
      console.log(`   claude "${task.content.substring(0, 120).replace(/"/g, "'")}"`);
      console.log('');

      markInProcess(task.id);
      notifyTelegram(`✅ *Tarea #${task.id} recibida en la PC*\n\n${task.content.substring(0, 300)}`);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

function main() {
  console.log('🤖 TASK WATCHER — Automatizame.uy');
  console.log(`📡 Revisando tareas cada ${POLL_INTERVAL / 1000}s vía SSH...`);
  console.log('📱 Las tareas de Telegram aparecerán aquí.\n');
  console.log('🟢 Watcher activo. Ctrl+C para detener.\n');

  poll();
  setInterval(poll, POLL_INTERVAL);
}

process.on('SIGINT', () => {
  console.log('\n👋 Watcher detenido.');
  process.exit(0);
});

main();
