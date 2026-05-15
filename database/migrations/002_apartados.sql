-- =============================================================
-- PCMaker ERP — Migración 002: Sistema de apartados
-- Fecha: Mayo 2026
-- Seguro para re-ejecutar: usa IF NOT EXISTS y ON CONFLICT DO NOTHING.
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. Tabla apartados
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS apartados (
    id                  SERIAL PRIMARY KEY,
    cliente_id          INT NOT NULL REFERENCES clientes(id),
    sucursal_id         INT NOT NULL REFERENCES sucursales(id),
    usuario_id          INT NOT NULL REFERENCES usuarios(id),
    producto_id         INT NOT NULL REFERENCES inventario(id),
    cantidad            INT NOT NULL DEFAULT 1,
    precio_unitario     NUMERIC(10, 2) NOT NULL,
    precio_total        NUMERIC(10, 2) NOT NULL,
    enganche_minimo     NUMERIC(10, 2) NOT NULL,
    monto_abonado       NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fecha_limite        DATE NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'activo'
                            CHECK (estado IN ('activo', 'liquidado', 'cancelado')),
    motivo_cancelacion  TEXT,
    venta_id            INT REFERENCES ventas(id),
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 2. Tabla apartado_abonos
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS apartado_abonos (
    id              SERIAL PRIMARY KEY,
    apartado_id     INT NOT NULL REFERENCES apartados(id) ON DELETE CASCADE,
    usuario_id      INT NOT NULL REFERENCES usuarios(id),
    monto           NUMERIC(10, 2) NOT NULL,
    metodo_pago     VARCHAR(20) NOT NULL
                        CHECK (metodo_pago IN ('efectivo', 'transferencia', 'terminal')),
    observaciones   TEXT,
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 3. Índices
-- -------------------------------------------------------------

-- Listar apartados activos por sucursal (vista del vendedor y admin)
CREATE INDEX IF NOT EXISTS idx_apartados_sucursal_estado
    ON apartados(sucursal_id, estado);

-- Calcular stock reservado por producto al crear un apartado
CREATE INDEX IF NOT EXISTS idx_apartados_producto_activo
    ON apartados(producto_id) WHERE estado = 'activo';

-- Historial de apartados por cliente
CREATE INDEX IF NOT EXISTS idx_apartados_cliente
    ON apartados(cliente_id);

-- Abonos por apartado (detalle y recibo)
CREATE INDEX IF NOT EXISTS idx_abonos_apartado
    ON apartado_abonos(apartado_id);

-- -------------------------------------------------------------
-- 4. Configuraciones de apartados
--    ON CONFLICT DO NOTHING → idempotente en re-ejecución.
--    Los valores se pueden cambiar desde el panel admin sin
--    necesidad de otra migración.
-- -------------------------------------------------------------

INSERT INTO configuraciones (nombre, valor, descripcion) VALUES
    ('apartados_enganche_tipo',    'porcentaje', 'Tipo de enganche mínimo: porcentaje o fijo'),
    ('apartados_enganche_valor',   '30',         'Valor del enganche: % del total o monto fijo en MXN'),
    ('apartados_dias_limite',      '30',         'Días máximos para liquidar un apartado'),
    ('apartados_dias_sin_abono',   '30',         'Días sin registrar un abono antes de cancelar automáticamente')
ON CONFLICT (nombre) DO NOTHING;

-- -------------------------------------------------------------
-- 5. Permisos para pcmaker_user
--    Los GRANT son idempotentes: re-ejecutar no causa errores.
-- -------------------------------------------------------------

GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE apartados       TO pcmaker_user;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE apartado_abonos TO pcmaker_user;
GRANT USAGE, SELECT ON SEQUENCE apartados_id_seq              TO pcmaker_user;
GRANT USAGE, SELECT ON SEQUENCE apartado_abonos_id_seq        TO pcmaker_user;

COMMIT;

-- -------------------------------------------------------------
-- Verificación post-migración (ejecutar por separado):
--
--   SELECT * FROM configuraciones WHERE nombre LIKE 'apartados%';
--   \d apartados
--   \d apartado_abonos
-- -------------------------------------------------------------
