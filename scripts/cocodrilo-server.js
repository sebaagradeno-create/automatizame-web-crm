#!/usr/bin/env node

/**
 * Servidor PostgreSQL para App Cocodrilo
 * Corre en VPS y expone API REST para CRUD de movimientos
 *
 * Usar: node cocodrilo-server.js
 * Puerto: 4042 (por defecto)
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4042;

// ===== CONFIG =====
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DB || 'automatizacion1',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'cocodrilo-server' });
});

// ===== CREAR TABLA (una vez) =====
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cocodrilo_movimientos (
        id TEXT PRIMARY KEY,
        tipo TEXT CHECK (tipo IN ('gasto', 'ingreso', 'vencimiento')),
        descripcion TEXT NOT NULL,
        categoria TEXT,
        monto DECIMAL(12, 2),
        moneda TEXT CHECK (moneda IN ('UYU', 'USD')),
        fecha DATE,
        fechaVenc DATE,
        pagado BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_cocodrilo_tipo ON cocodrilo_movimientos(tipo);
      CREATE INDEX IF NOT EXISTS idx_cocodrilo_fecha ON cocodrilo_movimientos(fecha);
    `);
    console.log('[DB] Tabla cocodrilo_movimientos lista');
  } catch (err) {
    console.error('[DB] Error al crear tabla:', err.message);
  }
}

// ===== ENDPOINTS =====

// GET /api/movimientos — Obtener todos
app.get('/api/movimientos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM cocodrilo_movimientos ORDER BY fecha DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/movimientos — Guardar lista (UPSERT)
app.post('/api/movimientos', async (req, res) => {
  const movimientos = req.body;
  if (!Array.isArray(movimientos)) {
    return res.status(400).json({ error: 'Array requerido' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Borrar los que no estén en la lista (sync limpio)
      const ids = movimientos.map(m => m.id);
      if (ids.length > 0) {
        await client.query(
          `DELETE FROM cocodrilo_movimientos WHERE id NOT IN (${ids.map((_, i) => `$${i + 1}`).join(',')})`,
          ids
        );
      } else {
        // Si viene lista vacía, borrar todo
        await client.query('DELETE FROM cocodrilo_movimientos');
      }

      // Insertar/actualizar
      for (const m of movimientos) {
        await client.query(
          `INSERT INTO cocodrilo_movimientos
            (id, tipo, descripcion, categoria, monto, moneda, fecha, fechaVenc, pagado, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
           ON CONFLICT (id) DO UPDATE SET
            tipo = $2, descripcion = $3, categoria = $4,
            monto = $5, moneda = $6, fecha = $7, fechaVenc = $8,
            pagado = $9, updated_at = NOW()`,
          [m.id, m.tipo, m.descripcion, m.categoria, m.monto, m.moneda, m.fecha, m.fechaVenc || null, m.pagado || false]
        );
      }

      await client.query('COMMIT');
      res.json({ saved: movimientos.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[POST] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/movimientos/:id — Eliminar uno
app.delete('/api/movimientos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM cocodrilo_movimientos WHERE id = $1',
      [id]
    );
    res.json({ deleted: result.rowCount });
  } catch (err) {
    console.error('[DELETE] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== ARRANQUE =====
pool.on('error', (err) => console.error('[DB] Error inesperado:', err));

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🐊 Cocodrilo Server running on port ${PORT}`);
    console.log(`📌 Health: http://localhost:${PORT}/api/health`);
    console.log(`📊 Movimientos: http://localhost:${PORT}/api/movimientos\n`);
  });
}).catch(err => {
  console.error('Error al iniciar:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n[SHUTDOWN] Cerrando servidor...');
  await pool.end();
  process.exit(0);
});
