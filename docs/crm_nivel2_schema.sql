-- ============================================================
-- CRM NIVEL 2 - AUTOMATÍZAME.UY
-- Esquema relacional para seguimiento completo de clientes
-- Fecha: 2026-04-04
-- Base de datos: PostgreSQL (Supabase/NeonDB)
-- ============================================================

-- 1. TABLA CLIENTES (unifica todos los leads de todos los canales)
CREATE TABLE IF NOT EXISTS clientes (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(200) NOT NULL,
    email           VARCHAR(200),
    whatsapp        VARCHAR(30),
    instagram_username VARCHAR(100) UNIQUE,
    empresa         VARCHAR(200),
    url_web_redes   TEXT,
    estado          VARCHAR(30) DEFAULT 'nuevo',
        -- Estados: nuevo → contactado → en_negociacion → cerrado_ganado → cerrado_perdido
    temperatura     VARCHAR(15) DEFAULT 'frio',
        -- Temperaturas: frio, tibio, caliente
    canal_origen    VARCHAR(50),
        -- Canales: instagram_dm, whatsapp, web_formulario, web_chatbot, referido, otro
    valor_estimado  DECIMAL(12,2) DEFAULT 0,
    notas           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes(estado);
CREATE INDEX IF NOT EXISTS idx_clientes_temperatura ON clientes(temperatura);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);

-- 2. TABLA INTERACCIONES (historial de cada contacto con el cliente)
CREATE TABLE IF NOT EXISTS interacciones (
    id              SERIAL PRIMARY KEY,
    cliente_id      INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
    tipo            VARCHAR(30) NOT NULL,
        -- Tipos: dm_instagram, whatsapp, email, llamada, reunion_calendly, nota_interna
    canal           VARCHAR(30),
        -- Canal: instagram, whatsapp, web, telegram, calendly
    contenido       TEXT,
        -- Resumen del mensaje o nota de la interacción
    direccion       VARCHAR(10) DEFAULT 'entrante',
        -- entrante (cliente → agencia) o saliente (agencia → cliente)
    agente          VARCHAR(50) DEFAULT 'ARIA',
        -- Quién atendió: ARIA, Seba, Sistema
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interacciones_cliente ON interacciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_interacciones_tipo ON interacciones(tipo);

-- 3. TABLA OPORTUNIDADES (deals/negocios en pipeline)
CREATE TABLE IF NOT EXISTS oportunidades (
    id              SERIAL PRIMARY KEY,
    cliente_id      INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
    titulo          VARCHAR(300) NOT NULL,
        -- Ej: "Implementación CRM para Clínica Médica"
    servicio        VARCHAR(100),
        -- Ej: "CRM WhatsApp", "Bot IA", "Web Premium", etc.
    etapa           VARCHAR(30) DEFAULT 'prospecto',
        -- Etapas: prospecto → propuesta → negociacion → cierre → postventa
    valor           DECIMAL(12,2) DEFAULT 0,
    moneda          VARCHAR(3) DEFAULT 'USD',
    probabilidad    INTEGER DEFAULT 10,
        -- Probabilidad de cierre (0-100%)
    fecha_cierre    DATE,
    notas           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oportunidades_cliente ON oportunidades(cliente_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_etapa ON oportunidades(etapa);

-- 4. TABLA TAREAS (seguimiento de acciones pendientes)
CREATE TABLE IF NOT EXISTS tareas (
    id              SERIAL PRIMARY KEY,
    cliente_id      INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
    oportunidad_id  INTEGER REFERENCES oportunidades(id) ON DELETE SET NULL,
    titulo          VARCHAR(300) NOT NULL,
    descripcion     TEXT,
    estado          VARCHAR(20) DEFAULT 'pendiente',
        -- Estados: pendiente, en_progreso, completada, cancelada
    prioridad       VARCHAR(10) DEFAULT 'media',
        -- alta, media, baja
    fecha_limite    TIMESTAMPTZ,
    asignado_a      VARCHAR(50) DEFAULT 'Seba',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tareas_estado ON tareas(estado);
CREATE INDEX IF NOT EXISTS idx_tareas_cliente ON tareas(cliente_id);

-- 5. VISTA: DASHBOARD DE PIPELINE (métrica rápida)
CREATE OR REPLACE VIEW v_pipeline AS
SELECT
    o.etapa,
    COUNT(*) AS cantidad,
    SUM(o.valor) AS valor_total,
    ROUND(AVG(o.probabilidad)) AS prob_promedio,
    SUM(o.valor * o.probabilidad / 100) AS valor_ponderado
FROM oportunidades o
GROUP BY o.etapa
ORDER BY
    CASE o.etapa
        WHEN 'prospecto' THEN 1
        WHEN 'propuesta' THEN 2
        WHEN 'negociacion' THEN 3
        WHEN 'cierre' THEN 4
        WHEN 'postventa' THEN 5
    END;

-- 6. VISTA: RESUMEN DE CLIENTE (para ver todo de un vistazo)
CREATE OR REPLACE VIEW v_resumen_cliente AS
SELECT
    c.id,
    c.nombre,
    c.email,
    c.whatsapp,
    c.empresa,
    c.estado,
    c.temperatura,
    c.canal_origen,
    c.valor_estimado,
    c.created_at,
    COUNT(DISTINCT i.id) AS total_interacciones,
    MAX(i.created_at) AS ultima_interaccion,
    COUNT(DISTINCT o.id) AS oportunidades_activas,
    COALESCE(SUM(o.valor), 0) AS valor_total_oportunidades
FROM clientes c
LEFT JOIN interacciones i ON i.cliente_id = c.id
LEFT JOIN oportunidades o ON o.cliente_id = c.id AND o.etapa NOT IN ('cierre')
GROUP BY c.id, c.nombre, c.email, c.whatsapp, c.empresa, c.estado,
         c.temperatura, c.canal_origen, c.valor_estimado, c.created_at;

-- 7. FUNCIÓN: Auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clientes_updated
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_oportunidades_updated
    BEFORE UPDATE ON oportunidades
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================================
-- RESULTADO:
-- • clientes: Todos los prospectos unificados
-- • interacciones: Historial completo de cada contacto
-- • oportunidades: Pipeline de ventas con etapas
-- • tareas: Seguimiento de acciones pendientes
-- • v_pipeline: Dashboard instantáneo del pipeline
-- • v_resumen_cliente: Vista 360° de cada cliente
-- ============================================================
